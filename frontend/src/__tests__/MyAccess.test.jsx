import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import MyAccess from '../pages/MyAccess'
import { api } from '../services/api'
import '@testing-library/jest-dom'

// Mock the API
jest.mock('../services/api')

// Mock toast
jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
}))

// Mock useAuth
jest.mock('../contexts/AuthContext', () => ({
  ...jest.requireActual('../contexts/AuthContext'),
  useAuth: () => ({
    user: { id: 'user123', username: 'testuser' }
  })
}))

describe('MyAccess Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders my access page with user info', async () => {
    const mockUserDetails = {
      id: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      is_super_admin: false,
      roles: [
        { id: 'r1', name: 'Editor', description: 'Can edit documents' }
      ],
      groups: [
        { id: 'g1', name: 'Content Team', description: 'Content creators' }
      ],
      accounts: [
        { id: 'a1', name: 'Main Account', slug: 'main', is_active: true }
      ]
    }

    const mockPermissions = [
      { module: 'files', action: 'read' },
      { module: 'files', action: 'create' }
    ]

    api.get.mockImplementation((url) => {
      if (url.includes('/v2/rbac/users/user123/permissions')) {
        return Promise.resolve({ data: mockPermissions })
      }
      if (url.includes('/v2/rbac/users/user123')) {
        return Promise.resolve({ data: mockUserDetails })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(
      <BrowserRouter>
        <MyAccess />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('My Access')).toBeInTheDocument()
      expect(screen.getByText('testuser')).toBeInTheDocument()
      expect(screen.getByText('Editor')).toBeInTheDocument()
      expect(screen.getByText('Content Team')).toBeInTheDocument()
    })
  })

  it('shows super admin badge for super admins', async () => {
    const mockUserDetails = {
      id: 'user123',
      username: 'admin',
      email: 'admin@example.com',
      is_super_admin: true,
      roles: [],
      groups: [],
      accounts: []
    }

    api.get.mockImplementation((url) => {
      if (url.includes('/v2/rbac/users/user123')) {
        return Promise.resolve({ data: mockUserDetails })
      }
      if (url.includes('/permissions')) {
        return Promise.resolve({ data: [] })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(
      <BrowserRouter>
        <MyAccess />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Super Administrator')).toBeInTheDocument()
    })
  })
})
