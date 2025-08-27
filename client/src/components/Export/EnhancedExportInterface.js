import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import {
  DocumentArrowDownIcon,
  TableCellsIcon,
  DocumentTextIcon,
  DocumentChartBarIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const EnhancedExportInterface = () => {
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [exportOptions, setExportOptions] = useState({
    format: 'excel',
    columns: [],
    template: 'default',
    filters: {},
    sortBy: 'createdAt',
    sortOrder: 'DESC',
    includeRelations: true
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const queryClient = useQueryClient();

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch available columns and formats
  const { data: exportConfig } = useQuery(
    'exportConfig',
    async () => {
      const response = await axios.get('/api/export/config');
      return response.data;
    }
  );

  // Fetch leads for selection
  const { data: leads } = useQuery(
    'leads',
    async () => {
      const response = await axios.get('/api/leads/auth');
      return response.data;
    }
  );

  // Export mutation
  const exportMutation = useMutation(
    async (exportData) => {
      const response = await axios.post('/api/export/enhanced', exportData, {
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setExportProgress(progress);
            setExportStatus(`Downloading... ${progress}%`);
          }
        }
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        setIsExporting(false);
        setExportProgress(100);
        setExportStatus('Export completed successfully!');
        
        // Trigger download
        const link = document.createElement('a');
        link.href = data.downloadUrl || `/api/export/download/${data.filename}`;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success(`Export completed! ${data.recordCount} records exported`);
        
        // Reset progress
        setTimeout(() => {
          setExportProgress(0);
          setExportStatus('');
        }, 3000);
      },
      onError: (error) => {
        setIsExporting(false);
        setExportStatus('Export failed');
        toast.error(error.response?.data?.error || 'Export failed');
      }
    }
  );

  // Initialize default columns
  useEffect(() => {
    if (exportConfig && !exportOptions.columns.length) {
      setExportOptions(prev => ({
        ...prev,
        columns: exportConfig.defaultColumns || []
      }));
    }
  }, [exportConfig, exportOptions.columns.length]);

  const handleExport = async () => {
    if (selectedLeads.length === 0) {
      toast.error('Please select leads to export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportStatus('Preparing export...');

    const exportData = {
      leadIds: selectedLeads,
      options: exportOptions
    };

    exportMutation.mutate(exportData);
  };

  const handleColumnToggle = (columnId) => {
    setExportOptions(prev => ({
      ...prev,
      columns: prev.columns.includes(columnId)
        ? prev.columns.filter(id => id !== columnId)
        : [...prev.columns, columnId]
    }));
  };

  const handleSelectAllColumns = () => {
    if (exportConfig) {
      setExportOptions(prev => ({
        ...prev,
        columns: exportConfig.availableColumns.map(col => col.id)
      }));
    }
  };

  const handleDeselectAllColumns = () => {
    setExportOptions(prev => ({
      ...prev,
      columns: []
    }));
  };

  const getFormatIcon = (format) => {
    switch (format) {
      case 'excel':
        return <TableCellsIcon className="h-5 w-5" />;
      case 'csv':
        return <DocumentTextIcon className="h-5 w-5" />;
      case 'json':
        return <DocumentTextIcon className="h-5 w-5" />;
      case 'pdf':
        return <DocumentChartBarIcon className="h-5 w-5" />;
      case 'xml':
        return <DocumentTextIcon className="h-5 w-5" />;
      default:
        return <DocumentArrowDownIcon className="h-5 w-5" />;
    }
  };

  const getFormatDescription = (format) => {
    switch (format) {
      case 'excel':
        return 'Microsoft Excel with advanced formatting and templates';
      case 'csv':
        return 'Comma-separated values for spreadsheet import';
      case 'json':
        return 'Structured data format for APIs and data processing';
      case 'pdf':
        return 'Portable document format for sharing and printing';
      case 'xml':
        return 'Extensible markup language for data exchange';
      default:
        return 'Universal format for data export';
    }
  };

  if (!exportConfig) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
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
              <DocumentArrowDownIcon className="h-8 w-8 text-indigo-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Enhanced Export</h1>
                <p className="text-sm text-gray-600">Export your leads with advanced formatting and options</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Export Options */}
          <div className="lg:col-span-2 space-y-6">
            {/* Format Selection */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Export Format</h3>
                <p className="text-sm text-gray-600">Choose your preferred export format</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {exportConfig.formats?.map((format) => (
                    <button
                      key={format.value}
                      onClick={() => setExportOptions(prev => ({ ...prev, format: format.value }))}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        exportOptions.format === format.value
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center mb-2">
                        {getFormatIcon(format.value)}
                        <span className="ml-2 font-medium text-gray-900">{format.label}</span>
                      </div>
                      <p className="text-sm text-gray-600">{format.description}</p>
                      {format.features && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 font-medium">Features:</p>
                          <ul className="text-xs text-gray-600 mt-1">
                            {format.features.slice(0, 2).map((feature, index) => (
                              <li key={index}>• {feature}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Column Selection */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Export Columns</h3>
                    <p className="text-sm text-gray-600">Select which fields to include in your export</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSelectAllColumns}
                      className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleDeselectAllColumns}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {exportConfig.availableColumns?.map((column) => (
                    <label key={column.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportOptions.columns.includes(column.id)}
                        onChange={() => handleColumnToggle(column.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{column.label}</span>
                      <span className="ml-1 text-xs text-gray-500">({column.type})</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <button
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="flex items-center text-lg font-medium text-gray-900"
                >
                  <Cog6ToothIcon className="h-5 w-5 mr-2" />
                  Advanced Options
                  <span className={`ml-auto transform transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
              </div>
              
              {showAdvancedOptions && (
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Template</label>
                      <select
                        value={exportOptions.template}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, template: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="default">Default</option>
                        <option value="professional">Professional</option>
                        <option value="minimal">Minimal</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Sort By</label>
                      <select
                        value={exportOptions.sortBy}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, sortBy: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="createdAt">Created Date</option>
                        <option value="company">Company</option>
                        <option value="status">Status</option>
                        <option value="priority">Priority</option>
                        <option value="budget">Budget</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Sort Order</label>
                      <select
                        value={exportOptions.sortOrder}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, sortOrder: e.target.value }))}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="DESC">Descending</option>
                        <option value="ASC">Ascending</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportOptions.includeRelations}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, includeRelations: e.target.checked }))}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Include related data</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Export Actions & Progress */}
          <div className="space-y-6">
            {/* Lead Selection */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Lead Selection</h3>
                <p className="text-sm text-gray-600">Choose which leads to export</p>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Selected Leads</span>
                  <span className="text-sm font-medium text-gray-900">{selectedLeads.length}</span>
                </div>
                
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedLeads(leads?.map(lead => lead.id) || [])}
                    className="w-full px-3 py-2 text-sm text-indigo-600 border border-indigo-300 rounded-md hover:bg-indigo-50"
                  >
                    Select All Leads
                  </button>
                  
                  <button
                    onClick={() => setSelectedLeads([])}
                    className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Clear Selection
                  </button>
                </div>
                
                {leads && (
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md p-2">
                    {leads.map((lead) => (
                      <label key={lead.id} className="flex items-center py-1">
                        <input
                          type="checkbox"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLeads(prev => [...prev, lead.id]);
                            } else {
                              setSelectedLeads(prev => prev.filter(id => id !== lead.id));
                            }
                          }}
                          className="h-3 w-3 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-xs text-gray-700 truncate">
                          {lead.company || 'Unknown Company'} - {lead.title?.substring(0, 30)}...
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Export Progress */}
            {isExporting && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Export Progress</h3>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Status</span>
                    <span className="text-sm font-medium text-gray-900">{exportStatus}</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    ></div>
                  </div>
                  
                  <div className="text-center">
                    <span className="text-sm font-medium text-gray-900">{exportProgress}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Export Button */}
            <div className="bg-white shadow rounded-lg">
              <div className="p-6">
                <button
                  onClick={handleExport}
                  disabled={isExporting || selectedLeads.length === 0}
                  className={`w-full px-4 py-3 rounded-md font-medium transition-colors ${
                    isExporting || selectedLeads.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  }`}
                >
                  {isExporting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Exporting...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                      Export {selectedLeads.length} Lead{selectedLeads.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </button>
                
                {selectedLeads.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500 text-center">
                    Exporting to {exportOptions.format.toUpperCase()} format
                  </p>
                )}
              </div>
            </div>

            {/* Export Summary */}
            {exportOptions.columns.length > 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Export Summary</h3>
                </div>
                
                <div className="p-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Format:</span>
                    <span className="text-sm font-medium text-gray-900 capitalize">{exportOptions.format}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Columns:</span>
                    <span className="text-sm font-medium text-gray-900">{exportOptions.columns.length}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Template:</span>
                    <span className="text-sm font-medium text-gray-900 capitalize">{exportOptions.template}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Relations:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {exportOptions.includeRelations ? 'Included' : 'Excluded'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedExportInterface;
