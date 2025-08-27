const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration
const sequelize = new Sequelize(
  process.env.DB_NAME || 'project_lead_scheduler_db',
  process.env.DB_USER || 'jordanzane',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true
    }
  }
);

// Import model factories
const UserFactory = require('./User');
const IndustryFactory = require('./Industry');
const ScrapingConfigFactory = require('./ScrapingConfig');
const LeadFactory = require('./Lead');
const LeadSourceFactory = require('./LeadSource');
const ExportScheduleFactory = require('./ExportSchedule');
const CRMIntegrationFactory = require('./CRMIntegration');
const TagFactory = require('./Tag');

// Instantiate models
const User = UserFactory(sequelize);
const Industry = IndustryFactory(sequelize);
const ScrapingConfig = ScrapingConfigFactory(sequelize);
const Lead = LeadFactory(sequelize);
const LeadSource = LeadSourceFactory(sequelize);
const ExportSchedule = ExportScheduleFactory(sequelize);
const CRMIntegration = CRMIntegrationFactory(sequelize);
const Tag = TagFactory(sequelize);

// Define associations
User.belongsTo(Industry, { foreignKey: 'industry_id', as: 'industry' });
Industry.hasMany(User, { foreignKey: 'industry_id', as: 'users' });

User.hasMany(ScrapingConfig, { foreignKey: 'user_id', as: 'scrapingConfigs' });
ScrapingConfig.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Lead, { foreignKey: 'user_id', as: 'leads' });
Lead.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(LeadSource, { foreignKey: 'user_id', as: 'leadSources' });
LeadSource.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(ExportSchedule, { foreignKey: 'user_id', as: 'exportSchedules' });
ExportSchedule.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(CRMIntegration, { foreignKey: 'user_id', as: 'crmIntegrations' });
CRMIntegration.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

ScrapingConfig.belongsTo(Industry, { foreignKey: 'industry_id', as: 'industry' });
Industry.hasMany(ScrapingConfig, { foreignKey: 'industry_id', as: 'scrapingConfigs' });

Lead.belongsTo(LeadSource, { foreignKey: 'lead_source_id', as: 'source' });
LeadSource.hasMany(Lead, { foreignKey: 'lead_source_id', as: 'leads' });

Lead.belongsTo(Industry, { foreignKey: 'industry_id', as: 'industry' });
Industry.hasMany(Lead, { foreignKey: 'industry_id', as: 'leads' });

// Many-to-many relationship between Lead and Tag
Lead.belongsToMany(Tag, { 
  through: 'LeadTags', 
  foreignKey: 'lead_id', 
  otherKey: 'tag_id',
  as: 'tags'
});
Tag.belongsToMany(Lead, { 
  through: 'LeadTags', 
  foreignKey: 'tag_id', 
  otherKey: 'lead_id',
  as: 'leads'
});

module.exports = {
  sequelize,
  User,
  Industry,
  ScrapingConfig,
  Lead,
  LeadSource,
  ExportSchedule,
  CRMIntegration,
  Tag
};
