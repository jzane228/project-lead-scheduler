const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Lead, LeadSource, Industry, Tag, User } = require('../models');
const { Op } = require('sequelize');

// @route   GET /api/leads
// @desc    Get basic leads info (no auth required for testing)
// @access  Public (for testing)
router.get('/', async (req, res) => {
  try {
    res.json({
      message: 'Leads endpoint working!',
      note: 'This endpoint requires authentication for full data',
      availableEndpoints: [
        '/api/leads (requires auth)',
        '/api/leads/:id (requires auth)',
        '/api/leads/groups (requires auth)',
        '/api/leads/stats/overview (requires auth)'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Leads error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/leads-auth
// @desc    Get all leads for user with filtering and pagination
// @access  Private
router.get('/auth', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      industry,
      group,
      search,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { user_id: req.user.userId };

    // Apply filters
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (industry) where.industry_id = industry;
    if (group) where.group = group;

    // Search functionality
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { company: { [Op.iLike]: `%${search}%` } },
        { location: { [Op.iLike]: `%${search}%` } },
        { keywords: { [Op.overlap]: [search] } }
      ];
    }

    // Tag filtering
    let includeTags = [];
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      includeTags.push({
        model: Tag,
        as: 'tags',
        where: { name: { [Op.in]: tagArray } },
        required: true
      });
    }

    const leads = await Lead.findAndCountAll({
      where,
      include: [
        {
          model: LeadSource,
          as: 'source',
          attributes: ['id', 'name', 'type', 'url', 'description']
        },
        {
          model: Industry,
          as: 'industry',
          attributes: ['name']
        },
        {
          model: Tag,
          as: 'tags',
          attributes: ['id', 'name', 'color', 'category']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate pagination info
    const totalPages = Math.ceil(leads.count / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      leads: leads.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: leads.count,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// @route   GET /api/leads/groups
// @desc    Get all unique groups for user
// @access  Private
router.get('/groups', auth, async (req, res) => {
  try {
    const groups = await Lead.findAll({
      where: { 
        user_id: req.user.userId,
        group: { [Op.ne]: null }
      },
      attributes: [
        'group',
        [Lead.sequelize.fn('COUNT', Lead.sequelize.col('id')), 'count']
      ],
      group: ['group'],
      order: [['group', 'ASC']]
    });

    res.json({ groups });
  } catch (error) {
    console.error('Error fetching lead groups:', error);
    res.status(500).json({ error: 'Failed to fetch lead groups' });
  }
});

// @route   GET /api/leads/:id
// @desc    Get specific lead by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({
      where: { id: req.params.id, user_id: req.user.userId },
      include: [
        {
          model: LeadSource,
          as: 'source',
          attributes: ['id', 'name', 'type', 'url', 'description']
        },
        {
          model: Industry,
          as: 'industry',
          attributes: ['name']
        },
        {
          model: Tag,
          as: 'tags',
          attributes: ['id', 'name', 'color', 'category']
        }
      ]
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ lead });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// @route   POST /api/leads
// @desc    Create new lead manually
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      projectType,
      location,
      budget,
      timeline,
      company,
      contactInfo,
      industry,
      keywords,
      status,
      priority,
      group,
      tags,
      customFields,
      notes
    } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Create lead
    const lead = await Lead.create({
      title,
      description,
      projectType,
      location,
      budget,
      timeline,
      company,
      contactInfo,
      industry,
      keywords: keywords || [],
      status: status || 'new',
      priority: priority || 'medium',
      group,
      customFields: customFields || {},
      notes,
      user_id: req.user.userId,
      extractionMethod: 'manual'
    });

    // Add tags if provided
    if (tags && tags.length > 0) {
      const tagInstances = await Promise.all(
        tags.map(tagName => Tag.findOrCreateByName(tagName))
      );
      await lead.setTags(tagInstances);
    }

    // Update lead score and qualification
    lead.updateScore();
    lead.qualify();
    await lead.save();

    res.status(201).json({ 
      message: 'Lead created successfully',
      lead 
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// @route   PUT /api/leads/:id
// @desc    Update lead
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({
      where: { id: req.params.id, user_id: req.user.userId }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const {
      title,
      description,
      projectType,
      location,
      budget,
      timeline,
      company,
      contactInfo,
      industry,
      keywords,
      status,
      priority,
      group,
      tags,
      customFields,
      notes,
      nextFollowUp
    } = req.body;

    // Update lead
    await lead.update({
      title,
      description,
      projectType,
      location,
      budget,
      timeline,
      company,
      contactInfo,
      industry,
      keywords: keywords || lead.keywords,
      status,
      priority,
      group,
      customFields: customFields || lead.customFields,
      notes,
      nextFollowUp
    });

    // Update tags if provided
    if (tags) {
      const tagInstances = await Promise.all(
        tags.map(tagName => Tag.findOrCreateByName(tagName))
      );
      await lead.setTags(tagInstances);
    }

    // Update lead score and qualification
    lead.updateScore();
    lead.qualify();
    await lead.save();

    res.json({ 
      message: 'Lead updated successfully',
      lead 
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// @route   DELETE /api/leads/:id
// @desc    Delete lead
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({
      where: { id: req.params.id, user_id: req.user.userId }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await lead.destroy();

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// @route   PATCH /api/leads/:id/status
// @desc    Update lead status
// @access  Private
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const lead = await Lead.findOne({
      where: { id: req.params.id, user_id: req.user.userId }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await lead.update({ status });
    
    // Update score and qualification
    lead.updateScore();
    lead.qualify();
    await lead.save();

    res.json({ 
      message: 'Lead status updated',
      lead 
    });
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(500).json({ error: 'Failed to update lead status' });
  }
});

// @route   PATCH /api/leads/:id/priority
// @desc    Update lead priority
// @access  Private
router.patch('/:id/priority', auth, async (req, res) => {
  try {
    const { priority } = req.body;
    const lead = await Lead.findOne({
      where: { id: req.params.id, user_id: req.user.userId }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await lead.update({ priority });
    
    // Update score and qualification
    lead.updateScore();
    lead.qualify();
    await lead.save();

    res.json({ 
      message: 'Lead priority updated',
      lead 
    });
  } catch (error) {
    console.error('Error updating lead priority:', error);
    res.status(500).json({ error: 'Failed to update lead priority' });
  }
});

// @route   PATCH /api/leads/:id/group
// @desc    Update lead group
// @access  Private
router.patch('/:id/group', auth, async (req, res) => {
  try {
    const { group } = req.body;
    const lead = await Lead.findOne({
      where: { id: req.params.id, user_id: req.user.userId }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await lead.update({ group });

    res.json({ 
      message: 'Lead group updated',
      lead 
    });
  } catch (error) {
    console.error('Error updating lead group:', error);
    res.status(500).json({ error: 'Failed to update lead group' });
  }
});

// @route   POST /api/leads/:id/tags
// @desc    Add tags to lead
// @access  Private
router.post('/:id/tags', auth, async (req, res) => {
  try {
    const { tags } = req.body;
    const lead = await Lead.findOne({
      where: { id: req.params.id, user_id: req.user.userId }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags must be an array' });
    }

    // Find or create tags
    const tagInstances = await Promise.all(
      tags.map(tagName => Tag.findOrCreateByName(tagName))
    );

    // Add tags to lead
    await lead.addTags(tagInstances);

    // Increment usage count for tags
    await Promise.all(tagInstances.map(tag => tag.incrementUsage()));

    res.json({ 
      message: 'Tags added to lead',
      lead 
    });
  } catch (error) {
    console.error('Error adding tags to lead:', error);
    res.status(500).json({ error: 'Failed to add tags to lead' });
  }
});

// @route   DELETE /api/leads/:id/tags/:tagId
// @desc    Remove tag from lead
// @access  Private
router.delete('/:id/tags/:tagId', auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({
      where: { id: req.params.id, user_id: req.user.userId }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const tag = await Tag.findByPk(req.params.tagId);
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Remove tag from lead
    await lead.removeTag(tag);

    // Decrement usage count for tag
    await tag.decrementUsage();

    res.json({ 
      message: 'Tag removed from lead',
      lead 
    });
  } catch (error) {
    console.error('Error removing tag from lead:', error);
    res.status(500).json({ error: 'Failed to remove tag from lead' });
  }
});

// @route   GET /api/leads/stats/overview
// @desc    Get lead statistics overview
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const totalLeads = await Lead.count({
      where: { user_id: req.user.userId }
    });

    const leadsByStatus = await Lead.findAll({
      where: { user_id: req.user.userId },
      attributes: [
        'status',
        [Lead.sequelize.fn('COUNT', Lead.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    const leadsByPriority = await Lead.findAll({
      where: { user_id: req.user.userId },
      attributes: [
        'priority',
        [Lead.sequelize.fn('COUNT', Lead.sequelize.col('id')), 'count']
      ],
      group: ['priority']
    });

    const leadsByIndustry = await Lead.findAll({
      where: { user_id: req.user.userId },
      attributes: [
        'industry_id',
        [Lead.sequelize.fn('COUNT', Lead.sequelize.col('id')), 'count']
      ],
      group: ['industry_id']
    });

    const recentLeads = await Lead.findAll({
      where: { user_id: req.user.userId },
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'title', 'company', 'status', 'createdAt']
    });

    const stats = {
      totalLeads,
      leadsByStatus: leadsByStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.dataValues.count);
        return acc;
      }, {}),
      leadsByPriority: leadsByPriority.reduce((acc, item) => {
        acc[item.priority] = parseInt(item.dataValues.count);
        return acc;
      }, {}),
              leadsByIndustry: leadsByIndustry.reduce((acc, item) => {
          acc[item.industry_id] = parseInt(item.dataValues.count);
          return acc;
        }, {}),
      recentLeads
    };

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching lead stats:', error);
    res.status(500).json({ error: 'Failed to fetch lead statistics' });
  }
});

// @route   POST /api/leads/bulk-update
// @desc    Bulk update multiple leads
// @access  Private
router.post('/bulk-update', auth, async (req, res) => {
  try {
    const { leadIds, updates } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Lead IDs array is required' });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Updates object is required' });
    }

    // Update leads
    const result = await Lead.update(updates, {
      where: { 
        id: { [Op.in]: leadIds },
        user_id: req.user.userId
      }
    });

    // If status or priority was updated, recalculate scores
    if (updates.status || updates.priority) {
      const leads = await Lead.findAll({
        where: { 
          id: { [Op.in]: leadIds },
          user_id: req.user.userId
        }
      });

      for (const lead of leads) {
        lead.updateScore();
        lead.qualify();
        await lead.save();
      }
    }

    res.json({ 
      message: `Updated ${result[0]} leads successfully`,
      updatedCount: result[0]
    });
  } catch (error) {
    console.error('Error bulk updating leads:', error);
    res.status(500).json({ error: 'Failed to bulk update leads' });
  }
});

module.exports = router;

