const cron = require('node-cron');
const { ScrapingConfig, User } = require('../models');
const EnhancedScrapingService = require('./enhancedScrapingService');

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.scrapingService = new EnhancedScrapingService();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize scraping service
      await this.scrapingService.initialize();
      
      // Load active configurations and schedule them
      await this.loadActiveConfigurations();
      
      this.isInitialized = true;
      console.log('Scheduler service initialized');
    } catch (error) {
      console.error('Failed to initialize scheduler service:', error);
      throw error;
    }
  }

  async loadActiveConfigurations() {
    try {
      const activeConfigs = await ScrapingConfig.findAll({
        where: { is_active: true },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'subscription_tier', 'max_scraping_configs']
          }
        ]
      });

      console.log(`Found ${activeConfigs.length} active scraping configurations`);

      // Schedule each active configuration
      for (const config of activeConfigs) {
        await this.scheduleConfiguration(config);
      }
    } catch (error) {
      console.error('Error loading active configurations:', error);
    }
  }

  async scheduleConfiguration(config) {
    try {
      // Remove existing job if it exists
      if (this.jobs.has(config.id)) {
        this.jobs.get(config.id).stop();
        this.jobs.delete(config.id);
      }

      // Create cron expression based on frequency
      const cronExpression = this.getCronExpression(config.frequency);
      
      if (!cronExpression) {
        console.warn(`Invalid frequency for config ${config.id}: ${config.frequency}`);
        return;
      }

      // Schedule the job
      const job = cron.schedule(cronExpression, async () => {
        await this.runScrapingJob(config);
      }, {
        scheduled: true,
        timezone: 'America/New_York' // Adjust timezone as needed
      });

      this.jobs.set(config.id, job);
      
      console.log(`Scheduled scraping job for config ${config.name} (${config.id}) with frequency: ${config.frequency}`);
      
      // Update next run time
      await config.update({
        next_run: this.calculateNextRun(config.frequency)
      });

    } catch (error) {
      console.error(`Error scheduling configuration ${config.id}:`, error);
    }
  }

  async runScrapingJob(config) {
    try {
      console.log(`Running scraping job for config: ${config.name}`);
      
      // Check if user is still active
      const user = await User.findByPk(config.user_id);
      if (!user || !user.is_active) {
        console.log(`User ${config.user_id} is inactive, skipping job`);
        return;
      }

      // Run the scraping
      const result = await this.scrapingService.scrapeConfiguration(config, config.user_id);
      
      // Update configuration with last run time
      await config.update({
        last_run: new Date(),
        next_run: this.calculateNextRun(config.frequency)
      });

      console.log(`Scraping job completed for ${config.name}: ${result.savedLeads} leads saved`);
      
    } catch (error) {
      console.error(`Error running scraping job for config ${config.id}:`, error);
      
      // Update configuration with error info
      await config.update({
        last_run: new Date(),
        next_run: this.calculateNextRun(config.frequency)
      });
    }
  }

  async addConfiguration(config) {
    if (config.is_active) {
      await this.scheduleConfiguration(config);
    }
  }

  async updateConfiguration(config) {
    if (config.is_active) {
      await this.scheduleConfiguration(config);
    } else {
      // Remove job if configuration is deactivated
      if (this.jobs.has(config.id)) {
        this.jobs.get(config.id).stop();
        this.jobs.delete(config.id);
      }
    }
  }

  async removeConfiguration(configId) {
    if (this.jobs.has(configId)) {
      this.jobs.get(configId).stop();
      this.jobs.delete(configId);
    }
  }

  async runConfigurationNow(configId) {
    try {
      const config = await ScrapingConfig.findByPk(configId);
      if (!config) {
        throw new Error('Configuration not found');
      }

      await this.runScrapingJob(config);
      return { success: true, message: 'Scraping job completed' };
      
    } catch (error) {
      console.error('Error running configuration now:', error);
      throw error;
    }
  }

  getCronExpression(frequency) {
    switch (frequency) {
      case 'hourly':
        return '0 * * * *'; // Every hour at minute 0
      case 'daily':
        return '0 9 * * *'; // Every day at 9 AM
      case 'weekly':
        return '0 9 * * 1'; // Every Monday at 9 AM
      case 'monthly':
        return '0 9 1 * *'; // First day of month at 9 AM
      case 'custom':
        return '0 9 * * *'; // Default to daily
      default:
        return null;
    }
  }

  calculateNextRun(frequency) {
    const now = new Date();
    let nextRun = new Date(now);

    switch (frequency) {
      case 'hourly':
        nextRun.setHours(now.getHours() + 1, 0, 0, 0);
        break;
      case 'daily':
        nextRun.setDate(now.getDate() + 1);
        nextRun.setHours(9, 0, 0, 0); // 9 AM next day
        break;
      case 'weekly':
        nextRun.setDate(now.getDate() + 7);
        nextRun.setHours(9, 0, 0, 0);
        break;
      case 'monthly':
        nextRun.setMonth(now.getMonth() + 1);
        nextRun.setHours(9, 0, 0, 0);
        break;
      default:
        nextRun.setDate(now.getDate() + 1);
        nextRun.setHours(9, 0, 0, 0);
    }

    return nextRun;
  }

  getScheduledJobs() {
    const jobInfo = [];
    for (const [configId, job] of this.jobs) {
      jobInfo.push({
        configId,
        isRunning: job.running,
        nextRun: job.nextDate()
      });
    }
    return jobInfo;
  }

  async close() {
    try {
      // Stop all cron jobs
      for (const [configId, job] of this.jobs) {
        job.stop();
      }
      this.jobs.clear();

      // Close scraping service
      await this.scrapingService.close();
      
      console.log('Scheduler service closed');
    } catch (error) {
      console.error('Error closing scheduler service:', error);
    }
  }
}

module.exports = SchedulerService;
