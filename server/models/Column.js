const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Column = sequelize.define('Column', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Display name for the column'
    },
    field_key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Unique key for storing data in custom_fields'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Description of what to extract from articles'
    },
    data_type: {
      type: DataTypes.ENUM('text', 'number', 'currency', 'date', 'boolean', 'url', 'email', 'phone'),
      defaultValue: 'text',
      comment: 'Data type for the column'
    },
    category: {
      type: DataTypes.ENUM('contact', 'project', 'company', 'location', 'financial', 'timeline', 'custom'),
      defaultValue: 'custom',
      comment: 'Category for organizing columns'
    },
    is_visible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this column is visible by default'
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Order for displaying columns'
    },
    is_system: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this is a system column (cannot be deleted)'
    },
    ai_prompt_template: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Custom AI prompt template for this column'
    },
    validation_rules: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Validation rules like min, max, pattern, etc.'
    },
    default_value: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Default value for new leads'
    }
  }, {
    tableName: 'Columns',
    timestamps: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['field_key'],
        unique: true
      },
      {
        fields: ['category']
      },
      {
        fields: ['display_order']
      },
      {
        fields: ['is_visible']
      }
    ]
  });

  Column.associate = (models) => {
    Column.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  // Instance methods
  Column.prototype.generateAIPrompt = function() {
    if (this.ai_prompt_template) {
      return this.ai_prompt_template;
    }

    // Generate default prompt based on column properties
    const basePrompt = `Extract ${this.description.toLowerCase()}`;

    switch (this.data_type) {
      case 'currency':
        return `${basePrompt}. Return the amount as a number only (e.g., 1500000 for $1.5M)`;
      case 'number':
        return `${basePrompt}. Return as a number only`;
      case 'date':
        return `${basePrompt}. Return in YYYY-MM-DD format`;
      case 'boolean':
        return `${basePrompt}. Return "true" or "false"`;
      case 'email':
        return `${basePrompt}. Return the email address only`;
      case 'phone':
        return `${basePrompt}. Return the phone number only`;
      case 'url':
        return `${basePrompt}. Return the full URL only`;
      default:
        return `${basePrompt}. Return as text`;
    }
  };

  Column.prototype.validateValue = function(value) {
    if (!value && !this.validation_rules.required) {
      return true;
    }

    const rules = this.validation_rules;

    // Type validation
    switch (this.data_type) {
      case 'number':
      case 'currency':
        if (isNaN(value)) return false;
        const num = parseFloat(value);
        if (rules.min !== undefined && num < rules.min) return false;
        if (rules.max !== undefined && num > rules.max) return false;
        break;

      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) return false;
        break;

      case 'boolean':
        if (!['true', 'false', true, false].includes(value)) return false;
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return false;
        break;

      case 'url':
        try {
          new URL(value);
        } catch {
          return false;
        }
        break;

      case 'phone':
        const phoneRegex = /^[\+]?[\d\s\-\(\)\.]{10,}$/;
        if (!phoneRegex.test(value)) return false;
        break;
    }

    // Pattern validation
    if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
      return false;
    }

    return true;
  };

  // Class methods
  Column.findByUser = function(userId) {
    return this.findAll({
      where: { user_id: userId },
      order: [['display_order', 'ASC'], ['created_at', 'ASC']]
    });
  };

  Column.findVisibleByUser = function(userId) {
    return this.findAll({
      where: {
        user_id: userId,
        is_visible: true
      },
      order: [['display_order', 'ASC'], ['created_at', 'ASC']]
    });
  };

  Column.findByCategory = function(userId, category) {
    return this.findAll({
      where: {
        user_id: userId,
        category: category
      },
      order: [['display_order', 'ASC'], ['created_at', 'ASC']]
    });
  };

  Column.createDefaultColumns = async function(userId) {
    const defaultColumns = [
      {
        name: 'Contact Name',
        field_key: 'contact_name',
        description: 'Primary contact person mentioned in the article',
        data_type: 'text',
        category: 'contact',
        is_system: true,
        display_order: 1
      },
      {
        name: 'Contact Email',
        field_key: 'contact_email',
        description: 'Email address of the primary contact',
        data_type: 'email',
        category: 'contact',
        is_system: true,
        display_order: 2
      },
      {
        name: 'Contact Phone',
        field_key: 'contact_phone',
        description: 'Phone number of the primary contact',
        data_type: 'phone',
        category: 'contact',
        is_system: true,
        display_order: 3
      },
      {
        name: 'Project Budget',
        field_key: 'project_budget',
        description: 'Total budget or cost of the project',
        data_type: 'currency',
        category: 'financial',
        is_system: true,
        display_order: 4
      },
      {
        name: 'Completion Date',
        field_key: 'completion_date',
        description: 'Expected or actual completion date',
        data_type: 'date',
        category: 'timeline',
        is_system: true,
        display_order: 5
      },
      {
        name: 'Square Footage',
        field_key: 'square_footage',
        description: 'Total square footage of the project',
        data_type: 'number',
        category: 'project',
        is_system: true,
        display_order: 6
      },
      {
        name: 'Number of Rooms',
        field_key: 'room_count',
        description: 'Number of rooms, units, or spaces',
        data_type: 'number',
        category: 'project',
        is_system: true,
        display_order: 7
      },
      {
        name: 'Job Count',
        field_key: 'job_count',
        description: 'Number of jobs or positions that will be created',
        data_type: 'number',
        category: 'project',
        is_system: true,
        display_order: 8
      }
    ];

    const createdColumns = [];
    const existingColumns = [];

    for (const columnData of defaultColumns) {
      try {
        // Check if column already exists
        const existingColumn = await this.findOne({
          where: {
            field_key: columnData.field_key,
            user_id: userId
          }
        });

        if (existingColumn) {
          existingColumns.push(existingColumn);
          continue; // Skip creation, column already exists
        }

        // Create new column
        const column = await this.create({
          ...columnData,
          user_id: userId
        });
        createdColumns.push(column);
      } catch (error) {
        // Handle unique constraint errors silently
        if (error.name === 'SequelizeUniqueConstraintError') {
          // Column already exists, find it and add to existing
          try {
            const existingColumn = await this.findOne({
              where: {
                field_key: columnData.field_key,
                user_id: userId
              }
            });
            if (existingColumn) {
              existingColumns.push(existingColumn);
            }
          } catch (findError) {
            // Silently ignore find errors for existing columns
          }
        } else {
          // Log other errors but don't fail the process
          console.log(`⚠️ Error creating column ${columnData.name}:`, error.message);
        }
      }
    }

    return [...createdColumns, ...existingColumns]; // Return all columns (created + existing)
  };

  return Column;
};
