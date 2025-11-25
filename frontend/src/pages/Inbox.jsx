import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const Inbox = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [inboxAddress, setInboxAddress] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [folders, setFolders] = useState([]);
  const [targetFolder, setTargetFolder] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('unprocessed'); // all, unprocessed, processed

  const accountId = user?.default_account_id || user?.accounts?.[0]?.id;

  useEffect(() => {
    if (accountId) {
      loadInboxAddress();
      loadEntries();
      loadFolders();
    }
  }, [accountId, filter]);

  const loadInboxAddress = async () => {
    try {
      const response = await axios.get(`/dms/inbox/address/${accountId}`);
      setInboxAddress(response.data.inbox_address);
    } catch (error) {
      console.error('Failed to load inbox address:', error);
    }
  };

  const loadEntries = async () => {
    try {
      const params = { account_id: accountId };
      if (filter !== 'all') {
        params.is_processed = filter === 'processed';
      }
      
      const response = await axios.get('/dms/inbox', { params });
      setEntries(response.data);
    } catch (error) {
      console.error('Failed to load inbox entries:', error);
    }
  };

  const loadFolders = async () => {
    try {
      const response = await axios.get('/dms/folders', {
        params: { account_id: accountId }
      });
      setFolders(response.data);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const handleMoveToFolder = async (entryId) => {
    if (!targetFolder) {
      alert('Please select a folder');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`/dms/inbox/${entryId}/move`, {
        folder_id: targetFolder
      });
      
      alert('Attachments moved to folder successfully!');
      setSelectedEntry(null);
      setTargetFolder('');
      await loadEntries();
    } catch (error) {
      alert('Failed to move attachments: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!confirm('Delete this inbox entry?')) return;

    try {
      await axios.delete(`/dms/inbox/${entryId}`);
      await loadEntries();
    } catch (error) {
      alert('Failed to delete entry: ' + (error.response?.data?.detail || error.message));
    }
  };

  const copyInboxAddress = () => {
    navigator.clipboard.writeText(inboxAddress);
    alert('Inbox address copied to clipboard!');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Inbox</h1>
        
        {/* Inbox Address */}
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-gray-600 mb-2">Your Inbox Address:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={inboxAddress}
              readOnly
              className="flex-1 border rounded px-3 py-2 bg-white"
            />
            <button
              onClick={copyInboxAddress}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Send emails to this address to import documents
          </p>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unprocessed')}
            className={`px-4 py-2 rounded ${filter === 'unprocessed' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Unprocessed
          </button>
          <button
            onClick={() => setFilter('processed')}
            className={`px-4 py-2 rounded ${filter === 'processed' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Processed
          </button>
        </div>
      </div>

      {/* Inbox Entries */}
      <div className="space-y-4">
        {entries.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No inbox entries</p>
          </div>
        ) : (
          entries.map(entry => (
            <div key={entry.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{entry.from_email}</span>
                    {entry.is_processed && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        Processed
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-medium">{entry.subject || '(No Subject)'}</p>
                  <p className="text-sm text-gray-600 mt-1">{entry.body_preview}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Received: {new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteEntry(entry.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Attachments */}
              {entry.attachments && entry.attachments.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm font-medium mb-2">
                    Attachments ({entry.attachments.length}):
                  </p>
                  <div className="space-y-1">
                    {entry.attachments.map(att => (
                      <div key={att.id} className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span>{att.filename}</span>
                        <span className="text-gray-400">({(parseInt(att.size_bytes) / 1024).toFixed(1)} KB)</span>
                        {att.file_id && (
                          <span className="text-green-600 text-xs">✓ Moved</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {!entry.is_processed && (
                    <div className="mt-3 flex gap-2">
                      <select
                        value={selectedEntry === entry.id ? targetFolder : ''}
                        onChange={(e) => {
                          setSelectedEntry(entry.id);
                          setTargetFolder(e.target.value);
                        }}
                        className="flex-1 border rounded px-3 py-2"
                      >
                        <option value="">Select folder to move attachments...</option>
                        {folders.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleMoveToFolder(entry.id)}
                        disabled={loading || selectedEntry !== entry.id || !targetFolder}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        Move
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Inbox;
