import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

const ContactManager = ({ isOpen, onClose, leadId, leadTitle }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Fetch contacts for this lead
  const { data: contactsData, isLoading } = useQuery(
    ['leadContacts', leadId],
    async () => {
      if (!leadId) return { contacts: [], total: 0 };
      const response = await axios.get(`/api/contacts/lead/${leadId}`);
      return response.data;
    },
    {
      enabled: !!leadId
    }
  );

  // Search all contacts
  const { data: searchResults } = useQuery(
    ['contactSearch', searchQuery],
    async () => {
      if (!searchQuery || searchQuery.length < 2) return null;
      const response = await axios.get(`/api/contacts/search/${encodeURIComponent(searchQuery)}`);
      return response.data;
    },
    {
      enabled: searchQuery.length >= 2
    }
  );

  // Create contact
  const createContactMutation = useMutation(
    async (contactData) => {
      const response = await axios.post('/api/contacts', {
        ...contactData,
        lead_id: leadId
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['leadContacts', leadId]);
        toast.success('Contact created successfully');
        setShowCreateModal(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create contact');
      }
    }
  );

  // Update contact
  const updateContactMutation = useMutation(
    async ({ id, data }) => {
      const response = await axios.put(`/api/contacts/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['leadContacts', leadId]);
        toast.success('Contact updated successfully');
        setEditingContact(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update contact');
      }
    }
  );

  // Delete contact
  const deleteContactMutation = useMutation(
    async (contactId) => {
      await axios.delete(`/api/contacts/${contactId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['leadContacts', leadId]);
        toast.success('Contact deleted successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to delete contact');
      }
    }
  );

  // Verify contact
  const verifyContactMutation = useMutation(
    async (contactId) => {
      const response = await axios.post(`/api/contacts/${contactId}/verify`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['leadContacts', leadId]);
        toast.success('Contact verified successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to verify contact');
      }
    }
  );

  const handleDeleteContact = (contact) => {
    if (window.confirm(`Are you sure you want to delete "${contact.getDisplayName()}"?`)) {
      deleteContactMutation.mutate(contact.id);
    }
  };

  const handleVerifyContact = (contact) => {
    verifyContactMutation.mutate(contact.id);
  };

  const getContactsForTab = () => {
    if (!contactsData?.contacts) return [];

    switch (activeTab) {
      case 'verified':
        return contactsData.contacts.filter(contact => contact.is_verified);
      case 'with-info':
        return contactsData.contacts.filter(contact => contact.hasContactInfo?.() || contact.email || contact.phone);
      case 'primary':
        return contactsData.contacts.filter(contact => contact.contact_type === 'primary');
      case 'executive':
        return contactsData.contacts.filter(contact => ['executive', 'primary'].includes(contact.contact_type));
      default:
        return contactsData.contacts;
    }
  };

  const getContactTypeColor = (contactType) => {
    const colors = {
      primary: 'bg-green-100 text-green-800',
      secondary: 'bg-blue-100 text-blue-800',
      executive: 'bg-purple-100 text-purple-800',
      representative: 'bg-yellow-100 text-yellow-800',
      media: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[contactType] || colors.other;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Contact Manager</h2>
            <p className="text-sm text-gray-600">
              {leadTitle ? `Contacts for: ${leadTitle}` : 'Manage contacts'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Contact
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search all contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          {searchResults && (
            <div className="mt-2">
              <p className="text-sm text-gray-600">
                Found {searchResults.total} contacts matching "{searchResults.query}"
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b bg-gray-50">
          <div className="px-6">
            <nav className="flex space-x-8">
              {[
                { key: 'all', label: 'All Contacts', count: contactsData?.total || 0 },
                { key: 'with-info', label: 'With Contact Info', count: contactsData?.contacts?.filter(c => c.email || c.phone || c.linkedin_url || c.twitter_handle).length || 0 },
                { key: 'verified', label: 'Verified', count: contactsData?.contacts?.filter(c => c.is_verified).length || 0 },
                { key: 'primary', label: 'Primary', count: contactsData?.contacts?.filter(c => c.contact_type === 'primary').length || 0 },
                { key: 'executive', label: 'Executive', count: contactsData?.contacts?.filter(c => ['executive', 'primary'].includes(c.contact_type)).length || 0 }
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
              {/* Search Results */}
              {searchResults && searchResults.contacts.map((contact) => (
                <div key={`search-${contact.id}`} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <UserGroupIcon className="h-8 w-8 text-blue-500" />
                      <div>
                        <h3 className="font-medium text-gray-900">{contact.getDisplayName()}</h3>
                        <p className="text-sm text-blue-600">{contact.lead?.title}</p>
                        <p className="text-sm text-gray-600">{contact.company}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="text-blue-600 hover:text-blue-800">
                          <EnvelopeIcon className="h-5 w-5" />
                        </a>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="text-blue-600 hover:text-blue-800">
                          <PhoneIcon className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Lead Contacts */}
              {getContactsForTab().map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Contact Avatar */}
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {contact.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900">{contact.getDisplayName()}</h3>
                        {contact.is_verified && (
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getContactTypeColor(contact.contact_type)}`}>
                          {contact.contact_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{contact.company}</p>
                      <div className="flex items-center space-x-4 text-sm">
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="flex items-center text-blue-600 hover:text-blue-800">
                            <EnvelopeIcon className="h-4 w-4 mr-1" />
                            {contact.email}
                          </a>
                        )}
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="flex items-center text-blue-600 hover:text-blue-800">
                            <PhoneIcon className="h-4 w-4 mr-1" />
                            {contact.phone}
                          </a>
                        )}
                        {contact.linkedin_url && (
                          <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:text-blue-800">
                            <GlobeAltIcon className="h-4 w-4 mr-1" />
                            LinkedIn
                          </a>
                        )}
                      </div>
                      {contact.confidence_score && (
                        <p className="text-xs text-gray-500 mt-1">
                          Confidence: {Math.round(contact.confidence_score * 100)}%
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {!contact.is_verified && (
                      <button
                        onClick={() => handleVerifyContact(contact)}
                        className="p-2 text-gray-400 hover:text-green-600"
                        title="Mark as verified"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setEditingContact(contact)}
                      className="p-2 text-gray-400 hover:text-blue-600"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteContact(contact)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {getContactsForTab().length === 0 && !searchResults && (
                <div className="text-center py-8">
                  <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {activeTab === 'all' ? 'Get started by adding a contact.' : `No ${activeTab} contacts found.`}
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Contact
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {contactsData?.total || 0} contacts total
              {contactsData && (
                <>
                  {' • '}
                  {contactsData.contacts?.filter(c => c.email || c.phone).length || 0} with contact info
                  {' • '}
                  {contactsData.contacts?.filter(c => c.is_verified).length || 0} verified
                </>
              )}
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

      {/* Create/Edit Contact Modal */}
      {(showCreateModal || editingContact) && (
        <ContactFormModal
          contact={editingContact}
          leadId={leadId}
          onClose={() => {
            setShowCreateModal(false);
            setEditingContact(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries(['leadContacts', leadId]);
            setShowCreateModal(false);
            setEditingContact(null);
          }}
        />
      )}
    </div>
  );
};

// Contact Form Modal Component
const ContactFormModal = ({ contact, leadId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: contact?.name || '',
    title: contact?.title || '',
    company: contact?.company || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    linkedin_url: contact?.linkedin_url || '',
    twitter_handle: contact?.twitter_handle || '',
    contact_type: contact?.contact_type || 'representative',
    notes: contact?.notes || ''
  });

  const queryClient = useQueryClient();

  const createContactMutation = useMutation(
    async (data) => {
      const response = await axios.post('/api/contacts', {
        ...data,
        lead_id: leadId
      });
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Contact created successfully');
        onSuccess();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create contact');
      }
    }
  );

  const updateContactMutation = useMutation(
    async ({ id, data }) => {
      const response = await axios.put(`/api/contacts/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Contact updated successfully');
        onSuccess();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update contact');
      }
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();

    if (contact) {
      updateContactMutation.mutate({ id: contact.id, data: formData });
    } else {
      createContactMutation.mutate(formData);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-medium text-gray-900">
              {contact ? 'Edit Contact' : 'Create New Contact'}
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
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="CEO, Director, etc."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Company name"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="john@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1-555-123-4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  name="linkedin_url"
                  value={formData.linkedin_url}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://linkedin.com/in/johnsmith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Twitter Handle
                </label>
                <input
                  type="text"
                  name="twitter_handle"
                  value={formData.twitter_handle}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="@johnsmith"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Type
              </label>
              <select
                name="contact_type"
                value={formData.contact_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="primary">Primary Contact</option>
                <option value="secondary">Secondary Contact</option>
                <option value="executive">Executive</option>
                <option value="representative">Representative</option>
                <option value="media">Media Contact</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes about this contact"
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
              disabled={createContactMutation.isLoading || updateContactMutation.isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {createContactMutation.isLoading || updateContactMutation.isLoading
                ? 'Saving...'
                : (contact ? 'Update Contact' : 'Create Contact')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactManager;

