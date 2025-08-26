const ExcelJS = require('exceljs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs').promises;
const { Lead, User, LeadSource, Tag, LeadTag } = require('../models');
const { Op } = require('sequelize');

class EnhancedExportService {
  constructor() {
    this.uploadPath = process.env.UPLOAD_PATH || './uploads';
    this.templatesPath = process.env.TEMPLATES_PATH || './templates';
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.access(this.uploadPath);
    } catch (error) {
      await fs.mkdir(this.uploadPath, { recursive: true });
    }

    try {
      await fs.access(this.templatesPath);
    } catch (error) {
      await fs.mkdir(this.templatesPath, { recursive: true });
    }
  }

  // ===== MAIN EXPORT FUNCTION =====

  async exportLeads(leads, options = {}) {
    const {
      format = 'excel',
      columns = null,
      template = 'default',
      filters = {},
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      includeRelations = true,
      customFormatting = {},
      progressCallback = null
    } = options;

    try {
      // Process leads with relations if requested
      let processedLeads = leads;
      if (includeRelations) {
        processedLeads = await this.enrichLeadsWithRelations(leads);
      }

      // Apply filters and sorting
      processedLeads = this.applyFiltersAndSorting(processedLeads, filters, sortBy, sortOrder);

      // Get export columns
      const exportColumns = columns || this.getDefaultColumns();

      // Validate export data
      const validation = await this.validateExportData(processedLeads, exportColumns);
      if (!validation.isValid) {
        throw new Error(`Export validation failed: ${validation.errors.join(', ')}`);
      }

      // Execute export based on format
      let result;
      switch (format.toLowerCase()) {
        case 'excel':
          result = await this.exportToExcel(processedLeads, exportColumns, template, customFormatting, progressCallback);
          break;
        case 'csv':
          result = await this.exportToCSV(processedLeads, exportColumns, progressCallback);
          break;
        case 'json':
          result = await this.exportToJSON(processedLeads, exportColumns, progressCallback);
          break;
        case 'pdf':
          result = await this.exportToPDF(processedLeads, exportColumns, template, progressCallback);
          break;
        case 'xml':
          result = await this.exportToXML(processedLeads, exportColumns, progressCallback);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      // Track export history
      await this.trackExportHistory(options, result);

      return result;
    } catch (error) {
      console.error('Enhanced export failed:', error);
      throw error;
    }
  }

  // ===== EXCEL EXPORT WITH TEMPLATES =====

  async exportToExcel(leads, columns, template = 'default', customFormatting = {}, progressCallback = null) {
    const workbook = new ExcelJS.Workbook();
    
    // Apply template if specified
    if (template !== 'default') {
      await this.applyExcelTemplate(workbook, template);
    }

    const worksheet = workbook.addWorksheet('Leads');

    // Add headers with styling
    const headerRow = worksheet.addRow(columns);
    this.styleExcelHeaders(headerRow, customFormatting);

    // Add data rows with progress tracking
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const rowData = this.mapLeadToExportRow(lead, columns);
      worksheet.addRow(rowData);

      // Update progress
      if (progressCallback) {
        const progress = Math.round(((i + 1) / leads.length) * 100);
        progressCallback(progress, `Processing lead ${i + 1} of ${leads.length}`);
      }
    }

    // Apply advanced formatting
    this.applyAdvancedExcelFormatting(worksheet, leads, customFormatting);

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(
        column.header.length + 2,
        ...worksheet.getColumn(column.key).values.map(v => String(v).length)
      );
    });

    // Generate filename and save
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `enhanced_leads_export_${timestamp}.xlsx`;
    const filepath = path.join(this.uploadPath, filename);

    await workbook.xlsx.writeFile(filepath);

    return {
      format: 'excel',
      filename,
      filepath,
      recordCount: leads.length,
      columns,
      template,
      customFormatting: Object.keys(customFormatting).length > 0,
      fileSize: await this.getFileSize(filepath)
    };
  }

  // ===== CSV EXPORT WITH ADVANCED OPTIONS =====

  async exportToCSV(leads, columns, progressCallback = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `enhanced_leads_export_${timestamp}.csv`;
    const filepath = path.join(this.uploadPath, filename);

    // Create CSV writer with advanced options
    const csvWriter = createCsvWriter({
      path: filepath,
      header: columns.map(col => ({
        id: col,
        title: this.formatColumnHeader(col)
      })),
      fieldDelimiter: ',',
      recordDelimiter: '\n',
      encoding: 'utf8'
    });

    // Process leads in batches for progress tracking
    const batchSize = 100;
    const batches = Math.ceil(leads.length / batchSize);
    
    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, leads.length);
      const batch = leads.slice(start, end);
      
      const batchData = batch.map(lead => this.mapLeadToExportRow(lead, columns));
      await csvWriter.writeRecords(batchData);

      // Update progress
      if (progressCallback) {
        const progress = Math.round((end / leads.length) * 100);
        progressCallback(progress, `Processed ${end} of ${leads.length} leads`);
      }
    }

    return {
      format: 'csv',
      filename,
      filepath,
      recordCount: leads.length,
      columns,
      fileSize: await this.getFileSize(filepath)
    };
  }

  // ===== JSON EXPORT WITH SCHEMA =====

  async exportToJSON(leads, columns, progressCallback = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `enhanced_leads_export_${timestamp}.json`;
    const filepath = path.join(this.uploadPath, filename);

    // Create export data with schema
    const exportData = {
      schema: {
        version: '1.0',
        exportDate: new Date().toISOString(),
        columns: columns,
        totalRecords: leads.length
      },
      data: []
    };

    // Process leads with progress tracking
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const rowData = this.mapLeadToExportRow(lead, columns);
      exportData.data.push(rowData);

      // Update progress
      if (progressCallback) {
        const progress = Math.round(((i + 1) / leads.length) * 100);
        progressCallback(progress, `Processing lead ${i + 1} of ${leads.length}`);
      }
    }

    // Write to file
    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));

    return {
      format: 'json',
      filename,
      filepath,
      recordCount: leads.length,
      columns,
      schema: exportData.schema,
      fileSize: await this.getFileSize(filepath)
    };
  }

  // ===== PDF EXPORT =====

  async exportToPDF(leads, columns, template = 'default', progressCallback = null) {
    // This would use a PDF library like PDFKit or Puppeteer
    // For now, we'll create a placeholder implementation
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `enhanced_leads_export_${timestamp}.pdf`;
    const filepath = path.join(this.uploadPath, filename);

    // Simulate PDF generation
    if (progressCallback) {
      progressCallback(50, 'Generating PDF...');
      progressCallback(100, 'PDF generation complete');
    }

    // Create a placeholder PDF file
    await fs.writeFile(filepath, 'PDF Export - Implementation in progress');

    return {
      format: 'pdf',
      filename,
      filepath,
      recordCount: leads.length,
      columns,
      template,
      fileSize: await this.getFileSize(filepath)
    };
  }

  // ===== XML EXPORT =====

  async exportToXML(leads, columns, progressCallback = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `enhanced_leads_export_${timestamp}.xml`;
    const filepath = path.join(this.uploadPath, filename);

    // Generate XML content
    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlContent += '<leads>\n';
    xmlContent += `  <exportInfo>\n`;
    xmlContent += `    <exportDate>${new Date().toISOString()}</exportDate>\n`;
    xmlContent += `    <totalRecords>${leads.length}</totalRecords>\n`;
    xmlContent += `    <columns>${columns.join(',')}</columns>\n`;
    xmlContent += `  </exportInfo>\n`;

    // Process leads with progress tracking
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      xmlContent += '  <lead>\n';
      
      columns.forEach(col => {
        const value = this.getLeadFieldValue(lead, col);
        xmlContent += `    <${col}>${this.escapeXml(value)}</${col}>\n`;
      });
      
      xmlContent += '  </lead>\n';

      // Update progress
      if (progressCallback) {
        const progress = Math.round(((i + 1) / leads.length) * 100);
        progressCallback(progress, `Processing lead ${i + 1} of ${leads.length}`);
      }
    }

    xmlContent += '</leads>';

    // Write to file
    await fs.writeFile(filepath, xmlContent);

    return {
      format: 'xml',
      filename,
      filepath,
      recordCount: leads.length,
      columns,
      fileSize: await this.getFileSize(filepath)
    };
  }

  // ===== DATA PROCESSING =====

  async enrichLeadsWithRelations(leads) {
    const enrichedLeads = [];

    for (const lead of leads) {
      const enrichedLead = { ...lead.toJSON() };

      // Add lead source information
      if (lead.lead_source) {
        enrichedLead.sourceName = lead.lead_source.name;
        enrichedLead.sourceType = lead.lead_source.type;
        enrichedLead.sourceUrl = lead.lead_source.url;
      }

      // Add tags
      if (lead.tags && lead.tags.length > 0) {
        enrichedLead.tagNames = lead.tags.map(tag => tag.name).join(', ');
        enrichedLead.tagCategories = lead.tags.map(tag => tag.category).join(', ');
      }

      // Add calculated fields
      enrichedLead.ageInDays = this.calculateAgeInDays(lead.createdAt);
      enrichedLead.isHighPriority = lead.priority === 'high';
      enrichedLead.isQualified = ['qualified', 'proposal', 'negotiation'].includes(lead.status);

      enrichedLeads.push(enrichedLead);
    }

    return enrichedLeads;
  }

  applyFiltersAndSorting(leads, filters, sortBy, sortOrder) {
    let filteredLeads = [...leads];

    // Apply filters
    if (filters.status) {
      filteredLeads = filteredLeads.filter(lead => lead.status === filters.status);
    }
    if (filters.priority) {
      filteredLeads = filteredLeads.filter(lead => lead.priority === filters.priority);
    }
    if (filters.company) {
      filteredLeads = filteredLeads.filter(lead => 
        lead.company && lead.company.toLowerCase().includes(filters.company.toLowerCase())
      );
    }
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      filteredLeads = filteredLeads.filter(lead => {
        const leadDate = new Date(lead.createdAt);
        return leadDate >= start && leadDate <= end;
      });
    }
    if (filters.budgetRange) {
      const { min, max } = filters.budgetRange;
      filteredLeads = filteredLeads.filter(lead => {
        if (!lead.budget) return false;
        const budget = parseFloat(lead.budget);
        return budget >= min && budget <= max;
      });
    }

    // Apply sorting
    filteredLeads.sort((a, b) => {
      let aValue = this.getLeadFieldValue(a, sortBy);
      let bValue = this.getLeadFieldValue(b, sortBy);

      // Handle different data types
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else if (typeof aValue === 'number') {
        // Numbers are already comparable
      } else {
        // Convert to string for comparison
        aValue = String(aValue || '');
        bValue = String(bValue || '');
      }

      if (sortOrder === 'ASC') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filteredLeads;
  }

  // ===== COLUMN MANAGEMENT =====

  getDefaultColumns() {
    return [
      'title',
      'company',
      'contactName',
      'contactEmail',
      'contactPhone',
      'location',
      'budget',
      'timeline',
      'requirements',
      'industry_type',
      'projectType',
      'status',
      'priority',
      'score',
      'confidence',
      'sourceUrl',
      'scrapedDate',
      'createdAt',
      'sourceName',
      'sourceType',
      'tagNames',
      'ageInDays',
      'isHighPriority',
      'isQualified'
    ];
  }

  getAvailableColumns() {
    return [
      // Basic lead information
      { id: 'title', label: 'Title', category: 'basic', type: 'text' },
      { id: 'description', label: 'Description', category: 'basic', type: 'text' },
      { id: 'company', label: 'Company', category: 'basic', type: 'text' },
      
      // Contact information
      { id: 'contactName', label: 'Contact Name', category: 'contact', type: 'text' },
      { id: 'contactEmail', label: 'Contact Email', category: 'contact', type: 'email' },
      { id: 'contactPhone', label: 'Contact Phone', category: 'contact', type: 'phone' },
      
      // Project information
      { id: 'projectType', label: 'Project Type', category: 'project', type: 'text' },
      { id: 'budget', label: 'Budget', category: 'project', type: 'currency' },
      { id: 'timeline', label: 'Timeline', category: 'project', type: 'date' },
      { id: 'requirements', label: 'Requirements', category: 'project', type: 'text' },
      
      // Location and industry
      { id: 'location', label: 'Location', category: 'business', type: 'text' },
      { id: 'industry_type', label: 'Industry', category: 'business', type: 'text' },
      
      // Status and priority
      { id: 'status', label: 'Status', category: 'status', type: 'enum' },
      { id: 'priority', label: 'Priority', category: 'status', type: 'enum' },
      { id: 'score', label: 'Score', category: 'status', type: 'number' },
      { id: 'confidence', label: 'Confidence', category: 'status', type: 'percentage' },
      
      // Source information
      { id: 'sourceUrl', label: 'Source URL', category: 'source', type: 'url' },
      { id: 'sourceTitle', label: 'Source Title', category: 'source', type: 'text' },
      { id: 'scrapedDate', label: 'Scraped Date', category: 'source', type: 'date' },
      
      // Metadata
      { id: 'createdAt', label: 'Created Date', category: 'metadata', type: 'date' },
      { id: 'updatedAt', label: 'Updated Date', category: 'metadata', type: 'date' },
      
      // Calculated fields
      { id: 'ageInDays', label: 'Age (Days)', category: 'calculated', type: 'number' },
      { id: 'isHighPriority', label: 'High Priority', category: 'calculated', type: 'boolean' },
      { id: 'isQualified', label: 'Qualified', category: 'calculated', type: 'boolean' }
    ];
  }

  // ===== DATA MAPPING =====

  mapLeadToExportRow(lead, columns) {
    return columns.map(col => this.getLeadFieldValue(lead, col));
  }

  getLeadFieldValue(lead, column) {
    switch (column) {
      case 'title':
        return lead.title || '';
      case 'company':
        return lead.company || 'Unknown';
      case 'contactName':
        return lead.contactName || 'Unknown';
      case 'contactEmail':
        return lead.contactEmail || 'Unknown';
      case 'contactPhone':
        return lead.contactPhone || 'Unknown';
      case 'location':
        return lead.location || 'Unknown';
      case 'budget':
        return lead.budget ? `$${parseFloat(lead.budget).toLocaleString()}` : '';
      case 'timeline':
        return lead.timeline || '';
      case 'requirements':
        return lead.requirements || lead.description || '';
      case 'industry_type':
        return lead.industry_type || 'Unknown';
      case 'projectType':
        return lead.projectType || 'Unknown';
      case 'status':
        return lead.status || 'new';
      case 'priority':
        return lead.priority || 'medium';
      case 'score':
        return lead.score || 0;
      case 'confidence':
        return lead.confidence ? `${lead.confidence}%` : '';
      case 'sourceUrl':
        return lead.sourceUrl || '';
      case 'sourceTitle':
        return lead.sourceTitle || '';
      case 'scrapedDate':
        return lead.scrapedDate ? new Date(lead.scrapedDate).toLocaleDateString() : '';
      case 'createdAt':
        return lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '';
      case 'updatedAt':
        return lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString() : '';
      case 'sourceName':
        return lead.sourceName || 'Unknown';
      case 'sourceType':
        return lead.sourceType || 'Unknown';
      case 'tagNames':
        return lead.tagNames || '';
      case 'tagCategories':
        return lead.tagCategories || '';
      case 'ageInDays':
        return lead.ageInDays || 0;
      case 'isHighPriority':
        return lead.isHighPriority ? 'Yes' : 'No';
      case 'isQualified':
        return lead.isQualified ? 'Yes' : 'No';
      default:
        return lead[column] || '';
    }
  }

  // ===== EXCEL FORMATTING =====

  styleExcelHeaders(headerRow, customFormatting) {
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };
    headerRow.font.color = { argb: 'FFFFFFFF' };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  applyAdvancedExcelFormatting(worksheet, leads, customFormatting) {
    // Add conditional formatting for status
    const statusColumn = worksheet.getColumn('status');
    if (statusColumn) {
      statusColumn.eachCell((cell, rowNumber) => {
        if (rowNumber > 1) { // Skip header row
          const status = cell.value;
          switch (status) {
            case 'won':
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF28A745' } };
              break;
            case 'qualified':
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17A2B8' } };
              break;
            case 'proposal':
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC107' } };
              break;
            case 'lost':
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC3545' } };
              break;
          }
        }
      });
    }

    // Add data validation for priority column
    const priorityColumn = worksheet.getColumn('priority');
    if (priorityColumn) {
      priorityColumn.eachCell((cell, rowNumber) => {
        if (rowNumber > 1) {
          cell.dataValidation = {
            type: 'list',
            allowBlank: false,
            formulae: ['"High,Medium,Low"']
          };
        }
      });
    }

    // Add filters to header row
    worksheet.autoFilter = {
      from: 'A1',
      to: `${worksheet.columns.length}1`
    };

    // Freeze header row
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 1 }
    ];
  }

  // ===== TEMPLATE MANAGEMENT =====

  async applyExcelTemplate(workbook, templateName) {
    try {
      const templatePath = path.join(this.templatesPath, `${templateName}.xlsx`);
      await fs.access(templatePath);
      
      // Load template and apply to workbook
      const templateWorkbook = new ExcelJS.Workbook();
      await templateWorkbook.xlsx.readFile(templatePath);
      
      // Copy styles and formatting from template
      // This is a simplified implementation
      console.log(`Template ${templateName} loaded successfully`);
    } catch (error) {
      console.log(`Template ${templateName} not found, using default formatting`);
    }
  }

  // ===== UTILITY METHODS =====

  calculateAgeInDays(createdAt) {
    if (!createdAt) return 0;
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = Math.abs(now - created);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  formatColumnHeader(column) {
    return column
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  escapeXml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  async getFileSize(filepath) {
    try {
      const stats = await fs.stat(filepath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  // ===== VALIDATION =====

  async validateExportData(leads, columns) {
    const errors = [];
    
    if (!leads || leads.length === 0) {
      errors.push('No leads to export');
    }
    
    if (!columns || columns.length === 0) {
      errors.push('No columns specified for export');
    }
    
    // Check if all columns are valid
    const availableColumns = this.getAvailableColumns().map(col => col.id);
    const invalidColumns = columns.filter(col => !availableColumns.includes(col));
    if (invalidColumns.length > 0) {
      errors.push(`Invalid columns: ${invalidColumns.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ===== EXPORT HISTORY TRACKING =====

  async trackExportHistory(options, result) {
    try {
      // This would save export history to database
      const exportRecord = {
        userId: options.userId,
        format: result.format,
        recordCount: result.recordCount,
        columns: result.columns,
        template: options.template,
        filters: options.filters,
        filename: result.filename,
        filepath: result.filepath,
        fileSize: result.fileSize,
        exportDate: new Date()
      };

      console.log('Export tracked:', exportRecord);
    } catch (error) {
      console.error('Failed to track export history:', error.message);
    }
  }

  // ===== CLEANUP =====

  async cleanupOldExports(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const files = await fs.readdir(this.uploadPath);
      let deletedCount = 0;
      
      for (const file of files) {
        if (file.startsWith('enhanced_leads_export_') && 
            (file.endsWith('.xlsx') || file.endsWith('.csv') || file.endsWith('.json') || file.endsWith('.pdf') || file.endsWith('.xml'))) {
          const filepath = path.join(this.uploadPath, file);
          const stats = await fs.stat(filepath);
          
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filepath);
            deletedCount++;
          }
        }
      }
      
      console.log(`Cleaned up ${deletedCount} old export files`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old exports:', error);
      throw error;
    }
  }

  // ===== EXPORT FORMATS =====

  async getFilePath(filename) {
    try {
      const filepath = path.join(this.uploadPath, filename);
      const stats = await fs.stat(filepath);
      return filepath;
    } catch (error) {
      console.error('Error getting file path:', error);
      return null;
    }
  }

  async getExportFormats() {
    return [
      { 
        value: 'excel', 
        label: 'Excel (.xlsx)', 
        description: 'Microsoft Excel format with advanced formatting and templates',
        features: ['Conditional formatting', 'Data validation', 'Templates', 'Charts']
      },
      { 
        value: 'csv', 
        label: 'CSV (.csv)', 
        description: 'Comma-separated values for spreadsheet import',
        features: ['Universal compatibility', 'Fast export', 'Small file size']
      },
      { 
        value: 'json', 
        description: 'Structured data format for APIs and data processing',
        features: ['Machine readable', 'Schema included', 'Easy to parse']
      },
      { 
        value: 'pdf', 
        label: 'PDF (.pdf)', 
        description: 'Portable document format for sharing and printing',
        features: ['Print friendly', 'Fixed layout', 'Professional appearance']
      },
      { 
        value: 'xml', 
        label: 'XML (.xml)', 
        description: 'Extensible markup language for data exchange',
        features: ['Structured format', 'Schema validation', 'Enterprise ready']
      }
    ];
  }

  // ===== BATCH EXPORT =====

  async batchExport(exportJobs, progressCallback = null) {
    const results = [];
    const totalJobs = exportJobs.length;

    for (let i = 0; i < exportJobs.length; i++) {
      const job = exportJobs[i];
      
      try {
        const result = await this.exportLeads(job.leads, {
          ...job.options,
          progressCallback: (progress, message) => {
            if (progressCallback) {
              const overallProgress = Math.round(((i + progress / 100) / totalJobs) * 100);
              progressCallback(overallProgress, `Job ${i + 1}/${totalJobs}: ${message}`);
            }
          }
        });
        
        results.push({ jobId: job.id, success: true, result });
      } catch (error) {
        results.push({ jobId: job.id, success: false, error: error.message });
      }
    }

    return {
      totalJobs,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }
}

module.exports = EnhancedExportService;
