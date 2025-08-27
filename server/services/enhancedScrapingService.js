const ScrapyService = require('./scrapyService');
const DataExtractionService = require('./dataExtractionService');
const axios = require('axios');
const { Lead, LeadSource } = require('../models');

class EnhancedScrapingService {
  constructor() {
    this.scrapyService = new ScrapyService();
    this.dataExtractionService = new DataExtractionService();
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

    const allResults = [];
    const errors = [];
    const jobId = `${config.id}-${Date.now()}`;
    
    // Update progress - starting
    this.updateProgress(jobId, 'initializing', 0, sourcesToUse.length, 'Starting enhanced scraping...');

    try {
      // Scrape each source using Scrapy with priority order
      for (let i = 0; i < sourcesToUse.length; i++) {
        const source = sourcesToUse[i];
        try {
          console.log(`\n📡 Scraping source: ${source}`);
          
          // Update progress - scraping source
          this.updateProgress(jobId, 'scraping', i + 1, sourcesToUse.length, `Scraping ${source}...`);
          
          let sourceResults = [];

          switch (source) {
            case 'google':
              sourceResults = await this.scrapeGoogleNews(config.keywords, config.max_results_per_run || 20);
              break;
            case 'bing':
              sourceResults = await this.scrapeBingNews(config.keywords, config.max_results_per_run || 20);
              break;
            case 'news':
              sourceResults = await this.scrapeNewsSources(config.keywords, config.max_results_per_run || 20);
              break;
            case 'scrapy':
              sourceResults = await this.scrapeWithScrapy(config.keywords, config.max_results_per_run || 20);
              break;
            case 'rss':
              // Use RSS as fallback only
              sourceResults = await this.scrapyService.scrapeRSSFeeds(config.keywords, config.max_results_per_run || 20);
              break;
            default:
              console.log(`⚠️ Unknown source: ${source}`);
              continue;
          }

          console.log(`✅ Source ${source} returned ${sourceResults.length} results`);
          allResults.push(...sourceResults);

        } catch (error) {
          console.error(`❌ Error scraping source ${source}:`, error);
          errors.push({ source, error: error.message });
        }
      }

      console.log(`\n📊 Total results found: ${allResults.length}`);

      if (allResults.length === 0) {
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
      this.updateProgress(jobId, 'enriching', 0, allResults.length, 'Enriching results with full content...');
      const enrichedResults = await this.enrichResultsWithContent(allResults);
      console.log(`✅ Enriched ${enrichedResults.length} results with full content`);

      // Extract lead data using AI or pattern-based methods
      console.log('🤖 Processing results with data extraction...');
      this.updateProgress(jobId, 'extracting', 0, enrichedResults.length, 'Extracting lead data...');
      const processedResults = await this.processResultsWithExtraction(enrichedResults, config);
      console.log(`🤖 Data extraction completed. Processed ${processedResults.length} results.`);

      // Save leads to database
      console.log(`💾 Attempting to save ${processedResults.length} leads...`);
      this.updateProgress(jobId, 'saving', 0, processedResults.length, 'Saving leads to database...');
      const savedLeads = await this.saveLeads(processedResults, userId, config);

      console.log(`🎉 Successfully saved ${savedLeads.length} leads.`);

      // Update progress - completed
      this.updateProgress(jobId, 'completed', savedLeads.length, savedLeads.length, `Successfully saved ${savedLeads.length} leads!`);

      return {
        totalResults: allResults.length,
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

  async processResultsWithExtraction(results, config) {
    const processed = [];
    
    for (const result of results) {
      try {
        let extractedData = {};
        
        if (this.deepseekApiKey && config.useAI !== false) {
          // Use Deepseek AI extraction if available
          extractedData = await this.extractWithAI(result.fullContent, config.data_extraction_rules || {});
        } else {
          // Use pattern-based extraction with improved content
          const contentToAnalyze = result.articleText || result.fullContent || result.snippet;
          extractedData = this.dataExtractionService.extractContextualData(contentToAnalyze);
          
          // Always try to extract from title and snippet for better results
          const titleSnippetData = this.extractFromTitleAndSnippet(result.title, result.snippet);
          extractedData = { ...extractedData, ...titleSnippetData };
          
          // If we still get mostly "Unknown" values, try enhanced extraction
          if (this.isMostlyUnknown(extractedData)) {
            const enhancedData = this.extractEnhancedData(result.title, result.snippet, contentToAnalyze);
            extractedData = { ...extractedData, ...enhancedData };
          }
        }
        
        processed.push({
          ...result,
          extractedData
        });
        
      } catch (error) {
        console.error(`❌ Error processing result ${result.url}:`, error);
        // Fallback to basic extraction
        const fallbackData = this.dataExtractionService.extractAllData(result.fullContent);
        processed.push({
          ...result,
          extractedData: fallbackData
        });
      }
    }
    
    return processed;
  }

  async extractWithAI(text, extractionRules) {
    try {
      if (!this.deepseekApiKey) {
        console.warn('⚠️ No Deepseek API key - using pattern extraction');
        return this.dataExtractionService.extractAllData(text);
      }

      // SMART MODE: Try pattern extraction first, only use AI when needed
      if (this.smartMode) {
        const patternData = this.dataExtractionService.extractAllData(text);
        const confidence = this.calculateConfidence(patternData);

        // Only use AI if pattern extraction confidence is low (< 50%)
        if (confidence < 50) {
          console.log(`🤖 Using Deepseek AI (pattern confidence: ${confidence}%)`);
          const aiData = await this.extractWithDeepseek(this.buildAIExtractionPrompt(text, extractionRules));

          // Merge pattern and AI results, preferring AI when available
          return this.mergeExtractionResults(patternData, aiData);
        } else {
          console.log(`📊 Using pattern extraction (confidence: ${confidence}%)`);
          return patternData;
        }
      }

      // NORMAL MODE: Always use AI
      const prompt = this.buildAIExtractionPrompt(text, extractionRules);
      return await this.extractWithDeepseek(prompt);
    } catch (error) {
      console.error('Deepseek extraction failed:', error);
      // Fallback to pattern extraction
      return this.dataExtractionService.extractAllData(text);
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

  buildAIExtractionPrompt(text, extractionRules) {
    // Preprocess text to reduce token usage
    const processedText = this.preprocessText(text);

    // Use only essential fields for cost optimization
    const essentialFields = ['company', 'location', 'projectType', 'budget'];

    let prompt = `Extract key business information from this content. Return JSON only:\n\n`;

    essentialFields.forEach(field => {
      prompt += `- ${field}: ${this.getFieldDescription(field)}\n`;
    });

    // Limit content to 1500 characters (50% reduction)
    prompt += `\nContent:\n${processedText.substring(0, 1500)}\n\n`;
    prompt += `Return JSON: {"company":"...", "location":"...", "projectType":"...", "budget":"..."}`;

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

  async saveLeads(processedResults, userId, config) {
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

        // Build comprehensive custom fields from extracted data
        const customFields = {};
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
        const lead = await Lead.create({
          // Basic Information
          title: result.title,
          description: result.extractedData.description || result.articleText || result.snippet || result.title,

          // Project Details
          project_type: result.extractedData.projectType || null,
          location: result.extractedData.location || null,
          budget: result.extractedData.budget || null,
          timeline: result.extractedData.timeline || null,

          // Company & Contact Information
          company: result.extractedData.company || 'Unknown',
          contact_info: Object.keys(contactInfo).length > 0 ? contactInfo : null,

          // Industry & Keywords
          industry_type: result.extractedData.industryType || null,
          keywords: keywords.length > 0 ? keywords : [],

          // Article URL - CRITICAL for user's requirement
          url: result.url, // Article URL for easy access

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
          sourceUrl: result.url, // Legacy field
          sourceTitle: result.title,
          publishedDate: result.publishedDate,
          scrapedDate: new Date(),
          extractedData: result.extractedData
        });

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

        savedLeads.push(lead);
        console.log(`✅ Saved comprehensive lead with ${Object.keys(result.extractedData).length} fields`);

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
