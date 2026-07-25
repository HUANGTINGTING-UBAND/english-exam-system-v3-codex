const assert = require('node:assert/strict')
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

const maxFileSize = 20 * 1024 * 1024
const oversizedFileSize = maxFileSize + 1

let unexpectedlyCreatedJobId = null

const main = async () => {
  assert.ok(username, 'backend/.env 缺少 TEST_TEACHER_USERNAME')
  assert.ok(password, 'backend/.env 缺少 TEST_TEACHER_PASSWORD')

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
      [Buffer.alloc(oversizedFileSize, 0x61)],
      { type: 'text/plain' },
    ),
    'oversized-exam.txt',
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
      `超限文件接口未返回 JSON。HTTP ${response.status}: ${responseText}`,
    )
  }

  unexpectedlyCreatedJobId = payload.data?.id || null

  assert.equal(
    response.status,
    413,
    `超限文件应返回 HTTP 413，实际为 ${response.status}`,
  )

  assert.equal(
    payload.code,
    'FILE_TOO_LARGE',
    '超限文件应返回 FILE_TOO_LARGE',
  )

  assert.match(
    payload.message || '',
    /20\s*MB/i,
    '错误提示应明确说明 20 MB 限制',
  )

  assert.equal(
    payload.data,
    undefined,
    '超限文件不应创建导入草稿',
  )

  const afterCount = await prisma.importJob.count()

  assert.equal(
    afterCount,
    beforeCount,
    '超限文件不应增加 ImportJob 数量',
  )

  console.log('✅ Oversized file rejection regression passed.')
  console.log('HTTP status: 413')
  console.log('Error code: FILE_TOO_LARGE')
  console.log(`File size: ${oversizedFileSize} bytes`)
  console.log(`Import jobs: ${beforeCount} → ${afterCount}`)
}

const run = async () => {
  try {
    await main()
  } catch (error) {
    console.error('❌ Oversized file rejection regression failed.')
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
