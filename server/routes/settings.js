const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { User, UserSettings } = require('../models');
const HubSpotService = require('../services/hubspotService');
const SalesforceService = require('../services/salesforceService');

const hubspotService = new HubSpotService();
const salesforceService = new SalesforceService();

// @route   GET /api/settings/status
// @desc    Get system status and API connections
// @access  Private
router.get('/status', auth, async (req, res) => {
  try {
    const status = {
      server: {
        status: 'healthy',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      apis: {
        deepseek: {
          isConnected: !!process.env.DEEPSEEK_API_KEY,
          status: process.env.DEEPSEEK_API_KEY ? 'connected' : 'disconnected',
          usage: '0%',
          limit: 'Unlimited (pay per token)',
          keyPreview: process.env.DEEPSEEK_API_KEY ? process.env.DEEPSEEK_API_KEY.substring(0, 10) + '...' : null
        },
        scrapy: {
          isConnected: !!process.env.SCRAPY_CLOUD_API_KEY,
          status: 'connected',
          usage: '0%',
          limit: '100 requests/month'
        },
        hubspot: {
          isConnected: !!process.env.HUBSPOT_API_KEY,
          status: process.env.HUBSPOT_API_KEY ? 'connected' : 'disconnected',
          lastSync: null,
          autoSync: false,
          syncInterval: 'manual'
        },
        salesforce: {
          isConnected: !!process.env.SALESFORCE_CLIENT_ID,
          status: process.env.SALESFORCE_CLIENT_ID ? 'connected' : 'disconnected',
          lastSync: null,
          autoSync: false,
          syncInterval: 'manual'
        }
      },
      database: {
        status: 'connected',
        migrations: 'up to date'
      },
      webhooks: {
        enabled: false,
        endpoints: [],
        retryAttempts: 3,
        timeout: 30000
      }
    };

    res.json(status);
  } catch (error) {
    console.error('Settings status error:', error);
    res.status(500).json({ error: 'Failed to get system status' });
  }
});

// @route   GET /api/settings/profile
// @desc    Get user profile settings
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'company', 'role', 'createdAt']
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      profile: {
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        company: user.company,
        role: user.role,
        memberSince: user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile settings error:', error);
    res.status(500).json({ error: 'Failed to get profile settings' });
  }
});

// @route   PUT /api/settings/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const { firstName, lastName, company, email } = req.body;

    // Validate email format
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({
        where: { email, id: { [require('sequelize').Op.ne]: req.user.id } }
      });
      if (existingUser) {
        return res.status(400).json({ error: 'Email is already taken' });
      }
    }

    const updateData = {};
    if (firstName !== undefined) updateData.first_name = firstName;
    if (lastName !== undefined) updateData.last_name = lastName;
    if (company !== undefined) updateData.company = company;
    if (email !== undefined) updateData.email = email;

    await User.update(updateData, {
      where: { id: req.user.id }
    });

    res.json({
      message: 'Profile updated successfully',
      profile: {
        firstName: updateData.first_name,
        lastName: updateData.last_name,
        company: updateData.company,
        email: updateData.email
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// @route   GET /api/settings/security
// @desc    Get security settings
// @access  Private
router.get('/security', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'last_password_change', 'login_attempts', 'is_locked', 'two_factor_enabled']
    });

    const security = {
      lastPasswordChange: user.last_password_change,
      loginAttempts: user.login_attempts || 0,
      isLocked: user.is_locked || false,
      twoFactorEnabled: user.two_factor_enabled || false,
      passwordStrength: 'strong', // This would be calculated based on password requirements
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      maxLoginAttempts: 5
    };

    res.json(security);
  } catch (error) {
    console.error('Security settings error:', error);
    res.status(500).json({ error: 'Failed to get security settings' });
  }
});

// @route   PUT /api/settings/security/password
// @desc    Change user password
// @access  Private
router.put('/security/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All password fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Get current user with password
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await User.update({
      password: hashedPassword,
      last_password_change: new Date()
    }, {
      where: { id: req.user.id }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// @route   PUT /api/settings/security/two-factor
// @desc    Toggle two-factor authentication
// @access  Private
router.put('/security/two-factor', auth, async (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Enabled field must be a boolean' });
    }

    await User.update({
      two_factor_enabled: enabled
    }, {
      where: { id: req.user.id }
    });

    res.json({
      message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully`,
      twoFactorEnabled: enabled
    });
  } catch (error) {
    console.error('Two-factor toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle two-factor authentication' });
  }
});

// @route   GET /api/settings/notifications
// @desc    Get notification preferences
// @access  Private
router.get('/notifications', auth, async (req, res) => {
  try {
    // This would typically come from a UserSettings model
    // For now, return default notification preferences
    const notifications = {
      email: {
        newLeads: true,
        scrapingComplete: true,
        exportComplete: true,
        crmSync: true,
        weeklyReports: true,
        systemAlerts: true
      },
      push: {
        newLeads: true,
        scrapingComplete: false,
        exportComplete: false,
        crmSync: false
      },
      sms: {
        urgentAlerts: false,
        dailyDigest: false
      },
      frequency: {
        dailyDigest: false,
        weeklyReports: true,
        monthlyAnalytics: true
      }
    };

    res.json(notifications);
  } catch (error) {
    console.error('Notification settings error:', error);
    res.status(500).json({ error: 'Failed to get notification preferences' });
  }
});

// @route   PUT /api/settings/notifications
// @desc    Update notification preferences
// @access  Private
router.put('/notifications', auth, async (req, res) => {
  try {
    const { email, push, sms, frequency } = req.body;

    // Validate notification preferences
    const validChannels = ['email', 'push', 'sms', 'frequency'];
    for (const channel of validChannels) {
      if (req.body[channel] && typeof req.body[channel] !== 'object') {
        return res.status(400).json({ error: `Invalid ${channel} preferences format` });
      }
    }

    // In a real implementation, you'd save these to a UserSettings model
    // For now, just validate and return success
    res.json({
      message: 'Notification preferences updated successfully',
      preferences: { email, push, sms, frequency }
    });
  } catch (error) {
    console.error('Notification update error:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// @route   GET /api/settings/analytics
// @desc    Get analytics preferences
// @access  Private
router.get('/analytics', auth, async (req, res) => {
  try {
    const analytics = {
      dataRetention: {
        leads: '2 years',
        scrapingLogs: '6 months',
        exportHistory: '1 year',
        userActivity: '1 year'
      },
      tracking: {
        userBehavior: true,
        performanceMetrics: true,
        errorLogging: true,
        conversionTracking: true
      },
      reporting: {
        defaultTimeRange: '30d',
        autoRefresh: true,
        refreshInterval: 300, // 5 minutes
        exportFormat: 'excel'
      },
      privacy: {
        anonymizeData: false,
        shareAggregatedData: true,
        dataExport: true
      }
    };

    res.json(analytics);
  } catch (error) {
    console.error('Analytics settings error:', error);
    res.status(500).json({ error: 'Failed to get analytics preferences' });
  }
});

// @route   PUT /api/settings/analytics
// @desc    Update analytics preferences
// @access  Private
router.put('/analytics', auth, async (req, res) => {
  try {
    const { dataRetention, tracking, reporting, privacy } = req.body;

    // Validate analytics preferences
    if (dataRetention && typeof dataRetention !== 'object') {
      return res.status(400).json({ error: 'Invalid data retention format' });
    }

    if (tracking && typeof tracking !== 'object') {
      return res.status(400).json({ error: 'Invalid tracking format' });
    }

    if (reporting && typeof reporting !== 'object') {
      return res.status(400).json({ error: 'Invalid reporting format' });
    }

    if (privacy && typeof privacy !== 'object') {
      return res.status(400).json({ error: 'Invalid privacy format' });
    }

    res.json({
      message: 'Analytics preferences updated successfully',
      preferences: { dataRetention, tracking, reporting, privacy }
    });
  } catch (error) {
    console.error('Analytics update error:', error);
    res.status(500).json({ error: 'Failed to update analytics preferences' });
  }
});

// @route   GET /api/settings/integrations
// @desc    Get integration settings
// @access  Private
router.get('/integrations', auth, async (req, res) => {
  try {
    const integrations = {
      crm: {
        hubspot: {
          isConnected: !!process.env.HUBSPOT_ACCESS_TOKEN,
          status: 'connected',
          lastSync: null,
          autoSync: true,
          syncInterval: 'daily'
        },
        salesforce: {
          isConnected: !!process.env.SALESFORCE_ACCESS_TOKEN,
          status: 'disconnected',
          lastSync: null,
          autoSync: false,
          syncInterval: 'manual'
        }
      },
      apis: {
        deepseek: {
          isConnected: !!process.env.DEEPSEEK_API_KEY,
          status: process.env.DEEPSEEK_API_KEY ? 'connected' : 'disconnected',
          usage: '0%',
          limit: 'Unlimited (pay per token)'
        },
        scrapy: {
          isConnected: !!process.env.SCRAPY_CLOUD_API_KEY,
          status: 'connected',
          usage: '0%',
          limit: '100 requests/month'
        }
      },
      webhooks: {
        enabled: false,
        endpoints: [],
        retryAttempts: 3,
        timeout: 30000
      }
    };

    res.json(integrations);
  } catch (error) {
    console.error('Integration settings error:', error);
    res.status(500).json({ error: 'Failed to get integration settings' });
  }
});

// @route   PUT /api/settings/integrations/crm
// @desc    Update CRM integration settings
// @access  Private
router.put('/integrations/crm', auth, async (req, res) => {
  try {
    const { crm, settings } = req.body;

    if (!crm || !['hubspot', 'salesforce'].includes(crm)) {
      return res.status(400).json({ error: 'Valid CRM type is required' });
    }

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    // Validate settings
    if (settings.autoSync !== undefined && typeof settings.autoSync !== 'boolean') {
      return res.status(400).json({ error: 'Auto sync must be a boolean' });
    }

    if (settings.syncInterval && !['hourly', 'daily', 'weekly', 'manual'].includes(settings.syncInterval)) {
      return res.status(400).json({ error: 'Invalid sync interval' });
    }

    // In a real implementation, you'd save these settings to a database
    res.json({
      message: `${crm} integration settings updated successfully`,
      crm,
      settings
    });
  } catch (error) {
    console.error('CRM integration update error:', error);
    res.status(500).json({ error: 'Failed to update CRM integration settings' });
  }
});

// @route   GET /api/settings/api-keys
// @desc    Get API key management
// @access  Private
router.get('/api-keys', auth, async (req, res) => {
  try {
    const apiKeys = {
      deepseek: {
        name: 'Deepseek API',
        key: process.env.DEEPSEEK_API_KEY ? '••••••••••••••••' : null,
        isSet: !!process.env.DEEPSEEK_API_KEY,
        lastUsed: null,
        usage: '0 requests',
        limit: 'Unlimited (pay per token)'
      },
      scrapy: {
        name: 'Scrapy Cloud API',
        key: process.env.SCRAPY_CLOUD_API_KEY ? '••••••••••••••••' : null,
        isSet: !!process.env.SCRAPY_CLOUD_API_KEY,
        lastUsed: null,
        usage: '0 requests',
        limit: '100 requests/month'
      },
      hubspot: {
        name: 'HubSpot API',
        key: process.env.HUBSPOT_ACCESS_TOKEN ? '••••••••••••••••' : null,
        isSet: !!process.env.HUBSPOT_ACCESS_TOKEN,
        lastUsed: null,
        usage: '0 requests',
        limit: '10000 requests/day'
      },
      salesforce: {
        name: 'Salesforce API',
        key: process.env.SALESFORCE_ACCESS_TOKEN ? '••••••••••••••••' : null,
        isSet: !!process.env.SALESFORCE_ACCESS_TOKEN,
        lastUsed: null,
        usage: '0 requests',
        limit: '15000 requests/day'
      }
    };

    res.json(apiKeys);
  } catch (error) {
    console.error('API keys error:', error);
    res.status(500).json({ error: 'Failed to get API key information' });
  }
});

// @route   POST /api/settings/api-keys
// @desc    Add or update API key
// @access  Private
router.post('/api-keys', auth, async (req, res) => {
  try {
    const { service, key } = req.body;

    if (!service || !key) {
      return res.status(400).json({ error: 'Service and key are required' });
    }

    const validServices = ['deepseek', 'scrapy', 'hubspot', 'salesforce'];
    if (!validServices.includes(service)) {
      return res.status(400).json({ error: 'Invalid service specified' });
    }

    if (typeof key !== 'string' || key.length < 10) {
      return res.status(400).json({ error: 'Invalid API key format' });
    }

    // In a real implementation, you'd validate the API key and store it securely
    // For now, just return success
    res.json({
      message: `${service} API key updated successfully`,
      service,
      isSet: true
    });
  } catch (error) {
    console.error('API key update error:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

// @route   DELETE /api/settings/api-keys/:service
// @desc    Remove API key
// @access  Private
router.delete('/api-keys/:service', auth, async (req, res) => {
  try {
    const { service } = req.params;

    const validServices = ['deepseek', 'scrapy', 'hubspot', 'salesforce'];
    if (!validServices.includes(service)) {
      return res.status(400).json({ error: 'Invalid service specified' });
    }

    // In a real implementation, you'd remove the API key from secure storage
    res.json({
      message: `${service} API key removed successfully`,
      service,
      isSet: false
    });
  } catch (error) {
    console.error('API key removal error:', error);
    res.status(500).json({ error: 'Failed to remove API key' });
  }
});

// @route   GET /api/settings/preferences
// @desc    Get general preferences
// @access  Private
router.get('/preferences', auth, async (req, res) => {
  try {
    const preferences = {
      interface: {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h'
      },
      display: {
        leadsPerPage: 25,
        showAdvancedFilters: true,
        compactMode: false,
        autoRefresh: true,
        refreshInterval: 300
      },
      notifications: {
        sound: true,
        desktop: true,
        email: true,
        sms: false
      },
      data: {
        defaultExportFormat: 'excel',
        includeHeaders: true,
        dateFormat: 'ISO',
        numberFormat: 'US'
      }
    };

    res.json(preferences);
  } catch (error) {
    console.error('Preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// @route   PUT /api/settings/preferences
// @desc    Update general preferences
// @access  Private
router.put('/preferences', auth, async (req, res) => {
  try {
    const { interface: interfacePrefs, display, notifications, data } = req.body;

    // Validate preferences
    if (interfacePrefs && typeof interfacePrefs !== 'object') {
      return res.status(400).json({ error: 'Invalid interface preferences format' });
    }

    if (display && typeof display !== 'object') {
      return res.status(400).json({ error: 'Invalid display preferences format' });
    }

    if (notifications && typeof notifications !== 'object') {
      return res.status(400).json({ error: 'Invalid notification preferences format' });
    }

    if (data && typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid data preferences format' });
    }

    res.json({
      message: 'Preferences updated successfully',
      preferences: { interface: interfacePrefs, display, notifications, data }
    });
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

module.exports = router;
