const EnhancedScrapingService = require('./services/enhancedScrapingService');

async function testEnhancedScraping() {
  console.log('🚀 Testing Enhanced Scraping Service with Scrapy Integration...');
  
  const scraper = new EnhancedScrapingService();
  
  // Test configuration
  const testConfig = {
    name: 'Hotel Development Projects',
    keywords: ['Hotel', 'Development', 'Construction'],
    sources: ['scrapy', 'rss', 'news'],
    max_results_per_run: 10,
    useAI: false // Use pattern-based extraction for testing
  };
  
  const testUserId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID for testing
  
  try {
    console.log('📋 Test config:', testConfig);
    console.log('🔍 Starting enhanced scraping...');
    
    const result = await scraper.scrapeConfiguration(testConfig, testUserId);
    
    console.log('\n✅ Enhanced scraping completed!');
    console.log('📊 Results summary:');
    console.log(`   Total results found: ${result.totalResults}`);
    console.log(`   Leads saved: ${result.savedLeads}`);
    console.log(`   Errors: ${result.errors.length}`);
    
    if (result.leads.length > 0) {
      console.log('\n📝 Sample leads:');
      result.leads.slice(0, 3).forEach((lead, index) => {
        console.log(`\n   Lead ${index + 1}:`);
        console.log(`     Title: ${lead.title}`);
        console.log(`     Company: ${lead.company}`);
        console.log(`     Budget: ${lead.budget}`);
        console.log(`     URL: ${lead.sourceUrl}`);
        console.log(`     Status: ${lead.status}`);
        console.log(`     Priority: ${lead.priority}`);
      });
    }
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`   Error ${index + 1}: ${error.source} - ${error.error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Enhanced scraping test failed:', error);
  }
}

// Test individual components
async function testComponents() {
  console.log('\n🧪 Testing Individual Components...');
  
  const scraper = new EnhancedScrapingService();
  
  // Test data extraction service
  console.log('\n📊 Testing Data Extraction Service...');
  const testText = 'Marriott Hotels announced a new luxury hotel development project in downtown Miami with 200 rooms and $50 million budget. The project is expected to complete in 2025.';
  
  const extractedData = scraper.dataExtractionService.extractContextualData(testText);
  console.log('Extracted data:', extractedData);
  
  // Test Scrapy service
  console.log('\n🕷️ Testing Scrapy Service...');
  try {
    const testUrl = 'https://example.com';
    const content = await scraper.scrapyService.scrapeWithDirectHTTP(testUrl);
    console.log('Scrapy test result:', content.title);
  } catch (error) {
    console.log('Scrapy test failed (expected for example.com):', error.message);
  }
}

// Run tests
async function runTests() {
  try {
    await testEnhancedScraping();
    await testComponents();
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

runTests();
