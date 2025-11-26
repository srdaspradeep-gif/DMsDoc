import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import Roles from '../pages/admin/Roles'
import { api } from '../services/api'
import '@testing-library/jest-dom'

// Mock the API
jest.mock('../services/api')

// Mock toast
jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn(),
}))

describe('Roles Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders roles management page', async () => {
    const mockRoles = [
      { id: '1', name: 'Admin', description: 'Administrator role', is_system: false },
      { id: '2', name: 'User', description: 'Regular user role', is_system: false }
    ]
    const mockModules = [
      { id: 'm1', key: 'files', display_name: 'Files' },
      { id: 'm2', key: 'folders', display_name: 'Folders' }
    ]

    api.get.mockImplementation((url) => {
      if (url === '/v2/rbac/roles') {
        return Promise.resolve({ data: mockRoles })
      }
      if (url === '/v2/rbac/modules') {
        return Promise.resolve({ data: mockModules })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(
      <BrowserRouter>
        <AuthProvider>
          <Roles />
        </AuthProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Roles Management')).toBeInTheDocument()
      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.getByText('User')).toBeInTheDocument()
    })
  })

  it('shows empty state when no roles exist', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/v2/rbac/roles') {
        return Promise.resolve({ data: [] })
      }
      if (url === '/v2/rbac/modules') {
        return Promise.resolve({ data: [] })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(
      <BrowserRouter>
        <AuthProvider>
          <Roles />
        </AuthProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('No roles found')).toBeInTheDocument()
    })
  })
})
