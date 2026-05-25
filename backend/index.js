const express = require('express')
const cors = require('cors')
require('dotenv').config()

const examRoutes = require('./src/routes/examRoutes')
const authRoutes = require('./src/routes/authRoutes')

const app = express()

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.includes('vercel.app') ||
        origin.includes('github.dev')
      ) {
        callback(null, true)
        return
      }

      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  })
)

app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({
    message: 'Backend is running',
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api', examRoutes)
app.use('/api', authRoutes)

app.use((req, res) => {
  res.status(404).json({
    message: '接口不存在',
    path: req.originalUrl,
  })
})

app.use((err, req, res, next) => {
  console.error(err)

  const isCorsError = err.message === 'Not allowed by CORS'

  res.status(isCorsError ? 403 : 500).json({
    message: isCorsError
      ? '当前前端地址不允许访问后端，请检查 CORS 配置'
      : err.message || '服务器内部错误',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message,
  })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`)
})