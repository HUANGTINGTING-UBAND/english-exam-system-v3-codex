const prisma = require('../src/lib/prisma')

const testDatabaseConnection = async () => {
  try {
    const userCount = await prisma.user.count()
    const examCount = await prisma.exam.count()
    const questionCount = await prisma.question.count()
    const attemptCount = await prisma.examAttempt.count()
    const answerCount = await prisma.userAnswer.count()

    console.log('Database connection successful.')
    console.log(`Users: ${userCount}`)
    console.log(`Exams: ${examCount}`)
    console.log(`Questions: ${questionCount}`)
    console.log(`Attempts: ${attemptCount}`)
    console.log(`UserAnswers: ${answerCount}`)
  } catch (error) {
    console.error('Database connection failed.')
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabaseConnection()