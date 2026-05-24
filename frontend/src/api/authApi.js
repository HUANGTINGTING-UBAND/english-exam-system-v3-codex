const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const registerUser = async (userData) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || '注册失败')
  }

  return result.data
}

export const loginUser = async (loginData) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(loginData),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || '登录失败')
  }

  return result.data
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

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || '获取当前用户失败')
  }

  return result.data
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