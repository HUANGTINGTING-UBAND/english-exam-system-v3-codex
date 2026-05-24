const express = require('express')
const cors = require('cors')
require('dotenv').config()
const examRoutes = require('./src/routes/examRoutes')

const app = express()

app.use(cors())
app.use(express.json())
app.use('/api', examRoutes)

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