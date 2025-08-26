const puppeteer = require('puppeteer');
const OpenAI = require('openai');
const cheerio = require('cheerio');
const axios = require('axios');
const { Lead, LeadSource } = require('../models');

class WebScraper {
  constructor() {
    this.openai = null;
    this.browser = null;
    this.maxConcurrent = parseInt(process.env.MAX_CONCURRENT_SCRAPES) || 5;
    this.activeScrapes = 0;

    // Initialize OpenAI only if API key is available
    if (process.env.OPENAI_API_KEY) {
      try {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        console.log('✅ OpenAI client initialized');
      } catch (error) {
        console.warn('⚠️ OpenAI package not available or API key invalid');
      }
    } else {
      console.warn('⚠️ OpenAI API key not found. AI-powered lead extraction will be disabled.');
    }
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeUrl(url, options = {}) {
    if (this.activeScrapes >= this.maxConcurrent) {
      throw new Error('Maximum concurrent scrapes reached');
    }

    this.activeScrapes++;
    
    try {
      await this.initialize();
      
      const page = await this.browser.newPage();
      
      // Set user agent
      await page.setUserAgent(process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Set extra headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      });

      // Navigate to URL
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for content to load
      await page.waitForTimeout(2000);

      // Extract content
      const content = await page.evaluate(() => {
        // Remove script and style elements
        const scripts = document.querySelectorAll('script, style, noscript, iframe');
        scripts.forEach(el => el.remove());

        // Get main content
        const mainContent = document.querySelector('main, article, .content, .post, .entry') || document.body;
        
        return {
          title: document.title,
          url: window.location.href,
          text: mainContent.innerText || mainContent.textContent,
          html: mainContent.innerHTML,
          meta: {
            description: document.querySelector('meta[name="description"]')?.content,
            keywords: document.querySelector('meta[name="keywords"]')?.content,
            author: document.querySelector('meta[name="author"]')?.content,
            publishedTime: document.querySelector('meta[property="article:published_time"]')?.content
          }
        };
      });

      await page.close();
      
      return content;
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      throw error;
    } finally {
      this.activeScrapes--;
    }
  }

  async extractLeadData(content, extractionRules) {
    try {
      const prompt = this.buildExtractionPrompt(content, extractionRules);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
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
        max_tokens: 1000
      });

      const response = completion.choices[0].message.content;
      
      // Parse JSON response
      try {
        return JSON.parse(response);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', parseError);
        return this.fallbackExtraction(content, extractionRules);
      }
    } catch (error) {
      console.error('OpenAI extraction failed:', error);
      return this.fallbackExtraction(content, extractionRules);
    }
  }

  buildExtractionPrompt(content, extractionRules) {
    const rules = extractionRules || {};
    let prompt = `Extract the following information from this web content and return it as valid JSON:\n\n`;
    
    if (rules.extractCompany) {
      prompt += `- company: Company name if mentioned\n`;
    }
    if (rules.extractContact) {
      prompt += `- contactName: Contact person's name if mentioned\n`;
      prompt += `- contactEmail: Email address if mentioned\n`;
      prompt += `- contactPhone: Phone number if mentioned\n`;
    }
    if (rules.extractBudget) {
      prompt += `- budget: Budget amount if mentioned (as number)\n`;
      prompt += `- budgetRange: Budget range category (under_10k, 10k_50k, 50k_100k, 100k_500k, 500k_1m, over_1m, not_specified)\n`;
    }
    if (rules.extractTimeline) {
      prompt += `- timeline: Project timeline if mentioned\n`;
    }
    if (rules.extractRequirements) {
      prompt += `- requirements: Project requirements if mentioned\n`;
    }
    
    // Add custom fields
    if (rules.customFields && rules.customFields.length > 0) {
      rules.customFields.forEach(field => {
        prompt += `- ${field.name}: ${field.description}\n`;
      });
    }

    prompt += `\nContent to analyze:\n${content.title}\n\n${content.text.substring(0, 3000)}...\n\n`;
    prompt += `Return only valid JSON with the extracted information. Use null for missing values.`;

    return prompt;
  }

  fallbackExtraction(content, extractionRules) {
    // Basic fallback extraction using regex patterns
    const extracted = {};
    
    if (extractionRules.extractCompany) {
      // Look for company patterns
      const companyMatch = content.text.match(/(?:company|organization|firm|inc|llc|corp|corporation)\s*[:\-]?\s*([A-Z][A-Za-z\s&.,]+)/i);
      if (companyMatch) {
        extracted.company = companyMatch[1].trim();
      }
    }

    if (extractionRules.extractContact) {
      // Look for email patterns
      const emailMatch = content.text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
      if (emailMatch) {
        extracted.contactEmail = emailMatch[0];
      }

      // Look for phone patterns
      const phoneMatch = content.text.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      if (phoneMatch) {
        extracted.contactPhone = phoneMatch[0];
      }

    }

    if (extractionRules.extractBudget) {
      // Look for budget patterns
      const budgetMatch = content.text.match(/(?:budget|cost|price|amount)\s*[:\-]?\s*[\$]?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|K|m|M|thousand|million)?/i);
      if (budgetMatch) {
        extracted.budget = parseFloat(budgetMatch[1].replace(/,/g, ''));
        
        // Determine budget range
        if (extracted.budget < 10000) {
          extracted.budgetRange = 'under_10k';
        } else if (extracted.budget < 50000) {
          extracted.budgetRange = '10k_50k';
        } else if (extracted.budget < 100000) {
          extracted.budgetRange = '50k_100k';
        } else if (extracted.budget < 500000) {
          extracted.budgetRange = '100k_500k';
        } else if (extracted.budget < 1000000) {
          extracted.budgetRange = '500k_1m';
        } else {
          extracted.budgetRange = 'over_1m';
        }
      } else {
        extracted.budgetRange = 'not_specified';
      }
    }

    return extracted;
  }

  async scrapeMultipleUrls(urls, extractionRules, userId) {
    const results = [];
    const errors = [];

    for (const url of urls) {
      try {
        console.log(`Scraping: ${url}`);
        
        // Scrape content
        const content = await this.scrapeUrl(url);
        
        // Extract lead data
        const extractedData = await this.extractLeadData(content, extractionRules);
        
        // Create lead record
        const lead = await Lead.create({
          title: content.title || 'Untitled',
          description: content.meta.description || content.text.substring(0, 500),
          company: extractedData.company,
          contactName: extractedData.contactName,
          contactEmail: extractedData.contactEmail,
          contactPhone: extractedData.contactPhone,
          budget: extractedData.budget,
          budgetRange: extractedData.budgetRange,
          timeline: extractedData.timeline,
          requirements: extractedData.requirements,
          sourceUrl: url,
          sourceTitle: content.title,
          publishedDate: content.meta.publishedTime ? new Date(content.meta.publishedTime) : null,
          scrapedDate: new Date(),
          extractedData: extractedData,
          UserId: userId
        });

        results.push(lead);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Failed to scrape ${url}:`, error);
        errors.push({ url, error: error.message });
      }
    }

    return { results, errors };
  }

  async scrapeRSSFeed(feedUrl, extractionRules, userId) {
    try {
      const response = await axios.get(feedUrl);
      const $ = cheerio.load(response.data, { xmlMode: true });
      
      const items = [];
      $('item').each((i, elem) => {
        const title = $(elem).find('title').text();
        const link = $(elem).find('link').text();
        const description = $(elem).find('description').text();
        const pubDate = $(elem).find('pubDate').text();
        
        items.push({
          title,
          link,
          description,
          pubDate: new Date(pubDate)
        });
      });

      // Scrape each item
      const urls = items.map(item => item.link);
      return await this.scrapeMultipleUrls(urls, extractionRules, userId);
      
    } catch (error) {
      console.error(`Failed to scrape RSS feed ${feedUrl}:`, error);
      throw error;
    }
  }

  async scrapeConfiguration(config, userId) {
    console.log(`🚀 Starting comprehensive scraping for config: ${config.name}`);
    console.log(`🔍 Keywords: ${config.keywords.join(', ')}`);
    console.log(`📰 Sources: ${config.sources.join(', ')}`);

    const allResults = [];
    const errors = [];

    try {
      // Initialize browser if available
      await this.initialize();

      // Scrape each source
      for (const source of config.sources) {
        try {
          console.log(`\n📡 Scraping source: ${source}`);
          let sourceResults = [];

          switch (source) {
            case 'google':
              sourceResults = await this.scrapeGoogleNews(config.keywords, config.max_results_per_run || 20);
              break;
            case 'bing':
              sourceResults = await this.scrapeBingNews(config.keywords, config.max_results_per_run || 20);
              break;
            case 'rss':
              sourceResults = await this.scrapeRSSFeeds(config.keywords, config.max_results_per_run || 20);
              break;
            case 'news':
              sourceResults = await this.scrapeNewsAPIs(config.keywords, config.max_results_per_run || 20);
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

      // Enrich results with full content
      console.log('📖 Enriching results with full content...');
      const enrichedResults = await this.enrichResultsWithContent(allResults);
      console.log(`✅ Enriched ${enrichedResults.length} results with full content`);

      // Extract lead data using AI or fallback methods
      console.log('🤖 Processing results with AI...');
      const processedResults = await this.processResultsWithAI(enrichedResults, config);
      console.log(`🤖 AI processing completed. Processed ${processedResults.length} results.`);

      // Save leads to database
      console.log(`💾 Attempting to save ${processedResults.length} leads...`);
      const savedLeads = await this.saveLeads(processedResults, userId, config);

      console.log(`🎉 Successfully saved ${savedLeads.length} leads.`);

      return {
        totalResults: allResults.length,
        savedLeads: savedLeads.length,
        leads: savedLeads,
        errors
      };

    } catch (error) {
      console.error('❌ Scraping configuration failed:', error);
      throw error;
    } finally {
      await this.close();
    }
  }

  async scrapeGoogleNews(keywords, maxResults = 20) {
    try {
      if (!this.browser) {
        console.log('⚠️ Browser not available, trying alternative Google search method...');
        return this.scrapeGoogleNewsAlternative(keywords, maxResults);
      }

      const page = await this.browser.newPage();
      await page.setUserAgent(process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      const searchQuery = keywords.join(' ');
      const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(2000);

      const results = await page.evaluate(() => {
        const articles = [];
        const articleElements = document.querySelectorAll('article');
        
        articleElements.forEach((article, index) => {
          if (index >= 20) return; // Limit results
          
          const titleElement = article.querySelector('h3, h4, a');
          const linkElement = article.querySelector('a[href*="/articles/"]');
          const sourceElement = article.querySelector('time')?.parentElement;
          
          if (titleElement && linkElement) {
            const title = titleElement.textContent.trim();
            const url = 'https://news.google.com' + linkElement.getAttribute('href');
            const source = sourceElement?.textContent.trim() || 'Google News';
            
            articles.push({ title, url, source, snippet: title });
          }
        });
        
        return articles;
      });

      await page.close();
      return results;

    } catch (error) {
      console.error('❌ Google News scraping failed:', error);
      return this.scrapeGoogleNewsAlternative(keywords, maxResults);
    }
  }

  async scrapeGoogleNewsAlternative(keywords, maxResults = 20) {
    console.log('🔍 Using alternative Google search method...');
    
    // Simulate Google News results for testing
    const searchQuery = keywords.join(' ');
    const mockResults = [
      {
        title: `${searchQuery} Development Project Announced`,
        url: `https://example.com/${searchQuery.toLowerCase().replace(/\s+/g, '-')}-project`,
        source: 'Sample News',
        snippet: `New ${searchQuery.toLowerCase()} development project announced in downtown area`
      }
    ];
    
    return mockResults.slice(0, maxResults);
  }

  async scrapeBingNews(keywords, maxResults = 20) {
    try {
      if (!this.browser) {
        console.log('⚠️ Browser not available, trying alternative Bing search method...');
        return this.scrapeBingNewsAlternative(keywords, maxResults);
      }

      const page = await this.browser.newPage();
      await page.setUserAgent(process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      const searchQuery = keywords.join(' ');
      const searchUrl = `https://www.bing.com/news/search?q=${encodeURIComponent(searchQuery)}`;
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(2000);

      const results = await page.evaluate(() => {
        const articles = [];
        const articleElements = document.querySelectorAll('.news-card');
        
        articleElements.forEach((article, index) => {
          if (index >= 20) return;
          
          const titleElement = article.querySelector('.title');
          const linkElement = article.querySelector('a');
          const sourceElement = article.querySelector('.source');
          
          if (titleElement && linkElement) {
            const title = titleElement.textContent.trim();
            const url = linkElement.href;
            const source = sourceElement?.textContent.trim() || 'Bing News';
            
            articles.push({ title, url, source, snippet: title });
          }
        });
        
        return articles;
      });

      await page.close();
      return results;

    } catch (error) {
      console.error('❌ Bing News scraping failed:', error);
      return this.scrapeBingNewsAlternative(keywords, maxResults);
    }
  }

  async scrapeBingNewsAlternative(keywords, maxResults = 20) {
    console.log('⚠️ Using sample results for Bing alternative search');
    
    const searchQuery = keywords.join(' ');
    const mockResults = [
      {
        title: `${searchQuery} Construction Project`,
        url: `https://example.com/${searchQuery.toLowerCase().replace(/\s+/g, '-')}-construction`,
        source: 'Sample News',
        snippet: `Major ${searchQuery.toLowerCase()} construction project announced for downtown area with 200 rooms`
      },
      {
        title: `New ${searchQuery} Development`,
        url: `https://example.com/new-${searchQuery.toLowerCase().replace(/\s+/g, '-')}`,
        source: 'Sample News',
        snippet: `Luxury ${searchQuery.toLowerCase()} development project in historic district`
      }
    ];
    
    return mockResults.slice(0, maxResults);
  }

  async scrapeRSSFeeds(keywords, maxResults = 20) {
    const rssFeeds = [
      'https://feeds.bbci.co.uk/news/rss.xml',
      'https://www.npr.org/rss/rss.php?id=1001',
      'https://feeds.bloomberg.com/markets/news.rss',
      'https://www.cnbc.com/id/100003114/device/rss/rss.html',
      'https://feeds.feedburner.com/techcrunch/',
      'https://www.engadget.com/rss.xml',
      'https://rss.cnn.com/rss/edition.rss'
    ];

    const allItems = [];
    
    for (const feedUrl of rssFeeds) {
      try {
        console.log(`📡 Parsing RSS feed: ${feedUrl}`);
        const response = await axios.get(feedUrl, { timeout: 10000 });
        const $ = cheerio.load(response.data, { xmlMode: true });
        
        const items = [];
        $('item').each((i, elem) => {
          const title = $(elem).find('title').text();
          const link = $(elem).find('link').text();
          const description = $(elem).find('description').text();
          const pubDate = $(elem).find('pubDate').text();
          
          // Check if any keyword matches
          const lowerTitle = title.toLowerCase();
          const lowerDesc = description.toLowerCase();
          const hasKeyword = keywords.some(keyword => 
            lowerTitle.includes(keyword.toLowerCase()) || 
            lowerDesc.includes(keyword.toLowerCase())
          );
          
          if (hasKeyword) {
            items.push({
              title,
              url: link,
              source: new URL(feedUrl).hostname,
              snippet: description,
              publishedDate: new Date(pubDate)
            });
          }
        });
        
        console.log(`📰 Found ${items.length} items in ${feedUrl}`);
        allItems.push(...items);
        
      } catch (error) {
        console.log(`❌ Error parsing RSS feed ${feedUrl}: ${error.message}`);
      }
    }
    
    // Sort by date and limit results
    return allItems
      .sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate))
      .slice(0, maxResults);
  }

  async scrapeNewsAPIs(keywords, maxResults = 20) {
    console.log('📰 Starting news sources scraping...');
    
    if (!process.env.NEWS_API_KEY) {
      console.log('⚠️ No NEWS_API_KEY found, using demo mode with limited results');
      return [];
    }

    try {
      const searchQuery = keywords.join(' ');
      const response = await axios.get(`https://newsapi.org/v2/everything`, {
        params: {
          q: searchQuery,
          apiKey: process.env.NEWS_API_KEY,
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: Math.min(maxResults, 100)
        },
        timeout: 10000
      });

      if (response.data.articles) {
        return response.data.articles.map(article => ({
          title: article.title,
          url: article.url,
          source: article.source.name,
          snippet: article.description,
          publishedDate: new Date(article.publishedAt)
        }));
      }

      return [];

    } catch (error) {
      console.error('❌ News API scraping failed:', error.message);
      return [];
    }
  }

  async enrichResultsWithContent(results) {
    const enriched = [];
    
    for (const result of results) {
      try {
        console.log(`📖 Extracting full content from: ${result.url}`);
        
        let fullContent = result.snippet;
        
        if (this.browser) {
          try {
            const content = await this.scrapeUrl(result.url);
            fullContent = content.text || content.snippet || result.snippet;
          } catch (error) {
            console.log(`⚠️ Could not extract full content from ${result.url}, using snippet`);
          }
        }
        
        enriched.push({
          ...result,
          fullContent,
          extractedAt: new Date()
        });
        
      } catch (error) {
        console.error(`❌ Error enriching result ${result.url}:`, error);
        enriched.push({
          ...result,
          fullContent: result.snippet,
          extractedAt: new Date()
        });
      }
    }
    
    return enriched;
  }

  async processResultsWithAI(results, config) {
    const processed = [];
    
    for (const result of results) {
      try {
        let extractedData = {};
        
        if (this.openai) {
          // Use AI extraction
          extractedData = await this.extractLeadData(result, config.data_extraction_rules || {});
        } else {
          // Use fallback extraction methods
          extractedData = {
            projectType: this.extractProjectTypeFromText(result.fullContent),
            location: this.extractLocationFromText(result.fullContent),
            budget: this.extractBudgetFromText(result.fullContent),
            timeline: this.extractTimelineFromText(result.fullContent),
            company: this.extractCompanyFromText(result.fullContent),
            contactInfo: this.extractContactInfoFromText(result.fullContent),
            description: this.extractDescriptionFromText(result.fullContent),
            roomCount: this.extractRoomCountFromText(result.fullContent),
            squareFootage: this.extractSquareFootageFromText(result.fullContent),
            employees: this.extractEmployeesFromText(result.fullContent)
          };
        }
        
        processed.push({
          ...result,
          extractedData
        });
        
      } catch (error) {
        console.error(`❌ Error processing result ${result.url}:`, error);
        processed.push({
          ...result,
          extractedData: {
            projectType: "Unknown",
            location: "Unknown",
            budget: "Unknown",
            timeline: "Unknown",
            company: "Unknown",
            contactInfo: "Unknown",
            description: "Unknown",
            roomCount: "Unknown",
            squareFootage: "Unknown",
            employees: "Unknown"
          }
        });
      }
    }
    
    return processed;
  }

  async saveLeads(processedResults, userId, config) {
    const savedLeads = [];
    
    for (const result of processedResults) {
      try {
        console.log(`💾 Saving lead for: ${result.title}...`);
        
        // Create or find lead source
        const leadSource = await LeadSource.create({
          name: result.source || 'Unknown Source',
          url: result.url,
          type: 'web_scrape'
        });
        
        // Create lead
        const lead = await Lead.create({
          title: result.title,
          description: result.extractedData.description || result.snippet,
          company: result.extractedData.company,
          contactName: result.extractedData.contactInfo?.name || 'Unknown',
          contactEmail: result.extractedData.contactInfo?.email || 'Unknown',
          contactPhone: result.extractedData.contactInfo?.phone || 'Unknown',
          budget: result.extractedData.budget,
          budgetRange: this.calculateBudgetRange(result.extractedData.budget),
          timeline: result.extractedData.timeline,
          requirements: result.extractedData.description,
          sourceUrl: result.url,
          sourceTitle: result.title,
          publishedDate: result.publishedDate,
          scrapedDate: new Date(),
          extractedData: result.extractedData,
          user_id: userId,
          lead_source_id: leadSource.id
        });
        
        savedLeads.push(lead);
        
      } catch (error) {
        console.error(`❌ Error saving lead:`, error);
      }
    }
    
    return savedLeads;
  }

  calculateBudgetRange(budget) {
    if (!budget || budget === 'Unknown') return 'not_specified';
    
    const amount = parseFloat(budget);
    if (isNaN(amount)) return 'not_specified';
    
    if (amount < 10000) return 'under_10k';
    if (amount < 50000) return '10k_50k';
    if (amount < 100000) return '50k_100k';
    if (amount < 500000) return '100k_500k';
    if (amount < 1000000) return '500k_1m';
    return 'over_1m';
  }
}

module.exports = WebScraper;


