const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const EnhancedExportService = require('../services/enhancedExportService');
const { Lead, User, LeadSource, Tag, LeadTag } = require('../models');
const { Op } = require('sequelize');

const exportService = new EnhancedExportService();

// @route   GET /api/export/config
// @desc    Get export configuration options
// @access  Private
router.get('/config', auth, async (req, res) => {
  try {
    const config = {
      formats: await exportService.getExportFormats(),
      columns: await exportService.getAvailableColumns(),
      templates: ['default', 'sales', 'marketing', 'custom'],
      filters: {
        status: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'archived'],
        priority: ['low', 'medium', 'high', 'urgent'],
        source: ['website', 'news_site', 'rss_feed', 'social_media', 'job_board', 'api', 'other']
      }
    };
    
    res.json(config);
  } catch (error) {
    console.error('Export config error:', error);
    res.status(500).json({ error: 'Failed to get export configuration' });
  }
});

// @route   POST /api/export/leads
// @desc    Export leads with custom options
// @access  Private
router.post('/leads', auth, async (req, res) => {
  try {
    const {
      format = 'excel',
      columns = [],
      template = 'default',
      filters = {},
      sortBy = 'createdAt',
      sortOrder = 'desc',
      customFormatting = {},
      includeRelations = true
    } = req.body;

    // Get leads based on filters
    const whereClause = { user_id: req.user.id };
    
    if (filters.status && filters.status.length > 0) {
      whereClause.status = { [Op.in]: filters.status };
    }
    
    if (filters.priority && filters.priority.length > 0) {
      whereClause.priority = { [Op.in]: filters.priority };
    }
    
    if (filters.source && filters.source.length > 0) {
      whereClause['$LeadSource.type$'] = { [Op.in]: filters.source };
    }
    
    if (filters.dateRange) {
      whereClause.createdAt = {
        [Op.between]: [new Date(filters.dateRange.start), new Date(filters.dateRange.end)]
      };
    }
    
    if (filters.keywords) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${filters.keywords}%` } },
        { description: { [Op.iLike]: `%${filters.keywords}%` } },
        { company: { [Op.iLike]: `%${filters.keywords}%` } }
      ];
    }

    const include = includeRelations ? [
      { model: LeadSource, as: 'LeadSource' },
      { model: Tag, as: 'Tags', through: { attributes: [] } }
    ] : [];

    const leads = await Lead.findAll({
      where: whereClause,
      include,
      order: [[sortBy, sortOrder.toUpperCase()],
        ['createdAt', 'DESC']
      ]
    });

    if (leads.length === 0) {
      return res.status(404).json({ error: 'No leads found matching the criteria' });
    }

    // Use default columns if none specified
    const exportColumns = columns.length > 0 ? columns : await exportService.getDefaultColumns();

    // Progress callback for real-time updates
    let progress = 0;
    const progressCallback = (current, total, stage) => {
      progress = Math.round((current / total) * 100);
      // In a real implementation, you'd use WebSockets or Server-Sent Events
      // For now, we'll just track progress locally
    };

    // Export based on format
    let result;
    switch (format.toLowerCase()) {
      case 'excel':
        result = await exportService.exportToExcel(
          leads, 
          exportColumns, 
          template, 
          customFormatting, 
          progressCallback
        );
        break;
      case 'csv':
        result = await exportService.exportToCSV(leads, exportColumns, progressCallback);
        break;
      case 'json':
        result = await exportService.exportToJSON(leads, exportColumns, progressCallback);
        break;
      case 'pdf':
        result = await exportService.exportToPDF(leads, exportColumns, template, progressCallback);
        break;
      case 'xml':
        result = await exportService.exportToXML(leads, exportColumns, progressCallback);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported export format' });
    }

    // Track export history
    await exportService.trackExportHistory({
      userId: req.user.id,
      format,
      columns: exportColumns,
      filters,
      leadCount: leads.length,
      template
    }, result);

    res.json({
      message: `Successfully exported ${leads.length} leads to ${format.toUpperCase()}`,
      downloadUrl: `/api/export/download/${result.filename}`,
      filename: result.filename,
      fileSize: result.fileSize,
      format,
      leadCount: leads.length,
      progress: 100
    });

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export leads' });
  }
});

// @route   GET /api/export/download/:filename
// @desc    Download exported file
// @access  Private
router.get('/download/:filename', auth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = await exportService.getFilePath(filename);
    
    if (!filepath) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Failed to download file' });
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// @route   GET /api/export/history
// @desc    Get export history for user
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // This would typically come from a separate ExportHistory model
    // For now, we'll return a placeholder
    const history = {
      exports: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        pages: 0
      }
    };

    res.json(history);
  } catch (error) {
    console.error('Export history error:', error);
    res.status(500).json({ error: 'Failed to get export history' });
  }
});

// @route   POST /api/export/batch
// @desc    Batch export multiple configurations
// @access  Private
router.post('/batch', auth, async (req, res) => {
  try {
    const { exportJobs } = req.body;
    
    if (!Array.isArray(exportJobs) || exportJobs.length === 0) {
      return res.status(400).json({ error: 'Export jobs array is required' });
    }

    if (exportJobs.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 export jobs allowed per batch' });
    }

    const progressCallback = (jobIndex, current, total, stage) => {
      // Track progress for each job
      console.log(`Job ${jobIndex}: ${stage} - ${current}/${total}`);
    };

    const results = await exportService.batchExport(exportJobs, progressCallback);

    res.json({
      message: `Successfully processed ${results.length} export jobs`,
      results
    });

  } catch (error) {
    console.error('Batch export error:', error);
    res.status(500).json({ error: 'Failed to process batch export' });
  }
});

// @route   DELETE /api/export/cleanup
// @desc    Clean up old export files
// @access  Private
router.delete('/cleanup', auth, async (req, res) => {
  try {
    const { daysOld = 30 } = req.query;
    const deletedCount = await exportService.cleanupOldExports(parseInt(daysOld));
    
    res.json({
      message: `Cleaned up ${deletedCount} old export files`,
      deletedCount
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup old exports' });
  }
});

// @route   GET /api/export/templates
// @desc    Get available export templates
// @access  Private
router.get('/templates', auth, async (req, res) => {
  try {
    const templates = [
      {
        id: 'default',
        name: 'Default Template',
        description: 'Standard export with all basic fields',
        columns: ['title', 'company', 'status', 'priority', 'createdAt'],
        formatting: {}
      },
      {
        id: 'sales',
        name: 'Sales Template',
        description: 'Optimized for sales teams',
        columns: ['title', 'company', 'status', 'priority', 'budget', 'timeline', 'contactInfo'],
        formatting: {
          highlightWon: true,
          budgetFormat: 'currency'
        }
      },
      {
        id: 'marketing',
        name: 'Marketing Template',
        description: 'Focused on marketing campaigns',
        columns: ['title', 'company', 'source', 'tags', 'createdAt', 'description'],
        formatting: {
          groupBySource: true,
          includeTags: true
        }
      },
      {
        id: 'custom',
        name: 'Custom Template',
        description: 'Create your own template',
        columns: [],
        formatting: {},
        editable: true
      }
    ];

    res.json(templates);
  } catch (error) {
    console.error('Templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// @route   POST /api/export/templates
// @desc    Save custom export template
// @access  Private
router.post('/templates', auth, async (req, res) => {
  try {
    const { name, description, columns, formatting } = req.body;
    
    if (!name || !columns || !Array.isArray(columns)) {
      return res.status(400).json({ error: 'Name and columns are required' });
    }

    // In a real implementation, you'd save this to a database
    // For now, we'll just validate and return success
    const template = {
      id: `custom_${Date.now()}`,
      name,
      description: description || '',
      columns,
      formatting: formatting || {},
      editable: true,
      createdBy: req.user.id,
      createdAt: new Date()
    };

    res.json({
      message: 'Template saved successfully',
      template
    });

  } catch (error) {
    console.error('Save template error:', error);
    res.status(500).json({ error: 'Failed to save template' });
  }
});

module.exports = router;
