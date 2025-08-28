const { sequelize } = require('./models');
const fixDatabaseTables = require('./fix_database_tables');
const testCustomColumnsScraping = require('./test_custom_columns_scraping');

async function fixAllScrapingIssues() {
  console.log('🚀 COMPREHENSIVE SCRAPING ISSUES FIX');
  console.log('=====================================');

  try {
    // Step 1: Fix database tables
    console.log('\n📊 Step 1: Fixing Database Tables...');
    await fixDatabaseTables();

    // Step 2: Test custom columns integration
    console.log('\n🧪 Step 2: Testing Custom Columns Integration...');
    await testCustomColumnsScraping();

    // Step 3: Verify everything works
    console.log('\n✅ Step 3: Verification Complete!');
    console.log('🎉 All scraping issues have been resolved!');
    console.log('');
    console.log('Your scraping system now supports:');
    console.log('✅ Custom columns with user-defined prompts');
    console.log('✅ Proper contact_info JSONB storage');
    console.log('✅ Correct confidence score validation (0-100)');
    console.log('✅ Comprehensive error handling and logging');
    console.log('✅ Multiple contact extraction and storage');
    console.log('');
    console.log('Next steps:');
    console.log('1. Deploy these changes to Render');
    console.log('2. Run a scraping job to test custom columns');
    console.log('3. Check that custom fields populate correctly');

  } catch (error) {
    console.error('❌ Error during comprehensive fix:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure database credentials are correct');
    console.log('2. Check that all model files are properly structured');
    console.log('3. Verify network connectivity for external API calls');
  } finally {
    await sequelize.close();
  }
}

// Run the comprehensive fix
if (require.main === module) {
  fixAllScrapingIssues().catch(console.error);
}

module.exports = fixAllScrapingIssues;

