import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    language: 'en',
    timezone: 'UTC',
    default_account_id: ''
  });
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProfile();
    loadAccounts();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await axios.get('/rbac/profile/me');
      setProfile({
        language: response.data.language || 'en',
        timezone: response.data.timezone || 'UTC',
        default_account_id: response.data.default_account_id || ''
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await axios.get('/rbac/accounts');
      setAccounts(response.data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await axios.put('/rbac/profile/me', profile);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to update profile: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'ja', name: '日本語' },
    { code: 'zh', name: '中文' }
  ];

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Dubai',
    'Australia/Sydney'
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Profile Settings</h1>

      {/* User Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">User Information</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Username:</span>
            <span className="font-medium">{user?.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Full Name:</span>
            <span className="font-medium">{user?.full_name || 'Not set'}</span>
          </div>
        </div>
      </div>

      {/* Profile Settings Form */}
      <form onSubmit={handleSave} className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Preferences</h2>

        {message && (
          <div className={`mb-4 p-3 rounded ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}

        <div className="space-y-4">
          {/* Language */}
          <div>
            <label className="block text-sm font-medium mb-2">Language</label>
            <select
              value={profile.language}
              onChange={(e) => handleChange('language', e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium mb-2">Timezone</label>
            <select
              value={profile.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              {timezones.map(tz => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          {/* Default Account */}
          <div>
            <label className="block text-sm font-medium mb-2">Default Account</label>
            <select
              value={profile.default_account_id}
              onChange={(e) => handleChange('default_account_id', e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select default account...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              This account will be selected by default when you log in
            </p>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Password Change Section */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">Security</h2>
        <button
          onClick={() => alert('Password change functionality coming soon')}
          className="w-full bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300"
        >
          Change Password
        </button>
      </div>
    </div>
  );
};

export default Profile;
