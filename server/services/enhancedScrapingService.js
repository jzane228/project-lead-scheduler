const ScrapyService = require('./scrapyService');
const DataExtractionService = require('./dataExtractionService');
const OpenAI = require('openai');
const axios = require('axios');
const { Lead, LeadSource } = require('../models');

class EnhancedScrapingService {
  constructor() {
    this.scrapyService = new ScrapyService();
    this.dataExtractionService = new DataExtractionService();
    this.openai = null;
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    this.useDeepseek = process.env.USE_DEEPSEEK === 'true' || !process.env.OPENAI_API_KEY;
    this.progressCallbacks = new Map();

    // Initialize AI service (OpenAI or Deepseek)
    if (this.useDeepseek && this.deepseekApiKey) {
      console.log('✅ Using Deepseek for enhanced extraction (cheaper option)');
    } else if (process.env.OPENAI_API_KEY) {
      try {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        console.log('✅ OpenAI client initialized for enhanced extraction');
      } catch (error) {
        console.warn('⚠️ OpenAI initialization failed:', error.message);
      }
    } else {
      console.log('⚠️ No AI API key found, using pattern-based extraction only');
    }
  }

  async initialize() {
    console.log('🚀 Initializing Enhanced Scraping Service...');
    try {
      // Initialize Scrapy service
      await this.scrapyService.initialize();
      console.log('✅ Enhanced Scraping Service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Scraping Service:', error);
      return false;
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
        
        if (this.openai && config.useAI !== false) {
          // Use AI extraction if available
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
      const prompt = this.buildAIExtractionPrompt(text, extractionRules);

      if (this.useDeepseek && this.deepseekApiKey) {
        return await this.extractWithDeepseek(prompt);
      } else if (this.openai) {
        return await this.extractWithOpenAI(prompt);
      } else {
        throw new Error('No AI service available');
      }
    } catch (error) {
      console.error('AI extraction failed:', error);
      // Fallback to pattern extraction
      return this.dataExtractionService.extractAllData(text);
    }
  }

  async extractWithOpenAI(prompt) {
    const completion = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Cost-effective model
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
      max_tokens: 500 // Reduced for cost savings
    });

    const response = completion.choices[0].message.content;

    try {
      return JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw parseError;
    }
  }

  async extractWithDeepseek(prompt) {
    try {
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
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer ${this.deepseekApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const content = response.data.choices[0].message.content;

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

  buildAIExtractionPrompt(text, extractionRules) {
    let prompt = `Extract the following information from this web content and return it as valid JSON:\n\n`;
    
    const fields = [
      'company', 'location', 'projectType', 'budget', 'timeline', 
      'roomCount', 'squareFootage', 'employees', 'status', 'priority', 'industryType'
    ];
    
    fields.forEach(field => {
      prompt += `- ${field}: ${this.getFieldDescription(field)}\n`;
    });
    
    prompt += `\nContent to analyze:\n${text.substring(0, 3000)}...\n\n`;
    prompt += `Return only valid JSON with the extracted information. Use "Unknown" for missing values.`;
    
    return prompt;
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
        console.log(`💾 Saving lead for: ${result.title}...`);
        
        // Create or find lead source
        const leadSource = await LeadSource.create({
          name: result.source || 'Unknown Source',
          url: this.ensureValidUrl(result.url),
          type: this.getLeadSourceType(result.source, result.url)
        });
        
        // Create lead with extracted data
        const lead = await Lead.create({
          title: result.title,
          description: result.extractedData.description || result.snippet,
          company: result.extractedData.company || 'Unknown',
          contactName: result.extractedData.contactInfo?.name || 'Unknown',
          contactEmail: result.extractedData.contactInfo?.email || 'Unknown',
          contactPhone: result.extractedData.contactInfo?.phone || 'Unknown',
          budget: result.extractedData.budget,
          budgetRange: result.extractedData.budgetRange || 'not_specified',
          timeline: result.extractedData.timeline,
          requirements: result.extractedData.description,
          sourceUrl: result.url, // This should be the article URL
          sourceTitle: result.title,
          publishedDate: result.publishedDate,
          scrapedDate: new Date(),
          extractedData: result.extractedData,
          user_id: userId,
          lead_source_id: leadSource.id,
          status: this.mapStatusToValidEnum(result.extractedData.status),
          priority: this.mapPriorityToValidEnum(result.extractedData.priority),
          industry_type: result.extractedData.industryType || 'mixed_use'
        });
        
        savedLeads.push(lead);
        
        // Update progress for saving
        const jobId = `${config.id}-${Date.now()}`;
        this.updateProgress(jobId, 'saving', i + 1, processedResults.length, `Saved ${i + 1} of ${processedResults.length} leads...`);
        
      } catch (error) {
        console.error(`❌ Error saving lead:`, error);
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
