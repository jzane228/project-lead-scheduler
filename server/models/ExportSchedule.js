const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExportSchedule = sequelize.define('ExportSchedule', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 100]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    frequency: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'on_demand'),
      defaultValue: 'weekly'
    },
    day_of_week: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 6
      }
    },
    day_of_month: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 31
      }
    },
    time: {
      type: DataTypes.TIME,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    last_run: {
      type: DataTypes.DATE,
      allowNull: true
    },
    next_run: {
      type: DataTypes.DATE,
      allowNull: true
    },
    export_format: {
      type: DataTypes.ENUM('csv', 'excel', 'json', 'salesforce', 'hubspot', 'pipedrive'),
      defaultValue: 'excel'
    },
    filters: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        status: [],
        priority: [],
        industry: [],
        dateRange: {
          start: null,
          end: null
        },
        tags: []
      }
    },
    destination: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        email: null,
        webhook: null,
        crmIntegration: null,
        filePath: null
      }
    },
    columns: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [
        'title',
        'company',
        'contactName',
        'contactEmail',
        'location',
        'budget',
        'timeline',
        'status',
        'priority'
      ]
    },
    notification_settings: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        emailNotifications: true,
        slackWebhook: null,
        webhookUrl: null
      }
    }
  });

  // Instance method to check if export should run
  ExportSchedule.prototype.shouldRun = function() {
    if (!this.is_active) return false;
    if (this.frequency === 'on_demand') return false;
    if (!this.next_run) return true;
    return new Date() >= this.next_run;
  };

  // Instance method to calculate next run time
  ExportSchedule.prototype.calculateNextRun = function() {
    const now = new Date();
    let nextRun = new Date(now);
    
    switch (this.frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        if (this.day_of_week !== null) {
          const daysUntilNext = (this.day_of_week - nextRun.getDay() + 7) % 7;
          nextRun.setDate(nextRun.getDate() + daysUntilNext);
        } else {
          nextRun.setDate(nextRun.getDate() + 7);
        }
        break;
      case 'monthly':
        if (this.day_of_month) {
          nextRun.setDate(this.day_of_month);
          if (nextRun <= now) {
            nextRun.setMonth(nextRun.getMonth() + 1);
          }
        } else {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        break;
    }
    
    // Set the time if specified
    if (this.time) {
      const [hours, minutes] = this.time.split(':');
      nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }
    
    return nextRun;
  };

  return ExportSchedule;
};


