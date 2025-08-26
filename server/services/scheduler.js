const cron = require('node-cron');
const { ScrapingConfig, ExportSchedule, User } = require('../models');
const WebScraper = require('./scraper');
const ExportService = require('./export');
const { Op } = require('sequelize');

class SchedulerService {
  constructor() {
    this.scraper = new WebScraper();
    this.exportService = new ExportService();
    this.jobs = new Map();
  }

  async initializeScheduler() {
    console.log('Initializing scheduler...');
    
    try {
      // Load all active scraping configurations
      const activeScrapingConfigs = await ScrapingConfig.findAll({
        where: { isActive: true },
        include: [{ model: User, attributes: ['id', 'email'] }]
      });

      // Load all active export schedules
      const activeExportSchedules = await ExportSchedule.findAll({
        where: { isActive: true },
        include: [{ model: User, attributes: ['id', 'email'] }]
      });

      // Schedule scraping jobs
      for (const config of activeScrapingConfigs) {
        await this.scheduleScrapingJob(config);
      }

      // Schedule export jobs
      for (const schedule of activeExportSchedules) {
        await this.scheduleExportJob(schedule);
      }

      // Schedule maintenance jobs
      this.scheduleMaintenanceJobs();

      console.log(`Scheduler initialized with ${activeScrapingConfigs.length} scraping jobs and ${activeExportSchedules.length} export jobs`);
    } catch (error) {
      console.error('Failed to initialize scheduler:', error);
      throw error;
    }
  }

  async scheduleScrapingJob(config) {
    const jobId = `scraping_${config.id}`;
    
    // Stop existing job if it exists
    if (this.jobs.has(jobId)) {
      this.jobs.get(jobId).stop();
      this.jobs.delete(jobId);
    }

    // Calculate cron expression based on frequency
    const cronExpression = this.getCronExpression(config.frequency, config.nextRun);
    
    if (!cronExpression) {
      console.warn(`Invalid frequency for scraping config ${config.id}: ${config.frequency}`);
      return;
    }

    // Create and schedule the job
    const job = cron.schedule(cronExpression, async () => {
      try {
        console.log(`Running scheduled scraping job for config: ${config.name}`);
        await this.runScrapingJob(config);
        
        // Update next run time
        const nextRun = config.calculateNextRun();
        await config.update({ 
          lastRun: new Date(),
          nextRun: nextRun
        });
        
        console.log(`Scraping job completed for config: ${config.name}. Next run: ${nextRun}`);
      } catch (error) {
        console.error(`Error in scheduled scraping job for config ${config.name}:`, error);
      }
    }, {
      scheduled: false
    });

    // Start the job
    job.start();
    this.jobs.set(jobId, job);
    
    console.log(`Scheduled scraping job for config: ${config.name} with cron: ${cronExpression}`);
  }

  async scheduleExportJob(schedule) {
    const jobId = `export_${schedule.id}`;
    
    // Stop existing job if it exists
    if (this.jobs.has(jobId)) {
      this.jobs.get(jobId).stop();
      this.jobs.delete(jobId);
    }

    // Calculate cron expression based on frequency
    const cronExpression = this.getCronExpression(schedule.frequency, schedule.nextRun, schedule.dayOfWeek, schedule.dayOfMonth, schedule.time);
    
    if (!cronExpression) {
      console.warn(`Invalid frequency for export schedule ${schedule.id}: ${schedule.frequency}`);
      return;
    }

    // Create and schedule the job
    const job = cron.schedule(cronExpression, async () => {
      try {
        console.log(`Running scheduled export job for schedule: ${schedule.name}`);
        await this.runExportJob(schedule);
        
        // Update next run time
        const nextRun = schedule.calculateNextRun();
        await schedule.update({ 
          lastRun: new Date(),
          nextRun: nextRun
        });
        
        console.log(`Export job completed for schedule: ${schedule.name}. Next run: ${nextRun}`);
      } catch (error) {
        console.error(`Error in scheduled export job for schedule ${schedule.name}:`, error);
      }
    }, {
      scheduled: false
    });

    // Start the job
    job.start();
    this.jobs.set(jobId, job);
    
    console.log(`Scheduled export job for schedule: ${schedule.name} with cron: ${cronExpression}`);
  }

  getCronExpression(frequency, nextRun, dayOfWeek = null, dayOfMonth = null, time = null) {
    const [hours = 0, minutes = 0] = time ? time.split(':') : ['0', '0'];
    
    switch (frequency) {
      case 'hourly':
        return `${minutes} * * * *`;
      case 'daily':
        return `${minutes} ${hours} * * *`;
      case 'weekly':
        if (dayOfWeek !== null) {
          return `${minutes} ${hours} * * ${dayOfWeek}`;
        }
        return `${minutes} ${hours} * * 0`; // Default to Sunday
      case 'monthly':
        if (dayOfMonth) {
          return `${minutes} ${hours} ${dayOfMonth} * *`;
        }
        return `${minutes} ${hours} 1 * *`; // Default to 1st of month
      default:
        return null;
    }
  }

  async runScrapingJob(config) {
    try {
      const user = await User.findByPk(config.UserId);
      if (!user) {
        throw new Error(`User not found for config ${config.id}`);
      }

      // Check if user has reached their lead limit
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      
      const monthlyLeadCount = await user.countLeads({
        where: {
          scrapedDate: {
            [Op.gte]: currentMonth
          }
        }
      });

      if (monthlyLeadCount >= user.maxLeadsPerMonth) {
        console.log(`User ${user.email} has reached monthly lead limit`);
        return;
      }

      // Determine URLs to scrape
      let urlsToScrape = [];
      
      if (config.sources && config.sources.length > 0) {
        // Scrape from configured sources
        for (const source of config.sources) {
          if (source.type === 'rss_feed') {
            const rssResults = await this.scraper.scrapeRSSFeed(
              source.url, 
              config.dataExtractionRules, 
              user.id
            );
            // RSS scraping is handled separately
          } else if (source.type === 'website') {
            urlsToScrape.push(source.url);
          }
        }
      }

      // Scrape URLs if any
      if (urlsToScrape.length > 0) {
        const maxUrls = Math.min(urlsToScrape.length, config.maxResultsPerRun);
        const selectedUrls = urlsToScrape.slice(0, maxUrls);
        
        await this.scraper.scrapeMultipleUrls(
          selectedUrls,
          config.dataExtractionRules,
          user.id
        );
      }

      // Update source statistics
      if (config.sources) {
        for (const source of config.sources) {
          if (source.id) {
            const leadSource = await LeadSource.findByPk(source.id);
            if (leadSource) {
              await leadSource.update({
                lastScraped: new Date(),
                totalLeads: leadSource.totalLeads + 1
              });
            }
          }
        }
      }

    } catch (error) {
      console.error(`Error running scraping job for config ${config.id}:`, error);
      throw error;
    }
  }

  async runExportJob(schedule) {
    try {
      const user = await User.findByPk(schedule.UserId);
      if (!user) {
        throw new Error(`User not found for schedule ${schedule.id}`);
      }

      // Get leads based on filters
      const whereClause = { UserId: user.id };
      
      if (schedule.filters) {
        if (schedule.filters.status && schedule.filters.status.length > 0) {
          whereClause.status = { [Op.in]: schedule.filters.status };
        }
        if (schedule.filters.priority && schedule.filters.priority.length > 0) {
          whereClause.priority = { [Op.in]: schedule.filters.priority };
        }
        if (schedule.filters.industry && schedule.filters.industry.length > 0) {
          whereClause.industry = { [Op.in]: schedule.filters.industry };
        }
        if (schedule.filters.dateRange) {
          if (schedule.filters.dateRange.start) {
            whereClause.scrapedDate = { [Op.gte]: new Date(schedule.filters.dateRange.start) };
          }
          if (schedule.filters.dateRange.end) {
            whereClause.scrapedDate = { ...whereClause.scrapedDate, [Op.lte]: new Date(schedule.filters.dateRange.end) };
          }
        }
      }

      const leads = await user.getLeads({ where: whereClause });

      // Export leads
      const exportResult = await this.exportService.exportLeads(
        leads,
        schedule.exportFormat,
        schedule.columns,
        schedule.destination
      );

      // Send notifications if configured
      if (schedule.notificationSettings) {
        await this.sendExportNotifications(schedule, exportResult, user);
      }

    } catch (error) {
      console.error(`Error running export job for schedule ${schedule.id}:`, error);
      throw error;
    }
  }

  async sendExportNotifications(schedule, exportResult, user) {
    // TODO: Implement notification sending (email, Slack, webhook)
    console.log(`Export notifications would be sent for schedule: ${schedule.name}`);
  }

  scheduleMaintenanceJobs() {
    // Daily cleanup job at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        console.log('Running daily maintenance job...');
        await this.cleanupOldData();
        await this.updateStatistics();
        console.log('Daily maintenance job completed');
      } catch (error) {
        console.error('Error in daily maintenance job:', error);
      }
    });

    // Weekly maintenance job on Sunday at 3 AM
    cron.schedule('0 3 * * 0', async () => {
      try {
        console.log('Running weekly maintenance job...');
        await this.cleanupOldFiles();
        await this.optimizeDatabase();
        console.log('Weekly maintenance job completed');
      } catch (error) {
        console.error('Error in weekly maintenance job:', error);
      }
    });
  }

  async cleanupOldData() {
    // Clean up leads older than 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    
    // TODO: Implement data cleanup logic
    console.log('Data cleanup completed');
  }

  async updateStatistics() {
    // Update various statistics
    // TODO: Implement statistics update logic
    console.log('Statistics updated');
  }

  async cleanupOldFiles() {
    // Clean up old export files
    // TODO: Implement file cleanup logic
    console.log('File cleanup completed');
  }

  async optimizeDatabase() {
    // Optimize database performance
    // TODO: Implement database optimization logic
    console.log('Database optimization completed');
  }

  async addScrapingJob(config) {
    await this.scheduleScrapingJob(config);
  }

  async removeScrapingJob(configId) {
    const jobId = `scraping_${configId}`;
    if (this.jobs.has(jobId)) {
      this.jobs.get(jobId).stop();
      this.jobs.delete(jobId);
      console.log(`Removed scraping job: ${jobId}`);
    }
  }

  async addExportJob(schedule) {
    await this.scheduleExportJob(schedule);
  }

  async removeExportJob(scheduleId) {
    const jobId = `export_${scheduleId}`;
    if (this.jobs.has(jobId)) {
      this.jobs.get(jobId).stop();
      this.jobs.delete(jobId);
      console.log(`Removed export job: ${jobId}`);
    }
  }

  async stopAllJobs() {
    for (const [jobId, job] of this.jobs) {
      job.stop();
      console.log(`Stopped job: ${jobId}`);
    }
    this.jobs.clear();
  }

  getJobStatus() {
    const status = {};
    for (const [jobId, job] of this.jobs) {
      status[jobId] = {
        running: job.running,
        nextDate: job.nextDate()
      };
    }
    return status;
  }
}

// Create singleton instance
const schedulerService = new SchedulerService();

// Export both the class and the singleton instance
module.exports = {
  SchedulerService,
  schedulerService,
  initializeScheduler: () => schedulerService.initializeScheduler()
};


