const cron = require('node-cron');
const { ScrapingConfig, User } = require('../models');
const EnhancedScrapingService = require('./enhancedScrapingService');

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.activeJobs = new Map(); // Track running jobs with progress
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
      console.error('Failed to initialize scheduler service:', error.message);
      // Don't throw error, just log it and continue without scheduler
      console.log('Scheduler will not be available due to database issues');
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
        try {
          await this.scheduleConfiguration(config);
        } catch (configError) {
          console.error(`Error scheduling config ${config.id}:`, configError.message);
        }
      }
    } catch (error) {
      console.error('Error loading active configurations:', error.message);
      console.log('Scheduler will continue without loading configurations');
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

  async runScrapingJob(config, jobId = null) {
    // Use provided jobId or generate new one
    const finalJobId = jobId || `config-${config.id}-${Date.now()}`;

    try {
      console.log(`Running scraping job for config: ${config.name} (${finalJobId})`);

      // Initialize progress tracking (only if not already initialized)
      if (!this.activeJobs.has(finalJobId)) {
        this.activeJobs.set(finalJobId, {
          configId: config.id,
          configName: config.name,
          userId: config.user_id,
          startTime: new Date(),
          progress: {
            stage: 'initializing',
            progress: 0,
            total: 1,
            percentage: 0,
            message: 'Starting enhanced scraping...'
          }
        });
      }

      // Check if user is still active
      const user = await User.findByPk(config.user_id);
      if (!user || !user.is_active) {
        console.log(`User ${config.user_id} is inactive, skipping job`);
        this.activeJobs.delete(finalJobId);
        return;
      }

      // Set up progress callback for the scraping service
      const originalUpdateProgress = this.scrapingService.updateProgress;
      this.scrapingService.updateProgress = (progressJobId, stage, progress, total, message) => {
        if (this.activeJobs.has(finalJobId)) {
          const job = this.activeJobs.get(finalJobId);
          job.progress = {
            stage,
            progress,
            total,
            percentage: total > 0 ? Math.round((progress / total) * 100) : 0,
            message
          };
          this.activeJobs.set(finalJobId, job);
        }
        // Call original method if it exists
        if (originalUpdateProgress) {
          originalUpdateProgress.call(this.scrapingService, progressJobId, stage, progress, total, message);
        }
      };

      // Run the scraping with jobId for progress tracking
      const result = await this.scrapingService.scrapeConfiguration(config, config.user_id, finalJobId);

      // Update final progress
      if (this.activeJobs.has(finalJobId)) {
        const job = this.activeJobs.get(finalJobId);
        job.progress = {
          stage: 'completed',
          progress: result.savedLeads,
          total: result.savedLeads,
          percentage: 100,
          message: `Successfully saved ${result.savedLeads} leads!`
        };
        job.completed = true;
        job.endTime = new Date();
        job.result = result;
        this.activeJobs.set(finalJobId, job);
      }

      // Update configuration with last run time
      await config.update({
        last_run: new Date(),
        next_run: this.calculateNextRun(config.frequency)
      });

      console.log(`Scraping job completed for ${config.name}: ${result.savedLeads} leads saved`);

      // Clean up progress after 5 minutes
      setTimeout(() => {
        this.activeJobs.delete(finalJobId);
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error(`Error running scraping job for config ${config.id}:`, error);

      // Update progress with error
      if (this.activeJobs.has(finalJobId)) {
        const job = this.activeJobs.get(finalJobId);
        job.progress = {
          stage: 'error',
          progress: 0,
          total: 1,
          percentage: 0,
          message: `Error: ${error.message}`
        };
        job.error = error.message;
        job.endTime = new Date();
        this.activeJobs.set(finalJobId, job);
      }

      // Update configuration with error info
      await config.update({
        last_run: new Date(),
        next_run: this.calculateNextRun(config.frequency)
      });
    }
  }

  // Get progress for a specific job
  getJobProgress(jobId) {
    console.log(`🔍 getJobProgress called for jobId: ${jobId}`);
    console.log(`📊 Total active jobs: ${this.activeJobs.size}`);

    const job = this.activeJobs.get(jobId);
    if (job) {
      console.log(`✅ Found job: ${jobId} - Stage: ${job.progress.stage} - Progress: ${job.progress.percentage}%`);
      return job.progress;
    }

    console.log(`❌ Job not found: ${jobId}`);
    return null;
  }

  // Get all active jobs for a user
  getActiveJobsForUser(userId) {
    const userJobs = [];
    for (const [jobId, job] of this.activeJobs) {
      if (job.userId === userId) {
        userJobs.push({
          jobId,
          configId: job.configId,
          configName: job.configName,
          progress: job.progress,
          startTime: job.startTime,
          completed: job.completed || false,
          error: job.error || null
        });
      }
    }
    return userJobs;
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

      // Generate job ID before running
      const jobId = `config-${configId}-${Date.now()}`;
      console.log(`🚀 STARTING JOB: ${jobId} for config "${config.name}" (user: ${config.user_id})`);

      // Initialize progress tracking immediately
      this.activeJobs.set(jobId, {
        configId: config.id,
        configName: config.name,
        userId: config.user_id,
        startTime: new Date(),
        progress: {
          stage: 'initializing',
          progress: 0,
          total: 1,
          percentage: 0,
          message: 'Starting enhanced scraping...'
        }
      });

      console.log(`📝 JOB INITIALIZED: ${jobId} - Active jobs count: ${this.activeJobs.size}`);

      // Run scraping job asynchronously (don't await)
      this.runScrapingJob(config, jobId).catch(error => {
        console.error(`Async scraping job failed for config ${configId}:`, error);
      });

      // Return job ID immediately for progress tracking
      return {
        success: true,
        message: 'Scraping job started',
        jobId: jobId,
        config: {
          id: config.id,
          name: config.name
        }
      };

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
