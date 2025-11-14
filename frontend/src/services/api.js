import axios from 'axios'

// Get API URL from environment variable or use relative path
// In development with Vite proxy, use '/api'
// In production or when VITE_API_URL is set, use that
const getApiBaseURL = () => {
  // Check if VITE_API_URL is set (from environment variable)
  if (import.meta.env.VITE_API_URL) {
    const apiUrl = import.meta.env.VITE_API_URL
    // If it's a full URL, use it directly
    if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
      return apiUrl
    }
    // If it's a relative path, use it
    return apiUrl
  }
  // Default: use relative path (works with Vite proxy in dev, or same origin in prod)
  return '/api'
}

export const api = axios.create({
  baseURL: getApiBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests if available
const token = localStorage.getItem('token')
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

