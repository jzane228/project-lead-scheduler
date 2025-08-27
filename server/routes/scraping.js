const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { ScrapingConfig, User } = require('../models');
const SchedulerService = require('../services/schedulerService');

// Initialize scheduler service
const schedulerService = new SchedulerService();

// @route   GET /api/scraping/configs
// @desc    Get basic scraping info (no auth required for testing)
// @access  Public (for testing)
router.get('/configs', async (req, res) => {
  try {
    res.json({
      message: 'Scraping configs endpoint working!',
      note: 'This endpoint requires authentication for full data',
      availableEndpoints: [
        '/api/scraping/configs (requires auth)',
        '/api/scraping/configs/:id (requires auth)',
        '/api/scraping/stats (requires auth)'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Scraping configs error:', error);
    res.status(500).json({ error: 'Server error' });
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

module.exports = router;
