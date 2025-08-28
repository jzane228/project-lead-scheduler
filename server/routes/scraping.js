const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { ScrapingConfig, User } = require('../models');
const SchedulerService = require('../services/schedulerService');

// Initialize scheduler service
const schedulerService = new SchedulerService();

// @route   GET /api/scraping/configs
// @desc    Get all scraping configurations for user
// @access  Private
router.get('/configs', auth, async (req, res) => {
  try {
    const configs = await ScrapingConfig.findAll({
      where: { user_id: req.user.userId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'subscription_tier', 'max_scraping_configs']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ configs });
  } catch (error) {
    console.error('Error fetching scraping configs:', error);
    res.status(500).json({ error: 'Failed to fetch scraping configurations' });
  }
});

// @route   GET /api/scraping/progress/:jobId
// @desc    Get progress for a specific scraping job
// @access  Private
router.get('/progress/:jobId', auth, async (req, res) => {
  try {
    const { jobId } = req.params;
    console.log(`🔍 PROGRESS REQUEST: Looking for jobId: ${jobId}`);

    // Get progress from scheduler service
    const progress = schedulerService.getJobProgress(jobId);
    console.log(`📊 PROGRESS RESPONSE: Found progress for ${jobId}:`, progress ? 'YES' : 'NO');

    if (!progress) {
      // Debug: List all active jobs
      const activeJobs = schedulerService.getActiveJobsForUser(req.user.userId);
      console.log(`🔍 ACTIVE JOBS for user ${req.user.userId}:`, activeJobs.map(job => ({
        jobId: job.jobId,
        configName: job.configName,
        stage: job.progress.stage,
        percentage: job.progress.percentage
      })));

      return res.json({
        stage: 'unknown',
        progress: 0,
        total: 1,
        percentage: 0,
        message: `Job ${jobId} not found or completed. Active jobs: ${activeJobs.length}`
      });
    }

    console.log(`✅ RETURNING PROGRESS: ${progress.stage} - ${progress.percentage}% - ${progress.message}`);
    res.json(progress);
  } catch (error) {
    console.error('❌ Error fetching progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// @route   GET /api/scraping/debug-leads
// @desc    Debug endpoint to check recent leads in database
// @access  Private
router.get('/debug-leads', auth, async (req, res) => {
  try {
    const { Lead } = require('../models');

    // Get all leads for this user
    const allLeads = await Lead.findAll({
      where: { user_id: req.user.userId },
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'title', 'url', 'createdAt', 'confidence', 'company', 'description']
    });

    // Get leads from last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLeads = allLeads.filter(lead => lead.createdAt > last24Hours);

    console.log(`🔍 DEBUG: User ${req.user.userId} has ${allLeads.length} total leads, ${recentLeads.length} from last 24h`);

    res.json({
      totalLeads: allLeads.length,
      recentLeads: recentLeads.slice(0, 20).map(lead => ({
        id: lead.id,
        title: lead.title,
        url: lead.url,
        createdAt: lead.createdAt,
        confidence: lead.confidence,
        company: lead.company,
        description: lead.description?.substring(0, 100) + '...'
      })),
      allRecentTitles: recentLeads.map(lead => lead.title)
    });
  } catch (error) {
    console.error('Error fetching debug leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// @route   GET /api/scraping/configs-auth
// @desc    Get all scraping configurations for user
// @access  Private
router.get('/configs-auth', auth, async (req, res) => {
  try {
    const configs = await ScrapingConfig.findAll({
      where: { user_id: req.user.userId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'subscription_tier', 'max_scraping_configs']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ configs });
  } catch (error) {
    console.error('Error fetching scraping configs:', error);
    res.status(500).json({ error: 'Failed to fetch configurations' });
  }
});

// @route   POST /api/scraping/configs
// @desc    Create new scraping configuration
// @access  Private
router.post('/configs', auth, async (req, res) => {
  try {
    const {
      name,
      description,
      industry_type,
      keywords,
      sources,
      frequency,
      max_results_per_run,
      location,
      search_query,
      is_active = true
    } = req.body;

    // Validate required fields
    if (!name || !keywords || keywords.length === 0) {
      return res.status(400).json({ 
        error: 'Name and at least one keyword are required',
        fieldErrors: [
          { field: 'name', message: !name ? 'Name is required' : null },
          { field: 'keywords', message: !keywords || keywords.length === 0 ? 'At least one keyword is required' : null }
        ].filter(err => err.message)
      });
    }

    // Check user's subscription limits
    const user = await User.findByPk(req.user.userId);
    const currentConfigs = await ScrapingConfig.count({
      where: { user_id: req.user.userId, is_active: true }
    });

    if (currentConfigs >= user.max_scraping_configs) {
      return res.status(400).json({
        error: `You have reached your limit of ${user.max_scraping_configs} active configurations. Please upgrade your plan or deactivate existing configurations.`,
        fieldErrors: [
          { field: 'general', message: 'Subscription limit reached' }
        ]
      });
    }

    // Create the configuration
    const config = await ScrapingConfig.create({
      name,
      description,
      industry_type,
      keywords,
      sources: sources || [],
      frequency: frequency || 'daily',
      max_results_per_run: max_results_per_run || 50,
      location,
      search_query,
      is_active,
      user_id: req.user.userId,
      next_run: calculateNextRun(frequency)
    });

    // Add to scheduler if active
    if (is_active) {
      await schedulerService.addConfiguration(config);
    }

    res.status(201).json({ 
      message: 'Configuration created successfully',
      config 
    });
  } catch (error) {
    console.error('Error creating scraping config:', error);
    
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      const fieldErrors = error.errors.map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({ 
        error: 'Validation failed',
        fieldErrors,
        message: 'Please fix the highlighted fields below'
      });
    }
    
    // Handle other errors
    res.status(500).json({ 
      error: 'Failed to create configuration',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

// @route   PUT /api/scraping/configs/:id
// @desc    Update scraping configuration
// @access  Private
router.put('/configs/:id', auth, async (req, res) => {
  try {
    const config = await ScrapingConfig.findOne({
      where: { id: req.params.id, user_id: req.user.userId }
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    const {
      name,
      description,
      industry_type,
      keywords,
      sources,
      frequency,
      max_results_per_run,
      location,
      search_query,
      is_active
    } = req.body;

    // Validate required fields
    if (!name || !keywords || keywords.length === 0) {
      return res.status(400).json({ 
        error: 'Name and at least one keyword are required',
        fieldErrors: [
          { field: 'name', message: !name ? 'Name is required' : null },
          { field: 'keywords', message: !keywords || keywords.length === 0 ? 'At least one keyword is required' : null }
        ].filter(err => err.message)
      });
    }

    // Update the configuration
    await config.update({
      name,
      description,
      industry_type,
      keywords,
      sources: sources || [],
      frequency: frequency || 'daily',
      max_results_per_run: max_results_per_run || 50,
      location,
      search_query,
      is_active,
      next_run: calculateNextRun(frequency)
    });

    // Update scheduler
    await schedulerService.updateConfiguration(config);

    res.json({ 
      message: 'Configuration updated successfully',
      config 
    });
  } catch (error) {
    console.error('Error updating scraping config:', error);
    
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      const fieldErrors = error.errors.map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({ 
        error: 'Validation failed',
        fieldErrors,
        message: 'Please fix the highlighted fields below'
      });
    }
    
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// @route   PATCH /api/scraping/configs/:id/toggle
// @desc    Toggle configuration active status
// @access  Private
router.patch('/configs/:id/toggle', auth, async (req, res) => {
  try {
    const { is_active } = req.body;
    const config = await ScrapingConfig.findOne({
      where: { id: req.params.id, user_id: req.user.userId }
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    // Check limits when activating
    if (is_active) {
      const user = await User.findByPk(req.user.userId);
      const activeConfigs = await ScrapingConfig.count({
        where: { user_id: req.user.userId, is_active: true }
      });

      if (activeConfigs >= user.max_scraping_configs) {
        return res.status(400).json({
          error: `You have reached your limit of ${user.max_scraping_configs} active configurations. Please upgrade your plan or deactivate existing configurations.`
        });
      }
    }

    await config.update({ 
      is_active,
      next_run: is_active ? calculateNextRun(config.frequency) : null
    });

    // Update scheduler
    await schedulerService.updateConfiguration(config);

    res.json({ 
      message: 'Configuration status updated',
      config 
    });
  } catch (error) {
    console.error('Error toggling scraping config:', error);
    res.status(500).json({ error: 'Failed to update configuration status' });
  }
});

// @route   DELETE /api/scraping/configs/:id
// @desc    Delete scraping configuration
// @access  Private
router.delete('/configs/:id', auth, async (req, res) => {
  try {
    const config = await ScrapingConfig.findOne({
      where: { id: req.params.id, user_id: req.user.userId }
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    // Remove from scheduler
    await schedulerService.removeConfiguration(config.id);

    await config.destroy();

    res.json({ message: 'Configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting scraping config:', error);
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
});

// @route   GET /api/scraping/configs/:id
// @desc    Get specific scraping configuration
// @access  Private
router.get('/configs/:id', auth, async (req, res) => {
  try {
    const config = await ScrapingConfig.findOne({
      where: { id: req.params.id, user_id: req.user.userId },
      include: [
        {
          model: User,
          attributes: ['id', 'email', 'subscription_tier', 'max_scraping_configs']
        }
      ]
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    res.json({ config });
  } catch (error) {
    console.error('Error fetching scraping config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// @route   POST /api/scraping/configs/:id/run
// @desc    Manually run a scraping configuration
// @access  Private
router.post('/configs/:id/run', auth, async (req, res) => {
  try {
    const config = await ScrapingConfig.findOne({
      where: { id: req.params.id, user_id: req.user.userId }
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    if (!config.is_active) {
      return res.status(400).json({ error: 'Configuration is not active' });
    }

    // Run scraping job immediately
    const result = await schedulerService.runConfigurationNow(config.id);
    
    res.json({ 
      message: 'Scraping job started',
      result
    });
  } catch (error) {
    console.error('Error running scraping config:', error);
    res.status(500).json({ error: 'Failed to start scraping job' });
  }
});

// @route   GET /api/scraping/stats
// @desc    Get scraping statistics for user
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const totalConfigs = await ScrapingConfig.count({
      where: { user_id: req.user.userId }
    });

    const activeConfigs = await ScrapingConfig.count({
      where: { user_id: req.user.userId, is_active: true }
    });

    const configsByFrequency = await ScrapingConfig.findAll({
      where: { user_id: req.user.userId, is_active: true },
      attributes: ['frequency', [ScrapingConfig.sequelize.fn('COUNT', ScrapingConfig.sequelize.col('id')), 'count']],
      group: ['frequency']
    });

    // Get scheduler job status
    const scheduledJobs = schedulerService.getScheduledJobs();

    const stats = {
      totalConfigs,
      activeConfigs,
      configsByFrequency: configsByFrequency.reduce((acc, item) => {
        acc[item.frequency] = parseInt(item.dataValues.count);
        return acc;
      }, {}),
      scheduledJobs,
      lastRun: null, // TODO: Get from actual scraping history
      next_run: null  // TODO: Get from scheduler
    };

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching scraping stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Helper function to calculate next run time
function calculateNextRun(frequency) {
  const now = new Date();
  let next_run = new Date(now);

  switch (frequency) {
    case 'hourly':
      next_run.setHours(now.getHours() + 1, 0, 0, 0);
      break;
    case 'daily':
      next_run.setDate(now.getDate() + 1);
      next_run.setHours(9, 0, 0, 0); // 9 AM next day
      break;
    case 'weekly':
      next_run.setDate(now.getDate() + 7);
      next_run.setHours(9, 0, 0, 0);
      break;
    case 'monthly':
      next_run.setMonth(now.getMonth() + 1);
      next_run.setHours(9, 0, 0, 0);
      break;
    default:
      next_run.setDate(now.getDate() + 1);
      next_run.setHours(9, 0, 0, 0);
  }

  return next_run;
}

// @route   POST /api/scraping/ensure-tables
// @desc    Ensure all required database tables exist
// @access  Private
router.post('/ensure-tables', auth, async (req, res) => {
  try {
    console.log('🔧 Ensuring database tables exist...');

    const initializeDatabase = require('../databaseInit');
    await initializeDatabase();

    res.json({
      success: true,
      message: 'Database tables verified and created successfully'
    });
  } catch (error) {
    console.error('❌ Error ensuring tables:', error);
    res.status(500).json({
      error: 'Failed to ensure database tables',
      details: error.message
    });
  }
});

// @route   GET /api/scraping/diagnostics
// @desc    Get database and system diagnostics
// @access  Private
router.get('/diagnostics', auth, async (req, res) => {
  try {
    const { sequelize, User, Column, Contact, Lead } = require('../models');

    const diagnostics = {
      database: {
        connected: false,
        tables: {}
      },
      counts: {}
    };

    // Check database connection
    try {
      await sequelize.authenticate();
      diagnostics.database.connected = true;
    } catch (error) {
      diagnostics.database.error = error.message;
    }

    // Check table existence
    const tables = ['Users', 'Leads', 'Columns', 'Contacts', 'LeadColumns'];
    for (const table of tables) {
      try {
        await sequelize.query(`SELECT 1 FROM "${table}" LIMIT 1`);
        diagnostics.database.tables[table] = 'exists';
      } catch (error) {
        diagnostics.database.tables[table] = 'missing';
      }
    }

    // Get record counts
    try {
      diagnostics.counts.users = await User.count();
      diagnostics.counts.leads = await Lead.count();
      diagnostics.counts.columns = await Column.count();
      diagnostics.counts.contacts = await Contact.count();
    } catch (error) {
      diagnostics.counts.error = error.message;
    }

    res.json({
      success: true,
      diagnostics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Diagnostics error:', error);
    res.status(500).json({
      error: 'Failed to get diagnostics',
      details: error.message
    });
  }
});

// @route   GET /api/scraping/health
// @desc    Get scraping service health report
// @access  Private
router.get('/health', auth, async (req, res) => {
  try {
    const { EnhancedScrapingService } = require('../services/enhancedScrapingService');
    const service = new EnhancedScrapingService();
    const healthReport = service.getHealthReport();

    res.json({
      success: true,
      health: healthReport,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      error: 'Failed to get health report',
      details: error.message
    });
  }
});

// @route   GET /api/scraping/error-recovery
// @desc    Get error recovery analysis and recommendations
// @access  Private
router.get('/error-recovery', auth, async (req, res) => {
  try {
    const { EnhancedScrapingService } = require('../services/enhancedScrapingService');
    const service = new EnhancedScrapingService();
    const errorRecovery = service.getErrorRecovery();

    res.json({
      success: true,
      errorRecovery,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error recovery check error:', error);
    res.status(500).json({
      error: 'Failed to get error recovery report',
      details: error.message
    });
  }
});

// @route   POST /api/scraping/recovery
// @desc    Attempt error recovery
// @access  Private
router.post('/recovery', auth, async (req, res) => {
  try {
    const { EnhancedScrapingService } = require('../services/enhancedScrapingService');
    const service = new EnhancedScrapingService();
    const recovery = await service.attemptRecovery();

    res.json({
      success: true,
      recovery,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Recovery attempt error:', error);
    res.status(500).json({
      error: 'Failed to attempt recovery',
      details: error.message
    });
  }
});

// @route   GET /api/scraping/engine-status
// @desc    Get status of all search engines
// @access  Private
router.get('/engine-status', auth, async (req, res) => {
  try {
    const { EnhancedScrapingService } = require('../services/enhancedScrapingService');
    const service = new EnhancedScrapingService();
    const engineStatus = service.getEngineStatus();

    res.json({
      success: true,
      engines: engineStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Engine status error:', error);
    res.status(500).json({
      error: 'Failed to get engine status',
      details: error.message
    });
  }
});

// @route   POST /api/scraping/toggle-deepseek
// @desc    Enable/disable Deepseek AI for cost control
// @access  Private
router.post('/toggle-deepseek', auth, async (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'enabled must be a boolean value',
        usage: 'POST /api/scraping/toggle-deepseek with body: { "enabled": true }'
      });
    }

    // Update environment variable (this will persist until server restart)
    process.env.DEEPSEEK_ENABLED = enabled.toString();

    // Update the service instances
    const { EnhancedScrapingService } = require('../services/enhancedScrapingService');
    const { DataExtractionService } = require('../services/dataExtractionService');

    // Create temporary instances to update their status
    const scrapingService = new EnhancedScrapingService();
    const extractionService = new DataExtractionService();

    if (enabled) {
      scrapingService.deepseekApiKey = process.env.DEEPSEEK_API_KEY;
      extractionService.deepseekApiKey = process.env.DEEPSEEK_API_KEY;
      console.log('✅ DEEPSEEK AI ENABLED - Advanced analysis will incur costs');
    } else {
      scrapingService.deepseekApiKey = null;
      extractionService.deepseekApiKey = null;
      console.log('🚫 DEEPSEEK AI DISABLED - Pattern-based extraction only');
    }

    res.json({
      success: true,
      deepseekEnabled: enabled,
      message: enabled
        ? 'Deepseek AI enabled - advanced analysis will incur costs'
        : 'Deepseek AI disabled - using pattern-based extraction only',
      warning: enabled
        ? '⚠️ WARNING: Deepseek API calls will incur costs. Ensure you have sufficient balance.'
        : '✅ Cost control active - no AI costs will be incurred',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Deepseek toggle error:', error);
    res.status(500).json({
      error: 'Failed to toggle Deepseek',
      details: error.message
    });
  }
});

// @route   GET /api/scraping/deepseek-status
// @desc    Get current Deepseek AI status
// @access  Private
router.get('/deepseek-status', auth, async (req, res) => {
  try {
    const apiKeyExists = !!process.env.DEEPSEEK_API_KEY;
    const currentlyEnabled = process.env.DEEPSEEK_ENABLED === 'true';

    res.json({
      success: true,
      deepseekAvailable: apiKeyExists,
      deepseekEnabled: currentlyEnabled,
      apiKeyConfigured: apiKeyExists,
      status: currentlyEnabled ? 'enabled' : 'disabled',
      message: currentlyEnabled
        ? 'Deepseek AI is enabled and will incur costs'
        : 'Deepseek AI is disabled - cost control active',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Deepseek status error:', error);
    res.status(500).json({
      error: 'Failed to get Deepseek status',
      details: error.message
    });
  }
});

// @route   POST /api/scraping/run-tests
// @desc    Run comprehensive scraping system tests
// @access  Private
router.post('/run-tests', auth, async (req, res) => {
  try {
    console.log('🧪 Running comprehensive scraping system tests...');

    const ScrapingSystemTester = require('../test_enhanced_scraping');
    const tester = new ScrapingSystemTester();
    const results = await tester.runAllTests();

    res.json({
      success: true,
      testResults: results,
      summary: {
        passed: results.passed,
        failed: results.failed,
        total: results.passed + results.failed,
        successRate: `${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    res.status(500).json({
      error: 'Test execution failed',
      details: error.message
    });
  }
});

// @route   POST /api/scraping/test-custom-columns
// @desc    Test custom columns integration
// @access  Private
router.post('/test-custom-columns', auth, async (req, res) => {
  try {
    console.log('🧪 Testing custom columns integration...');

    // Get user's custom columns
    const { Column, Lead } = require('../models');
    const customColumns = await Column.findVisibleByUser(req.user.userId);
    console.log(`📊 Found ${customColumns.length} custom columns`);

    // Test article content
    const testContent = `
    Tech Startup Raises $15 Million in Series A Funding

    San Francisco - InnovateLab, a cutting-edge AI startup, announced today that it has secured $15 million in Series A funding. The round was led by Sequoia Capital with participation from Andreessen Horowitz.

    CEO Jane Rodriguez stated, "We're thrilled to have the support of these world-class investors. This funding will allow us to expand our team from 25 to 75 employees and accelerate our product development timeline."

    The company plans to use the funds for:
    - Hiring 50 new engineers and designers
    - Expanding office space to 10,000 square feet
    - Launching new AI features by Q3 2024
    - International expansion to Europe and Asia

    Contact Information:
    - CEO: Jane Rodriguez (jane@innovatelab.com)
    - Phone: (415) 555-0123
    - Investor Relations: Michael Chen (michael@innovatelab.com)

    For press inquiries, contact:
    Sarah Williams
    Head of Communications
    sarah.williams@innovatelab.com
    Phone: (415) 555-0124

    Website: www.innovatelab.com
    `;

    const EnhancedScrapingService = require('../services/enhancedScrapingService');
    const scrapingService = new EnhancedScrapingService();

    // Test extraction
    let extractedData = {};
    if (customColumns.length > 0) {
      console.log('🤖 Testing AI extraction with custom columns...');
      extractedData = await scrapingService.extractWithAI(testContent, {}, customColumns);
    } else {
      console.log('📊 No custom columns found, using standard extraction...');
      extractedData = scrapingService.dataExtractionService.extractAllData(testContent);
    }

    // Test lead creation
    const testLeadData = {
      title: 'Test Tech Startup Funding',
      description: 'AI startup raises $15M in Series A funding',
      company: 'InnovateLab',
      url: 'https://example.com/test-article',
      publishedDate: new Date(),
      extractedData: {
        ...extractedData,
        aiUsed: customColumns.length > 0
      }
    };

    const savedLeads = await scrapingService.saveLeads([testLeadData], req.user.userId, null, customColumns);

    if (savedLeads.length > 0) {
      const savedLead = savedLeads[0];

      // Return test results
      res.json({
        success: true,
        message: 'Custom columns integration test completed',
        results: {
          customColumnsCount: customColumns.length,
          extractedData,
          savedLead: {
            id: savedLead.id,
            custom_fields: savedLead.custom_fields
          },
          customFieldsExtracted: customColumns.map(col => ({
            name: col.name,
            field_key: col.field_key,
            extracted_value: extractedData[col.field_key],
            saved_value: savedLead.custom_fields[col.field_key]
          }))
        }
      });
    } else {
      res.status(500).json({ error: 'Failed to save test lead' });
    }

  } catch (error) {
    console.error('❌ Custom columns test failed:', error);
    res.status(500).json({
      error: 'Custom columns test failed',
      details: error.message
    });
  }
});

module.exports = router;
