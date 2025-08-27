import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  TagIcon,
  UserGroupIcon,
  ChartBarIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ViewColumnsIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import ColumnManager from './ColumnManager';

const Leads = () => {
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    industry: '',
    group: '',
    search: '',
    tags: []
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [showColumnManager, setShowColumnManager] = useState(false);

  const queryClient = useQueryClient();

  // Fetch leads with filters
  const { data: leadsData, isLoading, error } = useQuery(
    ['leads', filters, sortBy, sortOrder, currentPage],
    async () => {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        sortBy,
        sortOrder,
        ...filters
      });

      console.log('Fetching leads with params:', params.toString());
      const response = await axios.get(`/api/leads/auth?${params}`);
      console.log('Leads API response:', response.data);
      return response.data;
    },
    {
      keepPreviousData: true,
      onError: (error) => {
        console.error('Leads fetch error:', error);
      }
    }
  );

  // Fetch lead statistics
  const { data: statsData } = useQuery(
    ['leadStats'],
    async () => {
      const response = await axios.get('/api/leads/stats/overview');
      return response.data;
    }
  );

  // Fetch available groups
  const { data: groupsData } = useQuery(
    ['leadGroups'],
    async () => {
      const response = await axios.get('/api/leads/groups');
      return response.data;
    }
  );

  // Fetch visible columns for dynamic table
  const { data: columnsData } = useQuery(
    ['visibleColumns'],
    async () => {
      const response = await axios.get('/api/columns/visible');
      return response.data;
    }
  );



  // Mutations
  const createLeadMutation = useMutation(
    async (leadData) => {
      const response = await axios.post('/api/leads', leadData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['leads']);
        queryClient.invalidateQueries(['leadStats']);
        toast.success('Lead created successfully');
        setShowCreateModal(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create lead');
      }
    }
  );

  const updateLeadMutation = useMutation(
    async ({ id, data }) => {
      const response = await axios.put(`/api/leads/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['leads']);
        queryClient.invalidateQueries(['leadStats']);
        toast.success('Lead updated successfully');
        setShowEditModal(false);
        setEditingLead(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update lead');
      }
    }
  );

  const deleteLeadMutation = useMutation(
    async (id) => {
      await axios.delete(`/api/leads/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['leads']);
        queryClient.invalidateQueries(['leadStats']);
        toast.success('Lead deleted successfully');
        setSelectedLeads([]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to delete lead');
      }
    }
  );

  const bulkUpdateMutation = useMutation(
    async ({ leadIds, updates }) => {
      const response = await axios.post('/api/leads/bulk-update', {
        leadIds,
        updates
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['leads']);
        queryClient.invalidateQueries(['leadStats']);
        toast.success('Leads updated successfully');
        setSelectedLeads([]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update leads');
      }
    }
  );

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Handle search
  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
    setCurrentPage(1);
  };

  // Handle lead selection
  const handleLeadSelection = (leadId) => {
    setSelectedLeads(prev => 
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  // Handle bulk selection
  const handleSelectAll = () => {
    if (selectedLeads.length === leadsData?.leads?.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(leadsData?.leads?.map(lead => lead.id) || []);
    }
  };

  // Handle bulk status update
  const handleBulkStatusUpdate = (status) => {
    if (selectedLeads.length === 0) return;
    
    bulkUpdateMutation.mutate({
      leadIds: selectedLeads,
      updates: { status }
    });
  };

  // Handle bulk priority update
  const handleBulkPriorityUpdate = (priority) => {
    if (selectedLeads.length === 0) return;
    
    bulkUpdateMutation.mutate({
      leadIds: selectedLeads,
      updates: { priority }
    });
  };

  // Handle bulk group update
  const handleBulkGroupUpdate = () => {
    if (selectedLeads.length === 0 || !groupName.trim()) return;
    
    bulkUpdateMutation.mutate({
      leadIds: selectedLeads,
      updates: { group: groupName.trim() }
    });
    setGroupName('');
    setShowGroupModal(false);
  };

  // Handle lead editing
  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setShowEditModal(true);
  };

  // Handle lead deletion
  const handleDeleteLead = (leadId) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      deleteLeadMutation.mutate(leadId);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-green-100 text-green-800',
      proposal: 'bg-purple-100 text-purple-800',
      won: 'bg-emerald-100 text-emerald-800',
      lost: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.new;
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors.medium;
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Error loading leads: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600">Manage and organize your leads</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowColumnManager(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ViewColumnsIcon className="h-4 w-4 mr-2" />
            Columns
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Lead
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Leads</dt>
                    <dd className="text-lg font-medium text-gray-900">{statsData.stats.totalLeads}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Qualified</dt>
                    <dd className="text-lg font-medium text-gray-900">{statsData.stats.leadsByStatus.qualified || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TagIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">New</dt>
                    <dd className="text-lg font-medium text-gray-900">{statsData.stats.leadsByStatus.new || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Groups</dt>
                    <dd className="text-lg font-medium text-gray-900">{groupsData?.groups?.length || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search leads..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
              {showFilters ? (
                <ChevronUpIcon className="h-4 w-4 ml-2" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 ml-2" />
              )}
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="archived">Archived</option>
              </select>

              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>

              <select
                value={filters.industry}
                onChange={(e) => handleFilterChange('industry', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">All Industries</option>
                <option value="hotel">Hotel</option>
                <option value="construction">Construction</option>
                <option value="software">Software</option>
                <option value="healthcare">Healthcare</option>
                <option value="education">Education</option>
              </select>

              <select
                value={filters.group}
                onChange={(e) => handleFilterChange('group', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">All Groups</option>
                {groupsData?.groups?.map(group => (
                  <option key={group.group} value={group.group}>
                    {group.group} ({group.count})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedLeads.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-800">
                {selectedLeads.length} lead(s) selected
              </span>
              
              <select
                onChange={(e) => handleBulkStatusUpdate(e.target.value)}
                className="block px-3 py-1 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Update Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="archived">Archived</option>
              </select>

              <select
                onChange={(e) => handleBulkPriorityUpdate(e.target.value)}
                className="block px-3 py-1 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Update Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>

              <button
                onClick={() => setShowGroupModal(true)}
                className="inline-flex items-center px-3 py-1 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <TagIcon className="h-4 w-4 mr-1" />
                Group
              </button>
            </div>

            <button
              onClick={() => setSelectedLeads([])}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Lead List</h3>
            <div className="flex items-center space-x-4">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="block px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="createdAt">Date Created</option>
                <option value="title">Title</option>
                <option value="company">Company</option>
                <option value="status">Status</option>
                <option value="priority">Priority</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {sortOrder === 'ASC' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="px-4 py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading leads...</p>
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error Loading Leads
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error?.response?.data?.error || error?.message || 'Failed to load leads'}</p>
                    {error?.response?.status === 401 && (
                      <p className="mt-2">
                        <strong>Solution:</strong> Please log out and log back in to refresh your authentication token.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>


            {leadsData?.leads?.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="bg-gray-50 border border-gray-200 rounded-md p-8">
                  <p className="text-gray-600">No leads found. Start by running a scraping job!</p>
                </div>
              </div>
            ) : (
          <>
            {/* Bulk Actions */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedLeads.length === leadsData?.leads?.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900">Select All</span>
                </label>
                <span className="text-sm text-gray-500">
                  {selectedLeads.length} of {leadsData?.leads?.length} selected
                </span>
              </div>

              {selectedLeads.length > 0 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleBulkStatusUpdate}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Update Status
                  </button>
                  <button
                    onClick={handleBulkPriorityUpdate}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Update Priority
                  </button>
                  <button
                    onClick={handleBulkGroupUpdate}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add to Group
                  </button>
                </div>
              )}
            </div>

            {/* Leads List */}
            <div className="space-y-4">
              {leadsData.leads.map((lead, index) => (
                <div key={lead.id} className="bg-white shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={() => handleLeadSelection(lead.id)}
                          className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />

                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-lg font-semibold text-indigo-600">
                              {lead.title?.charAt(0)?.toUpperCase() || (index + 1).toString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {lead.title || 'Untitled Lead'}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                                {lead.status || 'new'}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(lead.priority)}`}>
                                {lead.priority || 'medium'}
                              </span>
                            </div>
                          </div>

                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                            {lead.description || 'No description available'}
                          </p>

                          {/* Dynamic Fields Grid */}
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Render visible columns dynamically */}
                            {columnsData?.columns
                              ?.filter(column => column.is_visible && !['title', 'description', 'status', 'priority'].includes(column.field_key))
                              ?.slice(0, 6) // Limit to 6 fields for card layout
                              ?.map(column => {
                                const value = lead[column.field_key] || lead.custom_fields?.[column.field_key];
                                return (
                                  <div key={column.id}>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{column.name}</p>
                                    <p className="mt-1 text-sm text-gray-900">
                                      {renderCellValue(value, column.data_type)}
                                    </p>
                                  </div>
                                );
                              })}

                            {/* Always show source and URL if not already included */}
                            {!columnsData?.columns?.some(col => col.field_key === 'source' && col.is_visible) && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Source</p>
                                <p className="mt-1 text-sm text-gray-900">
                                  {lead.source?.name || 'Unknown'}
                                  {lead.url && (
                                    <a
                                      href={lead.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-2 text-indigo-600 hover:text-indigo-500"
                                    >
                                      (View)
                                    </a>
                                  )}
                                </p>
                              </div>
                            )}

                            {/* Show URL separately if columns don't include it */}
                            {lead.url && !columnsData?.columns?.some(col => col.field_key === 'url' && col.is_visible) && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Article URL</p>
                                <p className="mt-1 text-sm text-gray-900">
                                  <a
                                    href={lead.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:text-indigo-500 underline"
                                  >
                                    View Article
                                  </a>
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center space-x-4">
                              <span>Group: {lead.group || 'None'}</span>
                              <span>•</span>
                              <span>Created: {new Date(lead.createdAt).toLocaleDateString()}</span>
                              {lead.published_at && (
                                <>
                                  <span>•</span>
                                  <span>Published: {new Date(lead.published_at).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEditLead(lead)}
                                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteLead(lead.id)}
                                className="text-red-600 hover:text-red-900 text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            </div>

            {/* Pagination */}
            {leadsData.pagination && leadsData.pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((leadsData.pagination.currentPage - 1) * leadsData.pagination.limit) + 1} to{' '}
                  {Math.min(leadsData.pagination.currentPage * leadsData.pagination.limit, leadsData.pagination.totalItems)} of{' '}
                  {leadsData.pagination.totalItems} results
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(leadsData.pagination.currentPage - 1)}
                    disabled={!leadsData.pagination.hasPrevPage}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  <span className="px-3 py-2 text-sm font-medium text-gray-900 bg-gray-100 border border-gray-300 rounded-md">
                    {leadsData.pagination.currentPage} of {leadsData.pagination.totalPages}
                  </span>

                  <button
                    onClick={() => handlePageChange(leadsData.pagination.currentPage + 1)}
                    disabled={!leadsData.pagination.hasNextPage}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Lead Modal */}
      {showCreateModal && (
        <CreateLeadModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={createLeadMutation.mutate}
          isLoading={createLeadMutation.isLoading}
        />
      )}

      {/* Edit Lead Modal */}
      {showEditModal && editingLead && (
        <EditLeadModal
          lead={editingLead}
          onClose={() => {
            setShowEditModal(false);
            setEditingLead(null);
          }}
          onSubmit={(data) => updateLeadMutation.mutate({ id: editingLead.id, data })}
          isLoading={updateLeadMutation.isLoading}
        />
      )}

      {/* Group Modal */}
      {showGroupModal && (
        <GroupModal
          groupName={groupName}
          setGroupName={setGroupName}
          onClose={() => setShowGroupModal(false)}
          onSubmit={handleBulkGroupUpdate}
        />
      )}

      {/* Column Manager */}
      <ColumnManager
        isOpen={showColumnManager}
        onClose={() => setShowColumnManager(false)}
      />
    </div>
  );
};

// Helper function to render cell values based on data type
const renderCellValue = (value, dataType) => {
  if (value === null || value === undefined || value === 'Unknown') {
    return <span className="text-gray-400 italic">Not available</span>;
  }

  switch (dataType) {
    case 'currency':
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(numValue);
      }
      return value;

    case 'number':
      const parsed = parseFloat(value);
      return !isNaN(parsed) ? parsed.toLocaleString() : value;

    case 'date':
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return value;
      }

    case 'boolean':
      return value === true || value === 'true' ?
        <span className="text-green-600 font-medium">Yes</span> :
        <span className="text-red-600 font-medium">No</span>;

    case 'url':
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          {value.length > 30 ? value.substring(0, 30) + '...' : value}
        </a>
      );

    case 'email':
      return (
        <a
          href={`mailto:${value}`}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          {value}
        </a>
      );

    default:
      return String(value);
  }
};

// Create Lead Modal Component
const CreateLeadModal = ({ onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectType: '',
    location: '',
    budget: '',
    timeline: '',
    company: '',
    contactInfo: '',
    industry: '',
    keywords: '',
    status: 'new',
    priority: 'medium',
    group: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k)
    };
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Lead</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Lead'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Edit Lead Modal Component
const EditLeadModal = ({ lead, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    title: lead.title || '',
    description: lead.description || '',
    projectType: lead.projectType || '',
    location: lead.location || '',
    budget: lead.budget || '',
    timeline: lead.timeline || '',
    company: lead.company || '',
    contactInfo: lead.contactInfo || '',
    industry: lead.industry || '',
    keywords: lead.keywords?.join(', ') || '',
    status: lead.status || 'new',
    priority: lead.priority || 'medium',
    group: lead.group || '',
    notes: lead.notes || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k)
    };
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Lead</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : 'Update Lead'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Group Modal Component
const GroupModal = ({ groupName, setGroupName, onClose, onSubmit }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Group Selected Leads</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Group Name</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name..."
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={!groupName.trim()}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                Group Leads
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leads;

