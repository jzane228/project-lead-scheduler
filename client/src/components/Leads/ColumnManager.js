import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  XMarkIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';

const ColumnManager = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const queryClient = useQueryClient();

  // Fetch columns
  const { data: columnsData, isLoading } = useQuery(
    ['columns'],
    async () => {
      const response = await axios.get('/api/columns');
      return response.data;
    }
  );

  // Fetch categorized columns
  const { data: categoriesData } = useQuery(
    ['columnCategories'],
    async () => {
      const response = await axios.get('/api/columns/categories');
      return response.data;
    }
  );

  // Toggle column visibility
  const toggleVisibilityMutation = useMutation(
    async (columnId) => {
      const response = await axios.post(`/api/columns/${columnId}/toggle`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['columns']);
        queryClient.invalidateQueries(['columnCategories']);
        toast.success('Column visibility updated');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update column');
      }
    }
  );

  // Delete column
  const deleteColumnMutation = useMutation(
    async (columnId) => {
      await axios.delete(`/api/columns/${columnId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['columns']);
        queryClient.invalidateQueries(['columnCategories']);
        toast.success('Column deleted successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to delete column');
      }
    }
  );

  // Initialize default columns
  const initializeColumnsMutation = useMutation(
    async () => {
      const response = await axios.post('/api/columns/initialize');
      return response.data;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['columns']);
        queryClient.invalidateQueries(['columnCategories']);
        toast.success(`Created ${data.total} default columns`);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to initialize columns');
      }
    }
  );

  const handleToggleVisibility = (columnId) => {
    toggleVisibilityMutation.mutate(columnId);
  };

  const handleDeleteColumn = (column) => {
    if (column.is_system) {
      toast.error('System columns cannot be deleted');
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${column.name}"? This action cannot be undone.`)) {
      deleteColumnMutation.mutate(column.id);
    }
  };

  const handleInitializeColumns = () => {
    if (window.confirm('This will create default columns for your account. Continue?')) {
      initializeColumnsMutation.mutate();
    }
  };

  const getColumnsForTab = () => {
    if (!columnsData?.columns) return [];

    switch (activeTab) {
      case 'visible':
        return columnsData.columns.filter(col => col.is_visible);
      case 'hidden':
        return columnsData.columns.filter(col => !col.is_visible);
      case 'system':
        return columnsData.columns.filter(col => col.is_system);
      case 'custom':
        return columnsData.columns.filter(col => !col.is_system);
      default:
        return columnsData.columns;
    }
  };

  const getDataTypeColor = (dataType) => {
    const colors = {
      text: 'bg-gray-100 text-gray-800',
      number: 'bg-blue-100 text-blue-800',
      currency: 'bg-green-100 text-green-800',
      date: 'bg-purple-100 text-purple-800',
      boolean: 'bg-yellow-100 text-yellow-800',
      url: 'bg-indigo-100 text-indigo-800',
      email: 'bg-pink-100 text-pink-800',
      phone: 'bg-red-100 text-red-800'
    };
    return colors[dataType] || colors.text;
  };

  const getCategoryColor = (category) => {
    const colors = {
      contact: 'bg-blue-100 text-blue-800',
      project: 'bg-green-100 text-green-800',
      company: 'bg-purple-100 text-purple-800',
      location: 'bg-yellow-100 text-yellow-800',
      financial: 'bg-red-100 text-red-800',
      timeline: 'bg-indigo-100 text-indigo-800',
      custom: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.custom;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Column Manager</h2>
            <p className="text-sm text-gray-600">Manage which columns appear in your leads table</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleInitializeColumns}
              className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
            >
              Add Default Columns
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Column
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b bg-gray-50">
          <div className="px-6">
            <nav className="flex space-x-8">
              {[
                { key: 'all', label: 'All Columns', count: columnsData?.total || 0 },
                { key: 'visible', label: 'Visible', count: columnsData?.columns?.filter(c => c.is_visible).length || 0 },
                { key: 'hidden', label: 'Hidden', count: columnsData?.columns?.filter(c => !c.is_visible).length || 0 },
                { key: 'system', label: 'System', count: columnsData?.columns?.filter(c => c.is_system).length || 0 },
                { key: 'custom', label: 'Custom', count: columnsData?.columns?.filter(c => !c.is_system).length || 0 }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {getColumnsForTab().map((column) => (
                <div key={column.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Visibility Toggle */}
                    <button
                      onClick={() => handleToggleVisibility(column.id)}
                      className={`p-1 rounded-md ${
                        column.is_visible
                          ? 'text-green-600 hover:text-green-700'
                          : 'text-gray-400 hover:text-gray-500'
                      }`}
                    >
                      {column.is_visible ? (
                        <EyeIcon className="h-5 w-5" />
                      ) : (
                        <EyeSlashIcon className="h-5 w-5" />
                      )}
                    </button>

                    {/* Column Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900">{column.name}</h3>
                        {column.is_system && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            System
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{column.description}</p>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getDataTypeColor(column.data_type)}`}>
                          {column.data_type}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(column.category)}`}>
                          {column.category.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {!column.is_system && (
                      <>
                        <button
                          onClick={() => setEditingColumn(column)}
                          className="p-2 text-gray-400 hover:text-blue-600"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteColumn(column)}
                          className="p-2 text-gray-400 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {getColumnsForTab().length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {activeTab === 'all' ? 'No columns found.' : `No ${activeTab} columns found.`}
                  </p>
                  {activeTab === 'all' && (
                    <button
                      onClick={handleInitializeColumns}
                      className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Create default columns
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {columnsData?.columns?.filter(c => c.is_visible).length || 0} of {columnsData?.total || 0} columns visible
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit Column Modal */}
      {(showCreateModal || editingColumn) && (
        <ColumnFormModal
          column={editingColumn}
          onClose={() => {
            setShowCreateModal(false);
            setEditingColumn(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries(['columns']);
            queryClient.invalidateQueries(['columnCategories']);
            setShowCreateModal(false);
            setEditingColumn(null);
          }}
        />
      )}
    </div>
  );
};

// Column Form Modal Component
const ColumnFormModal = ({ column, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: column?.name || '',
    field_key: column?.field_key || '',
    description: column?.description || '',
    data_type: column?.data_type || 'text',
    category: column?.category || 'custom',
    is_visible: column?.is_visible !== undefined ? column.is_visible : true,
    ai_prompt_template: column?.ai_prompt_template || '',
    validation_rules: column?.validation_rules || {},
    default_value: column?.default_value || ''
  });

  const queryClient = useQueryClient();

  const createColumnMutation = useMutation(
    async (data) => {
      const response = await axios.post('/api/columns', data);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Column created successfully');
        onSuccess();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create column');
      }
    }
  );

  const updateColumnMutation = useMutation(
    async ({ id, data }) => {
      const response = await axios.put(`/api/columns/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Column updated successfully');
        onSuccess();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update column');
      }
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();

    if (column) {
      updateColumnMutation.mutate({ id: column.id, data: formData });
    } else {
      createColumnMutation.mutate(formData);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const generateFieldKey = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    const fieldKey = generateFieldKey(name);
    setFormData(prev => ({
      ...prev,
      name,
      field_key: prev.field_key || fieldKey
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-medium text-gray-900">
              {column ? 'Edit Column' : 'Create New Column'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-96">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Column Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleNameChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., CEO Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Field Key *
                </label>
                <input
                  type="text"
                  name="field_key"
                  value={formData.field_key}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., ceo_name"
                />
                <p className="text-xs text-gray-500 mt-1">Unique identifier for this column</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what to extract from articles (e.g., 'Name of the CEO or executive mentioned in the article')"
              />
              <p className="text-xs text-gray-500 mt-1">This description will be used by AI to extract data from articles</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Type
                </label>
                <select
                  name="data_type"
                  value={formData.data_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="currency">Currency</option>
                  <option value="date">Date</option>
                  <option value="boolean">Boolean</option>
                  <option value="url">URL</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="contact">Contact</option>
                  <option value="project">Project</option>
                  <option value="company">Company</option>
                  <option value="location">Location</option>
                  <option value="financial">Financial</option>
                  <option value="timeline">Timeline</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_visible"
                checked={formData.is_visible}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Visible by default
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom AI Prompt Template (Optional)
              </label>
              <textarea
                name="ai_prompt_template"
                value={formData.ai_prompt_template}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Custom prompt for AI extraction (leave blank to use default)"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 bg-gray-50 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createColumnMutation.isLoading || updateColumnMutation.isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {createColumnMutation.isLoading || updateColumnMutation.isLoading
                ? 'Saving...'
                : (column ? 'Update Column' : 'Create Column')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ColumnManager;

