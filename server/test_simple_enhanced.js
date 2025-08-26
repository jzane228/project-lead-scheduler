const EnhancedScrapingService = require('./services/enhancedScrapingService');

async function testSimple() {
  console.log('🧪 Testing Enhanced Scraping Service Components...');
  
  const scraper = new EnhancedScrapingService();
  
  // Test data extraction service
  console.log('\n📊 Testing Data Extraction Service...');
  const testText = 'Marriott Hotels announced a new luxury hotel development project in downtown Miami with 200 rooms and $50 million budget. The project is expected to complete in 2025.';
  
  const extractedData = scraper.dataExtractionService.extractContextualData(testText);
  console.log('✅ Extracted data:', extractedData);
  
  // Test Scrapy service
  console.log('\n🕷️ Testing Scrapy Service...');
  try {
    const testUrl = 'https://httpbin.org/html';
    const content = await scraper.scrapyService.scrapeWithDirectHTTP(testUrl);
    console.log('✅ Scrapy test result:', content.title);
    console.log('📄 Content length:', content.text.length);
  } catch (error) {
    console.log('❌ Scrapy test failed:', error.message);
  }
  
  // Test lead source type mapping
  console.log('\n🔗 Testing Lead Source Type Mapping...');
  const testCases = [
    { source: 'feeds.bbc.co.uk', url: 'https://www.bbc.com/news/rss' },
    { source: 'www.bloomberg.com', url: 'https://www.bloomberg.com/news' },
    { source: 'twitter.com', url: 'https://twitter.com/search' },
    { source: 'indeed.com', url: 'https://indeed.com/jobs' },
    { source: 'api.example.com', url: 'https://api.example.com/data' },
    { source: 'random-site.com', url: 'https://random-site.com/page' }
  ];
  
  testCases.forEach(({ source, url }) => {
    const type = scraper.getLeadSourceType(source, url);
    console.log(`   ${source} -> ${type}`);
  });
  
  // Test status and priority mapping
  console.log('\n📊 Testing Status and Priority Mapping...');
  const statusTests = ['proposed', 'under_construction', 'completed', 'cancelled', 'unknown'];
  const priorityTests = ['urgent', 'high', 'medium', 'low'];
  
  statusTests.forEach(status => {
    const mapped = scraper.mapStatusToValidEnum(status);
    console.log(`   Status: ${status} -> ${mapped}`);
  });
  
  priorityTests.forEach(priority => {
    const mapped = scraper.mapPriorityToValidEnum(priority);
    console.log(`   Priority: ${priority} -> ${mapped}`);
  });
  
  console.log('\n🎉 Component tests completed!');
}

testSimple().catch(console.error);
