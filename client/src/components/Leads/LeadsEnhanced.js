import React, { useState, useEffect } from 'react';
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
  Cog6ToothIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

// Import modal components
import CreateLeadModal from './CreateLeadModal';
import EditLeadModal from './EditLeadModal';
import GroupModal from './GroupModal';
import ColumnManagerModal from './ColumnManagerModal';

const LeadsEnhanced = () => {
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
  const [customColumns, setCustomColumns] = useState([
    { id: 'roomCount', name: 'Room Count', prompt: 'Extract the number of hotel rooms mentioned', visible: true },
    { id: 'squareFootage', name: 'Square Footage', prompt: 'Find the total square footage or area mentioned', visible: true },
    { id: 'budget', name: 'Budget', prompt: 'Extract the project budget or cost mentioned', visible: true },
    { id: 'timeline', name: 'Timeline', prompt: 'Find the project timeline or completion date', visible: true }
  ]);

  const queryClient = useQueryClient();

  // Fetch leads with filters
  const { data: leadsData, isLoading, error } = useQuery(
    ['leads', filters, sortBy, sortOrder, currentPage],
    async () => {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 50,
        sortBy,
        sortOrder,
        ...filters
      });
      
      const response = await axios.get(`/api/leads/auth?${params}`);
      return response.data;
    },
    {
      keepPreviousData: true
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

  // Load custom columns from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('customColumns');
    if (saved) {
      setCustomColumns(JSON.parse(saved));
    }
  }, []);

  // Save custom columns to localStorage
  useEffect(() => {
    localStorage.setItem('customColumns', JSON.stringify(customColumns));
  }, [customColumns]);

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
      onSuccess: (data, variables, context) => {
        // Only show individual success message if not part of bulk delete
        if (!context?.isBulkDelete) {
          queryClient.invalidateQueries(['leads']);
          queryClient.invalidateQueries(['leadStats']);
          toast.success('Lead deleted successfully');
          setSelectedLeads([]);
        }
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

  // Handle opening source URL
  const handleOpenSource = (url) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Handle custom column management
  const addCustomColumn = () => {
    const newColumn = {
      id: `custom_${Date.now()}`,
      name: '',
      prompt: '',
      visible: true
    };
    setCustomColumns([...customColumns, newColumn]);
  };

  const updateCustomColumn = (id, field, value) => {
    setCustomColumns(prev => 
      prev.map(col => 
        col.id === id ? { ...col, [field]: value } : col
      )
    );
  };

  const removeCustomColumn = (id) => {
    setCustomColumns(prev => prev.filter(col => col.id !== id));
  };

  const toggleColumnVisibility = (id) => {
    setCustomColumns(prev => 
      prev.map(col => 
        col.id === id ? { ...col, visible: !col.visible } : col
      )
    );
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

  // Get custom field value
  const getCustomFieldValue = (lead, columnId) => {
    if (!lead.custom_fields) return 'N/A';
    return lead.custom_fields[columnId] || 'N/A';
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
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Cog6ToothIcon className="h-4 w-4 mr-2" />
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
              
                                <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete ${selectedLeads.length} lead(s)?`)) {
                        // Delete all leads and show single success message
                        Promise.all(selectedLeads.map(id => deleteLeadMutation.mutate(id, { context: { isBulkDelete: true } })))
                          .then(() => {
                            queryClient.invalidateQueries(['leads']);
                            queryClient.invalidateQueries(['leadStats']);
                            toast.success(`${selectedLeads.length} lead(s) deleted successfully`);
                            setSelectedLeads([]);
                          })
                          .catch(() => {
                            toast.error('Some leads failed to delete');
                          });
                      }
                    }}
                    className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Delete All
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
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedLeads.length === leadsData?.leads?.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Group
                  </th>
                  {customColumns.filter(col => col.visible).map(column => (
                    <th key={column.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {column.name}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leadsData?.leads?.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => handleLeadSelection(lead.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-indigo-600">
                              {lead.title.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {lead.title}
                          </div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {lead.description?.substring(0, 100)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lead.company || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{lead.location || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(lead.priority)}`}>
                        {lead.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lead.group || 'Ungrouped'}</div>
                    </td>
                    {customColumns.filter(col => col.visible).map(column => (
                      <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getCustomFieldValue(lead, column.id)}
                        </div>
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {lead.sourceUrl ? (
                        <button
                          onClick={() => handleOpenSource(lead.sourceUrl)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-100 rounded-md hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <ArrowTopRightOnSquareIcon className="h-3 w-3 mr-1" />
                          View Source
                        </button>
                      ) : (
                        <span className="text-sm text-gray-500">No URL</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lead.lead_source?.name || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{lead.lead_source?.type || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditLead(lead)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit Lead"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Lead"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {leadsData?.pagination && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!leadsData.pagination.hasPrevPage}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!leadsData.pagination.hasNextPage}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">{(currentPage - 1) * 50 + 1}</span>
                  {' '}to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * 50, leadsData.pagination.totalItems)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{leadsData.pagination.totalItems}</span>
                  {' '}results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={!leadsData.pagination.hasPrevPage}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!leadsData.pagination.hasNextPage}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Column Manager Modal */}
      {showColumnManager && (
        <ColumnManagerModal
          customColumns={customColumns}
          onUpdateColumn={updateCustomColumn}
          onRemoveColumn={removeCustomColumn}
          onToggleVisibility={toggleColumnVisibility}
          onAddColumn={addCustomColumn}
          onClose={() => setShowColumnManager(false)}
        />
      )}

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
    </div>
  );
};

export default LeadsEnhanced;
