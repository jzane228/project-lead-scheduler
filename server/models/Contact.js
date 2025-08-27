const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Contact = sequelize.define('Contact', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Contact person name'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Job title or role'
    },
    company: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Company or organization'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      },
      comment: 'Email address'
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Phone number'
    },
    linkedin_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'LinkedIn profile URL'
    },
    twitter_handle: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Twitter handle'
    },
    contact_type: {
      type: DataTypes.ENUM('primary', 'secondary', 'executive', 'representative', 'media', 'other'),
      defaultValue: 'representative',
      comment: 'Type of contact'
    },
    confidence_score: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0,
        max: 1
      },
      comment: 'AI confidence in contact information accuracy'
    },
    source_text: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Original text from which contact was extracted'
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether contact information has been verified'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes about the contact'
    }
  }, {
    tableName: 'Contacts',
    timestamps: true,
    indexes: [
      {
        fields: ['lead_id']
      },
      {
        fields: ['email'],
        unique: false
      },
      {
        fields: ['phone']
      },
      {
        fields: ['contact_type']
      },
      {
        fields: ['is_verified']
      },
      {
        fields: ['name']
      },
      {
        fields: ['company']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  Contact.associate = (models) => {
    Contact.belongsTo(models.Lead, {
      foreignKey: 'lead_id',
      as: 'lead'
    });

    Contact.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  // Instance methods
  Contact.prototype.getDisplayName = function() {
    if (this.name && this.title) {
      return `${this.name} (${this.title})`;
    } else if (this.name) {
      return this.name;
    } else if (this.title) {
      return this.title;
    }
    return 'Unknown Contact';
  };

  Contact.prototype.getFullContactString = function() {
    const parts = [];
    if (this.name) parts.push(this.name);
    if (this.title) parts.push(this.title);
    if (this.company) parts.push(this.company);
    return parts.join(', ') || 'Unknown Contact';
  };

  Contact.prototype.searchContacts = function(searchTerm) {
    const term = searchTerm.toLowerCase();
    return (
      (this.name && this.name.toLowerCase().includes(term)) ||
      (this.title && this.title.toLowerCase().includes(term)) ||
      (this.company && this.company.toLowerCase().includes(term)) ||
      (this.email && this.email.toLowerCase().includes(term))
    );
  };

  Contact.prototype.hasContactInfo = function() {
    return !!(this.email || this.phone || this.linkedin_url || this.twitter_handle);
  };

  // Class methods
  Contact.findByLead = function(leadId) {
    return this.findAll({
      where: { lead_id: leadId },
      order: [
        ['contact_type', 'ASC'], // Primary first
        ['confidence_score', 'DESC'], // Higher confidence first
        ['created_at', 'ASC'] // Earlier contacts first
      ]
    });
  };

  Contact.findPrimaryContact = function(leadId) {
    return this.findOne({
      where: {
        lead_id: leadId,
        contact_type: 'primary'
      }
    });
  };

  Contact.searchContacts = function(searchTerm, userId, limit = 20) {
    const term = searchTerm.toLowerCase();
    return this.findAll({
      where: {
        user_id: userId,
        [sequelize.Op.or]: [
          { name: { [sequelize.Op.iLike]: `%${term}%` } },
          { title: { [sequelize.Op.iLike]: `%${term}%` } },
          { company: { [sequelize.Op.iLike]: `%${term}%` } },
          { email: { [sequelize.Op.iLike]: `%${term}%` } },
          { phone: { [sequelize.Op.iLike]: `%${term}%` } }
        ]
      },
      include: [{
        model: sequelize.models.Lead,
        as: 'lead',
        attributes: ['id', 'title', 'company', 'status']
      }],
      limit,
      order: [['created_at', 'DESC']]
    });
  };

  Contact.findContactsWithInfo = function(leadId) {
    return this.findAll({
      where: {
        lead_id: leadId,
        [sequelize.Op.or]: [
          { email: { [sequelize.Op.ne]: null } },
          { phone: { [sequelize.Op.ne]: null } },
          { linkedin_url: { [sequelize.Op.ne]: null } },
          { twitter_handle: { [sequelize.Op.ne]: null } }
        ]
      },
      order: [
        ['contact_type', 'ASC'],
        ['confidence_score', 'DESC']
      ]
    });
  };

  Contact.createFromExtraction = async function(contactData, leadId, userId) {
    // Validate contact data
    if (!contactData || (!contactData.name && !contactData.title && !contactData.company)) {
      return null;
    }

    try {
      const contact = await this.create({
        ...contactData,
        lead_id: leadId,
        user_id: userId
      });

      return contact;
    } catch (error) {
      console.error('Error creating contact from extraction:', error);
      return null;
    }
  };

  Contact.bulkCreateFromExtraction = async function(contactsArray, leadId, userId) {
    if (!Array.isArray(contactsArray)) return [];

    const createdContacts = [];
    for (const contactData of contactsArray) {
      const contact = await this.createFromExtraction(contactData, leadId, userId);
      if (contact) {
        createdContacts.push(contact);
      }
    }

    return createdContacts;
  };

  Contact.deduplicateContacts = async function(contactsArray) {
    const uniqueContacts = [];
    const seen = new Set();

    for (const contact of contactsArray) {
      // Create a unique identifier based on name, email, and phone
      const identifier = [
        contact.name || '',
        contact.email || '',
        contact.phone || ''
      ].join('|').toLowerCase();

      if (!seen.has(identifier) && identifier.trim() !== '|') {
        seen.add(identifier);
        uniqueContacts.push(contact);
      }
    }

    return uniqueContacts;
  };

  return Contact;
};
