const ExcelJS = require('exceljs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs').promises;
const { Lead, User } = require('../models');

class ExportService {
  constructor() {
    this.uploadPath = process.env.UPLOAD_PATH || './uploads';
    this.ensureUploadDirectory();
  }

  async ensureUploadDirectory() {
    try {
      await fs.access(this.uploadPath);
    } catch (error) {
      await fs.mkdir(this.uploadPath, { recursive: true });
    }
  }

  async exportLeads(leads, format = 'excel', columns = null, destination = null) {
    try {
      let result;
      
      switch (format.toLowerCase()) {
        case 'excel':
          result = await this.exportToExcel(leads, columns);
          break;
        case 'csv':
          result = await this.exportToCSV(leads, columns);
          break;
        case 'json':
          result = await this.exportToJSON(leads, columns);
          break;
        case 'salesforce':
          result = await this.exportToSalesforce(leads, destination);
          break;
        case 'hubspot':
          result = await this.exportToHubSpot(leads, destination);
          break;
        case 'pipedrive':
          result = await this.exportToPipedrive(leads, destination);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      return result;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  async exportToExcel(leads, columns = null) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leads');

    // Define default columns if none specified
    const defaultColumns = [
      'Title',
      'Company',
      'Contact Info',
      'Location',
      'Budget',
      'Timeline',
      'Industry Type',
      'Project Type',
      'Status',
      'Priority',
      'Confidence',
      'Source URL',
      'Scraped Date',
      'Tags'
    ];

    const exportColumns = columns || defaultColumns;

    // Add headers
    worksheet.addRow(exportColumns);

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    for (const lead of leads) {
      const rowData = exportColumns.map(col => {
        switch (col.toLowerCase()) {
          case 'title':
            return lead.title;
          case 'company':
            return lead.company;
          case 'contact info':
            return lead.contact_info;
          case 'location':
            return lead.location;
          case 'budget':
            return lead.budget || '';
          case 'timeline':
            return lead.timeline;
          case 'industry type':
            return lead.industry_type;
          case 'project type':
            return lead.project_type;
          case 'status':
            return lead.status;
          case 'priority':
            return lead.priority;
          case 'confidence':
            return lead.confidence || '';
          case 'source url':
            return lead.url;
          case 'scraped date':
            return lead.createdAt ? lead.createdAt.toLocaleDateString() : '';
          case 'tags':
            return lead.tag_names || '';
          default:
            return lead[col] || '';
        }
      });
      
      worksheet.addRow(rowData);
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(
        column.header.length + 2,
        ...worksheet.getColumn(column.key).values.map(v => String(v).length)
      );
    });

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `leads_export_${timestamp}.xlsx`;
    const filepath = path.join(this.uploadPath, filename);

    // Save file
    await workbook.xlsx.writeFile(filepath);

    return {
      format: 'excel',
      filename,
      filepath,
      recordCount: leads.length,
      columns: exportColumns
    };
  }

  async exportToCSV(leads, columns = null) {
    const defaultColumns = [
      'title',
      'company',
      'contactName',
      'contactEmail',
      'contactPhone',
      'location',
      'budget',
      'timeline',
      'requirements',
      'industry',
      'projectType',
      'status',
      'priority',
      'confidence',
      'sourceUrl',
      'scrapedDate',
      'tags'
    ];

    const exportColumns = columns || defaultColumns;

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `leads_export_${timestamp}.csv`;
    const filepath = path.join(this.uploadPath, filename);

    // Create CSV writer
    const csvWriter = createCsvWriter({
      path: filepath,
      header: exportColumns.map(col => ({
        id: col,
        title: col.charAt(0).toUpperCase() + col.slice(1).replace(/([A-Z])/g, ' $1')
      }))
    });

    // Prepare data
    const records = leads.map(lead => {
      const record = {};
      exportColumns.forEach(col => {
        switch (col) {
          case 'budget':
            record[col] = lead.budget ? `$${lead.budget.toLocaleString()}` : lead.getBudgetDisplay();
            break;
          case 'scrapedDate':
            record[col] = lead.scrapedDate.toLocaleDateString();
            break;
          case 'tags':
            record[col] = Array.isArray(lead.tags) ? lead.tags.join(', ') : '';
            break;
          default:
            record[col] = lead[col] || '';
        }
      });
      return record;
    });

    // Write CSV
    await csvWriter.writeRecords(records);

    return {
      format: 'csv',
      filename,
      filepath,
      recordCount: leads.length,
      columns: exportColumns
    };
  }

  async exportToJSON(leads, columns = null) {
    const defaultColumns = [
      'title',
      'company',
      'contactName',
      'contactEmail',
      'contactPhone',
      'location',
      'budget',
      'timeline',
      'requirements',
      'industry',
      'projectType',
      'status',
      'priority',
      'confidence',
      'sourceUrl',
      'scrapedDate',
      'tags'
    ];

    const exportColumns = columns || defaultColumns;

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `leads_export_${timestamp}.json`;
    const filepath = path.join(this.uploadPath, filename);

    // Prepare data
    const exportData = leads.map(lead => {
      const record = {};
      exportColumns.forEach(col => {
        switch (col) {
          case 'budget':
            record[col] = lead.budget ? `$${lead.budget.toLocaleString()}` : lead.getBudgetDisplay();
            break;
          case 'scrapedDate':
            record[col] = lead.scrapedDate.toISOString();
            break;
          case 'tags':
            record[col] = Array.isArray(lead.tags) ? lead.tags : [];
            break;
          default:
            record[col] = lead[col] || null;
        }
      });
      return record;
    });

    // Write JSON file
    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));

    return {
      format: 'json',
      filename,
      filepath,
      recordCount: leads.length,
      columns: exportColumns
    };
  }

  async exportToSalesforce(leads, destination) {
    // TODO: Implement Salesforce integration
    // This would use the Salesforce REST API to create leads, contacts, and opportunities
    
    const result = {
      format: 'salesforce',
      recordCount: leads.length,
      successCount: 0,
      errorCount: 0,
      errors: []
    };

    // Placeholder implementation
    console.log(`Would export ${leads.length} leads to Salesforce`);
    
    return result;
  }

  async exportToHubSpot(leads, destination) {
    // TODO: Implement HubSpot integration
    // This would use the HubSpot API to create contacts and deals
    
    const result = {
      format: 'hubspot',
      recordCount: leads.length,
      successCount: 0,
      errorCount: 0,
      errors: []
    };

    // Placeholder implementation
    console.log(`Would export ${leads.length} leads to HubSpot`);
    
    return result;
  }

  async exportToPipedrive(leads, destination) {
    // TODO: Implement Pipedrive integration
    // This would use the Pipedrive API to create leads and deals
    
    const result = {
      format: 'pipedrive',
      recordCount: leads.length,
      successCount: 0,
      errorCount: 0,
      errors: []
    };

    // Placeholder implementation
    console.log(`Would export ${leads.length} leads to Pipedrive`);
    
    return result;
  }

  async getExportHistory(userId, limit = 50) {
    // TODO: Implement export history tracking
    // This would track all exports made by a user
    
    return [];
  }

  async cleanupOldExports(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const files = await fs.readdir(this.uploadPath);
      let deletedCount = 0;
      
      for (const file of files) {
        if (file.startsWith('leads_export_') && file.endsWith('.xlsx') || file.endsWith('.csv') || file.endsWith('.json')) {
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

  async getExportFormats() {
    return [
      { value: 'excel', label: 'Excel (.xlsx)', description: 'Microsoft Excel format with formatting' },
      { value: 'csv', label: 'CSV (.csv)', description: 'Comma-separated values for spreadsheet import' },
      { value: 'json', label: 'JSON (.json)', description: 'Structured data format for APIs' },
      { value: 'salesforce', label: 'Salesforce', description: 'Direct integration with Salesforce CRM' },
      { value: 'hubspot', label: 'HubSpot', description: 'Direct integration with HubSpot CRM' },
      { value: 'pipedrive', label: 'Pipedrive', description: 'Direct integration with Pipedrive CRM' }
    ];
  }

  async validateExportData(leads, columns) {
    const errors = [];
    
    if (!leads || leads.length === 0) {
      errors.push('No leads to export');
    }
    
    if (!columns || columns.length === 0) {
      errors.push('No columns specified for export');
    }
    
    // Check if all columns are valid
    const validColumns = [
      'title', 'company', 'contactName', 'contactEmail', 'contactPhone',
      'location', 'budget', 'timeline', 'requirements', 'industry',
      'projectType', 'status', 'priority', 'confidence', 'sourceUrl',
      'scrapedDate', 'tags'
    ];
    
    const invalidColumns = columns.filter(col => !validColumns.includes(col));
    if (invalidColumns.length > 0) {
      errors.push(`Invalid columns: ${invalidColumns.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = ExportService;


