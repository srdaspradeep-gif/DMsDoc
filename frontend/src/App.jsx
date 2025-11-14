import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import DocumentDetail from './pages/DocumentDetail'
import Trash from './pages/Trash'
import Tags from './pages/Tags'
import Correspondents from './pages/Correspondents'
import DocumentTypes from './pages/DocumentTypes'
import CustomFields from './pages/CustomFields'
import Categories from './pages/Categories'
import Layout from './components/Layout'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  return user ? children : <Navigate to="/login" />
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="documents" element={<Documents />} />
            <Route path="documents/:id" element={<DocumentDetail />} />
            <Route path="trash" element={<Trash />} />
            <Route path="tags" element={<Tags />} />
            <Route path="correspondents" element={<Correspondents />} />
            <Route path="document-types" element={<DocumentTypes />} />
            <Route path="categories" element={<Categories />} />
            <Route path="storage-paths" element={<div className="p-6"><h1 className="text-2xl font-semibold">Storage Paths</h1><p className="text-gray-600 mt-2">Coming soon...</p></div>} />
            <Route path="custom-fields" element={<CustomFields />} />
            <Route path="templates" element={<div className="p-6"><h1 className="text-2xl font-semibold">Templates</h1><p className="text-gray-600 mt-2">Coming soon...</p></div>} />
            <Route path="mail" element={<div className="p-6"><h1 className="text-2xl font-semibold">Mail</h1><p className="text-gray-600 mt-2">Coming soon...</p></div>} />
            <Route path="settings" element={<div className="p-6"><h1 className="text-2xl font-semibold">Settings</h1><p className="text-gray-600 mt-2">Coming soon...</p></div>} />
            <Route path="users" element={<div className="p-6"><h1 className="text-2xl font-semibold">Users & Groups</h1><p className="text-gray-600 mt-2">Coming soon...</p></div>} />
            <Route path="tasks" element={<div className="p-6"><h1 className="text-2xl font-semibold">File Tasks</h1><p className="text-gray-600 mt-2">Coming soon...</p></div>} />
            <Route path="logs" element={<div className="p-6"><h1 className="text-2xl font-semibold">Logs</h1><p className="text-gray-600 mt-2">Coming soon...</p></div>} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App

