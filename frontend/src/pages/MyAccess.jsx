import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { Shield, Users, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function MyAccess() {
  const { user } = useAuth()
  const [userDetails, setUserDetails] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      loadUserAccess()
    }
  }, [user])

  const loadUserAccess = async () => {
    try {
      // Get user details with RBAC info
      const userResponse = await api.get(`/v2/rbac/users/${user.id}`)
      setUserDetails(userResponse.data)

      // Get user permissions
      const permsResponse = await api.get(`/v2/rbac/users/${user.id}/permissions`)
      setPermissions(permsResponse.data)
    } catch (error) {
      toast.error('Failed to load access information')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!userDetails) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Unable to load access information</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900">My Access</h1>
        <p className="text-sm text-gray-600 mt-1">View your roles and permissions</p>
      </div>

      {/* User Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-3">User Information</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Username:</span>
            <span className="text-sm font-medium">{userDetails.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Email:</span>
            <span className="text-sm font-medium">{userDetails.email}</span>
          </div>
          {userDetails.is_super_admin && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-purple-50 rounded">
              <Shield className="text-purple-600" size={20} />
              <span className="text-sm font-medium text-purple-600">Super Administrator</span>
            </div>
          )}
        </div>
      </div>

      {/* Accounts */}
      {userDetails.accounts && userDetails.accounts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-3">Accounts</h2>
          <div className="space-y-2">
            {userDetails.accounts.map(account => (
              <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium">{account.name}</div>
                  <div className="text-xs text-gray-500">{account.slug}</div>
                </div>
                {account.is_active ? (
                  <CheckCircle className="text-green-600" size={18} />
                ) : (
                  <XCircle className="text-red-600" size={18} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roles */}
      {userDetails.roles && userDetails.roles.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-3">Assigned Roles</h2>
          <div className="space-y-2">
            {userDetails.roles.map(role => (
              <div key={role.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Shield className="text-blue-600" size={20} />
                <div>
                  <div className="text-sm font-medium">{role.name}</div>
                  {role.description && (
                    <div className="text-xs text-gray-500">{role.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Groups */}
      {userDetails.groups && userDetails.groups.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-3">Group Memberships</h2>
          <div className="space-y-2">
            {userDetails.groups.map(group => (
              <div key={group.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Users className="text-blue-600" size={20} />
                <div>
                  <div className="text-sm font-medium">{group.name}</div>
                  {group.description && (
                    <div className="text-xs text-gray-500">{group.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permissions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-3">My Permissions</h2>
        {userDetails.is_super_admin ? (
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-800">
              As a Super Administrator, you have full access to all modules and actions.
            </p>
          </div>
        ) : permissions.length === 0 ? (
          <p className="text-sm text-gray-500">No permissions assigned</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(
              permissions.reduce((acc, perm) => {
                if (!acc[perm.module]) {
                  acc[perm.module] = []
                }
                acc[perm.module].push(perm.action)
                return acc
              }, {})
            ).map(([module, actions]) => (
              <div key={module} className="border-l-4 border-blue-500 pl-4">
                <div className="text-sm font-medium text-gray-900 mb-1">{module}</div>
                <div className="flex flex-wrap gap-2">
                  {actions.map(action => (
                    <span
                      key={action}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                    >
                      {action}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* No Access Warning */}
      {!userDetails.is_super_admin && 
       (!userDetails.roles || userDetails.roles.length === 0) && 
       (!userDetails.groups || userDetails.groups.length === 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            You don't have any roles or group memberships assigned. Contact your administrator to request access.
          </p>
        </div>
      )}
    </div>
  )
}
