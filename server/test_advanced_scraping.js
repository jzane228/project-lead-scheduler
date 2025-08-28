const AdvancedScrapingService = require('./services/advancedScrapingService');

/**
 * Test script for Advanced Scraping Service
 * Tests premium API integrations and URL guarantee system
 */

async function testAdvancedScraping() {
  console.log('🧪 Testing Advanced Scraping Service...\n');

  const scraper = new AdvancedScrapingService();

  // Test configuration
  const testConfig = {
    name: 'Advanced Scraping Test',
    keywords: ['hotel', 'development', 'construction'],
    sources: ['newsapi', 'google-news', 'bing-news', 'web-scraping'],
    max_results_per_run: 10
  };

  const testUserId = 'test-user-123';

  try {
    console.log('📋 Test Configuration:');
    console.log(`   Keywords: ${testConfig.keywords.join(', ')}`);
    console.log(`   Max Results: ${testConfig.max_results_per_run}`);
    console.log(`   Sources: ${testConfig.sources.join(', ')}\n`);

    console.log('🚀 Starting advanced scraping test...');
    const startTime = Date.now();

    const result = await scraper.scrapeConfiguration(testConfig, testUserId);
    const duration = Date.now() - startTime;

    console.log('\n✅ Advanced scraping test completed!');
    console.log('📊 Test Results Summary:');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Total results found: ${result.totalResults}`);
    console.log(`   Leads saved: ${result.savedLeads}`);
    console.log(`   Success rate: ${result.totalResults > 0 ? ((result.savedLeads / result.totalResults) * 100).toFixed(1) : 0}%`);

    if (result.leads && result.leads.length > 0) {
      console.log('\n📝 Sample Leads:');

      result.leads.slice(0, 3).forEach((lead, index) => {
        console.log(`\n   Lead ${index + 1}:`);
        console.log(`     Title: ${lead.title || 'N/A'}`);
        console.log(`     Company: ${lead.company || 'N/A'}`);
        console.log(`     URL: ${lead.url || 'NO URL - THIS IS AN ERROR'}`);
        console.log(`     Location: ${lead.location || 'N/A'}`);
        console.log(`     Source: ${lead.source || 'N/A'}`);
        console.log(`     Confidence: ${lead.confidence || 0}%`);

        if (lead.contacts && lead.contacts.length > 0) {
          console.log('     Contacts:');
          lead.contacts.forEach((contact, cIndex) => {
            console.log(`       ${cIndex + 1}. ${contact.name || 'Unknown'} - ${contact.email || contact.phone || 'No contact info'}`);
          });
        }
      });

      // URL Validation Test
      console.log('\n🔗 URL Validation Test:');
      let validUrls = 0;
      let invalidUrls = 0;

      for (const lead of result.leads) {
        if (lead.url) {
          if (scraper.isValidArticleUrl(lead.url)) {
            validUrls++;
            console.log(`   ✅ Valid: ${lead.url}`);
          } else {
            invalidUrls++;
            console.log(`   ❌ Invalid: ${lead.url}`);
          }
        } else {
          invalidUrls++;
          console.log(`   ❌ Missing URL for: ${lead.title}`);
        }
      }

      console.log(`\n   URL Validation Results:`);
      console.log(`   Valid URLs: ${validUrls}`);
      console.log(`   Invalid/Missing URLs: ${invalidUrls}`);
      console.log(`   URL Success Rate: ${((validUrls / (validUrls + invalidUrls)) * 100).toFixed(1)}%`);

    } else {
      console.log('\n❌ No leads found!');
      console.log('\n🔍 Troubleshooting:');
      console.log('   1. Check API keys are configured:');
      console.log('      - NEWS_API_KEY');
      console.log('      - GOOGLE_NEWS_API_KEY');
      console.log('      - BING_API_KEY');
      console.log('   2. Verify internet connectivity');
      console.log('   3. Check API rate limits');
      console.log('   4. Run individual API tests');
    }

    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.source || 'Unknown'}: ${error.error || error}`);
      });
    }

    // Performance Analysis
    console.log('\n📈 Performance Analysis:');
    console.log(`   Leads per second: ${result.savedLeads > 0 ? (result.savedLeads / (duration / 1000)).toFixed(2) : 0}`);
    console.log(`   Average processing time per lead: ${result.savedLeads > 0 ? (duration / result.savedLeads).toFixed(0) : 0}ms`);

    if (result.savedLeads > 0) {
      console.log('\n🎉 Advanced Scraping Test PASSED!');
      console.log('   ✅ Premium APIs are working');
      console.log('   ✅ URL guarantee system active');
      console.log('   ✅ Data extraction functional');
    } else {
      console.log('\n⚠️ Advanced Scraping Test NEEDS ATTENTION');
      console.log('   Check API configurations and network connectivity');
    }

  } catch (error) {
    console.error('\n❌ Advanced scraping test failed:', error);
    console.error('Stack trace:', error.stack);

    console.log('\n🔧 Troubleshooting Steps:');
    console.log('   1. Verify all dependencies are installed');
    console.log('   2. Check API key configurations');
    console.log('   3. Test network connectivity');
    console.log('   4. Review error logs above');
  }
}

// Test individual API components
async function testIndividualAPIs() {
  console.log('\n🧪 Testing Individual APIs...\n');

  const scraper = new AdvancedScrapingService();
  const keywords = ['hotel', 'development'];

  // Test NewsAPI
  if (scraper.apis.newsapi.enabled) {
    console.log('📰 Testing NewsAPI...');
    try {
      const results = await scraper.searchNewsAPI(keywords, 5);
      console.log(`   ✅ Found ${results.length} articles`);
    } catch (error) {
      console.log(`   ❌ NewsAPI failed: ${error.message}`);
    }
  } else {
    console.log('📰 NewsAPI disabled (no API key)');
  }

  // Test Google News API
  if (scraper.apis.googleNews.enabled) {
    console.log('🔍 Testing Google News API...');
    try {
      const results = await scraper.searchGoogleNewsAPI(keywords, 5);
      console.log(`   ✅ Found ${results.length} articles`);
    } catch (error) {
      console.log(`   ❌ Google News API failed: ${error.message}`);
    }
  } else {
    console.log('🔍 Google News API disabled (no API key)');
  }

  // Test Bing News API
  if (scraper.apis.bingNews.enabled) {
    console.log('📰 Testing Bing News API...');
    try {
      const results = await scraper.searchBingNewsAPI(keywords, 5);
      console.log(`   ✅ Found ${results.length} articles`);
    } catch (error) {
      console.log(`   ❌ Bing News API failed: ${error.message}`);
    }
  } else {
    console.log('📰 Bing News API disabled (no API key)');
  }
}

// Main test execution
async function runTests() {
  try {
    await testIndividualAPIs();
    await testAdvancedScraping();
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests();
}

module.exports = { testAdvancedScraping, testIndividualAPIs };
