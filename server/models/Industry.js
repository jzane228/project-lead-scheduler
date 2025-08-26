const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Industry = sequelize.define('Industry', {
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
        len: [1, 100]
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
    common_keywords: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    suggested_sources: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    }
  });

  return Industry;
};


