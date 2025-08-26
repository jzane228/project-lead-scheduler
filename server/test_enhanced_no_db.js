const EnhancedScrapingService = require('./services/enhancedScrapingService');

async function testEnhancedNoDB() {
  console.log('🧪 Testing Enhanced Scraping Service (No DB)...\n');
  
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
      max_results_per_run: 5,
      useAI: false
    };
    
    console.log('\n🔍 Testing with forced high-quality sources...');
    console.log(`Sources: ${testConfig.sources.join(', ')}`);
    
    // Set up progress callback
    scraper.setProgressCallback('test-123', (progress) => {
      console.log(`📊 Progress: ${progress.stage} - ${progress.percentage}% - ${progress.message}`);
    });
    
    // Test individual methods without database
    console.log('\n📡 Testing individual scraping methods...');
    
    // Test Scrapy method
    console.log('\n🕷️ Testing Scrapy method...');
    const scrapyResults = await scraper.scrapeWithScrapy(testConfig.keywords, 3);
    console.log(`✅ Scrapy found ${scrapyResults.length} results`);
    if (scrapyResults.length > 0) {
      console.log('Sample result:', scrapyResults[0]);
    }
    
    // Test Google News method
    console.log('\n🔍 Testing Google News method...');
    const googleResults = await scraper.scrapeGoogleNews(testConfig.keywords, 3);
    console.log(`✅ Google News found ${googleResults.length} results`);
    if (googleResults.length > 0) {
      console.log('Sample result:', googleResults[0]);
    }
    
    // Test Bing News method
    console.log('\n🔍 Testing Bing News method...');
    const bingResults = await scraper.scrapeBingNews(testConfig.keywords, 3);
    console.log(`✅ Bing News found ${bingResults.length} results`);
    if (bingResults.length > 0) {
      console.log('Sample result:', bingResults[0]);
    }
    
    // Test data extraction
    if (scrapyResults.length > 0) {
      console.log('\n🤖 Testing data extraction...');
      const sampleResult = scrapyResults[0];
      const extractedData = scraper.dataExtractionService.extractContextualData(sampleResult.title + ' ' + (sampleResult.snippet || ''));
      console.log('✅ Extracted data:', extractedData);
    }
    
    console.log('\n🎉 Enhanced scraping service test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testEnhancedNoDB().catch(console.error);
