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
  'structured-reading-001.txt',
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

const authorizedFetch = (url, token, options = {}) => {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })
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
  assert.ok(fs.existsSync(fixturePath), `测试样本不存在：${fixturePath}`)

  const rawText = fs.readFileSync(fixturePath, 'utf8')

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

  const createResponse = await authorizedFetch(
    `${apiBaseUrl}/import/jobs`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        title: `结构化导入自动回归-${Date.now()}`,
        rawText,
      }),
    },
  )

  const job = await getPayload(createResponse, '创建导入测试任务')
  createdJobId = job?.id || null

  assert.ok(createdJobId, '导入任务创建成功，但响应中没有任务 ID')

  assert.equal(
    job.questions?.length,
    2,
    '创建导入任务时应当直接生成 2 道草稿题',
  )

  assert.equal(
    job.materials?.length,
    1,
    '创建导入任务时应当直接生成 1 份草稿材料',
  )

  assert.equal(
    job.warnings?.length,
    0,
    '标准格式创建任务时不应产生 warning',
  )

  const reparseResponse = await authorizedFetch(
    `${apiBaseUrl}/import/jobs/${job.id}/reparse`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ rawText }),
    },
  )

  await getPayload(reparseResponse, '重新解析标准试卷')

  const detailResponse = await authorizedFetch(
    `${apiBaseUrl}/import/jobs/${job.id}`,
    token,
  )
  const detail = await getPayload(detailResponse, '读取导入任务详情')

  const questions = detail.questions || []
  const materials = detail.materials || []
  const warnings = detail.warnings || []

  assert.equal(questions.length, 2, '应当只生成 2 道题')
  assert.equal(materials.length, 1, '应当生成 1 份材料')
  assert.equal(warnings.length, 0, '标准格式不应生成 warning')

  const questionMap = new Map(
    questions.map((question) => [
      String(question.metadata?.questionNo ?? question.orderIndex),
      question,
    ]),
  )

  const firstQuestion = questionMap.get('1')
  const secondQuestion = questionMap.get('2')

  assert.ok(firstQuestion, '缺少第 1 题')
  assert.ok(secondQuestion, '缺少第 2 题')

  assert.deepEqual(normalizeOptions(firstQuestion.options), [
    'At six.',
    'At seven.',
    'At eight.',
    'At nine.',
  ])

  assert.deepEqual(normalizeOptions(secondQuestion.options), [
    'Because it is easy.',
    'Because it is useful.',
    'Because it is interesting.',
    'Because his teacher is kind.',
  ])

  assert.equal(Number(firstQuestion.answer), 1, '第 1 题答案应为 B/1')
  assert.equal(Number(secondQuestion.answer), 2, '第 2 题答案应为 C/2')

  assert.equal(
    firstQuestion.metadata?.materialLocalId,
    'reading-001',
    '第 1 题材料关联错误',
  )

  assert.equal(
    secondQuestion.metadata?.materialLocalId,
    'reading-001',
    '第 2 题材料关联错误',
  )

  assert.equal(
    materials[0].metadata?.localId,
    'reading-001',
    '材料本地 ID 错误',
  )

  console.log('✅ Structured import regression passed.')
  console.log(`Questions: ${questions.length}`)
  console.log(`Materials: ${materials.length}`)
  console.log(`Warnings: ${warnings.length}`)
}

const run = async () => {
  try {
    await main()
  } catch (error) {
    console.error('❌ Structured import regression failed.')
    console.error(error)
    process.exitCode = 1
  } finally {
    if (createdJobId) {
      try {
        await prisma.importJob.delete({
          where: { id: createdJobId },
        })
        console.log('🧹 Test import job cleaned up.')
      } catch (cleanupError) {
        console.error('❌ Failed to clean up test import job.')
        console.error(cleanupError)
        process.exitCode = 1
      }
    }

    await prisma.$disconnect()
  }
}

run()
