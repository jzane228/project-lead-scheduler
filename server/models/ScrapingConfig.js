const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ScrapingConfig = sequelize.define('ScrapingConfig', {
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
    keywords: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
      validate: {
        customValidator(value) {
          if (!Array.isArray(value) || value.length === 0) {
            throw new Error('At least one keyword is required');
          }
          if (value.length > 20) {
            throw new Error('Maximum 20 keywords allowed');
          }
          if (value.some(keyword => !keyword || keyword.trim() === '')) {
            throw new Error('Keywords cannot be empty');
          }
        }
      }
    },
    sources: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
      comment: 'Sources to scrape: google, bing, news, rss, or specific URLs'
    },
    search_query: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional search query terms'
    },
    industry_type: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Industry type for the scraping configuration'
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Geographic location to focus on'
    },
    frequency: {
      type: DataTypes.ENUM('hourly', 'daily', 'weekly', 'monthly', 'custom'),
      defaultValue: 'daily',
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    last_run: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time the scraping job ran'
    },
    next_run: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Next scheduled run time'
    },
    max_results_per_run: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
      validate: {
        min: 1,
        max: 1000
      },
      comment: 'Maximum number of results to process per run'
    },
    data_extraction_rules: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'AI extraction rules and field mappings'
    },
    filters: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Content filtering rules'
    },
    notification_settings: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        email: false,
        slack: false,
        webhook: false
      },
      comment: 'Notification preferences'
    }
  }, {
    tableName: 'ScrapingConfigs',
    timestamps: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['frequency']
      },
      {
        fields: ['next_run']
      }
    ]
  });

  ScrapingConfig.associate = (models) => {
    ScrapingConfig.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    ScrapingConfig.belongsTo(models.Industry, {
      foreignKey: 'industry_id',
      as: 'industry'
    });
  };

  // Instance methods
  ScrapingConfig.prototype.isDueForRun = function() {
    if (!this.is_active || !this.next_run) return false;
    return new Date() >= this.next_run;
  };

  ScrapingConfig.prototype.calculateNextRun = function() {
    const now = new Date();
    let next_run = new Date(now);

    switch (this.frequency) {
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
  };

  ScrapingConfig.prototype.validateKeywords = function() {
    if (!this.keywords || this.keywords.length === 0) {
      throw new Error('At least one keyword is required');
    }
    
    if (this.keywords.length > 20) {
      throw new Error('Maximum 20 keywords allowed');
    }
    
    return true;
  };

  return ScrapingConfig;
};


