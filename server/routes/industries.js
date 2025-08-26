const express = require('express');
const router = express.Router();
const { Industry } = require('../models');

// @route   GET /api/industries
// @desc    Get all available industries
// @access  Public
router.get('/', async (req, res) => {
  try {
    const industries = await Industry.findAll({
      order: [['name', 'ASC']]
    });

    res.json({ industries });
  } catch (error) {
    console.error('Error fetching industries:', error);
    res.status(500).json({ error: 'Failed to fetch industries' });
  }
});

// @route   GET /api/industries/:id
// @desc    Get specific industry by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const industry = await Industry.findByPk(req.params.id);
    
    if (!industry) {
      return res.status(404).json({ error: 'Industry not found' });
    }

    res.json({ industry });
  } catch (error) {
    console.error('Error fetching industry:', error);
    res.status(500).json({ error: 'Failed to fetch industry' });
  }
});

module.exports = router;




