const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LeadSource = sequelize.define('LeadSource', {
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
    type: {
      type: DataTypes.ENUM('website', 'social_media', 'news_site', 'job_board', 'rss_feed', 'api', 'other'),
      defaultValue: 'other'
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    last_scraped: {
      type: DataTypes.DATE,
      allowNull: true
    },
    success_rate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    total_leads: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    settings: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        requiresAuthentication: false,
        rateLimit: null,
        customHeaders: {},
        parsingRules: {}
      }
    }
  });

  return LeadSource;
};


