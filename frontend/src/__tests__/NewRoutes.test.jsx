import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import '@testing-library/jest-dom'

// Mock the API
jest.mock('../services/api')

// Mock toast
jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
}))

// Import pages
import AuditLog from '../pages/AuditLog'
import Inbox from '../pages/Inbox'
import MyApprovals from '../pages/MyApprovals'
import MyReminders from '../pages/MyReminders'
import Profile from '../pages/Profile'
import RecycleBin from '../pages/RecycleBin'

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('New Route Pages', () => {
  it('renders AuditLog page with heading', () => {
    renderWithProviders(<AuditLog />)
    expect(screen.getByText('Audit Log')).toBeInTheDocument()
  })

  it('renders Inbox page with heading', () => {
    renderWithProviders(<Inbox />)
    expect(screen.getByText('Inbox')).toBeInTheDocument()
  })

  it('renders MyApprovals page with heading', () => {
    renderWithProviders(<MyApprovals />)
    expect(screen.getByText(/Pending Approvals/i)).toBeInTheDocument()
  })

  it('renders MyReminders page with heading', () => {
    renderWithProviders(<MyReminders />)
    expect(screen.getByText(/My Reminders/i)).toBeInTheDocument()
  })

  it('renders Profile page with heading', () => {
    renderWithProviders(<Profile />)
    expect(screen.getByText('Profile Settings')).toBeInTheDocument()
  })

  it('renders RecycleBin page with heading', () => {
    renderWithProviders(<RecycleBin />)
    expect(screen.getByText('Recycle Bin')).toBeInTheDocument()
  })
})
