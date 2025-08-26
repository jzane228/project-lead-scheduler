const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Tag, Lead } = require('../models');

// @route   GET /api/tags
// @desc    Get all tags
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const tags = await Tag.findAll({
      order: [['name', 'ASC']]
    });

    res.json({ tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// @route   POST /api/tags
// @desc    Create new tag
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, color, category } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    // Check if tag already exists
    const existingTag = await Tag.findOne({
      where: { name: name.toLowerCase() }
    });

    if (existingTag) {
      return res.status(400).json({ error: 'Tag already exists' });
    }

    const tag = await Tag.create({
      name: name.toLowerCase(),
      description,
      color: color || '#3B82F6',
      category: category || 'custom'
    });

    res.status(201).json({ 
      message: 'Tag created successfully',
      tag 
    });
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// @route   PUT /api/tags/:id
// @desc    Update tag
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, color, category } = req.body;
    const tag = await Tag.findByPk(req.params.id);

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Check if tag is system tag
    if (tag.isSystem) {
      return res.status(400).json({ error: 'System tags cannot be modified' });
    }

    // Check if new name conflicts with existing tag
    if (name && name !== tag.name) {
      const existingTag = await Tag.findOne({
        where: { name: name.toLowerCase() }
      });

      if (existingTag) {
        return res.status(400).json({ error: 'Tag name already exists' });
      }
    }

    await tag.update({
      name: name ? name.toLowerCase() : tag.name,
      description: description !== undefined ? description : tag.description,
      color: color || tag.color,
      category: category || tag.category
    });

    res.json({ 
      message: 'Tag updated successfully',
      tag 
    });
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// @route   DELETE /api/tags/:id
// @desc    Delete tag
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const tag = await Tag.findByPk(req.params.id);

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Check if tag is system tag
    if (tag.isSystem) {
      return res.status(400).json({ error: 'System tags cannot be deleted' });
    }

    // Check if tag is being used by any leads
    const leadCount = await Lead.count({
      include: [{
        model: Tag,
        as: 'tags',
        where: { id: tag.id }
      }]
    });

    if (leadCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete tag. It is being used by ${leadCount} lead(s).` 
      });
    }

    await tag.destroy();

    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// @route   GET /api/tags/:id
// @desc    Get specific tag
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const tag = await Tag.findByPk(req.params.id);

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json({ tag });
  } catch (error) {
    console.error('Error fetching tag:', error);
    res.status(500).json({ error: 'Failed to fetch tag' });
  }
});

// @route   GET /api/tags/category/:category
// @desc    Get tags by category
// @access  Private
router.get('/category/:category', auth, async (req, res) => {
  try {
    const tags = await Tag.findAll({
      where: { category: req.params.category },
      order: [['name', 'ASC']]
    });

    res.json({ tags });
  } catch (error) {
    console.error('Error fetching tags by category:', error);
    res.status(500).json({ error: 'Failed to fetch tags by category' });
  }
});

// @route   GET /api/tags/most-used
// @desc    Get most used tags
// @access  Private
router.get('/most-used', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const tags = await Tag.findMostUsed(parseInt(limit));

    res.json({ tags });
  } catch (error) {
    console.error('Error fetching most used tags:', error);
    res.status(500).json({ error: 'Failed to fetch most used tags' });
  }
});

// @route   POST /api/tags/initialize-system
// @desc    Initialize system tags (admin only)
// @access  Private
router.post('/initialize-system', auth, async (req, res) => {
  try {
    await Tag.createSystemTags();
    
    res.json({ message: 'System tags initialized successfully' });
  } catch (error) {
    console.error('Error initializing system tags:', error);
    res.status(500).json({ error: 'Failed to initialize system tags' });
  }
});

module.exports = router;



