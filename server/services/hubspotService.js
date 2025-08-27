const axios = require('axios');
const { Lead, User } = require('../models');

class HubSpotService {
  constructor() {
    this.baseURL = 'https://api.hubapi.com';
    this.apiKey = process.env.HUBSPOT_API_KEY;
    this.accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
    this.portalId = process.env.HUBSPOT_PORTAL_ID;
  }

  // ===== AUTHENTICATION & SETUP =====

  async authenticate() {
    try {
      if (!this.apiKey && !this.accessToken) {
        throw new Error('HubSpot API key or access token not configured');
      }

      // Test authentication
      const response = await this.makeRequest('GET', '/crm/v3/objects/contacts');
      return response.status === 200;
    } catch (error) {
      console.error('HubSpot authentication failed:', error.message);
      return false;
    }
  }

  async makeRequest(method, endpoint, data = null, params = {}) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
          ...(this.accessToken && { 'Authorization': `Bearer ${this.accessToken}` })
        },
        ...(data && { data }),
        ...(Object.keys(params).length > 0 && { params })
      };

      const response = await axios(config);
      return response;
    } catch (error) {
      console.error(`HubSpot API request failed: ${method} ${endpoint}`, error.response?.data || error.message);
      throw error;
    }
  }

  // ===== CONTACT MANAGEMENT =====

  async createContact(leadData) {
    try {
      const contactProperties = this.mapLeadToContactProperties(leadData);
      
      const response = await this.makeRequest('POST', '/crm/v3/objects/contacts', {
        properties: contactProperties
      });

      return {
        success: true,
        contactId: response.data.id,
        hubSpotId: response.data.id,
        properties: response.data.properties
      };
    } catch (error) {
      console.error('Failed to create HubSpot contact:', error.message);
      return {
        success: false,
        error: error.message,
        contactId: null
      };
    }
  }

  async updateContact(contactId, leadData) {
    try {
      const contactProperties = this.mapLeadToContactProperties(leadData);
      
      const response = await this.makeRequest('PATCH', `/crm/v3/objects/contacts/${contactId}`, {
        properties: contactProperties
      });

      return {
        success: true,
        contactId: response.data.id,
        properties: response.data.properties
      };
    } catch (error) {
      console.error('Failed to update HubSpot contact:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async findContactByEmail(email) {
    try {
      const response = await this.makeRequest('GET', '/crm/v3/objects/contacts/search', {
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: email
          }]
        }]
      });

      if (response.data.results && response.data.results.length > 0) {
        return {
          found: true,
          contact: response.data.results[0]
        };
      }

      return {
        found: false,
        contact: null
      };
    } catch (error) {
      console.error('Failed to find HubSpot contact:', error.message);
      return {
        found: false,
        error: error.message
      };
    }
  }

  // ===== DEAL MANAGEMENT =====

  async createDeal(leadData, contactId) {
    try {
      const dealProperties = this.mapLeadToDealProperties(leadData);
      
      const response = await this.makeRequest('POST', '/crm/v3/objects/deals', {
        properties: dealProperties
      });

      const dealId = response.data.id;

      // Associate deal with contact
      if (contactId) {
        await this.associateDealWithContact(dealId, contactId);
      }

      return {
        success: true,
        dealId: dealId,
        hubSpotId: dealId,
        properties: response.data.properties
      };
    } catch (error) {
      console.error('Failed to create HubSpot deal:', error.message);
      return {
        success: false,
        error: error.message,
        dealId: null
      };
    }
  }

  async updateDeal(dealId, leadData) {
    try {
      const dealProperties = this.mapLeadToDealProperties(leadData);
      
      const response = await this.makeRequest('PATCH', `/crm/v3/objects/deals/${dealId}`, {
        properties: dealProperties
      });

      return {
        success: true,
        dealId: response.data.id,
        properties: response.data.properties
      };
    } catch (error) {
      console.error('Failed to update HubSpot deal:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async associateDealWithContact(dealId, contactId) {
    try {
      await this.makeRequest('PUT', `/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/deal_to_contact`);
      return true;
    } catch (error) {
      console.error('Failed to associate deal with contact:', error.message);
      return false;
    }
  }

  // ===== COMPANY MANAGEMENT =====

  async createCompany(leadData) {
    try {
      const companyProperties = this.mapLeadToCompanyProperties(leadData);
      
      const response = await this.makeRequest('POST', '/crm/v3/objects/companies', {
        properties: companyProperties
      });

      return {
        success: true,
        companyId: response.data.id,
        hubSpotId: response.data.id,
        properties: response.data.properties
      };
    } catch (error) {
      console.error('Failed to create HubSpot company:', error.message);
      return {
        success: false,
        error: error.message,
        companyId: null
      };
    }
  }

  async findCompanyByName(companyName) {
    try {
      const response = await this.makeRequest('GET', '/crm/v3/objects/companies/search', {
        filterGroups: [{
          filters: [{
            propertyName: 'name',
            operator: 'EQ',
            value: companyName
          }]
        }]
      });

      if (response.data.results && response.data.results.length > 0) {
        return {
          found: true,
          company: response.data.results[0]
        };
      }

      return {
        found: false,
        company: null
      };
    } catch (error) {
      console.error('Failed to find HubSpot company:', error.message);
      return {
        found: false,
        error: error.message
      };
    }
  }

  // ===== LEAD SYNC =====

  async syncLeadToHubSpot(leadId, userId) {
    try {
      const lead = await Lead.findByPk(leadId, {
        include: [{ model: User, where: { id: userId } }]
      });

      if (!lead) {
        throw new Error('Lead not found');
      }

      const results = {
        contact: null,
        company: null,
        deal: null,
        errors: []
      };

      // Create or find company
      if (lead.company && lead.company !== 'Unknown') {
        const companySearch = await this.findCompanyByName(lead.company);
        if (companySearch.found) {
          results.company = companySearch.company;
        } else {
          const companyResult = await this.createCompany(lead);
          if (companyResult.success) {
            results.company = companyResult;
          } else {
            results.errors.push(`Company creation failed: ${companyResult.error}`);
          }
        }
      }

      // Create or find contact
      if (lead.contactEmail && lead.contactEmail !== 'Unknown') {
        const contactSearch = await this.findContactByEmail(lead.contactEmail);
        if (contactSearch.found) {
          results.contact = contactSearch.contact;
          // Update existing contact with new lead data
          await this.updateContact(contactSearch.contact.id, lead);
        } else {
          const contactResult = await this.createContact(lead);
          if (contactResult.success) {
            results.contact = contactResult;
          } else {
            results.errors.push(`Contact creation failed: ${contactResult.error}`);
          }
        }
      }

      // Create deal
      if (results.contact) {
        const dealResult = await this.createDeal(lead, results.contact.contactId || results.contact.id);
        if (dealResult.success) {
          results.deal = dealResult;
        } else {
          results.errors.push(`Deal creation failed: ${dealResult.error}`);
        }
      }

      // Update lead with HubSpot IDs
      if (results.contact || results.company || results.deal) {
        await this.updateLeadWithHubSpotIds(leadId, results);
      }

      return {
        success: results.errors.length === 0,
        results,
        errors: results.errors
      };

    } catch (error) {
      console.error('Failed to sync lead to HubSpot:', error.message);
      return {
        success: false,
        error: error.message,
        results: null
      };
    }
  }

  async syncMultipleLeads(leadIds, userId) {
    const results = [];
    const errors = [];

    for (const leadId of leadIds) {
      try {
        const result = await this.syncLeadToHubSpot(leadId, userId);
        results.push({ leadId, ...result });
        
        if (!result.success) {
          errors.push(`Lead ${leadId}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`Lead ${leadId}: ${error.message}`);
        results.push({ leadId, success: false, error: error.message });
      }
    }

    return {
      total: leadIds.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      errors
    };
  }

  // ===== DATA MAPPING =====

  mapLeadToContactProperties(lead) {
    const properties = {};

    // Basic contact information
    if (lead.contactEmail && lead.contactEmail !== 'Unknown') {
      properties.email = lead.contactEmail;
    }
    if (lead.contactName && lead.contactName !== 'Unknown') {
      properties.firstname = lead.contactName.split(' ')[0] || lead.contactName;
      properties.lastname = lead.contactName.split(' ').slice(1).join(' ') || '';
    }
    if (lead.contactPhone && lead.contactPhone !== 'Unknown') {
      properties.phone = lead.contactPhone;
    }

    // Company information
    if (lead.company && lead.company !== 'Unknown') {
      properties.company = lead.company;
    }

    // Location information
    if (lead.location && lead.location !== 'Unknown') {
      properties.city = lead.location;
    }

    // Lead source
    if (lead.sourceUrl) {
      properties.lead_source = 'Web Scraping';
    }

    // Custom properties
    if (lead.projectType) {
      properties.project_type = lead.projectType;
    }
    if (lead.budget) {
      properties.budget = lead.budget;
    }
    if (lead.timeline) {
      properties.timeline = lead.timeline;
    }

    // Notes
    if (lead.description) {
      properties.notes = lead.description;
    }

    return properties;
  }

  mapLeadToDealProperties(lead) {
    const properties = {};

    // Deal name
    properties.dealname = lead.title || `Lead from ${lead.company || 'Unknown Company'}`;

    // Deal stage
    properties.dealstage = this.mapLeadStatusToDealStage(lead.status);

    // Amount
    if (lead.budget) {
      properties.amount = lead.budget;
    }

    // Close date (estimate based on timeline)
    if (lead.timeline) {
      const closeDate = new Date();
      closeDate.setFullYear(parseInt(lead.timeline));
      properties.closedate = closeDate.toISOString().split('T')[0];
    } else {
      // Default to 90 days from now
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + 90);
      properties.closedate = closeDate.toISOString().split('T')[0];
    }

    // Deal type
    if (lead.projectType) {
      properties.deal_type = lead.projectType;
    }

    // Industry
    if (lead.industry_type) {
      properties.industry = lead.industry_type;
    }

    // Description
    if (lead.description) {
      properties.description = lead.description;
    }

    // Source
    properties.source = 'Web Scraping';

    return properties;
  }

  mapLeadToCompanyProperties(lead) {
    const properties = {};

    // Company name
    if (lead.company && lead.company !== 'Unknown') {
      properties.name = lead.company;
    }

    // Industry
    if (lead.industry_type) {
      properties.industry = lead.industry_type;
    }

    // Location
    if (lead.location && lead.location !== 'Unknown') {
      properties.city = lead.location;
    }

    // Description
    if (lead.description) {
      properties.description = lead.description;
    }

    // Source
    properties.source = 'Web Scraping';

    return properties;
  }

  mapLeadStatusToDealStage(leadStatus) {
    const statusMapping = {
      'new': 'appointmentscheduled',
      'qualified': 'qualifiedtobuy',
      'proposal': 'presentationscheduled',
      'negotiation': 'contractsent',
      'won': 'closedwon',
      'lost': 'closedlost'
    };

    return statusMapping[leadStatus] || 'appointmentscheduled';
  }

  // ===== UTILITY METHODS =====

  async updateLeadWithHubSpotIds(leadId, hubSpotResults) {
    try {
      const updateData = {};
      
      if (hubSpotResults.contact) {
        updateData.hubspot_contact_id = hubSpotResults.contact.contactId || hubSpotResults.contact.id;
      }
      
      if (hubSpotResults.company) {
        updateData.hubspot_company_id = hubSpotResults.company.companyId || hubSpotResults.company.id;
      }
      
      if (hubSpotResults.deal) {
        updateData.hubspot_deal_id = hubSpotResults.deal.dealId || hubSpotResults.deal.id;
      }

      if (Object.keys(updateData).length > 0) {
        // updateData.hubspot_synced_at = new Date(); // Field doesn't exist in Lead model
        await Lead.update(updateData, { where: { id: leadId } });
      }
    } catch (error) {
      console.error('Failed to update lead with HubSpot IDs:', error.message);
    }
  }

  async getSyncStatus(leadId) {
    try {
      const lead = await Lead.findByPk(leadId);
      if (!lead) return null;

      return {
        leadId,
        hubspotContactId: lead.hubspot_contact_id,
        hubspotCompanyId: lead.hubspot_company_id,
        hubspotDealId: lead.hubspot_deal_id,
        syncedAt: null, // hubspot_synced_at field doesn't exist in Lead model
        isSynced: !!(lead.hubspot_contact_id || lead.hubspot_company_id || lead.hubspot_deal_id)
      };
    } catch (error) {
      console.error('Failed to get sync status:', error.message);
      return null;
    }
  }

  async getHubSpotMetrics(userId, timeRange = '30d') {
    try {
      // Since hubspot_synced_at column doesn't exist, return default metrics
      // In a real implementation, you would track sync status differently
      const metrics = {
        totalSynced: 0,
        syncedByStatus: {},
        totalValue: 0,
        averageValue: 0,
        syncRate: 0,
        lastSync: null
      };

      return metrics;
    } catch (error) {
      console.error('Failed to get HubSpot metrics:', error.message);
      return null;
    }
  }

  getDateRange(timeRange) {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }
    
    return { startDate, endDate };
  }

  // ===== WEBHOOK HANDLING =====

  async handleWebhook(payload) {
    try {
      // Handle HubSpot webhooks for real-time updates
      const { subscriptionType, objectType, objectId } = payload;

      switch (subscriptionType) {
        case 'contact.creation':
          await this.handleContactCreated(objectId);
          break;
        case 'contact.propertyChange':
          await this.handleContactUpdated(objectId, payload);
          break;
        case 'deal.creation':
          await this.handleDealCreated(objectId);
          break;
        case 'deal.propertyChange':
          await this.handleDealUpdated(objectId, payload);
          break;
        default:
          console.log(`Unhandled webhook type: ${subscriptionType}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to handle HubSpot webhook:', error.message);
      return { success: false, error: error.message };
    }
  }

  async handleContactCreated(contactId) {
    // Handle new contact creation from HubSpot
    console.log(`New HubSpot contact created: ${contactId}`);
  }

  async handleContactUpdated(contactId, payload) {
    // Handle contact updates from HubSpot
    console.log(`HubSpot contact updated: ${contactId}`);
  }

  async handleDealCreated(dealId) {
    // Handle new deal creation from HubSpot
    console.log(`New HubSpot deal created: ${dealId}`);
  }

  async handleDealUpdated(dealId, payload) {
    // Handle deal updates from HubSpot
    console.log(`HubSpot deal updated: ${dealId}`);
  }
}

module.exports = HubSpotService;
