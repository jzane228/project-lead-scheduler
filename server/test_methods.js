const WebScraper = require('./services/scrapingService');

async function testMethods() {
  console.log('🔍 Testing WebScraper methods...');
  
  const scraper = new WebScraper();
  
  // Check if methods exist
  const methods = [
    'extractCompanyFromText',
    'extractLocationFromText', 
    'extractProjectTypeFromText',
    'extractBudgetFromText',
    'extractTimelineFromText',
    'extractRoomCountFromText',
    'extractSquareFootageFromText',
    'extractEmployeesFromText',
    'extractContactInfoFromText',
    'extractDescriptionFromText',
    'scrapeConfiguration'
  ];
  
  console.log('\n📋 Available methods:');
  methods.forEach(method => {
    if (typeof scraper[method] === 'function') {
      console.log(`✅ ${method}`);
    } else {
      console.log(`❌ ${method}`);
    }
  });
  
  // Test a simple extraction
  console.log('\n🧪 Testing extraction methods...');
  
  const testText = 'Marriott Hotels announced a new luxury hotel development project in downtown Miami with 200 rooms and $50 million budget. The project is expected to complete in 2025.';
  
  if (typeof scraper.extractCompanyFromText === 'function') {
    const company = scraper.extractCompanyFromText(testText);
    console.log(`🏢 Company: ${company}`);
  }
  
  if (typeof scraper.extractProjectTypeFromText === 'function') {
    const projectType = scraper.extractProjectTypeFromText(testText);
    console.log(`🏗️ Project Type: ${projectType}`);
  }
  
  if (typeof scraper.extractBudgetFromText === 'function') {
    const budget = scraper.extractBudgetFromText(testText);
    console.log(`💰 Budget: ${budget}`);
  }
  
  if (typeof scraper.extractRoomCountFromText === 'function') {
    const rooms = scraper.extractRoomCountFromText(testText);
    console.log(`🛏️ Rooms: ${rooms}`);
  }
  
  console.log('\n✅ Method test completed');
}

testMethods().catch(console.error);
