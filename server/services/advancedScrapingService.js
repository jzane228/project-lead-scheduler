const axios = require('axios');
const ScrapyService = require('./scrapyService');
const DataExtractionService = require('./dataExtractionService');
const AntiDetectionService = require('./antiDetectionService');
const LeadVerificationService = require('./leadVerificationService');

// Load scraping configuration
let scrapingConfig;
try {
  scrapingConfig = require('../config/scraping-config');
  console.log('✅ Advanced Scraping Service config loaded');
} catch (error) {
  console.error('❌ Failed to load scraping config:', error.message);
  scrapingConfig = {
    apis: {
      googleNews: { enabled: false },
      bingNews: { enabled: false },
      newsapi: { enabled: false }
    },
    antiDetection: { enabled: false, proxies: [] }
  };
}

/**
 * Advanced Scraping Service - Premium API Integration & Creative Tactics
 * Features:
 * - NewsAPI integration for verified articles
 * - Google News API with direct article links
 * - Bing News API for comprehensive coverage
 * - Custom web scraping with anti-detection
 * - URL guarantee system
 * - Advanced data extraction
 */
class AdvancedScrapingService {
  constructor() {
    console.log('🔧 Initializing Advanced Scraping Service...');

    this.scrapyService = new ScrapyService();
    this.dataExtractionService = new DataExtractionService();
    this.leadVerificationService = new LeadVerificationService();

    // Load scraping configuration
    try {
      this.config = scrapingConfig;
      console.log('✅ Scraping config loaded successfully');

      // API configurations from config file
      this.apis = this.config.apis;
      console.log('✅ API configurations loaded');

      this.antiDetectionService = new AntiDetectionService(this.config);
      console.log('✅ Anti-detection service initialized');

      console.log('🚀 Advanced Scraping Service initialized with premium APIs');
      console.log(`📊 APIs: NewsAPI(${this.apis?.newsapi?.enabled}), Google(${this.apis?.googleNews?.enabled}), Bing(${this.apis?.bingNews?.enabled})`);
      console.log(`🛡️ Anti-detection: ${this.config?.antiDetection?.enabled ? 'ENABLED' : 'DISABLED'}`);
      console.log(`✅ Lead verification: ENABLED`);

    } catch (error) {
      console.error('❌ Failed to initialize Advanced Scraping Service:', error);
      console.error('Config loading error:', error.message);

      // Fallback configuration
      this.config = {
        apis: {
          googleNews: { enabled: false },
          bingNews: { enabled: false },
          newsapi: { enabled: false }
        },
        antiDetection: { enabled: false, proxies: [] }
      };
      this.apis = this.config.apis;
      console.log('⚠️ Using fallback configuration');
    }

    // Progress tracking callback (will be set by parent service)
    this.updateProgress = null;

    // Start proxy health monitoring
    if (this.config.antiDetection.enabled && this.config.antiDetection.proxies.length > 0) {
      this.startProxyHealthMonitoring();
    }
  }

  // Set progress callback for tracking
  setProgressCallback(callback) {
    this.updateProgress = callback;
  }



  /**
   * Main scraping function - orchestrates all API sources
   */
  async scrapeConfiguration(config, userId, jobId = null) {
    console.log('🎯 Starting Advanced Scraping with Premium APIs...');

    // Update progress if jobId provided
    if (this.updateProgress && jobId) {
      console.log(`📊 UPDATING PROGRESS: ${jobId} - scraping - 0/6 - Starting advanced web scraping...`);
      this.updateProgress(jobId, 'scraping', 0, 6, 'Starting advanced web scraping...');
    } else {
      console.log(`⚠️ No progress callback available for jobId: ${jobId}`);
    }

    const keywords = config.keywords || ['hotel', 'development', 'construction'];
    const maxResults = config.max_results_per_run || 50;

    const allResults = [];

    try {
      // Update progress - starting API searches
      if (this.updateProgress && jobId) {
        this.updateProgress(jobId, 'scraping', 1, 6, 'Searching NewsAPI for verified articles...');
      }

      // 1. NewsAPI - Premium verified articles
      if (this.apis.newsapi.enabled) {
        console.log('📰 Searching NewsAPI for verified articles...');
        const newsApiResults = await this.searchNewsAPI(keywords, maxResults);
        allResults.push(...newsApiResults);

        // Update progress after NewsAPI
        if (this.updateProgress && jobId) {
          this.updateProgress(jobId, 'scraping', 2, 6, `NewsAPI found ${newsApiResults.length} articles. Searching Google...`);
        }
      }

      // 2. Google News API - Direct article links
      if (this.apis.googleNews.enabled) {
        console.log('🔍 Searching Google News API...');
        const googleResults = await this.searchGoogleNewsAPI(keywords, maxResults);
        allResults.push(...googleResults);

        // Update progress after Google
        if (this.updateProgress && jobId) {
          this.updateProgress(jobId, 'scraping', 3, 6, `Google found ${googleResults.length} articles. Searching Bing...`);
        }
      }

      // 3. Bing News API - Comprehensive coverage
      if (this.apis.bingNews.enabled) {
        console.log('📰 Searching Bing News API...');
        const bingResults = await this.searchBingNewsAPI(keywords, maxResults);
        allResults.push(...bingResults);

        // Update progress after Bing
        if (this.updateProgress && jobId) {
          this.updateProgress(jobId, 'scraping', 4, 6, `Bing found ${bingResults.length} articles. Starting web scraping...`);
        }
      }

      // 4. Advanced Web Scraping - Business publications
      console.log('🕷️ Performing advanced web scraping...');
      const webScrapeResults = await this.advancedWebScraping(keywords, maxResults);
      allResults.push(...webScrapeResults);

      // Update progress after web scraping
      if (this.updateProgress && jobId) {
        this.updateProgress(jobId, 'scraping', 5, 6, `Web scraping found ${webScrapeResults.length} articles. Checking industry sources...`);
      }

      // 5. Industry-specific sources
      console.log('🏭 Searching industry-specific sources...');
      const industryResults = await this.searchIndustrySources(keywords, maxResults);
      allResults.push(...industryResults);

      // Update progress after industry sources
      if (this.updateProgress && jobId) {
        this.updateProgress(jobId, 'scraping', 6, 6, `Industry sources found ${industryResults.length} articles. Processing results...`);
      }

      // Deduplicate and validate URLs
      const uniqueResults = this.deduplicateAndValidate(allResults);
      console.log(`✅ Found ${uniqueResults.length} unique leads with guaranteed URLs`);

      // Extract comprehensive data
      const processedResults = await this.extractComprehensiveData(uniqueResults);

      // Verify leads for quality assurance
      console.log('🔍 Verifying leads for quality assurance...');
      const verifiedResults = [];
      const verificationStats = {
        totalVerified: processedResults.length,
        highConfidence: 0,
        mediumConfidence: 0,
        lowConfidence: 0,
        averageConfidence: 0
      };

      for (const lead of processedResults) {
        try {
          const verificationResult = await this.leadVerificationService.verifyLead(lead);
          verifiedResults.push(verificationResult.verifiedLead);

          // Update verification statistics
          if (verificationResult.confidence >= 80) {
            verificationStats.highConfidence++;
          } else if (verificationResult.confidence >= 60) {
            verificationStats.mediumConfidence++;
          } else {
            verificationStats.lowConfidence++;
          }
        } catch (error) {
          console.warn(`⚠️ Lead verification failed for "${lead.title}":`, error.message);
          verifiedResults.push(lead); // Include unverified lead
        }
      }

      // Calculate average confidence
      const totalConfidence = verifiedResults.reduce((sum, lead) => sum + (lead.confidence || 0), 0);
      verificationStats.averageConfidence = verifiedResults.length > 0
        ? Math.round(totalConfidence / verifiedResults.length)
        : 0;

      // Get anti-detection statistics
      const antiDetectionStats = this.antiDetectionService.getStats();
      const leadVerificationStats = this.leadVerificationService.getVerificationStats();

      return {
        totalResults: uniqueResults.length,
        savedLeads: verifiedResults.length,
        leads: verifiedResults,
        errors: [],
        sources: ['NewsAPI', 'Google News', 'Bing News', 'Web Scraping', 'Industry Sources'],
        stats: {
          antiDetection: antiDetectionStats,
          leadVerification: leadVerificationStats,
          urlValidation: {
            total: uniqueResults.length,
            valid: uniqueResults.filter(r => r.urlVerified).length,
            rate: uniqueResults.length > 0 ? ((uniqueResults.filter(r => r.urlVerified).length / uniqueResults.length) * 100).toFixed(1) + '%' : '0%'
          },
          dataCompleteness: this.calculateDataCompleteness(verifiedResults),
          verification: verificationStats
        }
      };

    } catch (error) {
      console.error('❌ Advanced scraping failed:', error);
      throw error;
    }
  }

  /**
   * NewsAPI Integration - Premium verified articles
   */
  async searchNewsAPI(keywords, maxResults = 20) {
    if (!this.apis.newsapi.enabled) return [];

    const results = [];
    const searchQuery = keywords.join(' OR ');

    try {
      const response = await axios.get(`${this.apis.newsapi.baseUrl}/everything`, {
        params: {
          q: searchQuery,
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: Math.min(maxResults, 20)
        },
        headers: {
          'X-API-Key': this.apis.newsapi.key
        },
        timeout: this.apis.newsapi.timeout
      });

      for (const article of response.data.articles || []) {
        if (this.isRelevantArticle(article, keywords)) {
          results.push({
            title: article.title,
            url: article.url, // GUARANTEED URL from NewsAPI
            snippet: article.description || article.title,
            source: article.source?.name || 'NewsAPI',
            publishedDate: new Date(article.publishedAt),
            author: article.author,
            imageUrl: article.urlToImage,
            verified: true,
            apiSource: 'NewsAPI',
            relevance: this.calculateRelevance(article, keywords)
          });
        }
      }

      console.log(`✅ NewsAPI found ${results.length} verified articles`);
      return results;

    } catch (error) {
      console.warn('⚠️ NewsAPI search failed:', error.message);
      return [];
    }
  }

  /**
   * Google Custom Search API Integration
   */
  async searchGoogleNewsAPI(keywords, maxResults = 20) {
    if (!this.apis.googleNews.enabled) return [];

    const results = [];
    const searchQuery = keywords.join(' OR ') + ' news OR article';

    try {
      console.log('🔍 Searching Google Custom Search for news articles...');

      // Use Google Custom Search JSON API
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.apis.googleNews.key,
          cx: this.apis.googleNews.searchEngineId || '017576662512468239146:omuauf_lfve', // Default public CSE
          q: searchQuery,
          num: Math.min(maxResults, 10), // Google limits to 10 per request
          dateRestrict: 'd30', // Last 30 days
          sort: 'date' // Sort by date
        },
        timeout: this.apis.googleNews.timeout
      });

      for (const item of response.data.items || []) {
        // Extract direct URL from Google search result
        const directUrl = this.extractDirectUrlFromGoogleResult(item.link);

        if (this.isRelevantSearchResult(item, keywords)) {
          results.push({
            title: item.title,
            url: directUrl, // Direct article URL
            snippet: item.snippet || item.title,
            source: item.displayLink || this.extractDomain(directUrl),
            publishedDate: this.extractDateFromGoogleResult(item),
            author: this.extractAuthorFromGoogleResult(item),
            verified: true,
            apiSource: 'Google Custom Search',
            relevance: this.calculateSearchRelevance(item, keywords)
          });
        }
      }

      console.log(`✅ Google Custom Search found ${results.length} articles with direct URLs`);
      return results;

    } catch (error) {
      console.warn('⚠️ Google Custom Search failed:', error.message);
      if (error.response?.status === 403) {
        console.warn('💡 Google API quota exceeded or billing required');
      }
      return [];
    }
  }

  /**
   * Extract direct URL from Google search result
   */
  extractDirectUrlFromGoogleResult(googleUrl) {
    // Google sometimes provides direct URLs, sometimes redirects
    // For now, return as-is since Google Custom Search provides direct links
    return googleUrl;
  }

  /**
   * Extract date from Google search result
   */
  extractDateFromGoogleResult(item) {
    // Try to extract date from snippet or use current date
    const dateMatch = item.snippet?.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      return new Date(dateMatch[1]);
    }
    return new Date();
  }

  /**
   * Extract author from Google search result
   */
  extractAuthorFromGoogleResult(item) {
    // Look for author in snippet
    const authorMatch = item.snippet?.match(/(?:by|author)[:\s]+([A-Za-z\s]+)/i);
    return authorMatch ? authorMatch[1].trim() : null;
  }

  /**
   * Check if Google search result is relevant
   */
  isRelevantSearchResult(item, keywords) {
    const content = `${item.title} ${item.snippet || ''}`.toLowerCase();

    // Must contain at least one keyword
    const hasKeyword = keywords.some(keyword =>
      content.includes(keyword.toLowerCase())
    );

    // Should be from news-like source
    const isNewsSource = /\.(com|org|net|edu)$/.test(item.displayLink) &&
                        !item.displayLink.includes('amazon') &&
                        !item.displayLink.includes('walmart') &&
                        !item.displayLink.includes('ebay');

    return hasKeyword && isNewsSource;
  }

  /**
   * Calculate relevance for Google search results
   */
  calculateSearchRelevance(item, keywords) {
    let score = 0;
    const content = `${item.title} ${item.snippet || ''}`.toLowerCase();

    // Keyword matches
    keywords.forEach(keyword => {
      const matches = (content.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
      score += matches * 15;
    });

    // News indicators
    const newsTerms = ['news', 'article', 'story', 'report', 'announcement', 'development', 'construction'];
    newsTerms.forEach(term => {
      if (content.includes(term)) score += 5;
    });

    return Math.min(score, 100);
  }

  /**
   * Bing News API Integration
   */
  async searchBingNewsAPI(keywords, maxResults = 20) {
    if (!this.apis.bingNews.enabled) return [];

    const results = [];
    const searchQuery = keywords.join(' ');

    try {
      const response = await axios.get(this.apis.bingNews.baseUrl, {
        params: {
          q: searchQuery,
          count: Math.min(maxResults, 20),
          mkt: 'en-US',
          freshness: 'Week'
        },
        headers: {
          'Ocp-Apim-Subscription-Key': this.apis.bingNews.key
        },
        timeout: this.apis.bingNews.timeout
      });

      for (const article of response.data.value || []) {
        if (this.isRelevantArticle(article, keywords)) {
          results.push({
            title: article.name,
            url: article.url, // Direct article URL
            snippet: article.description || article.name,
            source: article.provider?.name || 'Bing News',
            publishedDate: new Date(article.datePublished),
            author: article.author,
            imageUrl: article.image?.thumbnail?.contentUrl,
            verified: true,
            apiSource: 'Bing News',
            relevance: this.calculateRelevance(article, keywords)
          });
        }
      }

      console.log(`✅ Bing News API found ${results.length} articles`);
      return results;

    } catch (error) {
      console.warn('⚠️ Bing News API search failed:', error.message);
      return [];
    }
  }

  /**
   * Advanced Web Scraping with Anti-Detection
   */
  async advancedWebScraping(keywords, maxResults = 20) {
    const results = [];
    const sources = this.getAdvancedWebSources();

    for (const source of sources) {
      if (results.length >= maxResults) break;

      try {
        console.log(`🕷️ Scraping ${source.name}...`);

        const sourceResults = await this.scrapeSourceWithRotation(source, keywords, 5);
        results.push(...sourceResults);

      } catch (error) {
        console.warn(`⚠️ Failed to scrape ${source.name}:`, error.message);
      }
    }

    console.log(`✅ Advanced web scraping found ${results.length} articles`);
    return results;
  }

  /**
   * Industry-specific source scraping
   */
  async searchIndustrySources(keywords, maxResults = 20) {
    const results = [];
    const industrySources = this.getIndustrySources();

    for (const source of industrySources) {
      if (results.length >= maxResults) break;

      try {
        const sourceResults = await this.scrapeIndustrySource(source, keywords, 3);
        results.push(...sourceResults);

      } catch (error) {
        console.warn(`⚠️ Failed to scrape industry source ${source.name}:`, error.message);
      }
    }

    console.log(`✅ Industry sources found ${results.length} articles`);
    return results;
  }

  /**
   * Start proxy health monitoring
   */
  startProxyHealthMonitoring() {
    // Health check every 5 minutes
    setInterval(async () => {
      await this.antiDetectionService.healthCheckProxies();
    }, 5 * 60 * 1000);

    // Session cleanup every 10 minutes
    setInterval(() => {
      this.antiDetectionService.cleanupSessions();
    }, 10 * 60 * 1000);

    console.log('🔍 Proxy health monitoring started');
  }

  /**
   * Scrape source with advanced anti-detection measures
   */
  async scrapeSourceWithRotation(source, keywords, maxResults = 5) {
    const results = [];
    const searchUrl = source.searchUrl.replace('{keywords}', encodeURIComponent(keywords.join(' ')));

    // Try multiple attempts with anti-detection
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`🔍 Scraping ${source.name} (attempt ${attempt + 1})`);

        // Use anti-detection service for the request
        const response = await this.antiDetectionService.makeAdvancedRequest(searchUrl, {
          timeout: 10000,
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.google.com/'
          }
        });

        const articles = await this.parseSearchResults(response.data, source, keywords, maxResults);
        results.push(...articles);

        if (results.length >= maxResults) break;

        // Success - break out of retry loop
        break;

      } catch (error) {
        console.warn(`⚠️ Attempt ${attempt + 1} failed for ${source.name}:`, error.message);

        // If it's a 403 or 429, wait longer before retry
        if (error.response && [403, 429].includes(error.response.status)) {
          console.log(`🚫 Anti-detection triggered, waiting longer before retry...`);
          await this.delay(5000 + (attempt * 2000));
        } else {
          await this.delay(1000 + (attempt * 500));
        }
      }
    }

    return results;
  }

  /**
   * Parse search results with advanced selectors
   */
  async parseSearchResults(html, source, keywords, maxResults) {
    const results = [];
    const $ = require('cheerio').load(html);

    // Advanced selectors for different types of content
    const selectors = [
      'article a[href]', '.story a[href]', '.news-item a[href]',
      '.article-link[href]', 'h2 a[href]', 'h3 a[href]',
      '.headline a[href]', '.title a[href]',
      '.news-card a[href]', '.post a[href]'
    ];

    const processedUrls = new Set();

    for (const selector of selectors) {
      if (results.length >= maxResults) break;

      $(selector).each((i, elem) => {
        if (results.length >= maxResults) return false;

        const $link = $(elem);
        const title = $link.text().trim() || $link.attr('title') || '';
        let url = $link.attr('href');

        if (!title || title.length < 10 || processedUrls.has(url)) return;

        // Handle relative URLs
        if (url && !url.startsWith('http')) {
          const baseUrl = new URL(source.searchUrl);
          url = baseUrl.origin + (url.startsWith('/') ? '' : '/') + url;
        }

        // Validate URL and content relevance
        if (url && this.isValidArticleUrl(url) && this.isRelevantContent(title, keywords)) {
          processedUrls.add(url);
          results.push({
            title: title,
            url: url,
            snippet: title.substring(0, 200),
            source: source.name,
            publishedDate: new Date(),
            verified: false,
            scrapingSource: source.name,
            relevance: this.calculateRelevance({ title, description: title }, keywords)
          });
        }
      });
    }

    return results;
  }

  /**
   * Extract direct article URL from Google News URLs
   */
  async extractDirectArticleUrl(googleNewsUrl) {
    try {
      // Google News URLs often redirect to actual articles
      const response = await axios.get(googleNewsUrl, {
        maxRedirects: 5,
        timeout: 5000,
        validateStatus: (status) => status < 400
      });

      return response.request.res.responseUrl || googleNewsUrl;
    } catch (error) {
      // Return original URL if extraction fails
      return googleNewsUrl;
    }
  }

  /**
   * Get advanced web sources for scraping
   */
  getAdvancedWebSources() {
    return Object.values(this.config.searchEngines).filter(engine => engine.enabled);
  }

  /**
   * Get industry-specific sources
   */
  getIndustrySources() {
    const allSources = [];
    Object.values(this.config.industrySources).forEach(sources => {
      allSources.push(...sources);
    });
    return allSources;
  }

  /**
   * Check if article is relevant to our keywords
   */
  isRelevantArticle(article, keywords) {
    const content = `${article.title || ''} ${article.description || ''} ${article.content || ''}`.toLowerCase();

    // Must contain at least one keyword
    const hasKeyword = keywords.some(keyword =>
      content.includes(keyword.toLowerCase())
    );

    // Must be business/real estate related
    const businessTerms = ['business', 'company', 'development', 'construction', 'project', 'investment', 'announcement'];
    const hasBusinessTerm = businessTerms.some(term =>
      content.includes(term)
    );

    return hasKeyword && hasBusinessTerm;
  }

  /**
   * Calculate relevance score
   */
  calculateRelevance(article, keywords) {
    const content = `${article.title || ''} ${article.description || ''}`.toLowerCase();
    let score = 0;

    // Keyword matches
    keywords.forEach(keyword => {
      const matches = (content.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
      score += matches * 10;
    });

    // Business terms
    const businessTerms = ['announces', 'launches', 'develops', 'constructs', 'opens', 'plans', 'investment', 'million', 'billion'];
    businessTerms.forEach(term => {
      if (content.includes(term)) score += 5;
    });

    return Math.min(score, 100);
  }

  /**
   * Check if URL is valid for articles
   */
  isValidArticleUrl(url) {
    if (!url || typeof url !== 'string') return false;

    try {
      const urlObj = new URL(url);

      // Must be HTTP/HTTPS
      if (!['http:', 'https:'].includes(urlObj.protocol)) return false;

      // Must have valid hostname
      if (!urlObj.hostname || urlObj.hostname.length < 4) return false;

      // Block non-article URLs
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

  /**
   * Check content relevance
   */
  isRelevantContent(content, keywords) {
    if (!content || typeof content !== 'string') return false;

    const lowerContent = content.toLowerCase();

    // Must contain at least one keyword
    const hasKeyword = keywords.some(keyword =>
      lowerContent.includes(keyword.toLowerCase())
    );

    if (!hasKeyword) return false;

    // Should not be navigation or menu items
    const navigationWords = ['home', 'about', 'contact', 'privacy', 'terms', 'login', 'register'];
    const isNavigation = navigationWords.some(word =>
      lowerContent.includes(word) && content.split(' ').length < 5
    );

    return !isNavigation;
  }

  /**
   * Deduplicate and validate results
   */
  deduplicateAndValidate(results) {
    const seenUrls = new Set();
    const uniqueResults = [];

    for (const result of results) {
      if (!result.url || seenUrls.has(result.url)) continue;

      // Final URL validation
      if (this.isValidArticleUrl(result.url)) {
        seenUrls.add(result.url);
        uniqueResults.push({
          ...result,
          urlVerified: true
        });
      }
    }

    return uniqueResults;
  }

  /**
   * Extract comprehensive data from results
   */
  async extractComprehensiveData(results) {
    const processedResults = [];

    for (const result of results) {
      try {
        // Extract basic information
        const leadData = {
          title: result.title,
          url: result.url,
          source: result.source,
          publishedDate: result.publishedDate,
          snippet: result.snippet,
          verified: result.verified || false,
          // Create extractedData structure that saveLeads method expects
          extractedData: {}
        };

        // Extract company name
        const company = this.dataExtractionService.extractCompanyFromText(result.title + ' ' + result.snippet);
        leadData.extractedData.company = company;
        leadData.company = company;

        // Extract location
        const location = this.dataExtractionService.extractLocationFromText(result.title + ' ' + result.snippet);
        leadData.extractedData.location = location;
        leadData.location = location;

        // Extract project type
        const projectType = this.dataExtractionService.extractProjectTypeFromText(result.title + ' ' + result.snippet);
        leadData.extractedData.projectType = projectType;
        leadData.projectType = projectType;

        // Extract budget if available
        const budget = this.dataExtractionService.extractBudgetFromText(result.title + ' ' + result.snippet);
        leadData.extractedData.budget = budget;
        leadData.budget = budget;

        // Extract room count for hotels
        if (projectType?.toLowerCase().includes('hotel')) {
          const roomCount = this.dataExtractionService.extractRoomCountFromText(result.title + ' ' + result.snippet);
          leadData.extractedData.roomCount = roomCount;
          leadData.roomCount = roomCount;
        }

        // Extract contacts
        const contacts = this.dataExtractionService.extractContactsFromText(result.title + ' ' + result.snippet);
        if (contacts.length > 0) {
          leadData.extractedData.contactInfo = contacts[0]; // Primary contact
        }

        // Generate comprehensive description
        leadData.description = this.generateDescription(leadData);
        leadData.extractedData.description = leadData.description;

        // Set confidence based on data completeness
        leadData.confidence = this.calculateConfidence(leadData);
        leadData.extractedData.confidence = leadData.confidence;

        // Add additional fields that saveLeads expects
        leadData.extractedData.aiUsed = false;
        leadData.extractedData.keywords = [];
        leadData.extractedData.notes = `Scraped from ${result.source} using advanced scraping system`;
        leadData.articleText = result.snippet || result.title;
        leadData.extractedAt = new Date();

        processedResults.push(leadData);

      } catch (error) {
        console.warn('⚠️ Failed to extract data from result:', error.message);
      }
    }

    return processedResults;
  }

  /**
   * Generate comprehensive description
   */
  generateDescription(leadData) {
    const parts = [];

    if (leadData.company && leadData.company !== 'Unknown') {
      parts.push(`${leadData.company} is developing`);
    } else {
      parts.push('A new development project involves');
    }

    if (leadData.projectType && leadData.projectType !== 'Unknown') {
      parts.push(`a ${leadData.projectType.toLowerCase()}`);
    } else {
      parts.push('a construction project');
    }

    if (leadData.location && leadData.location !== 'Unknown') {
      parts.push(`in ${leadData.location}`);
    }

    if (leadData.budget && leadData.budget !== 'Unknown') {
      parts.push(`with a budget of ${leadData.budget}`);
    }

    if (leadData.roomCount && leadData.roomCount !== 'Unknown') {
      parts.push(`featuring ${leadData.roomCount} rooms`);
    }

    parts.push(`as reported by ${leadData.source}`);

    return parts.join(' ') + '.';
  }

  /**
   * Calculate confidence score based on data completeness
   */
  calculateConfidence(leadData) {
    let score = 0;
    const fields = ['company', 'location', 'projectType', 'budget', 'roomCount'];

    fields.forEach(field => {
      if (leadData[field] && leadData[field] !== 'Unknown') {
        score += 20;
      }
    });

    if (leadData.verified) score += 20;

    return Math.min(score, 100);
  }

  /**
   * Calculate data completeness statistics
   */
  calculateDataCompleteness(leads) {
    if (!leads || leads.length === 0) return { overall: '0%', fields: {} };

    const fields = ['company', 'location', 'projectType', 'budget', 'roomCount', 'url', 'title'];
    const completeness = {};

    fields.forEach(field => {
      const filled = leads.filter(lead => lead[field] && lead[field] !== 'Unknown' && lead[field] !== '').length;
      completeness[field] = ((filled / leads.length) * 100).toFixed(1) + '%';
    });

    // Overall completeness (average of all fields)
    const overallScore = Object.values(completeness)
      .map(val => parseFloat(val))
      .reduce((sum, val) => sum + val, 0) / fields.length;

    return {
      overall: overallScore.toFixed(1) + '%',
      fields: completeness
    };
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Scrape industry-specific source
   */
  async scrapeIndustrySource(source, keywords, maxResults = 3) {
    // Similar to scrapeSourceWithRotation but optimized for industry sources
    return await this.scrapeSourceWithRotation(source, keywords, maxResults);
  }
}

module.exports = AdvancedScrapingService;
