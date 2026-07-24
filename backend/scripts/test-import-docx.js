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
  'structured-reading-001.docx',
)

let createdJobId = null
let beforeCount = null

const main = async () => {
  assert.ok(username, 'backend/.env 缺少 TEST_TEACHER_USERNAME')
  assert.ok(password, 'backend/.env 缺少 TEST_TEACHER_PASSWORD')
  assert.ok(
    fs.existsSync(fixturePath),
    `DOCX 测试样本不存在：${fixturePath}`,
  )

  beforeCount = await prisma.importJob.count()

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

  const loginPayload = await loginResponse.json()
  const token = loginPayload.data?.token

  assert.ok(token, '测试教师登录失败')

  const formData = new FormData()

  formData.append(
    'file',
    new Blob(
      [fs.readFileSync(fixturePath)],
      {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    ),
    'structured-reading-001.docx',
  )

  const response = await fetch(`${apiBaseUrl}/import/jobs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  const responseText = await response.text()

  let payload

  try {
    payload = JSON.parse(responseText)
  } catch {
    throw new Error(
      `DOCX 接口未返回 JSON。HTTP ${response.status}: ${responseText}`,
    )
  }

  createdJobId = payload.data?.id || null

  assert.equal(
    response.status,
    201,
    `DOCX 上传应返回 HTTP 201，实际为 ${response.status}`,
  )

  assert.ok(createdJobId, 'DOCX 上传后未返回导入任务 ID')
  assert.equal(payload.data.sourceType, 'FILE_UPLOAD')
  assert.equal(payload.data.title, '标准阅读题基线测试 001')
  assert.equal(payload.data.gradeLevel, 'JUNIOR')

  assert.equal(
    payload.data.questions?.length,
    2,
    'DOCX 应解析出 2 道题',
  )

  assert.equal(
    payload.data.materials?.length,
    1,
    'DOCX 应解析出 1 份材料',
  )

  assert.deepEqual(
    payload.data.questions[0].options,
    [
      'At six.',
      'At seven.',
      'At eight.',
      'At nine.',
    ],
  )

  assert.deepEqual(
    payload.data.questions[1].options,
    [
      'Because it is easy.',
      'Because it is useful.',
      'Because it is interesting.',
      'Because his teacher is kind.',
    ],
  )

  assert.equal(payload.data.questions[0].answer, 1)
  assert.equal(payload.data.questions[1].answer, 2)

  assert.equal(
    payload.data.questions[0].metadata?.materialLocalId,
    'reading-001',
  )

  assert.equal(
    payload.data.questions[1].metadata?.materialLocalId,
    'reading-001',
  )

  assert.equal(
    payload.data.materials[0].metadata?.localId,
    'reading-001',
  )

  assert.equal(
    payload.data.materials[0].content,
    'Tom is a middle school student. He gets up at seven every morning. He goes to school by bus. His favorite subject is English because he thinks it is interesting.',
  )

  assert.equal(
    payload.data.warnings?.length,
    1,
    'DOCX 应仅产生 1 条来源文件提示',
  )

  assert.equal(payload.data.warnings[0].level, 'INFO')
  assert.equal(payload.data.warnings[0].code, 'SOURCE_FILE')

  const duringCount = await prisma.importJob.count()

  assert.equal(
    duringCount,
    beforeCount + 1,
    'DOCX 上传后应临时增加 1 个 ImportJob',
  )

  console.log('✅ DOCX upload regression passed.')
  console.log('HTTP status: 201')
  console.log('Questions: 2')
  console.log('Materials: 1')
  console.log('Answers: B → 1, C → 2')
  console.log(`Import jobs during test: ${beforeCount} → ${duringCount}`)
}

const run = async () => {
  try {
    await main()
  } catch (error) {
    console.error('❌ DOCX upload regression failed.')
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

        console.log('🧹 DOCX test job cleaned up.')
      } catch (cleanupError) {
        console.error('❌ Failed to clean up DOCX test job.')
        console.error(cleanupError)
        process.exitCode = 1
      }
    }

    if (beforeCount !== null) {
      try {
        const afterCount = await prisma.importJob.count()

        assert.equal(
          afterCount,
          beforeCount,
          'DOCX 测试清理后 ImportJob 数量应恢复',
        )

        console.log(`Import jobs after cleanup: ${afterCount}`)
      } catch (countError) {
        console.error('❌ DOCX cleanup count verification failed.')
        console.error(countError)
        process.exitCode = 1
      }
    }

    await prisma.$disconnect()
  }
}

run()
