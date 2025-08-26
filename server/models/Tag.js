const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Tag = sequelize.define('Tag', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [1, 50]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '#3B82F6',
      validate: {
        is: /^#[0-9A-F]{6}$/i
      }
    },
    category: {
      type: DataTypes.ENUM('industry', 'status', 'priority', 'location', 'custom'),
      defaultValue: 'custom'
    },
    is_system: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'System tags cannot be deleted'
    },
    usage_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of leads using this tag'
    }
  }, {
    tableName: 'Tags',
    timestamps: true,
    indexes: [
      {
        fields: ['name']
      },
      {
        fields: ['category']
      },
      {
        fields: ['is_system']
      }
    ]
  });

  Tag.associate = (models) => {
    Tag.belongsToMany(models.Lead, {
      through: 'LeadTags',
      foreignKey: 'tag_id',
      otherKey: 'lead_id',
      as: 'leads'
    });
  };

  // Instance methods
  Tag.prototype.incrementUsage = function() {
    this.usage_count += 1;
    return this.save();
  };

  Tag.prototype.decrementUsage = function() {
    if (this.usage_count > 0) {
      this.usage_count -= 1;
      return this.save();
    }
    return this;
  };

  // Class methods
  Tag.findByCategory = function(category) {
    return this.findAll({
      where: { category },
      order: [['name', 'ASC']]
    });
  };

  Tag.findMostUsed = function(limit = 10) {
    return this.findAll({
      order: [['usage_count', 'DESC']],
      limit
    });
  };

  Tag.findOrCreateByName = async function(name, options = {}) {
    const [tag, created] = await this.findOrCreate({
      where: { name: name.toLowerCase() },
      defaults: {
        name: name.toLowerCase(),
        color: options.color || '#3B82F6',
        category: options.category || 'custom',
        description: options.description
      }
    });

    if (created) {
      console.log(`Created new tag: ${name}`);
    }

    return tag;
  };

  Tag.createSystemTags = async function() {
    const systemTags = [
      { name: 'hotel', category: 'industry', color: '#EF4444', description: 'Hotel and hospitality projects' },
      { name: 'construction', category: 'industry', color: '#F59E0B', description: 'Construction and development' },
      { name: 'software', category: 'industry', color: '#10B981', description: 'Software and technology' },
      { name: 'healthcare', category: 'industry', color: '#8B5CF6', description: 'Healthcare and medical' },
      { name: 'education', category: 'industry', color: '#06B6D4', description: 'Education and training' },
      { name: 'new', category: 'status', color: '#3B82F6', description: 'New leads' },
      { name: 'contacted', category: 'status', color: '#F59E0B', description: 'Leads that have been contacted' },
      { name: 'qualified', category: 'status', color: '#10B981', description: 'Qualified leads' },
      { name: 'urgent', category: 'priority', color: '#EF4444', description: 'Urgent priority leads' },
      { name: 'high', category: 'priority', color: '#F97316', description: 'High priority leads' },
      { name: 'medium', category: 'priority', color: '#F59E0B', description: 'Medium priority leads' },
      { name: 'low', category: 'priority', color: '#6B7280', description: 'Low priority leads' }
    ];

    for (const tagData of systemTags) {
      await this.findOrCreate({
        where: { name: tagData.name },
        defaults: {
          ...tagData,
          is_system: true
        }
      });
    }

    console.log('System tags created/updated');
  };

  return Tag;
};
