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
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  })
)
app.use(express.json())
app.use('/api', examRoutes)
app.use('/api', authRoutes)

const PORT = process.env.PORT || 3000

app.get('/', (req, res) => {
  res.json({
    message: 'English Exam System Backend',
  })
})

app.get('/api/health', (req, res) => {
  res.json({
    message: 'Backend is running',
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`)
})