const express = require('express')
const crypto = require('crypto')
const multer = require('multer')
const mammoth = require('mammoth')
const { extractPdfText } = require('../utils/pdfTextExtractor')
const prisma = require('../lib/prisma')
const {
  requireAuth,
  requireRole,
  requireTeacher,
  requireTeacherOrAdmin,
} = require('../middlewares/authMiddleware')

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

const generateInviteCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase()
}

const formatClassroom = (classroom) => {
  return {
    id: classroom.id,
    name: classroom.name,
    description: classroom.description,
    inviteCode: classroom.inviteCode,
    teacherId: classroom.teacherId,
    studentCount: classroom.students?.length || classroom._count?.students || 0,
    assignmentCount: classroom.assignments?.length || classroom._count?.assignments || 0,
    createdAt: classroom.createdAt,
    updatedAt: classroom.updatedAt,
  }
}


const validQuestionTypes = new Set(['CHOICE', 'TRANSLATION', 'ERROR_CORRECTION', 'WRITING', 'READING', 'CLOZE'])
const answerLetterMap = { A: 0, B: 1, C: 2, D: 3 }

const questionTypeRuleRegistry = [
  {
    typeHint: 'listening_choice',
    compatibleType: 'CHOICE',
    keywords: ['听力', '听下面', '录音', 'conversation', 'passage'],
    hasMaterial: false,
    optionMode: 'per_question',
    answerFormats: ['1-5 ABCDA', '1. A 2. B', '1 A'],
    warnings: ['MISSING_CHOICE_ANSWER', 'CHOICE_OPTIONS_INCOMPLETE'],
  },
  {
    typeHint: 'listening_word_choice',
    compatibleType: 'CHOICE',
    keywords: ['听音选单词', '听录音选单词'],
    hasMaterial: false,
    optionMode: 'per_question',
    answerFormats: ['letter'],
    warnings: ['AUDIO_TEXT_UNCERTAIN'],
  },
  {
    typeHint: 'listening_image_choice',
    compatibleType: 'CHOICE',
    keywords: ['听音选图片', '听录音选图片'],
    hasMaterial: true,
    optionMode: 'per_question',
    answerFormats: ['letter'],
    warnings: ['MATERIAL_IMAGE_NOT_EXTRACTED'],
  },
  {
    typeHint: 'listening_true_false',
    compatibleType: 'CHOICE',
    keywords: ['听音判断', '听录音判断', '判断正误'],
    hasMaterial: false,
    optionMode: 'true_false',
    answerFormats: ['T/F', 'true/false'],
    warnings: ['ANSWER_MATCH_UNCERTAIN'],
  },
  {
    typeHint: 'reading_choice',
    compatibleType: 'CHOICE',
    keywords: ['阅读理解', '阅读下列材料', '仔细阅读'],
    hasMaterial: true,
    optionMode: 'per_question',
    answerFormats: ['letter'],
    warnings: ['MATERIAL_GROUP_UNCERTAIN'],
  },
  {
    typeHint: 'image_based_question',
    compatibleType: 'CHOICE',
    keywords: ['看图', '图片', '图表', 'chart', 'poster'],
    hasMaterial: true,
    optionMode: 'per_question',
    answerFormats: ['letter', 'text'],
    warnings: ['MATERIAL_IMAGE_NOT_EXTRACTED'],
  },
  {
    typeHint: 'five_choose_four',
    compatibleType: 'CHOICE',
    keywords: ['五选四', '选句还原', '短文还原'],
    hasMaterial: true,
    optionMode: 'shared_options',
    answerFormats: ['letter'],
    warnings: ['SHARED_OPTIONS_UNCERTAIN', 'MATERIAL_GROUP_UNCERTAIN'],
  },
  {
    typeHint: 'seven_choose_five',
    compatibleType: 'CHOICE',
    keywords: ['七选五'],
    hasMaterial: true,
    optionMode: 'shared_options',
    answerFormats: ['letter'],
    warnings: ['SHARED_OPTIONS_UNCERTAIN', 'MATERIAL_GROUP_UNCERTAIN'],
  },
  {
    typeHint: 'cloze',
    compatibleType: 'CLOZE',
    keywords: ['完形填空'],
    hasMaterial: true,
    optionMode: 'per_question',
    answerFormats: ['letter'],
    warnings: ['CLOZE_OPTIONS_UNCERTAIN', 'MATERIAL_GROUP_UNCERTAIN'],
  },
  {
    typeHint: 'word_bank',
    compatibleType: 'ERROR_CORRECTION',
    keywords: ['选词填空', '方框选词', 'word bank'],
    hasMaterial: true,
    optionMode: 'shared_options',
    answerFormats: ['word'],
    warnings: ['SHARED_OPTIONS_UNCERTAIN'],
  },
  {
    typeHint: 'fill_blank',
    compatibleType: 'ERROR_CORRECTION',
    keywords: ['语法填空', '短文填空', '用所给词适当形式填空', '在空白处填入'],
    hasMaterial: true,
    optionMode: 'none',
    answerFormats: ['word', 'phrase'],
    warnings: ['ANSWER_MATCH_UNCERTAIN'],
  },
  {
    typeHint: 'error_correction',
    compatibleType: 'ERROR_CORRECTION',
    keywords: ['短文改错', '改错'],
    hasMaterial: true,
    optionMode: 'none',
    answerFormats: ['correction'],
    warnings: ['ANSWER_MATCH_UNCERTAIN'],
  },
  {
    typeHint: 'matching',
    compatibleType: 'READING',
    keywords: ['匹配', '长篇阅读', '信息匹配', '段落匹配'],
    hasMaterial: true,
    optionMode: 'shared_options',
    answerFormats: ['letter', 'paragraph'],
    warnings: ['MATCHING_OPTIONS_UNCERTAIN'],
  },
  {
    typeHint: 'reading_answer',
    compatibleType: 'READING',
    keywords: ['回答问题', '任务型阅读', '根据短文内容回答问题'],
    hasMaterial: true,
    optionMode: 'none',
    answerFormats: ['text'],
    warnings: ['ANSWER_MATCH_UNCERTAIN'],
  },
  {
    typeHint: 'copy_sentence',
    compatibleType: 'WRITING',
    keywords: ['抄写句子', '正确抄写'],
    hasMaterial: false,
    optionMode: 'none',
    answerFormats: ['text'],
    warnings: ['HANDWRITING_REVIEW_REQUIRED'],
  },
  {
    typeHint: 'odd_one_out',
    compatibleType: 'CHOICE',
    keywords: ['不同类', '找出不同'],
    hasMaterial: false,
    optionMode: 'per_question',
    answerFormats: ['letter'],
    warnings: ['ANSWER_MATCH_UNCERTAIN'],
  },
  {
    typeHint: 'word_box_fill',
    compatibleType: 'ERROR_CORRECTION',
    keywords: ['方框选词', '选词填空'],
    hasMaterial: true,
    optionMode: 'shared_options',
    answerFormats: ['word'],
    warnings: ['SHARED_OPTIONS_UNCERTAIN'],
  },
  {
    typeHint: 'picture_word_choice',
    compatibleType: 'CHOICE',
    keywords: ['看图选词', '看图选择'],
    hasMaterial: true,
    optionMode: 'per_question',
    answerFormats: ['letter', 'word'],
    warnings: ['MATERIAL_IMAGE_NOT_EXTRACTED'],
  },
  {
    typeHint: 'translation',
    compatibleType: 'TRANSLATION',
    keywords: ['翻译画线句子', '翻译成中文', '翻译成英文', '汉译英', '英译汉'],
    hasMaterial: false,
    optionMode: 'none',
    answerFormats: ['text'],
    warnings: ['ANSWER_MATCH_UNCERTAIN'],
  },
  {
    typeHint: 'writing',
    compatibleType: 'WRITING',
    keywords: ['写作', '书面表达', '作文', 'writing'],
    hasMaterial: false,
    optionMode: 'none',
    answerFormats: ['essay', 'sample'],
    warnings: ['RUBRIC_MISSING'],
  },
]

const detectRuleFromContext = (text) => {
  const value = String(text || '')
  return questionTypeRuleRegistry.find((rule) => rule.keywords.some((keyword) => new RegExp(keyword, 'i').test(value))) || null
}


const normalizeDraftQuestionType = (value, warnings, context = '') => {
  const text = String(value || '').trim().toUpperCase()
  const aliasMap = {
    单选题: 'CHOICE',
    选择题: 'CHOICE',
    SINGLE_CHOICE: 'CHOICE',
    阅读理解: 'READING',
    阅读题: 'READING',
    完形填空: 'CLOZE',
    翻译题: 'TRANSLATION',
    写作题: 'WRITING',
    改错题: 'ERROR_CORRECTION',
  }
  const normalized = aliasMap[text] || text
  if (validQuestionTypes.has(normalized)) return normalized
  warnings.push({ level: 'WARNING', code: 'UNKNOWN_QUESTION_TYPE', message: `${context || '题目'}题型无法判断，已默认 CHOICE，请人工校对。` })
  return 'CHOICE'
}

const parseExamMeta = (rawText, fallbackTitle) => {
  const pick = (label) => {
    const match = rawText.match(new RegExp(`${label}[:：]\\s*(.+)`))
    return match ? match[1].trim() : ''
  }
  const timeText = pick('时长') || pick('考试时间')
  const minutes = Number(String(timeText).replace(/[^0-9.]/g, '')) || 30
  return {
    title: pick('试卷标题') || fallbackTitle || '导入试卷草稿',
    gradeLevel: (pick('考试类型') || pick('学段') || 'GENERAL').toUpperCase(),
    totalScore: Number(String(pick('总分')).replace(/[^0-9.]/g, '')) || 0,
    timeLimit: Math.max(1, Math.round(minutes)) * 60,
  }
}

const getQuestionNumberFromBlock = (block, fallbackIndex) => {
  const match = block.match(/题号[:：]\s*(\d+)/) || block.match(/^\s*(?:第\s*)?(\d{1,3})\s*(?:题)?[\.．、\)]?/m)
  return (match?.[1] || String(fallbackIndex + 1)).trim()
}

const stripQuestionNumberPrefix = (block) => {
  return block
    .replace(/^\s*题号[:：]\s*\d+\s*/m, '')
    .replace(/^\s*(?:第\s*)?\d{1,3}\s*(?:题)?[\.．、\)]?\s*/m, '')
    .trim()
}

const optionMarkerPattern = '[A-D](?:[\\.．、\\)]\\s*|\\s+)'
const firstOptionRegex = new RegExp(`(?:^|\\s)${optionMarkerPattern}`, 'm')
const instructionLineRegex = /(?:注意事项|考试说明|答题说明|听力测试现在开始|听力材料|录音材料|请听|听下面|回答第|答题卡|涂改液|最佳选项|每段对话|每段材料|本试卷|本题共|小题|满分|时量|页|PAGE|共\s*\d+\s*页|阅读下面的短文，掌握其大意|阅读下面短文，在空白处填入|阅读下面短文，根据短文内容回答问题|第三部分\s*语言运用|第四部分\s*综合技能|第一节|第二节)/i
const exampleRegex = /(?:例题|例如|例[:：]|答案是\s*[A-D]|答案为\s*[A-D])/i

const normalizeImportRawText = (rawText) => {
  return String(rawText || '')
    .replace(/\r\n/g, '\n')
    .replace(/[\t\u00a0]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^[-—_\s]*\d+\s*[-—_\s]*$/.test(line))
    .filter((line) => !instructionLineRegex.test(line))
    .join('\n')
}

const findAnswerSectionIndex = (rawText) => {
  const text = String(rawText || '')
  const titleRegex = /(^|\n)\s*(?:英语\s*)?(?:参考答案|答案与解析|试题解析|解析|详解)\s*(?:[:：]|\n|$)|(^|\n)\s*答案\s*[:：]\s*(?:\n|$)/i
  const match = titleRegex.exec(text)

  return match ? match.index + (match[1]?.length || match[2]?.length || 0) : -1
}

const extractFormalQuestionText = (rawText) => {
  const normalizedText = normalizeImportRawText(rawText)
  const answerSectionIndex = findAnswerSectionIndex(normalizedText)

  return answerSectionIndex >= 0 ? normalizedText.slice(0, answerSectionIndex) : normalizedText
}

const getAnswerIndexFromLetter = (letter) => {
  return answerLetterMap[String(letter || '').trim().toUpperCase()] ?? null
}

const parseAnswerMap = (rawText) => {
  const answerMap = new Map()
  const text = String(rawText || '').replace(/\r\n/g, '\n')
  const compactRangeRegex = /(?:^|\n|\s)(\d{1,3})\s*[-—–至到]\s*(\d{1,3})\s*[:：]?\s*([A-D]{2,})\b/g
  let match = compactRangeRegex.exec(text)

  while (match) {
    const start = Number(match[1])
    const end = Number(match[2])
    const letters = match[3].split('')

    for (let offset = 0; offset <= end - start && offset < letters.length; offset += 1) {
      answerMap.set(String(start + offset), getAnswerIndexFromLetter(letters[offset]))
    }

    match = compactRangeRegex.exec(text)
  }

  const pairRegex = /(?:^|\n|\s)(\d{1,3})\s*(?:[\.．、\)]\s*)?([A-D])(?=\s|\n|$)/g
  match = pairRegex.exec(text)

  while (match) {
    const questionNo = String(Number(match[1]))

    if (!answerMap.has(questionNo)) {
      answerMap.set(questionNo, getAnswerIndexFromLetter(match[2]))
    }

    match = pairRegex.exec(text)
  }

  return answerMap
}

const isExampleQuestionBlock = (block) => {
  return exampleRegex.test(block)
}

const isChoiceLikeQuestion = (text, options) => {
  if (options.length >= 3) {
    return true
  }

  return /[?？]$/.test(String(text || '').trim()) && options.length > 0
}

const legacyParserTypeHintMap = {
  listening_choice: 'listening',
  reading_choice: 'reading',
  seven_choose_five: 'seven_choice',
  reading_answer: 'subjective',
  short_answer: 'subjective',
}

const detectTypeHintFromContext = (text) => {
  const matchedRule = detectRuleFromContext(text)

  if (matchedRule) {
    return {
      type: matchedRule.compatibleType,
      typeHint: legacyParserTypeHintMap[matchedRule.typeHint] || matchedRule.typeHint,
      displayType: matchedRule.typeHint,
    }
  }

  return { type: 'CHOICE', typeHint: 'choice', displayType: 'choice' }
}

const detectTypeHintByQuestionNumber = (questionNo) => {
  const numberValue = Number(questionNo)

  if (numberValue >= 1 && numberValue <= 20) return { type: 'CHOICE', typeHint: 'listening' }
  if (numberValue >= 21 && numberValue <= 31) return { type: 'CHOICE', typeHint: 'reading' }
  if (numberValue >= 32 && numberValue <= 35) return { type: 'CHOICE', typeHint: 'five_choose_four', displayType: 'five_choose_four' }
  if (numberValue >= 36 && numberValue <= 45) return { type: 'CLOZE', typeHint: 'cloze' }
  if (numberValue >= 46 && numberValue <= 55) return { type: 'ERROR_CORRECTION', typeHint: 'fill_blank' }
  if (numberValue >= 56 && numberValue <= 59) return { type: 'READING', typeHint: 'subjective', displayType: 'reading_answer' }
  if (numberValue === 60) return { type: 'TRANSLATION', typeHint: 'translation' }
  if (numberValue === 61) return { type: 'WRITING', typeHint: 'writing' }

  return null
}

const getContextBeforeQuestion = (rawText, index) => {
  return rawText.slice(Math.max(0, index - 900), index)
}

const questionLineRegex = /^(?:第\s*)?\d{1,3}\s*(?:题)?[\.．、\)]/
const optionLineRegex = /^[A-E][\.．、\)]\s+/

const getMaterialStartIndex = (text, typeHint) => {
  const value = String(text || '')
  const markerEnd = (pattern) => {
    const match = pattern.exec(value)
    return match ? match.index + match[0].length : -1
  }

  if (typeHint === 'reading') {
    const articleMarker = /(?:^|\n)\s*[A-C]\s*(?:\n|$)/g
    let markerMatch = articleMarker.exec(value)
    let lastMarkerEnd = -1

    while (markerMatch) {
      lastMarkerEnd = articleMarker.lastIndex
      markerMatch = articleMarker.exec(value)
    }

    return lastMarkerEnd
  }

  if (typeHint === 'seven_choice') return markerEnd(/(?:七选五)\s*(?:\n|$)/i)
  if (typeHint === 'five_choose_four') return markerEnd(/(?:五选四|七选五|选句还原|短文还原)\s*(?:\n|$)/i)
  if (typeHint === 'cloze') return markerEnd(/(?:完形填空)\s*(?:\n|$)/i)
  if (typeHint === 'fill_blank') return markerEnd(/(?:语法填空|短文填空|用所给词适当形式填空|在空白处填入[^\n]*)\s*(?:\n|$)/i)
  if (typeHint === 'subjective') return markerEnd(/(?:综合技能|任务型阅读|回答问题|根据短文内容回答问题[^\n]*)\s*(?:\n|$)/i)

  return -1
}

const cleanMaterialText = (text, typeHint = '') => {
  const materialStartIndex = getMaterialStartIndex(text, typeHint)
  const candidateText = materialStartIndex >= 0 ? String(text || '').slice(materialStartIndex) : String(text || '')
  const keepOptionLines = ['seven_choice', 'five_choose_four'].includes(typeHint)

  return candidateText
    .split('\n')
    .map((line) => line.trim())
    .map((line) => {
      if (!questionLineRegex.test(line)) return line
      const questionNo = Number(line.match(/^(?:第\s*)?(\d{1,3})/)?.[1] || 0)
      if (typeHint === 'fill_blank' && questionNo && questionNo < 46) return ''
      if (['reading', 'subjective'].includes(typeHint)) return ''
      return line.replace(questionLineRegex, '').trim()
    })
    .filter(Boolean)
    .filter((line) => !(typeHint === 'fill_blank' && /^\d{1,3}\s+/.test(line) && Number(line.match(/^\d{1,3}/)?.[0]) < 46))
    .filter((line) => !instructionLineRegex.test(line))
    .filter((line) => !exampleRegex.test(line))
    .filter((line) => keepOptionLines || !optionLineRegex.test(line))
    .filter((line) => !/^[A-C]$/.test(line))
    .join('\n')
    .trim()
}

const looksLikeMaterialText = (text, typeHint = '') => {
  const value = cleanMaterialText(text, typeHint)
  return value.length >= 40 && /[a-zA-Z]/.test(value)
}

const getMaterialTitleByTypeHint = (typeHint, index) => {
  const titleMap = {
    reading: '阅读材料',
    seven_choice: '七选五材料',
    five_choose_four: '五选四材料',
    cloze: '完形填空材料',
    fill_blank: '语法填空材料',
    subjective: '综合技能材料',
  }

  return `${titleMap[typeHint] || '材料'} ${index}`
}

const getMaterialTypeByTypeHint = (typeHint) => {
  return typeHint === 'cloze' ? 'CLOZE_TEXT' : 'TEXT'
}

const extractSevenChoiceCandidates = (text) => {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[A-E][\.．、\)]\s+/.test(line))
    .join('\n')
}

const extractSevenChoiceTail = (text) => {
  const beforeNextSection = String(text || '').split(/完形填空|Oh,\s*no\?/i)[0]
  return beforeNextSection
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !questionLineRegex.test(line))
    .filter((line) => !instructionLineRegex.test(line))
    .join('\n')
    .trim()
}

const appendMaterialContent = (material, extraContent) => {
  const value = String(extraContent || '').trim()
  if (!material || !value || material.content.includes(value)) return
  material.content = `${material.content}\n${value}`.trim()
}

const extractFullGroupMaterial = (rawText, typeHint) => {
  const { examText } = splitAnswerSection(cleanRawText(rawText))
  const sections = splitByMajorSections(examText)
  const scopedTextByType = {
    seven_choice: sections.reading || examText,
    five_choose_four: sections.reading || examText,
    cloze: sections.languageUse || examText,
    fill_blank: sections.languageUse || examText,
    subjective: sections.comprehensive || examText,
  }
  const formalText = scopedTextByType[typeHint] || examText
  const startPatterns = {
    seven_choice: /(?:七选五)\s*(?:\n|$)/i,
    five_choose_four: /(?:五选四|七选五|选句还原|短文还原)\s*(?:\n|$)/i,
    cloze: /(?:完形填空)\s*(?:\n|$)/i,
    fill_blank: /(?:语法填空|短文填空|用所给词适当形式填空|在空白处填入[^\n]*)\s*(?:\n|$)/i,
    subjective: /(?:综合技能|任务型阅读|回答问题|根据短文内容回答问题[^\n]*)\s*(?:\n|$)/i,
  }
  const endPatterns = {
    seven_choice: /第三部分\s*语言运用|第一节\s*完形填空|完形填空/i,
    five_choose_four: /第三部分\s*语言运用|第一节\s*完形填空|完形填空/i,
    cloze: /第二节|语法填空|短文填空|用所给词适当形式填空|在空白处填入/i,
    fill_blank: /第四部分\s*综合技能|综合技能|任务型阅读|回答问题|根据短文内容回答问题/i,
    subjective: /(?:^|\n)\s*\d{1,3}\s*[\.．、\)]\s*(?:书面表达|写作)|第二节\s*(?:（[^）]*）)?\s*(?:书面表达|写作)|英语参考答案|参考答案/i,
  }
  const startMatch = startPatterns[typeHint]?.exec(formalText)
  if (!startMatch) return ''
  const tail = formalText.slice(startMatch.index)
  const searchTail = tail.slice(startMatch[0].length)
  const endMatch = endPatterns[typeHint]?.exec(searchTail)
  const sectionText = endMatch ? tail.slice(0, startMatch[0].length + endMatch.index) : tail

  return dedupeRepeatedLines(cleanMaterialText(sectionText, typeHint))
}

const fieldBoundaryRegex = /(?:英语参考答案|参考答案|答案与解析|第一部分|第二部分|第三部分|第四部分|第一节|第二节|完形填空|语法填空|综合技能|任务型阅读|回答问题|书面表达|阅读下面的短文|阅读下面短文|阅读下列材料|(?:^|\n)\s*[A-C]\s*(?:\n|$))/i
const pageNoiseRegex = /(?:--\s*\d+\s+of\s+\d+\s*--|第\s*\d+\s*页(?:（共\s*\d+\s*页）)?|[-—]{3,})/gi

const cleanPdfNoiseText = (value) => String(value ?? '')
  .replace(pageNoiseRegex, '\n')
  .replace(/英语试题/g, '\n')
  .replace(/余选项。?/g, '\n')
  .replace(/^[\s·•*-]*$/gm, '')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

const cleanRawText = (rawText) => cleanPdfNoiseText(rawText)

const splitAnswerSection = (cleanText) => {
  const answerSectionIndex = findAnswerSectionIndex(cleanText)
  return answerSectionIndex >= 0
    ? { examText: cleanText.slice(0, answerSectionIndex), answerText: cleanText.slice(answerSectionIndex) }
    : { examText: cleanText, answerText: '' }
}

const sliceBetween = (text, startPattern, endPattern) => {
  const value = String(text || '')
  const startMatch = startPattern.exec(value)
  if (!startMatch) return ''
  const tail = value.slice(startMatch.index)
  const searchTail = tail.slice(startMatch[0].length)
  const endMatch = endPattern ? endPattern.exec(searchTail) : null
  return endMatch ? tail.slice(0, startMatch[0].length + endMatch.index) : tail
}

const splitByMajorSections = (examText) => {
  const text = String(examText || '')
  const readingStart = /(?:第二部分\s*)?(?:阅读理解|阅读下列材料)/i.exec(text)
  const listening = sliceBetween(text, /(?:第一部分\s*)?听力(?:理解|部分|测试)?/i, /(?:第二部分|阅读理解|阅读下列材料)/i)
    || (readingStart ? text.slice(0, readingStart.index).trim() : '')
  return {
    listening,
    reading: sliceBetween(text, /(?:第二部分\s*)?(?:阅读理解|阅读下列材料)/i, /(?:第三部分\s*)?语言运用/i),
    languageUse: sliceBetween(text, /(?:第三部分\s*)?语言运用/i, /(?:第四部分\s*)?综合技能/i),
    comprehensive: sliceBetween(text, /(?:第四部分\s*)?综合技能/i, /(?:第二节|书面表达|写作|61\s*[.．、)]|英语参考答案|参考答案)/i),
    writing: sliceBetween(text, /(?:61\s*[.．、)]|书面表达|写作)/i, /(?:英语参考答案|参考答案|答案与解析|$)/i),
  }
}


const getSectionOrderedQuestionText = (rawText) => {
  const { examText } = splitAnswerSection(cleanRawText(rawText))
  const sections = splitByMajorSections(examText)
  const orderedSections = [sections.listening, sections.reading, sections.languageUse, sections.comprehensive, sections.writing]
    .map((section) => String(section || '').trim())
    .filter(Boolean)
  return orderedSections.length ? orderedSections.join('\n') : examText
}

const dedupeRepeatedLines = (text) => {
  const seen = new Set()
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const key = line.replace(/\s+/g, ' ')
      if (key.length > 20 && seen.has(key)) return false
      if (key.length > 20) seen.add(key)
      return true
    })
    .join('\n')
    .trim()
}

const sanitizeImportedField = (value) => {
  const text = cleanPdfNoiseText(value)
  if (!text) return ''
  const boundaryMatch = fieldBoundaryRegex.exec(text)
  const headingCleanText = boundaryMatch ? text.slice(0, boundaryMatch.index).trim() : text
  const articleBoundaryMatch = /(?:^|\n|\s)[A-C]\s+[A-Z][a-z]/.exec(headingCleanText)
  const cleanText = articleBoundaryMatch ? headingCleanText.slice(0, articleBoundaryMatch.index).trim() : headingCleanText
  return cleanText.replace(/\s+/g, ' ').replace(/\s+[A-C]\s*$/, '').trim()
}

const sanitizeQuestionOptions = (options, typeHint) => {
  const maxOptions = ['listening', 'cloze'].includes(typeHint) ? 3 : (['five_choose_four', 'seven_choice'].includes(typeHint) ? 5 : 4)
  return (options || [])
    .slice(0, maxOptions)
    .map(sanitizeImportedField)
    .filter(Boolean)
    .filter((option) => !(typeHint === 'reading' && option.length > 90 && /[.!?].+[.!?]/.test(option)))
    .filter((option) => option.length <= 160)
}


const normalizeParsedMaterials = (materials) => {
  materials.forEach((material) => {
    const localId = String(material.localId || '')
    let typeHint = ''
    if (localId.startsWith('seven_choice-') || localId.startsWith('five_choose_four-')) typeHint = localId.startsWith('five_choose_four-') ? 'five_choose_four' : 'seven_choice'
    if (localId.startsWith('cloze-')) typeHint = 'cloze'
    if (localId.startsWith('fill_blank-')) typeHint = 'fill_blank'
    if (localId.startsWith('subjective-')) typeHint = 'subjective'
    if (!typeHint) {
      material.content = cleanPdfNoiseText(material.content)
      return
    }

    const endByType = {
      seven_choice: /(?:第三部分\s*语言运用|第一节\s*完形填空|完形填空)/i,
      five_choose_four: /(?:第三部分\s*语言运用|第一节\s*完形填空|完形填空)/i,
      cloze: /(?:第二节|语法填空|短文填空|用所给词适当形式填空|在空白处填入)/i,
      fill_blank: /(?:第四部分\s*综合技能|综合技能|任务型阅读|回答问题|根据短文内容回答问题)/i,
      subjective: /(?:^|\n)\s*\d{1,3}\s*[\.．、\)]\s*(?:书面表达|写作)|第二节\s*(?:（[^）]*）)?\s*(?:书面表达|写作)|英语参考答案|参考答案/i,
    }
    const cleanContent = cleanPdfNoiseText(material.content)
    const endMatch = endByType[typeHint]?.exec(cleanContent)
    material.content = dedupeRepeatedLines(cleanMaterialText(endMatch ? cleanContent.slice(0, endMatch.index) : cleanContent, typeHint))
  })
}


const ensureFillBlankMaterialForRange = (questions, materials, warnings, hasFillBlankSignals) => {
  if (!hasFillBlankSignals || materials.some((material) => String(material.localId || '').startsWith('fill_blank-'))) {
    return
  }

  const hasFillBlankQuestions = questions.some((question) => {
    const questionNo = Number(question.metadata?.questionNo)
    return questionNo >= 46 && questionNo <= 55
  })

  if (!hasFillBlankQuestions) {
    return
  }

  const material = {
    localId: `fill_blank-${materials.length + 1}`,
    type: 'TEXT',
    title: '语法填空 / 短文填空材料（需人工校对）',
    content: 'PDF 文本未稳定识别出语法填空 / 短文填空材料边界，请人工查看原文并补充材料。',
    orderIndex: materials.length + 1,
  }
  materials.push(material)
  warnings.push({ level: 'WARNING', code: 'MATERIAL_GROUP_UNCERTAIN', message: '已识别 46—55 填空题，但材料边界不稳定，已生成 fill_blank 占位材料供人工校对。', targetType: 'MATERIAL' })
}

const rebalanceFullPaperMaterialBindings = (questions, materials) => {
  const firstMaterialId = (prefix, offset = 0) => materials.filter((material) => String(material.localId || '').startsWith(prefix))[offset]?.localId || null
  const readingIds = materials.filter((material) => String(material.localId || '').startsWith('reading-')).map((material) => material.localId)
  const readingImageId = firstMaterialId('reading_image-')
  const sharedChoiceId = firstMaterialId('five_choose_four-') || firstMaterialId('seven_choice-')
  const clozeId = firstMaterialId('cloze-')
  const fillBlankId = firstMaterialId('fill_blank-')
  const subjectiveId = firstMaterialId('subjective-')

  questions.forEach((question) => {
    const questionNo = Number(question.metadata?.questionNo)
    const nextMetadata = { ...(question.metadata || {}) }
    if (questionNo >= 1 && questionNo <= 20) nextMetadata.materialLocalId = null
    if (questionNo >= 21 && questionNo <= 23 && readingImageId) nextMetadata.materialLocalId = readingImageId
    if (questionNo >= 24 && questionNo <= 27 && readingIds[0]) nextMetadata.materialLocalId = readingIds[0]
    if (questionNo >= 28 && questionNo <= 31 && readingIds[1]) nextMetadata.materialLocalId = readingIds[1]
    if (questionNo >= 32 && questionNo <= 35 && sharedChoiceId) nextMetadata.materialLocalId = sharedChoiceId
    if (questionNo >= 36 && questionNo <= 45 && clozeId) nextMetadata.materialLocalId = clozeId
    if (questionNo >= 46 && questionNo <= 55 && fillBlankId) nextMetadata.materialLocalId = fillBlankId
    if (questionNo >= 56 && questionNo <= 60 && subjectiveId) nextMetadata.materialLocalId = subjectiveId
    question.metadata = nextMetadata
  })
}

const parseAnswerDetails = (rawText) => {
  const detailMap = new Map()
  const answerStart = findAnswerSectionIndex(rawText)

  if (answerStart < 0) {
    return detailMap
  }

  const text = String(rawText || '').slice(answerStart)
  const itemRegex = /(?:^|\n|\s)(\d{1,3})\s*(?:[\.．、\)]\s*)([\s\S]*?)(?=(?:\n|\s)\d{1,3}\s*(?:[\.．、\)]\s*)|$)/g
  let match = itemRegex.exec(text)

  while (match) {
    const questionNo = String(Number(match[1]))
    const value = String(match[2] || '').trim()

    if (value && !detailMap.has(questionNo)) {
      detailMap.set(questionNo, value)
    }

    match = itemRegex.exec(text)
  }

  return detailMap
}


const splitQuestionBlocks = (rawText) => {
  if (rawText.includes('[QUESTION]')) {
    return rawText.split(/\[QUESTION\]/i).slice(1).map((block) => ({ block, materialText: '', typeHint: 'choice' }))
  }

  const normalizedText = getSectionOrderedQuestionText(rawText)

  const markerRegex = /(^|\n|\s)(?:第\s*)?(\d{1,3})\s*(?:题)?(?:[\.．、\)]\s*|\s+)/g
  const markers = []
  let match = markerRegex.exec(normalizedText)

  while (match) {
    const lineStart = match.index + match[1].length
    const questionNo = match[2]
    if (Number(questionNo) > 61) {
      match = markerRegex.exec(normalizedText)
      continue
    }
    const afterMarker = normalizedText.slice(markerRegex.lastIndex, markerRegex.lastIndex + 260)
    const previousChar = normalizedText[lineStart - 1] || ''
    const sameLineBeforeMarker = normalizedText.slice(normalizedText.lastIndexOf('\n', lineStart - 1) + 1, lineStart)
    const numberDetected = detectTypeHintByQuestionNumber(questionNo)

    if (/[A-Za-z0-9]/.test(previousChar) || /[A-Za-z]\s+$/.test(sameLineBeforeMarker) || (!numberDetected && /^[A-D][\.．、\)]?\s/.test(afterMarker)) || exampleRegex.test(afterMarker)) {
      match = markerRegex.exec(normalizedText)
      continue
    }

    const hasOptionSequence = /A(?:[\.．、\)]\s*|\s+).{1,120}B(?:[\.．、\)]\s*|\s+).{1,120}C(?:[\.．、\)]\s*|\s+)/s.test(afterMarker)
    const looksLikeQuestion = /[?？]|\b(?:what|where|when|who|which|why|how|is|are|do|does|did|can|could|would|will|should|write|translate|fill)\b/i.test(afterMarker) || /翻译|写作|作文|填空/.test(afterMarker)

    if (numberDetected || hasOptionSequence || looksLikeQuestion) {
      const context = getContextBeforeQuestion(normalizedText, lineStart)
      const contextDetected = detectTypeHintFromContext(context)
      const detected = numberDetected || contextDetected
      markers.push({ index: lineStart, context, detected })
    }

    match = markerRegex.exec(normalizedText)
  }

  if (markers.length === 0) {
    return splitFallbackChoiceBlocks(normalizedText)
  }

  return markers.map((marker, index) => {
    const nextMarker = markers[index + 1]
    const previousMarker = markers[index - 1]
    const block = normalizedText.slice(marker.index, nextMarker ? nextMarker.index : normalizedText.length).trim()
    const prefixStart = previousMarker ? previousMarker.index : Math.max(0, marker.index - 1200)
    const prefix = normalizedText.slice(prefixStart, marker.index).trim()
    const canUseReadingPrefix = marker.detected.typeHint !== 'reading' || getMaterialStartIndex(prefix, 'reading') >= 0
    const materialText = canUseReadingPrefix && ['reading', 'seven_choice', 'five_choose_four', 'cloze', 'fill_blank', 'subjective'].includes(marker.detected.typeHint) && looksLikeMaterialText(prefix, marker.detected.typeHint) ? cleanMaterialText(prefix, marker.detected.typeHint) : ''

    return {
      block,
      materialText,
      prefix,
      typeHint: marker.detected.typeHint,
      detectedType: marker.detected.type,
    }
  })
}

const splitFallbackChoiceBlocks = (formalText) => {
  const text = String(formalText || '')
  const markerRegex = /(^|\n|\s)(\d{1,3})\s*[\.．、\)]\s*/g
  const markers = []
  let match = markerRegex.exec(text)

  while (match) {
    const lineStart = match.index + match[1].length
    const previousChar = text[lineStart - 1] || ''

    if (!/[A-Za-z0-9]/.test(previousChar) && Number(match[2]) <= 61) {
      markers.push({ index: lineStart, questionNo: match[2] })
    }

    match = markerRegex.exec(text)
  }

  return markers.map((marker, index) => {
    const nextMarker = markers[index + 1]
    const block = text.slice(marker.index, nextMarker ? nextMarker.index : text.length).trim()
    const options = parseInlineOptions(block)
    const questionNumberDetected = detectTypeHintByQuestionNumber(marker.questionNo)

    if (options.length < 3) {
      return null
    }

    return {
      block,
      materialText: '',
      typeHint: questionNumberDetected?.typeHint || 'listening',
      detectedType: 'CHOICE',
      source: 'fallback-choice',
    }
  }).filter(Boolean)
}


const parseSharedCandidateOptions = (text, limit = 7) => {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[A-G][\.．、\)]\s+/.test(line))
    .slice(0, limit)
    .map((line) => line.replace(/^[A-G][\.．、\)]\s+/, '').trim())
    .filter(Boolean)
}

const parseInlineOptions = (block) => {
  const optionStart = block.search(firstOptionRegex)

  if (optionStart < 0) {
    return []
  }

  const optionText = block.slice(optionStart).replace(/\s+/g, ' ').trim()
  const options = []
  const optionRegex = /(?:^|\s)([A-G])(?:[\.．、\)]\s*|\s+)([\s\S]*?)(?=\s+[A-G](?:[\.．、\)]\s*|\s+)|$)/g
  let match = optionRegex.exec(optionText)

  while (match) {
    const value = String(match[2] || '').trim()

    if (value) {
      options.push(value)
    }

    match = optionRegex.exec(optionText)
  }

  return options
}


const parseClozeOptionBlock = (rawText) => {
  const { examText } = splitAnswerSection(cleanRawText(rawText))
  const sections = splitByMajorSections(examText)
  const source = sections.languageUse || examText
  const startMatch = /(^|\n|\s)36\s*[\.．、\)]?\s*A[\.．、\)]\s*/.exec(source)

  if (!startMatch) {
    return new Map()
  }

  const optionTail = source.slice(startMatch.index + (startMatch[1]?.length || 0))
  const endMatch = /(?:^|\n|\s)(?:第二节|阅读下面短文，在空白处填入|Long,\s*long\s*ago|46\s*[\.．、\)]|46\s+)/i.exec(optionTail.slice(1))
  const optionBlock = endMatch ? optionTail.slice(0, endMatch.index + 1) : optionTail
  const questionMarkers = []
  const questionMarkerRegex = /(^|\n|\s)(3[6-9]|4[0-5])\s*[\.．、\)]?[\s\S]{0,140}?(?=A[\.．、\)]\s*)/g
  let markerMatch = questionMarkerRegex.exec(optionBlock)

  while (markerMatch) {
    questionMarkers.push({
      index: markerMatch.index + (markerMatch[1]?.length || 0),
      questionNo: markerMatch[2],
    })
    markerMatch = questionMarkerRegex.exec(optionBlock)
  }

  const optionMap = new Map()

  questionMarkers.forEach((marker, index) => {
    const nextMarker = questionMarkers[index + 1]
    const questionOptionText = optionBlock.slice(marker.index, nextMarker ? nextMarker.index : optionBlock.length)
      .replace(/^\s*(?:3[6-9]|4[0-5])\s*[\.．、\)]?[\s\S]*?(?=A[\.．、\)]\s*)/, '')
      .replace(/[\t ]+/g, ' ')
      .trim()
    const optionRegex = /(?:^|\s|\n)([ABC])\s*[\.．、\)]\s*([\s\S]*?)(?=(?:\s|\n)[ABC]\s*[\.．、\)]\s*|$)/g
    const parsedOptions = []
    let optionMatch = optionRegex.exec(questionOptionText)

    while (optionMatch) {
      parsedOptions.push(sanitizeImportedField(optionMatch[2]))
      optionMatch = optionRegex.exec(questionOptionText)
    }

    const cleanOptions = parsedOptions.filter(Boolean).slice(0, 3)
    if (cleanOptions.length === 3) {
      optionMap.set(marker.questionNo, cleanOptions)
    }
  })

  return optionMap
}

const parseQuestionText = (block) => {
  const labeledTextMatch = block.match(/题干[:：]\s*([\s\S]*?)(?=\n\s*(?:选项[:：]|A[\.．、\)]?|答案[:：]|解析[:：]|知识点[:：]|分值[:：]|材料ID[:：]|$))/)

  if (labeledTextMatch) {
    return labeledTextMatch[1].trim()
  }

  const withoutNumber = stripQuestionNumberPrefix(block)
  const optionStart = withoutNumber.search(firstOptionRegex)
  const text = optionStart >= 0 ? withoutNumber.slice(0, optionStart) : withoutNumber

  return text.replace(/\s+/g, ' ').trim()
}

const parseImportText = (rawText, fallbackTitle) => {
  rawText = cleanPdfNoiseText(rawText)
  const warnings = []
  const examMeta = parseExamMeta(rawText, fallbackTitle)
  const materials = []
  const materialIdMap = new Map()
  const materialBlocks = rawText.split(/\[MATERIAL\]/i).slice(1)

  materialBlocks.forEach((block, index) => {
    const nextQuestion = block.split(/\[QUESTION\]/i)[0]
    const id = (nextQuestion.match(/材料ID[:：]\s*(.+)/)?.[1] || `material-${index + 1}`).trim()
    const contentMatch = nextQuestion.match(/(?:正文|听力原文)[:：]\s*([\s\S]*)/)
    const material = {
      localId: id,
      type: (nextQuestion.match(/材料类型[:：]\s*(.+)/)?.[1] || 'TEXT').trim().toUpperCase(),
      title: (nextQuestion.match(/标题[:：]\s*(.+)/)?.[1] || `材料 ${index + 1}`).trim(),
      content: contentMatch ? contentMatch[1].trim() : '',
      orderIndex: index + 1,
    }
    materials.push(material)
    materialIdMap.set(id, material)
    if (!material.content) warnings.push({ level: 'WARNING', code: 'EMPTY_MATERIAL', message: `材料 ${id} 未解析到正文，请人工补充。`, targetType: 'MATERIAL' })
  })

  const questionBlocks = splitQuestionBlocks(rawText)
  const answerMap = parseAnswerMap(rawText)
  const answerDetailMap = parseAnswerDetails(rawText)
  const clozeOptionMap = parseClozeOptionBlock(rawText)
  const seenQuestionNumbers = new Set()
  const questions = []

  if (findAnswerSectionIndex(rawText) >= 0) {
    warnings.push({ level: 'INFO', code: 'ANSWER_SECTION_SKIPPED_FOR_QUESTION_CREATION', message: '已识别答案区；答案区仅用于回填答案，不参与题目生成。', targetType: 'IMPORT_JOB' })
  }

  let currentMaterialLocalId = null

  questionBlocks.forEach((questionEntry, index) => {
    const block = typeof questionEntry === 'string' ? questionEntry : questionEntry.block
    const inferredType = typeof questionEntry === 'string' ? { type: 'CHOICE', typeHint: 'choice' } : { type: questionEntry.detectedType || 'CHOICE', typeHint: questionEntry.typeHint || 'choice' }
    const materialText = typeof questionEntry === 'string' ? '' : questionEntry.materialText
    const prefixText = typeof questionEntry === 'string' ? '' : questionEntry.prefix || ''
    const questionNo = getQuestionNumberFromBlock(block, index)
    if (isExampleQuestionBlock(block)) {
      return
    }

    if (seenQuestionNumbers.has(questionNo)) {
      return
    }

    seenQuestionNumbers.add(questionNo)

    if (inferredType.typeHint === 'cloze' && (currentMaterialLocalId?.startsWith('seven_choice-') || currentMaterialLocalId?.startsWith('five_choose_four-'))) {
      const sharedChoiceCandidates = extractSevenChoiceTail(prefixText) || extractSevenChoiceCandidates(prefixText)
      const sharedChoiceMaterial = materialIdMap.get(currentMaterialLocalId)
      appendMaterialContent(sharedChoiceMaterial, sharedChoiceCandidates)
    }

    if (materialText) {
      const shouldReuseGroupedMaterial = ['seven_choice', 'five_choose_four', 'cloze', 'fill_blank', 'subjective'].includes(inferredType.typeHint) && currentMaterialLocalId?.startsWith(`${inferredType.typeHint}-`)
      const extractedGroupMaterialText = extractFullGroupMaterial(rawText, inferredType.typeHint)
      const cleanedPrefixMaterialText = ['seven_choice', 'five_choose_four', 'cloze', 'fill_blank', 'subjective'].includes(inferredType.typeHint) ? cleanMaterialText(prefixText, inferredType.typeHint) : materialText
      const groupedMaterialText = extractedGroupMaterialText || cleanedPrefixMaterialText

      if (shouldReuseGroupedMaterial) {
        appendMaterialContent(materialIdMap.get(currentMaterialLocalId), groupedMaterialText)
      } else {
        currentMaterialLocalId = `${inferredType.typeHint || 'material'}-${materials.length + 1}`
        materials.push({
          localId: currentMaterialLocalId,
          type: getMaterialTypeByTypeHint(inferredType.typeHint),
          title: getMaterialTitleByTypeHint(inferredType.typeHint, materials.length + 1),
          content: groupedMaterialText,
          orderIndex: materials.length + 1,
        })
        materialIdMap.set(currentMaterialLocalId, materials[materials.length - 1])
        warnings.push({ level: 'WARNING', code: 'MATERIAL_GROUP_UNCERTAIN', message: `第 ${questionNo} 题前识别到材料文本，已按 ${currentMaterialLocalId} 关联，请人工确认材料边界。`, targetType: 'MATERIAL' })
      }
    }

    if (inferredType.typeHint === 'reading' && Number(questionNo) >= 21 && Number(questionNo) <= 23 && !currentMaterialLocalId?.startsWith('reading-') && !currentMaterialLocalId?.startsWith('reading_image-')) {
      currentMaterialLocalId = `reading_image-${materials.length + 1}`
      const placeholderMaterial = {
        localId: currentMaterialLocalId,
        type: 'TEXT',
        title: '阅读材料 A（图片/图表题，需人工补图）',
        content: 'PDF 文本未提取到 A 篇图片/图表内容，请人工查看原 PDF 并补充材料。',
        orderIndex: materials.length + 1,
      }
      materials.push(placeholderMaterial)
      materialIdMap.set(currentMaterialLocalId, placeholderMaterial)
      warnings.push({ level: 'WARNING', code: 'MATERIAL_IMAGE_NOT_EXTRACTED', message: '阅读 A 篇疑似图片/图表材料，PDF 文本未提取完整，请人工补充材料内容。', targetType: 'MATERIAL' })
    }

    const hasExplicitType = Boolean(block.match(/题型[:：]\s*(.+)/)?.[1])
    const type = hasExplicitType ? normalizeDraftQuestionType(block.match(/题型[:：]\s*(.+)/)?.[1], warnings, `第 ${questionNo} 题`) : inferredType.type
    const parsedText = sanitizeImportedField(parseQuestionText(block))
    const text = ['seven_choice', 'five_choose_four', 'cloze', 'fill_blank'].includes(inferredType.typeHint) ? `第${questionNo}空` : parsedText

    if (!text) {
      warnings.push({ level: 'WARNING', code: 'MISSING_QUESTION_TEXT', message: `第 ${questionNo} 题题干未明确解析，请人工补充。`, targetType: 'QUESTION' })
    }

    const labeledOptions = ['A', 'B', 'C', 'D']
      .map((letter) => block.match(new RegExp(`(?:^|\\n|\\s)${letter}(?:[\\.．、\\)]\\s*|\\s+)([^A-D\\n]+)`, 'm'))?.[1]?.trim())
      .filter(Boolean)
    const inlineOptions = parseInlineOptions(block)
    const sharedOptions = ['five_choose_four', 'seven_choice'].includes(inferredType.typeHint)
      ? parseSharedCandidateOptions(`${prefixText}
${block}`, inferredType.typeHint === 'five_choose_four' ? 5 : 7)
      : []
    const clozeOptions = inferredType.typeHint === 'cloze' ? (clozeOptionMap.get(questionNo) || []) : []
    const candidateOptions = clozeOptions.length ? clozeOptions : (sharedOptions.length ? sharedOptions : (inlineOptions.length > labeledOptions.length ? inlineOptions : labeledOptions))
    const options = sanitizeQuestionOptions(candidateOptions, inferredType.typeHint)
    const answerRaw = block.match(/(?:答案|参考答案)[:：]\s*(.+)/)?.[1]?.trim() || ''
    const answerDetail = sanitizeImportedField(answerDetailMap.get(questionNo) || '')
    const mappedAnswer = answerMap.get(questionNo)
    const answer = type === 'CHOICE' ? (mappedAnswer ?? answerLetterMap[answerRaw.toUpperCase()] ?? null) : (sanitizeImportedField(answerRaw) || answerDetail)
    const score = Number(block.match(/分值[:：]\s*([0-9.]+)/)?.[1] || 0) || (inferredType.typeHint === 'listening' ? 1 : 2)
    const materialLocalId = block.match(/材料ID[:：]\s*(.+)/)?.[1]?.trim() || (['reading', 'seven_choice', 'five_choose_four', 'cloze', 'fill_blank', 'subjective', 'translation'].includes(inferredType.typeHint) ? currentMaterialLocalId : null)

    const choiceLike = isChoiceLikeQuestion(text, options)

    if (type === 'CHOICE' && options.length > 0 && options.length < 3) warnings.push({ level: 'WARNING', code: 'CHOICE_OPTIONS_INCOMPLETE', message: `第 ${questionNo} 题选项少于 3 个，请人工校对。`, targetType: 'QUESTION' })
    if (type === 'CHOICE' && options.length === 0) warnings.push({ level: 'WARNING', code: 'NON_CHOICE_LIKE_QUESTION', message: `第 ${questionNo} 题未识别到选项，已保留为安全草稿题，请人工确认题型和答案。`, targetType: 'QUESTION' })
    if (!['choice', 'listening', 'reading'].includes(inferredType.typeHint) && type === 'CHOICE') warnings.push({ level: 'WARNING', code: 'UNKNOWN_QUESTION_TYPE_SAFE_FALLBACK', message: `第 ${questionNo} 题疑似 ${inferredType.typeHint}，当前使用安全题型保存，请人工确认。`, targetType: 'QUESTION' })
    if (type === 'CHOICE' && choiceLike && answer === null) warnings.push({ level: 'WARNING', code: 'MISSING_CHOICE_ANSWER', message: `第 ${questionNo} 题没有可用客观题答案，请人工补充。`, targetType: 'QUESTION' })
    if (materialLocalId && !materialIdMap.has(materialLocalId)) warnings.push({ level: 'WARNING', code: 'MATERIAL_BINDING_UNCERTAIN', message: `第 ${questionNo} 题引用的材料 ${materialLocalId} 未找到，入库前请确认。`, targetType: 'QUESTION' })

    questions.push({
      type, text: text || (['seven_choice', 'five_choose_four', 'cloze', 'fill_blank'].includes(inferredType.typeHint) ? `第${questionNo}空` : `第${questionNo}题`), options: options.length ? options : null, answer, score,
      knowledgePoint: block.match(/知识点[:：]\s*(.+)/)?.[1]?.trim() || '未分类',
      referenceAnswer: type === 'CHOICE' ? '' : (sanitizeImportedField(answerRaw) || answerDetail),
      explanation: sanitizeImportedField(block.match(/(?:解析|答案解析|解题思路|原因)[:：]\s*(.+)/)?.[1] || ''),
      orderIndex: Number(questionNo) || index + 1,
      metadata: { questionNo, materialLocalId, typeHint: inferredType.typeHint, displayType: inferredType.displayType || inferredType.typeHint },
    })
  })

  const formalQuestionText = rawText.includes('[QUESTION]') ? rawText : extractFormalQuestionText(rawText)
  const hasFillBlankSignals = /(?:语法填空|短文填空|用所给词适当形式填空|在空白处填入)/.test(formalQuestionText)
    || Array.from({ length: 10 }, (_, index) => String(46 + index)).some((numberText) => answerDetailMap.has(numberText) || new RegExp(`(^|\\n|\\s)(?:第\\s*)?${numberText}\\s*(?:题)?(?:[\\.．、\\)]\\s*|\\s+)`).test(formalQuestionText))
  for (let questionNumber = 1; questionNumber <= 61; questionNumber += 1) {
    const questionNo = String(questionNumber)
    const hasFormalMarker = new RegExp(`(^|\\n|\\s)(?:第\\s*)?${questionNo}\\s*(?:题)?(?:[\\.．、\\)]\\s*|\\s+)`).test(formalQuestionText)
    const shouldSynthesizeFillBlank = questionNumber >= 46 && questionNumber <= 55 && hasFillBlankSignals

    if ((!hasFormalMarker && !shouldSynthesizeFillBlank) || seenQuestionNumbers.has(questionNo)) {
      continue
    }

    const inferredType = detectTypeHintByQuestionNumber(questionNo) || { type: 'CHOICE', typeHint: 'choice' }
    const materialLocalId = ['seven_choice', 'five_choose_four', 'cloze', 'fill_blank', 'subjective'].includes(inferredType.typeHint)
      ? materials.find((material) => material.localId.startsWith(`${inferredType.typeHint}-`))?.localId || null
      : (inferredType.typeHint === 'translation' ? materials.find((material) => material.localId.startsWith('subjective-'))?.localId || null : null)
    const mappedAnswer = answerMap.get(questionNo)
    const answerDetail = answerDetailMap.get(questionNo) || ''
    const answer = inferredType.type === 'CHOICE' ? (mappedAnswer ?? null) : answerDetail

    questions.push({
      type: inferredType.type,
      text: ['seven_choice', 'five_choose_four', 'cloze', 'fill_blank'].includes(inferredType.typeHint) ? `第${questionNo}空` : `第${questionNo}题`,
      options: null,
      answer,
      score: 2,
      knowledgePoint: '未分类',
      referenceAnswer: inferredType.type === 'CHOICE' ? '' : answerDetail,
      explanation: '',
      orderIndex: questionNumber,
      metadata: { questionNo, materialLocalId, typeHint: inferredType.typeHint, displayType: inferredType.displayType || inferredType.typeHint, synthesized: true },
    })
    seenQuestionNumbers.add(questionNo)
    warnings.push({ level: 'WARNING', code: 'QUESTION_SYNTHESIZED_FROM_NUMBER', message: `第 ${questionNo} 题只识别到题号，已生成安全草稿题，请人工补全题干/答案。`, targetType: 'QUESTION' })
  }

  ensureFillBlankMaterialForRange(questions, materials, warnings, hasFillBlankSignals)
  questions.sort((a, b) => Number(a.metadata?.questionNo || a.orderIndex) - Number(b.metadata?.questionNo || b.orderIndex))
  normalizeParsedMaterials(materials)
  rebalanceFullPaperMaterialBindings(questions, materials)

  if (questions.length === 0) {
    warnings.push({
      level: 'WARNING',
      code: rawText.trim() ? 'RAW_TEXT_UNRECOGNIZED' : 'NO_QUESTIONS_PARSED',
      message: rawText.trim() ? '已提取文本但题目格式未识别，请人工编辑 rawText 后重新解析。' : '未解析到题目，请人工检查原始文本。',
    })
  }

  return { examMeta, materials, questions, warnings }
}

const getParserDiagnostics = (rawText, fallbackTitle = 'parser diagnostics') => {
  const formalQuestionText = getSectionOrderedQuestionText(rawText)
  const parsed = parseImportText(rawText, fallbackTitle)
  const firstQuestionMatch = formalQuestionText.match(/(^|\n|\s)1\s*[\.．、\)]\s*([\s\S]{0,220})/)
  const secondQuestionMatch = formalQuestionText.match(/(^|\n|\s)2\s*[\.．、\)]\s*([\s\S]{0,220})/)
  const thirdQuestionMatch = formalQuestionText.match(/(^|\n|\s)3\s*[\.．、\)]\s*([\s\S]{0,220})/)
  const firstQuestionBlock = splitQuestionBlocks(rawText)[0]?.block || firstQuestionMatch?.[0] || ''
  const firstQuestionOptions = parseInlineOptions(firstQuestionBlock)

  return {
    formalQuestionTextFound: Boolean(formalQuestionText.trim()),
    formalQuestionTextLength: formalQuestionText.length,
    formalQuestionTextPreview: formalQuestionText.slice(0, 500),
    matchedQuestionNumbers: {
      1: Boolean(firstQuestionMatch),
      2: Boolean(secondQuestionMatch),
      3: Boolean(thirdQuestionMatch),
    },
    firstQuestionOptions,
    questionCount: parsed.questions.length,
    warningCodes: parsed.warnings.map((warning) => warning.code),
    zeroQuestionReason: parsed.questions.length === 0
      ? 'No question blocks survived marker/fallback parsing. Inspect formalQuestionTextPreview and matchedQuestionNumbers.'
      : '',
  }
}

const extractUploadedText = async (file) => {
  if (!file) return ''
  if (file.mimetype === 'text/plain' || file.originalname.toLowerCase().endsWith('.txt')) return file.buffer.toString('utf8')
  if (file.mimetype.includes('wordprocessingml') || file.originalname.toLowerCase().endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer: file.buffer })
    return result.value || ''
  }
  if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    return extractPdfText(file.buffer)
  }
  return file.buffer.toString('utf8')
}

const assertTeacherOwnsClassroom = async (classroomId, teacherId) => {
  return prisma.classroom.findFirst({
    where: {
      id: classroomId,
      teacherId,
    },
  })
}

router.post('/teacher/classrooms', requireTeacher, async (req, res) => {
  try {
    const { name, description } = req.body

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        message: '班级名称不能为空',
      })
    }

    let inviteCode = generateInviteCode()
    let existing = await prisma.classroom.findUnique({
      where: {
        inviteCode,
      },
    })

    while (existing) {
      inviteCode = generateInviteCode()
      existing = await prisma.classroom.findUnique({
        where: {
          inviteCode,
        },
      })
    }

    const classroom = await prisma.classroom.create({
      data: {
        teacherId: req.user.id,
        name: String(name).trim(),
        description: description || '',
        inviteCode,
      },
      include: {
        _count: {
          select: {
            students: true,
            assignments: true,
          },
        },
      },
    })

    res.status(201).json({
      message: '班级创建成功',
      data: formatClassroom(classroom),
    })
  } catch (error) {
    console.error('Create classroom error:', error)
    res.status(500).json({
      message: '班级创建失败',
      error: error.message,
    })
  }
})

router.get('/teacher/classrooms', requireTeacher, async (req, res) => {
  try {
    const classrooms = await prisma.classroom.findMany({
      where: {
        teacherId: req.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            students: true,
            assignments: true,
          },
        },
      },
    })

    res.json({
      message: '班级列表获取成功',
      data: classrooms.map(formatClassroom),
    })
  } catch (error) {
    console.error('Get classrooms error:', error)
    res.status(500).json({
      message: '班级列表获取失败',
      error: error.message,
    })
  }
})

router.get('/teacher/classrooms/:id/students', requireTeacher, async (req, res) => {
  try {
    const classroom = await assertTeacherOwnsClassroom(req.params.id, req.user.id)

    if (!classroom) {
      return res.status(404).json({
        message: '班级不存在或无权访问',
      })
    }

    const students = await prisma.classStudent.findMany({
      where: {
        classroomId: req.params.id,
      },
      orderBy: {
        joinedAt: 'desc',
      },
      include: {
        student: {
          select: {
            id: true,
            username: true,
            nickname: true,
            gradeLevel: true,
            createdAt: true,
          },
        },
      },
    })

    res.json({
      message: '班级学生获取成功',
      data: students.map((item) => ({
        id: item.id,
        joinedAt: item.joinedAt,
        ...item.student,
      })),
    })
  } catch (error) {
    console.error('Get classroom students error:', error)
    res.status(500).json({
      message: '班级学生获取失败',
      error: error.message,
    })
  }
})

router.post('/student/classrooms/join', requireAuth, requireRole('STUDENT'), async (req, res) => {
  try {
    const { inviteCode } = req.body

    if (!inviteCode || !String(inviteCode).trim()) {
      return res.status(400).json({
        message: '请输入班级邀请码',
      })
    }

    const classroom = await prisma.classroom.findUnique({
      where: {
        inviteCode: String(inviteCode).trim().toUpperCase(),
      },
    })

    if (!classroom) {
      return res.status(404).json({
        message: '邀请码无效，未找到班级',
      })
    }

    const membership = await prisma.classStudent.upsert({
      where: {
        classroomId_studentId: {
          classroomId: classroom.id,
          studentId: req.user.id,
        },
      },
      update: {},
      create: {
        classroomId: classroom.id,
        studentId: req.user.id,
      },
      include: {
        classroom: true,
      },
    })

    res.status(201).json({
      message: '加入班级成功',
      data: {
        id: membership.id,
        joinedAt: membership.joinedAt,
        classroom: formatClassroom(membership.classroom),
      },
    })
  } catch (error) {
    console.error('Join classroom error:', error)
    res.status(500).json({
      message: '加入班级失败',
      error: error.message,
    })
  }
})

router.get('/student/assignments', requireAuth, requireRole('STUDENT'), async (req, res) => {
  try {
    const memberships = await prisma.classStudent.findMany({
      where: {
        studentId: req.user.id,
      },
      select: {
        classroomId: true,
      },
    })

    const classroomIds = memberships.map((item) => item.classroomId)

    if (classroomIds.length === 0) {
      return res.json({
        message: '学生任务获取成功',
        data: [],
      })
    }

    const assignments = await prisma.assignment.findMany({
      where: {
        classroomId: {
          in: classroomIds,
        },
      },
      orderBy: {
        publishedAt: 'desc',
      },
      include: {
        classroom: true,
        exam: true,
        attempts: {
          where: {
            userId: req.user.id,
          },
          orderBy: {
            submittedAt: 'desc',
          },
          take: 1,
        },
      },
    })

    res.json({
      message: '学生任务获取成功',
      data: assignments.map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        dueAt: assignment.dueAt,
        publishedAt: assignment.publishedAt,
        classroom: {
          id: assignment.classroom.id,
          name: assignment.classroom.name,
        },
        exam: {
          id: assignment.exam.id,
          title: assignment.exam.title,
          gradeLevel: assignment.exam.gradeLevel,
          timeLimit: assignment.exam.timeLimit,
          totalScore: assignment.exam.totalScore,
        },
        latestAttempt: assignment.attempts[0] || null,
        submitted: assignment.attempts.length > 0,
      })),
    })
  } catch (error) {
    console.error('Get student assignments error:', error)
    res.status(500).json({
      message: '学生任务获取失败',
      error: error.message,
    })
  }
})

router.post('/teacher/assignments', requireTeacher, async (req, res) => {
  try {
    const { classroomId, examId, title, description, dueAt } = req.body

    if (!classroomId || !examId) {
      return res.status(400).json({
        message: '班级和试卷不能为空',
      })
    }

    const classroom = await assertTeacherOwnsClassroom(classroomId, req.user.id)

    if (!classroom) {
      return res.status(404).json({
        message: '班级不存在或无权发布任务',
      })
    }

    const exam = await prisma.exam.findUnique({
      where: {
        id: examId,
      },
    })

    if (!exam) {
      return res.status(404).json({
        message: '试卷不存在',
      })
    }

    const assignment = await prisma.assignment.create({
      data: {
        teacherId: req.user.id,
        classroomId,
        examId,
        title: title || exam.title,
        description: description || '',
        dueAt: dueAt ? new Date(dueAt) : null,
      },
      include: {
        classroom: true,
        exam: true,
        _count: {
          select: {
            attempts: true,
          },
        },
      },
    })

    res.status(201).json({
      message: '任务发布成功',
      data: assignment,
    })
  } catch (error) {
    console.error('Create assignment error:', error)
    res.status(500).json({
      message: '任务发布失败',
      error: error.message,
    })
  }
})

router.get('/teacher/assignments', requireTeacher, async (req, res) => {
  try {
    const assignments = await prisma.assignment.findMany({
      where: {
        teacherId: req.user.id,
      },
      orderBy: {
        publishedAt: 'desc',
      },
      include: {
        classroom: {
          include: {
            _count: {
              select: {
                students: true,
              },
            },
          },
        },
        exam: true,
        _count: {
          select: {
            attempts: true,
          },
        },
      },
    })

    res.json({
      message: '教师任务获取成功',
      data: assignments,
    })
  } catch (error) {
    console.error('Get teacher assignments error:', error)
    res.status(500).json({
      message: '教师任务获取失败',
      error: error.message,
    })
  }
})

router.get('/teacher/assignments/:assignmentId/submissions', requireTeacher, async (req, res) => {
  try {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: req.params.assignmentId,
        teacherId: req.user.id,
      },
      include: {
        classroom: true,
        exam: true,
      },
    })

    if (!assignment) {
      return res.status(404).json({
        message: '任务不存在或无权访问',
      })
    }

    const [students, attempts] = await Promise.all([
      prisma.classStudent.findMany({
        where: {
          classroomId: assignment.classroomId,
        },
        include: {
          student: {
            select: {
              id: true,
              username: true,
              nickname: true,
              gradeLevel: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'asc',
        },
      }),
      prisma.examAttempt.findMany({
        where: {
          assignmentId: assignment.id,
        },
        orderBy: {
          submittedAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              nickname: true,
              gradeLevel: true,
            },
          },
          userAnswers: {
            include: {
              question: {
                select: {
                  score: true,
                },
              },
            },
          },
        },
      }),
    ])

    const latestAttemptByStudent = new Map()

    attempts.forEach((attempt) => {
      if (!latestAttemptByStudent.has(attempt.userId)) {
        latestAttemptByStudent.set(attempt.userId, attempt)
      }
    })

    const submissions = students.map((item) => {
      const attempt = latestAttemptByStudent.get(item.studentId)
      const examTotalScore = attempt
        ? attempt.userAnswers.reduce((sum, answer) => sum + Number(answer.question?.score || 0), 0)
        : Number(assignment.exam.totalScore || 0)

      return {
        student: item.student,
        submitted: Boolean(attempt),
        attempt: attempt
          ? {
              id: attempt.id,
              totalScore: attempt.totalScore,
              objectiveScore: attempt.objectiveScore,
              subjectiveScore: attempt.subjectiveScore,
              accuracyRate: attempt.accuracyRate,
              usedTime: attempt.usedTime,
              submittedAt: attempt.submittedAt,
              examTotalScore,
              scoreRate: examTotalScore > 0 ? Math.round((Number(attempt.totalScore || 0) / examTotalScore) * 100) : 0,
            }
          : null,
      }
    })

    res.json({
      message: '任务提交情况获取成功',
      data: {
        assignment,
        submissions,
      },
    })
  } catch (error) {
    console.error('Get assignment submissions error:', error)
    res.status(500).json({
      message: '任务提交情况获取失败',
      error: error.message,
    })
  }
})

router.post('/import/jobs', requireTeacherOrAdmin, upload.single('file'), async (req, res) => {
  try {
    const uploadedText = await extractUploadedText(req.file)
    const body = req.body || {}
    const rawText = uploadedText || body.rawText || ''
    const title = body.title || (req.file ? req.file.originalname.replace(/\.[^.]+$/, '') : '') || '导入试卷草稿'

    if (!String(title).trim()) {
      return res.status(400).json({ message: '导入任务标题不能为空' })
    }

    if (!String(rawText).trim()) {
      return res.status(400).json({ message: '请上传 TXT / DOCX / 文字型 PDF，或粘贴试卷文本' })
    }

    const parsed = parseImportText(String(rawText), String(title).trim())
    const requestWarnings = Array.isArray(body.warnings) ? body.warnings : []
    const sourceWarnings = req.file
      ? [{ level: 'INFO', code: 'SOURCE_FILE', message: `源文件：${req.file.originalname}，类型：${req.file.mimetype || 'unknown'}` }]
      : []

    const job = await prisma.importJob.create({
      data: {
        creatorId: req.user.id,
        examId: body.examId || null,
        gradeLevel: validGradeLevel(parsed.examMeta.gradeLevel),
        title: parsed.examMeta.title,
        rawText: String(rawText),
        status: String(rawText).trim() ? 'NEEDS_REVIEW' : 'FAILED',
        sourceType: req.file ? 'FILE_UPLOAD' : 'PASTED_TEXT',
        metadata: {
          examMeta: parsed.examMeta,
          sourceFile: req.file ? { originalName: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size } : null,
        },
        questions: {
          create: parsed.questions.map((question) => ({
            type: question.type,
            text: question.text,
            options: question.options,
            answer: question.answer === undefined ? null : question.answer,
            score: question.score,
            knowledgePoint: question.knowledgePoint,
            referenceAnswer: question.referenceAnswer,
            explanation: question.explanation,
            orderIndex: question.orderIndex,
            metadata: question.metadata,
          })),
        },
        materials: {
          create: parsed.materials.map((material) => ({
            type: material.type,
            title: material.title,
            content: material.content,
            orderIndex: material.orderIndex,
            metadata: { localId: material.localId },
          })),
        },
        warnings: {
          create: [...sourceWarnings, ...parsed.warnings, ...requestWarnings].map((warning) => ({
            level: warning.level || 'WARNING',
            code: warning.code || null,
            field: warning.field || null,
            message: warning.message || '导入草稿需要人工校对',
            targetType: warning.targetType || null,
            targetId: warning.targetId || null,
          })),
        },
      },
      include: { questions: true, materials: true, warnings: true },
    })

    res.status(201).json({ message: '导入草稿创建成功', data: job })
  } catch (error) {
    console.error('Create import job error:', error)
    res.status(500).json({ message: '导入草稿创建失败', error: error.message })
  }
})

router.get('/import/jobs', requireTeacherOrAdmin, async (req, res) => {
  try {
    const where = req.user.role === 'ADMIN' ? {} : { creatorId: req.user.id }

    const jobs = await prisma.importJob.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            nickname: true,
            role: true,
          },
        },
        _count: {
          select: {
            questions: true,
            materials: true,
            warnings: true,
          },
        },
      },
    })

    res.json({
      message: '导入草稿列表获取成功',
      data: jobs,
    })
  } catch (error) {
    console.error('Get import jobs error:', error)
    res.status(500).json({
      message: '导入草稿列表获取失败',
      error: error.message,
    })
  }
})

router.get('/import/jobs/:id', requireTeacherOrAdmin, async (req, res) => {
  try {
    const where = req.user.role === 'ADMIN'
      ? { id: req.params.id }
      : { id: req.params.id, creatorId: req.user.id }

    const job = await prisma.importJob.findFirst({
      where,
      include: {
        questions: {
          orderBy: {
            orderIndex: 'asc',
          },
        },
        materials: {
          orderBy: {
            orderIndex: 'asc',
          },
        },
        warnings: true,
      },
    })

    if (!job) {
      return res.status(404).json({
        message: '导入草稿不存在或无权访问',
      })
    }

    res.json({
      message: '导入草稿详情获取成功',
      data: job,
    })
  } catch (error) {
    console.error('Get import job error:', error)
    res.status(500).json({
      message: '导入草稿详情获取失败',
      error: error.message,
    })
  }
})


const replaceImportJobDraftFromRawText = async (job, rawText) => {
  const parsed = parseImportText(String(rawText || ''), job.title)

  return prisma.$transaction(async (tx) => {
    await tx.importDraftQuestion.deleteMany({ where: { importJobId: job.id } })
    await tx.importDraftMaterial.deleteMany({ where: { importJobId: job.id } })
    await tx.importWarning.deleteMany({ where: { importJobId: job.id } })

    await tx.importJob.update({
      where: { id: job.id },
      data: {
        rawText: String(rawText || ''),
        gradeLevel: validGradeLevel(parsed.examMeta.gradeLevel),
        status: String(rawText || '').trim() ? 'NEEDS_REVIEW' : 'FAILED',
        metadata: {
          ...(job.metadata || {}),
          examMeta: parsed.examMeta,
          reparsedAt: new Date().toISOString(),
        },
      },
    })

    for (const material of parsed.materials) {
      await tx.importDraftMaterial.create({
        data: {
          importJobId: job.id,
          type: material.type,
          title: material.title,
          content: material.content,
          orderIndex: material.orderIndex,
          metadata: { localId: material.localId },
        },
      })
    }

    for (const question of parsed.questions) {
      await tx.importDraftQuestion.create({
        data: {
          importJobId: job.id,
          type: question.type,
          text: question.text,
          options: question.options,
          answer: question.answer === undefined ? null : question.answer,
          score: question.score,
          knowledgePoint: question.knowledgePoint,
          referenceAnswer: question.referenceAnswer,
          explanation: question.explanation,
          orderIndex: question.orderIndex,
          metadata: question.metadata,
        },
      })
    }

    for (const warning of parsed.warnings) {
      await tx.importWarning.create({
        data: {
          importJobId: job.id,
          level: warning.level || 'WARNING',
          code: warning.code || null,
          field: warning.field || null,
          message: warning.message || '导入草稿需要人工校对',
          targetType: warning.targetType || null,
          targetId: warning.targetId || null,
        },
      })
    }

    return tx.importJob.findUnique({
      where: { id: job.id },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        materials: { orderBy: { orderIndex: 'asc' } },
        warnings: true,
      },
    })
  })
}

router.post('/import/jobs/:id/reparse', requireTeacherOrAdmin, async (req, res) => {
  try {
    const where = req.user.role === 'ADMIN'
      ? { id: req.params.id }
      : { id: req.params.id, creatorId: req.user.id }
    const job = await prisma.importJob.findFirst({ where })

    if (!job) {
      return res.status(404).json({ message: '导入草稿不存在或无权访问' })
    }

    const reparsedJob = await replaceImportJobDraftFromRawText(job, req.body.rawText ?? job.rawText ?? '')

    res.json({ message: 'rawText 重新解析成功', data: reparsedJob })
  } catch (error) {
    console.error('Reparse import job error:', error)
    res.status(500).json({ message: 'rawText 重新解析失败', error: error.message })
  }
})


const findAccessibleImportJob = async (jobId, user) => {
  const where = user.role === 'ADMIN' ? { id: jobId } : { id: jobId, creatorId: user.id }
  return prisma.importJob.findFirst({ where })
}

router.patch('/import/draft-questions/:id', requireTeacherOrAdmin, async (req, res) => {
  try {
    const draftQuestion = await prisma.importDraftQuestion.findUnique({ where: { id: req.params.id }, include: { importJob: true } })
    if (!draftQuestion || (req.user.role !== 'ADMIN' && draftQuestion.importJob.creatorId !== req.user.id)) {
      return res.status(404).json({ message: '草稿题目不存在或无权访问' })
    }
    const { text, options, answer, explanation, type, score, knowledgePoint, referenceAnswer, materialLocalId } = req.body
    const data = {
      ...(text !== undefined ? { text: String(text).trim() || '待校对题目' } : {}),
      ...(options !== undefined ? { options } : {}),
      ...(answer !== undefined ? { answer } : {}),
      ...(explanation !== undefined ? { explanation: explanation || '' } : {}),
      ...(type !== undefined ? { type: validQuestionTypes.has(String(type).toUpperCase()) ? String(type).toUpperCase() : 'CHOICE' } : {}),
      ...(score !== undefined ? { score: Number(score) || 2 } : {}),
      ...(knowledgePoint !== undefined ? { knowledgePoint: knowledgePoint || '未分类' } : {}),
      ...(referenceAnswer !== undefined ? { referenceAnswer: referenceAnswer || '' } : {}),
      ...(materialLocalId !== undefined ? { metadata: { ...(draftQuestion.metadata || {}), materialLocalId: materialLocalId || null } } : {}),
      reviewStatus: 'REVIEWED',
    }
    const updated = await prisma.importDraftQuestion.update({ where: { id: req.params.id }, data })
    res.json({ message: '草稿题目更新成功', data: updated })
  } catch (error) {
    console.error('Update draft question error:', error)
    res.status(500).json({ message: '草稿题目更新失败', error: error.message })
  }
})

router.patch('/import/draft-materials/:id', requireTeacherOrAdmin, async (req, res) => {
  try {
    const material = await prisma.importDraftMaterial.findUnique({ where: { id: req.params.id }, include: { importJob: true } })
    if (!material || (req.user.role !== 'ADMIN' && material.importJob.creatorId !== req.user.id)) {
      return res.status(404).json({ message: '草稿材料不存在或无权访问' })
    }
    const { title, content, type, fileName, fileUrl } = req.body
    const updated = await prisma.importDraftMaterial.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined ? { title: title || '' } : {}),
        ...(content !== undefined ? { content: content || '' } : {}),
        ...(type !== undefined ? { type: String(type || 'TEXT').toUpperCase() } : {}),
        ...(fileName !== undefined ? { fileName: fileName || '' } : {}),
        ...(fileUrl !== undefined ? { fileUrl: fileUrl || '' } : {}),
      },
    })
    res.json({ message: '草稿材料更新成功', data: updated })
  } catch (error) {
    console.error('Update draft material error:', error)
    res.status(500).json({ message: '草稿材料更新失败', error: error.message })
  }
})

router.patch('/import/warnings/:id/resolve', requireTeacherOrAdmin, async (req, res) => {
  try {
    const warning = await prisma.importWarning.findUnique({ where: { id: req.params.id }, include: { importJob: true } })
    if (!warning || (req.user.role !== 'ADMIN' && warning.importJob.creatorId !== req.user.id)) {
      return res.status(404).json({ message: 'warning 不存在或无权访问' })
    }
    const updated = await prisma.importWarning.update({ where: { id: req.params.id }, data: { isResolved: true } })
    res.json({ message: 'warning 已标记处理', data: updated })
  } catch (error) {
    console.error('Resolve warning error:', error)
    res.status(500).json({ message: 'warning 处理失败', error: error.message })
  }
})

router.post('/import/jobs/:id/confirm', requireTeacherOrAdmin, async (req, res) => {
  try {
    const accessibleJob = await findAccessibleImportJob(req.params.id, req.user)
    if (!accessibleJob) return res.status(404).json({ message: '导入草稿不存在或无权访问' })

    const job = await prisma.importJob.findUnique({
      where: { id: req.params.id },
      include: { questions: { orderBy: { orderIndex: 'asc' } }, materials: { orderBy: { orderIndex: 'asc' } }, warnings: true },
    })
    if (job.questions.length === 0) return res.status(400).json({ message: '确认入库前至少需要 1 道草稿题' })

    const examMeta = job.metadata?.examMeta || {}
    const totalScore = job.questions.reduce((sum, question) => sum + Number(question.score || 2), 0)
    const created = await prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          title: examMeta.title || job.title,
          gradeLevel: validGradeLevel(examMeta.gradeLevel || job.gradeLevel),
          description: `由导入草稿 ${job.title} 确认入库生成`,
          timeLimit: Number(examMeta.timeLimit || 1800),
          totalScore,
          isPublished: req.user.role === 'TEACHER',
          sourceType: req.user.role === 'TEACHER' ? 'TEACHER_CUSTOM' : 'PLATFORM_STANDARD',
          visibility: req.user.role === 'TEACHER' ? 'PRIVATE' : 'PUBLIC',
          publishStatus: req.user.role === 'TEACHER' ? 'PUBLISHED' : 'DRAFT',
        },
      })
      const materialMap = new Map()
      for (const material of job.materials) {
        const createdMaterial = await tx.questionMaterial.create({ data: { examId: exam.id, type: material.type || 'TEXT', title: material.title, content: material.content, fileUrl: material.fileUrl, orderIndex: material.orderIndex, metadata: material.metadata } })
        if (material.metadata?.localId) materialMap.set(material.metadata.localId, createdMaterial.id)
      }
      for (const question of job.questions) {
        const qType = validQuestionTypes.has(String(question.type).toUpperCase()) ? String(question.type).toUpperCase() : 'CHOICE'
        await tx.question.create({ data: { examId: exam.id, materialId: question.metadata?.materialLocalId ? materialMap.get(question.metadata.materialLocalId) || null : null, type: qType, text: question.text, options: question.options, answer: question.answer, score: Number(question.score || 2), knowledgePoint: question.knowledgePoint || '未分类', referenceAnswer: question.referenceAnswer || '', explanation: question.explanation || '', orderIndex: question.orderIndex } })
      }
      await tx.importJob.update({ where: { id: job.id }, data: { examId: exam.id, status: 'IMPORTED' } })
      return exam
    })
    res.json({ message: '确认入库成功', data: { examId: created.id, exam: created } })
  } catch (error) {
    console.error('Confirm import job error:', error)
    res.status(500).json({ message: '确认入库失败', error: error.message })
  }
})

const validGradeLevel = (value) => {
  const allowed = ['PRIMARY', 'JUNIOR', 'SENIOR', 'COLLEGE', 'CET4', 'CET6', 'POSTGRADUATE', 'IELTS', 'TOEFL', 'BUSINESS', 'ADULT', 'PROFESSIONAL', 'GENERAL', 'OTHER']
  return allowed.includes(String(value || '').toUpperCase()) ? String(value).toUpperCase() : 'GENERAL'
}

router.post('/skills', requireTeacherOrAdmin, async (req, res) => {
  try {
    const { name, description, prompt } = req.body

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        message: 'Skill 名称不能为空',
      })
    }

    const skill = await prisma.generationSkill.create({
      data: {
        creatorId: req.user.id,
        name: String(name).trim(),
        description: description || '',
        prompt: prompt || '',
      },
    })

    res.status(201).json({
      message: 'Skill 创建成功',
      data: skill,
    })
  } catch (error) {
    console.error('Create skill error:', error)
    res.status(500).json({
      message: 'Skill 创建失败',
      error: error.message,
    })
  }
})

router.get('/skills', requireTeacherOrAdmin, async (req, res) => {
  try {
    const where = req.user.role === 'ADMIN' ? {} : { creatorId: req.user.id }

    const skills = await prisma.generationSkill.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            nickname: true,
            role: true,
          },
        },
      },
    })

    res.json({
      message: 'Skill 列表获取成功',
      data: skills,
    })
  } catch (error) {
    console.error('Get skills error:', error)
    res.status(500).json({
      message: 'Skill 列表获取失败',
      error: error.message,
    })
  }
})

const updateSkillActiveStatus = (isActive) => {
  return async (req, res) => {
    try {
      const where = req.user.role === 'ADMIN'
        ? { id: req.params.id }
        : { id: req.params.id, creatorId: req.user.id }

      const existing = await prisma.generationSkill.findFirst({
        where,
      })

      if (!existing) {
        return res.status(404).json({
          message: 'Skill 不存在或无权操作',
        })
      }

      const skill = await prisma.generationSkill.update({
        where: {
          id: existing.id,
        },
        data: {
          isActive,
        },
      })

      res.json({
        message: isActive ? 'Skill 已启用' : 'Skill 已停用',
        data: skill,
      })
    } catch (error) {
      console.error('Update skill status error:', error)
      res.status(500).json({
        message: 'Skill 状态更新失败',
        error: error.message,
      })
    }
  }
}

router.patch('/skills/:id/activate', requireTeacherOrAdmin, updateSkillActiveStatus(true))
router.patch('/skills/:id/deactivate', requireTeacherOrAdmin, updateSkillActiveStatus(false))

module.exports = router
module.exports.__test = {
  parseImportText,
  getParserDiagnostics,
  parseClozeOptionBlock,
  questionTypeRuleRegistry,
}
