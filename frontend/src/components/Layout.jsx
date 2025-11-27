import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  Home, 
  FileText, 
  Trash2, 
  LogOut, 
  Search,
  User,
  Inbox,
  RefreshCw,
  Users,
  Tag,
  Hash,
  Folder,
  FolderTree,
  List,
  Star,
  Mail,
  Settings,
  FileCheck,
  FileText as Logs,
  HelpCircle,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useState, useEffect } from 'react'
import MobileBottomNav from './MobileBottomNav'
import FloatingActionButton from './FloatingActionButton'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/sections', icon: FolderTree, label: 'Sections' },
    { path: '/documents', icon: FileText, label: 'Documents' },
  ]

  const savedViews = [
    { path: '/inbox', icon: Inbox, label: 'Inbox' },
    { path: '/approvals', icon: FileCheck, label: 'Approvals' },
    { path: '/reminders', icon: RefreshCw, label: 'Reminders' },
  ]

  const manageItems = [
    { path: '/correspondents', icon: Users, label: 'Correspondents' },
    { path: '/tags', icon: Tag, label: 'Tags' },
    { path: '/document-types', icon: Hash, label: 'Document Types' },
    { path: '/categories', icon: FolderTree, label: 'Categories' },
    { path: '/storage-paths', icon: Folder, label: 'Storage Paths' },
    { path: '/custom-fields', icon: List, label: 'Custom Fields' },
    { path: '/templates', icon: Star, label: 'Templates' },
    { path: '/mail', icon: Mail, label: 'Mail' },
  ]

  const adminItems = [
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/roles', icon: Settings, label: 'Roles' },
    { path: '/admin/groups', icon: Users, label: 'Groups' },
    { path: '/metadata', icon: List, label: 'Metadata' },
    { path: '/retention', icon: RefreshCw, label: 'Retention' },
    { path: '/access-overview', icon: HelpCircle, label: 'Access Overview' },
    { path: '/audit-log', icon: Logs, label: 'Audit Log' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ]

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      {/* Mobile Menu Overlay */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        bg-blue-700 text-white flex flex-col transition-all duration-300 z-50
        ${isMobile 
          ? `fixed inset-y-0 left-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`
          : 'relative'
        }
        ${!isMobile && (sidebarCollapsed ? 'w-16' : 'w-64')}
        ${isMobile ? 'w-64' : ''}
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-blue-600 flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
              <FileText size={20} />
            </div>
            {(!sidebarCollapsed || isMobile) && (
              <div className="min-w-0">
                <h1 className="text-lg font-bold truncate">DocFlow</h1>
                <p className="text-xs text-blue-200">v1.0.0</p>
              </div>
            )}
          </div>
          {/* Mobile close button */}
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-blue-600 rounded-lg ml-2"
            >
              <X size={20} />
            </button>
          )}
          {/* Desktop collapse button */}
          {!isMobile && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 hover:bg-blue-600 rounded-lg ml-2"
            >
              {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Main Navigation */}
          <div className="px-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => isMobile && setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-100 hover:bg-blue-600/50'
                  }`}
                  title={sidebarCollapsed ? item.label : ''}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {(!sidebarCollapsed || isMobile) && <span className="text-sm truncate">{item.label}</span>}
                </Link>
              )
            })}
          </div>

          {/* Saved Views */}
          {(!sidebarCollapsed || isMobile) && (
            <div className="px-4 py-2 mt-4">
              <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider">SAVED VIEWS</p>
            </div>
          )}
          <div className="px-2 space-y-1">
            {savedViews.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => isMobile && setMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-blue-100 hover:bg-blue-600/50 transition-colors"
                  title={sidebarCollapsed ? item.label : ''}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {(!sidebarCollapsed || isMobile) && <span className="text-sm truncate">{item.label}</span>}
                </Link>
              )
            })}
          </div>

          {/* Manage */}
          {(!sidebarCollapsed || isMobile) && (
            <div className="px-4 py-2 mt-4">
              <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider">MANAGE</p>
            </div>
          )}
          <div className="px-2 space-y-1">
            {manageItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => isMobile && setMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-blue-100 hover:bg-blue-600/50 transition-colors"
                  title={sidebarCollapsed ? item.label : ''}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {(!sidebarCollapsed || isMobile) && <span className="text-sm truncate">{item.label}</span>}
                </Link>
              )
            })}
          </div>

          {/* Administration */}
          {(!sidebarCollapsed || isMobile) && (
            <div className="px-4 py-2 mt-4">
              <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider">ADMINISTRATION</p>
            </div>
          )}
          <div className="px-2 space-y-1">
            {adminItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-blue-100 hover:bg-blue-600/50 transition-colors relative"
                  title={sidebarCollapsed ? item.label : ''}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {(!sidebarCollapsed || isMobile) && <span className="text-sm truncate">{item.label}</span>}
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Recycle Bin & Trash */}
          <div className="px-2 mt-2 space-y-1">
            <Link
              to="/recycle-bin"
              onClick={() => isMobile && setMobileMenuOpen(false)}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive('/recycle-bin')
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-100 hover:bg-blue-600/50'
              }`}
              title={sidebarCollapsed ? 'Recycle Bin' : ''}
            >
              <Trash2 size={20} />
              {(!sidebarCollapsed || isMobile) && <span className="text-sm">Recycle Bin</span>}
            </Link>
            <Link
              to="/trash"
              onClick={() => isMobile && setMobileMenuOpen(false)}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive('/trash')
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-100 hover:bg-blue-600/50'
              }`}
              title={sidebarCollapsed ? 'Trash' : ''}
            >
              <Trash2 size={20} />
              {(!sidebarCollapsed || isMobile) && <span className="text-sm">Trash</span>}
            </Link>
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-blue-600">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User size={16} />
            </div>
            {(!sidebarCollapsed || isMobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.email || 'User'}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-blue-100 hover:bg-blue-600/50 transition-colors"
            title={sidebarCollapsed ? 'Logout' : ''}
          >
            <LogOut size={20} />
            {(!sidebarCollapsed || isMobile) && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 md:px-6 py-3 md:py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
              
              {/* Search bar */}
              <div className="flex-1 max-w-2xl">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Q Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 pb-20 md:pb-0">
          <Outlet context={{ searchQuery }} />
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />

        {/* Floating Action Button */}
        <FloatingActionButton onUpload={() => {
          // Navigate to documents page with upload modal
          navigate('/documents?upload=true')
        }} />
      </div>
    </div>
  )
}
