const EnhancedScrapingService = require('./services/enhancedScrapingService');
const { Column, Lead, User, ScrapingConfig, sequelize } = require('./models');

// Test article content with various data points
const TEST_ARTICLE_CONTENT = `
Construction Company Announces Major Development Project

New York City - Acme Construction Corp announced today that they will begin construction on a $45 million luxury apartment complex in downtown Manhattan. The project, called "Skyline Towers," will feature 200 units across 25 floors.

CEO John Smith stated, "This project represents our commitment to high-quality urban development. We're excited to bring 150 new jobs to the local economy."

The development will include:
- 200 residential units
- 15,000 square feet of retail space
- Underground parking for 300 vehicles
- Completion expected by Q4 2025

Contact Information:
- Project Manager: Sarah Johnson (sarah.johnson@acmeconstruction.com)
- Phone: (555) 123-4567
- Marketing Director: Mike Wilson (mike@acmeconstruction.com)

The project is backed by investors from Silicon Valley and will create approximately 150 construction jobs during the 24-month build period.

For more information, contact:
Lisa Chen
VP of Communications
lisa.chen@acmeconstruction.com
Phone: (555) 987-6543

Website: www.acmeconstruction.com
LinkedIn: linkedin.com/company/acme-construction
`;

async function testCustomColumnsScraping() {
  console.log('🧪 Testing Custom Columns Scraping Integration...');

  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Find or create test user
    let testUser = await User.findOne({ where: { email: 'test@example.com' } });
    if (!testUser) {
      testUser = await User.create({
        email: 'test@example.com',
        password: 'testpassword',
        firstName: 'Test',
        lastName: 'User',
        industry: 'construction'
      });
      console.log('✅ Created test user');
    }

    // Create custom columns for testing
    console.log('📊 Creating custom columns...');

    const customColumns = [
      {
        name: 'Project Manager',
        field_key: 'project_manager',
        description: 'Name of the project manager or lead contact mentioned in the article',
        data_type: 'text',
        category: 'contact',
        is_visible: true,
        user_id: testUser.id
      },
      {
        name: 'Marketing Contact',
        field_key: 'marketing_contact',
        description: 'Name of the marketing or communications contact',
        data_type: 'text',
        category: 'contact',
        is_visible: true,
        user_id: testUser.id
      },
      {
        name: 'Project Budget',
        field_key: 'project_budget',
        description: 'Total budget or cost of the construction project',
        data_type: 'currency',
        category: 'financial',
        is_visible: true,
        user_id: testUser.id
      },
      {
        name: 'Expected Completion',
        field_key: 'expected_completion',
        description: 'Expected completion date or timeline for the project',
        data_type: 'date',
        category: 'timeline',
        is_visible: true,
        user_id: testUser.id
      },
      {
        name: 'Number of Jobs',
        field_key: 'job_count',
        description: 'Number of jobs or positions that will be created',
        data_type: 'number',
        category: 'project',
        is_visible: true,
        user_id: testUser.id
      },
      {
        name: 'Retail Space',
        field_key: 'retail_space_sqft',
        description: 'Square footage of retail or commercial space',
        data_type: 'number',
        category: 'project',
        is_visible: true,
        user_id: testUser.id
      }
    ];

    // Create columns (skip if they already exist)
    const createdColumns = [];
    for (const columnData of customColumns) {
      try {
        const column = await Column.create(columnData);
        createdColumns.push(column);
        console.log(`✅ Created column: ${column.name}`);
      } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          console.log(`⏭️ Column ${columnData.name} already exists, skipping`);
          const existingColumn = await Column.findOne({
            where: { field_key: columnData.field_key, user_id: testUser.id }
          });
          if (existingColumn) createdColumns.push(existingColumn);
        } else {
          console.error(`❌ Error creating column ${columnData.name}:`, error.message);
        }
      }
    }

    // Create test scraping configuration
    console.log('🔧 Creating test scraping configuration...');
    const testConfig = await ScrapingConfig.create({
      name: 'Test Custom Columns Config',
      keywords: ['construction', 'development', 'project'],
      sources: ['google'],
      useAI: true,
      user_id: testUser.id
    });
    console.log('✅ Created test scraping config');

    // Initialize scraping service
    const scrapingService = new EnhancedScrapingService();

    // Test the extraction flow
    console.log('🤖 Testing data extraction with custom columns...');

    try {
      // Test AI extraction
      console.log('🧠 Testing AI extraction...');
      const aiExtractedData = await scrapingService.extractWithAI(
        TEST_ARTICLE_CONTENT,
        {},
        createdColumns
      );

      console.log('🎯 AI Extraction Results:');
      createdColumns.forEach(column => {
        const value = aiExtractedData[column.field_key];
        console.log(`  ${column.name} (${column.field_key}): ${value || 'NOT FOUND'}`);
      });

      // Test pattern extraction
      console.log('📊 Testing pattern extraction...');
      const patternExtractedData = scrapingService.dataExtractionService.extractWithCustomColumns(
        TEST_ARTICLE_CONTENT,
        createdColumns
      );

      console.log('🎯 Pattern Extraction Results:');
      createdColumns.forEach(column => {
        const value = patternExtractedData[column.field_key];
        console.log(`  ${column.name} (${column.field_key}): ${value || 'NOT FOUND'}`);
      });

      // Test lead creation with custom columns
      console.log('💾 Testing lead creation with custom columns...');

      const testLeadData = {
        title: 'Test Construction Project',
        description: 'A test project for custom columns',
        company: 'Acme Construction Corp',
        url: 'https://example.com/test-article',
        publishedDate: new Date(),
        extractedData: {
          ...aiExtractedData,
          aiUsed: true
        }
      };

      // Save the lead
      const savedLeads = await scrapingService.saveLeads([testLeadData], testUser.id, testConfig, createdColumns);

      if (savedLeads.length > 0) {
        const savedLead = savedLeads[0];
        console.log('✅ Lead saved successfully!');
        console.log('📊 Custom fields in saved lead:');

        createdColumns.forEach(column => {
          const value = savedLead.custom_fields[column.field_key];
          console.log(`  ${column.name} (${column.field_key}): ${value || 'NOT SAVED'}`);
        });

        // Verify data was saved correctly by querying the database
        const dbLead = await Lead.findOne({
          where: { id: savedLead.id }
        });

        console.log('🔍 Database verification:');
        createdColumns.forEach(column => {
          const value = dbLead.custom_fields[column.field_key];
          console.log(`  ${column.name} (${column.field_key}): ${value || 'NOT IN DB'}`);
        });

      } else {
        console.error('❌ Failed to save lead');
      }

    } catch (extractionError) {
      console.error('❌ Extraction test failed:', extractionError);
    }

    // Clean up test data
    console.log('🧹 Cleaning up test data...');
    await Lead.destroy({ where: { user_id: testUser.id, title: 'Test Construction Project' } });
    await ScrapingConfig.destroy({ where: { id: testConfig.id } });

    // Remove test columns (optional - you might want to keep them for manual testing)
    // for (const column of createdColumns) {
    //   await Column.destroy({ where: { id: column.id } });
    // }

    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the test
if (require.main === module) {
  testCustomColumnsScraping().catch(console.error);
}

module.exports = testCustomColumnsScraping;

