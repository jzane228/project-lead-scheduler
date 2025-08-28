const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Contact, Lead } = require('../models');
const { Op } = require('sequelize');

// @route   GET /api/contacts
// @desc    Get all contacts for user with optional search
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      search,
      lead_id,
      contact_type,
      has_contact_info,
      limit = 50,
      offset = 0
    } = req.query;

    const where = { user_id: req.user.userId };

    // Apply filters
    if (lead_id) where.lead_id = lead_id;
    if (contact_type) where.contact_type = contact_type;

    if (has_contact_info === 'true') {
      where[Op.or] = [
        { email: { [Op.ne]: null } },
        { phone: { [Op.ne]: null } },
        { linkedin_url: { [Op.ne]: null } },
        { twitter_handle: { [Op.ne]: null } }
      ];
    }

    // Search functionality
    if (search) {
      const searchTerm = search.toLowerCase();
      where[Op.or] = [
        { name: { [Op.iLike]: `%${searchTerm}%` } },
        { title: { [Op.iLike]: `%${searchTerm}%` } },
        { company: { [Op.iLike]: `%${searchTerm}%` } },
        { email: { [Op.iLike]: `%${searchTerm}%` } },
        { phone: { [Op.iLike]: `%${searchTerm}%` } }
      ];
    }

    const contacts = await Contact.findAll({
      where,
      include: [{
        model: Lead,
        as: 'lead',
        attributes: ['id', 'title', 'company', 'status', 'url']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [
        ['contact_type', 'ASC'], // Primary contacts first
        ['confidence_score', 'DESC'], // Higher confidence first
        ['created_at', 'DESC'] // Most recent first
      ]
    });

    const total = await Contact.count({ where });

    res.json({
      contacts,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// @route   GET /api/contacts/:id
// @desc    Get single contact by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.userId
      },
      include: [{
        model: Lead,
        as: 'lead',
        attributes: ['id', 'title', 'company', 'status', 'url']
      }]
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ contact });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// @route   POST /api/contacts
// @desc    Create new contact
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      lead_id,
      name,
      title,
      company,
      email,
      phone,
      linkedin_url,
      twitter_handle,
      contact_type,
      confidence_score,
      source_text,
      notes
    } = req.body;

    // Validate required fields
    if (!lead_id) {
      return res.status(400).json({ error: 'Lead ID is required' });
    }

    // Verify lead belongs to user
    const lead = await Lead.findOne({
      where: { id: lead_id, user_id: req.user.userId }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found or access denied' });
    }

    // Create contact
    const contact = await Contact.create({
      lead_id,
      name,
      title,
      company,
      email,
      phone,
      linkedin_url,
      twitter_handle,
      contact_type: contact_type || 'representative',
      confidence_score,
      source_text,
      notes,
      user_id: req.user.userId
    });

    // Fetch the created contact with lead information
    const createdContact = await Contact.findOne({
      where: { id: contact.id },
      include: [{
        model: Lead,
        as: 'lead',
        attributes: ['id', 'title', 'company', 'status']
      }]
    });

    res.status(201).json({
      message: 'Contact created successfully',
      contact: createdContact
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// @route   PUT /api/contacts/:id
// @desc    Update contact
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.userId
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const {
      name,
      title,
      company,
      email,
      phone,
      linkedin_url,
      twitter_handle,
      contact_type,
      confidence_score,
      source_text,
      notes,
      is_verified
    } = req.body;

    // Update contact
    await contact.update({
      name,
      title,
      company,
      email,
      phone,
      linkedin_url,
      twitter_handle,
      contact_type,
      confidence_score,
      source_text,
      notes,
      is_verified
    });

    // Fetch updated contact with lead information
    const updatedContact = await Contact.findOne({
      where: { id: req.params.id },
      include: [{
        model: Lead,
        as: 'lead',
        attributes: ['id', 'title', 'company', 'status']
      }]
    });

    res.json({
      message: 'Contact updated successfully',
      contact: updatedContact
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// @route   DELETE /api/contacts/:id
// @desc    Delete contact
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.userId
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    await contact.destroy();

    res.json({
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// @route   GET /api/contacts/lead/:leadId
// @desc    Get all contacts for a specific lead
// @access  Private
router.get('/lead/:leadId', auth, async (req, res) => {
  try {
    // Verify lead belongs to user
    const lead = await Lead.findOne({
      where: { id: req.params.leadId, user_id: req.user.userId }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found or access denied' });
    }

    const contacts = await Contact.findByLead(req.params.leadId);

    res.json({
      contacts,
      total: contacts.length,
      lead: {
        id: lead.id,
        title: lead.title,
        company: lead.company
      }
    });
  } catch (error) {
    console.error('Error fetching lead contacts:', error);
    res.status(500).json({ error: 'Failed to fetch lead contacts' });
  }
});

// @route   POST /api/contacts/bulk-create
// @desc    Create multiple contacts from extraction data
// @access  Private
router.post('/bulk-create', auth, async (req, res) => {
  try {
    const { contacts, lead_id } = req.body;

    if (!Array.isArray(contacts) || !lead_id) {
      return res.status(400).json({ error: 'Contacts array and lead_id are required' });
    }

    // Verify lead belongs to user
    const lead = await Lead.findOne({
      where: { id: lead_id, user_id: req.user.userId }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found or access denied' });
    }

    // Deduplicate contacts before creation
    const uniqueContacts = await Contact.deduplicateContacts(contacts);

    // Create contacts
    const createdContacts = await Contact.bulkCreateFromExtraction(uniqueContacts, lead_id, req.user.userId);

    res.status(201).json({
      message: `Created ${createdContacts.length} contacts`,
      contacts: createdContacts,
      duplicates_removed: contacts.length - uniqueContacts.length
    });
  } catch (error) {
    console.error('Error bulk creating contacts:', error);
    res.status(500).json({ error: 'Failed to bulk create contacts' });
  }
});

// @route   POST /api/contacts/:id/verify
// @desc    Mark contact as verified
// @access  Private
router.post('/:id/verify', auth, async (req, res) => {
  try {
    const contact = await Contact.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.userId
      }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    await contact.update({ is_verified: true });

    res.json({
      message: 'Contact verified successfully',
      contact
    });
  } catch (error) {
    console.error('Error verifying contact:', error);
    res.status(500).json({ error: 'Failed to verify contact' });
  }
});

// @route   GET /api/contacts/search
// @desc    Search contacts across all leads
// @access  Private
router.get('/search/:query', auth, async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 20 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const contacts = await Contact.searchContacts(query.trim(), req.user.userId, parseInt(limit));

    res.json({
      contacts,
      total: contacts.length,
      query
    });
  } catch (error) {
    console.error('Error searching contacts:', error);
    res.status(500).json({ error: 'Failed to search contacts' });
  }
});

// @route   GET /api/contacts/stats
// @desc    Get contact statistics
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const totalContacts = await Contact.count({
      where: { user_id: req.user.userId }
    });

    const contactsWithEmail = await Contact.count({
      where: {
        user_id: req.user.userId,
        email: { [Op.ne]: null }
      }
    });

    const contactsWithPhone = await Contact.count({
      where: {
        user_id: req.user.userId,
        phone: { [Op.ne]: null }
      }
    });

    const verifiedContacts = await Contact.count({
      where: {
        user_id: req.user.userId,
        is_verified: true
      }
    });

    const contactTypes = await Contact.findAll({
      where: { user_id: req.user.userId },
      attributes: [
        'contact_type',
        [Contact.sequelize.fn('COUNT', Contact.sequelize.col('id')), 'count']
      ],
      group: ['contact_type']
    });

    const contactTypeStats = contactTypes.reduce((acc, type) => {
      acc[type.contact_type] = parseInt(type.dataValues.count);
      return acc;
    }, {});

    res.json({
      totalContacts,
      contactsWithEmail,
      contactsWithPhone,
      verifiedContacts,
      contactTypeStats,
      emailPercentage: totalContacts > 0 ? Math.round((contactsWithEmail / totalContacts) * 100) : 0,
      phonePercentage: totalContacts > 0 ? Math.round((contactsWithPhone / totalContacts) * 100) : 0,
      verifiedPercentage: totalContacts > 0 ? Math.round((verifiedContacts / totalContacts) * 100) : 0
    });
  } catch (error) {
    console.error('Error fetching contact stats:', error);
    res.status(500).json({ error: 'Failed to fetch contact statistics' });
  }
});

module.exports = router;

