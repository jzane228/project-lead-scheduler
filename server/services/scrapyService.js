const axios = require('axios');
const cheerio = require('cheerio');
const { Lead, LeadSource } = require('../models');

class ScrapyService {
  constructor() {
    this.userAgent = process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    this.timeout = 30000;
    this.maxRetries = 3;
  }

  async initialize() {
    console.log('🕷️ Initializing Scrapy Service...');
    try {
      // Test the service with a simple request
      const testUrl = 'https://httpbin.org/html';
      await this.scrapeWithDirectHTTP(testUrl);
      console.log('✅ Scrapy Service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Scrapy Service:', error);
      return false;
    }
  }

  async scrapeWithScrapy(url, options = {}) {
    try {
      console.log(`🕷️ Scraping with Scrapy: ${url}`);
      
      // Use Scrapy Cloud API if available, otherwise fallback to direct HTTP
      if (process.env.SCRAPY_CLOUD_API_KEY) {
        return await this.scrapeWithScrapyCloud(url, options);
      } else {
        return await this.scrapeWithDirectHTTP(url, options);
      }
    } catch (error) {
      console.error(`❌ Scrapy scraping failed for ${url}:`, error.message);
      throw error;
    }
  }

  async scrapeWithScrapyCloud(url, options = {}) {
    try {
      const response = await axios.post('https://app.scrapingbee.com/api/v1/', {
        api_key: process.env.SCRAPY_CLOUD_API_KEY,
        url: url,
        render_js: options.renderJs || false,
        wait: options.wait || 2000,
        timeout: this.timeout,
        country_code: 'us'
      }, {
        timeout: this.timeout + 5000
      });

      if (response.data && response.data.content) {
        return this.parseScrapyResponse(response.data.content, url);
      } else {
        throw new Error('Invalid response from Scrapy Cloud');
      }
    } catch (error) {
      console.error('Scrapy Cloud failed, falling back to direct HTTP:', error.message);
      return await this.scrapeWithDirectHTTP(url, options);
    }
  }

  async scrapeWithDirectHTTP(url, options = {}) {
    const headers = {
      'User-Agent': this.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0'
    };

    // Add custom headers if provided
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`📡 HTTP attempt ${attempt} for ${url}`);
        
        const response = await axios.get(url, {
          headers,
          timeout: this.timeout,
          maxRedirects: 5,
          validateStatus: (status) => status < 400
        });

        return this.parseScrapyResponse(response.data, url);
      } catch (error) {
        lastError = error;
        console.log(`⚠️ Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < this.maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  parseScrapyResponse(html, url) {
    try {
      // Validate HTML content
      if (!html || typeof html !== 'string' || html.trim().length === 0) {
        throw new Error('Invalid or empty HTML content');
      }

      const $ = cheerio.load(html);
      
      // Remove script and style elements
      $('script, style, noscript, iframe, nav, footer, header').remove();
      
      // Extract main content
      const mainContent = $('main, article, .content, .post, .entry, .main, .body') || $('body');
      
      // Extract title
      const title = $('title').text().trim() || 
                   $('h1').first().text().trim() || 
                   $('meta[property="og:title"]').attr('content') ||
                   'Untitled';
      
      // Extract description
      const description = $('meta[name="description"]').attr('content') ||
                         $('meta[property="og:description"]').attr('content') ||
                         $('p').first().text().trim() ||
                         '';
      
      // Extract text content
      const text = mainContent.text().replace(/\s+/g, ' ').trim();
      
      // Extract meta information
      const meta = {
        description: description,
        keywords: $('meta[name="keywords"]').attr('content') || '',
        author: $('meta[name="author"]').attr('content') || '',
        publishedTime: $('meta[property="article:published_time"]').attr('content') || '',
        ogTitle: $('meta[property="og:title"]').attr('content') || '',
        ogDescription: $('meta[property="og:description"]').attr('content') || '',
        ogImage: $('meta[property="og:image"]').attr('content') || ''
      };

      return {
        title,
        url,
        text: text.substring(0, 10000), // Limit text size
        html: mainContent.html(),
        meta,
        scrapedAt: new Date()
      };
    } catch (error) {
      console.error('Error parsing Scrapy response:', error);
      return {
        title: 'Error parsing content',
        url,
        text: 'Failed to parse content',
        html: '',
        meta: {},
        scrapedAt: new Date()
      };
    }
  }

  async scrapeMultipleUrls(urls, options = {}) {
    const results = [];
    const errors = [];
    
    // Process URLs in parallel with concurrency limit
    const concurrency = options.concurrency || 5;
    const batches = [];
    
    for (let i = 0; i < urls.length; i += concurrency) {
      batches.push(urls.slice(i, i + concurrency));
    }
    
    for (const batch of batches) {
      const batchPromises = batch.map(async (url) => {
        try {
          const result = await this.scrapeWithScrapy(url, options);
          return { success: true, data: result };
        } catch (error) {
          return { success: false, error: error.message, url };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            results.push(result.value.data);
          } else {
            errors.push(result.value);
          }
        } else {
          errors.push({ success: false, error: result.reason.message });
        }
      });
      
      // Rate limiting between batches
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return { results, errors };
  }

  async scrapeNewsSources(keywords, maxResults = 20) {
    const newsSources = [
      'https://news.google.com',
      'https://www.reuters.com',
      'https://www.bloomberg.com',
      'https://www.cnbc.com',
      'https://www.marketwatch.com'
    ];
    
    const allResults = [];
    
    for (const source of newsSources) {
      try {
        const searchQuery = keywords.join(' ');
        const searchUrl = `${source}/search?q=${encodeURIComponent(searchQuery)}`;
        
        const content = await this.scrapeWithScrapy(searchUrl, { renderJs: false });
        
        // Parse news results from the content
        const newsItems = this.extractNewsItems(content, keywords);
        allResults.push(...newsItems);
        
        if (allResults.length >= maxResults) break;
        
      } catch (error) {
        console.log(`⚠️ Failed to scrape ${source}: ${error.message}`);
      }
    }
    
    return allResults.slice(0, maxResults);
  }

  extractNewsItems(content, keywords) {
    const $ = cheerio.load(content.html);
    const items = [];
    
    // Look for common news article patterns
    const selectors = [
      'article',
      '.news-item',
      '.article',
      '.story',
      '.post',
      'h2 a',
      'h3 a'
    ];
    
    for (const selector of selectors) {
      const elements = $(selector);
      
      elements.each((i, elem) => {
        if (items.length >= 20) return false; // Limit results
        
        const $elem = $(elem);
        const title = $elem.find('h1, h2, h3, h4, .title, .headline').text().trim();
        const link = $elem.find('a').attr('href') || $elem.attr('href');
        const description = $elem.find('.description, .summary, .excerpt, p').text().trim();
        
        if (title && link) {
          // Check if any keyword matches
          const lowerTitle = title.toLowerCase();
          const lowerDesc = description.toLowerCase();
          const hasKeyword = keywords.some(keyword => 
            lowerTitle.includes(keyword.toLowerCase()) || 
            lowerDesc.includes(keyword.toLowerCase())
          );
          
          if (hasKeyword) {
            let absoluteUrl;

            try {
              if (link.startsWith('http')) {
                absoluteUrl = link;
              } else if (link.startsWith('//')) {
                absoluteUrl = 'https:' + link;
              } else if (link.startsWith('/')) {
                const baseUrl = new URL(content.url);
                absoluteUrl = baseUrl.origin + link;
              } else {
                // Invalid or malformed URL
                console.warn(`⚠️ Skipping invalid URL: ${link}`);
                return;
              }

              // Validate the final URL
              new URL(absoluteUrl);

              items.push({
                title,
                url: absoluteUrl,
                source: new URL(content.url).hostname,
                snippet: description || title,
                publishedDate: new Date()
              });
            } catch (error) {
              console.warn(`⚠️ Invalid URL detected: ${link} - ${error.message}`);
            }
          }
        }
      });
      
      if (items.length >= 20) break;
    }
    
    return items;
  }

  async scrapeRSSFeeds(keywords, maxResults = 20) {
    // Target business and construction-specific RSS feeds for higher quality leads
    const rssFeeds = [
      'https://feeds.bloomberg.com/markets/news.rss',
      'https://feeds.reuters.com/reuters/businessNews',
      'https://www.cnbc.com/id/100003114/device/rss/rss.html',
      'https://feeds.feedburner.com/techcrunch/',
      'https://www.constructiondive.com/rss/',
      'https://www.enr.com/rss',
      'https://www.bizjournals.com/rss',
      'https://www.forbes.com/business/feed/',
      'https://www.marketwatch.com/rss/topstories',
      'https://feeds.bbci.co.uk/news/business/rss.xml',
      'https://www.reuters.com/rss/business',
      'https://www.bloomberg.com/feed/podcast/etf-report.xml'
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
          
          // Additional business relevance filters
          const businessTerms = ['development', 'construction', 'project', 'announcement', 'expansion', 'investment', 'planning', 'proposal', 'hotel', 'office', 'building', 'real estate'];
          const hasBusinessTerm = businessTerms.some(term => 
            lowerTitle.includes(term) || lowerDesc.includes(term)
          );
          
          if (hasKeyword && hasBusinessTerm) {
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
        
        if (allItems.length >= maxResults) break;
        
      } catch (error) {
        console.log(`❌ Error parsing RSS feed ${feedUrl}: ${error.message}`);
      }
    }
    
    // Sort by date and limit results
    return allItems
      .sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate))
      .slice(0, maxResults);
  }

  async close() {
    try {
      console.log('Scrapy Service closed');
    } catch (error) {
      console.error('Error closing Scrapy Service:', error);
    }
  }
}

module.exports = ScrapyService;
