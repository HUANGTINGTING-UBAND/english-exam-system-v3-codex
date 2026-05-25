const express = require('express')
const prisma = require('../lib/prisma')
const { requireAdmin } = require('../middlewares/authMiddleware')

const router = express.Router()

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
      isPublished: exam.isPublished,
      questionCount: exam.questions.length,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
    }))

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
        message: '试卷标题和学段不能为空',
      })
    }

    const exam = await prisma.exam.create({
      data: {
        title,
        gradeLevel: String(gradeLevel).toUpperCase(),
        description: description || '',
        timeLimit: Number(timeLimit || 3600),
        totalScore: Number(totalScore || 100),
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
        totalScore:
          totalScore === undefined ? existingExam.totalScore : Number(totalScore),
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

module.exports = router