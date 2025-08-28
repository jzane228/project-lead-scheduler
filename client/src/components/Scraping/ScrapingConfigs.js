import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  CogIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import ScrapingProgress from './ScrapingProgress';

const ScrapingConfigs = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [selectedConfigs, setSelectedConfigs] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [filters, setFilters] = useState({ group: '' });
  const [currentScrapingJob, setCurrentScrapingJob] = useState(null);
  const [scrapingProgress, setScrapingProgress] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    industry_type: '',
    keywords: [''],
    sources: ['scrapy', 'google', 'bing', 'news'],
    frequency: 'daily',
    max_results_per_run: 50,
    location: '',
    search_query: '',
    group: '',
    is_active: true
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');

  const queryClient = useQueryClient();

  // Fetch scraping configurations
  const { data: configsData, isLoading, error } = useQuery(
    ['scrapingConfigs'],
    async () => {
      const response = await axios.get('/api/scraping/configs');
      return response.data;
    }
  );

  // Fetch industries for dropdown
  const { data: industriesData } = useQuery(
    ['industries'],
    async () => {
      const response = await axios.get('/api/industries');
      return response.data;
    }
  );

  // Create configuration mutation
  const createConfigMutation = useMutation(
    async (configData) => {
      const response = await axios.post('/api/scraping/configs', configData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['scrapingConfigs']);
        toast.success('Configuration created successfully');
        setShowCreateModal(false);
        resetForm();
        setFieldErrors({});
        setGeneralError('');
      },
      onError: (error) => {
        const errorData = error.response?.data;
        if (errorData?.fieldErrors) {
          // Handle field-specific errors
          const errors = {};
          errorData.fieldErrors.forEach(err => {
            errors[err.field] = err.message;
          });
          setFieldErrors(errors);
          setGeneralError(errorData.message || 'Please fix the highlighted fields below');
        } else {
          // Handle general errors
          setGeneralError(errorData?.error || 'Failed to create configuration');
          setFieldErrors({});
        }
        toast.error(errorData?.error || 'Failed to create configuration');
      }
    }
  );

  // Update configuration mutation
  const updateConfigMutation = useMutation(
    async ({ id, data }) => {
      const response = await axios.put(`/api/scraping/configs/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['scrapingConfigs']);
        toast.success('Configuration updated successfully');
        setShowEditModal(false);
        setEditingConfig(null);
        resetForm();
        setFieldErrors({});
        setGeneralError('');
      },
      onError: (error) => {
        const errorData = error.response?.data;
        if (errorData?.fieldErrors) {
          // Handle field-specific errors
          const errors = {};
          errorData.fieldErrors.forEach(err => {
            errors[err.field] = err.message;
          });
          setFieldErrors(errors);
          setGeneralError(errorData.message || 'Please fix the highlighted fields below');
        } else {
          // Handle general errors
          setGeneralError(errorData?.error || 'Failed to update configuration');
          setFieldErrors({});
        }
        toast.error(errorData?.error || 'Failed to update configuration');
      }
    }
  );

  // Toggle configuration status mutation
  const toggleStatusMutation = useMutation(
    async ({ id, isActive }) => {
      const response = await axios.patch(`/api/scraping/configs/${id}/toggle`, { is_active: isActive });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['scrapingConfigs']);
        toast.success('Configuration status updated');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update status');
      }
    }
  );

  // Delete configuration mutation
  const deleteConfigMutation = useMutation(
    async (id) => {
      await axios.delete(`/api/scraping/configs/${id}`);
    },
    {
      onSuccess: (data, variables, context) => {
        // Only show individual success message if not part of bulk delete
        if (!context?.isBulkDelete) {
          queryClient.invalidateQueries(['scrapingConfigs']);
          toast.success('Configuration deleted successfully');
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to delete configuration');
      }
    }
  );

  // Bulk delete configurations
  const bulkDeleteConfigs = () => {
    if (selectedConfigs.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedConfigs.length} configuration(s)?`)) {
      // Delete all configurations and show single success message
      Promise.all(selectedConfigs.map(id => deleteConfigMutation.mutateAsync(id, { context: { isBulkDelete: true } })))
        .then(() => {
          queryClient.invalidateQueries(['scrapingConfigs']);
          toast.success(`${selectedConfigs.length} configuration(s) deleted successfully`);
          setSelectedConfigs([]);
        })
        .catch(() => {
          toast.error('Some configurations failed to delete');
        });
    }
  };

  // Bulk group update
  const handleBulkGroupUpdate = () => {
    if (selectedConfigs.length === 0 || !groupName.trim()) return;
    
    // Update each selected configuration with the new group
    selectedConfigs.forEach(id => {
      const config = configsData?.configs?.find(c => c.id === id);
      if (config) {
        updateConfigMutation.mutate({
          id,
          data: { ...config, group: groupName.trim() }
        });
      }
    });
    
    setGroupName('');
    setShowGroupModal(false);
    setSelectedConfigs([]);
  };

  // Handle configuration selection
  const handleConfigSelection = (configId) => {
    setSelectedConfigs(prev => 
      prev.includes(configId)
        ? prev.filter(id => id !== configId)
        : [...prev, configId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedConfigs.length === configsData?.configs?.length) {
      setSelectedConfigs([]);
    } else {
      setSelectedConfigs(configsData?.configs?.map(config => config.id) || []);
    }
  };

  // Run configuration mutation
  const runConfigMutation = useMutation(
    async (id) => {
      console.log('🚀 Starting scraping for config:', id);
      const response = await axios.post(`/api/scraping/configs/${id}/run`);
      console.log('✅ Scraping response:', response.data);
      return response.data;
    },
    {
      onSuccess: (data, variables) => {
        console.log('🎉 Scraping started successfully for config:', variables);
        // Use the jobId returned from backend
        const jobId = data.jobId || `config-${variables}-${Date.now()}`;
        setCurrentScrapingJob({ id: variables, jobId });
        setScrapingProgress({
          stage: 'initializing',
          progress: 0,
          total: 1,
          percentage: 0,
          message: 'Starting enhanced scraping...'
        });
        toast.success('Enhanced scraping job started - searching high-quality sources');

        // Start polling for progress updates
        startProgressPolling(jobId);
      },
      onError: (error) => {
        console.error('❌ Scraping failed:', error);
        toast.error(error.response?.data?.error || 'Failed to start scraping job');
        setCurrentScrapingJob(null);
        setScrapingProgress(null);
      }
    }
  );

  // Progress polling function
  const startProgressPolling = (jobId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/scraping/progress/${jobId}`);
        const progressData = response.data;

        setScrapingProgress(progressData);

        // Stop polling when job is completed or has error
        if (progressData.stage === 'completed' || progressData.stage === 'error') {
          clearInterval(pollInterval);
          if (progressData.stage === 'completed') {
            // Refresh leads data after completion
            queryClient.invalidateQueries(['leads']);
            queryClient.invalidateQueries(['scrapingConfigs']);
            toast.success(`Scraping completed! ${progressData.progress} leads saved.`);
          } else if (progressData.stage === 'error') {
            toast.error(`Scraping failed: ${progressData.message}`);
          }
          // Clear current job after a delay
          setTimeout(() => {
            setCurrentScrapingJob(null);
            setScrapingProgress(null);
          }, 3000);
        }
      } catch (error) {
        console.error('Error polling progress:', error);
        // If we can't get progress, stop polling after a few tries
        if (error.response?.status === 404) {
          clearInterval(pollInterval);
          setCurrentScrapingJob(null);
          setScrapingProgress(null);
        }
      }
    }, 2000); // Poll every 2 seconds

    // Clean up polling after 10 minutes (maximum expected job time)
    setTimeout(() => {
      clearInterval(pollInterval);
      if (currentScrapingJob?.jobId === jobId) {
        setCurrentScrapingJob(null);
        setScrapingProgress(null);
        toast.warning('Progress tracking timed out - job may still be running');
      }
    }, 10 * 60 * 1000);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      industry_type: '',
      keywords: [''],
      sources: ['scrapy', 'google', 'bing', 'news'],
      frequency: 'daily',
      max_results_per_run: 50,
      location: '',
      search_query: '',
      is_active: true
    });
    setFieldErrors({});
    setGeneralError('');
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleKeywordsChange = (index, value) => {
    const newKeywords = [...formData.keywords];
    newKeywords[index] = value;
    
    // Add new empty keyword field if this is the last one and it's not empty
    if (index === newKeywords.length - 1 && value && !newKeywords.includes('')) {
      newKeywords.push('');
    }
    
    // Remove empty keywords except the last one
    const filteredKeywords = newKeywords.filter((keyword, i) => 
      keyword || i === newKeywords.length - 1
    );
    
    setFormData(prev => ({ ...prev, keywords: filteredKeywords }));
    
    // Clear keywords error when user starts typing
    if (fieldErrors.keywords) {
      setFieldErrors(prev => ({ ...prev, keywords: '' }));
    }
  };

  const handleSourcesChange = (sources) => {
    setFormData(prev => ({ ...prev, sources }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setFieldErrors({});
    setGeneralError('');
    
    // Filter out empty keywords
    const filteredKeywords = formData.keywords.filter(keyword => keyword.trim());
    
    if (filteredKeywords.length === 0) {
      setFieldErrors(prev => ({ ...prev, keywords: 'At least one keyword is required' }));
      return;
    }

    const submitData = {
      ...formData,
      keywords: filteredKeywords
    };

    if (editingConfig) {
      updateConfigMutation.mutate({ id: editingConfig.id, data: submitData });
    } else {
      createConfigMutation.mutate(submitData);
    }
  };

  const handleEdit = (config) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      description: config.description,
      industry_type: config.industry_type,
      keywords: config.keywords && config.keywords.length > 0 ? config.keywords : [''],
      sources: config.sources && config.sources.length > 0 ? config.sources : ['scrapy', 'google', 'bing', 'news'],
      frequency: config.frequency,
      max_results_per_run: config.max_results_per_run,
      location: config.location,
      search_query: config.search_query,
      group: config.group,
      is_active: config.is_active
    });
    setShowEditModal(true);
  };

  const handleToggleStatus = (config) => {
    toggleStatusMutation.mutate({
      id: config.id,
      isActive: !config.is_active
    });
  };

  const handleRunNow = (config) => {
    if (window.confirm(`Run scraping job for "${config.name}" now?`)) {
      runConfigMutation.mutate(config.id);
    }
  };

  const getFrequencyLabel = (frequency) => {
    const labels = {
      hourly: 'Hourly',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      custom: 'Custom'
    };
    return labels[frequency] || frequency;
  };

  // Helper function to get field error styling
  const getFieldErrorStyle = (fieldName) => {
    return fieldErrors[fieldName] 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500';
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Error loading configurations: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scraping Configurations</h1>
          <p className="text-gray-600">Manage your automated lead scraping jobs</p>
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              🚀 <strong>Enhanced Scraping Service Active:</strong> All scraping jobs now use our advanced technology 
              for high-quality lead generation with AI-powered data extraction.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={filters?.group || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, group: e.target.value }))}
            className="block px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Groups</option>
            {configsData?.configs?.reduce((groups, config) => {
              if (config.group && !groups.includes(config.group)) {
                groups.push(config.group);
              }
              return groups;
            }, []).map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Configuration
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedConfigs.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-800">
                {selectedConfigs.length} configuration(s) selected
              </span>
              
              <button
                onClick={bulkDeleteConfigs}
                className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Delete All
              </button>
              
              <button
                onClick={() => setShowGroupModal(true)}
                className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <TagIcon className="h-4 w-4 mr-1" />
                Group
              </button>
            </div>
            
            <button
              onClick={() => setSelectedConfigs([])}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Scraping Progress */}
      {currentScrapingJob && scrapingProgress && (
        <ScrapingProgress
          jobId={currentScrapingJob.jobId}
          progress={scrapingProgress}
          onComplete={() => {
            setCurrentScrapingJob(null);
            setScrapingProgress(null);
            queryClient.invalidateQueries(['scrapingConfigs']);
            queryClient.invalidateQueries(['leads']);
          }}
        />
      )}

      {/* Configurations List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Active Configurations</h3>
            <div className="flex items-center space-x-4">
              <input
                type="checkbox"
                checked={selectedConfigs.length === configsData?.configs?.length}
                onChange={handleSelectAll}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-600">Select All</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="px-4 py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading configurations...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedConfigs.length === configsData?.configs?.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Configuration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Keywords
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sources
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Run
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {configsData?.configs?.filter(config => 
                  !filters.group || config.group === filters.group
                ).map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedConfigs.includes(config.id)}
                        onChange={() => handleConfigSelection(config.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{config.name}</div>
                        <div className="text-sm text-gray-500">{config.description}</div>
                        {config.group && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {config.group}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {config.keywords?.map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {config.sources?.map((source) => (
                          <span
                            key={source}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                          >
                            {source}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getFrequencyLabel(config.frequency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          config.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {config.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {config.last_run
                        ? new Date(config.last_run).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleRunNow(config)}
                          disabled={runConfigMutation.isLoading}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          <PlayIcon className="h-3 w-3 mr-1" />
                          Run
                        </button>
                        
                        <button
                          onClick={() => handleToggleStatus(config)}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          {config.is_active ? (
                            <>
                              <PauseIcon className="h-3 w-3 mr-1" />
                              Pause
                            </>
                          ) : (
                            <>
                              <PlayIcon className="h-3 w-3 mr-1" />
                              Resume
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleEdit(config)}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <PencilIcon className="h-3 w-3 mr-1" />
                          Edit
                        </button>
                        
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this configuration?')) {
                              deleteConfigMutation.mutate(config.id);
                            }
                          }}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <TrashIcon className="h-3 w-3 mr-1" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingConfig ? 'Edit Configuration' : 'New Configuration'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setEditingConfig(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${getFieldErrorStyle('name')}`}
                      placeholder="Configuration name"
                    />
                    {fieldErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Brief description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Industry Type</label>
                    <select
                      value={formData.industry_type}
                      onChange={(e) => handleInputChange('industry_type', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="">Select Industry</option>
                      {industriesData?.industries?.map((industry) => (
                        <option key={industry.id} value={industry.id}>
                          {industry.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="City, State, or Country"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Search Query</label>
                    <input
                      type="text"
                      value={formData.search_query}
                      onChange={(e) => handleInputChange('search_query', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Custom search query"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Group</label>
                    <input
                      type="text"
                      value={formData.group}
                      onChange={(e) => handleInputChange('group', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Group name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Frequency</label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => handleInputChange('frequency', e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Results Per Run</label>
                    <input
                      type="number"
                      value={formData.max_results_per_run}
                      onChange={(e) => handleInputChange('max_results_per_run', parseInt(e.target.value))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      min="1"
                      max="1000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Keywords</label>
                  <div className="mt-1 space-y-2">
                    {formData.keywords.map((keyword, index) => (
                      <div key={index} className="flex space-x-2">
                        <input
                          type="text"
                          value={keyword}
                          onChange={(e) => handleKeywordsChange(index, e.target.value)}
                          className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${getFieldErrorStyle('keywords')}`}
                          placeholder={`Keyword ${index + 1}`}
                        />
                        {formData.keywords.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newKeywords = formData.keywords.filter((_, i) => i !== index);
                              setFormData(prev => ({ ...prev, keywords: newKeywords }));
                            }}
                            className="px-3 py-2 text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {fieldErrors.keywords && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.keywords}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Sources</label>
                  <div className="mt-1 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {['scrapy', 'google', 'bing', 'news', 'rss'].map((source) => (
                        <label key={source} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.sources.includes(source)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleSourcesChange([...formData.sources, source]);
                              } else {
                                handleSourcesChange(formData.sources.filter(s => s !== source));
                              }
                            }}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700 capitalize">{source}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Enhanced Scraping Service Note: Select multiple sources for comprehensive lead generation. 
                      Scrapy provides high-quality content extraction, while Google/Bing offer broad coverage.
                    </p>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">Active</label>
                </div>

                {generalError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-800">{generalError}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(false);
                      setEditingConfig(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createConfigMutation.isLoading || updateConfigMutation.isLoading}
                    className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {createConfigMutation.isLoading || updateConfigMutation.isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      editingConfig ? 'Update Configuration' : 'Create Configuration'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Update Group</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Group Name</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter group name"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowGroupModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkGroupUpdate}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Update Group
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScrapingConfigs;
