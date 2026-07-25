const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const dotenv = require('dotenv')

dotenv.config({
  path: path.join(__dirname, '..', '.env'),
})

const prisma = require('../src/lib/prisma')

const apiBaseUrl =
  process.env.TEST_API_BASE_URL || 'http://127.0.0.1:3000/api'

const username = process.env.TEST_TEACHER_USERNAME
const password = process.env.TEST_TEACHER_PASSWORD

const fixturePath = path.join(
  __dirname,
  '..',
  'fixtures',
  'import',
  'structured-reading-001.pdf',
)

const getPayload = async (response, label) => {
  const responseText = await response.text()

  let payload
  try {
    payload = JSON.parse(responseText)
  } catch {
    throw new Error(
      `${label} 未返回 JSON。HTTP ${response.status}: ${responseText.slice(0, 300)}`,
    )
  }

  if (!response.ok) {
    throw new Error(
      `${label} 失败。HTTP ${response.status}: ${JSON.stringify(payload)}`,
    )
  }

  return payload.data ?? payload
}

const normalizeOptions = (value) => {
  if (Array.isArray(value)) return value

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }

  return []
}

let createdJobId = null

const main = async () => {
  assert.ok(username, 'backend/.env 缺少 TEST_TEACHER_USERNAME')
  assert.ok(password, 'backend/.env 缺少 TEST_TEACHER_PASSWORD')
  assert.ok(fs.existsSync(fixturePath), `PDF 测试样本不存在：${fixturePath}`)

  const loginResponse = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
    }),
  })

  const loginData = await getPayload(loginResponse, '教师登录')
  const token = loginData.token

  assert.ok(token, '登录成功，但响应中没有 token')

  const pdfBuffer = fs.readFileSync(fixturePath)
  const formData = new FormData()

  formData.append('title', `PDF 上传自动回归-${Date.now()}`)
  formData.append(
    'file',
    new Blob([pdfBuffer], {
      type: 'application/pdf',
    }),
    'structured-reading-001.pdf',
  )

  const createResponse = await fetch(`${apiBaseUrl}/import/jobs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  const job = await getPayload(createResponse, '上传 PDF 并创建导入任务')
  createdJobId = job?.id || null

  assert.ok(createdJobId, 'PDF 导入任务创建成功，但响应中没有任务 ID')
  assert.equal(job.sourceType, 'FILE_UPLOAD', '导入来源应为 FILE_UPLOAD')
  assert.equal(job.questions?.length, 2, 'PDF 应解析出 2 道草稿题')
  assert.equal(job.materials?.length, 1, 'PDF 应解析出 1 份草稿材料')

  const warnings = job.warnings || []

  assert.equal(warnings.length, 1, 'PDF 上传应只有 1 条来源信息')
  assert.equal(warnings[0].level, 'INFO', '文件来源信息等级应为 INFO')
  assert.equal(
    warnings[0].code,
    'SOURCE_FILE',
    'PDF 上传 warning 应为 SOURCE_FILE',
  )

  const questions = job.questions || []
  const materials = job.materials || []

  const questionMap = new Map(
    questions.map((question) => [
      String(question.metadata?.questionNo ?? question.orderIndex),
      question,
    ]),
  )

  const firstQuestion = questionMap.get('1')
  const secondQuestion = questionMap.get('2')

  assert.ok(firstQuestion, 'PDF 解析结果缺少第 1 题')
  assert.ok(secondQuestion, 'PDF 解析结果缺少第 2 题')

  assert.equal(
    firstQuestion.text,
    'What time does Tom get up every morning?',
  )

  assert.deepEqual(normalizeOptions(firstQuestion.options), [
    'At six.',
    'At seven.',
    'At eight.',
    'At nine.',
  ])

  assert.equal(Number(firstQuestion.answer), 1, '第 1 题答案应为 B/1')
  assert.equal(
    firstQuestion.metadata?.materialLocalId,
    'reading-001',
    '第 1 题材料关联错误',
  )

  assert.equal(
    secondQuestion.text,
    'Why does Tom like English?',
  )

  assert.deepEqual(normalizeOptions(secondQuestion.options), [
    'Because it is easy.',
    'Because it is useful.',
    'Because it is interesting.',
    'Because his teacher is kind.',
  ])

  assert.equal(Number(secondQuestion.answer), 2, '第 2 题答案应为 C/2')
  assert.equal(
    secondQuestion.metadata?.materialLocalId,
    'reading-001',
    '第 2 题材料关联错误',
  )

  const material = materials[0]
  const materialContent = material.content || ''
  const rawText = job.rawText || ''

  assert.equal(
    material.metadata?.localId,
    'reading-001',
    'PDF 材料本地 ID 错误',
  )

  assert.ok(
    rawText.includes('-- 1 of 2 --'),
    'PDF 原始提取文本应包含分页标记，以验证分页噪声清理',
  )

  assert.ok(
    !materialContent.includes('-- 1 of 2 --'),
    '分页标记不应污染材料正文',
  )

  assert.ok(
    materialContent.includes('interesting'),
    '材料正文应保留完整单词 interesting',
  )

  assert.ok(
    !materialContent.includes('inter\nesting'),
    '材料正文不应包含被拆开的单词 inter\\nesting',
  )

  console.log('✅ PDF import regression passed.')
  console.log(`Questions: ${questions.length}`)
  console.log(`Materials: ${materials.length}`)
  console.log(`Warnings: ${warnings.length}`)
  console.log('Page marker removed from material: yes')
  console.log('Material word integrity: passed')
}

const run = async () => {
  try {
    await main()
  } catch (error) {
    console.error('❌ PDF import regression failed.')
    console.error(error)
    process.exitCode = 1
  } finally {
    if (createdJobId) {
      try {
        await prisma.importJob.delete({
          where: {
            id: createdJobId,
          },
        })

        console.log('🧹 PDF test import job cleaned up.')
      } catch (cleanupError) {
        console.error('❌ Failed to clean up PDF test import job.')
        console.error(cleanupError)
        process.exitCode = 1
      }
    }

    await prisma.$disconnect()
  }
}

run()
