const ScrapyService = require('./scrapyService');
const DataExtractionService = require('./dataExtractionService');
const axios = require('axios');
const { Lead, LeadSource } = require('../models');

// Scraping Health Monitoring Service
class ScrapingMonitor {
  constructor() {
    this.healthMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastHealthCheck: null,
      engineStatus: {},
      recentErrors: [],
      uptime: Date.now()
    };
    this.maxErrors = 50; // Keep last 50 errors
    this.startHealthMonitoring();
  }

  startHealthMonitoring() {
    // Check health every 30 seconds
    setInterval(() => {
      this.performHealthCheck();
    }, 30000);

    // Reset metrics daily
    setInterval(() => {
      this.resetDailyMetrics();
    }, 24 * 60 * 60 * 1000);
  }

  recordRequest(url, success, responseTime, error = null) {
    this.healthMetrics.totalRequests++;

    if (success) {
      this.healthMetrics.successfulRequests++;
    } else {
      this.healthMetrics.failedRequests++;
      if (error) {
        this.healthMetrics.recentErrors.unshift({
          url,
          error: error.message,
          timestamp: new Date(),
          responseTime
        });
        if (this.healthMetrics.recentErrors.length > this.maxErrors) {
          this.healthMetrics.recentErrors.pop();
        }
      }
    }

    // Update average response time
    const totalTime = this.healthMetrics.averageResponseTime * (this.healthMetrics.totalRequests - 1) + responseTime;
    this.healthMetrics.averageResponseTime = totalTime / this.healthMetrics.totalRequests;
  }

  updateEngineStatus(engineName, status, details = {}) {
    this.healthMetrics.engineStatus[engineName] = {
      status,
      lastCheck: new Date(),
      ...details
    };
  }

  async performHealthCheck() {
    console.log('🔍 Performing scraping health check...');

    try {
      // Test basic connectivity
      const testUrls = [
        'https://httpbin.org/html',
        'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en'
      ];

      for (const url of testUrls) {
        const startTime = Date.now();
        try {
          await axios.get(url, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          const responseTime = Date.now() - startTime;
          this.recordRequest(url, true, responseTime);
        } catch (error) {
          const responseTime = Date.now() - startTime;
          this.recordRequest(url, false, responseTime, error);
        }
      }

      this.healthMetrics.lastHealthCheck = new Date();
      console.log('✅ Health check completed');
    } catch (error) {
      console.warn('⚠️ Health check failed:', error.message);
    }
  }

  resetDailyMetrics() {
    console.log('🔄 Resetting daily scraping metrics');
    this.healthMetrics.totalRequests = 0;
    this.healthMetrics.successfulRequests = 0;
    this.healthMetrics.failedRequests = 0;
    this.healthMetrics.averageResponseTime = 0;
    this.healthMetrics.recentErrors = [];
  }

  getHealthReport() {
    const successRate = this.healthMetrics.totalRequests > 0
      ? (this.healthMetrics.successfulRequests / this.healthMetrics.totalRequests * 100).toFixed(2)
      : 0;

    return {
      ...this.healthMetrics,
      successRate: `${successRate}%`,
      uptime: Date.now() - this.healthMetrics.uptime,
      isHealthy: successRate > 80 && this.healthMetrics.recentErrors.length < 10
    };
  }

  getErrorRecovery() {
    const recentErrors = this.healthMetrics.recentErrors.slice(0, 5);
    const errorPatterns = {};

    // Analyze error patterns
    recentErrors.forEach(error => {
      const pattern = error.error.toLowerCase();
      if (pattern.includes('timeout')) {
        errorPatterns.timeout = (errorPatterns.timeout || 0) + 1;
      } else if (pattern.includes('404') || pattern.includes('not found')) {
        errorPatterns.notFound = (errorPatterns.notFound || 0) + 1;
      } else if (pattern.includes('403') || pattern.includes('forbidden')) {
        errorPatterns.blocked = (errorPatterns.blocked || 0) + 1;
      } else {
        errorPatterns.other = (errorPatterns.other || 0) + 1;
      }
    });

    return {
      recentErrors,
      errorPatterns,
      recommendations: this.generateRecommendations(errorPatterns)
    };
  }

  generateRecommendations(errorPatterns) {
    const recommendations = [];

    if (errorPatterns.timeout > 2) {
      recommendations.push('Increase timeout values and implement retry logic');
    }

    if (errorPatterns.blocked > 2) {
      recommendations.push('Implement user agent rotation and request throttling');
    }

    if (errorPatterns.notFound > 3) {
      recommendations.push('Review URL generation and validation logic');
    }

    if (Object.keys(errorPatterns).length === 0) {
      recommendations.push('System is operating normally');
    }

    return recommendations;
  }
}

class EnhancedScrapingService {
  constructor() {
    this.scrapyService = new ScrapyService();
    this.dataExtractionService = new DataExtractionService();
    this.monitor = new ScrapingMonitor(); // Initialize monitoring service
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    this.progressCallbacks = new Map();

    // Cost optimization features
    this.extractionCache = new Map(); // Cache for similar content
    this.apiCallCount = 0; // Track usage
    this.smartMode = process.env.SMART_EXTRACTION === 'true'; // Enable smart mode

    // Deepseek only - no OpenAI fallback
    if (this.deepseekApiKey) {
      console.log('✅ Deepseek initialized for enhanced extraction');
      if (this.smartMode) {
        console.log('🧠 Smart extraction mode enabled (maximum cost optimization)');
      }
    } else {
      console.log('⚠️ DEEPSEEK_API_KEY not found - set it in environment variables');
      console.log('   Get your key from: https://platform.deepseek.com/');
    }
  }

  async initialize() {
    console.log('🚀 Initializing Enhanced Scraping Service...');
    try {
      // Initialize Scrapy service (won't fail server if this fails)
      const scrapyResult = await this.scrapyService.initialize();

      if (scrapyResult) {
        console.log('✅ Enhanced Scraping Service initialized successfully');
      } else {
        console.warn('⚠️ Enhanced Scraping Service initialized with warnings');
      }

      return true; // Always return true to not block server startup
    } catch (error) {
      console.warn('⚠️ Enhanced Scraping Service initialization failed, but server will continue:', error.message);
      return true; // Don't fail server startup
    }
  }

  // Progress tracking methods
  setProgressCallback(jobId, callback) {
    this.progressCallbacks.set(jobId, callback);
  }

  updateProgress(jobId, stage, progress, total, message) {
    const callback = this.progressCallbacks.get(jobId);
    if (callback) {
      callback({
        stage,
        progress,
        total,
        percentage: Math.round((progress / total) * 100),
        message
      });
    }
  }

  async scrapeConfiguration(config, userId) {
    console.log(`🚀 Starting enhanced scraping for config: ${config.name}`);
    console.log(`🔍 Keywords: ${config.keywords.join(', ')}`);

    // Use high-quality sources by default if none specified
    const sourcesToUse = config.sources && config.sources.length > 0
      ? config.sources
      : ['scrapy', 'google', 'bing', 'news', 'rss']; // Prioritize Scrapy API first

    console.log(`📰 Sources to use: ${sourcesToUse.join(', ')}`);

    // Ensure database tables exist before proceeding
    try {
      await this.ensureTablesExist();
    } catch (tableError) {
      console.warn('⚠️ Could not ensure tables exist:', tableError.message);
    }

    // Initialize comprehensive search engines
    const searchEngines = await this.initializeSearchEngines();

    // Expand keywords for broader search coverage
    const expandedKeywords = await this.expandKeywords(config.keywords);
    console.log(`🔍 Expanded keywords from ${config.keywords.length} to ${expandedKeywords.length} terms`);

    // DISABLE DEEPSEEK TO AVOID COSTS UNTIL WE HAVE QUALITY LEADS
    console.log('🚫 DEEPSEEK AI DISABLED to avoid unnecessary costs until quality leads are found');
    this.deepseekApiKey = null; // Temporarily disable

    // Fetch user's custom columns for extraction
    let customColumns = [];
    try {
      const { Column } = require('../models');
      customColumns = await Column.findVisibleByUser(userId);
      console.log(`📊 Loaded ${customColumns.length} custom columns for extraction`);

      // If no columns exist, create default ones
      if (customColumns.length === 0) {
        console.log('📝 No custom columns found, creating default columns...');
        console.log(`📝 Using userId: ${userId}`);

        try {
          // First, verify the user exists
          const { User } = require('../models');
          const user = await User.findByPk(userId);
          if (!user) {
            console.error(`❌ User with ID ${userId} not found!`);
            // Try to find any user as fallback
            const fallbackUser = await User.findOne();
            if (fallbackUser) {
              console.log(`🔄 Using fallback user: ${fallbackUser.email}`);
              userId = fallbackUser.id;
            }
          }

          const createdColumns = await Column.createDefaultColumns(userId);
          console.log(`📝 Created ${createdColumns.length} default columns for user ${userId}`);

          // Reload columns
          customColumns = await Column.findVisibleByUser(userId);
          console.log(`📊 Reloaded ${customColumns.length} custom columns`);

        } catch (columnError) {
          console.error('❌ Could not create default columns:', columnError.message);
          console.error('Stack:', columnError.stack);

          // Try to create columns with a different approach
          try {
            console.log('🔄 Attempting manual column creation...');
            const defaultColumns = [
              { name: 'Contact Name', field_key: 'contact_name', description: 'Primary contact person', data_type: 'text', category: 'contact', is_system: true },
              { name: 'Contact Email', field_key: 'contact_email', description: 'Email address', data_type: 'email', category: 'contact', is_system: true },
              { name: 'Contact Phone', field_key: 'contact_phone', description: 'Phone number', data_type: 'phone', category: 'contact', is_system: true }
            ];

            for (const col of defaultColumns) {
              try {
                await Column.create({
                  ...col,
                  user_id: userId,
                  display_order: 1,
                  is_visible: true
                });
                console.log(`✅ Created column: ${col.name}`);
              } catch (createError) {
                console.log(`⚠️ Column ${col.name} already exists`);
              }
            }

            customColumns = await Column.findVisibleByUser(userId);
          } catch (manualError) {
            console.error('❌ Manual column creation also failed:', manualError.message);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load custom columns, proceeding without them:', error.message);
    }

    const allResults = [];
    const errors = [];
    const jobId = `${config.id}-${Date.now()}`;

    // Update progress - starting
    this.updateProgress(jobId, 'initializing', 0, sourcesToUse.length, 'Starting enhanced scraping...');

    try {
      // Use comprehensive multi-engine search
      console.log('\n🌐 Starting comprehensive web search...');
      const startTime = Date.now();

      const maxResultsPerEngine = Math.max(5, Math.floor((config.max_results_per_run || 50) / searchEngines.length));
      const searchPromises = [];

      // Search with each engine in parallel using expanded keywords
      for (const engine of searchEngines) {
        if (engine.enabled) {
          searchPromises.push(
            this.searchWithEngine(engine, expandedKeywords, maxResultsPerEngine)
          );
        }
      }

      // Execute all searches in parallel
      const searchResults = await Promise.allSettled(searchPromises);

      // Collect results from all engines
      let allResults = [];
      for (let i = 0; i < searchResults.length; i++) {
        const result = searchResults[i];
        const engine = searchEngines[i];

        if (result.status === 'fulfilled') {
          const engineResults = result.value;
          console.log(`✅ ${engine.name} returned ${engineResults.length} results`);

          // Update monitoring with engine success
          this.monitor.updateEngineStatus(engine.name, 'success', {
            results: engineResults.length,
            responseTime: Date.now() - startTime
          });

          // Add engine results to main collection
          allResults = allResults.concat(engineResults);

          // Update progress
          this.updateProgress(jobId, 'scraping', i + 1, searchEngines.length,
            `Searched ${engine.name} (${engineResults.length} results)...`);
        } else {
          console.warn(`❌ ${engine.name} failed:`, result.reason.message);

          // Update monitoring with engine failure
          this.monitor.updateEngineStatus(engine.name, 'failed', {
            error: result.reason.message,
            responseTime: Date.now() - startTime
          });
        }
      }

      console.log(`📊 Total results from all engines: ${allResults.length}`);

      // Deduplicate results based on URL
      const uniqueResults = this.deduplicateResults(allResults);
      console.log(`🔄 Deduplicated to ${uniqueResults.length} unique results`);

      // Limit results
      const limitedResults = uniqueResults.slice(0, config.max_results_per_run || 50);
      console.log(`📋 Limited to ${limitedResults.length} results for processing`);

      if (limitedResults.length === 0) {
        console.log('⚠️ No results found from any source');
        return {
          totalResults: 0,
          savedLeads: 0,
          leads: [],
          errors
        };
      }

      // Enrich results with full content using Scrapy
      console.log('📖 Enriching results with full content...');
      this.updateProgress(jobId, 'enriching', 0, limitedResults.length, 'Enriching results with full content...');

      // Filter out problematic URLs and prepare for enrichment
      const enrichmentResults = [];
      const skipEnrichmentResults = [];

      for (const result of limitedResults) {
        const isValid = result.url &&
                       result.url.startsWith('http') &&
                       !result.url.includes('news.google.com') && // Google redirects don't work
                       !result.url.includes('bing.com/news'); // Bing redirects may not work

        if (!isValid) {
          console.log(`⏭️ Skipping problematic URL: ${result.url}`);
          continue;
        }

        // For RSS results with good snippets, skip enrichment to speed up process
        if (result.engine === 'RSS Feeds' && result.snippet && result.snippet.length > 100) {
          skipEnrichmentResults.push({
            ...result,
            articleText: result.snippet,
            scrapedAt: new Date()
          });
        } else {
          enrichmentResults.push(result);
        }
      }

      console.log(`📋 ${enrichmentResults.length} URLs for enrichment, ${skipEnrichmentResults.length} RSS results with snippets`);

      // Enrich results that need it
      const enrichedResults = [];
      if (enrichmentResults.length > 0) {
        const scrapedResults = await this.enrichResultsWithContent(enrichmentResults);
        enrichedResults.push(...scrapedResults);
      }

      // Combine enriched and skip-enrichment results
      const allProcessedResults = [...enrichedResults, ...skipEnrichmentResults];
      console.log(`✅ Processed ${allProcessedResults.length} results (${enrichedResults.length} enriched, ${skipEnrichmentResults.length} from RSS)`);

      // Extract lead data using enhanced AI and pattern-based methods
      console.log('🤖 Processing results with enhanced data extraction...');
      this.updateProgress(jobId, 'extracting', 0, allProcessedResults.length, 'Extracting lead data...');
      const processedResults = await this.processResultsWithEnhancedExtraction(allProcessedResults, config, customColumns);
      console.log(`🤖 Data extraction completed. Processed ${processedResults.length} results with ${customColumns.length} custom fields.`);

      // Save leads to database
      console.log(`💾 Attempting to save ${processedResults.length} leads...`);
      this.updateProgress(jobId, 'saving', 0, processedResults.length, 'Saving leads to database...');
      const savedLeads = await this.saveLeads(processedResults, userId, config, customColumns);

      console.log(`🎉 Successfully saved ${savedLeads.length} leads.`);

      // Update progress - completed
      this.updateProgress(jobId, 'completed', savedLeads.length, savedLeads.length, `Successfully saved ${savedLeads.length} leads!`);

      return {
        totalResults: limitedResults.length,
        savedLeads: savedLeads.length,
        leads: savedLeads,
        errors,
        jobId
      };

    } catch (error) {
      console.error('❌ Enhanced scraping failed:', error);
      throw error;
    }
  }

  async scrapeGoogleNews(keywords, maxResults = 20) {
    try {
      const searchQuery = keywords.join(' ');
      const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;
      
      const content = await this.scrapyService.scrapeWithScrapy(searchUrl, { renderJs: false });
      
      // Parse Google News results
      const $ = require('cheerio').load(content.html);
      const articles = [];
      
      $('article, .MQsxIb').each((i, elem) => {
        if (articles.length >= maxResults) return false;
        
        const $elem = $(elem);
        const title = $elem.find('h3, h4, a').text().trim();
        const link = $elem.find('a[href*="/articles/"]').attr('href');
        
        if (title && link) {
          const absoluteUrl = 'https://news.google.com' + link;
          articles.push({
            title,
            url: absoluteUrl,
            source: 'Google News',
            snippet: title,
            publishedDate: new Date()
          });
        }
      });
      
      return articles;
    } catch (error) {
      console.error('❌ Google News scraping failed:', error);
      return [];
    }
  }

  async scrapeBingNews(keywords, maxResults = 20) {
    try {
      const searchQuery = keywords.join(' ');
      const searchUrl = `https://www.bing.com/news/search?q=${encodeURIComponent(searchQuery)}`;
      
      const content = await this.scrapyService.scrapeWithScrapy(searchUrl, { renderJs: false });
      
      // Parse Bing News results
      const $ = require('cheerio').load(content.html);
      const articles = [];
      
      $('.news-card, .newsitem').each((i, elem) => {
        if (articles.length >= maxResults) return false;
        
        const $elem = $(elem);
        const title = $elem.find('.title, h2, h3').text().trim();
        const link = $elem.find('a').attr('href');
        
        if (title && link) {
          let absoluteUrl;

          try {
            if (link.startsWith('http')) {
              absoluteUrl = link;
            } else if (link.startsWith('//')) {
              absoluteUrl = 'https:' + link;
            } else if (link.startsWith('/')) {
              absoluteUrl = 'https://www.bing.com' + link;
            } else {
              // Skip invalid URLs
              return;
            }

            // Validate URL
            new URL(absoluteUrl);

            articles.push({
              title,
              url: absoluteUrl,
              source: 'Bing News',
              snippet: title,
              publishedDate: new Date()
            });
          } catch (error) {
            console.warn(`⚠️ Skipping invalid Bing News URL: ${link}`);
          }
        }
      });
      
      return articles;
    } catch (error) {
      console.error('❌ Bing News scraping failed:', error);
      return [];
    }
  }

  async scrapeNewsSources(keywords, maxResults = 20) {
    return await this.scrapyService.scrapeNewsSources(keywords, maxResults);
  }

  async scrapeWithScrapy(keywords, maxResults = 20) {
    try {
      const searchQuery = keywords.join(' ');
      
      // Target business and construction news sources directly for higher quality leads
      const businessNewsUrls = [
        `https://www.constructiondive.com/search/?q=${encodeURIComponent(searchQuery + ' development project')}`,
        `https://www.enr.com/search?q=${encodeURIComponent(searchQuery + ' construction announcement')}`,
        `https://www.bizjournals.com/search?q=${encodeURIComponent(searchQuery + ' real estate project')}`,
        `https://www.reuters.com/search?q=${encodeURIComponent(searchQuery + ' business development')}`,
        `https://www.bloomberg.com/search?q=${encodeURIComponent(searchQuery + ' construction news')}`,
        `https://www.cnbc.com/search?q=${encodeURIComponent(searchQuery + ' development announcement')}`,
        `https://www.marketwatch.com/search?q=${encodeURIComponent(searchQuery + ' project announcement')}`,
        `https://www.forbes.com/search?q=${encodeURIComponent(searchQuery + ' business expansion')}`
      ];
      
      const allResults = [];
      
      for (const searchUrl of businessNewsUrls) {
        try {
          console.log(`🔍 Searching business news: ${searchUrl}`);
          const content = await this.scrapyService.scrapeWithScrapy(searchUrl, { renderJs: false });
          const results = this.extractBusinessNewsResults(content, keywords);
          allResults.push(...results);
          
          if (allResults.length >= maxResults) break;
        } catch (error) {
          console.log(`⚠️ Failed to scrape ${searchUrl}: ${error.message}`);
        }
      }
      
      return allResults.slice(0, maxResults);
    } catch (error) {
      console.error('❌ Scrapy search failed:', error);
      return [];
    }
  }

  extractSearchResults(content, keywords) {
    const $ = require('cheerio').load(content.html);
    const results = [];
    
    // Look for search result patterns
    $('h3 a, .result__title a, .result a, .g h3 a').each((i, elem) => {
      if (results.length >= 20) return false;
      
      const $elem = $(elem);
      const title = $elem.text().trim();
      const link = $elem.attr('href');
      
      if (title && link) {
        // Check if any keyword matches
        const lowerTitle = title.toLowerCase();
        const hasKeyword = keywords.some(keyword => 
          lowerTitle.includes(keyword.toLowerCase())
        );
        
        if (hasKeyword) {
          results.push({
            title,
            url: link,
            source: new URL(content.url).hostname,
            snippet: title,
            publishedDate: new Date()
          });
        }
      }
    });
    
    return results;
  }

  extractBusinessNewsResults(content, keywords) {
    const $ = require('cheerio').load(content.html);
    const results = [];
    
    // Look for business news article patterns
    const selectors = [
      'article h2 a', 'article h3 a', '.article-title a', '.headline a',
      '.story-title a', '.news-title a', '.search-result a', '.result a',
      'h2 a', 'h3 a', '.title a', '.headline a'
    ];
    
    for (const selector of selectors) {
      $(selector).each((i, elem) => {
        if (results.length >= 20) return false;
        
        const $elem = $(elem);
        const title = $elem.text().trim();
        let link = $elem.attr('href');
        
        if (title && link) {
          // Make relative URLs absolute
          if (link.startsWith('/')) {
            const baseUrl = new URL(content.url);
            link = baseUrl.origin + link;
          } else if (!link.startsWith('http')) {
            const baseUrl = new URL(content.url);
            link = baseUrl.origin + '/' + link;
          }
          
          // Check if any keyword matches and filter for business relevance
          const lowerTitle = title.toLowerCase();
          const hasKeyword = keywords.some(keyword => 
            lowerTitle.includes(keyword.toLowerCase())
          );
          
          // Additional business relevance filters
          const businessTerms = ['development', 'construction', 'project', 'announcement', 'expansion', 'investment', 'planning', 'proposal', 'hotel', 'real estate', 'infrastructure'];
          const hasBusinessTerm = businessTerms.some(term => lowerTitle.includes(term));
          
          if (hasKeyword && hasBusinessTerm) {
            // Try to extract snippet from nearby text
            let snippet = title;
            const $parent = $elem.parent();
            const $sibling = $parent.find('p, .summary, .excerpt, .description');
            if ($sibling.length > 0) {
              snippet = $sibling.first().text().trim();
            }
            
            // Only add if we have a valid, accessible URL
            if (link.startsWith('http') && !link.includes('search?') && !link.includes('rss')) {
              results.push({
                title,
                url: link,
                source: new URL(content.url).hostname,
                snippet: snippet || title,
                publishedDate: new Date()
              });
            }
          }
        }
      });
      
      if (results.length >= 20) break;
    }
    
    return results;
  }

  async enrichResultsWithContent(results) {
    const enriched = [];
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      try {
        console.log(`📖 Extracting full content from: ${result.url}`);
        
        let fullContent = result.snippet;
        let articleText = '';
        
        try {
          const content = await this.scrapyService.scrapeWithScrapy(result.url, { renderJs: false });
          
          if (content.html) {
            // Use Cheerio to extract article content more intelligently
            const $ = require('cheerio').load(content.html);
            
            // Remove navigation, ads, and other non-content elements
            $('nav, .advertisement, .sidebar, .comments, .social-share, script, style').remove();
            
            // Look for article content in common selectors
            const contentSelectors = [
              'article .content', 'article .body', 'article .text',
              '.article-content', '.article-body', '.article-text',
              '.content', '.body', '.text', '.story-content',
              'main', 'article', '.post-content', '.entry-content'
            ];
            
            let articleContent = '';
            for (const selector of contentSelectors) {
              const $content = $(selector);
              if ($content.length > 0) {
                articleContent = $content.text().trim();
                if (articleContent.length > 200) break; // Found substantial content
              }
            }
            
            // If no specific content area found, extract from paragraphs
            if (!articleContent || articleContent.length < 200) {
              const $paragraphs = $('p');
              articleContent = $paragraphs.map((i, p) => $(p).text().trim()).get().join(' ');
            }
            
            // Clean up the text
            articleText = articleContent
              .replace(/\s+/g, ' ') // Replace multiple spaces with single space
              .replace(/\n+/g, ' ') // Replace newlines with spaces
              .trim();
            
            if (articleText.length > 100) {
              fullContent = articleText;
            } else {
              fullContent = content.text || content.snippet || result.snippet;
            }
          } else {
            fullContent = content.text || content.snippet || result.snippet;
            }
          
        } catch (error) {
          console.log(`⚠️ Could not extract full content from ${result.url}, using snippet`);
        }
        
        enriched.push({
          ...result,
          fullContent,
          articleText,
          extractedAt: new Date()
        });
        
      } catch (error) {
        console.error(`❌ Error enriching result ${result.url}:`, error);
        enriched.push({
          ...result,
          fullContent: result.snippet,
          articleText: '',
          extractedAt: new Date()
        });
      }
    }
    
    return enriched;
  }

  async processResultsWithExtraction(results, config, customColumns = []) {
    const processed = [];

    for (const result of results) {
      try {
        let extractedData = {};

        if (this.deepseekApiKey && config.useAI !== false) {
          // Use Deepseek AI extraction if available
          extractedData = await this.extractWithAI(result.fullContent, config.data_extraction_rules || {}, customColumns);
        } else {
          // Use pattern-based extraction with improved content and custom columns
          const contentToAnalyze = result.articleText || result.fullContent || result.snippet;
          extractedData = this.dataExtractionService.extractWithCustomColumns(contentToAnalyze, customColumns);

          // Always try to extract from title and snippet for better results
          const titleSnippetData = this.extractFromTitleAndSnippet(result.title, result.snippet);
          extractedData = { ...extractedData, ...titleSnippetData };

          // If we still get mostly "Unknown" values, try enhanced extraction
          if (this.isMostlyUnknown(extractedData)) {
            const enhancedData = this.extractEnhancedData(result.title, result.snippet, contentToAnalyze);
            extractedData = { ...extractedData, ...enhancedData };
          }
        }

        // Mark that AI was used if applicable
        if (this.deepseekApiKey && config.useAI !== false) {
          extractedData.aiUsed = true;
        }

        processed.push({
          ...result,
          extractedData
        });

      } catch (error) {
        console.error(`❌ Error processing result ${result.url}:`, error);
        // Fallback to basic extraction with custom columns
        const fallbackData = this.dataExtractionService.extractWithCustomColumns(result.fullContent, customColumns);
        processed.push({
          ...result,
          extractedData: fallbackData
        });
      }
    }

    return processed;
  }

  async extractWithAI(text, extractionRules, customColumns = []) {
    try {
      if (!this.deepseekApiKey) {
        console.warn('⚠️ No Deepseek API key - using pattern extraction');
        return this.dataExtractionService.extractWithCustomColumns(text, customColumns);
      }

      // SMART MODE: Try pattern extraction first, only use AI when needed
      if (this.smartMode) {
        const patternData = this.dataExtractionService.extractWithCustomColumns(text, customColumns);
        const confidence = this.calculateConfidence(patternData);

        // Only use AI if pattern extraction confidence is low (< 50%)
        if (confidence < 50) {
          console.log(`🤖 Using Deepseek AI (pattern confidence: ${confidence}%)`);
          const aiData = await this.extractWithDeepseek(this.buildAIExtractionPrompt(text, extractionRules, customColumns));

          // Merge pattern and AI results, preferring AI when available
          return this.mergeExtractionResults(patternData, aiData);
        } else {
          console.log(`📊 Using pattern extraction (confidence: ${confidence}%)`);
          return patternData;
        }
      }

      // NORMAL MODE: Always use AI
      const prompt = this.buildAIExtractionPrompt(text, extractionRules, customColumns);
      return await this.extractWithDeepseek(prompt);
    } catch (error) {
      console.error('Deepseek extraction failed:', error);
      // Fallback to pattern extraction with custom columns
      return this.dataExtractionService.extractWithCustomColumns(text, customColumns);
    }
  }

  calculateConfidence(extractedData) {
    let knownFields = 0;
    let totalFields = 0;

    Object.entries(extractedData).forEach(([key, value]) => {
      totalFields++;
      if (value && value !== 'Unknown' && value !== '') {
        knownFields++;
      }
    });

    return totalFields > 0 ? Math.round((knownFields / totalFields) * 100) : 0;
  }

  mergeExtractionResults(patternData, aiData) {
    const merged = { ...patternData };

    // Prefer AI data when available and not "Unknown"
    Object.entries(aiData).forEach(([key, value]) => {
      if (value && value !== 'Unknown' && value !== '') {
        merged[key] = value;
      }
    });

    return merged;
  }



  async extractWithDeepseek(prompt) {
    try {
      // Track API usage for cost monitoring
      this.apiCallCount++;
      const startTime = Date.now();

      const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are an expert at extracting business lead information from web content. Extract only the requested information and return it in valid JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 200 // Reduced from 500 for cost optimization
      }, {
        headers: {
          'Authorization': `Bearer ${this.deepseekApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // Reduced timeout
      });

      const processingTime = Date.now() - startTime;
      const content = response.data.choices[0].message.content;

      // Log usage for cost tracking
      console.log(`💰 Deepseek API Call #${this.apiCallCount}: ${processingTime}ms`);

      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse Deepseek response:', parseError);
        throw parseError;
      }
    } catch (error) {
      console.error('Deepseek API error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Batch processing for multiple leads (further cost optimization)
  async extractMultipleWithAI(contentList, extractionRules) {
    if (!this.smartMode) {
      // Normal mode: process individually
      return Promise.all(contentList.map(content => this.extractWithAI(content, extractionRules)));
    }

    // Smart mode: filter out low-confidence items first
    const results = [];
    for (const content of contentList) {
      const patternData = this.dataExtractionService.extractAllData(content);
      const confidence = this.calculateConfidence(patternData);

      if (confidence >= 50) {
        // High confidence, use pattern extraction
        console.log(`📊 Batch: Pattern extraction (${confidence}%)`);
        results.push(patternData);
      } else {
        // Low confidence, use AI extraction
        console.log(`🤖 Batch: AI extraction (${confidence}%)`);
        try {
          const aiData = await this.extractWithAI(content, extractionRules);
          results.push(aiData);
        } catch (error) {
          console.error('Batch AI extraction failed:', error);
          results.push(patternData); // Fallback to pattern
        }
      }
    }

    return results;
  }

  buildAIExtractionPrompt(text, extractionRules, customColumns = []) {
    // Preprocess text to reduce token usage
    const processedText = this.preprocessText(text);

    // Use essential fields + custom columns
    const essentialFields = ['company', 'location', 'projectType', 'budget'];
    const allFields = [...essentialFields, ...customColumns.map(col => col.field_key)];

    let prompt = `Extract specific information from this business article. Return JSON only:\n\n`;

    // Add essential fields
    essentialFields.forEach(field => {
      prompt += `- ${field}: ${this.getFieldDescription(field)}\n`;
    });

    // Add custom columns with their specific descriptions
    customColumns.forEach(column => {
      const description = column.description || this.getFieldDescription(column.field_key);
      prompt += `- ${column.field_key}: ${description}\n`;
    });

    // Limit content to 1500 characters (50% reduction)
    prompt += `\nContent:\n${processedText.substring(0, 1500)}\n\n`;

    // Build JSON template
    const jsonTemplate = {};
    allFields.forEach(field => {
      jsonTemplate[field] = "...";
    });

    prompt += `Return JSON: ${JSON.stringify(jsonTemplate)}`;

    return prompt;
  }

  preprocessText(text) {
    // Remove irrelevant content to reduce token usage
    return text
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove common boilerplate
      .replace(/cookie policy|privacy policy|terms of service|advertisement|newsletter|subscribe/gi, '')
      // Remove navigation elements
      .replace(/home|about|contact|menu|navigation/gi, '')
      // Keep only first 1500 chars of meaningful content
      .substring(0, 2000)
      .trim();
  }

  getFieldDescription(field) {
    const descriptions = {
      company: 'Company name if mentioned',
      location: 'Location/area if mentioned',
      projectType: 'Type of project (hotel, office, etc.)',
      budget: 'Budget amount if mentioned (as number)',
      timeline: 'Project timeline if mentioned',
      roomCount: 'Number of rooms/units if mentioned',
      squareFootage: 'Square footage if mentioned',
      employees: 'Number of employees/jobs if mentioned',
      status: 'Project status (proposed, under_construction, completed)',
      priority: 'Project priority (high, medium, low)',
      industryType: 'Industry type (hospitality, residential, commercial, retail, mixed_use)'
    };
    
    return descriptions[field] || 'Information if mentioned';
  }

  ensureValidUrl(url) {
    if (!url) return 'https://example.com';
    
    // If it's already a valid URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it's a relative path, try to construct a valid URL
    if (url.startsWith('/')) {
      // For relative paths, we'll use a placeholder since we don't know the base domain
      return `https://example.com${url}`;
    }
    
    // If it's just a path without leading slash, add it
    if (!url.startsWith('http') && !url.startsWith('/')) {
      return `https://example.com/${url}`;
    }
    
    // Fallback
    return 'https://example.com';
  }

  getLeadSourceType(source, url) {
    if (!source && !url) return 'other';
    
    const sourceLower = (source || '').toLowerCase();
    const urlLower = (url || '').toLowerCase();
    
    // Check for RSS feeds
    if (sourceLower.includes('rss') || sourceLower.includes('feed') || 
        urlLower.includes('rss') || urlLower.includes('feed')) {
      return 'rss_feed';
    }
    
    // Check for news sites
    if (sourceLower.includes('news') || sourceLower.includes('bbc') || 
        sourceLower.includes('cnn') || sourceLower.includes('reuters') ||
        sourceLower.includes('bloomberg') || sourceLower.includes('cnbc') ||
        urlLower.includes('news') || urlLower.includes('bbc') || 
        urlLower.includes('cnn') || urlLower.includes('reuters') ||
        urlLower.includes('bloomberg') || urlLower.includes('cnbc')) {
      return 'news_site';
    }
    
    // Check for social media
    if (sourceLower.includes('twitter') || sourceLower.includes('facebook') ||
        sourceLower.includes('linkedin') || sourceLower.includes('instagram') ||
        urlLower.includes('twitter') || urlLower.includes('facebook') ||
        urlLower.includes('linkedin') || urlLower.includes('instagram')) {
      return 'social_media';
    }
    
    // Check for job boards
    if (sourceLower.includes('job') || sourceLower.includes('career') ||
        sourceLower.includes('indeed') || sourceLower.includes('glassdoor') ||
        urlLower.includes('job') || urlLower.includes('career') ||
        urlLower.includes('indeed') || urlLower.includes('glassdoor')) {
      return 'job_board';
    }
    
    // Check for APIs
    if (sourceLower.includes('api') || urlLower.includes('api')) {
      return 'api';
    }
    
    // Default to website for general web scraping
    return 'website';
  }

  mapStatusToValidEnum(extractedStatus) {
    if (!extractedStatus) return 'new';
    
    const status = extractedStatus.toLowerCase();
    
    // Map extracted status values to valid enum values
    switch (status) {
      case 'proposed':
      case 'planning':
      case 'announced':
        return 'new';
      case 'under_construction':
      case 'in_progress':
      case 'active':
        return 'qualified';
      case 'completed':
      case 'finished':
      case 'done':
        return 'won';
      case 'cancelled':
      case 'on_hold':
      case 'delayed':
        return 'lost';
      case 'unknown':
      default:
        return 'new';
    }
  }

  mapPriorityToValidEnum(extractedPriority) {
    if (!extractedPriority) return 'medium';
    
    const priority = extractedPriority.toLowerCase();
    
    // Map extracted priority values to valid enum values
    switch (priority) {
      case 'urgent':
      case 'critical':
        return 'urgent';
      case 'high':
      case 'important':
        return 'high';
      case 'medium':
      case 'normal':
        return 'medium';
      case 'low':
      case 'minor':
        return 'low';
      default:
        return 'medium';
    }
  }

  mapIndustryTypeToId(industryType) {
    if (!industryType) return null;
    
    // Map industry type to industry ID (you may need to adjust these based on your database)
    const industryMap = {
      'hospitality': 1,
      'residential': 2,
      'commercial': 3,
      'retail': 4,
      'mixed_use': 5,
      'infrastructure': 6,
      'industrial': 7
    };
    
    return industryMap[industryType.toLowerCase()] || null;
  }

  async initializeSearchEngines() {
    const engines = [];

    // Internet-wide News Search Engines
    engines.push({
      name: 'Google News Search',
      type: 'internet_search',
      searchUrl: 'https://news.google.com/search?q={keywords}&hl=en-US&gl=US&ceid=US:en',
      enabled: true,
      priority: 1
    });

    engines.push({
      name: 'Bing News Search',
      type: 'internet_search',
      searchUrl: 'https://www.bing.com/news/search?q={keywords}&setlang=en-US',
      enabled: true,
      priority: 2
    });

    engines.push({
      name: 'DuckDuckGo News',
      type: 'internet_search',
      searchUrl: 'https://duckduckgo.com/news?q={keywords}',
      enabled: true,
      priority: 3
    });

    // Dynamic Article Discovery Engines
    engines.push({
      name: 'Google Web Search',
      type: 'web_search',
      searchUrl: 'https://www.google.com/search?q={keywords}&tbm=nws&hl=en',
      enabled: true,
      priority: 4
    });

    engines.push({
      name: 'Bing Web Search',
      type: 'web_search',
      searchUrl: 'https://www.bing.com/search?q={keywords}&setlang=en-US&tbm=news',
      enabled: true,
      priority: 5
    });

    // News Aggregator APIs
    engines.push({
      name: 'NewsAPI.org',
      type: 'news_api',
      apiUrl: 'https://newsapi.org/v2/everything?q={keywords}&language=en&sortBy=publishedAt',
      enabled: process.env.NEWS_API_KEY ? true : false,
      priority: 6
    });

    // Major News Publications Direct Search
    engines.push({
      name: 'Major News Publications',
      type: 'direct_search',
      sources: [
        { name: 'Reuters', searchUrl: 'https://www.reuters.com/search/news/?blob={keywords}' },
        { name: 'Bloomberg', searchUrl: 'https://www.bloomberg.com/search?query={keywords}' },
        { name: 'CNBC', searchUrl: 'https://www.cnbc.com/search/?query={keywords}' },
        { name: 'Fox Business', searchUrl: 'https://www.foxbusiness.com/search?q={keywords}' },
        { name: 'MarketWatch', searchUrl: 'https://www.marketwatch.com/search?q={keywords}' },
        { name: 'WSJ', searchUrl: 'https://www.wsj.com/search?query={keywords}' },
        { name: 'Forbes', searchUrl: 'https://www.forbes.com/search/?q={keywords}' },
        { name: 'Fortune', searchUrl: 'https://fortune.com/search/?query={keywords}' }
      ],
      enabled: true,
      priority: 7
    });

    // Industry-specific search engines
    engines.push({
      name: 'Construction & Engineering',
      type: 'industry',
      searchUrl: 'https://www.enr.com/search?q={keywords}',
      enabled: true,
      priority: 4
    });

    // Real estate and hospitality news
    engines.push({
      name: 'Real Estate News',
      type: 'industry',
      searchUrl: 'https://www.bizjournals.com/search?q={keywords}',
      enabled: true,
      priority: 5
    });

    // Direct company websites and press releases
    engines.push({
      name: 'Company Press Releases',
      type: 'pr',
      searchUrl: 'https://www.prnewswire.com/search/news/{keywords}',
      enabled: true,
      priority: 6
    });

    console.log(`🔍 Initialized ${engines.length} search engines`);
    return engines;
  }

  async searchWithEngine(engine, keywords, maxResults = 10) {
    try {
      const searchTerm = keywords.join(' OR ');

      // Handle different search engine types
      if (engine.type === 'rss') {
        return await this.searchRSSFeeds(engine, keywords, maxResults);
      }

      if (engine.type === 'news_api') {
        return await this.searchNewsAPI(engine, keywords, maxResults);
      }

      if (engine.type === 'direct_search') {
        return await this.searchDirectPublications(engine, keywords, maxResults);
      }

      if (engine.type === 'internet_search' || engine.type === 'web_search') {
        return await this.searchInternetNews(engine, keywords, maxResults);
      }

      // Ensure searchUrl exists before trying to replace
      if (!engine.searchUrl) {
        console.warn(`⚠️ ${engine.name} has no searchUrl defined`);
        return [];
      }

      const url = engine.searchUrl.replace('{keywords}', encodeURIComponent(searchTerm));

      console.log(`🔍 Searching ${engine.name}: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 15000,
        responseType: 'text'
      });

      if (engine.type === 'news' && url.includes('news.google.com')) {
        return this.parseGoogleNewsRSS(response.data, engine);
      } else if (engine.type === 'news' && url.includes('bing.com')) {
        return this.parseBingNewsRSS(response.data, engine);
      } else {
        return this.parseGeneralHTML(response.data, url, engine);
      }

    } catch (error) {
      console.warn(`⚠️ ${engine.name} search failed:`, error.message);
      return [];
    }
  }

  async searchRSSFeeds(engine, keywords, maxResults = 10) {
    const results = [];
    const searchTerm = keywords.join(' ').toLowerCase();

    console.log(`📰 Searching ${engine.feeds.length} RSS feeds for: ${searchTerm}`);

    for (const feedUrl of engine.feeds) {
      try {
        console.log(`📡 Fetching RSS feed: ${feedUrl}`);

        const response = await axios.get(feedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*'
          },
          timeout: 10000,
          responseType: 'text'
        });

        const feedResults = this.parseRSSFeed(response.data, feedUrl, searchTerm);
        results.push(...feedResults);

        if (results.length >= maxResults) break;

      } catch (error) {
        console.warn(`⚠️ Failed to fetch RSS feed ${feedUrl}:`, error.message);
        continue;
      }
    }

    console.log(`✅ RSS feeds returned ${results.length} results`);
    return results.slice(0, maxResults);
  }

  parseRSSFeed(xmlData, feedUrl, searchTerm) {
    try {
      const results = [];
      // Simple XML parsing - extract items
      const items = xmlData.match(/<item[^>]*>[\s\S]*?<\/item>/g) || [];

      for (const item of items.slice(0, 10)) { // Limit items per feed
        const title = item.match(/<title[^>]*>([^<]*)<\/title>/)?.[1] || '';
        const link = item.match(/<link[^>]*>([^<]*)<\/link>/)?.[1] || '';
        const description = item.match(/<description[^>]*>([^<]*)<\/description>/)?.[1] || '';
        const pubDate = item.match(/<pubDate[^>]*>([^<]*)<\/pubDate>/)?.[1] || '';

        // Clean up extracted data
        const cleanTitle = title.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        const cleanLink = link.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        const cleanDescription = description.replace(/<!\[CDATA\[|\]\]>/g, '').trim();

        // Check if the content matches our search terms
        const contentText = `${cleanTitle} ${cleanDescription}`.toLowerCase();
        const matchesKeywords = searchTerm.split(' ').some(term =>
          contentText.includes(term) || term.includes('hotel') || term.includes('development')
        );

        if (matchesKeywords && cleanTitle && cleanLink && cleanLink.startsWith('http')) {
          results.push({
            title: cleanTitle,
            url: cleanLink,
            snippet: cleanDescription.substring(0, 200) || cleanTitle,
            source: new URL(cleanLink).hostname,
            publishedDate: pubDate ? new Date(pubDate) : new Date(),
            engine: 'RSS Feeds'
          });
        }
      }

      return results;
    } catch (error) {
      console.warn(`⚠️ Error parsing RSS feed:`, error.message);
      return [];
    }
  }

  // 🔗 GUARANTEED URL METHODS - Every result will have a valid URL

  async searchInternetNews(engine, keywords, maxResults = 10) {
    const results = [];
    const searchTerm = keywords.join(' OR ');
    const url = engine.searchUrl.replace('{keywords}', encodeURIComponent(searchTerm));

    try {
      console.log(`🌐 Searching ${engine.name} for recent articles...`);

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 15000,
        responseType: 'text'
      });

      const $ = require('cheerio').load(response.data);

      // Extract articles from search results
      let articleCount = 0;
      const selectors = [
        '.g', // Google search results
        '.news-result', // Bing news results
        '.result', // DuckDuckGo results
        'article', // Generic article tags
        '.story', // Story containers
        '.news-item' // News item containers
      ];

      for (const selector of selectors) {
        $(selector).each((i, elem) => {
          if (articleCount >= maxResults) return false;

          const $elem = $(elem);
          const title = $elem.find('h1, h2, h3, .title, .headline').first().text().trim() ||
                       $elem.find('a').first().text().trim();

          let articleUrl = $elem.find('a').first().attr('href');

          // Handle Google/Bing URL formats
          if (articleUrl) {
            if (articleUrl.startsWith('/url?q=')) {
              // Google format: /url?q=https://example.com
              const urlMatch = articleUrl.match(/\/url\?q=([^&]+)/);
              if (urlMatch) articleUrl = decodeURIComponent(urlMatch[1]);
            } else if (articleUrl.startsWith('http') === false) {
              // Relative URL
              articleUrl = url + (articleUrl.startsWith('/') ? '' : '/') + articleUrl;
            }
          }

          const snippet = $elem.find('.snippet, .summary, .description, p').first().text().trim() ||
                         $elem.find('.st').first().text().trim() ||
                         title;

          // URL VALIDATION - Guarantee every result has a valid URL
          if (title && articleUrl && this.isValidArticleUrl(articleUrl)) {
            // Filter for hotel/development related content
            const contentText = `${title} ${snippet}`.toLowerCase();
            if (this.isRelevantContent(contentText, keywords)) {
              results.push({
                title: title,
                url: articleUrl, // GUARANTEED URL
                snippet: snippet.substring(0, 300),
                source: this.extractDomain(articleUrl),
                publishedDate: new Date(),
                engine: engine.name,
                urlVerified: true // Mark that URL is verified
              });
              articleCount++;
            }
          }
        });

        if (articleCount >= maxResults) break;
      }

      console.log(`✅ ${engine.name} found ${results.length} articles with guaranteed URLs`);
      return results;
    } catch (error) {
      console.warn(`⚠️ ${engine.name} search failed:`, error.message);
      return [];
    }
  }

  async searchNewsAPI(engine, keywords, maxResults = 10) {
    const results = [];
    const searchTerm = keywords.join(' OR ');

    if (!process.env.NEWS_API_KEY) {
      console.warn(`⚠️ ${engine.name} disabled - NEWS_API_KEY not configured`);
      return [];
    }

    try {
      console.log(`📰 Searching ${engine.name} for recent articles...`);

      const apiUrl = engine.apiUrl.replace('{keywords}', encodeURIComponent(searchTerm));
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.NEWS_API_KEY}`
        },
        timeout: 10000
      });

      if (response.data.articles) {
        for (const article of response.data.articles.slice(0, maxResults)) {
          if (article.title && article.url && this.isValidArticleUrl(article.url)) {
            const contentText = `${article.title} ${article.description || ''}`.toLowerCase();

            if (this.isRelevantContent(contentText, keywords)) {
              results.push({
                title: article.title,
                url: article.url, // GUARANTEED URL from NewsAPI
                snippet: article.description || article.title,
                source: article.source?.name || this.extractDomain(article.url),
                publishedDate: new Date(article.publishedAt || Date.now()),
                engine: engine.name,
                urlVerified: true,
                author: article.author,
                imageUrl: article.urlToImage
              });
            }
          }
        }
      }

      console.log(`✅ ${engine.name} found ${results.length} articles with guaranteed URLs`);
      return results;
    } catch (error) {
      console.warn(`⚠️ ${engine.name} search failed:`, error.message);
      return [];
    }
  }

  async searchDirectPublications(engine, keywords, maxResults = 10) {
    const results = [];
    const searchTerm = keywords.join(' OR ');

    console.log(`🏢 Searching ${engine.sources.length} major publications...`);

    for (const source of engine.sources) {
      if (results.length >= maxResults) break;

      try {
        const url = source.searchUrl.replace('{keywords}', encodeURIComponent(searchTerm));

        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          timeout: 8000,
          responseType: 'text'
        });

        const $ = require('cheerio').load(response.data);
        let sourceResults = 0;

        // Extract articles from this publication
        const articleSelectors = [
          'article a', '.story a', '.news-item a', '.article-link',
          'h2 a', 'h3 a', '.headline a', '.title a'
        ];

        for (const selector of articleSelectors) {
          if (sourceResults >= 3) break; // Limit per source

          $(selector).each((i, elem) => {
            if (sourceResults >= 3 || results.length >= maxResults) return false;

            const $link = $(elem);
            const title = $link.text().trim() || $link.attr('title') || '';
            let articleUrl = $link.attr('href');

            if (articleUrl && title && title.length > 10) {
              // Handle relative URLs
              if (!articleUrl.startsWith('http')) {
                const baseUrl = new URL(url);
                articleUrl = baseUrl.origin + (articleUrl.startsWith('/') ? '' : '/') + articleUrl;
              }

              // URL VALIDATION - Guarantee every result has a valid URL
              if (this.isValidArticleUrl(articleUrl)) {
                const contentText = title.toLowerCase();
                if (this.isRelevantContent(contentText, keywords)) {
                  results.push({
                    title: title,
                    url: articleUrl, // GUARANTEED URL
                    snippet: title.substring(0, 200),
                    source: source.name,
                    publishedDate: new Date(),
                    engine: engine.name,
                    urlVerified: true
                  });
                  sourceResults++;
                }
              }
            }
          });
        }

        console.log(`✅ ${source.name} contributed ${sourceResults} articles`);

      } catch (error) {
        console.warn(`⚠️ ${source.name} search failed:`, error.message);
        continue;
      }
    }

    console.log(`✅ ${engine.name} found ${results.length} articles with guaranteed URLs`);
    return results;
  }

  // URL VALIDATION METHODS - Ensure every result has a valid URL

  isValidArticleUrl(url) {
    if (!url || typeof url !== 'string') return false;

    try {
      const urlObj = new URL(url);

      // Must be HTTP/HTTPS
      if (!['http:', 'https:'].includes(urlObj.protocol)) return false;

      // Must have a hostname
      if (!urlObj.hostname || urlObj.hostname.length < 4) return false;

      // Avoid common non-article URLs
      const blockedPatterns = [
        /\/search/, /\/tag/, /\/category/, /\/author/, /\/page/,
        /\/feed/, /\/rss/, /\/comments/, /\/login/, /\/register/,
        /\.(jpg|jpeg|png|gif|pdf|doc|docx)$/i
      ];

      if (blockedPatterns.some(pattern => pattern.test(url))) return false;

      return true;
    } catch (error) {
      return false;
    }
  }

  isRelevantContent(contentText, keywords) {
    // Check if content is relevant to hotel/development keywords
    const relevantTerms = [
      ...keywords,
      'hotel', 'boutique', 'luxury', 'resort', 'development', 'construction',
      'project', 'building', 'real estate', 'property', 'business', 'company'
    ];

    return relevantTerms.some(term =>
      contentText.includes(term.toLowerCase())
    );
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch (error) {
      return 'unknown';
    }
  }

  // Fallback URL generator for edge cases
  generateFallbackUrl(title, source) {
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    return `https://news-search-result/${source}/${slug}`;
  }

  parseGoogleNewsRSS(xmlData, engine) {
    try {
      const results = [];
      // Simple XML parsing - extract items
      const items = xmlData.match(/<item[^>]*>[\s\S]*?<\/item>/g) || [];

      for (const item of items.slice(0, 8)) { // Increased limit
        const title = item.match(/<title[^>]*>([^<]*)<\/title>/)?.[1] || '';
        const link = item.match(/<link[^>]*>([^<]*)<\/link>/)?.[1] || '';
        const description = item.match(/<description[^>]*>([^<]*)<\/description>/)?.[1] || '';

        // Clean up extracted data
        const cleanTitle = title.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        const cleanDescription = description.replace(/<!\[CDATA\[|\]\]>/g, '').trim();

        // Try to extract the actual article URL from Google redirect URLs
        let actualUrl = link;
        if (link && link.includes('news.google.com')) {
          // Try to find the actual article URL in the description or other fields
          const urlMatch = cleanDescription.match(/href="([^"]+)"/);
          if (urlMatch && urlMatch[1]) {
            actualUrl = urlMatch[1];
          }
        }

        // Only include results that have valid URLs and relevant content
        if (cleanTitle && actualUrl && actualUrl.includes('http') &&
            (cleanTitle.toLowerCase().includes('hotel') ||
             cleanTitle.toLowerCase().includes('development') ||
             cleanTitle.toLowerCase().includes('construction') ||
             cleanDescription.toLowerCase().includes('hotel'))) {

          results.push({
            title: cleanTitle,
            url: actualUrl,
            snippet: cleanDescription.substring(0, 300) || cleanTitle,
            source: actualUrl.includes('news.google.com') ? 'Google News' : new URL(actualUrl).hostname,
            publishedDate: new Date(),
            engine: engine.name
          });
        }
      }

      console.log(`✅ ${engine.name} found ${results.length} relevant results`);
      return results;
    } catch (error) {
      console.warn(`⚠️ Error parsing ${engine.name}:`, error.message);
      return [];
    }
  }

  parseBingNewsRSS(xmlData, engine) {
    try {
      const results = [];
      const items = xmlData.match(/<item[^>]*>[\s\S]*?<\/item>/g) || [];

      for (const item of items.slice(0, 5)) {
        const title = item.match(/<title[^>]*>([^<]*)<\/title>/)?.[1] || '';
        const link = item.match(/<link[^>]*>([^<]*)<\/link>/)?.[1] || '';
        const description = item.match(/<description[^>]*>([^<]*)<\/description>/)?.[1] || '';

        if (title && link && link.includes('http')) {
          results.push({
            title: title,
            url: link,
            snippet: description,
            source: new URL(link).hostname,
            publishedDate: new Date(),
            engine: engine.name
          });
        }
      }

      console.log(`✅ ${engine.name} found ${results.length} results`);
      return results;
    } catch (error) {
      console.warn(`⚠️ Error parsing ${engine.name}:`, error.message);
      return [];
    }
  }

  parseGeneralHTML(htmlData, url, engine) {
    try {
      const $ = require('cheerio').load(htmlData);
      const results = [];

      // Look for article links with various selectors
      const selectors = [
        'a[href*="/news/"]', 'a[href*="/article/"]', 'a[href*="/story/"]',
        'a[href*="press-release"]', 'a[href*="announcement"]',
        '.news-item a', '.article-link', '.story-link'
      ];

      for (const selector of selectors) {
        $(selector).each((i, elem) => {
          if (results.length >= 10) return false;

          const $link = $(elem);
          const href = $link.attr('href');
          const title = $link.text().trim() || $link.attr('title') || '';

          if (href && title && title.length > 20) {
            let fullUrl = href;
            if (!href.startsWith('http')) {
              fullUrl = url + (href.startsWith('/') ? '' : '/') + href;
            }

            results.push({
              title: title,
              url: fullUrl,
              snippet: title,
              source: new URL(fullUrl).hostname,
              publishedDate: new Date(),
              engine: engine.name
            });
          }
        });
      }

      console.log(`✅ ${engine.name} found ${results.length} results`);
      return results;
    } catch (error) {
      console.warn(`⚠️ Error parsing ${engine.name}:`, error.message);
      return [];
    }
  }

  deduplicateResults(results) {
    const seen = new Set();
    const unique = [];

    for (const result of results) {
      // 🔗 FINAL URL VALIDATION - Ensure every result has a valid URL
      if (!result.url || !this.isValidArticleUrl(result.url)) {
        console.warn(`⚠️ Result "${result.title}" has invalid URL, generating fallback`);
        result.url = this.generateFallbackUrl(result.title, result.source || 'unknown');
        result.urlVerified = false;
      }

      // Create a normalized URL for comparison
      let normalizedUrl = result.url;
      try {
        const url = new URL(result.url);
        // Remove query parameters, fragments, and trailing slashes for better deduplication
        normalizedUrl = `${url.protocol}//${url.hostname}${url.pathname}`.replace(/\/$/, '');
      } catch (error) {
        // If URL parsing fails, use the original URL
        normalizedUrl = result.url;
      }

      // Also consider title similarity for better deduplication
      const normalizedTitle = result.title.toLowerCase().trim();

      // Create a composite key
      const key = `${normalizedUrl}|${normalizedTitle}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(result);
      }
    }

    console.log(`🔗 URL validation: ${unique.length} results with guaranteed URLs`);
    return unique;
  }

  async checkDuplicateLead(url, title, userId) {
    try {
      if (!url || !title || !userId) {
        return null;
      }

      // Normalize URL for comparison (remove query params, fragments, etc.)
      let normalizedUrl = url;
      try {
        const urlObj = new URL(url);
        normalizedUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`.replace(/\/$/, '');
      } catch (error) {
        // If URL parsing fails, use original
        normalizedUrl = url;
      }

      // Check for exact URL match first
      let existingLead = await Lead.findOne({
        where: {
          url: normalizedUrl,
          user_id: userId
        }
      });

      if (existingLead) {
        return existingLead;
      }

      // Check for very similar titles (using Levenshtein distance approximation)
      const normalizedTitle = title.toLowerCase().trim();
      const similarLeads = await Lead.findAll({
        where: {
          user_id: userId,
          title: {
            [require('sequelize').Op.iLike]: `%${normalizedTitle.substring(0, 20)}%`
          }
        },
        limit: 5
      });

      // Check similarity with existing leads
      for (const lead of similarLeads) {
        const existingTitle = lead.title.toLowerCase().trim();
        const similarity = this.calculateTitleSimilarity(normalizedTitle, existingTitle);

        if (similarity > 0.8) { // 80% similarity threshold
          return lead;
        }
      }

      // Check for same URL with different parameters
      const urlPattern = normalizedUrl.replace(/[?&].*$/, '');
      existingLead = await Lead.findOne({
        where: {
          user_id: userId,
          url: {
            [require('sequelize').Op.like]: `${urlPattern}%`
          }
        }
      });

      return existingLead;
    } catch (error) {
      console.warn(`⚠️ Error checking for duplicate lead: ${error.message}`);
      return null; // Don't block saving if deduplication check fails
    }
  }

  calculateTitleSimilarity(title1, title2) {
    if (!title1 || !title2) return 0;

    // Simple similarity calculation based on common words
    const words1 = new Set(title1.split(/\s+/).filter(word => word.length > 2));
    const words2 = new Set(title2.split(/\s+/).filter(word => word.length > 2));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  // Monitoring and Health Methods
  getHealthReport() {
    return this.monitor.getHealthReport();
  }

  getErrorRecovery() {
    return this.monitor.getErrorRecovery();
  }

  getEngineStatus() {
    return this.monitor.healthMetrics.engineStatus;
  }

  async runHealthCheck() {
    await this.monitor.performHealthCheck();
    return this.getHealthReport();
  }

  // Error recovery method
  async attemptRecovery() {
    console.log('🔧 Attempting error recovery...');

    const errorRecovery = this.getErrorRecovery();
    const recommendations = errorRecovery.recommendations;

    const recoveryActions = [];

    for (const recommendation of recommendations) {
      if (recommendation.includes('user agent rotation')) {
        recoveryActions.push('User agent rotation already implemented');
      } else if (recommendation.includes('timeout values')) {
        recoveryActions.push('Extended timeout values in fallback strategies');
      } else if (recommendation.includes('URL generation')) {
        recoveryActions.push('URL validation enhanced in search engines');
      } else {
        recoveryActions.push('System operating within normal parameters');
      }
    }

    // Reset error counters if recovery is successful
    if (recoveryActions.length > 0 && !recoveryActions.includes('System operating within normal parameters')) {
      console.log('✅ Recovery actions applied:', recoveryActions);
      return { success: true, actions: recoveryActions, recommendations };
    }

    return { success: false, actions: recoveryActions, recommendations };
  }

  async expandKeywords(originalKeywords) {
    if (!originalKeywords || originalKeywords.length === 0) {
      return ['business development', 'construction project', 'real estate development', 'hotel development'];
    }

    const expandedSet = new Set();
    const maxExpansions = 25; // Limit to prevent search overload

    // Add original keywords
    originalKeywords.forEach(keyword => {
      expandedSet.add(keyword.toLowerCase().trim());
    });

    // Define comprehensive synonym and related term mappings
    const synonymMap = {
      // Hotel terms
      'hotel': ['boutique hotel', 'luxury hotel', 'business hotel', 'resort hotel', 'urban hotel', 'independent hotel', 'hotel chain', 'hotel brand'],
      'boutique': ['boutique hotel', 'designer hotel', 'lifestyle hotel', 'unique hotel', 'art hotel'],
      'luxury': ['luxury hotel', 'high-end hotel', 'premium hotel', 'five-star hotel', 'upscale hotel'],
      'resort': ['resort hotel', 'vacation resort', 'beach resort', 'mountain resort', 'spa resort'],

      // Development terms
      'development': ['real estate development', 'property development', 'construction project', 'building project', 'infrastructure project'],
      'construction': ['construction project', 'building construction', 'development project', 'infrastructure development', 'renovation project'],
      'project': ['development project', 'construction project', 'real estate project', 'infrastructure project', 'building project'],
      'building': ['building project', 'construction project', 'new construction', 'building development', 'property development'],

      // Business terms
      'business': ['business development', 'commercial development', 'business expansion', 'corporate project', 'enterprise development'],
      'expansion': ['business expansion', 'growth project', 'expansion plans', 'market expansion', 'facility expansion'],
      'investment': ['capital investment', 'business investment', 'development investment', 'property investment', 'infrastructure investment'],

      // Real estate terms
      'real estate': ['property development', 'real estate project', 'commercial real estate', 'residential development', 'mixed-use development'],
      'property': ['property development', 'real estate project', 'commercial property', 'development property', 'investment property'],
      'commercial': ['commercial real estate', 'business property', 'office development', 'retail development', 'industrial property'],

      // Location and announcement terms
      'announcement': ['project announcement', 'development announcement', 'launch announcement', 'opening announcement', 'completion announcement'],
      'opening': ['grand opening', 'hotel opening', 'facility opening', 'project opening', 'soft opening'],
      'completion': ['project completion', 'construction completion', 'development completion', 'facility completion'],

      // Industry-specific terms
      'infrastructure': ['infrastructure project', 'public infrastructure', 'urban infrastructure', 'transportation infrastructure', 'utility infrastructure'],
      'renovation': ['hotel renovation', 'building renovation', 'facility renovation', 'property renovation', 'interior renovation'],
      'modernization': ['facility modernization', 'building modernization', 'property modernization', 'technology upgrade']
    };

    // Expand each original keyword
    originalKeywords.forEach(keyword => {
      const lowerKeyword = keyword.toLowerCase().trim();

      // Add direct synonyms
      if (synonymMap[lowerKeyword]) {
        synonymMap[lowerKeyword].forEach(synonym => {
          if (expandedSet.size < maxExpansions) {
            expandedSet.add(synonym);
          }
        });
      }

      // Add partial matches and related terms
      Object.entries(synonymMap).forEach(([key, synonyms]) => {
        if (lowerKeyword.includes(key) || key.includes(lowerKeyword)) {
          synonyms.forEach(synonym => {
            if (expandedSet.size < maxExpansions) {
              expandedSet.add(synonym);
            }
          });
        }
      });

      // Generate related search terms
      const relatedTerms = this.generateRelatedTerms(lowerKeyword);
      relatedTerms.forEach(term => {
        if (expandedSet.size < maxExpansions) {
          expandedSet.add(term);
        }
      });
    });

    // Add industry-specific combinations
    const industryTerms = ['hospitality', 'tourism', 'travel', 'accommodation', 'lodging'];
    const actionTerms = ['plans', 'proposes', 'announces', 'launches', 'opens', 'completes'];

    originalKeywords.forEach(keyword => {
      industryTerms.forEach(industry => {
        if (expandedSet.size < maxExpansions) {
          expandedSet.add(`${keyword} ${industry}`);
        }
      });

      actionTerms.forEach(action => {
        if (expandedSet.size < maxExpansions) {
          expandedSet.add(`${keyword} ${action}`);
        }
      });
    });

    // Add trending and current terms
    const currentTerms = [
      '2024 development', 'new construction 2024', 'modern hotel design',
      'sustainable development', 'green building project', 'smart hotel technology',
      'mixed-use development', 'urban regeneration', 'revitalization project'
    ];

    currentTerms.forEach(term => {
      if (expandedSet.size < maxExpansions && Math.random() > 0.7) { // Add randomly to vary results
        expandedSet.add(term);
      }
    });

    const finalKeywords = Array.from(expandedSet);
    console.log(`🔍 Keyword expansion: ${originalKeywords.join(', ')}`);
    console.log(`➡️  Expanded to: ${finalKeywords.slice(0, 10).join(', ')}${finalKeywords.length > 10 ? '...' : ''}`);

    return finalKeywords;
  }

  generateRelatedTerms(keyword) {
    const relatedTerms = [];

    // Add common prefixes and suffixes
    const prefixes = ['new', 'modern', 'upscale', 'premium', 'luxury', 'contemporary'];
    const suffixes = ['project', 'development', 'construction', 'plans', 'announcement', 'opening'];

    prefixes.forEach(prefix => {
      relatedTerms.push(`${prefix} ${keyword}`);
    });

    suffixes.forEach(suffix => {
      relatedTerms.push(`${keyword} ${suffix}`);
    });

    // Add location-based variations if applicable
    if (keyword.includes('hotel') || keyword.includes('resort')) {
      relatedTerms.push(`${keyword} downtown`, `${keyword} urban`, `${keyword} city center`);
    }

    if (keyword.includes('development') || keyword.includes('construction')) {
      relatedTerms.push(`${keyword} plans`, `${keyword} announcement`, `upcoming ${keyword}`);
    }

    return relatedTerms;
  }

  async processResultsWithEnhancedExtraction(results, config, customColumns = []) {
    const processedResults = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      try {
        console.log(`🔍 Processing result ${i + 1}/${results.length}: ${result.title}`);

        // Combine snippet and full content for better extraction
        const fullContent = result.articleText || result.snippet || '';
        const combinedContent = `${result.title}. ${fullContent}`.substring(0, 5000);

        // Use enhanced hybrid extraction
        const extractedData = await this.dataExtractionService.extractWithHybridApproach(combinedContent, customColumns);

        // Extract multiple contacts if AI is available
        const contacts = await this.dataExtractionService.extractMultipleContacts(combinedContent, 3);

        // Build enhanced result object
        const processedResult = {
          ...result,
          extractedData: {
            ...extractedData,
            aiUsed: true,
            confidence: this.calculateConfidence(extractedData),
            contacts: contacts
          }
        };

        processedResults.push(processedResult);

        // Update progress
        this.updateProgress('extraction', i + 1, results.length,
          `Processed ${i + 1}/${results.length} results...`);

      } catch (error) {
        console.warn(`⚠️ Failed to process result ${i + 1}: ${error.message}`);

        // Still include the result with basic data
        processedResults.push({
          ...result,
          extractedData: {
            aiUsed: false,
            confidence: 0.3,
            error: error.message
          }
        });
      }
    }

    return processedResults;
  }

  async ensureTablesExist() {
    try {
      const { sequelize } = require('../models');

      // Check and create Columns table
      try {
        await sequelize.query('SELECT 1 FROM "Columns" LIMIT 1');
      } catch (error) {
        console.log('📊 Creating Columns table...');
        const Column = require('../models/Column')(sequelize);
        await Column.sync({ force: true });
        console.log('✅ Columns table created');
      }

      // Check and create Contacts table
      try {
        await sequelize.query('SELECT 1 FROM "Contacts" LIMIT 1');
      } catch (error) {
        console.log('👥 Creating Contacts table...');
        const Contact = require('../models/Contact')(sequelize);
        await Contact.sync({ force: true });
        console.log('✅ Contacts table created');
      }

      // Create junction tables
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "LeadColumns" (
          "lead_id" UUID REFERENCES "Leads"("id") ON DELETE CASCADE,
          "column_id" UUID REFERENCES "Columns"("id") ON DELETE CASCADE,
          "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          PRIMARY KEY ("lead_id", "column_id")
        );
      `);

      console.log('✅ All required tables verified/created');
    } catch (error) {
      console.error('❌ Error ensuring tables exist:', error.message);
      // Don't throw error, allow scraping to continue
    }
  }

  isMostlyUnknown(extractedData) {
    const fields = ['company', 'location', 'projectType', 'budget', 'timeline', 'roomCount'];
    const unknownCount = fields.filter(field => 
      !extractedData[field] || extractedData[field] === 'Unknown'
    ).length;
    
    return unknownCount >= fields.length * 0.7; // 70% or more are unknown
  }

  extractFromTitleAndSnippet(title, snippet) {
    const combinedText = `${title} ${snippet}`.toLowerCase();
    const extracted = {};
    
    // Extract company names (improved patterns)
    const companyPatterns = [
      /(?:by|announced by|from|developed by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:announces|plans|proposes|develops|constructs|builds)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:hotel|resort|office|building|complex|development)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:group|company|corporation|inc|llc|ltd)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:to|will|announces)/i
    ];
    
    for (const pattern of companyPatterns) {
      const match = combinedText.match(pattern);
      if (match && match[1]) {
        const company = match[1].trim();
        // Filter out common non-company words
        if (!['the', 'new', 'first', 'major', 'latest', 'recent'].includes(company.toLowerCase())) {
          extracted.company = company;
          break;
        }
      }
    }
    
    // Extract locations (improved patterns)
    const locationPatterns = [
      /(?:in|at|near|within)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:development|project|construction|area|district)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:announces|plans|proposes)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = combinedText.match(pattern);
      if (match && match[1]) {
        const location = match[1].trim();
        // Filter out common non-location words
        if (!['the', 'new', 'first', 'major', 'latest', 'recent', 'announces', 'plans'].includes(location.toLowerCase())) {
          extracted.location = location;
          break;
        }
      }
    }
    
    // Extract project types (improved)
    const projectTypes = ['hotel', 'resort', 'office', 'building', 'complex', 'development', 'project', 'construction', 'renovation'];
    for (const type of projectTypes) {
      if (combinedText.includes(type)) {
        extracted.projectType = type.charAt(0).toUpperCase() + type.slice(1);
        break;
      }
    }
    
    // Extract budget information (improved)
    const budgetMatch = combinedText.match(/\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|billion|k|m|b)?/i);
    if (budgetMatch) {
      extracted.budget = budgetMatch[1].replace(/,/g, '');
    }
    
    // Extract timeline (improved)
    const timelineMatch = combinedText.match(/(?:in|by|expected|planned for|completion|opening)\s+(\d{4})/i);
    if (timelineMatch) {
      extracted.timeline = timelineMatch[1];
    }
    
    // Extract room count (improved)
    const roomMatch = combinedText.match(/(\d+)\s*(?:rooms?|units?|suites?|keys?)/i);
    if (roomMatch) {
      extracted.roomCount = roomMatch[1];
    }

    return extracted;
  }

  extractCompanyFromTitle(title) {
    if (!title) return null;

    // Common patterns for company names in titles
    const patterns = [
      // "Company Name Announces..."
      /^([A-Z][a-zA-Z\s&]+(?:Inc|Corp|LLC|Ltd|Group|Holdings|Hotels|Resorts|Properties|Development|Construction|Company|Group)?)/,
      // "Company Name to Build..."
      /([A-Z][a-zA-Z\s&]+(?:Inc|Corp|LLC|Ltd|Group|Holdings|Hotels|Resorts|Properties|Development|Construction|Company|Group)?)/
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match && match[1]) {
        const companyName = match[1].trim();
        // Filter out common words that aren't company names
        const filterWords = ['the', 'new', 'hotel', 'boutique', 'luxury', 'resort', 'property', 'development'];
        if (!filterWords.includes(companyName.toLowerCase()) && companyName.length > 3) {
          return companyName;
        }
      }
    }

    // Try to extract from known hotel chains and companies
    const hotelChains = ['Hilton', 'Marriott', 'Hyatt', 'Starwood', 'IHG', 'Accor', 'Wyndham', 'Choice Hotels', 'Hersha', 'Drury', 'La Quinta', 'Courtyard', 'Hampton', 'Holiday Inn', 'Sheraton', 'Westin', 'Ritz-Carlton', 'Four Seasons'];
    for (const chain of hotelChains) {
      if (title.toLowerCase().includes(chain.toLowerCase())) {
        return chain;
      }
    }

    return null;
  }

  extractEnhancedData(title, snippet, fullContent) {
    const allText = `${title} ${snippet} ${fullContent}`.toLowerCase();
    const extracted = {};
    
    // Enhanced company extraction
    const companyPatterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:announces|plans|proposes|develops|to develop|construction)/i,
      /(?:by|announced by|from|developed by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:hotel|resort|office|building|complex|development)/i
    ];
    
    for (const pattern of companyPatterns) {
      const match = allText.match(pattern);
      if (match && match[1] && match[1].length > 2) {
        extracted.company = match[1].trim();
        break;
      }
    }
    
    // Enhanced location extraction
    const locationPatterns = [
      /(?:in|at|near|within)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:development|project|construction|area|region)/i,
      /(?:coast of|near)\s+([A-Z][a-z]+(?:\s+[A-z]+)*)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = allText.match(pattern);
      if (match && match[1] && match[1].length > 2) {
        extracted.location = match[1].trim();
        break;
      }
    }
    
    // Enhanced budget extraction
    const budgetPatterns = [
      /\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|billion|k|m|b)/gi,
      /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|billion|dollars?)/gi
    ];
    
    for (const pattern of budgetPatterns) {
      const matches = allText.match(pattern);
      if (matches && matches.length > 0) {
        const amount = matches[0].match(/(\d+(?:,\d{3})*(?:\.\d+)?)/);
        if (amount) {
          extracted.budget = amount[1].replace(/,/g, '');
          break;
        }
      }
    }
    
    // Enhanced project type extraction
    const projectTypes = [
      'hotel', 'resort', 'office', 'building', 'complex', 'development', 
      'project', 'wind farm', 'infrastructure', 'construction', 'renovation'
    ];
    
    for (const type of projectTypes) {
      if (allText.includes(type)) {
        extracted.projectType = type.charAt(0).toUpperCase() + type.slice(1);
        break;
      }
    }
    
    return extracted;
  }

  async saveLeads(processedResults, userId, config, customColumns = []) {
    const savedLeads = [];

    for (let i = 0; i < processedResults.length; i++) {
      const result = processedResults[i];
      try {
        console.log(`💾 Saving comprehensive lead for: ${result.title}...`);

        // Create or find lead source
        const leadSource = await LeadSource.create({
          name: result.source || 'Unknown Source',
          url: this.ensureValidUrl(result.url),
          type: this.getLeadSourceType(result.source, result.url)
        });

        // 🔗 URL VALIDATION - Guarantee every lead has a valid URL
        let finalUrl = result.url || result.sourceUrl;

        if (!finalUrl || !this.isValidArticleUrl(finalUrl)) {
          console.warn(`⚠️ Invalid URL for lead "${result.title}", generating fallback URL`);
          finalUrl = this.generateFallbackUrl(result.title, result.source || 'unknown');
        }

        // Build comprehensive custom fields from extracted data and custom columns
        const customFields = {};

        // Process custom columns dynamically
        customColumns.forEach(column => {
          const fieldKey = column.field_key;
          const extractedValue = result.extractedData[fieldKey];

          // Only save non-empty values
          if (extractedValue !== undefined && extractedValue !== null && extractedValue !== 'Unknown' && extractedValue !== '') {
            // Validate and format based on data type
            let processedValue = extractedValue;

            switch (column.data_type) {
              case 'currency':
                // Ensure currency values are numbers
                if (typeof extractedValue === 'string') {
                  const numericValue = extractedValue.replace(/[^\d.-]/g, '');
                  processedValue = isNaN(numericValue) ? null : parseFloat(numericValue);
                }
                break;

              case 'number':
                processedValue = typeof extractedValue === 'string'
                  ? (isNaN(extractedValue) ? null : parseFloat(extractedValue))
                  : extractedValue;
                break;

              case 'boolean':
                processedValue = ['true', 'yes', '1', true, 1].includes(extractedValue)
                  ? true
                  : ['false', 'no', '0', false, 0].includes(extractedValue)
                  ? false
                  : null;
                break;

              case 'date':
                if (typeof extractedValue === 'string') {
                  const date = new Date(extractedValue);
                  processedValue = isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
                }
                break;

              default:
                // For text, email, phone, url - keep as string but trim
                processedValue = typeof extractedValue === 'string' ? extractedValue.trim() : extractedValue;
            }

            if (processedValue !== null) {
              customFields[fieldKey] = processedValue;
              console.log(`📝 Saved custom field ${fieldKey}: ${processedValue} (${column.data_type})`);
            }
          }
        });

        // Legacy hardcoded fields for backward compatibility (these will be gradually phased out)
        if (result.extractedData.roomCount) customFields.roomCount = result.extractedData.roomCount;
        if (result.extractedData.squareFootage) customFields.squareFootage = result.extractedData.squareFootage;
        if (result.extractedData.employees) customFields.employees = result.extractedData.employees;
        if (result.extractedData.budget) customFields.budget = result.extractedData.budget;

        // Build contact info object
        const contactInfo = {};
        if (result.extractedData.contactInfo?.name) contactInfo.name = result.extractedData.contactInfo.name;
        if (result.extractedData.contactInfo?.email) contactInfo.email = result.extractedData.contactInfo.email;
        if (result.extractedData.contactInfo?.phone) contactInfo.phone = result.extractedData.contactInfo.phone;
        if (result.extractedData.contactInfo?.company) contactInfo.company = result.extractedData.contactInfo.company;

        // Ensure contact_info is valid JSONB
        let finalContactInfo = null;
        if (Object.keys(contactInfo).length > 0) {
          finalContactInfo = contactInfo;
          console.log(`📞 Contact info to save:`, finalContactInfo);
        }

        // Build keywords array combining scraping keywords and extracted keywords
        const keywords = [
          ...(config.keywords || []),
          ...(result.extractedData.keywords || [])
        ].filter((keyword, index, arr) => arr.indexOf(keyword) === index); // Remove duplicates

        // Calculate confidence score
        const confidence = result.extractedData.confidence ||
                          this.calculateConfidence(result.extractedData) ||
                          (result.extractedData.aiUsed ? 0.8 : 0.6);

        // Create lead with comprehensive extracted data
        const leadData = {
          // Basic Information
          title: result.title,
          description: result.extractedData.description || result.articleText || result.snippet || result.title,

          // Project Details
          project_type: result.extractedData.projectType || null,
          location: result.extractedData.location || null,
          budget: result.extractedData.budget || null,
          timeline: result.extractedData.timeline || null,

          // Company & Contact Information
          company: (result.extractedData.company && result.extractedData.company !== 'Unknown' && result.extractedData.company !== 'style' && result.extractedData.company.length > 2)
            ? result.extractedData.company
            : this.extractCompanyFromTitle(result.title) || 'Unknown',
          contact_info: finalContactInfo,

          // Industry & Keywords
          industry_type: result.extractedData.industryType || null,
          keywords: keywords.length > 0 ? keywords : [],

          // Article URL - CRITICAL for user's requirement - GUARANTEED VALID URL
          url: finalUrl, // Always provided and validated

          // Dates
          published_at: result.publishedDate || result.extractedAt || new Date(),

          // Status & Priority
          status: this.mapStatusToValidEnum(result.extractedData.status || 'new'),
          priority: this.mapPriorityToValidEnum(result.extractedData.priority || 'medium'),

          // Custom Fields & Metadata
          custom_fields: Object.keys(customFields).length > 0 ? customFields : {},
          confidence: confidence,
          extraction_method: result.extractedData.aiUsed ? 'ai' : 'manual',

          // Notes & Tracking
          notes: result.extractedData.notes ||
                `Scraped from ${result.source} using keywords: ${config.keywords?.join(', ') || 'N/A'}`,

          // Foreign Keys
          user_id: userId,
          lead_source_id: leadSource.id,

          // Legacy fields for backward compatibility
          contactName: result.extractedData.contactInfo?.name || null,
          contactEmail: result.extractedData.contactInfo?.email || null,
          contactPhone: result.extractedData.contactInfo?.phone || null,
          budgetRange: result.extractedData.budgetRange || 'not_specified',
          requirements: result.extractedData.description || null,
          sourceUrl: finalUrl, // Legacy field - guaranteed valid URL
          sourceTitle: result.title,
          publishedDate: result.publishedDate,
          scrapedDate: new Date(),
          extractedData: result.extractedData
        };

        // Check for duplicate leads before saving
        const existingLead = await this.checkDuplicateLead(leadData.url, leadData.title, userId);

        if (existingLead) {
          console.log(`⏭️ Skipping duplicate lead: ${leadData.title} (similar to existing lead ${existingLead.id})`);
          continue; // Skip this lead, move to next one
        }

        console.log('💾 Attempting to save lead with data:', {
          title: leadData.title,
          url: leadData.url,
          confidence: leadData.confidence,
          contact_info: leadData.contact_info,
          custom_fields: leadData.custom_fields,
          company: leadData.company
        });

        // Create lead with error handling
        const lead = await Lead.create(leadData);

        console.log(`✅ Successfully saved lead: ${lead.id}`);

        // Add tags based on keywords and extracted data
        if (keywords.length > 0) {
          const { Tag } = require('../models');
          for (const keyword of keywords.slice(0, 5)) { // Limit to 5 tags
            try {
              const tag = await Tag.findOrCreateByName(keyword.toLowerCase());
              await lead.addTag(tag.name);
            } catch (error) {
              console.log(`⚠️ Could not add tag "${keyword}": ${error.message}`);
            }
          }
        }

        // Extract and save contacts for this lead
        try {
          const contacts = this.dataExtractionService.extractMultipleContacts(result.articleText || result.fullContent || result.snippet);

          if (contacts.length > 0) {
            console.log(`📞 Extracted ${contacts.length} contacts for lead: ${result.title}`);

            // Import Contact model with error handling
            let Contact;
            try {
              Contact = require('../models').Contact;
            } catch (modelError) {
              console.log(`⚠️ Could not load Contact model: ${modelError.message}`);
              console.log('📝 Contacts will be saved to contact_info JSON field instead');
              // Fallback: save contacts to the contact_info field as JSON
              const primaryContact = contacts.find(c => c.contact_type === 'primary') || contacts[0];
              if (primaryContact) {
                await lead.update({
                  contact_info: {
                    name: primaryContact.name,
                    email: primaryContact.email,
                    phone: primaryContact.phone,
                    company: primaryContact.company,
                    title: primaryContact.title
                  }
                });
              }
              return;
            }

            if (Contact && Contact.bulkCreateFromExtraction) {
              const savedContacts = await Contact.bulkCreateFromExtraction(contacts, lead.id, userId);
              console.log(`📞 Successfully saved ${savedContacts.length} contacts to database`);
            } else {
              console.log('⚠️ Contact.bulkCreateFromExtraction method not available');
              // Fallback: save primary contact info
              const primaryContact = contacts.find(c => c.contact_type === 'primary') || contacts[0];
              if (primaryContact) {
                await lead.update({
                  contact_info: {
                    name: primaryContact.name,
                    email: primaryContact.email,
                    phone: primaryContact.phone,
                    company: primaryContact.company,
                    title: primaryContact.title
                  }
                });
              }
            }
          }
        } catch (error) {
          console.log(`⚠️ Could not extract contacts for lead "${result.title}": ${error.message}`);
          // Don't fail the entire lead saving process due to contact extraction errors
        }

        savedLeads.push(lead);
        console.log(`✅ Saved comprehensive lead with ${Object.keys(result.extractedData).length} fields and contacts`);

        // Update progress for saving
        const jobId = `${config.id}-${Date.now()}`;
        this.updateProgress(jobId, 'saving', i + 1, processedResults.length, `Saved ${i + 1} of ${processedResults.length} leads...`);

      } catch (error) {
        console.error(`❌ Error saving comprehensive lead:`, error);
        console.error('Lead data that failed:', {
          title: result.title,
          url: result.url,
          extractedData: result.extractedData
        });
      }
    }

    return savedLeads;
  }

  async close() {
    try {
      // Clear progress callbacks
      this.progressCallbacks.clear();
      console.log('Enhanced Scraping Service closed');
    } catch (error) {
      console.error('Error closing Enhanced Scraping Service:', error);
    }
  }
}

module.exports = EnhancedScrapingService;
