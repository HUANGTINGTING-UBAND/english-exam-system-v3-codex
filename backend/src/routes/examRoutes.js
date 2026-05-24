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

router.get('/attempts/history', async (req, res) => {
  try {
    const guestUser = await prisma.user.findUnique({
      where: {
        username: 'guest_student',
      },
    })

    if (!guestUser) {
      return res.json({
        message: 'History loaded successfully',
        data: [],
      })
    }

    const attempts = await prisma.examAttempt.findMany({
      where: {
        userId: guestUser.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        exam: true,
        userAnswers: true,
      },
    })

    const formattedAttempts = attempts.map((attempt) => ({
      id: attempt.id,
      examId: attempt.examId,
      examTitle: attempt.exam.title,
      totalScore: attempt.exam.totalScore,
      earnedScore: attempt.totalScore,
      accuracyRate: attempt.accuracyRate,
      objectiveScore: attempt.objectiveScore,
      subjectiveScore: attempt.subjectiveScore,
      submitType: attempt.submitType,
      usedTime: attempt.usedTime,
      pauseCount: attempt.pauseCount,
      totalPausedDuration: attempt.totalPausedDuration,
      answerCount: attempt.userAnswers.length,
      createdAt: attempt.createdAt,
      submittedAt: attempt.submittedAt,
    }))

    res.json({
      message: 'History loaded successfully',
      data: formattedAttempts,
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load attempt history',
      error: error.message,
    })
  }
})

router.post('/wrong-questions', async (req, res) => {
  try {
    const {
      userId,
      examId,
      attemptId,
      questions,
    } = req.body

    if (!examId) {
      return res.status(400).json({
        message: 'examId is required',
      })
    }

    if (!Array.isArray(questions)) {
      return res.status(400).json({
        message: 'questions must be an array',
      })
    }

    let finalUserId = userId

    if (!finalUserId) {
      const guestUser = await prisma.user.upsert({
        where: {
          username: 'guest_student',
        },
        update: {},
        create: {
          username: 'guest_student',
          passwordHash: 'temporary_guest_password_hash',
          nickname: '游客学生',
          role: 'STUDENT',
          gradeLevel: 'JUNIOR',
        },
      })

      finalUserId = guestUser.id
    }

    const createdWrongQuestions = []

    for (const question of questions) {
      const createdItem = await prisma.wrongQuestion.create({
        data: {
          userId: finalUserId,
          examId,
          questionId: question.questionId,
          attemptId: attemptId || null,
          questionType: String(question.questionType).toUpperCase(),
          knowledgePoint: question.knowledgePoint || '未分类',
          reason: question.reason || '用户保存',
          note: question.note || null,
        },
      })

      createdWrongQuestions.push(createdItem)
    }

    res.status(201).json({
      message: 'Wrong questions saved successfully',
      data: createdWrongQuestions,
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to save wrong questions',
      error: error.message,
    })
  }
})

router.get('/wrong-questions', async (req, res) => {
  try {
    const guestUser = await prisma.user.findUnique({
      where: {
        username: 'guest_student',
      },
    })

    if (!guestUser) {
      return res.json({
        message: 'Wrong questions loaded successfully',
        data: [],
      })
    }

    const wrongQuestions = await prisma.wrongQuestion.findMany({
      where: {
        userId: guestUser.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        exam: true,
        question: true,
      },
    })

    const formattedWrongQuestions = wrongQuestions.map((item) => ({
      id: item.id,
      examId: item.examId,
      examTitle: item.exam.title,
      questionId: item.questionId,
      questionText: item.question.text,
      questionType: item.questionType,
      knowledgePoint: item.knowledgePoint,
      reason: item.reason,
      note: item.note,
      score: item.question.score,
      referenceAnswer: item.question.referenceAnswer,
      explanation: item.question.explanation,
      createdAt: item.createdAt,
    }))

    res.json({
      message: 'Wrong questions loaded successfully',
      data: formattedWrongQuestions,
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to load wrong questions',
      error: error.message,
    })
  }
})

module.exports = router

router.post('/attempts/submit', async (req, res) => {
  try {
    const {
      userId,
      examId,
      objectiveScore,
      subjectiveScore,
      totalScore,
      accuracyRate,
      submitType,
      usedTime,
      pauseCount,
      totalPausedDuration,
      startedAt,
      submittedAt,
      answers,
    } = req.body

    if (!examId) {
      return res.status(400).json({
        message: 'examId is required',
      })
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        message: 'answers must be an array',
      })
    }

    let finalUserId = userId

    if (!finalUserId) {
      const guestUser = await prisma.user.upsert({
        where: {
          username: 'guest_student',
        },
        update: {},
        create: {
          username: 'guest_student',
          passwordHash: 'temporary_guest_password_hash',
          nickname: '游客学生',
          role: 'STUDENT',
          gradeLevel: 'JUNIOR',
        },
      })

      finalUserId = guestUser.id
    }

    const attempt = await prisma.examAttempt.create({
      data: {
        userId: finalUserId,
        examId,
        objectiveScore: Number(objectiveScore || 0),
        subjectiveScore: Number(subjectiveScore || 0),
        totalScore: Number(totalScore || 0),
        accuracyRate: Number(accuracyRate || 0),
        submitType: submitType === 'auto' ? 'AUTO' : 'MANUAL',
        usedTime: Number(usedTime || 0),
        pauseCount: Number(pauseCount || 0),
        totalPausedDuration: Number(totalPausedDuration || 0),
        startedAt: startedAt ? new Date(startedAt) : null,
        submittedAt: submittedAt ? new Date(submittedAt) : new Date(),
        userAnswers: {
          create: answers.map((answer) => ({
            questionId: answer.questionId,
            answerText: answer.answerText ?? null,
            selectedIndex:
              answer.selectedIndex === undefined || answer.selectedIndex === null
                ? null
                : Number(answer.selectedIndex),
            score: Number(answer.score || 0),
            isCorrect:
              answer.isCorrect === undefined || answer.isCorrect === null
                ? null
                : Boolean(answer.isCorrect),
          })),
        },
      },
      include: {
        userAnswers: true,
      },
    })

    res.status(201).json({
      message: 'Attempt submitted successfully',
      data: attempt,
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: 'Failed to submit attempt',
      error: error.message,
    })
  }
})