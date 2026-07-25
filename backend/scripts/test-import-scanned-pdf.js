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
  'scanned-like-empty-text.pdf',
)

let unexpectedlyCreatedJobId = null

const main = async () => {
  assert.ok(username, 'backend/.env 缺少 TEST_TEACHER_USERNAME')
  assert.ok(password, 'backend/.env 缺少 TEST_TEACHER_PASSWORD')
  assert.ok(
    fs.existsSync(fixturePath),
    `扫描型 PDF 测试样本不存在：${fixturePath}`,
  )

  const beforeCount = await prisma.importJob.count()

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
      { type: 'application/pdf' },
    ),
    'scanned-like-empty-text.pdf',
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
      `扫描型 PDF 接口未返回 JSON。HTTP ${response.status}: ${responseText}`,
    )
  }

  unexpectedlyCreatedJobId = payload.data?.id || null

  assert.equal(
    response.status,
    400,
    `扫描型 PDF 应返回 HTTP 400，实际为 ${response.status}`,
  )

  assert.equal(
    payload.code,
    'PDF_TEXT_NOT_FOUND',
    '扫描型 PDF 应返回 PDF_TEXT_NOT_FOUND',
  )

  assert.match(
    payload.message || '',
    /OCR/,
    '错误提示应明确建议先进行 OCR',
  )

  assert.equal(
    payload.data,
    undefined,
    '扫描型 PDF 不应创建导入草稿',
  )

  const afterCount = await prisma.importJob.count()

  assert.equal(
    afterCount,
    beforeCount,
    '扫描型 PDF 不应增加 ImportJob 数量',
  )

  console.log('✅ Scanned PDF rejection regression passed.')
  console.log('HTTP status: 400')
  console.log('Error code: PDF_TEXT_NOT_FOUND')
  console.log(`Import jobs: ${beforeCount} → ${afterCount}`)
}

const run = async () => {
  try {
    await main()
  } catch (error) {
    console.error('❌ Scanned PDF rejection regression failed.')
    console.error(error)
    process.exitCode = 1
  } finally {
    if (unexpectedlyCreatedJobId) {
      try {
        await prisma.importJob.delete({
          where: {
            id: unexpectedlyCreatedJobId,
          },
        })

        console.log('🧹 Unexpected test job cleaned up.')
      } catch (cleanupError) {
        console.error('❌ Failed to clean up unexpected test job.')
        console.error(cleanupError)
        process.exitCode = 1
      }
    }

    await prisma.$disconnect()
  }
}

run()
