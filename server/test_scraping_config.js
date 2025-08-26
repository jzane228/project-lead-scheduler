const WebScraper = require('./services/scrapingService');

async function testScrapingConfig() {
  console.log('🚀 Testing Scraping Configuration...');
  
  const scraper = new WebScraper();
  
  // Test configuration
  const testConfig = {
    name: 'Hotel Projects Test',
    keywords: ['Hotel', 'Development'],
    sources: ['google', 'bing', 'rss'],
    max_results_per_run: 5
  };
  
  const testUserId = 'test-user-123';
  
  try {
    console.log('📋 Test config:', testConfig);
    console.log('🔍 Starting scraping...');
    
    const result = await scraper.scrapeConfiguration(testConfig, testUserId);
    
    console.log('✅ Scraping completed!');
    console.log('📊 Results:', result);
    
  } catch (error) {
    console.error('❌ Scraping failed:', error);
  } finally {
    await scraper.close();
  }
}

testScrapingConfig().catch(console.error);
