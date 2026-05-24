const API_BASE_URL = '/api'
const getAuthHeaders = () => {
  const token = localStorage.getItem('token')

  if (!token) {
    return {}
  }

  return {
    Authorization: `Bearer ${token}`,
  }
}

export const getExams = async (grade) => {
  const query = grade ? `?grade=${grade}` : ''
  const response = await fetch(`${API_BASE_URL}/exams${query}`)

  if (!response.ok) {
    throw new Error('获取试卷列表失败')
  }

  const result = await response.json()
  return result.data
}

export const getExamById = async (examId) => {
  const response = await fetch(`${API_BASE_URL}/exams/${examId}`)

  if (!response.ok) {
    throw new Error('获取试卷详情失败')
  }

  const result = await response.json()
  return result.data
}

export const getQuestionsByExamId = async (examId) => {
  const response = await fetch(`${API_BASE_URL}/exams/${examId}/questions`)

  if (!response.ok) {
    throw new Error('获取题目列表失败')
  }

  const result = await response.json()
  return result.data
}
export const submitExamAttempt = async (attemptData) => {
  const response = await fetch(`${API_BASE_URL}/attempts/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(attemptData),
  })

  if (!response.ok) {
    throw new Error('提交考试结果失败')
  }

  const result = await response.json()
  return result.data
}
export const getAttemptHistory = async () => {
  const response = await fetch(`${API_BASE_URL}/attempts/history`, {
   headers: {
    ...getAuthHeaders(),
   },
  })

  if (!response.ok) {
    throw new Error('获取考试历史失败')
  }

  const result = await response.json()
  return result.data
}
export const saveWrongQuestions = async (wrongQuestionData) => {
  const response = await fetch(`${API_BASE_URL}/wrong-questions`, {
    method: 'POST',
    headers: {
     'Content-Type': 'application/json',
     ...getAuthHeaders(),
    },
    body: JSON.stringify(wrongQuestionData),
  })

  if (!response.ok) {
    throw new Error('保存错题失败')
  }

  const result = await response.json()
  return result.data
}

export const getWrongQuestions = async () => {
  const response = await fetch(`${API_BASE_URL}/wrong-questions`, {
   headers: {
    ...getAuthHeaders(),
   },
   })
  if (!response.ok) {
    throw new Error('获取错题本失败')
  }

  const result = await response.json()
  return result.data
}