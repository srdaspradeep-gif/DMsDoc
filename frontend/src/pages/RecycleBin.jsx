import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const RecycleBin = () => {
  const { user } = useAuth();
  const [deletedFiles, setDeletedFiles] = useState([]);
  const [deletedFolders, setDeletedFolders] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [itemType, setItemType] = useState('file');
  const [loading, setLoading] = useState(false);

  const accountId = user?.default_account_id || user?.accounts?.[0]?.id;

  useEffect(() => {
    if (accountId) {
      loadDeletedItems();
    }
  }, [accountId, itemType]);

  const loadDeletedItems = async () => {
    try {
      if (itemType === 'file') {
        const response = await axios.get('/dms/recycle-bin/files', {
          params: { account_id: accountId }
        });
        setDeletedFiles(response.data);
      } else {
        const response = await axios.get('/dms/recycle-bin/folders', {
          params: { account_id: accountId }
        });
        setDeletedFolders(response.data);
      }
    } catch (error) {
      console.error('Failed to load deleted items:', error);
    }
  };

  const handleRestore = async () => {
    if (selectedItems.length === 0) {
      alert('Please select items to restore');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/dms/recycle-bin/restore', {
        item_ids: selectedItems,
        item_type: itemType
      }, {
        params: { account_id: accountId }
      });

      alert(`Restored ${selectedItems.length} ${itemType}(s) successfully!`);
      setSelectedItems([]);
      await loadDeletedItems();
    } catch (error) {
      alert('Failed to restore items: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (selectedItems.length === 0) {
      alert('Please select items to delete');
      return;
    }

    if (!confirm(`Permanently delete ${selectedItems.length} ${itemType}(s)? This cannot be undone!`)) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete('/dms/recycle-bin/permanent', {
        data: {
          item_ids: selectedItems,
          item_type: itemType
        },
        params: { account_id: accountId }
      });

      alert(`Permanently deleted ${selectedItems.length} ${itemType}(s)`);
      setSelectedItems([]);
      await loadDeletedItems();
    } catch (error) {
      alert('Failed to delete items: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEmptyRecycleBin = async () => {
    if (!confirm('Empty entire recycle bin? This will permanently delete ALL items and cannot be undone!')) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`/dms/recycle-bin/empty/${accountId}`);
      alert('Recycle bin emptied successfully');
      await loadDeletedItems();
    } catch (error) {
      alert('Failed to empty recycle bin: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const items = itemType === 'file' ? deletedFiles : deletedFolders;
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(i => i.id));
    }
  };

  const items = itemType === 'file' ? deletedFiles : deletedFolders;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Recycle Bin</h1>
        <p className="text-gray-600 mb-4">
          Deleted items are stored here. You can restore or permanently delete them.
        </p>

        {/* Type Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              setItemType('file');
              setSelectedItems([]);
            }}
            className={`px-4 py-2 rounded ${itemType === 'file' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Files
          </button>
          <button
            onClick={() => {
              setItemType('folder');
              setSelectedItems([]);
            }}
            className={`px-4 py-2 rounded ${itemType === 'folder' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Folders
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleRestore}
            disabled={loading || selectedItems.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Restore Selected ({selectedItems.length})
          </button>
          <button
            onClick={handlePermanentDelete}
            disabled={loading || selectedItems.length === 0}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Delete Permanently ({selectedItems.length})
          </button>
          <button
            onClick={handleEmptyRecycleBin}
            disabled={loading}
            className="ml-auto px-4 py-2 bg-red-800 text-white rounded hover:bg-red-900 disabled:opacity-50"
          >
            Empty Recycle Bin
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white rounded-lg shadow">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Recycle bin is empty</p>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="flex items-center gap-4 p-4 border-b bg-gray-50">
              <input
                type="checkbox"
                checked={selectedItems.length === items.length}
                onChange={toggleSelectAll}
                className="w-5 h-5"
              />
              <span className="font-semibold">Select All</span>
            </div>

            {/* Items */}
            <div className="divide-y">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => toggleSelection(item.id)}
                    className="w-5 h-5"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">
                      Deleted: {new Date(item.deleted_at).toLocaleString()}
                      {item.size_bytes && ` | Size: ${(item.size_bytes / 1024 / 1024).toFixed(2)} MB`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedItems([item.id]);
                        handleRestore();
                      }}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => {
                        setSelectedItems([item.id]);
                        handlePermanentDelete();
                      }}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecycleBin;
