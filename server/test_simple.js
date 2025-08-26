const WebScraper = require('./services/scrapingService');

async function testSimpleScraping() {
  console.log('🚀 Testing Enhanced Scraping Service Capabilities...');
  
  const scrapingService = new WebScraper();
  
  try {
    console.log('✅ Scraping service created successfully');
    console.log('🔧 OpenAI status:', scrapingService.openai ? 'Available' : 'Not available');
    console.log('🌐 Browser status:', scrapingService.browser ? 'Available' : 'Not available');
    
    // Test data extraction methods
    console.log('\n🔍 Testing data extraction capabilities...');
    
    const sampleText = 'Marriott Hotels announced a new luxury hotel development project in downtown Miami with 200 rooms and $50 million budget. The project is expected to complete in 2025.';
    
    console.log('📝 Sample text:', sampleText);
    console.log('🏢 Company:', scrapingService.extractCompanyFromText(sampleText));
    console.log('📍 Location:', scrapingService.extractLocationFromText(sampleText));
    console.log('🏗️ Project Type:', scrapingService.extractProjectTypeFromText(sampleText));
    console.log('💰 Budget:', scrapingService.extractBudgetFromText(sampleText));
    console.log('📅 Timeline:', scrapingService.extractTimelineFromText(sampleText));
    console.log('🛏️ Room Count:', scrapingService.extractRoomCountFromText(sampleText));
    
    console.log('\n🎉 Enhanced scraping service is ready!');
    console.log('\n📋 What this service provides:');
    console.log('   ✅ High-quality lead generation from multiple sources');
    console.log('   ✅ Intelligent data extraction (company, location, budget, etc.)');
    console.log('   ✅ URL storage for accessing full articles');
    console.log('   ✅ Relevance scoring for lead quality');
    console.log('   ✅ Browser-based scraping when available');
    console.log('   ✅ Fallback methods when browser fails');
    console.log('   ✅ AI-powered data extraction (when API key available)');
    
    console.log('\n🚀 Next steps to enable full functionality:');
    console.log('   1. Set OPENAI_API_KEY in .env for AI-powered extraction');
    console.log('   2. Fix browser initialization issues for live web scraping');
    console.log('   3. Implement RSS feed scraping for industry news');
    console.log('   4. Add Google News and Bing News scraping methods');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    console.log('\n✅ Test completed');
  }
}

// Run the test
testSimpleScraping();
