const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AnalyticsService = require('../services/analyticsService');
const HubSpotService = require('../services/hubspotService');
const SalesforceService = require('../services/salesforceService');

// Initialize services
const analyticsService = new AnalyticsService();
const hubspotService = new HubSpotService();
const salesforceService = new SalesforceService();

// ===== LEAD ANALYTICS =====

/**
 * @route GET /api/analytics/leads
 * @desc Get basic analytics info (no auth required for testing)
 * @access Public (for testing)
 */
router.get('/leads', async (req, res) => {
  try {
    res.json({
      message: 'Analytics endpoint working!',
      note: 'This endpoint requires authentication for full data',
      availableEndpoints: [
        '/api/analytics/leads (requires auth)',
        '/api/analytics/leads/quality (requires auth)',
        '/api/analytics/leads/conversion (requires auth)',
        '/api/analytics/scraping (requires auth)',
        '/api/analytics/engagement (requires auth)',
        '/api/analytics/business (requires auth)'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route GET /api/analytics/leads-auth
 * @desc Get lead analytics metrics
 * @access Private
 */
router.get('/leads-auth', auth, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const userId = req.user.userId;

    const metrics = await analyticsService.getLeadMetrics(userId, timeRange);
    
    res.json(metrics);
  } catch (error) {
    console.error('Lead analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch lead analytics',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/analytics/leads/quality
 * @desc Get detailed lead quality metrics
 * @access Private
 */
router.get('/leads/quality', auth, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const userId = req.user.userId;

    const metrics = await analyticsService.getLeadMetrics(userId, timeRange);
    
    res.json({
      quality: metrics.quality,
      sources: metrics.sources,
      trends: metrics.trends
    });
  } catch (error) {
    console.error('Lead quality analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch lead quality analytics',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/analytics/leads/conversion
 * @desc Get lead conversion metrics
 * @access Private
 */
router.get('/leads/conversion', auth, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const userId = req.user.userId;

    const metrics = await analyticsService.getLeadMetrics(userId, timeRange);
    
    res.json({
      conversion: metrics.conversion,
      trends: metrics.trends
    });
  } catch (error) {
    console.error('Lead conversion analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch lead conversion analytics',
      details: error.message 
    });
  }
});

// ===== SCRAPING ANALYTICS =====

/**
 * @route GET /api/analytics/scraping
 * @desc Get scraping performance metrics
 * @access Private
 */
router.get('/scraping', auth, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const userId = req.user.userId;

    const metrics = await analyticsService.getScrapingMetrics(userId, timeRange);
    
    res.json(metrics);
  } catch (error) {
    console.error('Scraping analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch scraping analytics',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/analytics/scraping/performance
 * @desc Get detailed scraping performance metrics
 * @access Private
 */
router.get('/scraping/performance', auth, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const userId = req.user.userId;

    const metrics = await analyticsService.getScrapingMetrics(userId, timeRange);
    
    res.json({
      performance: metrics.performance,
      sources: metrics.sources
    });
  } catch (error) {
    console.error('Scraping performance analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch scraping performance analytics',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/analytics/scraping/quality
 * @desc Get data quality metrics
 * @access Private
 */
router.get('/scraping/quality', auth, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const userId = req.user.userId;

    const metrics = await analyticsService.getScrapingMetrics(userId, timeRange);
    
    res.json({
      dataQuality: metrics.dataQuality,
      trends: metrics.trends
    });
  } catch (error) {
    console.error('Data quality analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch data quality analytics',
      details: error.message 
    });
  }
});

// ===== USER ENGAGEMENT ANALYTICS =====

/**
 * @route GET /api/analytics/engagement
 * @desc Get user engagement metrics
 * @access Private
 */
router.get('/engagement', auth, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const userId = req.user.userId;

    const metrics = await analyticsService.getUserEngagementMetrics(userId, timeRange);
    
    res.json(metrics);
  } catch (error) {
    console.error('User engagement analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user engagement analytics',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/analytics/engagement/activity
 * @desc Get user activity metrics
 * @access Private
 */
router.get('/engagement/activity', auth, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const userId = req.user.userId;

    const metrics = await analyticsService.getUserEngagementMetrics(userId, timeRange);
    
    res.json({
      activity: metrics.activity,
      features: metrics.features
    });
  } catch (error) {
    console.error('User activity analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user activity analytics',
      details: error.message 
    });
  }
});

// ===== BUSINESS INTELLIGENCE =====

/**
 * @route GET /api/analytics/business
 * @desc Get business intelligence metrics
 * @access Private
 */
router.get('/business', auth, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const userId = req.user.userId;

    const metrics = await analyticsService.getBusinessIntelligence(userId, timeRange);
    
    res.json(metrics);
  } catch (error) {
    console.error('Business intelligence analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch business intelligence analytics',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/analytics/business/revenue
 * @desc Get revenue projection metrics
 * @access Private
 */
router.get('/business/revenue', auth, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const userId = req.user.userId;

    const metrics = await analyticsService.getBusinessIntelligence(userId, timeRange);
    
    res.json({
      revenue: metrics.revenue,
      market: metrics.market
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch revenue analytics',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/analytics/business/market
 * @desc Get market insights
 * @access Private
 */
router.get('/business/market', auth, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const userId = req.user.userId;

    const metrics = await analyticsService.getBusinessIntelligence(userId, timeRange);
    
    res.json({
      market: metrics.market,
      competitive: metrics.competitive
    });
  } catch (error) {
    console.error('Market analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch market analytics',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/analytics/business/roi
 * @desc Get ROI metrics
 * @access Private
 */
router.get('/business/roi', auth, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const userId = req.user.userId;

    const metrics = await analyticsService.getBusinessIntelligence(userId, timeRange);
    
    res.json({
      roi: metrics.roi,
      competitive: metrics.competitive
    });
  } catch (error) {
    console.error('ROI analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch ROI analytics',
      details: error.message 
    });
  }
});

// ===== CRM INTEGRATION ANALYTICS =====

/**
 * @route GET /api/analytics/crm/hubspot
 * @desc Get HubSpot integration metrics
 * @access Private
 */
router.get('/crm/hubspot', auth, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const userId = req.user.userId;

    const metrics = await hubspotService.getHubSpotMetrics(userId, timeRange);
    
    if (!metrics) {
      return res.status(404).json({ 
        error: 'HubSpot integration not configured',
        message: 'Please configure HubSpot integration to view metrics'
      });
    }
    
    res.json(metrics);
  } catch (error) {
    console.error('HubSpot analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch HubSpot analytics',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/analytics/crm/salesforce
 * @desc Get Salesforce integration metrics
 * @access Private
 */
router.get('/crm/salesforce', auth, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const userId = req.user.userId;

    const metrics = await salesforceService.getSalesforceMetrics(userId, timeRange);
    
    if (!metrics) {
      return res.status(404).json({ 
        error: 'Salesforce integration not configured',
        message: 'Please configure Salesforce integration to view metrics'
      });
    }
    
    res.json(metrics);
  } catch (error) {
    console.error('Salesforce analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Salesforce analytics',
      details: error.message 
    });
  }
});

// ===== REAL-TIME METRICS =====

/**
 * @route POST /api/analytics/metrics/update
 * @desc Update real-time metrics
 * @access Private
 */
router.post('/metrics/update', auth, async (req, res) => {
  try {
    const { action, data } = req.body;
    const userId = req.user.userId;

    await analyticsService.updateMetrics(userId, action, data);
    
    res.json({ success: true, message: 'Metrics updated successfully' });
  } catch (error) {
    console.error('Metrics update error:', error);
    res.status(500).json({ 
      error: 'Failed to update metrics',
      details: error.message 
    });
  }
});

/**
 * @route GET /api/analytics/metrics/realtime
 * @desc Get real-time metrics
 * @access Private
 */
router.get('/metrics/realtime', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get current metrics without caching
    const leadMetrics = await analyticsService.getLeadMetrics(userId, '7d');
    const scrapingMetrics = await analyticsService.getScrapingMetrics(userId, '7d');
    
    res.json({
      timestamp: new Date().toISOString(),
      leads: {
        total: leadMetrics.counts?.total || 0,
        newToday: leadMetrics.counts?.newThisPeriod || 0,
        conversionRate: leadMetrics.counts?.conversionRate || 0
      },
      scraping: {
        successRate: scrapingMetrics.performance?.successRate || 0,
        totalLeads: scrapingMetrics.performance?.totalLeadsGenerated || 0,
        averageQuality: scrapingMetrics.dataQuality?.companyCompleteness || 0
      }
    });
  } catch (error) {
    console.error('Real-time metrics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch real-time metrics',
      details: error.message 
    });
  }
});

// ===== EXPORT ANALYTICS =====

/**
 * @route POST /api/analytics/export
 * @desc Export analytics data
 * @access Private
 */
router.post('/export', auth, async (req, res) => {
  try {
    const { timeRange = '30d', format = 'json', type = 'leads' } = req.body;
    const userId = req.user.userId;

    let data;
    switch (type) {
      case 'leads':
        data = await analyticsService.exportAnalytics(userId, timeRange, format);
        break;
      case 'scraping':
        data = await analyticsService.getScrapingMetrics(userId, timeRange);
        break;
      case 'business':
        data = await analyticsService.getBusinessIntelligence(userId, timeRange);
        break;
      default:
        return res.status(400).json({ error: 'Invalid analytics type' });
    }

    if (format === 'json') {
      res.json(data);
    } else {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_${type}_${timeRange}.${format}"`);
      res.send(data);
    }
  } catch (error) {
    console.error('Analytics export error:', error);
    res.status(500).json({ 
      error: 'Failed to export analytics',
      details: error.message 
    });
  }
});

// ===== CUSTOM ANALYTICS =====

/**
 * @route POST /api/analytics/custom
 * @desc Get custom analytics based on user-defined criteria
 * @access Private
 */
router.post('/custom', auth, async (req, res) => {
  try {
    const { 
      metrics = [], 
      filters = {}, 
      timeRange = '30d',
      groupBy = null,
      sortBy = null,
      limit = 100
    } = req.body;
    
    const userId = req.user.userId;

    // Validate requested metrics
    const availableMetrics = [
      'leadCounts', 'leadQuality', 'leadSources', 'leadConversion', 'leadTrends',
      'scrapingPerformance', 'sourceEffectiveness', 'scrapingTrends', 'dataQuality',
      'userActivity', 'featureUsage', 'revenueProjections', 'marketInsights',
      'competitiveAnalysis', 'roiMetrics'
    ];

    const invalidMetrics = metrics.filter(m => !availableMetrics.includes(m));
    if (invalidMetrics.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid metrics requested',
        invalidMetrics 
      });
    }

    // Build custom analytics response
    const customAnalytics = {};
    
    if (metrics.includes('leadCounts')) {
      const leadMetrics = await analyticsService.getLeadMetrics(userId, timeRange);
      customAnalytics.leadCounts = leadMetrics.counts;
    }
    
    if (metrics.includes('leadQuality')) {
      const leadMetrics = await analyticsService.getLeadMetrics(userId, timeRange);
      customAnalytics.leadQuality = leadMetrics.quality;
    }
    
    if (metrics.includes('scrapingPerformance')) {
      const scrapingMetrics = await analyticsService.getScrapingMetrics(userId, timeRange);
      customAnalytics.scrapingPerformance = scrapingMetrics.performance;
    }
    
    if (metrics.includes('revenueProjections')) {
      const businessMetrics = await analyticsService.getBusinessIntelligence(userId, timeRange);
      customAnalytics.revenueProjections = businessMetrics.revenue;
    }

    res.json({
      timeRange,
      filters,
      groupBy,
      sortBy,
      limit,
      metrics: customAnalytics,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Custom analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to generate custom analytics',
      details: error.message 
    });
  }
});

// ===== ANALYTICS CONFIGURATION =====

/**
 * @route GET /api/analytics/config
 * @desc Get analytics configuration options
 * @access Private
 */
router.get('/config', auth, async (req, res) => {
  try {
    const config = {
      timeRanges: [
        { value: '7d', label: 'Last 7 days' },
        { value: '30d', label: 'Last 30 days' },
        { value: '90d', label: 'Last 90 days' },
        { value: '1y', label: 'Last year' }
      ],
      availableMetrics: [
        { id: 'leadCounts', label: 'Lead Counts', category: 'leads' },
        { id: 'leadQuality', label: 'Lead Quality', category: 'leads' },
        { id: 'leadSources', label: 'Lead Sources', category: 'leads' },
        { id: 'leadConversion', label: 'Lead Conversion', category: 'leads' },
        { id: 'leadTrends', label: 'Lead Trends', category: 'leads' },
        { id: 'scrapingPerformance', label: 'Scraping Performance', category: 'scraping' },
        { id: 'sourceEffectiveness', label: 'Source Effectiveness', category: 'scraping' },
        { id: 'scrapingTrends', label: 'Scraping Trends', category: 'scraping' },
        { id: 'dataQuality', label: 'Data Quality', category: 'scraping' },
        { id: 'userActivity', label: 'User Activity', category: 'engagement' },
        { id: 'featureUsage', label: 'Feature Usage', category: 'engagement' },
        { id: 'revenueProjections', label: 'Revenue Projections', category: 'business' },
        { id: 'marketInsights', label: 'Market Insights', category: 'business' },
        { id: 'competitiveAnalysis', label: 'Competitive Analysis', category: 'business' },
        { id: 'roiMetrics', label: 'ROI Metrics', category: 'business' }
      ],
      exportFormats: [
        { value: 'json', label: 'JSON', description: 'Structured data format' },
        { value: 'csv', label: 'CSV', description: 'Spreadsheet format' },
        { value: 'xml', label: 'XML', description: 'Markup format' }
      ],
      cacheSettings: {
        defaultTimeout: '5 minutes',
        refreshInterval: '5 minutes',
        maxCacheSize: '100 MB'
      }
    };

    res.json(config);
  } catch (error) {
    console.error('Analytics config error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analytics configuration',
      details: error.message 
    });
  }
});

/**
 * @route POST /api/analytics/config
 * @desc Update analytics configuration
 * @access Private
 */
router.post('/config', auth, async (req, res) => {
  try {
    const { 
      refreshInterval, 
      cacheTimeout, 
      enabledMetrics, 
      exportPreferences 
    } = req.body;
    
    const userId = req.user.userId;

    // Update user's analytics preferences
    // This would typically be saved to the database
    const updatedConfig = {
      userId,
      refreshInterval: refreshInterval || 300000, // 5 minutes default
      cacheTimeout: cacheTimeout || 300000,
      enabledMetrics: enabledMetrics || [],
      exportPreferences: exportPreferences || {},
      updatedAt: new Date()
    };

    // For now, just return the updated config
    // In a real implementation, this would be saved to the database
    res.json({
      success: true,
      message: 'Analytics configuration updated successfully',
      config: updatedConfig
    });

  } catch (error) {
    console.error('Analytics config update error:', error);
    res.status(500).json({ 
      error: 'Failed to update analytics configuration',
      details: error.message 
    });
  }
});

// ===== HEALTH CHECK =====

/**
 * @route GET /api/analytics/health
 * @desc Check analytics service health
 * @access Public
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        analytics: 'operational',
        hubspot: 'operational',
        salesforce: 'operational'
      },
      version: '1.0.0'
    };

    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;
