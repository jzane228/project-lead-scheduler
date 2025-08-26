const EnhancedScrapingService = require('./services/enhancedScrapingService');
const { ScrapingConfig } = require('./models');

async function testUserScraping() {
  console.log('🧪 Testing User Scraping Job...\n');
  
  // Create a test configuration similar to what users would have
  const testConfig = {
    id: 'test-config-123',
    name: 'Test Hotel Development',
    keywords: ['hotel', 'development', 'construction'],
    sources: [], // Empty sources to test default behavior
    max_results_per_run: 20,
    useAI: false, // Test pattern-based extraction
    data_extraction_rules: {}
  };
  
  const scraper = new EnhancedScrapingService();
  
  try {
    console.log('🚀 Starting user scraping job...');
    console.log(`📋 Config: ${testConfig.name}`);
    console.log(`🔍 Keywords: ${testConfig.keywords.join(', ')}`);
    console.log(`📰 Sources: ${testConfig.sources.length > 0 ? testConfig.sources.join(', ') : 'Using defaults'}`);
    
    // Simulate the exact call that happens when user clicks "Run Now"
    const result = await scraper.scrapeConfiguration(testConfig, 'test-user-123');
    
    console.log('\n📊 Scraping Results:');
    console.log(`Total results found: ${result.totalResults}`);
    console.log(`Leads saved: ${result.savedLeads}`);
    console.log(`Errors: ${result.errors.length}`);
    
    if (result.leads && result.leads.length > 0) {
      console.log('\n🎯 Sample Leads:');
      result.leads.slice(0, 3).forEach((lead, index) => {
        console.log(`\n${index + 1}. ${lead.title}`);
        console.log(`   Company: ${lead.extractedData?.company || 'Unknown'}`);
        console.log(`   Location: ${lead.extractedData?.location || 'Unknown'}`);
        console.log(`   Project Type: ${lead.extractedData?.projectType || 'Unknown'}`);
        console.log(`   Budget: ${lead.extractedData?.budget || 'Unknown'}`);
        console.log(`   URL: ${lead.url}`);
      });
    }
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      result.errors.forEach(error => {
        console.log(`   ${error.source}: ${error.error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ User scraping test failed:', error);
  }
}

testUserScraping().catch(console.error);
