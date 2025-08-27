const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Column, Lead } = require('../models');
const { Op } = require('sequelize');

// @route   GET /api/columns
// @desc    Get all columns for user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const columns = await Column.findByUser(req.user.userId);

    res.json({
      columns,
      total: columns.length
    });
  } catch (error) {
    console.error('Error fetching columns:', error);
    res.status(500).json({ error: 'Failed to fetch columns' });
  }
});

// @route   GET /api/columns/visible
// @desc    Get visible columns for user
// @access  Private
router.get('/visible', auth, async (req, res) => {
  try {
    const columns = await Column.findVisibleByUser(req.user.userId);

    res.json({
      columns,
      total: columns.length
    });
  } catch (error) {
    console.error('Error fetching visible columns:', error);
    res.status(500).json({ error: 'Failed to fetch visible columns' });
  }
});

// @route   GET /api/columns/categories
// @desc    Get columns grouped by category
// @access  Private
router.get('/categories', auth, async (req, res) => {
  try {
    const categories = ['contact', 'project', 'company', 'location', 'financial', 'timeline', 'custom'];

    const categoryColumns = {};
    for (const category of categories) {
      categoryColumns[category] = await Column.findByCategory(req.user.userId, category);
    }

    res.json({
      categories: categoryColumns,
      categoryList: categories
    });
  } catch (error) {
    console.error('Error fetching category columns:', error);
    res.status(500).json({ error: 'Failed to fetch category columns' });
  }
});

// @route   POST /api/columns
// @desc    Create new column
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      field_key,
      description,
      data_type,
      category,
      is_visible,
      display_order,
      ai_prompt_template,
      validation_rules,
      default_value
    } = req.body;

    // Validate required fields
    if (!name || !field_key || !description) {
      return res.status(400).json({
        error: 'Name, field_key, and description are required'
      });
    }

    // Check if field_key already exists
    const existingColumn = await Column.findOne({
      where: {
        field_key,
        user_id: req.user.userId
      }
    });

    if (existingColumn) {
      return res.status(400).json({
        error: 'Field key already exists. Please choose a different field key.'
      });
    }

    // Create column
    const column = await Column.create({
      name,
      field_key,
      description,
      data_type: data_type || 'text',
      category: category || 'custom',
      is_visible: is_visible !== undefined ? is_visible : true,
      display_order: display_order || 0,
      ai_prompt_template,
      validation_rules: validation_rules || {},
      default_value,
      user_id: req.user.userId
    });

    res.status(201).json({
      message: 'Column created successfully',
      column
    });
  } catch (error) {
    console.error('Error creating column:', error);
    res.status(500).json({ error: 'Failed to create column' });
  }
});

// @route   PUT /api/columns/:id
// @desc    Update column
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const column = await Column.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.userId
      }
    });

    if (!column) {
      return res.status(404).json({ error: 'Column not found' });
    }

    // Prevent editing system columns
    if (column.is_system) {
      return res.status(400).json({
        error: 'System columns cannot be modified'
      });
    }

    const {
      name,
      description,
      data_type,
      category,
      is_visible,
      display_order,
      ai_prompt_template,
      validation_rules,
      default_value
    } = req.body;

    // Check field_key uniqueness if being changed
    if (req.body.field_key && req.body.field_key !== column.field_key) {
      const existingColumn = await Column.findOne({
        where: {
          field_key: req.body.field_key,
          user_id: req.user.userId,
          id: { [Op.ne]: req.params.id }
        }
      });

      if (existingColumn) {
        return res.status(400).json({
          error: 'Field key already exists. Please choose a different field key.'
        });
      }
    }

    // Update column
    await column.update({
      name: name || column.name,
      field_key: req.body.field_key || column.field_key,
      description: description || column.description,
      data_type: data_type || column.data_type,
      category: category || column.category,
      is_visible: is_visible !== undefined ? is_visible : column.is_visible,
      display_order: display_order !== undefined ? display_order : column.display_order,
      ai_prompt_template,
      validation_rules: validation_rules || column.validation_rules,
      default_value
    });

    res.json({
      message: 'Column updated successfully',
      column
    });
  } catch (error) {
    console.error('Error updating column:', error);
    res.status(500).json({ error: 'Failed to update column' });
  }
});

// @route   DELETE /api/columns/:id
// @desc    Delete column
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const column = await Column.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.userId
      }
    });

    if (!column) {
      return res.status(404).json({ error: 'Column not found' });
    }

    // Prevent deleting system columns
    if (column.is_system) {
      return res.status(400).json({
        error: 'System columns cannot be deleted'
      });
    }

    // Check if column is being used in any leads
    const leadsUsingColumn = await Lead.findAll({
      where: {
        user_id: req.user.userId,
        custom_fields: {
          [column.field_key]: { [Op.ne]: null }
        }
      }
    });

    if (leadsUsingColumn.length > 0) {
      return res.status(400).json({
        error: `Cannot delete column. It is being used by ${leadsUsingColumn.length} lead(s).`
      });
    }

    await column.destroy();

    res.json({
      message: 'Column deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting column:', error);
    res.status(500).json({ error: 'Failed to delete column' });
  }
});

// @route   POST /api/columns/:id/toggle
// @desc    Toggle column visibility
// @access  Private
router.post('/:id/toggle', auth, async (req, res) => {
  try {
    const column = await Column.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.userId
      }
    });

    if (!column) {
      return res.status(404).json({ error: 'Column not found' });
    }

    await column.update({
      is_visible: !column.is_visible
    });

    res.json({
      message: 'Column visibility updated',
      column
    });
  } catch (error) {
    console.error('Error toggling column visibility:', error);
    res.status(500).json({ error: 'Failed to toggle column visibility' });
  }
});

// @route   POST /api/columns/reorder
// @desc    Reorder columns
// @access  Private
router.post('/reorder', auth, async (req, res) => {
  try {
    const { columnOrders } = req.body;

    if (!Array.isArray(columnOrders)) {
      return res.status(400).json({ error: 'columnOrders must be an array' });
    }

    // Update display order for each column
    for (let i = 0; i < columnOrders.length; i++) {
      const columnId = columnOrders[i];
      await Column.update(
        { display_order: i },
        {
          where: {
            id: columnId,
            user_id: req.user.userId
          }
        }
      );
    }

    res.json({
      message: 'Columns reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering columns:', error);
    res.status(500).json({ error: 'Failed to reorder columns' });
  }
});

// @route   POST /api/columns/initialize
// @desc    Create default columns for user
// @access  Private
router.post('/initialize', auth, async (req, res) => {
  try {
    // Check if user already has columns
    const existingColumns = await Column.findByUser(req.user.userId);

    if (existingColumns.length > 0) {
      return res.status(400).json({
        error: 'User already has columns initialized'
      });
    }

    // Create default columns
    const defaultColumns = await Column.createDefaultColumns(req.user.userId);

    res.status(201).json({
      message: 'Default columns created successfully',
      columns: defaultColumns,
      total: defaultColumns.length
    });
  } catch (error) {
    console.error('Error initializing default columns:', error);
    res.status(500).json({ error: 'Failed to initialize default columns' });
  }
});

// @route   GET /api/columns/:id/preview
// @desc    Preview AI prompt for column
// @access  Private
router.get('/:id/preview', auth, async (req, res) => {
  try {
    const column = await Column.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.userId
      }
    });

    if (!column) {
      return res.status(404).json({ error: 'Column not found' });
    }

    const aiPrompt = column.generateAIPrompt();

    res.json({
      column: {
        id: column.id,
        name: column.name,
        description: column.description,
        data_type: column.data_type
      },
      aiPrompt,
      preview: true
    });
  } catch (error) {
    console.error('Error generating AI prompt preview:', error);
    res.status(500).json({ error: 'Failed to generate AI prompt preview' });
  }
});

module.exports = router;
