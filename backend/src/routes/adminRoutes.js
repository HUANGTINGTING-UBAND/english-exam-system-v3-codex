const express = require('express')
const prisma = require('../lib/prisma')
const { requireAdmin } = require('../middlewares/authMiddleware')

const router = express.Router()

const normalizeQuestionType = (type) => {
  const typeText = String(type || '').toUpperCase()

  const typeMap = {
    CHOICE: 'CHOICE',
    SINGLE_CHOICE: 'CHOICE',
    单选题: 'CHOICE',
    选择题: 'CHOICE',

    TRANSLATION: 'TRANSLATION',
    翻译题: 'TRANSLATION',

    ERROR_CORRECTION: 'ERROR_CORRECTION',
    改错题: 'ERROR_CORRECTION',

    WRITING: 'WRITING',
    写作题: 'WRITING',

    READING: 'READING',
    阅读理解: 'READING',

    CLOZE: 'CLOZE',
    完形填空: 'CLOZE',
  }

  return typeMap[typeText] || typeText || 'CHOICE'
}

const normalizeParsedQuestions = (questions) => {
  if (!Array.isArray(questions)) {
    return []
  }

  return questions
    .map((question, index) => {
      const finalType = normalizeQuestionType(question.type)

      return {
        type: finalType,
        text: String(question.text || '').trim(),
        options:
          finalType === 'CHOICE' && Array.isArray(question.options)
            ? question.options.map((option) => String(option).trim()).filter(Boolean)
            : null,
        answer:
          question.answer === undefined || question.answer === null || question.answer === ''
            ? null
            : question.answer,
        score: Number(question.score || 0),
        knowledgePoint: String(question.knowledgePoint || '未分类').trim(),
        referenceAnswer: String(question.referenceAnswer || '').trim(),
        explanation: String(question.explanation || '').trim(),
        orderIndex: Number(question.orderIndex || index + 1),
      }
    })
    .filter((question) => question.text)
}

router.get('/admin/exams', requireAdmin, async (req, res) => {
  try {
    const exams = await prisma.exam.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        questions: {
          select: {
            id: true,
            score: true,
          },
        },
      },
    })

    const formattedExams = exams.map((exam) => {
      const realTotalScore = exam.questions.reduce((sum, question) => {
        return sum + Number(question.score || 0)
      }, 0)

      return {
        id: exam.id,
        title: exam.title,
        gradeLevel: exam.gradeLevel,
        description: exam.description,
        timeLimit: exam.timeLimit,
        totalScore: realTotalScore,
        isPublished: exam.isPublished,
        questionCount: exam.questions.length,
        createdAt: exam.createdAt,
        updatedAt: exam.updatedAt,
      }
    })

    res.json({
      message: 'Admin exams loaded successfully',
      data: formattedExams,
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: '管理员试卷列表获取失败',
      error: error.message,
    })
  }
})

router.post('/admin/exams', requireAdmin, async (req, res) => {
  try {
    const {
      title,
      gradeLevel,
      description,
      timeLimit,
      totalScore,
      isPublished,
    } = req.body

    if (!title || !gradeLevel) {
      return res.status(400).json({
        message: '试卷标题和试卷分类不能为空',
      })
    }

    const exam = await prisma.exam.create({
      data: {
        title,
        gradeLevel: String(gradeLevel).toUpperCase(),
        description: description || '',
        timeLimit: Number(timeLimit || 3600),
        totalScore: 0,
        isPublished: Boolean(isPublished),
      },
    })

    res.status(201).json({
      message: '试卷创建成功',
      data: exam,
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: '试卷创建失败',
      error: error.message,
    })
  }
})

router.put('/admin/exams/:examId', requireAdmin, async (req, res) => {
  try {
    const { examId } = req.params

    const {
      title,
      gradeLevel,
      description,
      timeLimit,
      totalScore,
      isPublished,
    } = req.body

    const existingExam = await prisma.exam.findUnique({
      where: {
        id: examId,
      },
    })

    if (!existingExam) {
      return res.status(404).json({
        message: '试卷不存在',
      })
    }

    const updatedExam = await prisma.exam.update({
      where: {
        id: examId,
      },
      data: {
        title: title ?? existingExam.title,
        gradeLevel: gradeLevel
          ? String(gradeLevel).toUpperCase()
          : existingExam.gradeLevel,
        description: description ?? existingExam.description,
        timeLimit:
          timeLimit === undefined ? existingExam.timeLimit : Number(timeLimit),
        totalScore: existingExam.totalScore,
        isPublished:
          isPublished === undefined ? existingExam.isPublished : Boolean(isPublished),
      },
    })

    res.json({
      message: '试卷更新成功',
      data: updatedExam,
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: '试卷更新失败',
      error: error.message,
    })
  }
})

router.delete('/admin/exams/:examId', requireAdmin, async (req, res) => {
  try {
    const { examId } = req.params

    console.log('Deleting exam:', examId)

    const existingExam = await prisma.exam.findUnique({
      where: {
        id: examId,
      },
    })

    if (!existingExam) {
      return res.status(404).json({
        message: '试卷不存在',
        examId,
      })
    }

    const questionsBeforeDelete = await prisma.question.count({
      where: {
        examId,
      },
    })

    const attempts = await prisma.examAttempt.findMany({
      where: {
        examId,
      },
      select: {
        id: true,
      },
    })

    const attemptIds = attempts.map((attempt) => attempt.id)

    const wrongQuestionsBeforeDelete = await prisma.wrongQuestion.count({
      where: {
        examId,
      },
    })

    const userAnswersBeforeDelete = attemptIds.length
      ? await prisma.userAnswer.count({
          where: {
            attemptId: {
              in: attemptIds,
            },
          },
        })
      : 0

    await prisma.$transaction(async (tx) => {
      await tx.wrongQuestion.deleteMany({
        where: {
          examId,
        },
      })

      if (attemptIds.length > 0) {
        await tx.userAnswer.deleteMany({
          where: {
            attemptId: {
              in: attemptIds,
            },
          },
        })
      }

      await tx.examAttempt.deleteMany({
        where: {
          examId,
        },
      })

      await tx.question.deleteMany({
        where: {
          examId,
        },
      })

      await tx.exam.delete({
        where: {
          id: examId,
        },
      })
    })

    const examAfterDelete = await prisma.exam.findUnique({
      where: {
        id: examId,
      },
    })

    if (examAfterDelete) {
      return res.status(500).json({
        message: '试卷删除失败：删除后数据库中仍然存在该试卷',
        examId,
      })
    }

    res.json({
      message: '试卷删除成功',
      data: {
        id: existingExam.id,
        title: existingExam.title,
        deletedQuestions: questionsBeforeDelete,
        deletedAttempts: attempts.length,
        deletedUserAnswers: userAnswersBeforeDelete,
        deletedWrongQuestions: wrongQuestionsBeforeDelete,
      },
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: '试卷删除失败',
      error: error.message,
    })
  }
})

router.patch('/admin/exams/:examId/publish', requireAdmin, async (req, res) => {
  try {
    const { examId } = req.params
    const { isPublished } = req.body

    const existingExam = await prisma.exam.findUnique({
      where: {
        id: examId,
      },
    })

    if (!existingExam) {
      return res.status(404).json({
        message: '试卷不存在',
      })
    }

    const updatedExam = await prisma.exam.update({
      where: {
        id: examId,
      },
      data: {
        isPublished: Boolean(isPublished),
      },
    })

    res.json({
      message: updatedExam.isPublished ? '试卷已发布' : '试卷已下架',
      data: updatedExam,
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: '试卷发布状态更新失败',
      error: error.message,
    })
  }
})

router.get('/admin/exams/:examId/questions', requireAdmin, async (req, res) => {
  try {
    const { examId } = req.params

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

    const questions = await prisma.question.findMany({
      where: {
        examId,
      },
      orderBy: {
        orderIndex: 'asc',
      },
    })

    res.json({
      message: '管理员题目列表获取成功',
      data: questions,
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: '管理员题目列表获取失败',
      error: error.message,
    })
  }
})

router.post('/admin/exams/:examId/questions', requireAdmin, async (req, res) => {
  try {
    const { examId } = req.params

    const {
      type,
      text,
      options,
      answer,
      score,
      knowledgePoint,
      referenceAnswer,
      explanation,
      orderIndex,
    } = req.body

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

    if (!type || !text) {
      return res.status(400).json({
        message: '题型和题干不能为空',
      })
    }

    const questionCount = await prisma.question.count({
      where: {
        examId,
      },
    })

    const finalType = normalizeQuestionType(type)

    const createdQuestion = await prisma.question.create({
      data: {
        examId,
        type: finalType,
        text,
        options: Array.isArray(options) && options.length > 0 ? options : null,
        answer: answer === undefined || answer === '' ? null : answer,
        score: Number(score || 0),
        knowledgePoint: knowledgePoint || '未分类',
        referenceAnswer: referenceAnswer || '',
        explanation: explanation || '',
        orderIndex:
          orderIndex === undefined || orderIndex === ''
            ? questionCount + 1
            : Number(orderIndex),
      },
    })

    res.status(201).json({
      message: '题目创建成功',
      data: createdQuestion,
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: '题目创建失败',
      error: error.message,
    })
  }
})

router.put('/admin/questions/:questionId', requireAdmin, async (req, res) => {
  try {
    const { questionId } = req.params

    const existingQuestion = await prisma.question.findUnique({
      where: {
        id: questionId,
      },
    })

    if (!existingQuestion) {
      return res.status(404).json({
        message: '题目不存在',
      })
    }

    const {
      type,
      text,
      options,
      answer,
      score,
      knowledgePoint,
      referenceAnswer,
      explanation,
      orderIndex,
    } = req.body

    const updatedQuestion = await prisma.question.update({
      where: {
        id: questionId,
      },
      data: {
        type: type ? normalizeQuestionType(type) : existingQuestion.type,
        text: text ?? existingQuestion.text,
        options:
          options === undefined
            ? existingQuestion.options
            : Array.isArray(options) && options.length > 0
              ? options
              : null,
        answer: answer === undefined ? existingQuestion.answer : answer,
        score: score === undefined ? existingQuestion.score : Number(score),
        knowledgePoint: knowledgePoint ?? existingQuestion.knowledgePoint,
        referenceAnswer: referenceAnswer ?? existingQuestion.referenceAnswer,
        explanation: explanation ?? existingQuestion.explanation,
        orderIndex:
          orderIndex === undefined ? existingQuestion.orderIndex : Number(orderIndex),
      },
    })

    res.json({
      message: '题目更新成功',
      data: updatedQuestion,
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: '题目更新失败',
      error: error.message,
    })
  }
})

router.delete('/admin/questions/:questionId', requireAdmin, async (req, res) => {
  try {
    const { questionId } = req.params

    const existingQuestion = await prisma.question.findUnique({
      where: {
        id: questionId,
      },
    })

    if (!existingQuestion) {
      return res.status(404).json({
        message: '题目不存在',
      })
    }

    await prisma.question.delete({
      where: {
        id: questionId,
      },
    })

    res.json({
      message: '题目删除成功',
      data: existingQuestion,
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: '题目删除失败',
      error: error.message,
    })
  }
})

router.post('/admin/ai/parse-questions', requireAdmin, async (req, res) => {
  try {
    const { rawText, gradeLevel, examTitle } = req.body

    if (!rawText || !String(rawText).trim()) {
      return res.status(400).json({
        message: '请提供需要解析的试卷文本',
      })
    }

    const openaiApiKey = String(process.env.OPENAI_API_KEY || '').trim()

    if (
      !openaiApiKey ||
      openaiApiKey.includes('你的') ||
      openaiApiKey.includes('OpenAI API Key')
    ) {
      return res.status(500).json({
        message: '服务器尚未正确配置 OPENAI_API_KEY，请在 backend/.env 中填写真实 API Key',
      })
    }

    const prompt = `
你是一个英语考试系统的试卷解析助手。

请把下面的英语试卷文本解析为结构化 JSON。

要求：
1. 只返回 JSON，不要返回 Markdown，不要返回解释文字。
2. JSON 顶层格式必须是：
{
  "questions": []
}
3. 每道题必须包含：
{
  "type": "CHOICE | TRANSLATION | ERROR_CORRECTION | WRITING | READING | CLOZE",
  "text": "题干",
  "options": ["A选项", "B选项", "C选项", "D选项"] 或 null,
  "answer": 选择题使用 0-based 数字索引，例如 A=0, B=1；主观题可用字符串或 null,
  "score": 数字,
  "knowledgePoint": "知识点",
  "referenceAnswer": "参考答案",
  "explanation": "解析",
  "orderIndex": 数字
}
4. 如果没有解析到分值，默认选择题 2 分，翻译/改错 5 分，写作 10 分。
5. 如果没有解析到知识点，请根据题目内容合理判断。
6. 如果选择题答案是 A/B/C/D，请转换为 0/1/2/3。
7. 如果题目没有解析，请不要编造题目。
8. 适用试卷分类：${gradeLevel || '未指定'}
9. 试卷标题：${examTitle || '未指定'}

试卷文本如下：
${String(rawText).trim()}
`

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a strict JSON parser for English exam papers. Output only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: {
          type: 'json_object',
        },
        temperature: 0.2,
      }),
    })

    const aiResult = await aiResponse.json()

    if (!aiResponse.ok) {
      console.error(aiResult)

      return res.status(500).json({
        message: 'AI 解析请求失败',
        error: aiResult.error?.message || 'OpenAI API error',
      })
    }

    const content = aiResult.choices?.[0]?.message?.content

    if (!content) {
      return res.status(500).json({
        message: 'AI 没有返回可解析内容',
      })
    }

    let parsed

    try {
      parsed = JSON.parse(content)
    } catch (error) {
      console.error('AI raw content:', content)

      return res.status(500).json({
        message: 'AI 返回内容不是合法 JSON',
        error: error.message,
      })
    }

    const questions = normalizeParsedQuestions(parsed.questions)

    res.json({
      message: 'AI 解析成功',
      data: {
        questions,
        raw: parsed,
      },
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'AI 解析失败',
      error: error.message,
    })
  }
})

module.exports = router