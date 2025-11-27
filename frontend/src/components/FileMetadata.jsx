import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const FileMetadata = ({ fileId, accountId }) => {
  const [definitions, setDefinitions] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (fileId && accountId) {
      loadData();
    }
  }, [fileId, accountId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [defsRes, valuesRes] = await Promise.all([
        api.get('/v2/dms/metadata-dms/definitions', {
          headers: { 'X-Account-Id': accountId }
        }),
        api.get(`/v2/dms/metadata-dms/files/${fileId}`, {
          headers: { 'X-Account-Id': accountId }
        })
      ]);
      
      setDefinitions(defsRes.data || []);
      
      // Convert values array to object keyed by definition_id
      const valuesMap = {};
      (valuesRes.data || []).forEach(v => {
        valuesMap[v.definition_id] = v.value;
      });
      setValues(valuesMap);
    } catch (error) {
      console.error('Failed to load metadata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (defId, value) => {
    setValues(prev => ({ ...prev, [defId]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const metadata = Object.entries(values)
        .filter(([_, v]) => v !== undefined && v !== '')
        .map(([definition_id, value]) => ({ definition_id, value }));
      
      await api.put(`/v2/dms/metadata-dms/files/${fileId}`, { metadata }, {
        headers: { 'X-Account-Id': accountId }
      });
      
      toast.success('Metadata saved');
      setEditMode(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save metadata');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (def) => {
    const value = values[def.id] ?? '';
    const isDisabled = !editMode;

    switch (def.field_type) {
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => handleValueChange(def.id, e.target.checked)}
            disabled={isDisabled}
            className="form-check-input"
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleValueChange(def.id, e.target.value ? Number(e.target.value) : '')}
            disabled={isDisabled}
            className="form-control"
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value ? value.split('T')[0] : ''}
            onChange={(e) => handleValueChange(def.id, e.target.value)}
            disabled={isDisabled}
            className="form-control"
          />
        );
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleValueChange(def.id, e.target.value)}
            disabled={isDisabled}
            className="form-select"
          >
            <option value="">-- Select --</option>
            {(def.options || []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'multiselect':
        return (
          <select
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, o => o.value);
              handleValueChange(def.id, selected);
            }}
            disabled={isDisabled}
            className="form-select"
            style={{ minHeight: '80px' }}
          >
            {(def.options || []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleValueChange(def.id, e.target.value)}
            disabled={isDisabled}
            className="form-control"
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (definitions.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Custom Metadata</h5>
          <p className="text-muted">No metadata fields defined for this section.</p>
          <p className="text-muted small">
            Go to <strong>Metadata</strong> in the admin menu to create custom fields.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Custom Metadata</h5>
        {!editMode ? (
          <button className="btn btn-sm btn-outline-primary" onClick={() => setEditMode(true)}>
            <i className="bi bi-pencil me-1"></i> Edit
          </button>
        ) : (
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => { setEditMode(false); loadData(); }}>
              Cancel
            </button>
          </div>
        )}
      </div>
      <div className="card-body">
        <div className="row g-3">
          {definitions.map(def => (
            <div key={def.id} className="col-md-6">
              <label className="form-label">
                {def.label}
                {def.is_required && <span className="text-danger ms-1">*</span>}
              </label>
              {renderField(def)}
              {def.description && (
                <small className="text-muted">{def.description}</small>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FileMetadata;
