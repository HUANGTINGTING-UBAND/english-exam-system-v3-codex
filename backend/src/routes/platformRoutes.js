const express = require('express')
const crypto = require('crypto')
const multer = require('multer')
const mammoth = require('mammoth')
const pdfParseModule = require('pdf-parse')
const prisma = require('../lib/prisma')
const {
  requireAuth,
  requireRole,
  requireTeacher,
  requireTeacherOrAdmin,
} = require('../middlewares/authMiddleware')

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })
const pdfParse = pdfParseModule.default || pdfParseModule

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

const parseImportText = (rawText, fallbackTitle) => {
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

  const questionBlocks = rawText.includes('[QUESTION]')
    ? rawText.split(/\[QUESTION\]/i).slice(1)
    : rawText.split(/(?=^\s*题号[:：]|^\s*\d+[\.、]\s+)/m).filter((block) => /(?:题号[:：]|^\s*\d+[\.、])/m.test(block))

  const questions = questionBlocks.map((block, index) => {
    const questionNo = (block.match(/题号[:：]\s*(\d+)/)?.[1] || block.match(/^\s*(\d+)[\.、]/m)?.[1] || String(index + 1)).trim()
    const type = normalizeDraftQuestionType(block.match(/题型[:：]\s*(.+)/)?.[1], warnings, `第 ${questionNo} 题`)
    const textMatch = block.match(/题干[:：]\s*([\s\S]*?)(?=\n\s*(?:选项[:：]|A[\.、]|答案[:：]|解析[:：]|知识点[:：]|分值[:：]|材料ID[:：]|$))/)
    let text = textMatch ? textMatch[1].trim() : block.replace(/^\s*\d+[\.、]\s*/, '').split(/\n\s*A[\.、]/)[0].trim()
    if (!text || /^题号[:：]/.test(text)) {
      text = ''
      warnings.push({ level: 'WARNING', code: 'MISSING_QUESTION_TEXT', message: `第 ${questionNo} 题题干未明确解析，请人工补充。`, targetType: 'QUESTION' })
    }
    const options = ['A', 'B', 'C', 'D'].map((letter) => block.match(new RegExp(`^\\s*${letter}[\\.、]\\s*(.+)`, 'm'))?.[1]?.trim()).filter(Boolean)
    const answerRaw = block.match(/(?:答案|参考答案)[:：]\s*(.+)/)?.[1]?.trim() || ''
    const answer = type === 'CHOICE' ? (answerLetterMap[answerRaw.toUpperCase()] ?? null) : answerRaw
    const score = Number(block.match(/分值[:：]\s*([0-9.]+)/)?.[1] || 0) || 2
    const materialLocalId = block.match(/材料ID[:：]\s*(.+)/)?.[1]?.trim() || null
    if (type === 'CHOICE' && options.length < 2) warnings.push({ level: 'WARNING', code: 'CHOICE_OPTIONS_INCOMPLETE', message: `第 ${questionNo} 题选项不足，请人工校对。`, targetType: 'QUESTION' })
    if (type === 'CHOICE' && answer === null) warnings.push({ level: 'WARNING', code: 'MISSING_CHOICE_ANSWER', message: `第 ${questionNo} 题没有可用客观题答案，请人工补充。`, targetType: 'QUESTION' })
    if (materialLocalId && !materialIdMap.has(materialLocalId)) warnings.push({ level: 'WARNING', code: 'MATERIAL_BINDING_UNCERTAIN', message: `第 ${questionNo} 题引用的材料 ${materialLocalId} 未找到，入库前请确认。`, targetType: 'QUESTION' })
    return {
      type, text: text || '待校对题目', options: options.length ? options : null, answer, score,
      knowledgePoint: block.match(/知识点[:：]\s*(.+)/)?.[1]?.trim() || '未分类',
      referenceAnswer: type === 'CHOICE' ? '' : answerRaw,
      explanation: block.match(/解析[:：]\s*(.+)/)?.[1]?.trim() || '',
      orderIndex: Number(questionNo) || index + 1,
      metadata: { questionNo, materialLocalId },
    }
  })
  if (questions.length === 0) warnings.push({ level: 'WARNING', code: 'NO_QUESTIONS_PARSED', message: '未解析到题目，请人工检查原始文本。' })
  return { examMeta, materials, questions, warnings }
}

const extractUploadedText = async (file) => {
  if (!file) return ''
  if (file.mimetype === 'text/plain' || file.originalname.toLowerCase().endsWith('.txt')) return file.buffer.toString('utf8')
  if (file.mimetype.includes('wordprocessingml') || file.originalname.toLowerCase().endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer: file.buffer })
    return result.value || ''
  }
  if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    const result = await pdfParse(file.buffer)
    return result.text || ''
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
        status: parsed.questions.length > 0 ? 'NEEDS_REVIEW' : 'FAILED',
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
