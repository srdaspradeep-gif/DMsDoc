import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const AuditLog = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    user_id: '',
    action: '',
    resource_type: '',
    skip: 0,
    limit: 50
  });
  const [loading, setLoading] = useState(false);

  const accountId = user?.default_account_id || user?.accounts?.[0]?.id;

  useEffect(() => {
    if (accountId) {
      loadLogs();
    }
  }, [accountId]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/v2/dms/audit/query', filters, {
        params: { account_id: accountId }
      });
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      alert('Failed to load audit logs: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    loadLogs();
  };

  const handleReset = () => {
    setFilters({
      start_date: '',
      end_date: '',
      user_id: '',
      action: '',
      resource_type: '',
      skip: 0,
      limit: 50
    });
  };

  const getActionColor = (action) => {
    if (action.includes('create')) return 'text-green-600';
    if (action.includes('delete')) return 'text-red-600';
    if (action.includes('update')) return 'text-blue-600';
    return 'text-gray-600';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Audit Log</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="datetime-local"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="datetime-local"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Action</label>
            <input
              type="text"
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              placeholder="e.g., file.upload"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Resource Type</label>
            <select
              value={filters.resource_type}
              onChange={(e) => handleFilterChange('resource_type', e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All</option>
              <option value="file">File</option>
              <option value="folder">Folder</option>
              <option value="share">Share</option>
              <option value="approval">Approval</option>
              <option value="inbox_entry">Inbox Entry</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">User ID</label>
            <input
              type="text"
              value={filters.user_id}
              onChange={(e) => handleFilterChange('user_id', e.target.value)}
              placeholder="User ID"
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white rounded-lg shadow">
        {logs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No audit logs found</p>
          </div>
        ) : (
          <div className="divide-y">
            {logs.map(log => (
              <div key={log.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-semibold ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                      <span className="text-sm text-gray-500">
                        {log.resource_type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      User: {log.user_id || 'System'}
                      {log.ip_address && ` | IP: ${log.ip_address}`}
                    </p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-sm text-blue-600 cursor-pointer">
                          View Details
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  <span className="text-sm text-gray-400">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
