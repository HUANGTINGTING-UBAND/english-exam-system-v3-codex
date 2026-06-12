const express = require('express')
const crypto = require('crypto')
const prisma = require('../lib/prisma')
const {
  requireAuth,
  requireRole,
  requireTeacher,
  requireTeacherOrAdmin,
} = require('../middlewares/authMiddleware')

const router = express.Router()

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

router.post('/import/jobs', requireTeacherOrAdmin, async (req, res) => {
  try {
    const { title, examId, rawText, questions = [], materials = [], warnings = [] } = req.body

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        message: '导入任务标题不能为空',
      })
    }

    const job = await prisma.importJob.create({
      data: {
        creatorId: req.user.id,
        examId: examId || null,
        title: String(title).trim(),
        rawText: rawText || '',
        sourceType: 'MANUAL',
        questions: {
          create: Array.isArray(questions)
            ? questions.map((question, index) => ({
                type: String(question.type || 'CHOICE'),
                text: String(question.text || '').trim() || '待校对题目',
                options: question.options || null,
                answer: question.answer === undefined ? null : question.answer,
                score: Number(question.score || 0),
                knowledgePoint: question.knowledgePoint || '未分类',
                referenceAnswer: question.referenceAnswer || '',
                explanation: question.explanation || '',
                orderIndex: Number(question.orderIndex || index + 1),
              }))
            : [],
        },
        materials: {
          create: Array.isArray(materials)
            ? materials.map((material, index) => ({
                type: String(material.type || 'TEXT'),
                title: material.title || '',
                content: material.content || '',
                fileName: material.fileName || '',
                fileUrl: material.fileUrl || '',
                orderIndex: Number(material.orderIndex || index + 1),
              }))
            : [],
        },
        warnings: {
          create: Array.isArray(warnings) && warnings.length > 0
            ? warnings.map((warning) => ({
                level: warning.level || 'WARNING',
                code: warning.code || null,
                message: warning.message || '导入草稿需要人工校对',
                targetType: warning.targetType || null,
                targetId: warning.targetId || null,
              }))
            : [
                {
                  level: 'INFO',
                  code: 'DRAFT_ONLY',
                  message: '本轮仅创建导入草稿，不会直接写入正式题库。',
                },
              ],
        },
      },
      include: {
        questions: true,
        materials: true,
        warnings: true,
      },
    })

    res.status(201).json({
      message: '导入草稿创建成功',
      data: job,
    })
  } catch (error) {
    console.error('Create import job error:', error)
    res.status(500).json({
      message: '导入草稿创建失败',
      error: error.message,
    })
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
