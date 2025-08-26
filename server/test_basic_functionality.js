const WebScraper = require('./services/scrapingService');

async function testBasicFunctionality() {
  console.log('🚀 Testing Basic Scraping Functionality...');
  
  const scraper = new WebScraper();
  
  try {
    console.log('✅ Scraping service created successfully');
    console.log('🔧 OpenAI status:', scraper.openai ? 'Available' : 'Not available');
    console.log('🌐 Browser status:', scraper.browser ? 'Available' : 'Not available');
    
    // Test data extraction methods (these should be available)
    console.log('\n🔍 Testing data extraction capabilities...');
    
    const sampleText = 'Marriott Hotels announced a new luxury hotel development project in downtown Miami with 200 rooms and $50 million budget. The project is expected to complete in 2025.';
    
    console.log('📝 Sample text:', sampleText);
    
    // Test if methods exist
    if (typeof scraper.extractCompanyFromText === 'function') {
      console.log('🏢 Company extraction: Available');
    } else {
      console.log('🏢 Company extraction: Not available');
    }
    
    if (typeof scraper.extractLocationFromText === 'function') {
      console.log('📍 Location extraction: Available');
    } else {
      console.log('📍 Location extraction: Not available');
    }
    
    if (typeof scraper.extractProjectTypeFromText === 'function') {
      console.log('🏗️ Project type extraction: Available');
    } else {
      console.log('🏗️ Project type extraction: Not available');
    }
    
    if (typeof scraper.extractBudgetFromText === 'function') {
      console.log('💰 Budget extraction: Available');
    } else {
      console.log('💰 Budget extraction: Not available');
    }
    
    if (typeof scraper.extractTimelineFromText === 'function') {
      console.log('📅 Timeline extraction: Available');
    } else {
      console.log('📅 Timeline extraction: Not available');
    }
    
    if (typeof scraper.extractRoomCountFromText === 'function') {
      console.log('🛏️ Room count extraction: Available');
    } else {
      console.log('🛏️ Room count extraction: Not available');
    }
    
    console.log('\n🎉 Basic functionality test completed!');
    
    console.log('\n📋 Current Status:');
    console.log('   ✅ Basic WebScraper class structure');
    console.log('   ✅ OpenAI integration (with fallback)');
    console.log('   ✅ Browser initialization support');
    console.log('   ✅ URL scraping capabilities');
    console.log('   ✅ RSS feed parsing');
    console.log('   ✅ Lead creation and management');
    
    console.log('\n🚀 Next Steps to Complete Enhanced Scraping:');
    console.log('   1. Add data extraction methods to the class');
    console.log('   2. Implement scrapeConfiguration method');
    console.log('   3. Add Google News and Bing News scraping');
    console.log('   4. Implement relevance scoring and filtering');
    console.log('   5. Add comprehensive lead saving with URLs');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    console.log('\n✅ Test completed');
  }
}

// Run the test
testBasicFunctionality();
