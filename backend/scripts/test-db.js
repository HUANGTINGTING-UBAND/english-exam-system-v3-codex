const prisma = require('../src/lib/prisma')

const testDatabaseConnection = async () => {
  try {
    const userCount = await prisma.user.count()
    const examCount = await prisma.exam.count()
    const questionCount = await prisma.question.count()

    console.log('Database connection successful.')
    console.log(`Users: ${userCount}`)
    console.log(`Exams: ${examCount}`)
    console.log(`Questions: ${questionCount}`)
  } catch (error) {
    console.error('Database connection failed.')
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabaseConnection()