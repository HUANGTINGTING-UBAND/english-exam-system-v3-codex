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

const generatedListening = Array.from({ length: 20 }, (_, index) => {
  const n = index + 1
  return `${n}．${n === 1 ? 'What is Bill’s favorite subject?' : `What is listening question ${n}?`}
A. Music. B. History. C. English.`
}).join('\n')
const generatedReadingA = `A
This is article A for students.
${[21, 22, 23].map((n) => `${n}．What is reading question ${n}?
A. One. B. Two. C. Three. D. Four.`).join('\n')}`
const generatedReadingB = `B
The Tan family, from Hunan, love sharing stories about their new life. They work together and help each other every day.
${[24, 25, 26, 27].map((n) => `${n}．What is reading question ${n}?
A. One. B. Two. C. Three. D. Four.`).join('\n')}`
const generatedReadingC = `C
What are insects like in your eyes? Some are beautiful and some are helpful in nature.
${[28, 29, 30, 31].map((n) => `${n}．What is reading question ${n}?
A. One. B. Two. C. Three. D. Four.`).join('\n')}`
const generatedSevenChoice = `七选五
Make a Difference to Your School
Your school can become better if everyone gives a hand.
32．
33．
34．
35．
A. Start with small things.
B. Keep the classroom clean.
C. Work with your classmates.
D. Share your ideas.
E. Make your school better.`
const generatedCloze = `完形填空
Oh, no? How silly I was to practice basketball inside! I picked up the ball and said sorry to my mother.
${Array.from({ length: 10 }, (_, index) => {
  const n = 36 + index
  return `${n}．
A. first B. second C. third`
}).join('\n')}`
const generatedFillBlank = `语法填空
Long, long ago, there was a city called Jijiaocheng. People there liked stories and songs.
${Array.from({ length: 10 }, (_, index) => `${46 + index}．${index === 0 ? 'The' : `word${index}`}`).join('\n')}`
const generatedSubjective = `综合技能
My name is Jeff. I like learning foreign languages. I often practice English with my friends.
${[56, 57, 58, 59].map((n) => `${n}．Answer question ${n}.`).join('\n')}
60．Translate the underlined sentence into Chinese.`
const generatedWriting = `61．在假期，我们应该更多地陪伴家人还是朋友呢？请写一篇英语短文表达你的观点。`
const generatedAnswers = `英语参考答案
1．B 2．A 3．C 4．A 5．C
46．The 47．provided 48．word2 49．word3 50．word4 51．word5 52．word6 53．word7 54．word8 55．word9
56．He likes learning foreign languages. 57．With his friends. 58．Yes. 59．Practice often. 60．把画线句子翻译成中文。 61．写作略`
const fullPaperRawText = `${generatedListening}
阅读理解
${generatedReadingA}
${generatedReadingB}
${generatedReadingC}
${generatedSevenChoice}
${generatedCloze}
${generatedFillBlank}
${generatedSubjective}
${generatedWriting}
${generatedAnswers}`
const fullPaperParsed = __test.parseImportText(fullPaperRawText, '湖南中考整卷完整性 smoke test')
const fullQuestionNumbers = new Set(fullPaperParsed.questions.map((question) => question.metadata?.questionNo))
const fullMaterialsByContent = {
  tan: fullPaperParsed.materials.find((material) => material.content.includes('The Tan family')),
  insects: fullPaperParsed.materials.find((material) => material.content.includes('What are insects')),
  seven: fullPaperParsed.materials.find((material) => material.content.includes('Make a Difference to Your School')),
  cloze: fullPaperParsed.materials.find((material) => material.content.includes('Oh, no? How silly I was')),
  fill: fullPaperParsed.materials.find((material) => material.content.includes('Long, long ago')),
  subjective: fullPaperParsed.materials.find((material) => material.content.includes('My name is Jeff')),
}

console.log('full paper parsed summary')
console.log(JSON.stringify({
  questionCount: fullPaperParsed.questions.length,
  materialCount: fullPaperParsed.materials.length,
  materialSummaries: fullPaperParsed.materials.map((material) => ({ localId: material.localId, type: material.type, preview: material.content.slice(0, 120) })),
  warningCodes: [...new Set(fullPaperParsed.warnings.map((warning) => warning.code))],
}, null, 2))

if (fullPaperParsed.questions.length < 60) {
  throw new Error(`Expected full paper to keep at least 60 questions, got ${fullPaperParsed.questions.length}`)
}

for (const requiredNo of ['1', '20', '21', '31', '32', '35', '36', '45', '46', '55', '56', '60', '61']) {
  if (!fullQuestionNumbers.has(requiredNo)) {
    throw new Error(`Expected full paper to include question ${requiredNo}`)
  }
}

const fullQuestionOne = fullPaperParsed.questions.find((question) => question.metadata?.questionNo === '1')
if (fullQuestionOne?.metadata?.typeHint !== 'listening' || fullQuestionOne.type !== 'CHOICE' || fullQuestionOne.options?.length !== 3) {
  throw new Error('Expected question 1 to remain listening CHOICE with A/B/C options')
}

if (!fullMaterialsByContent.tan || fullMaterialsByContent.tan.content.includes('23．')) {
  throw new Error('Expected B reading material to contain The Tan family without question 23')
}

if (!fullMaterialsByContent.insects || fullMaterialsByContent.insects.content.includes('27．')) {
  throw new Error('Expected C reading material to contain What are insects without question 27')
}

if (!fullMaterialsByContent.seven || !fullMaterialsByContent.seven.content.includes('A. Start with small things') || !fullMaterialsByContent.seven.content.includes('E. Make your school better')) {
  throw new Error('Expected seven_choice material to include title and A-E candidates')
}

for (const n of ['32', '33', '34', '35']) {
  const question = fullPaperParsed.questions.find((item) => item.metadata?.questionNo === n)
  if (question?.metadata?.materialLocalId !== fullMaterialsByContent.seven.localId) {
    throw new Error(`Expected seven_choice question ${n} to bind to one seven_choice material`)
  }
}

if (!fullMaterialsByContent.cloze || fullMaterialsByContent.cloze.content.includes('Make a Difference')) {
  throw new Error('Expected cloze material to contain cloze text without seven_choice content')
}

for (const n of Array.from({ length: 10 }, (_, index) => String(36 + index))) {
  const question = fullPaperParsed.questions.find((item) => item.metadata?.questionNo === n)
  if (question?.metadata?.materialLocalId !== fullMaterialsByContent.cloze.localId) {
    throw new Error(`Expected cloze question ${n} to bind to one cloze material`)
  }
}

if (!fullMaterialsByContent.fill || fullMaterialsByContent.fill.type === 'CLOZE_TEXT') {
  throw new Error('Expected fill_blank material to contain Long, long ago and not be CLOZE_TEXT')
}

for (const n of Array.from({ length: 10 }, (_, index) => String(46 + index))) {
  const question = fullPaperParsed.questions.find((item) => item.metadata?.questionNo === n)
  if (question?.metadata?.materialLocalId !== fullMaterialsByContent.fill.localId || question.metadata?.typeHint !== 'fill_blank') {
    throw new Error(`Expected fill_blank question ${n} to bind to one fill_blank material`)
  }
}

if (!fullMaterialsByContent.subjective) {
  throw new Error('Expected subjective material to contain My name is Jeff')
}

for (const n of ['56', '57', '58', '59', '60']) {
  const question = fullPaperParsed.questions.find((item) => item.metadata?.questionNo === n)
  const expectedTypeHints = n === '60' ? ['translation', 'subjective'] : ['subjective']
  if (question?.metadata?.materialLocalId !== fullMaterialsByContent.subjective.localId || !expectedTypeHints.includes(question.metadata?.typeHint)) {
    throw new Error(`Expected subjective/translation question ${n} to bind to My name is Jeff material`)
  }
}

const writingQuestion = fullPaperParsed.questions.find((question) => question.metadata?.questionNo === '61')
if (writingQuestion?.metadata?.typeHint !== 'writing' || writingQuestion.type === 'CHOICE') {
  throw new Error('Expected question 61 to be preserved as writing')
}
