const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AnalyticsService = require('../services/analyticsService');
const HubSpotService = require('../services/hubspotService');
const SalesforceService = require('../services/salesforceService');
const { Lead, ScrapingConfig, User, LeadSource } = require('../models');
const { Op } = require('sequelize');

const analyticsService = new AnalyticsService();
const hubspotService = new HubSpotService();
const salesforceService = new SalesforceService();

// @route   GET /api/dashboard/stats
// @desc    Get comprehensive dashboard statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.userId; // Note: JWT payload uses userId, not id
    const { timeRange = '30d' } = req.query;
    
    // Get basic metrics with error handling
    let leadMetrics, scrapingMetrics, crmStatus, exportStats;
    
    try {
      leadMetrics = await analyticsService.getLeadMetrics(userId, timeRange);
    } catch (error) {
      console.error('Lead metrics error:', error);
      leadMetrics = { counts: { total: 0, newThisPeriod: 0, conversionRate: 0 }, quality: { averageQuality: 0 }, trends: { monthlyGrowth: 0, growthChange: 0 }, sources: { topSource: 'N/A' } };
    }
    
    try {
      scrapingMetrics = await analyticsService.getScrapingMetrics(userId, timeRange);
    } catch (error) {
      console.error('Scraping metrics error:', error);
      scrapingMetrics = { activeConfigs: 0, configsChange: 0, successRate: 0, totalScraped: 0, avgResponseTime: 0 };
    }
    
    try {
      crmStatus = await getCRMStatus(userId);
    } catch (error) {
      console.error('CRM status error:', error);
      crmStatus = { hubspot: { isConnected: false, lastSync: null, totalSynced: 0 }, salesforce: { isConnected: false, lastSync: null, totalSynced: 0 }, totalSynced: 0 };
    }
    
    try {
      const { startDate, endDate } = analyticsService.getDateRange(timeRange);
      exportStats = await getExportStats(userId, startDate, endDate);
    } catch (error) {
      console.error('Export stats error:', error);
      exportStats = { pending: 0, completed: 0, totalSize: 0 };
    }

    const stats = {
      leads: {
        total: leadMetrics.counts?.total || 0,
        change: leadMetrics.counts?.newThisPeriod || 0,
        quality: leadMetrics.quality?.averageQuality || 0,
        conversion: leadMetrics.counts?.conversionRate || 0
      },
      scraping: {
        activeConfigs: scrapingMetrics.performance?.totalConfigurations || 0,
        configsChange: 0, // Will implement later
        successRate: scrapingMetrics.performance?.successRate || 0,
        totalScraped: scrapingMetrics.performance?.totalLeadsGenerated || 0
      },
      crm: {
        hubspot: crmStatus.hubspot,
        salesforce: crmStatus.salesforce,
        totalSynced: crmStatus.totalSynced
      },
      exports: {
        pending: exportStats.pending,
        completed: exportStats.completed,
        totalSize: exportStats.totalSize
      },
      performance: {
        monthlyGrowth: leadMetrics.trends?.monthlyGrowth || 0,
        growthChange: leadMetrics.trends?.growthChange || 0,
        topSource: leadMetrics.sources?.topSource || 'N/A',
        avgResponseTime: scrapingMetrics.avgResponseTime || 0
      }
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard statistics' });
  }
});

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview with charts data
// @access  Private
router.get('/overview', auth, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const { startDate, endDate } = analyticsService.getDateRange(timeRange);

    // Get comprehensive overview data
    const [leadMetrics, scrapingMetrics, businessIntelligence] = await Promise.all([
      analyticsService.getLeadMetrics(req.user.id, timeRange),
      analyticsService.getScrapingMetrics(req.user.id, timeRange),
      analyticsService.getBusinessIntelligence(req.user.id, timeRange)
    ]);

    const overview = {
      leadTrends: await analyticsService.getLeadTrends(req.user.id, startDate, endDate),
      sourcePerformance: await analyticsService.getLeadSourcePerformance(req.user.id, startDate, endDate),
      scrapingTrends: await analyticsService.getScrapingTrends(req.user.id, startDate, endDate),
      conversionFunnel: await analyticsService.getLeadConversionMetrics(req.user.id, startDate, endDate),
      revenueProjections: await analyticsService.getRevenueProjections(req.user.id, startDate, endDate),
      marketInsights: await analyticsService.getMarketInsights(req.user.id, startDate, endDate)
    };

    res.json({
      metrics: {
        leads: leadMetrics,
        scraping: scrapingMetrics,
        business: businessIntelligence
      },
      charts: overview
    });

  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Failed to get dashboard overview' });
  }
});

// @route   GET /api/dashboard/recent-activity
// @desc    Get recent user activity
// @access  Private
router.get('/recent-activity', auth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    // Get recent leads
    const recentLeads = await Lead.findAll({
      where: { user_id: req.user.id },
      include: [
        { model: LeadSource, as: 'LeadSource' }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    // Get recent scraping activity
    const recentScraping = await ScrapingConfig.findAll({
      where: { user_id: req.user.id },
      order: [['lastRun', 'DESC']],
      limit: parseInt(limit)
    });

    // Get recent exports (placeholder - would come from export history)
    const recentExports = [];

    const activity = {
      leads: recentLeads.map(lead => ({
        id: lead.id,
        type: 'lead',
        action: 'created',
        title: lead.title,
        company: lead.company,
        timestamp: lead.createdAt,
        status: lead.status
      })),
      scraping: recentScraping.map(config => ({
        id: config.id,
        type: 'scraping',
        action: 'completed',
        title: config.name,
        timestamp: config.lastRun,
        status: config.isActive ? 'active' : 'inactive'
      })),
      exports: recentExports
    };

    // Sort all activities by timestamp
    const allActivities = [...activity.leads, ...activity.scraping, ...activity.exports]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));

    res.json({
      activities: allActivities,
      total: allActivities.length
    });

  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ error: 'Failed to get recent activity' });
  }
});

// @route   GET /api/dashboard/quick-actions
// @desc    Get available quick actions
// @access  Private
router.get('/quick-actions', auth, async (req, res) => {
  try {
    const actions = [
      {
        id: 'new-scraping',
        title: 'Start New Scraping',
        description: 'Create and run a new scraping configuration',
        icon: 'scraping',
        url: '/scraping/new',
        color: 'blue'
      },
      {
        id: 'export-leads',
        title: 'Export Leads',
        description: 'Export your leads to various formats',
        icon: 'export',
        url: '/export',
        color: 'green'
      },
      {
        id: 'sync-crm',
        title: 'Sync to CRM',
        description: 'Sync leads to your connected CRM',
        icon: 'crm',
        url: '/crm/sync',
        color: 'purple'
      },
      {
        id: 'view-analytics',
        title: 'View Analytics',
        description: 'Detailed performance analytics',
        icon: 'analytics',
        url: '/analytics',
        color: 'orange'
      },
      {
        id: 'manage-tags',
        title: 'Manage Tags',
        description: 'Organize leads with tags',
        icon: 'tags',
        url: '/tags',
        color: 'indigo'
      },
      {
        id: 'settings',
        title: 'Settings',
        description: 'Configure your preferences',
        icon: 'settings',
        url: '/settings',
        color: 'gray'
      }
    ];

    res.json(actions);
  } catch (error) {
    console.error('Quick actions error:', error);
    res.status(500).json({ error: 'Failed to get quick actions' });
  }
});

// @route   GET /api/dashboard/alerts
// @desc    Get system alerts and notifications
// @access  Private
router.get('/alerts', auth, async (req, res) => {
  try {
    const alerts = [];

    // Check for failed scraping jobs
    const failedJobs = await ScrapingConfig.findAll({
      where: {
        user_id: req.user.id,
        lastRun: {
          [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        },
        isActive: true
      }
    });

    if (failedJobs.length > 0) {
      alerts.push({
        id: 'failed-scraping',
        type: 'warning',
        title: 'Scraping Jobs Failed',
        message: `${failedJobs.length} scraping configuration(s) have failed to run recently`,
        action: 'Check your scraping configurations',
        url: '/scraping'
      });
    }

    // Check for CRM sync issues
    const crmStatus = await getCRMStatus(req.user.id);
    if (crmStatus.hubspot.isConnected && crmStatus.hubspot.lastSync) {
      const lastSync = new Date(crmStatus.hubspot.lastSync);
      if (Date.now() - lastSync.getTime() > 7 * 24 * 60 * 60 * 1000) { // 7 days
        alerts.push({
          id: 'crm-sync-warning',
          type: 'info',
          title: 'CRM Sync Warning',
          message: 'HubSpot sync hasn\'t run in over a week',
          action: 'Check CRM integration',
          url: '/crm'
        });
      }
    }

    // Check for low-quality leads
    const leadQuality = await analyticsService.getLeadQualityMetrics(req.user.id, 
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      new Date()
    );

    if (leadQuality.qualityScore < 0.6) {
      alerts.push({
        id: 'low-quality-leads',
        type: 'warning',
        title: 'Low Lead Quality',
        message: 'Recent leads have low data quality scores',
        action: 'Review scraping sources and data extraction',
        url: '/analytics'
      });
    }

    res.json({
      alerts,
      total: alerts.length,
      critical: alerts.filter(a => a.type === 'error').length,
      warnings: alerts.filter(a => a.type === 'warning').length,
      info: alerts.filter(a => a.type === 'info').length
    });

  } catch (error) {
    console.error('Dashboard alerts error:', error);
    res.status(500).json({ error: 'Failed to get dashboard alerts' });
  }
});

// Helper function to get CRM integration status
async function getCRMStatus(userId) {
  try {
    const [hubspotMetrics, salesforceMetrics] = await Promise.all([
      hubspotService.getHubSpotMetrics(userId, '30d').catch(() => ({ totalSynced: 0, lastSync: null })),
      salesforceService.getSalesforceMetrics(userId, '30d').catch(() => ({ totalSynced: 0, lastSync: null }))
    ]);

    return {
      hubspot: {
        isConnected: !!process.env.HUBSPOT_ACCESS_TOKEN,
        lastSync: hubspotMetrics.lastSync,
        totalSynced: hubspotMetrics.totalSynced || 0
      },
      salesforce: {
        isConnected: !!process.env.SALESFORCE_ACCESS_TOKEN,
        lastSync: salesforceMetrics.lastSync,
        totalSynced: salesforceMetrics.totalSynced || 0
      },
      totalSynced: (hubspotMetrics.totalSynced || 0) + (salesforceMetrics.totalSynced || 0)
    };
  } catch (error) {
    console.error('CRM status error:', error);
    return {
      hubspot: { isConnected: false, lastSync: null, totalSynced: 0 },
      salesforce: { isConnected: false, lastSync: null, totalSynced: 0 },
      totalSynced: 0
    };
  }
}

// Helper function to get export statistics
async function getExportStats(userId, startDate, endDate) {
  try {
    // This would typically come from an ExportHistory model
    // For now, return placeholder data
    return {
      pending: 0,
      completed: 0,
      totalSize: 0
    };
  } catch (error) {
    console.error('Export stats error:', error);
    return {
      pending: 0,
      completed: 0,
      totalSize: 0
    };
  }
}

module.exports = router;
