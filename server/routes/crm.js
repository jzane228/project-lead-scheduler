const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const HubSpotService = require('../services/hubspotService');
const SalesforceService = require('../services/salesforceService');
const { Lead, User } = require('../models');

const hubspotService = new HubSpotService();
const salesforceService = new SalesforceService();

// @route   GET /api/crm/integrations
// @desc    Get available CRM integrations
// @access  Private
router.get('/integrations', auth, async (req, res) => {
  try {
    const integrations = [
      {
        id: 'hubspot',
        name: 'HubSpot',
        description: 'Connect your HubSpot CRM for seamless lead management',
        icon: 'hubspot',
        isConnected: !!process.env.HUBSPOT_ACCESS_TOKEN,
        features: ['Contact Sync', 'Company Sync', 'Deal Sync', 'Automated Workflows'],
        setupUrl: '/api/crm/hubspot/auth'
      },
      {
        id: 'salesforce',
        name: 'Salesforce',
        description: 'Integrate with Salesforce for enterprise lead management',
        icon: 'salesforce',
        isConnected: !!process.env.SALESFORCE_ACCESS_TOKEN,
        features: ['Lead Sync', 'Account Sync', 'Opportunity Sync', 'Custom Fields'],
        setupUrl: '/api/crm/salesforce/auth'
      }
    ];

    res.json(integrations);
  } catch (error) {
    console.error('CRM integrations error:', error);
    res.status(500).json({ error: 'Failed to get CRM integrations' });
  }
});

// HubSpot Routes
// @route   GET /api/crm/hubspot/auth
// @desc    Get HubSpot authentication URL
// @access  Private
router.get('/hubspot/auth', auth, async (req, res) => {
  try {
    const authUrl = await hubspotService.getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('HubSpot auth error:', error);
    res.status(500).json({ error: 'Failed to get HubSpot auth URL' });
  }
});

// @route   POST /api/crm/hubspot/callback
// @desc    Handle HubSpot OAuth callback
// @access  Private
router.post('/hubspot/callback', auth, async (req, res) => {
  try {
    const { code } = req.body;
    const result = await hubspotService.handleAuthCallback(code);
    
    res.json({
      message: 'HubSpot connected successfully',
      result
    });
  } catch (error) {
    console.error('HubSpot callback error:', error);
    res.status(500).json({ error: 'Failed to complete HubSpot authentication' });
  }
});

// @route   POST /api/crm/hubspot/sync/:leadId
// @desc    Sync a single lead to HubSpot
// @access  Private
router.post('/hubspot/sync/:leadId', auth, async (req, res) => {
  try {
    const { leadId } = req.params;
    const result = await hubspotService.syncLeadToHubSpot(leadId, req.user.id);
    
    res.json({
      message: 'Lead synced to HubSpot successfully',
      result
    });
  } catch (error) {
    console.error('HubSpot sync error:', error);
    res.status(500).json({ error: 'Failed to sync lead to HubSpot' });
  }
});

// @route   POST /api/crm/hubspot/sync/bulk
// @desc    Sync multiple leads to HubSpot
// @access  Private
router.post('/hubspot/sync/bulk', auth, async (req, res) => {
  try {
    const { leadIds } = req.body;
    
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Lead IDs array is required' });
    }

    if (leadIds.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 leads allowed per bulk sync' });
    }

    const results = await hubspotService.syncMultipleLeads(leadIds, req.user.id);
    
    res.json({
      message: `Successfully synced ${results.length} leads to HubSpot`,
      results
    });
  } catch (error) {
    console.error('HubSpot bulk sync error:', error);
    res.status(500).json({ error: 'Failed to bulk sync leads to HubSpot' });
  }
});

// @route   GET /api/crm/hubspot/status/:leadId
// @desc    Get HubSpot sync status for a lead
// @access  Private
router.get('/hubspot/status/:leadId', auth, async (req, res) => {
  try {
    const { leadId } = req.params;
    const status = await hubspotService.getSyncStatus(leadId);
    
    res.json(status);
  } catch (error) {
    console.error('HubSpot status error:', error);
    res.status(500).json({ error: 'Failed to get HubSpot sync status' });
  }
});

// @route   GET /api/crm/hubspot/metrics
// @desc    Get HubSpot integration metrics
// @access  Private
router.get('/hubspot/metrics', auth, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const metrics = await hubspotService.getHubSpotMetrics(req.user.id, timeRange);
    
    res.json(metrics);
  } catch (error) {
    console.error('HubSpot metrics error:', error);
    res.status(500).json({ error: 'Failed to get HubSpot metrics' });
  }
});

// Salesforce Routes
// @route   GET /api/crm/salesforce/auth
// @desc    Get Salesforce authentication URL
// @access  Private
router.get('/salesforce/auth', auth, async (req, res) => {
  try {
    const authUrl = await salesforceService.getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Salesforce auth error:', error);
    res.status(500).json({ error: 'Failed to get Salesforce auth URL' });
  }
});

// @route   POST /api/crm/salesforce/callback
// @desc    Handle Salesforce OAuth callback
// @access  Private
router.post('/salesforce/callback', auth, async (req, res) => {
  try {
    const { code } = req.body;
    const result = await salesforceService.handleAuthCallback(code);
    
    res.json({
      message: 'Salesforce connected successfully',
      result
    });
  } catch (error) {
    console.error('Salesforce callback error:', error);
    res.status(500).json({ error: 'Failed to complete Salesforce authentication' });
  }
});

// @route   POST /api/crm/salesforce/sync/:leadId
// @desc    Sync a single lead to Salesforce
// @access  Private
router.post('/salesforce/sync/:leadId', auth, async (req, res) => {
  try {
    const { leadId } = req.params;
    const result = await salesforceService.syncLeadToSalesforce(leadId, req.user.id);
    
    res.json({
      message: 'Lead synced to Salesforce successfully',
      result
    });
  } catch (error) {
    console.error('Salesforce sync error:', error);
    res.status(500).json({ error: 'Failed to sync lead to Salesforce' });
  }
});

// @route   POST /api/crm/salesforce/sync/bulk
// @desc    Sync multiple leads to Salesforce
// @access  Private
router.post('/salesforce/sync/bulk', auth, async (req, res) => {
  try {
    const { leadIds } = req.body;
    
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Lead IDs array is required' });
    }

    if (leadIds.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 leads allowed per bulk sync' });
    }

    const results = await salesforceService.syncMultipleLeads(leadIds, req.user.id);
    
    res.json({
      message: `Successfully synced ${results.length} leads to Salesforce`,
      results
    });
  } catch (error) {
    console.error('Salesforce bulk sync error:', error);
    res.status(500).json({ error: 'Failed to bulk sync leads to Salesforce' });
  }
});

// @route   GET /api/crm/salesforce/status/:leadId
// @desc    Get Salesforce sync status for a lead
// @access  Private
router.get('/salesforce/status/:leadId', auth, async (req, res) => {
  try {
    const { leadId } = req.params;
    const status = await salesforceService.getSyncStatus(leadId);
    
    res.json(status);
  } catch (error) {
    console.error('Salesforce status error:', error);
    res.status(500).json({ error: 'Failed to get Salesforce sync status' });
  }
});

// @route   GET /api/crm/salesforce/metrics
// @desc    Get Salesforce integration metrics
// @access  Private
router.get('/salesforce/metrics', auth, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const metrics = await salesforceService.getSalesforceMetrics(req.user.id, timeRange);
    
    res.json(metrics);
  } catch (error) {
    console.error('Salesforce metrics error:', error);
    res.status(500).json({ error: 'Failed to get Salesforce metrics' });
  }
});

// @route   POST /api/crm/salesforce/bulk
// @desc    Bulk insert/update records in Salesforce
// @access  Private
router.post('/salesforce/bulk', auth, async (req, res) => {
  try {
    const { records, objectType, operation = 'insert' } = req.body;
    
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'Records array is required' });
    }

    if (!objectType) {
      return res.status(400).json({ error: 'Object type is required' });
    }

    let result;
    if (operation === 'insert') {
      result = await salesforceService.bulkInsert(records, objectType);
    } else if (operation === 'update') {
      result = await salesforceService.bulkUpdate(records, objectType);
    } else {
      return res.status(400).json({ error: 'Invalid operation. Use "insert" or "update"' });
    }
    
    res.json({
      message: `Successfully performed bulk ${operation}`,
      result
    });
  } catch (error) {
    console.error('Salesforce bulk operation error:', error);
    res.status(500).json({ error: `Failed to perform bulk ${req.body.operation || 'operation'}` });
  }
});

// @route   POST /api/crm/webhook/hubspot
// @desc    Handle HubSpot webhooks
// @access  Public (no auth required for webhooks)
router.post('/webhook/hubspot', async (req, res) => {
  try {
    const result = await hubspotService.handleWebhook(req.body);
    res.json({ success: true, result });
  } catch (error) {
    console.error('HubSpot webhook error:', error);
    res.status(500).json({ error: 'Failed to process HubSpot webhook' });
  }
});

// @route   POST /api/crm/webhook/salesforce
// @desc    Handle Salesforce webhooks
// @access  Public (no auth required for webhooks)
router.post('/webhook/salesforce', async (req, res) => {
  try {
    // Salesforce webhook handling would go here
    res.json({ success: true, message: 'Salesforce webhook received' });
  } catch (error) {
    console.error('Salesforce webhook error:', error);
    res.status(500).json({ error: 'Failed to process Salesforce webhook' });
  }
});

// @route   GET /api/crm/sync/status
// @desc    Get overall CRM sync status
// @access  Private
router.get('/sync/status', auth, async (req, res) => {
  try {
    const status = {
      hubspot: {
        isConnected: !!process.env.HUBSPOT_ACCESS_TOKEN,
        lastSync: null,
        syncCount: 0
      },
      salesforce: {
        isConnected: !!process.env.SALESFORCE_ACCESS_TOKEN,
        lastSync: null,
        syncCount: 0
      }
    };

    // In a real implementation, you'd get this data from the database
    res.json(status);
  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

module.exports = router;
