const { __test } = require('../src/routes/platformRoutes')

const minimalRawText = `1．What is Bill’s favorite subject?
A. Music. B. History. C. English.
2．Where is the man going?
A. To the hospital. B. To the library. C. To the hotel.
3．Why is Tim running?
A. For a movie. B. For an exam. C. For a meeting.
`

const minimalParsed = __test.parseImportText(minimalRawText, '湖南中考导入 minimal smoke test')
const minimalDiagnostics = __test.getParserDiagnostics(minimalRawText, '湖南中考导入 minimal smoke diagnostics')

console.log('minimal diagnostics')
console.log(JSON.stringify(minimalDiagnostics, null, 2))
console.log('minimal parsed summary')
console.log(JSON.stringify({
  questionCount: minimalParsed.questions.length,
  firstQuestion: minimalParsed.questions[0],
  warningCodes: minimalParsed.warnings.map((warning) => warning.code),
}, null, 2))

if (minimalParsed.questions.length < 3) {
  throw new Error(`Expected at least 3 questions, got ${minimalParsed.questions.length}`)
}

if (!minimalParsed.questions[0]?.text?.includes('Bill’s favorite subject')) {
  throw new Error('Expected question 1 text to include Bill’s favorite subject')
}

const firstOptions = minimalParsed.questions[0]?.options || []
for (const expectedOption of ['Music', 'History', 'English']) {
  if (!firstOptions.some((option) => option.includes(expectedOption))) {
    throw new Error(`Expected question 1 options to include ${expectedOption}`)
  }
}

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

  return `${questionNo}．${stems[questionNo] || `What is question ${questionNo} about?`}
${options}`
}).join('\n')

const rawText = `第一部分 听力理解\n${listeningQuestions}\n英语参考答案\n1．B 2．A 3．C 4．A 5．C\n6．B 7．A 8．A 9．C 10．C\n`

const parsed = __test.parseImportText(rawText, '湖南中考导入 smoke test')
const diagnostics = __test.getParserDiagnostics(rawText, '湖南中考导入 smoke diagnostics')
const listeningDrafts = parsed.questions.filter((question) => Number(question.metadata?.questionNo) >= 1 && Number(question.metadata?.questionNo) <= 20)

console.log('full listening diagnostics')
console.log(JSON.stringify(diagnostics, null, 2))
console.log('full listening parsed summary')
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

const materialBoundaryRawText = `阅读理解
A
This is article A for students.
21．What is article A about?
A. Schools. B. Families. C. Sports. D. Music.
22．Who may like article A?
A. Teachers. B. Students. C. Doctors. D. Farmers.
23．Where can we read the text most probably?
A. In a primary school. B. In a middle school. C. In a university. D. In a library.
B
The Tan family, from Hunan, love sharing stories about their new life. They work together and help each other every day.
24．What does the Tan family like doing?
A. Sharing stories. B. Buying books. C. Watching films. D. Playing chess.
25．Where are the Tan family from?
A. Hunan. B. Beijing. C. Shanghai. D. Nanjing.
26．How do they work?
A. Alone. B. Together. C. Slowly. D. Quietly.
27．What is the writer’s main purpose in writing the text?
A. To describe a family. B. To sell a book. C. To ask a question. D. To show a rule.
C
What are insects like in your eyes? Some are beautiful and some are helpful in nature.
28．What does the text talk about?
A. Insects. B. Weather. C. Food. D. Travel.
29．Which insect is helpful?
A. Bee. B. Fly. C. Ant. D. Mosquito.
30．What can we learn from insects?
A. Teamwork. B. Singing. C. Drawing. D. Cooking.
31．What is the best title?
A. Insects Around Us. B. A Trip. C. A Letter. D. A Game.
七选五
Make a Difference to Your School
Your school can become better if everyone gives a hand.
32．What should students do first?
33．How can students help?
34．What is the result?
35．What is the best ending?
A. Start with small things.
B. Keep the classroom clean.
C. Work with your classmates.
D. Share your ideas.
E. Make your school better.
完形填空
Oh, no? How silly I was to forget the important thing. The boy looked at the bag and smiled.
36．
A. happy B. silly C. busy
37．
A. bag B. book C. desk
45．
A. smiled B. cried C. shouted
语法填空
Long, long ago, there was a city called Jijiaocheng. People there liked stories and songs.
46．city
47．called
55．songs
`

const materialParsed = __test.parseImportText(materialBoundaryRawText, '湖南中考材料边界 smoke test')
const tanMaterial = materialParsed.materials.find((material) => material.content.includes('The Tan family'))
const insectMaterial = materialParsed.materials.find((material) => material.content.includes('What are insects'))
const clozeMaterial = materialParsed.materials.find((material) => material.content.includes('Oh, no? How silly I was'))
const fillBlankMaterial = materialParsed.materials.find((material) => material.content.includes('Long, long ago'))
const fillBlankQuestion = materialParsed.questions.find((question) => question.metadata?.questionNo === '46')

console.log('material boundary parsed summary')
console.log(JSON.stringify({
  materialCount: materialParsed.materials.length,
  materialSummaries: materialParsed.materials.map((material) => ({ localId: material.localId, type: material.type, preview: material.content.slice(0, 120) })),
  questionCount: materialParsed.questions.length,
  fillBlankQuestion,
}, null, 2))

if (!tanMaterial || !tanMaterial.content.includes('The Tan family')) {
  throw new Error('Expected B reading material to include The Tan family')
}

if (tanMaterial.content.includes('23．Where can we read')) {
  throw new Error('Expected B reading material not to include question 23')
}

if (!insectMaterial || !insectMaterial.content.includes('What are insects')) {
  throw new Error('Expected C reading material to include What are insects')
}

if (insectMaterial.content.includes('27．What is the writer’s main purpose')) {
  throw new Error('Expected C reading material not to include question 27')
}

if (!clozeMaterial || !clozeMaterial.content.includes('Oh, no? How silly I was')) {
  throw new Error('Expected cloze material to include Oh, no? How silly I was')
}

if (clozeMaterial.content.includes('Make a Difference') || clozeMaterial.content.includes('A. Start with small things')) {
  throw new Error('Expected cloze material not to include seven-choice content or A-E candidates')
}

if (!fillBlankMaterial || !fillBlankMaterial.content.includes('Long, long ago')) {
  throw new Error('Expected fill_blank material to include Long, long ago')
}

if (fillBlankMaterial.type === 'CLOZE_TEXT') {
  throw new Error('Expected fill_blank material not to be CLOZE_TEXT')
}

if (fillBlankQuestion?.metadata?.typeHint !== 'fill_blank') {
  throw new Error('Expected question 46 typeHint to be fill_blank')
}
