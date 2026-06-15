const { __test } = require('../src/routes/platformRoutes')

const listeningQuestions = Array.from({ length: 20 }, (_, index) => {
  const questionNo = index + 1
  const stems = {
    1: 'What is Bill’s favorite subject?',
    2: 'Where is the man going?',
    20: 'What’s the speaker’s purpose?',
  }
  const options = questionNo === 20
    ? 'A. To give advice. B. To ask for help. C. To send wishes'
    : 'A. Music. B. History. C. English.'

  return `${questionNo}．${stems[questionNo] || `What is question ${questionNo} about?`}\n${options}`
}).join('\n')

const rawText = `第一部分 听力理解\n${listeningQuestions}\n英语参考答案\n1．B 2．A 3．C 4．A 5．C\n6．B 7．A 8．A 9．C 10．C\n`

const parsed = __test.parseImportText(rawText, '湖南中考导入 smoke test')
const listeningDrafts = parsed.questions.filter((question) => Number(question.metadata?.questionNo) >= 1 && Number(question.metadata?.questionNo) <= 20)

console.log(JSON.stringify({
  questionCount: parsed.questions.length,
  listeningCount: listeningDrafts.length,
  firstQuestion: listeningDrafts[0],
  twentiethQuestion: listeningDrafts.find((question) => question.metadata?.questionNo === '20'),
  warnings: parsed.warnings,
}, null, 2))

if (parsed.questions.length < 20) {
  throw new Error(`Expected at least 20 questions, got ${parsed.questions.length}`)
}

if (listeningDrafts.length < 20) {
  throw new Error(`Expected 20 listening questions, got ${listeningDrafts.length}`)
}

for (const question of listeningDrafts) {
  if (question.type !== 'CHOICE') {
    throw new Error(`Expected question ${question.metadata?.questionNo} to be CHOICE`)
  }

  if (!question.text) {
    throw new Error(`Expected question ${question.metadata?.questionNo} to have text`)
  }

  if (!Array.isArray(question.options) || question.options.length !== 3) {
    throw new Error(`Expected question ${question.metadata?.questionNo} to have 3 options`)
  }
}
