import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import Groups from '../pages/admin/Groups'
import { api } from '../services/api'
import '@testing-library/jest-dom'

// Mock the API
jest.mock('../services/api')

// Mock toast
jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn(),
}))

describe('Groups Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders groups management page', async () => {
    const mockGroups = [
      { id: '1', name: 'Sales Team', description: 'Sales department' },
      { id: '2', name: 'Engineering', description: 'Engineering team' }
    ]
    const mockUsers = [
      { id: 'u1', username: 'user1', email: 'user1@example.com' }
    ]

    api.get.mockImplementation((url) => {
      if (url === '/v2/rbac/groups') {
        return Promise.resolve({ data: mockGroups })
      }
      if (url === '/v2/rbac/users') {
        return Promise.resolve({ data: mockUsers })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(
      <BrowserRouter>
        <AuthProvider>
          <Groups />
        </AuthProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Groups Management')).toBeInTheDocument()
      expect(screen.getByText('Sales Team')).toBeInTheDocument()
      expect(screen.getByText('Engineering')).toBeInTheDocument()
    })
  })

  it('shows empty state when no groups exist', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/v2/rbac/groups') {
        return Promise.resolve({ data: [] })
      }
      if (url === '/v2/rbac/users') {
        return Promise.resolve({ data: [] })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(
      <BrowserRouter>
        <AuthProvider>
          <Groups />
        </AuthProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('No groups found')).toBeInTheDocument()
    })
  })
})
