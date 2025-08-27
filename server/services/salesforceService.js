const axios = require('axios');
const { Lead, User } = require('../models');

class SalesforceService {
  constructor() {
    this.baseURL = process.env.SALESFORCE_INSTANCE_URL || 'https://login.salesforce.com';
    this.clientId = process.env.SALESFORCE_CLIENT_ID;
    this.clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
    this.username = process.env.SALESFORCE_USERNAME;
    this.password = process.env.SALESFORCE_PASSWORD;
    this.securityToken = process.env.SALESFORCE_SECURITY_TOKEN;
    this.accessToken = null;
    this.instanceUrl = null;
  }

  // ===== AUTHENTICATION & SETUP =====

  async authenticate() {
    try {
      if (!this.clientId || !this.clientSecret || !this.username || !this.password) {
        throw new Error('Salesforce credentials not configured');
      }

      const authResponse = await axios.post(`${this.baseURL}/services/oauth2/token`, {
        grant_type: 'password',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        username: this.username,
        password: this.password + (this.securityToken || '')
      });

      this.accessToken = authResponse.data.access_token;
      this.instanceUrl = authResponse.data.instance_url;

      return true;
    } catch (error) {
      console.error('Salesforce authentication failed:', error.message);
      return false;
    }
  }

  async makeRequest(method, endpoint, data = null, params = {}) {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const config = {
        method,
        url: `${this.instanceUrl}/services/data/v58.0${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        ...(data && { data }),
        ...(Object.keys(params).length > 0 && { params })
      };

      const response = await axios(config);
      return response;
    } catch (error) {
      if (error.response?.status === 401) {
        // Token expired, re-authenticate
        await this.authenticate();
        return this.makeRequest(method, endpoint, data, params);
      }
      
      console.error(`Salesforce API request failed: ${method} ${endpoint}`, error.response?.data || error.message);
      throw error;
    }
  }

  // ===== LEAD MANAGEMENT =====

  async createLead(leadData) {
    try {
      const leadProperties = this.mapLeadToSalesforceLead(leadData);
      
      const response = await this.makeRequest('POST', '/sobjects/Lead', {
        ...leadProperties
      });

      return {
        success: true,
        leadId: response.data.id,
        salesforceId: response.data.id,
        properties: leadProperties
      };
    } catch (error) {
      console.error('Failed to create Salesforce lead:', error.message);
      return {
        success: false,
        error: error.message,
        leadId: null
      };
    }
  }

  async updateLead(leadId, leadData) {
    try {
      const leadProperties = this.mapLeadToSalesforceLead(leadData);
      
      const response = await this.makeRequest('PATCH', `/sobjects/Lead/${leadId}`, {
        ...leadProperties
      });

      return {
        success: true,
        leadId: response.data.id,
        properties: leadProperties
      };
    } catch (error) {
      console.error('Failed to update Salesforce lead:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async findLeadByEmail(email) {
    try {
      const query = `SELECT Id, FirstName, LastName, Email, Company, Status, LeadSource FROM Lead WHERE Email = '${email}' LIMIT 1`;
      const response = await this.makeRequest('GET', `/query?q=${encodeURIComponent(query)}`);

      if (response.data.records && response.data.records.length > 0) {
        return {
          found: true,
          lead: response.data.records[0]
        };
      }

      return {
        found: false,
        lead: null
      };
    } catch (error) {
      console.error('Failed to find Salesforce lead:', error.message);
      return {
        found: false,
        error: error.message
      };
    }
  }

  async convertLeadToOpportunity(leadId, accountId = null, contactId = null) {
    try {
      const conversionData = {
        leadId: leadId,
        convertedStatus: 'Closed - Converted',
        doNotCreateOpportunity: false,
        opportunityName: 'Converted Lead Opportunity',
        ...(accountId && { accountId }),
        ...(contactId && { contactId })
      };

      const response = await this.makeRequest('POST', '/sobjects/Lead/convert', conversionData);

      return {
        success: true,
        opportunityId: response.data.opportunityId,
        accountId: response.data.accountId,
        contactId: response.data.contactId
      };
    } catch (error) {
      console.error('Failed to convert Salesforce lead:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ===== ACCOUNT MANAGEMENT =====

  async createAccount(leadData) {
    try {
      const accountProperties = this.mapLeadToSalesforceAccount(leadData);
      
      const response = await this.makeRequest('POST', '/sobjects/Account', {
        ...accountProperties
      });

      return {
        success: true,
        accountId: response.data.id,
        salesforceId: response.data.id,
        properties: accountProperties
      };
    } catch (error) {
      console.error('Failed to create Salesforce account:', error.message);
      return {
        success: false,
        error: error.message,
        accountId: null
      };
    }
  }

  async findAccountByName(accountName) {
    try {
      const query = `SELECT Id, Name, Industry, BillingCity, Description FROM Account WHERE Name = '${accountName}' LIMIT 1`;
      const response = await this.makeRequest('GET', `/query?q=${encodeURIComponent(query)}`);

      if (response.data.records && response.data.records.length > 0) {
        return {
          found: true,
          account: response.data.records[0]
        };
      }

      return {
        found: false,
        account: null
      };
    } catch (error) {
      console.error('Failed to find Salesforce account:', error.message);
      return {
        found: false,
        error: error.message
      };
    }
  }

  // ===== CONTACT MANAGEMENT =====

  async createContact(leadData, accountId = null) {
    try {
      const contactProperties = this.mapLeadToSalesforceContact(leadData);
      
      if (accountId) {
        contactProperties.AccountId = accountId;
      }

      const response = await this.makeRequest('POST', '/sobjects/Contact', {
        ...contactProperties
      });

      return {
        success: true,
        contactId: response.data.id,
        salesforceId: response.data.id,
        properties: contactProperties
      };
    } catch (error) {
      console.error('Failed to create Salesforce contact:', error.message);
      return {
        success: false,
        error: error.message,
        contactId: null
      };
    }
  }

  async findContactByEmail(email) {
    try {
      const query = `SELECT Id, FirstName, LastName, Email, AccountId FROM Contact WHERE Email = '${email}' LIMIT 1`;
      const response = await this.makeRequest('GET', `/query?q=${encodeURIComponent(query)}`);

      if (response.data.records && response.data.records.length > 0) {
        return {
          found: true,
          contact: response.data.records[0]
        };
      }

      return {
        found: false,
        contact: null
      };
    } catch (error) {
      console.error('Failed to find Salesforce contact:', error.message);
      return {
        found: false,
        error: error.message
      };
    }
  }

  // ===== OPPORTUNITY MANAGEMENT =====

  async createOpportunity(leadData, accountId, contactId = null) {
    try {
      const opportunityProperties = this.mapLeadToSalesforceOpportunity(leadData);
      
      opportunityProperties.AccountId = accountId;
      if (contactId) {
        opportunityProperties.ContactId = contactId;
      }

      const response = await this.makeRequest('POST', '/sobjects/Opportunity', {
        ...opportunityProperties
      });

      return {
        success: true,
        opportunityId: response.data.id,
        salesforceId: response.data.id,
        properties: opportunityProperties
      };
    } catch (error) {
      console.error('Failed to create Salesforce opportunity:', error.message);
      return {
        success: false,
        error: error.message,
        opportunityId: null
      };
    }
  }

  async updateOpportunity(opportunityId, leadData) {
    try {
      const opportunityProperties = this.mapLeadToSalesforceOpportunity(leadData);
      
      const response = await this.makeRequest('PATCH', `/sobjects/Opportunity/${opportunityId}`, {
        ...opportunityProperties
      });

      return {
        success: true,
        opportunityId: response.data.id,
        properties: opportunityProperties
      };
    } catch (error) {
      console.error('Failed to update Salesforce opportunity:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ===== LEAD SYNC =====

  async syncLeadToSalesforce(leadId, userId) {
    try {
      const lead = await Lead.findByPk(leadId, {
        include: [{ model: User, where: { id: userId } }]
      });

      if (!lead) {
        throw new Error('Lead not found');
      }

      const results = {
        lead: null,
        account: null,
        contact: null,
        opportunity: null,
        errors: []
      };

      // Create or find account
      if (lead.company && lead.company !== 'Unknown') {
        const accountSearch = await this.findAccountByName(lead.company);
        if (accountSearch.found) {
          results.account = accountSearch.account;
        } else {
          const accountResult = await this.createAccount(lead);
          if (accountResult.success) {
            results.account = accountResult;
          } else {
            results.errors.push(`Account creation failed: ${accountResult.error}`);
          }
        }
      }

      // Create or find contact
      if (lead.contactEmail && lead.contactEmail !== 'Unknown') {
        const contactSearch = await this.findContactByEmail(lead.contactEmail);
        if (contactSearch.found) {
          results.contact = contactSearch.contact;
          // Update existing contact with new lead data
          await this.updateContact(contactSearch.contact.Id, lead);
        } else {
          const accountId = results.account?.accountId || results.account?.salesforceId;
          const contactResult = await this.createContact(lead, accountId);
          if (contactResult.success) {
            results.contact = contactResult;
          } else {
            results.errors.push(`Contact creation failed: ${contactResult.error}`);
          }
        }
      }

      // Create lead
      const leadResult = await this.createLead(lead);
      if (leadResult.success) {
        results.lead = leadResult;
      } else {
        results.errors.push(`Lead creation failed: ${leadResult.error}`);
      }

      // Create opportunity
      if (results.account && results.lead) {
        const accountId = results.account.accountId || results.account.salesforceId;
        const contactId = results.contact?.contactId || results.contact?.salesforceId;
        
        const opportunityResult = await this.createOpportunity(lead, accountId, contactId);
        if (opportunityResult.success) {
          results.opportunity = opportunityResult;
        } else {
          results.errors.push(`Opportunity creation failed: ${opportunityResult.error}`);
        }
      }

      // Update lead with Salesforce IDs
      if (results.lead || results.account || results.contact || results.opportunity) {
        await this.updateLeadWithSalesforceIds(leadId, results);
      }

      return {
        success: results.errors.length === 0,
        results,
        errors: results.errors
      };

    } catch (error) {
      console.error('Failed to sync lead to Salesforce:', error.message);
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
        const result = await this.syncLeadToSalesforce(leadId, userId);
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

  mapLeadToSalesforceLead(lead) {
    const properties = {};

    // Basic lead information
    if (lead.contactEmail && lead.contactEmail !== 'Unknown') {
      properties.Email = lead.contactEmail;
    }
    if (lead.contactName && lead.contactName !== 'Unknown') {
      const nameParts = lead.contactName.split(' ');
      properties.FirstName = nameParts[0] || lead.contactName;
      properties.LastName = nameParts.slice(1).join(' ') || '';
    }
    if (lead.contactPhone && lead.contactPhone !== 'Unknown') {
      properties.Phone = lead.contactPhone;
    }

    // Company information
    if (lead.company && lead.company !== 'Unknown') {
      properties.Company = lead.company;
    }

    // Lead source and status
    properties.LeadSource = 'Web Scraping';
    properties.Status = this.mapLeadStatusToSalesforceStatus(lead.status);

    // Project information
    if (lead.projectType) {
      properties.Project_Type__c = lead.projectType;
    }
    if (lead.budget) {
      properties.Budget__c = lead.budget;
    }
    if (lead.timeline) {
      properties.Timeline__c = lead.timeline;
    }

    // Industry and location
    if (lead.industry_type) {
      properties.Industry = lead.industry_type;
    }
    if (lead.location && lead.location !== 'Unknown') {
      properties.City = lead.location;
    }

    // Description
    if (lead.description) {
      properties.Description = lead.description;
    }

    // Custom fields
    if (lead.score) {
      properties.Lead_Score__c = lead.score;
    }
    if (lead.priority) {
      properties.Priority__c = lead.priority;
    }

    return properties;
  }

  mapLeadToSalesforceAccount(lead) {
    const properties = {};

    // Company name
    if (lead.company && lead.company !== 'Unknown') {
      properties.Name = lead.company;
    }

    // Industry
    if (lead.industry_type) {
      properties.Industry = lead.industry_type;
    }

    // Location
    if (lead.location && lead.location !== 'Unknown') {
      properties.BillingCity = lead.location;
    }

    // Description
    if (lead.description) {
      properties.Description = lead.description;
    }

    // Type
    properties.Type = 'Prospect';

    return properties;
  }

  mapLeadToSalesforceContact(lead) {
    const properties = {};

    // Basic contact information
    if (lead.contactEmail && lead.contactEmail !== 'Unknown') {
      properties.Email = lead.contactEmail;
    }
    if (lead.contactName && lead.contactName !== 'Unknown') {
      const nameParts = lead.contactName.split(' ');
      properties.FirstName = nameParts[0] || lead.contactName;
      properties.LastName = nameParts.slice(1).join(' ') || '';
    }
    if (lead.contactPhone && lead.contactPhone !== 'Unknown') {
      properties.Phone = lead.contactPhone;
    }

    // Title
    if (lead.projectType) {
      properties.Title = `${lead.projectType} Project Manager`;
    }

    // Lead source
    properties.LeadSource = 'Web Scraping';

    return properties;
  }

  mapLeadToSalesforceOpportunity(lead) {
    const properties = {};

    // Opportunity name
    properties.Name = lead.title || `Lead from ${lead.company || 'Unknown Company'}`;

    // Stage
    properties.StageName = this.mapLeadStatusToOpportunityStage(lead.status);

    // Amount
    if (lead.budget) {
      properties.Amount = lead.budget;
    }

    // Close date (estimate based on timeline)
    if (lead.timeline) {
      const closeDate = new Date();
      closeDate.setFullYear(parseInt(lead.timeline));
      properties.CloseDate = closeDate.toISOString().split('T')[0];
    } else {
      // Default to 90 days from now
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + 90);
      properties.CloseDate = closeDate.toISOString().split('T')[0];
    }

    // Type
    if (lead.projectType) {
      properties.Type = lead.projectType;
    }

    // Description
    if (lead.description) {
      properties.Description = lead.description;
    }

    // Lead source
    properties.LeadSource = 'Web Scraping';

    // Probability (based on stage)
    properties.Probability = this.getStageProbability(lead.status);

    return properties;
  }

  mapLeadStatusToSalesforceStatus(leadStatus) {
    const statusMapping = {
      'new': 'New',
      'qualified': 'Qualified',
      'proposal': 'Proposal',
      'negotiation': 'Negotiation',
      'won': 'Closed Won',
      'lost': 'Closed Lost'
    };

    return statusMapping[leadStatus] || 'New';
  }

  mapLeadStatusToOpportunityStage(leadStatus) {
    const stageMapping = {
      'new': 'Prospecting',
      'qualified': 'Qualification',
      'proposal': 'Proposal/Price Quote',
      'negotiation': 'Negotiation/Review',
      'won': 'Closed Won',
      'lost': 'Closed Lost'
    };

    return stageMapping[leadStatus] || 'Prospecting';
  }

  getStageProbability(status) {
    const probabilities = {
      'new': 10,
      'qualified': 25,
      'proposal': 50,
      'negotiation': 75,
      'won': 100,
      'lost': 0
    };

    return probabilities[status] || 10;
  }

  // ===== UTILITY METHODS =====

  async updateLeadWithSalesforceIds(leadId, salesforceResults) {
    try {
      const updateData = {};
      
      if (salesforceResults.lead) {
        updateData.salesforce_lead_id = salesforceResults.lead.leadId || salesforceResults.lead.salesforceId;
      }
      
      if (salesforceResults.account) {
        updateData.salesforce_account_id = salesforceResults.account.accountId || salesforceResults.account.salesforceId;
      }
      
      if (salesforceResults.contact) {
        updateData.salesforce_contact_id = salesforceResults.contact.contactId || salesforceResults.contact.salesforceId;
      }

      if (salesforceResults.opportunity) {
        updateData.salesforce_opportunity_id = salesforceResults.opportunity.opportunityId || salesforceResults.opportunity.salesforceId;
      }

      if (Object.keys(updateData).length > 0) {
        // updateData.salesforce_synced_at = new Date(); // Field doesn't exist in Lead model
        await Lead.update(updateData, { where: { id: leadId } });
      }
    } catch (error) {
      console.error('Failed to update lead with Salesforce IDs:', error.message);
    }
  }

  async getSyncStatus(leadId) {
    try {
      const lead = await Lead.findByPk(leadId);
      if (!lead) return null;

      return {
        leadId,
        salesforceLeadId: lead.salesforce_lead_id,
        salesforceAccountId: lead.salesforce_account_id,
        salesforceContactId: lead.salesforce_contact_id,
        salesforceOpportunityId: lead.salesforce_opportunity_id,
        syncedAt: null, // salesforce_synced_at field doesn't exist in Lead model
        isSynced: !!(lead.salesforce_lead_id || lead.salesforce_account_id || lead.salesforce_contact_id || lead.salesforce_opportunity_id)
      };
    } catch (error) {
      console.error('Failed to get sync status:', error.message);
      return null;
    }
  }

  async getSalesforceMetrics(userId, timeRange = '30d') {
    try {
      // Since salesforce_synced_at column doesn't exist, return default metrics
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
      console.error('Failed to get Salesforce metrics:', error.message);
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

  // ===== BULK OPERATIONS =====

  async bulkInsert(records, objectType) {
    try {
      const response = await this.makeRequest('POST', `/sobjects/${objectType}`, {
        allOrNone: false,
        records: records
      });

      return {
        success: true,
        results: response.data,
        totalProcessed: records.length,
        successful: response.data.filter(r => r.success).length,
        failed: response.data.filter(r => !r.success).length
      };
    } catch (error) {
      console.error(`Bulk insert failed for ${objectType}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async bulkUpdate(records, objectType) {
    try {
      const response = await this.makeRequest('PATCH', `/sobjects/${objectType}`, {
        allOrNone: false,
        records: records
      });

      return {
        success: true,
        results: response.data,
        totalProcessed: records.length,
        successful: response.data.filter(r => r.success).length,
        failed: response.data.filter(r => !r.success).length
      };
    } catch (error) {
      console.error(`Bulk update failed for ${objectType}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ===== DATA VALIDATION =====

  async validateLeadData(leadData) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!leadData.company || leadData.company === 'Unknown') {
      errors.push('Company name is required');
    }

    if (!leadData.contactEmail || leadData.contactEmail === 'Unknown') {
      errors.push('Contact email is required');
    }

    // Field validation
    if (leadData.contactEmail && leadData.contactEmail !== 'Unknown') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(leadData.contactEmail)) {
        errors.push('Invalid email format');
      }
    }

    if (leadData.budget) {
      const budget = parseFloat(leadData.budget);
      if (isNaN(budget) || budget < 0) {
        errors.push('Invalid budget amount');
      }
    }

    // Warnings
    if (!leadData.contactPhone || leadData.contactPhone === 'Unknown') {
      warnings.push('Contact phone is missing');
    }

    if (!leadData.location || leadData.location === 'Unknown') {
      warnings.push('Location is missing');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

module.exports = SalesforceService;
