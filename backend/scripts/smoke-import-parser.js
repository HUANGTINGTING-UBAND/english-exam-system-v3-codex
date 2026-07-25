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
A good attitude (态度) can spread.
D. Share your ideas.
E. Think about things you enjoy at school.
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
${[21, 22].map((n) => `${n}．What is reading question ${n}?
A. One. B. Two. C. Three.`).join('\n')}
23．Where can we read the text most probably?
A. In a primary school. B. In a middle school. C. In a university.`
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
Students can help by caring about the school garden.
33．
They can also share ideas with teachers and classmates.
34．
Small actions can make the school cleaner and warmer.
35．
A. Start with small things.
B. Keep the classroom clean.
C. Work with your classmates.
A good attitude (态度) can spread.
D. Share your ideas.
E. Think about things you enjoy at school.`
const clozeOptionMap = {
  36: ['cup', 'bowl', 'spoon'],
  37: ['fact', 'idea', 'trouble'],
  38: ['proudly', 'angrily', 'worriedly'],
  39: ['pass on', 'show off', 'think about'],
  40: ['sleeping', 'crying', 'running'],
  41: ['lie', 'joke', 'advice'],
  42: ['refused', 'promised', 'explained'],
  43: ['wrong', 'strange', ' difficult'.trim()],
  44: ['honest', 'patient', 'polite'],
  45: ['change', 'forget', 'accept'],
}

const clozeOptionBlockSmokeText = `第三部分 语言运用
第一节 完形填空
Oh, no? How silly I was to practice basketball inside!
36．A. cup     B. bowl     C. spoon
37. A. fact
B. idea
C. trouble
38． A. proudly  B. angrily  C. worriedly
39 A. pass on  B. show off  C. think about
40．A. sleeping  B. crying  C. running
41．A. lie B. joke C. advice
42．A. refused B. promised C. explained
43．A. wrong B. strange C. difficult
44．A. honest B. patient C. polite
45．A. change B. forget C. accept
第二节
阅读下面短文，在空白处填入 1 个适当的单词。`
const parsedClozeOptionBlock = __test.parseClozeOptionBlock(clozeOptionBlockSmokeText)
Object.entries(clozeOptionMap).forEach(([questionNo, expectedOptions]) => {
  const actualOptions = parsedClozeOptionBlock.get(questionNo)
  if (!actualOptions || actualOptions.length !== 3 || expectedOptions.some((expected, index) => actualOptions[index] !== expected)) {
    throw new Error(`Expected parseClozeOptionBlock question ${questionNo} options ${JSON.stringify(expectedOptions)}, got ${JSON.stringify(actualOptions)}`)
  }
})
const generatedCloze = `第三部分 语言运用
第一节 完形填空
阅读下面的短文，掌握其大意，然后从各题所给的 A、B、C 三个选项中选出一个最佳选项。
Oh, no? How silly I was to practice basketball inside! That gave me a (n)
Mom, Toby broke your cup. Go outside. No treats for you.
Mom, Toby broke your cup. Go outside. No treats for you.
${Array.from({ length: 10 }, (_, index) => {
  const n = 36 + index
  const [a, b, c] = clozeOptionMap[n]
  const context = n === 45 ? 'He jumped up and gave me a big lick (舔) then I felt fine.' : `The story continued around blank ${n}.`
  return `${n}．${context}
A. ${a} B. ${b} C. ${c}`
}).join('\n')}`
const generatedFillBlank = `第二节（共 10 小题）
阅读下面短文，在空白处填入 1 个适当的单词或括号内单词的正确形式。
45 city was on the rich Liyang Plain and should not start the fill blank material.
Long, long ago, there was a city called Jijiaocheng. People there liked stories and songs.
${Array.from({ length: 10 }, (_, index) => `${46 + index}．${index === 0 ? 'The' : `word${index}`}`).join('\n')}`
const generatedSubjective = `第四部分 综合技能
第一节（共 5 小题）
阅读下面短文，根据短文内容回答问题或翻译画线部分。
My name is Jeff. I like learning foreign languages. I often practice English with my friends. Study tours bring even more possibilities to my life.
56．When did Jeff begin to learn Chinese?
57．Who suggested a study tour in China?
58．What do you think of Jeff?
59．What new things will you try after reading Jeff’s story? Why?
60．将短文中画线部分翻译成中文。`
const generatedWriting = `61．在假期，我们应该更多地陪伴家人还是朋友呢？请写一篇英语短文表达你的观点。
内容包括：（1）陈述你的观点并说明理由；（2）结合观点，介绍你的假期计划。
注意：（1）文中不得出现真实姓名和校名等信息；（2）写作词数为 80 个左右。
Spending more time with family or friends?
Li Hua: I prefer family time during the holiday.
Mike: I want to travel with friends and learn new things.
Gina: Both family and friends are important to me.`
const generatedAnswers = `英语参考答案
1．B 2．A 3．C 4．A 5．C
46．The 47．provided 48．word2 49．word3 50．word4 51．word5 52．word6 53．word7 54．word8 55．shows第四部分 综合技能
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
  five: fullPaperParsed.materials.find((material) => material.content.includes('Make a Difference to Your School')),
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

if (fullPaperParsed.questions.length !== 61) {
  throw new Error(`Expected full paper to keep exactly 61 questions, got ${fullPaperParsed.questions.length}`)
}

for (const requiredNo of ['1', '20', '21', '31', '32', '35', '36', '45', '46', '47', '55', '56', '60', '61']) {
  if (!fullQuestionNumbers.has(requiredNo)) {
    throw new Error(`Expected full paper to include question ${requiredNo}`)
  }
}

const fullQuestionOne = fullPaperParsed.questions.find((question) => question.metadata?.questionNo === '1')
if (fullQuestionOne?.metadata?.typeHint !== 'listening' || fullQuestionOne.type !== 'CHOICE' || fullQuestionOne.options?.length !== 3) {
  throw new Error('Expected question 1 to remain listening CHOICE with A/B/C options')
}

const orderedQuestionNumbers = fullPaperParsed.questions.map((question) => Number(question.metadata?.questionNo))
if (Math.max(...orderedQuestionNumbers) !== 61 || orderedQuestionNumbers.includes(80)) {
  throw new Error('Expected question numbers to stop at 61 and never synthesize writing word-count 80 as a question')
}
for (let index = 1; index < orderedQuestionNumbers.length; index += 1) {
  if (orderedQuestionNumbers[index] < orderedQuestionNumbers[index - 1]) {
    throw new Error('Expected questions to be sorted by question number')
  }
}

const duplicateQuestionNumbers = orderedQuestionNumbers.filter((numberValue, index) => orderedQuestionNumbers.indexOf(numberValue) !== index)
if (duplicateQuestionNumbers.length > 0) {
  throw new Error(`Expected no duplicate question numbers, got ${duplicateQuestionNumbers.join(', ')}`)
}

for (const n of Array.from({ length: 20 }, (_, index) => String(index + 1))) {
  const question = fullPaperParsed.questions.find((item) => item.metadata?.questionNo === n)
  if (question?.metadata?.typeHint !== 'listening' || question.type !== 'CHOICE' || question.options?.length !== 3 || question.metadata?.materialLocalId) {
    throw new Error(`Expected listening question ${n} to be an unbound CHOICE with A/B/C options`)
  }
}

const readingAQuestions = ['21', '22', '23'].map((n) => fullPaperParsed.questions.find((item) => item.metadata?.questionNo === n))
const readingAMaterialId = readingAQuestions[0]?.metadata?.materialLocalId
const readingAMaterial = fullPaperParsed.materials.find((material) => material.localId === readingAMaterialId)
if (!readingAMaterial || !readingAMaterial.title.includes('图片/图表题') || !readingAMaterial.content.includes('PDF 文本未提取到 A 篇图片/图表内容')) {
  throw new Error('Expected 21-23 to bind to reading A image/table placeholder material')
}
if (!readingAQuestions.every((question) => question?.metadata?.materialLocalId === readingAMaterialId)) {
  throw new Error('Expected questions 21-23 to share the reading A placeholder material')
}
const question23 = fullPaperParsed.questions.find((item) => item.metadata?.questionNo === '23')
if (question23?.options?.length !== 3 || JSON.stringify(question23.options).includes('The Tan family')) {
  throw new Error('Expected question 23 to keep only three image-reading options and exclude B material text')
}

if (!fullMaterialsByContent.tan || fullMaterialsByContent.tan.content.includes('23．')) {
  throw new Error('Expected B reading material to contain The Tan family without question 23')
}

if (!fullMaterialsByContent.insects || fullMaterialsByContent.insects.content.includes('27．')) {
  throw new Error('Expected C reading material to contain What are insects without question 27')
}

const materialContents = fullPaperParsed.materials.map((material) => material.content)
if (materialContents.some((content) => content.includes('What is reading question 24') || content.includes('What is reading question 25') || content.includes('What is reading question 28'))) {
  throw new Error('Expected reading question stems not to become standalone materials')
}

if (!fullMaterialsByContent.five || !fullMaterialsByContent.five.content.startsWith('Make a Difference to Your School') || !fullMaterialsByContent.five.content.includes('Students can help by caring about the school garden') || !fullMaterialsByContent.five.content.includes('A. Start with small things') || !fullMaterialsByContent.five.content.includes('E. Think about things you enjoy at school')) {
  throw new Error('Expected five_choose_four material to start with the title and include 32-35 context plus A-E candidates')
}
for (const forbidden of ['What can be the best title for the text?', 'Insects and Tools', '英语试题', '余选项', '阅读下面的短文，掌握其大意']) {
  if (fullMaterialsByContent.five.content.includes(forbidden)) throw new Error(`Expected five_choose_four material not to include ${forbidden}`)
}

for (const n of ['32', '33', '34', '35']) {
  const question = fullPaperParsed.questions.find((item) => item.metadata?.questionNo === n)
  if (question?.metadata?.materialLocalId !== fullMaterialsByContent.five.localId) {
    throw new Error(`Expected five_choose_four question ${n} to bind to one five_choose_four material`)
  }
}

const question33 = fullPaperParsed.questions.find((item) => item.metadata?.questionNo === '33')
if (!['five_choose_four'].includes(question33?.metadata?.displayType || question33?.metadata?.typeHint) || question33.type === 'CLOZE' || question33.text.length > 20) {
  throw new Error('Expected question 33 to be a short five_choose_four blank, not CLOZE or a long paragraph')
}
const question35 = fullPaperParsed.questions.find((item) => item.metadata?.questionNo === '35')
if (JSON.stringify(question35?.options || []).includes('Oh, no?') || JSON.stringify(question35?.options || []).includes('good attitude') || String(question35?.answer || '').includes('第三部分')) {
  throw new Error('Expected question 35 options/answer not to contain cloze start or section heading')
}

if (!fullMaterialsByContent.cloze || !fullMaterialsByContent.cloze.content.startsWith('Oh, no? How silly I was to practice basketball inside!')) {
  throw new Error('Expected cloze material to exist and start at the cloze passage')
}
for (const forbidden of ['A good attitude', '35 ', '英语试题', '阅读下面短文，在空白处填入']) {
  if (fullMaterialsByContent.cloze.content.includes(forbidden)) throw new Error(`Expected cloze material not to include ${forbidden}`)
}
if ((fullMaterialsByContent.cloze.content.match(/Mom, Toby broke your cup/g) || []).length > 1 || (fullMaterialsByContent.cloze.content.match(/Go outside\. No treats for you/g) || []).length > 1) {
  throw new Error('Expected cloze material to dedupe repeated cross-page lines')
}

const question36 = fullPaperParsed.questions.find((item) => item.metadata?.questionNo === '36')
const assertOptionTexts = (questionNo, expectedOptions) => {
  const question = fullPaperParsed.questions.find((item) => item.metadata?.questionNo === String(questionNo))
  const normalizedOptions = (question?.options || []).map((option) => String(option).trim())
  if (normalizedOptions.length !== expectedOptions.length || expectedOptions.some((expected, index) => normalizedOptions[index] !== expected)) {
    throw new Error(`Expected question ${questionNo} options ${JSON.stringify(expectedOptions)}, got ${JSON.stringify(normalizedOptions)}`)
  }
}
Object.entries(clozeOptionMap).forEach(([questionNo, expectedOptions]) => assertOptionTexts(questionNo, expectedOptions))
const clozeOptionSignatures = new Set(Array.from({ length: 10 }, (_, index) => JSON.stringify(fullPaperParsed.questions.find((item) => item.metadata?.questionNo === String(36 + index))?.options || [])))
if (clozeOptionSignatures.size <= 1) {
  throw new Error('Expected cloze questions 36-45 to have independent option sets, not one shared option group')
}

for (const n of Array.from({ length: 10 }, (_, index) => String(36 + index))) {
  const question = fullPaperParsed.questions.find((item) => item.metadata?.questionNo === n)
  if (question?.metadata?.typeHint !== 'cloze') {
    throw new Error(`Expected cloze question ${n} to keep cloze typeHint`)
  }
  if (!question?.metadata?.materialLocalId?.startsWith('cloze-')) {
    throw new Error(`Expected cloze question ${n} to bind to cloze material`)
  }
}
const question46ForClozeBinding = fullPaperParsed.questions.find((item) => item.metadata?.questionNo === '46')
if (question46ForClozeBinding?.metadata?.materialLocalId?.startsWith('cloze-')) {
  throw new Error('Expected question 46 not to bind to cloze material')
}
const clozeMaterialId = fullMaterialsByContent.cloze.localId
const clozeBoundQuestionNumbers = fullPaperParsed.questions
  .filter((question) => question.metadata?.materialLocalId === clozeMaterialId)
  .map((question) => Number(question.metadata?.questionNo))
if (JSON.stringify(clozeBoundQuestionNumbers) !== JSON.stringify(Array.from({ length: 10 }, (_, index) => 36 + index))) {
  throw new Error(`Expected ${clozeMaterialId} to bind strictly to 36-45, got ${clozeBoundQuestionNumbers.join(', ')}`)
}


if (!fullMaterialsByContent.fill || fullMaterialsByContent.fill.type === 'CLOZE_TEXT' || !fullMaterialsByContent.fill.content.includes('Long, long ago') || fullMaterialsByContent.fill.content.includes('第四部分 综合技能') || fullMaterialsByContent.fill.content.includes('阅读下面短文，根据短文内容回答问题')) {
  throw new Error('Expected fill_blank material to include Long, long ago and exclude comprehensive-skill instructions')
}

for (const n of Array.from({ length: 10 }, (_, index) => String(46 + index))) {
  const question = fullPaperParsed.questions.find((item) => item.metadata?.questionNo === n)
  if (question?.metadata?.typeHint !== 'fill_blank' || question?.metadata?.displayType !== 'fill_blank' || ['CLOZE', 'TRANSLATION'].includes(question?.type)) {
    throw new Error(`Expected fill_blank question ${n} to keep fill_blank display type and avoid CLOZE/TRANSLATION`)
  }
}

const question46 = fullPaperParsed.questions.find((item) => item.metadata?.questionNo === '46')
if (question46?.type === 'CLOZE' || question46?.type === 'TRANSLATION' || question46?.text?.includes('(provide) water') || question46?.text?.includes('48 (cut)')) {
  throw new Error('Expected question 46 to be fill_blank-compatible, not TRANSLATION/CLOZE, and not contain the whole passage')
}

const question55 = fullPaperParsed.questions.find((item) => item.metadata?.questionNo === '55')
if (question55?.answer !== 'shows' || String(question55?.answer || '').includes('第四部分')) {
  throw new Error(`Expected question 55 answer to be exactly shows, got ${question55?.answer}`)
}
if (question46?.metadata?.materialLocalId === 'cloze-5' || !question46?.metadata?.materialLocalId?.startsWith('fill_blank-')) {
  throw new Error('Expected question 46 to bind to fill_blank material, not cloze material')
}
for (const n of Array.from({ length: 10 }, (_, index) => String(46 + index))) {
  const question = fullPaperParsed.questions.find((item) => item.metadata?.questionNo === n)
  if (Array.isArray(question?.options) && question.options.length > 0) {
    throw new Error(`Expected fill_blank question ${n} to have no choice options`)
  }
}

const missing47RawText = `第三部分 语言运用
第二节 阅读下面短文，在空白处填入 1 个适当的单词或括号内单词的正确形式。
Long, long ago, there was a city called Jijiaocheng. 46．The city provided water and people learned 48．to cut stones.
49．workers 50．their 51．really 52．and 53．traditional 54．on 55．shows
英语参考答案
46．The 47．provided 48．to cut 49．workers 50．their 51．really 52．and 53．traditional 54．on 55．shows`
const missing47Parsed = __test.parseImportText(missing47RawText, 'missing 47 fill_blank smoke')
const missing47Numbers = missing47Parsed.questions.map((question) => question.metadata?.questionNo)
if (!missing47Numbers.includes('47')) {
  throw new Error('Expected fill_blank fallback to synthesize missing question 47 from fill_blank section/answer signals')
}
const missing47Question = missing47Parsed.questions.find((question) => question.metadata?.questionNo === '47')
if (missing47Question?.metadata?.typeHint !== 'fill_blank' || !missing47Question?.metadata?.materialLocalId?.startsWith('fill_blank-')) {
  throw new Error('Expected synthesized question 47 to stay in fill_blank group')
}

if (!fullMaterialsByContent.subjective) {
  throw new Error('Expected subjective material to exist')
}

for (const n of ['56', '57', '58', '59', '60']) {
  const question = fullPaperParsed.questions.find((item) => item.metadata?.questionNo === n)
  const expectedTypeHints = n === '60' ? ['translation'] : ['subjective', 'reading_answer', 'short_answer']
  if (!expectedTypeHints.includes(question?.metadata?.displayType || question?.metadata?.typeHint)) {
    throw new Error(`Expected subjective/translation question ${n} to keep its typeHint`)
  }
  if (Number(n) >= 56 && Number(n) <= 59 && question?.type === 'TRANSLATION') {
    throw new Error(`Expected reading-answer question ${n} not to use TRANSLATION type`)
  }
}


const expectedSubjectiveTexts = {
  56: 'When did Jeff begin to learn Chinese?',
  57: 'Who suggested a study tour in China?',
  58: 'What do you think of Jeff?',
  59: 'What new things will you try after reading Jeff’s story? Why?',
  60: '将短文中画线部分翻译成中文。',
}
for (const [questionNo, expectedText] of Object.entries(expectedSubjectiveTexts)) {
  const question = fullPaperParsed.questions.find((item) => item.metadata?.questionNo === questionNo)
  if (!question?.text?.includes(expectedText)) {
    throw new Error(`Expected question ${questionNo} text to include ${expectedText}`)
  }
}

const writingQuestion = fullPaperParsed.questions.find((question) => question.metadata?.questionNo === '61')
if (writingQuestion?.metadata?.typeHint !== 'writing' || writingQuestion.type === 'CHOICE') {
  throw new Error('Expected question 61 to be preserved as writing')
}
if (!writingQuestion.text.includes('80 个左右')) {
  throw new Error('Expected question 61 writing prompt to keep word-count instruction')
}

const sectionHeadingPattern = /第一部分|第二部分|第三部分|第四部分|第一节|第二节|完形填空|语法填空|综合技能|英语参考答案/
const materialStartPattern = /The Tan family|What are insects|Oh, no\?|Long, long ago/
const explanationInstructionPattern = /阅读下列材料|阅读下面短文|掌握其大意|从每题所给|第一部分|第二部分|第三部分|第四部分/
for (const question of fullPaperParsed.questions) {
  if (sectionHeadingPattern.test(String(question.answer || ''))) throw new Error(`Expected question ${question.metadata?.questionNo} answer not to contain section heading`)
  if (JSON.stringify(question.options || []).match(materialStartPattern)) throw new Error(`Expected question ${question.metadata?.questionNo} options not to contain material starts`)
  if (question.explanation && explanationInstructionPattern.test(question.explanation)) throw new Error(`Expected question ${question.metadata?.questionNo} explanation not to contain section instructions`)
  if (question.explanation && !/解析|答案解析|解题思路|原因/.test(question.explanation)) throw new Error(`Expected question ${question.metadata?.questionNo} explanation to be empty unless explicit analysis marker exists`)
  for (const fieldText of [question.text, question.answer, question.explanation, JSON.stringify(question.options || [])]) {
    if (/英语试题|--\s*\d+\s+of\s+\d+|第\s*\d+\s*页/.test(String(fieldText || ''))) throw new Error(`Expected question ${question.metadata?.questionNo} fields to be free of page noise`)
  }
  if (!['CHOICE', 'CLOZE'].includes(question.type) && Array.isArray(question.options) && question.options.length > 0) throw new Error(`Expected non-choice question ${question.metadata?.questionNo} not to expose choice options`)
}

const duplicateWarnings = fullPaperParsed.warnings.filter((warning) => warning.code === 'DUPLICATE_QUESTION_NUMBER')
if (duplicateWarnings.length > 0) {
  throw new Error('Expected answer section not to create duplicate question warnings')
}
