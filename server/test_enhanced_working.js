const EnhancedScrapingService = require('./services/enhancedScrapingService');

async function testEnhancedWorking() {
  console.log('🧪 Testing Enhanced Scraping Service...\n');
  
  const scraper = new EnhancedScrapingService();
  
  try {
    // Initialize the service
    console.log('🚀 Initializing service...');
    await scraper.initialize();
    
    // Test configuration
    const testConfig = {
      id: 'test-config-123',
      name: 'Test Hotel Development',
      keywords: ['hotel', 'development', 'construction'],
      sources: ['scrapy', 'google', 'bing'], // Force high-quality sources
      max_results_per_run: 10,
      useAI: false
    };
    
    console.log('\n🔍 Testing with forced high-quality sources...');
    console.log(`Sources: ${testConfig.sources.join(', ')}`);
    
    // Set up progress callback
    scraper.setProgressCallback('test-123', (progress) => {
      console.log(`📊 Progress: ${progress.stage} - ${progress.percentage}% - ${progress.message}`);
    });
    
    const result = await scraper.scrapeConfiguration(testConfig, 'test-user-123');
    
    console.log('\n📊 Results:');
    console.log(`Total results: ${result.totalResults}`);
    console.log(`Leads saved: ${result.savedLeads}`);
    console.log(`Job ID: ${result.jobId}`);
    
    if (result.leads && result.leads.length > 0) {
      console.log('\n🎯 Sample leads:');
      result.leads.slice(0, 3).forEach((lead, index) => {
        console.log(`\n${index + 1}. ${lead.title}`);
        console.log(`   Company: ${lead.company || 'Unknown'}`);
        console.log(`   Industry: ${lead.industry_type || 'Unknown'}`);
        console.log(`   URL: ${lead.sourceUrl || 'Unknown'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testEnhancedWorking().catch(console.error);
