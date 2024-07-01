//SPDX-License-Identifier:MIT
pragma solidity >=0.7.0 <0.9.0;

//template contracts
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

contract AnswerToEarn is ReentrancyGuard, Ownable {
  using Counters for Counters.Counter;
  Counters.Counter private _totalQuestions;
  Counters.Counter private _totalAnswers;

  struct QuestionStruct {
    uint id;
    string title;
    string description;
    address owner; //whoever asked this qn
    address winner; //person that has the best answer
    bool paidout;
    bool deleted;
    uint updated; //timestamp
    uint created;
    uint answers; //total number of answers that this qn has
    string tags;
    uint256 prize;
  }

  struct AnswerStruct {
    uint id;
    uint qid; //each answer relate to each qn
    string comment;
    address owner; //person that answered
    bool deleted;
    uint created;
    uint updated;
  }

  event Action(uint id, string actionType, address indexed executor, uint256 timestamp);

  uint256 public serviceFee;
  mapping(uint => bool) questionExists;
  mapping(uint => QuestionStruct) questions; // a dictionary with questionstruct as value 
  mapping(uint => mapping(uint => AnswerStruct)) answersOf;

  constructor(uint _serviceFee) {
    serviceFee = _serviceFee;
  }

  //payable: allow the function to accept ether. when u call this function u can send ether along the transaction
  function createQuestion(
    string memory title,
    string memory description,
    string memory tags
  ) public payable {
    //conditions that this smart contract must pass
    require(bytes(title).length > 0, 'title must not be empty');
    require(bytes(description).length > 0, 'description must not be empty');
    require(bytes(tags).length > 0, 'tags must not be empty');
    require(msg.value > 0 ether, 'Insufficient amount');

    QuestionStruct memory question;
    _totalQuestions.increment(); //method from counters.sol

    question.id = _totalQuestions.current();
    question.title = title;
    question.description = description;
    question.tags = tags;
    question.prize = msg.value; // amount that owner willing to pay
    question.owner = msg.sender;
    question.updated = currentTime(); //timestamp of the current block
    question.created = currentTime();

    questions[question.id] = question;
    questionExists[question.id] = true;

    emit Action(question.id, 'Question created', msg.sender, currentTime());
  }

  //memory: Temporary data that exists only for the duration of a function execution.
  function updateQuestion(
    uint qid,
    string memory title,
    string memory description,
    string memory tags
  ) public {
    require(questionExists[qid], 'Question not found');
    require(questions[qid].answers == 0, 'Question already answered');
    require(questions[qid].owner == msg.sender, 'Unauthorized entity!');
    require(bytes(title).length > 0, 'title must not be empty');
    require(bytes(description).length > 0, 'description must not be empty');
    require(bytes(tags).length > 0, 'tags must not be empty');

    questions[qid].title = title;
    questions[qid].tags = tags;
    questions[qid].description = description;
    questions[qid].updated = currentTime();

    emit Action(qid, 'Question updated', msg.sender, currentTime());
  }

  function deleteQuestion(uint qid) public {
    require(questionExists[qid], 'Question not found');
    require(questions[qid].answers == 0, 'Question already answered');
    require(questions[qid].owner == msg.sender, 'Unauthorized entity!');

    _totalQuestions.decrement();
    questions[qid].deleted = true;
    questionExists[qid] = false;
    questions[qid].updated = currentTime();

    //do i include this
    payTo(questions[qid].owner, questions[qid].prize); //only pay back if qn not yet answered
    emit Action(qid, 'Question deleted', msg.sender, currentTime());
  }

  //view: function does not modify state of sc. function does not consume gas aka read only. used to query data from blockchain 
  function getQuestions() public view returns (QuestionStruct[] memory Questions) {
    uint available = 0;
    for (uint i = 0; i < _totalQuestions.current(); i++) {
      if (!questions[i + 1].deleted) available++; //when we did the mapping we started from 1
    }

    Questions = new QuestionStruct[](available); //use available to define size of questions

    uint index = 0;
    for (uint i = 0; i < _totalQuestions.current(); i++) {
      if (!questions[i + 1].deleted) {
        Questions[index++] = questions[i + 1];
      }
    }
  }

  function getQuestion(uint qid) public view returns (QuestionStruct memory) {
    return questions[qid];
  }

  function addAnswer(uint qid, string memory comment) public {
    require(questionExists[qid], 'Question not found');
    require(!questions[qid].paidout, 'Question already paidout');
    require(bytes(comment).length > 0, 'Answer must not be empty');

    _totalAnswers.increment();
    AnswerStruct memory answer;

    answer.id = _totalAnswers.current();
    answer.qid = qid;
    answer.comment = comment;
    answer.owner = msg.sender;
    answer.created = currentTime();
    answer.updated = currentTime();
    questions[qid].answers++;
    answersOf[qid][answer.id] = answer;

    emit Action(answer.id, 'Answer created', msg.sender, currentTime());
  }

  function getAnswers(uint qid) public view returns (AnswerStruct[] memory Answers) {
    //owner of the qn or owner of the platform (owner from ownable.sol)
    if (msg.sender == questions[qid].owner || msg.sender == owner()) {
      return privateAnswers(qid);
    } else {
      return publicAnswers(qid);
    }
  }

  function publicAnswers(uint qid) internal view returns (AnswerStruct[] memory Answers) {
    uint available = 0;
    for (uint i = 0; i < _totalAnswers.current(); i++) {
      if (answersOf[qid][i + 1].qid == qid) available++; //first key: qid, second key: answer id which is what number this answer is 
    }

    Answers = new AnswerStruct[](available);

    uint index = 0;
    for (uint i = 0; i < _totalAnswers.current(); i++) {
      if (answersOf[qid][i + 1].qid == qid) {
        //only if winner chosen and money paid then can reveal
        if (questions[qid].paidout) {
          Answers[index++] = answersOf[qid][i + 1];
        } else {
          AnswerStruct memory answer = answersOf[qid][i + 1];
          answer.comment = 'Hidden >> **** *** ** *** **** *** *** ** ****';
          Answers[index++] = answer;
        }
      }
    }
  }

  function privateAnswers(uint qid) internal view returns (AnswerStruct[] memory Answers) {
    uint available = 0;
    for (uint i = 0; i < _totalAnswers.current(); i++) {
      if (answersOf[qid][i + 1].qid == qid) {
        available++;
      }
    }

    Answers = new AnswerStruct[](available);

    uint index = 0;
    //show all
    for (uint i = 0; i < _totalAnswers.current(); i++) {
      if (answersOf[qid][i + 1].qid == qid) {
        Answers[index++] = answersOf[qid][i + 1];
      }
    }
  }

  function getAnswer(uint qid, uint id) public view returns (AnswerStruct memory) {
    return answersOf[qid][id];
  }

  //non reentrant provided by ReentrancyGuard.sol. function cannot be reentered while it is already being executed
  function payWinner(uint qid, uint id) public nonReentrant {
    require(questionExists[qid], 'Question not found');
    require(answersOf[qid][id].id == id, 'Answer not found');
    require(!questions[qid].paidout, 'Question already paid out');
    require(msg.sender == questions[qid].owner || msg.sender == owner(), 'Unauthorized entity');

    uint256 reward = questions[qid].prize;
    uint256 tax = (reward * serviceFee) / 100;
    address winner = answersOf[qid][id].owner;

    questions[qid].paidout = true;
    questions[qid].winner = winner;
    answersOf[qid][id].updated = currentTime();

    payTo(winner, reward - tax);
    payTo(owner(), tax);
  }

  //only owner can call this function from ownable.sol
  function changeFee(uint256 fee) public onlyOwner {
    require(fee > 0 && fee <= 100, 'Fee must be between 1 - 100');
    serviceFee = fee;
  }

  function payTo(address to, uint amount) internal {
    //call: a low level function. used to invoke other contract functions or send ether e.g. sending x amount wei of ether
    //{value:amount}: opotional part of the .call syntax where u specify the amount of ether to send with the call 
    //{"}: indicates any data that might be passed to the functino being called.  empty means dh
    //second slot is empty, supposed to capture any returned data but call doesnt expect return data so nv mind
    //payable is a type conversion keyword that converts an address in to a special type that can receive ether. necessary because not all addresses in ethereum can directly receive ether, only those explicityly marked as payable
    (bool success, ) = payable(to).call{ value: amount }('');
    if (!success) revert('Payment failed');
  }

  function currentTime() internal view returns (uint) {
    return (block.timestamp * 1000) + 1000; //make it total 10 digits
  }
}
