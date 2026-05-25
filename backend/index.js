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
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.app.github.dev') ||
        origin.endsWith('.github.dev')
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

app.use((err, req, res, next) => {
  console.error(err)

  res.status(500).json({
    message: 'Server error',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message,
  })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`)
})