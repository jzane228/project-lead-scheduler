import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import {
  Cog6ToothIcon,
  UserIcon,
  ShieldCheckIcon,
  BellIcon,
  ChartBarIcon,
  CloudIcon,
  KeyIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const SettingsDashboard = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isMobile, setIsMobile] = useState(false);
  const queryClient = useQueryClient();

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch user settings
  const { data: userSettings, isLoading } = useQuery(
    'userSettings',
    async () => {
      const response = await axios.get('/api/users/settings');
      return response.data;
    }
  );

  // Update settings mutation
  const updateSettingsMutation = useMutation(
    async (settings) => {
      const response = await axios.put('/api/users/settings', settings);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('userSettings');
        toast.success('Settings updated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update settings');
      }
    }
  );

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
    { id: 'integrations', label: 'Integrations', icon: CloudIcon },
    { id: 'api', label: 'API Keys', icon: KeyIcon },
    { id: 'preferences', label: 'Preferences', icon: Cog6ToothIcon }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
              <div className="lg:col-span-3">
                <div className="h-96 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center">
              <Cog6ToothIcon className="h-8 w-8 text-indigo-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-600">Manage your account and preferences</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === tab.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-3" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'profile' && (
              <ProfileTab 
                userSettings={userSettings}
                updateSettings={updateSettingsMutation.mutate}
                isMobile={isMobile}
              />
            )}
            
            {activeTab === 'security' && (
              <SecurityTab 
                userSettings={userSettings}
                updateSettings={updateSettingsMutation.mutate}
                isMobile={isMobile}
              />
            )}
            
            {activeTab === 'notifications' && (
              <NotificationsTab 
                userSettings={userSettings}
                updateSettings={updateSettingsMutation.mutate}
                isMobile={isMobile}
              />
            )}
            
            {activeTab === 'analytics' && (
              <AnalyticsTab 
                userSettings={userSettings}
                updateSettings={updateSettingsMutation.mutate}
                isMobile={isMobile}
              />
            )}
            
            {activeTab === 'integrations' && (
              <IntegrationsTab 
                userSettings={userSettings}
                updateSettings={updateSettingsMutation.mutate}
                isMobile={isMobile}
              />
            )}
            
            {activeTab === 'api' && (
              <ApiTab 
                userSettings={userSettings}
                updateSettings={updateSettingsMutation.mutate}
                isMobile={isMobile}
              />
            )}
            
            {activeTab === 'preferences' && (
              <PreferencesTab 
                userSettings={userSettings}
                updateSettings={updateSettingsMutation.mutate}
                isMobile={isMobile}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Profile Tab Component
const ProfileTab = ({ userSettings, updateSettings, isMobile }) => {
  const [formData, setFormData] = useState({
    firstName: userSettings?.first_name || '',
    lastName: userSettings?.last_name || '',
    email: userSettings?.email || '',
    company: userSettings?.company || '',
    phone: userSettings?.phone || '',
    timezone: userSettings?.timezone || 'UTC'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings({ profile: formData });
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
        <p className="text-sm text-gray-600">Update your personal information</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Company</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({...formData, company: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Timezone</label>
          <select
            value={formData.timezone}
            onChange={(e) => setFormData({...formData, timezone: e.target.value})}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
          </select>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

// Security Tab Component
const SecurityTab = ({ userSettings, updateSettings, isMobile }) => {
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    updateSettings({ password: passwords });
    setPasswords({ current: '', new: '', confirm: '' });
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
        <p className="text-sm text-gray-600">Manage your account security</p>
      </div>
      
      <div className="p-6 space-y-6">
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Change Password</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Current Password</label>
            <input
              type="password"
              value={passwords.current}
              onChange={(e) => setPasswords({...passwords, current: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              value={passwords.new}
              onChange={(e) => setPasswords({...passwords, new: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
            <input
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Update Password
            </button>
          </div>
        </form>
        
        <div className="border-t pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Two-Factor Authentication</h4>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
            </div>
            <button className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
              Enable 2FA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Notifications Tab Component
const NotificationsTab = ({ userSettings, updateSettings, isMobile }) => {
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false,
    leadAlerts: true,
    scrapingUpdates: true,
    weeklyReports: false
  });

  const handleNotificationChange = (key, value) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    updateSettings({ notifications: updated });
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
        <p className="text-sm text-gray-600">Choose how you want to be notified</p>
      </div>
      
      <div className="p-6 space-y-6">
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Notification Channels</h4>
          <div className="space-y-3">
            {[
              { key: 'email', label: 'Email Notifications' },
              { key: 'push', label: 'Push Notifications' },
              { key: 'sms', label: 'SMS Notifications' }
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications[key]}
                    onChange={(e) => handleNotificationChange(key, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <div className="border-t pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Notification Types</h4>
          <div className="space-y-3">
            {[
              { key: 'leadAlerts', label: 'New Lead Alerts' },
              { key: 'scrapingUpdates', label: 'Scraping Job Updates' },
              { key: 'weeklyReports', label: 'Weekly Performance Reports' }
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications[key]}
                    onChange={(e) => handleNotificationChange(key, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Analytics Tab Component
const AnalyticsTab = ({ userSettings, updateSettings, isMobile }) => {
  const [analytics, setAnalytics] = useState({
    trackingEnabled: true,
    dataRetention: '90d',
    exportFormat: 'excel',
    refreshInterval: '5m'
  });

  const handleAnalyticsChange = (key, value) => {
    const updated = { ...analytics, [key]: value };
    setAnalytics(updated);
    updateSettings({ analytics: updated });
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Analytics Settings</h3>
        <p className="text-sm text-gray-600">Configure your analytics preferences</p>
      </div>
      
      <div className="p-6 space-y-6">
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Data Tracking</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Enable Analytics Tracking</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={analytics.trackingEnabled}
                  onChange={(e) => handleAnalyticsChange('trackingEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Data Retention</label>
            <select
              value={analytics.dataRetention}
              onChange={(e) => handleAnalyticsChange('dataRetention', e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
              <option value="1y">1 year</option>
              <option value="forever">Forever</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Export Format</label>
            <select
              value={analytics.exportFormat}
              onChange={(e) => handleAnalyticsChange('exportFormat', e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

// Integrations Tab Component
const IntegrationsTab = ({ userSettings, updateSettings, isMobile }) => {
  const integrations = [
    { name: 'HubSpot', status: 'connected', icon: '🔗' },
    { name: 'Salesforce', status: 'disconnected', icon: '🔌' },
    { name: 'Pipedrive', status: 'disconnected', icon: '🔌' },
    { name: 'Zapier', status: 'connected', icon: '🔗' }
  ];

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Third-Party Integrations</h3>
        <p className="text-sm text-gray-600">Connect your favorite tools and services</p>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {integrations.map((integration) => (
            <div key={integration.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <span className="text-2xl mr-3">{integration.icon}</span>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{integration.name}</h4>
                  <p className="text-sm text-gray-500 capitalize">{integration.status}</p>
                </div>
              </div>
              
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  integration.status === 'connected'
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                }`}
              >
                {integration.status === 'connected' ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// API Tab Component
const ApiTab = ({ userSettings, updateSettings, isMobile }) => {
  const [apiKey, setApiKey] = useState('sk_test_...');
  const [showKey, setShowKey] = useState(false);

  const regenerateKey = () => {
    const newKey = 'sk_test_' + Math.random().toString(36).substr(2, 9);
    setApiKey(newKey);
    toast.success('API key regenerated successfully');
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">API Configuration</h3>
        <p className="text-sm text-gray-600">Manage your API keys and access</p>
      </div>
      
      <div className="p-6 space-y-6">
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">API Key</h4>
          <div className="flex items-center space-x-3">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              readOnly
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
            <button
              onClick={regenerateKey}
              className="px-3 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
            >
              Regenerate
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-600">Keep your API key secure and never share it publicly</p>
        </div>
        
        <div className="border-t pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">API Documentation</h4>
          <p className="text-sm text-gray-600 mb-4">Learn how to integrate with our API</p>
          <a
            href="/api-docs"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            View Documentation
          </a>
        </div>
      </div>
    </div>
  );
};

// Preferences Tab Component
const PreferencesTab = ({ userSettings, updateSettings, isMobile }) => {
  const [preferences, setPreferences] = useState({
    theme: 'light',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    timeFormat: '12h'
  });

  const handlePreferenceChange = (key, value) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    updateSettings({ preferences: updated });
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">User Preferences</h3>
        <p className="text-sm text-gray-600">Customize your experience</p>
      </div>
      
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Theme</label>
            <select
              value={preferences.theme}
              onChange={(e) => handlePreferenceChange('theme', e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Language</label>
            <select
              value={preferences.language}
              onChange={(e) => handlePreferenceChange('language', e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Date Format</label>
            <select
              value={preferences.dateFormat}
              onChange={(e) => handlePreferenceChange('dateFormat', e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Currency</label>
            <select
              value={preferences.currency}
              onChange={(e) => handlePreferenceChange('currency', e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD (C$)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Time Format</label>
            <select
              value={preferences.timeFormat}
              onChange={(e) => handlePreferenceChange('timeFormat', e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="12h">12-hour</option>
              <option value="24h">24-hour</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsDashboard;
