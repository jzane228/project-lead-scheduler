import React, { useState } from 'react';
import { XMarkIcon, PlusCircleIcon, EyeIcon, EyeSlashIcon, TrashIcon } from '@heroicons/react/24/outline';

const ColumnManagerModal = ({ 
  customColumns, 
  onUpdateColumn, 
  onRemoveColumn, 
  onToggleVisibility, 
  onAddColumn, 
  onClose 
}) => {
  const [editingColumn, setEditingColumn] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', prompt: '' });

  const handleEdit = (column) => {
    setEditingColumn(column.id);
    setEditForm({ name: column.name, prompt: column.prompt });
  };

  const handleSave = (columnId) => {
    onUpdateColumn(columnId, 'name', editForm.name);
    onUpdateColumn(columnId, 'prompt', editForm.prompt);
    setEditingColumn(null);
    setEditForm({ name: '', prompt: '' });
  };

  const handleCancel = () => {
    setEditingColumn(null);
    setEditForm({ name: '', prompt: '' });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-4xl max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Manage Custom Columns</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Custom columns allow you to extract specific data from leads using AI prompts. 
              These prompts will guide the AI to find and populate the specified information.
            </p>
            
            <button
              onClick={onAddColumn}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusCircleIcon className="h-4 w-4 mr-2" />
              Add New Column
            </button>
          </div>

          <div className="space-y-4">
            {customColumns.map((column) => (
              <div key={column.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => onToggleVisibility(column.id)}
                      className="text-gray-400 hover:text-gray-600"
                      title={column.visible ? 'Hide Column' : 'Show Column'}
                    >
                      {column.visible ? (
                        <EyeIcon className="h-5 w-5" />
                      ) : (
                        <EyeSlashIcon className="h-5 w-5" />
                      )}
                    </button>
                    
                    {editingColumn === column.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Column Name"
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <button
                          onClick={() => handleSave(column.id)}
                          className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">{column.name}</span>
                        <button
                          onClick={() => handleEdit(column)}
                          className="text-indigo-600 hover:text-indigo-900 text-sm"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => onRemoveColumn(column.id)}
                    className="text-red-600 hover:text-red-900"
                    title="Remove Column"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>

                {editingColumn === column.id ? (
                  <textarea
                    value={editForm.prompt}
                    onChange={(e) => setEditForm(prev => ({ ...prev, prompt: e.target.value }))}
                    placeholder="AI Prompt for data extraction..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                ) : (
                  <div className="text-sm text-gray-600">
                    <strong>AI Prompt:</strong> {column.prompt}
                  </div>
                )}

                <div className="mt-2 text-xs text-gray-500">
                  Status: {column.visible ? 'Visible' : 'Hidden'} • 
                  ID: {column.id}
                </div>
              </div>
            ))}
          </div>

          {customColumns.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No custom columns defined yet.</p>
              <p className="text-sm">Click "Add New Column" to get started.</p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColumnManagerModal;

