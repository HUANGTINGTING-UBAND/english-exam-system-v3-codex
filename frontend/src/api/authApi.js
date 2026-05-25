const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || ''

  if (!contentType.includes('application/json')) {
    const text = await response.text()
    console.error('Non-JSON response:', text)

    throw new Error('服务器返回的不是 JSON，请检查 API 地址是否正确')
  }

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || '请求失败')
  }

  return result.data
}

export const registerUser = async (userData) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  })

  return parseResponse(response)
}

export const loginUser = async (loginData) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(loginData),
  })

  return parseResponse(response)
}

export const getCurrentUser = async () => {
  const token = localStorage.getItem('token')

  if (!token) {
    throw new Error('未登录')
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return parseResponse(response)
}

export const saveAuthData = ({ token, user }) => {
  localStorage.setItem('token', token)
  localStorage.setItem('currentUser', JSON.stringify(user))
}

export const getSavedUser = () => {
  return JSON.parse(localStorage.getItem('currentUser') || 'null')
}

export const logoutUser = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('currentUser')
}