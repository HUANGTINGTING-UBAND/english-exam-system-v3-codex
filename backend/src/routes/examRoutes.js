const express = require('express')
const prisma = require('../lib/prisma')

const router = express.Router()

router.get('/exams', async (req, res) => {
  try {
    const { grade } = req.query

    const where = {
      isPublished: true,
    }

    if (grade) {
      where.gradeLevel = String(grade).toUpperCase()
    }

    const exams = await prisma.exam.findMany({
      where,
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        questions: {
          select: {
            id: true,
          },
        },
      },
    })

    const formattedExams = exams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      gradeLevel: exam.gradeLevel,
      description: exam.description,
      timeLimit: exam.timeLimit,
      totalScore: exam.totalScore,
      questionCount: exam.questions.length,
      isPublished: exam.isPublished,
    }))

    res.json({
      message: 'Exams loaded successfully',
      data: formattedExams,
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load exams',
    })
  }
})

router.get('/exams/:examId', async (req, res) => {
  try {
    const { examId } = req.params

    const exam = await prisma.exam.findUnique({
      where: {
        id: examId,
      },
      include: {
        questions: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!exam) {
      return res.status(404).json({
        message: 'Exam not found',
      })
    }

    res.json({
      message: 'Exam loaded successfully',
      data: {
        id: exam.id,
        title: exam.title,
        gradeLevel: exam.gradeLevel,
        description: exam.description,
        timeLimit: exam.timeLimit,
        totalScore: exam.totalScore,
        questionCount: exam.questions.length,
        isPublished: exam.isPublished,
      },
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load exam',
    })
  }
})

router.get('/exams/:examId/questions', async (req, res) => {
  try {
    const { examId } = req.params

    const exam = await prisma.exam.findUnique({
      where: {
        id: examId,
      },
    })

    if (!exam) {
      return res.status(404).json({
        message: 'Exam not found',
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

    const formattedQuestions = questions.map((question) => ({
      id: question.id,
      examId: question.examId,
      type: question.type,
      text: question.text,
      options: question.options,
      answer: question.answer,
      score: question.score,
      knowledgePoint: question.knowledgePoint,
      referenceAnswer: question.referenceAnswer,
      explanation: question.explanation,
      orderIndex: question.orderIndex,
    }))

    res.json({
      message: 'Questions loaded successfully',
      data: formattedQuestions,
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load questions',
    })
  }
})

module.exports = router