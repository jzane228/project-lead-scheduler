import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { 
  CloudIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const CRMIntegrationInterface = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [syncProgress, setSyncProgress] = useState({});
  const queryClient = useQueryClient();

  // Check if we're on mobile
  const isMobile = window.innerWidth <= 768;

  // Fetch CRM integrations data
  const { data: integrations, isLoading: integrationsLoading } = useQuery(
    'crm-integrations',
    async () => {
      const response = await axios.get('/api/crm/integrations');
      return response.data;
    },
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  // Fetch sync status
  const { data: syncStatus, isLoading: statusLoading } = useQuery(
    'crm-sync-status',
    async () => {
      const response = await axios.get('/api/crm/sync/status');
      return response.data;
    },
    { refetchInterval: 10000 } // Refresh every 10 seconds
  );

  // Fetch leads for sync
  const { data: leads, isLoading: leadsLoading } = useQuery(
    'leads-for-sync',
    async () => {
      const response = await axios.get('/api/leads/auth');
      return response.data.leads || [];
    }
  );

  // Sync lead mutation
  const syncLeadMutation = useMutation(
    async ({ leadId, crmType }) => {
      const endpoint = crmType === 'hubspot' ? '/api/crm/hubspot/sync' : '/api/crm/salesforce/sync';
      const response = await axios.post(`${endpoint}/${leadId}`);
      return response.data;
    },
    {
      onSuccess: (data, variables) => {
        toast.success(`Lead synced to ${variables.crmType} successfully`);
        queryClient.invalidateQueries('crm-sync-status');
        queryClient.invalidateQueries('leads-for-sync');
      },
      onError: (error) => {
        toast.error(`Failed to sync lead: ${error.response?.data?.error || 'Unknown error'}`);
      }
    }
  );

  // Bulk sync mutation
  const bulkSyncMutation = useMutation(
    async ({ leadIds, crmType }) => {
      const endpoint = crmType === 'hubspot' ? '/api/crm/hubspot/sync/bulk' : '/api/crm/salesforce/sync/bulk';
      const response = await axios.post(endpoint, { leadIds });
      return response.data;
    },
    {
      onSuccess: (data, variables) => {
        toast.success(`${data.results.length} leads synced to ${variables.crmType} successfully`);
        setSelectedLeads([]);
        queryClient.invalidateQueries('crm-sync-status');
        queryClient.invalidateQueries('leads-for-sync');
      },
      onError: (error) => {
        toast.error(`Failed to bulk sync: ${error.response?.data?.error || 'Unknown error'}`);
      }
    }
  );

  // Handle lead selection
  const handleLeadSelection = (leadId) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  // Handle bulk sync
  const handleBulkSync = (crmType) => {
    if (selectedLeads.length === 0) {
      toast.error('Please select leads to sync');
      return;
    }
    
    bulkSyncMutation.mutate({ leadIds: selectedLeads, crmType });
  };

  // Handle individual sync
  const handleSyncLead = (leadId, crmType) => {
    syncLeadMutation.mutate({ leadId, crmType });
  };

  // Get CRM icon
  const getCRMIcon = (crmType) => {
    switch (crmType) {
      case 'hubspot':
        return <BuildingOfficeIcon className="w-6 h-6 text-orange-500" />;
      case 'salesforce':
        return <CloudIcon className="w-6 h-6 text-blue-500" />;
      default:
        return <CloudIcon className="w-6 h-6 text-gray-500" />;
    }
  };

  // Get connection status
  const getConnectionStatus = (crmType) => {
    const status = syncStatus?.[crmType];
    if (!status?.isConnected) {
      return { text: 'Disconnected', color: 'text-red-500', bgColor: 'bg-red-100' };
    }
    return { text: 'Connected', color: 'text-green-500', bgColor: 'bg-green-100' };
  };

  if (integrationsLoading || statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">CRM Integrations</h1>
        <p className="text-gray-600">
          Connect your CRM systems to automatically sync leads and track performance
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'hubspot', 'salesforce', 'sync', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'hubspot' && 'HubSpot'}
              {tab === 'salesforce' && 'Salesforce'}
              {tab === 'sync' && 'Lead Sync'}
              {tab === 'settings' && 'Settings'}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Integration Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {integrations?.map((integration) => (
                <div
                  key={integration.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getCRMIcon(integration.id)}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {integration.name}
                        </h3>
                        <p className="text-sm text-gray-500">{integration.description}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      integration.isConnected 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {integration.isConnected ? 'Connected' : 'Disconnected'}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Features:</h4>
                    <ul className="space-y-1">
                      {integration.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6">
                    {integration.isConnected ? (
                      <button
                        onClick={() => setActiveTab(integration.id)}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Manage Integration
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveTab(integration.id)}
                        className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                      >
                        Connect {integration.name}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Sync Status Overview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sync Status Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {syncStatus?.totalSynced || 0}
                  </div>
                  <div className="text-sm text-gray-500">Total Leads Synced</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {syncStatus?.hubspot?.isConnected ? '2' : '1'}
                  </div>
                  <div className="text-sm text-gray-500">Active Integrations</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {leads?.length || 0}
                  </div>
                  <div className="text-sm text-gray-500">Available Leads</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HubSpot Tab */}
        {activeTab === 'hubspot' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <BuildingOfficeIcon className="w-8 h-8 text-orange-500" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">HubSpot Integration</h3>
                    <p className="text-gray-500">Manage your HubSpot CRM connection</p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                  getConnectionStatus('hubspot').bgColor
                } ${getConnectionStatus('hubspot').color}`}>
                  {getConnectionStatus('hubspot').text}
                </div>
              </div>

              {syncStatus?.hubspot?.isConnected ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-gray-700">Last Sync</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {syncStatus.hubspot.lastSync 
                          ? new Date(syncStatus.hubspot.lastSync).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-gray-700">Total Synced</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {syncStatus.hubspot.totalSynced || 0}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setActiveTab('sync')}
                      className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
                    >
                      Sync Leads
                    </button>
                    <button className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors">
                      View Metrics
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CloudIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Connect to HubSpot</h4>
                  <p className="text-gray-500 mb-4">
                    Connect your HubSpot CRM to automatically sync leads and track performance
                  </p>
                  <button className="bg-orange-600 text-white px-6 py-3 rounded-md hover:bg-orange-700 transition-colors">
                    Connect HubSpot
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Salesforce Tab */}
        {activeTab === 'salesforce' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <CloudIcon className="w-8 h-8 text-blue-500" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Salesforce Integration</h3>
                    <p className="text-gray-500">Manage your Salesforce CRM connection</p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                  getConnectionStatus('salesforce').bgColor
                } ${getConnectionStatus('salesforce').color}`}>
                  {getConnectionStatus('salesforce').text}
                </div>
              </div>

              {syncStatus?.salesforce?.isConnected ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-gray-700">Last Sync</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {syncStatus.salesforce.lastSync 
                          ? new Date(syncStatus.salesforce.lastSync).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-gray-700">Total Synced</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {syncStatus.salesforce.totalSynced || 0}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setActiveTab('sync')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Sync Leads
                    </button>
                    <button className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors">
                      View Metrics
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CloudIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Connect to Salesforce</h4>
                  <p className="text-gray-500 mb-4">
                    Connect your Salesforce CRM to automatically sync leads and track performance
                  </p>
                  <button className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors">
                    Connect Salesforce
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lead Sync Tab */}
        {activeTab === 'sync' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Lead Synchronization</h3>
                  <p className="text-gray-500">Sync your leads to connected CRM systems</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleBulkSync('hubspot')}
                    disabled={!syncStatus?.hubspot?.isConnected || selectedLeads.length === 0}
                    className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Sync to HubSpot
                  </button>
                  <button
                    onClick={() => handleBulkSync('salesforce')}
                    disabled={!syncStatus?.salesforce?.isConnected || selectedLeads.length === 0}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Sync to Salesforce
                  </button>
                </div>
              </div>

              {/* Lead Selection */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    {selectedLeads.length} leads selected
                  </span>
                  <button
                    onClick={() => setSelectedLeads([])}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>

              {/* Leads Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedLeads.length === leads?.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLeads(leads?.map(lead => lead.id) || []);
                            } else {
                              setSelectedLeads([]);
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lead
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leads?.map((lead) => (
                      <tr key={lead.id}>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedLeads.includes(lead.id)}
                            onChange={() => handleLeadSelection(lead.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{lead.title}</div>
                            <div className="text-sm text-gray-500">{lead.email}</div>
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          {lead.company || 'N/A'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            lead.status === 'new' ? 'bg-green-100 text-green-800' :
                            lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                            lead.status === 'qualified' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {syncStatus?.hubspot?.isConnected && (
                              <button
                                onClick={() => handleSyncLead(lead.id, 'hubspot')}
                                className="text-orange-600 hover:text-orange-900"
                              >
                                HubSpot
                              </button>
                            )}
                            {syncStatus?.salesforce?.isConnected && (
                              <button
                                onClick={() => handleSyncLead(lead.id, 'salesforce')}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Salesforce
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">CRM Integration Settings</h3>
              
              <div className="space-y-6">
                {/* Auto-sync Settings */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">Auto-sync Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">HubSpot Auto-sync</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">Salesforce Auto-sync</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Sync Frequency */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">Sync Frequency</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        HubSpot Sync Interval
                      </label>
                      <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="hourly">Hourly</option>
                        <option value="daily" selected>Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="manual">Manual Only</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Salesforce Sync Interval
                      </label>
                      <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="manual" selected>Manual Only</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Field Mapping */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">Field Mapping</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-3">
                      Configure how lead fields map to CRM fields
                    </p>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                      Configure Field Mapping
                    </button>
                  </div>
                </div>

                {/* Error Handling */}
                <div>
                  <h4 className="text-md font-medium text-gray-700 mb-3">Error Handling</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">Retry Failed Syncs</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">Email Notifications</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRMIntegrationInterface;
