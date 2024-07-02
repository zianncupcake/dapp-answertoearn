import { store } from '@/store'
import { ethers } from 'ethers'
import { globalActions } from '@/store/globalSlices'
import address from '@/artifacts/contractAddress.json'
import abi from '@/artifacts/contracts/AnswerToEarn.sol/AnswerToEarn.json'
import { AnswerProp, QuestionParams, QuestionProp } from '@/utils/interfaces'

const { setWallet, setAnswers, setQuestion, setQuestions } = globalActions
const ContractAddress = address.address //address contains the ethereum address where sc is deployed
const ContractAbi = abi.abi //abi descrives the interface of smart contract. includes info about functions, names, inputs / types, includes info about the contract itself
let ethereum: any
let tx: any

if (typeof window !== 'undefined') {
  ethereum = (window as any).ethereum
}

const toWei = (num: number) => ethers.utils.parseEther(num.toString())
const fromWei = (num: number) => ethers.utils.formatEther(num)

const getEthereumContract = async () => {
  const accounts = await ethereum?.request?.({ method: 'eth_accounts' })
  const provider = accounts?.[0]
  //The ethers.providers.Web3Provider is a class from the ethers.js library, which provides a convenient way to interact with the Ethereum blockchain via the ethereum provider.
    ? new ethers.providers.Web3Provider(ethereum)
  //A JsonRpcProvider is a provider from the ethers.js library that connects to an Ethereum node via JSON-RPC (JavaScript Object Notation - Remote Procedure Call). This is a protocol used to communicate with Ethereum nodes, allowing clients to perform various actions on the blockchain, such as reading data, sending transactions, and querying the state.
  //Even if no user accounts are available, your application might still need to interact with the Ethereum network. A JsonRpcProvider allows you to do this by connecting to a remote Ethereum node.
  //You can still read data from the blockchain without needing a user account. For example, you might want to display information about tokens, contracts, or recent transactions.
    : new ethers.providers.JsonRpcProvider(process.env.NEXT_APP_RPC_URL)
  //if there is an account available the wallet is set to null because dont need to create a new wallet
  console.log("provider", provider)
  const wallet = accounts?.[0] ? null : ethers.Wallet.createRandom()
  console.log("wallet", wallet)
  const signer = provider.getSigner(accounts?.[0] ? undefined : wallet?.address)

  const contract = new ethers.Contract(ContractAddress, ContractAbi, signer)
  return contract
}

const connectWallet = async () => {
  try {
    if (!ethereum) return reportError('Please install Metamask')
    //request user accounts from metamask. dapp request access to user's ethereum accounts

    const accounts = await ethereum.request?.({ method: 'eth_requestAccounts' })
    store.dispatch(setWallet(accounts?.[0])) // wallet address stored. access first account in array
  } catch (error) {
    reportError(error)
  }
}

const checkWallet = async () => {
  try {
    if (!ethereum) return reportError('Please install Metamask')
    const accounts = await ethereum.request?.({ method: 'eth_accounts' })

    // monitor chain change
    ethereum.on('chainChanged', () => {
      window.location.reload()
    })

    ethereum.on('accountsChanged', async () => {
      store.dispatch(setWallet(accounts?.[0]))
      await checkWallet()
    })

    if (accounts?.length) {
      store.dispatch(setWallet(accounts[0]))
    } else {
      store.dispatch(setWallet(''))
      reportError('Please connect wallet, no accounts found.')
    }
  } catch (error) {
    reportError(error)
  }
}

const getQuestions = async (): Promise<QuestionProp[]> => {
  const contract = await getEthereumContract()
  const questions = await contract.getQuestions()
  return structureQuestions(questions)
}

const getQuestion = async (id: number): Promise<QuestionProp> => {
  const contract = await getEthereumContract()
  const question = await contract.getQuestion(id)
  return structureQuestions([question])[0]
}

const createQuestion = async (data: QuestionParams) => {
  if (!ethereum) {
    reportError('Please install Metamask')
    return Promise.reject(new Error('Metamask not installed'))
  }

  try {
    const contract = await getEthereumContract()
    console.log("THE CONTRACT", contract)
    const { title, description, tags, prize } = data
    console.log("THE DATA", data)
    tx = await contract.createQuestion(title, description, tags, {
      value: toWei(Number(prize)),
    })
    console.log("Transaction Hash:", tx.hash);
    console.log("tx", tx)


    await tx.wait()
    console.log("tx", tx)
    const questions = await getQuestions()
    console.log("QUESTIONS", questions)

    store.dispatch(setQuestions(questions))
    return Promise.resolve(tx)
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

const updateQuestion = async (id: number, data: QuestionParams) => {
  if (!ethereum) {
    reportError('Please install Metamask')
    return Promise.reject(new Error('Metamask not installed'))
  }

  try {
    const contract = await getEthereumContract()
    const { title, description, tags } = data
    tx = await contract.updateQuestion(id, title, description, tags)

    await tx.wait()
    const question = await getQuestion(id)

    store.dispatch(setQuestion(question))
    return Promise.resolve(tx)
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

const deleteQuestion = async (id: number) => {
  if (!ethereum) {
    reportError('Please install Metamask')
    return Promise.reject(new Error('Metamask not installed'))
  }

  try {
    const contract = await getEthereumContract()
    tx = await contract.deleteQuestion(id)

    await tx.wait()
    const question = await getQuestion(id)

    store.dispatch(setQuestion(question))
    return Promise.resolve(tx)
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

const createAnswer = async (id: number, answer: string) => {
  if (!ethereum) {
    reportError('Please install Metamask')
    return Promise.reject(new Error('Metamask not installed'))
  }

  try {
    const contract = await getEthereumContract()
    tx = await contract.addAnswer(id, answer)

    await tx.wait()
    const question = await getQuestion(id)
    const answers = await getAnswers(id)

    store.dispatch(setQuestion(question))
    store.dispatch(setAnswers(answers))

    return Promise.resolve(tx)
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

const payWinner = async (qid: number, id: number) => {
  if (!ethereum) {
    reportError('Please install Metamask')
    return Promise.reject(new Error('Metamask not installed'))
  }

  try {
    const contract = await getEthereumContract()
    tx = await contract.payWinner(qid, id)

    await tx.wait()
    const question = await getQuestion(id)
    const answers = await getAnswers(id)

    store.dispatch(setQuestion(question))
    store.dispatch(setAnswers(answers))

    return Promise.resolve(tx)
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

const getAnswers = async (id: number): Promise<AnswerProp[]> => {
  const contract = await getEthereumContract()
  const answers = await contract.getAnswers(id)
  return structureAnswers(answers) || []
}

const loadData = async () => {
  await getQuestions()
}

const reportError = (error: any) => {
  console.log(error)
}

const structureQuestions = (questions: any[]): QuestionProp[] =>
  questions
    .map((question) => ({
      id: Number(question.id),
      title: question.title,
      description: question.description,
      owner: question.owner.toLowerCase(),
      winner: question.winner.toLowerCase(),
      paidout: question.paidout,
      deleted: question.deleted,
      updated: Number(question.updated),
      created: Number(question.created),
      answers: Number(question.answers),
      tags: question.tags.split(',').map((tag: string) => tag.trim()),
      prize: fromWei(question.prize),
    }))
    .sort((a, b) => b.created - a.created)

const structureAnswers = (answers: any[]): AnswerProp[] =>
  answers
    .map((answer) => ({
      id: Number(answer.id),
      qid: Number(answer.qid),
      comment: answer.comment,
      owner: answer.owner.toLowerCase(),
      deleted: answer.deleted,
      created: Number(answer.created),
      updated: Number(answer.updated),
    }))
    .sort((a, b) => b.updated - a.updated)

export {
  connectWallet,
  checkWallet,
  loadData,
  getQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  createAnswer,
  getAnswers,
  payWinner,
}
