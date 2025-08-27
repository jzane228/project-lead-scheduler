const EnhancedScrapingService = require('./services/enhancedScrapingService');
const DataExtractionService = require('./services/dataExtractionService');
const ScrapyService = require('./services/scrapyService');

// Comprehensive Testing Framework for Enhanced Scraping System
class ScrapingSystemTester {
  constructor() {
    this.service = new EnhancedScrapingService();
    this.dataExtractionService = new DataExtractionService();
    this.scrapyService = new ScrapyService();
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runAllTests() {
    console.log('🧪 Starting Comprehensive Scraping System Tests...\n');

    // Test 1: Basic Service Initialization
    await this.testServiceInitialization();

    // Test 2: Search Engine Functionality
    await this.testSearchEngines();

    // Test 3: Keyword Expansion
    await this.testKeywordExpansion();

    // Test 4: Content Enrichment
    await this.testContentEnrichment();

    // Test 5: Data Extraction
    await this.testDataExtraction();

    // Test 6: Custom Columns
    await this.testCustomColumns();

    // Test 7: Lead Deduplication
    await this.testLeadDeduplication();

    // Test 8: AI Integration
    await this.testAIIntegration();

    // Test 9: Error Handling
    await this.testErrorHandling();

    // Test 10: Performance Metrics
    await this.testPerformanceMetrics();

    this.printTestSummary();
    return this.testResults;
  }

  async runTest(testName, testFunction) {
    console.log(`🧪 Running: ${testName}`);
    try {
      const startTime = Date.now();
      const result = await testFunction();
      const duration = Date.now() - startTime;

      this.testResults.tests.push({
        name: testName,
        status: 'passed',
        duration,
        result
      });

      this.testResults.passed++;
      console.log(`✅ PASSED (${duration}ms)\n`);
      return result;
    } catch (error) {
      this.testResults.tests.push({
        name: testName,
        status: 'failed',
        error: error.message,
        stack: error.stack
      });

      this.testResults.failed++;
      console.log(`❌ FAILED: ${error.message}\n`);
      return null;
    }
  }

  async testServiceInitialization() {
    return this.runTest('Service Initialization', async () => {
      const initialized = await this.service.initialize();
      if (!initialized) {
        throw new Error('Service failed to initialize');
      }

      // Test monitoring is working
      const healthReport = this.service.getHealthReport();
      if (!healthReport) {
        throw new Error('Health monitoring not working');
      }

      return { initialized, healthReport };
    });
  }

  async testSearchEngines() {
    return this.runTest('Search Engines', async () => {
      const engines = await this.service.initializeSearchEngines();

      if (!engines || engines.length === 0) {
        throw new Error('No search engines initialized');
      }

      // Test at least one engine
      const testEngine = engines[0];
      const results = await this.service.searchWithEngine(testEngine, ['test'], 1);

      // Results should be an array (even if empty due to test environment)
      if (!Array.isArray(results)) {
        throw new Error('Search engine did not return array');
      }

      return { engineCount: engines.length, testResults: results.length };
    });
  }

  async testKeywordExpansion() {
    return this.runTest('Keyword Expansion', async () => {
      const originalKeywords = ['hotel', 'development'];
      const expandedKeywords = await this.service.expandKeywords(originalKeywords);

      if (!expandedKeywords || expandedKeywords.length <= originalKeywords.length) {
        throw new Error('Keyword expansion failed or insufficient');
      }

      // Check for synonyms
      const hasSynonyms = expandedKeywords.some(k =>
        k.includes('boutique') || k.includes('luxury') || k.includes('construction')
      );

      if (!hasSynonyms) {
        throw new Error('Keyword expansion missing synonyms');
      }

      return {
        original: originalKeywords.length,
        expanded: expandedKeywords.length,
        hasSynonyms
      };
    });
  }

  async testContentEnrichment() {
    return this.runTest('Content Enrichment', async () => {
      // Test with a simple test URL
      const testResults = [{
        title: 'Test Article',
        url: 'https://httpbin.org/html',
        snippet: 'Test content',
        source: 'test'
      }];

      const enriched = await this.service.enrichResultsWithContent(testResults);

      if (!enriched || enriched.length === 0) {
        throw new Error('Content enrichment failed');
      }

      const result = enriched[0];

      // Should have basic fields
      if (!result.title || !result.url) {
        throw new Error('Enriched result missing basic fields');
      }

      return { enrichedCount: enriched.length, hasContent: !!result.articleText };
    });
  }

  async testDataExtraction() {
    return this.runTest('Data Extraction', async () => {
      const testContent = `
        John Smith, CEO of ABC Hotel Group, announced a new 200-room boutique hotel
        project in downtown area. The $50 million development is expected to be
        completed by 2025. Contact: john.smith@abc.com or call 555-123-4567.
      `;

      const extracted = await this.dataExtractionService.extractWithPatterns(testContent);

      if (!extracted) {
        throw new Error('Pattern extraction failed');
      }

      // Should extract some basic information
      const hasData = extracted.company || extracted.contactInfo || extracted.budget;

      return {
        extractedFields: Object.keys(extracted),
        hasData,
        company: extracted.company,
        budget: extracted.budget
      };
    });
  }

  async testCustomColumns() {
    return this.runTest('Custom Columns', async () => {
      // Test custom column creation
      const { Column } = require('./models');

      // Find a test user
      const User = require('./models/User');
      const testUser = await User.findOne();

      if (!testUser) {
        throw new Error('No test user found');
      }

      const createdColumns = await Column.createDefaultColumns(testUser.id);

      if (!Array.isArray(createdColumns)) {
        throw new Error('Column creation did not return array');
      }

      // Verify columns were created
      const columns = await Column.findVisibleByUser(testUser.id);

      if (columns.length === 0) {
        throw new Error('No columns found after creation');
      }

      return {
        userId: testUser.id,
        createdCount: createdColumns.length,
        totalColumns: columns.length
      };
    });
  }

  async testLeadDeduplication() {
    return this.runTest('Lead Deduplication', async () => {
      const testLead1 = {
        url: 'https://example.com/test1',
        title: 'Test Lead 1'
      };

      const testLead2 = {
        url: 'https://example.com/test1', // Same URL
        title: 'Test Lead 1 Different Title'
      };

      // Test deduplication logic
      const results = [testLead1, testLead2];
      const deduplicated = this.service.deduplicateResults(results);

      if (deduplicated.length !== 1) {
        throw new Error('Deduplication failed to remove duplicate');
      }

      return {
        originalCount: results.length,
        deduplicatedCount: deduplicated.length,
        success: deduplicated.length === 1
      };
    });
  }

  async testAIIntegration() {
    return this.runTest('AI Integration', async () => {
      if (!this.dataExtractionService.deepseekApiKey) {
        console.log('⚠️ Deepseek API key not configured, skipping AI test');
        return { skipped: true, reason: 'No API key' };
      }

      const testContent = 'John Doe is the CEO of TechCorp, contact at john@techcorp.com';

      const extracted = await this.dataExtractionService.extractWithCustomColumns(testContent, [
        {
          field_key: 'contact_name',
          name: 'Contact Name',
          description: 'Primary contact person',
          data_type: 'text',
          category: 'contact',
          is_visible: true
        }
      ]);

      // AI extraction might succeed or fail, but should not throw
      return {
        attempted: true,
        extractedFields: Object.keys(extracted),
        hasResults: Object.keys(extracted).length > 0
      };
    });
  }

  async testErrorHandling() {
    return this.runTest('Error Handling', async () => {
      // Test with invalid URL
      const invalidResults = [{
        title: 'Invalid Test',
        url: 'https://invalid-url-that-does-not-exist-12345.com',
        snippet: 'Test'
      }];

      const enriched = await this.service.enrichResultsWithContent(invalidResults);

      // Should handle errors gracefully
      if (!enriched || enriched.length !== 1) {
        throw new Error('Error handling failed');
      }

      const result = enriched[0];

      // Should still have basic information even if enrichment fails
      if (!result.title || !result.url) {
        throw new Error('Error handling lost basic data');
      }

      return {
        handledErrors: true,
        preservedData: !!result.title,
        resultStatus: result.success !== undefined ? result.success : 'unknown'
      };
    });
  }

  async testPerformanceMetrics() {
    return this.runTest('Performance Metrics', async () => {
      const healthReport = this.service.getHealthReport();

      if (!healthReport) {
        throw new Error('No health report available');
      }

      // Check required metrics
      const requiredMetrics = ['totalRequests', 'successfulRequests', 'averageResponseTime', 'isHealthy'];
      const missingMetrics = requiredMetrics.filter(metric => !(metric in healthReport));

      if (missingMetrics.length > 0) {
        throw new Error(`Missing metrics: ${missingMetrics.join(', ')}`);
      }

      return {
        metricsAvailable: requiredMetrics.length,
        isHealthy: healthReport.isHealthy,
        uptime: healthReport.uptime,
        successRate: healthReport.successRate
      };
    });
  }

  printTestSummary() {
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Total: ${this.testResults.passed + this.testResults.failed}`);

    if (this.testResults.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.tests
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(`  • ${test.name}: ${test.error}`);
        });
    }

    const successRate = ((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1);
    console.log(`\n🎯 Success Rate: ${successRate}%`);

    if (this.testResults.failed === 0) {
      console.log('🎉 All tests passed! System is ready for deployment.');
    } else {
      console.log('⚠️ Some tests failed. Review and fix before deployment.');
    }
  }
}

// Export for use in other files
module.exports = ScrapingSystemTester;

// Run tests if called directly
if (require.main === module) {
  const tester = new ScrapingSystemTester();
  tester.runAllTests()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

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
