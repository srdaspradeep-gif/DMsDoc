import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Save, Upload, X, Mail, Image, Type, Globe } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Settings() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({
    app_name: 'DocFlow',
    app_title: 'Document Management System',
    logo_url: '',
    favicon_url: '',
    primary_color: '#2563eb',
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: '',
    smtp_use_tls: true
  })
  const [logoFile, setLogoFile] = useState(null)
  const [faviconFile, setFaviconFile] = useState(null)

  const accountId = user?.default_account_id || user?.accounts?.[0]?.id

  useEffect(() => {
    if (accountId) loadSettings()
  }, [accountId])

  const loadSettings = async () => {
    try {
      const response = await api.get('/v2/dms/settings', {
        headers: { 'X-Account-Id': accountId }
      })
      setSettings(response.data)
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await api.put('/v2/dms/settings', settings, {
        headers: { 'X-Account-Id': accountId }
      })
      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async () => {
    if (!logoFile) return
    
    const formData = new FormData()
    formData.append('file', logoFile)
    formData.append('type', 'logo')
    
    try {
      const response = await api.post('/v2/dms/settings/upload', formData, {
        headers: { 
          'X-Account-Id': accountId,
          'Content-Type': 'multipart/form-data'
        }
      })
      setSettings({ ...settings, logo_url: response.data.url })
      setLogoFile(null)
      toast.success('Logo uploaded successfully')
    } catch (error) {
      toast.error('Failed to upload logo')
    }
  }

  const handleFaviconUpload = async () => {
    if (!faviconFile) return
    
    const formData = new FormData()
    formData.append('file', faviconFile)
    formData.append('type', 'favicon')
    
    try {
      const response = await api.post('/v2/dms/settings/upload', formData, {
        headers: { 
          'X-Account-Id': accountId,
          'Content-Type': 'multipart/form-data'
        }
      })
      setSettings({ ...settings, favicon_url: response.data.url })
      setFaviconFile(null)
      toast.success('Favicon uploaded successfully')
    } catch (error) {
      toast.error('Failed to upload favicon')
    }
  }

  const handleTestEmail = async () => {
    try {
      await api.post('/v2/dms/settings/test-email', {
        to_email: user.email
      }, {
        headers: { 'X-Account-Id': accountId }
      })
      toast.success('Test email sent successfully')
    } catch (error) {
      toast.error('Failed to send test email')
    }
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Type },
    { id: 'branding', label: 'Branding', icon: Image },
    { id: 'email', label: 'Email', icon: Mail }
  ]

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Configure your application settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={18} />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 px-4">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application Name
                </label>
                <input
                  type="text"
                  value={settings.app_name}
                  onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="DocFlow"
                />
                <p className="text-xs text-gray-500 mt-1">This name appears in the sidebar and browser title</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application Title
                </label>
                <input
                  type="text"
                  value={settings.app_title}
                  onChange={(e) => setSettings({ ...settings, app_title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Document Management System"
                />
                <p className="text-xs text-gray-500 mt-1">Subtitle or tagline for your application</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="#2563eb"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Main theme color for the application</p>
              </div>
            </div>
          )}

          {/* Branding Settings */}
          {activeTab === 'branding' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo
                </label>
                <div className="flex items-start gap-4">
                  {settings.logo_url && (
                    <div className="relative">
                      <img
                        src={settings.logo_url}
                        alt="Logo"
                        className="h-20 w-20 object-contain border border-gray-200 rounded"
                      />
                      <button
                        onClick={() => setSettings({ ...settings, logo_url: '' })}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLogoFile(e.target.files[0])}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {logoFile && (
                      <button
                        onClick={handleLogoUpload}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        <Upload size={16} className="inline mr-2" />
                        Upload Logo
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Recommended size: 200x200px, PNG or SVG format</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Favicon
                </label>
                <div className="flex items-start gap-4">
                  {settings.favicon_url && (
                    <div className="relative">
                      <img
                        src={settings.favicon_url}
                        alt="Favicon"
                        className="h-12 w-12 object-contain border border-gray-200 rounded"
                      />
                      <button
                        onClick={() => setSettings({ ...settings, favicon_url: '' })}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/x-icon,image/png"
                      onChange={(e) => setFaviconFile(e.target.files[0])}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {faviconFile && (
                      <button
                        onClick={handleFaviconUpload}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        <Upload size={16} className="inline mr-2" />
                        Upload Favicon
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Recommended size: 32x32px or 64x64px, ICO or PNG format</p>
              </div>
            </div>
          )}

          {/* Email Settings */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Configure SMTP settings to enable email notifications for approvals, reminders, and sharing.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={settings.smtp_host}
                    onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    value={settings.smtp_port}
                    onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="587"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Username
                </label>
                <input
                  type="text"
                  value={settings.smtp_user}
                  onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="your-email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Password
                </label>
                <input
                  type="password"
                  value={settings.smtp_password}
                  onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="••••••••"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Email
                  </label>
                  <input
                    type="email"
                    value={settings.smtp_from_email}
                    onChange={(e) => setSettings({ ...settings, smtp_from_email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="noreply@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Name
                  </label>
                  <input
                    type="text"
                    value={settings.smtp_from_name}
                    onChange={(e) => setSettings({ ...settings, smtp_from_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="DocFlow"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="smtp_use_tls"
                  checked={settings.smtp_use_tls}
                  onChange={(e) => setSettings({ ...settings, smtp_use_tls: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="smtp_use_tls" className="text-sm text-gray-700">
                  Use TLS/STARTTLS
                </label>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleTestEmail}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Mail size={16} className="inline mr-2" />
                  Send Test Email
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  A test email will be sent to your account email: {user?.email}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
