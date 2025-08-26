const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CRMIntegration = sequelize.define('CRMIntegration', {
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
    crm_type: {
      type: DataTypes.ENUM('salesforce', 'hubspot', 'pipedrive', 'zoho', 'freshsales', 'custom'),
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    credentials: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        autoSync: false,
        syncFrequency: 'daily',
        fieldMapping: {},
        duplicateCheck: true,
        createContacts: true,
        createCompanies: true,
        createOpportunities: true
      }
    },
    last_sync: {
      type: DataTypes.DATE,
      allowNull: true
    },
    next_sync: {
      type: DataTypes.DATE,
      allowNull: true
    },
    sync_stats: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        totalLeadsSynced: 0,
        totalContactsCreated: 0,
        totalCompaniesCreated: 0,
        totalOpportunitiesCreated: 0,
        lastSyncSuccess: true,
        lastSyncError: null
      }
    },
    webhook_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    api_limits: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        dailyLimit: null,
        hourlyLimit: null,
        currentDailyUsage: 0,
        currentHourlyUsage: 0,
        resetTime: null
      }
    }
  });

  // Instance method to check if sync should run
  CRMIntegration.prototype.shouldSync = function() {
    if (!this.is_active) return false;
    if (!this.settings.autoSync) return false;
    if (!this.next_sync) return true;
    return new Date() >= this.next_sync;
  };

  // Instance method to calculate next sync time
  CRMIntegration.prototype.calculateNextSync = function() {
    if (!this.settings.autoSync) return null;
    
    const now = new Date();
    let nextSync = new Date(now);
    
    switch (this.settings.syncFrequency) {
      case 'hourly':
        nextSync.setHours(nextSync.getHours() + 1);
        break;
      case 'daily':
        nextSync.setDate(nextSync.getDate() + 1);
        break;
      case 'weekly':
        nextSync.setDate(nextSync.getDate() + 7);
        break;
      case 'monthly':
        nextSync.setMonth(nextSync.getMonth() + 1);
        break;
    }
    
    return nextSync;
  };

  // Instance method to check API limits
  CRMIntegration.prototype.checkAPILimits = function() {
    if (!this.api_limits) return true;
    
    const now = new Date();
    const { dailyLimit, hourlyLimit, currentDailyUsage, currentHourlyUsage, resetTime } = this.api_limits;
    
    // Check daily limit
    if (dailyLimit && currentDailyUsage >= dailyLimit) {
      if (resetTime && now < new Date(resetTime)) {
        return false;
      }
    }
    
    // Check hourly limit
    if (hourlyLimit && currentHourlyUsage >= hourlyLimit) {
      return false;
    }
    
    return true;
  };

  return CRMIntegration;
};


