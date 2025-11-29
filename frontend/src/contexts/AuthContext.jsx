import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../services/api'

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        // Verify token and get user info
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        try {
          const userResponse = await api.get('/v2/u/me')
          setUser({ ...userResponse.data, token })
        } catch (error) {
          // Token is invalid, clear it
          console.error('Failed to fetch user:', error)
          localStorage.removeItem('token')
          delete api.defaults.headers.common['Authorization']
          setUser(null)
        }
      }
      setLoading(false)
    }
    initAuth()
  }, [])

  const login = async (email, password) => {
    try {
      // OAuth2PasswordRequestForm expects form data, not JSON
      // The backend uses username field, so we'll use email as username
      // (users can login with either email or username)
      const formData = new URLSearchParams()
      formData.append('username', email) // Backend expects 'username' field
      formData.append('password', password)
      
      const response = await api.post('/v2/u/login', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
      
      if (response.data && response.data.access_token) {
        const { access_token } = response.data
        localStorage.setItem('token', access_token)
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
        
        // Get user info
        try {
          const userResponse = await api.get('/v2/u/me')
          setUser({ ...userResponse.data, token: access_token })
        } catch {
          // If /me fails, just set basic user info
          setUser({ email, token: access_token })
        }
        
        return { success: true }
      }
      
      return { success: false, error: 'Invalid response from server' }
    } catch (error) {
      console.error('Login error:', error)
      const errorMessage = error.response?.data?.detail || 
                          (Array.isArray(error.response?.data?.detail) 
                            ? error.response.data.detail[0]?.msg 
                            : null) ||
                          error.message || 
                          'Login failed'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  const register = async (email, username, password) => {
    try {
      const response = await api.post('/v2/u/signup', {
        email,
        username,
        password,
      })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Registration failed',
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

