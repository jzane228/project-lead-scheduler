const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Lead = sequelize.define('Lead', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    project_type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    budget: {
      type: DataTypes.STRING,
      allowNull: true
    },
    timeline: {
      type: DataTypes.STRING,
      allowNull: true
    },
    company: {
      type: DataTypes.STRING,
      allowNull: true
    },
    contact_info: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    industry_type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    keywords: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    status: {
      type: DataTypes.ENUM('new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'archived'),
      defaultValue: 'new'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium'
    },
    source_type: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Type of source (news, website, rss, etc.)'
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Custom fields for different industries
    custom_fields: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Dynamic fields like roomCount, squareFootage, employees, etc.'
    },
    // Lead scoring and qualification
    score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    qualification: {
      type: DataTypes.ENUM('unqualified', 'qualified', 'highly_qualified'),
      defaultValue: 'unqualified'
    },
    // Grouping and categorization
    group: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Custom grouping field'
    },
    tag_names: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
      comment: 'Array of tag names for quick access'
    },
    // CRM integration fields
    crm_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'External CRM ID'
    },
    crm_status: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Status in external CRM'
    },
    // Notes and follow-up
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    next_follow_up: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Metadata
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0,
        max: 1
      },
      comment: 'AI confidence score for extracted data'
    },
    extraction_method: {
      type: DataTypes.ENUM('ai', 'manual', 'template'),
      defaultValue: 'ai'
    }
  }, {
    tableName: 'Leads',
    timestamps: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['priority']
      },
      {
        fields: ['industry_type']
      },
      {
        fields: ['group']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['next_follow_up']
      }
    ]
  });

  Lead.associate = (models) => {
    Lead.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    Lead.belongsTo(models.LeadSource, {
      foreignKey: 'lead_source_id',
      as: 'source'
    });

    Lead.belongsTo(models.Industry, {
      foreignKey: 'industry_id',
      as: 'industry'
    });

    // Many-to-many relationship with tags
    Lead.belongsToMany(models.Tag, {
      through: 'LeadTags',
      foreignKey: 'lead_id',
      otherKey: 'tag_id',
      as: 'tags'
    });
  };

  // Instance methods
  Lead.prototype.updateScore = function() {
    let score = 0;
    
    // Base score from priority
    switch (this.priority) {
      case 'urgent': score += 25; break;
      case 'high': score += 20; break;
      case 'medium': score += 15; break;
      case 'low': score += 10; break;
    }
    
    // Score from qualification
    switch (this.qualification) {
      case 'highly_qualified': score += 30; break;
      case 'qualified': score += 20; break;
      case 'unqualified': score += 5; break;
    }
    
    // Score from confidence
    if (this.confidence) {
      score += Math.round(this.confidence * 20);
    }
    
    // Score from custom fields (if they exist)
    if (this.custom_fields) {
      // Add points for having specific fields
      if (this.custom_fields.roomCount) score += 5;
      if (this.custom_fields.squareFootage) score += 5;
      if (this.custom_fields.employees) score += 5;
      if (this.custom_fields.budget) score += 5;
    }
    
    this.score = Math.min(100, score);
    return this.score;
  };

  Lead.prototype.qualify = function(qualification) {
    this.qualification = qualification;
    this.updateScore();
    return this.save();
  };

  Lead.prototype.addTag = function(tagName) {
    if (!this.tag_names) {
      this.tag_names = [];
    }
    if (!this.tag_names.includes(tagName)) {
      this.tag_names.push(tagName);
    }
    return this.save();
  };

  Lead.prototype.removeTag = function(tagName) {
    if (this.tag_names) {
      this.tag_names = this.tag_names.filter(tag => tag !== tagName);
    }
    return this.save();
  };

  Lead.prototype.setCustomField = function(fieldName, value) {
    if (!this.custom_fields) {
      this.custom_fields = {};
    }
    this.custom_fields[fieldName] = value;
    return this.save();
  };

  Lead.prototype.getCustomField = function(fieldName) {
    return this.custom_fields ? this.custom_fields[fieldName] : null;
  };

  // Class methods
  Lead.findByGroup = function(group, userId) {
    return this.findAll({
      where: { group, user_id: userId },
      order: [['created_at', 'DESC']]
    });
  };

  Lead.findByStatus = function(status, userId) {
    return this.findAll({
      where: { status, user_id: userId },
      order: [['created_at', 'DESC']]
    });
  };

  Lead.findByPriority = function(priority, userId) {
    return this.findAll({
      where: { priority, user_id: userId },
      order: [['created_at', 'DESC']]
    });
  };

  Lead.findByIndustryType = function(industryType, userId) {
    return this.findAll({
      where: { industry_type: industryType, user_id: userId },
      order: [['created_at', 'DESC']]
    });
  };

  Lead.findByKeywords = function(keywords, userId) {
    return this.findAll({
      where: {
        user_id: userId,
        keywords: { [sequelize.Op.overlap]: keywords }
      },
      order: [['created_at', 'DESC']]
    });
  };

  Lead.search = function(searchTerm, userId) {
    return this.findAll({
      where: {
        user_id: userId,
        [sequelize.Op.or]: [
          { title: { [sequelize.Op.iLike]: `%${searchTerm}%` } },
          { description: { [sequelize.Op.iLike]: `%${searchTerm}%` } },
          { company: { [sequelize.Op.iLike]: `%${searchTerm}%` } },
          { location: { [sequelize.Op.iLike]: `%${searchTerm}%` } }
        ]
      },
      order: [['created_at', 'DESC']]
    });
  };

  return Lead;
};
