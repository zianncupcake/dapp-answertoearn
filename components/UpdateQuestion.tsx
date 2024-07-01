import { updateQuestion } from '@/services/blockchain'
import { globalActions } from '@/store/globalSlices'
import { QuestionParams, QuestionProp, RootState } from '@/utils/interfaces'
import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { FaTimes } from 'react-icons/fa'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'react-toastify'

const UpdateQuestion: React.FC<{ questionData: QuestionProp | null }> = ({ questionData }) => {
  const [question, setQuestion] = useState<QuestionParams>({
    title: '',
    description: '',
    tags: '',
    prize: '',
  })

  useEffect(() => {
    if (questionData) {
      const { title, description, tags, prize } = questionData
      setQuestion({ title, description, tags: tags.join(','), prize })
    }
  }, [questionData])

  const dispatch = useDispatch()
  const { setQuestionUpdateModal } = globalActions
  const { questionUpdateModal } = useSelector((states: RootState) => states.globalStates)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (
      !question.title ||
      !question.prize ||
      !question.tags ||
      !question.description ||
      !questionData?.id
    )
      return

    await toast.promise(
      new Promise<void>((resolve, reject) => {
        updateQuestion(questionData?.id, question)
          .then((tx) => {
            closeModal()
            resolve(tx)
          })
          .catch((error) => reject(error))
      }),
      {
        pending: 'Approve transaction...',
        success: 'Question updated successfully 👌',
        error: 'Encountered error 🤯',
      }
    )
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setQuestion((prevState) => ({
      ...prevState,
      [name]: value,
    }))
  }

  const closeModal = () => {
    dispatch(setQuestionUpdateModal('scale-0'))
  }

  return (
    <div
      className={`fixed top-0 left-0 w-screen h-screen flex items-center justify-center
    bg-black bg-opacity-50 transform z-50 transition-transform duration-300 ${questionUpdateModal}`}
    >
      <div className="bg-[#16112F] text-[#BBBBBB] shadow-lg shadow-pink-500 rounded-xl w-11/12 md:w-2/5 h-7/12 p-6">
        <div className="flex flex-col">
          <div className="flex flex-row justify-between items-center">
            <p className="font-semibold">Edit question</p>
            <button onClick={closeModal} className="border-0 bg-transparent focus:outline-none">
              <FaTimes />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col justify-center items-start rounded-xl mt-5 mb-5"
          >
            <label className="text-[12px]">Title</label>
            <div className="py-4 w-full border border-[#212D4A] rounded-full flex items-center px-4 mb-3 mt-2">
              <input
                placeholder="Question title"
                className="bg-transparent outline-none w-full placeholder-[#3D3857] text-sm"
                name="title"
                value={question.title}
                onChange={handleChange}
                required
              />
            </div>
            {/* <label className="text-[12px]">Prize</label>
            <div className="py-4 w-full border border-[#212D4A] rounded-full flex items-center px-4 mb-3 mt-2">
              <input
                placeholder="ETH e.g 0.02"
                className="bg-transparent outline-none w-full placeholder-[#3D3857] text-sm"
                name="prize"
                value={question.prize}
                onChange={handleChange}
                required
              />
            </div> */}
            <label className="text-[12px]">Tags</label>
            <div
              className="py-4 w-full border border-[#212D4A] 
              rounded-full flex items-center px-4 mb-3 mt-2"
            >
              <input
                placeholder="Separate tags with commas, eg. php, css"
                className="bg-transparent outline-none w-full placeholder-[#3D3857] text-sm"
                name="tags"
                value={question.tags}
                onChange={handleChange}
                required
              />
            </div>

            <label className="text-[12px]">Question</label>

            <textarea
              placeholder="Drop your question here"
              className="h-[162px] w-full bg-transparent border border-[#212D4A] rounded-xl py-3 px-3
              focus:outline-none focus:ring-0 resize-none
              placeholder-[#3D3857] text-sm"
              name="description"
              value={question.description}
              onChange={handleChange}
              required
            />

            <button
              type="submit"
              className="text-sm bg-blue-600 rounded-full w-[150px] h-[48px] text-white
              mt-5 hover:bg-blue-700 transition-colors duration-300"
            >
              Update
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default UpdateQuestion
