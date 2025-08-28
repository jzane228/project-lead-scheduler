const axios = require('axios');
const cheerio = require('cheerio');
const { Lead, LeadSource } = require('../models');

class ScrapyService {
  constructor() {
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
    ];
    this.timeout = 30000;
    this.maxRetries = 3;
    this.fallbackMethods = ['direct', 'puppeteer', 'proxy'];
  }

  async initialize() {
    console.log('🕷️ Initializing Scrapy Service...');
    try {
      // Optional test - don't fail server startup if this fails
      const testUrl = 'https://httpbin.org/html';
      const testPromise = this.scrapeWithDirectHTTP(testUrl);

      // Set a timeout for the test
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Test timeout')), 5000)
      );

      await Promise.race([testPromise, timeoutPromise]);
      console.log('✅ Scrapy Service initialized successfully');
      return true;
    } catch (error) {
      console.warn('⚠️ Scrapy Service test failed, but service will continue:', error.message);
      console.log('✅ Scrapy Service initialized (test skipped)');
      return true; // Don't fail server startup
    }
  }

  async scrapeWithScrapy(url, options = {}) {
    console.log(`🕷️ Scraping with Scrapy: ${url}`);

    const errors = [];

    // Method 1: Try Scrapy Cloud API if available
    if (process.env.SCRAPY_CLOUD_API_KEY) {
      try {
        console.log(`🔧 Attempting Scrapy Cloud API...`);
        return await this.scrapeWithScrapyCloud(url, options);
      } catch (error) {
        console.warn(`⚠️ Scrapy Cloud failed: ${error.message}`);
        errors.push({ method: 'scrapy_cloud', error: error.message });
      }
    }

    // Method 2: Try direct HTTP with rotating user agents
    try {
      console.log(`🔧 Attempting direct HTTP with fallback strategies...`);
      return await this.scrapeWithFallbackStrategies(url, options);
    } catch (error) {
      console.warn(`⚠️ Direct HTTP fallback failed: ${error.message}`);
      errors.push({ method: 'direct_http', error: error.message });
    }

    // Method 3: Try Puppeteer browser automation
    try {
      console.log(`🔧 Attempting Puppeteer browser automation...`);
      return await this.scrapeWithPuppeteer(url, options);
    } catch (error) {
      console.warn(`⚠️ Puppeteer failed: ${error.message}`);
      errors.push({ method: 'puppeteer', error: error.message });
    }

    // Method 4: Try with proxy rotation
    try {
      console.log(`🔧 Attempting proxy rotation...`);
      return await this.scrapeWithProxyRotation(url, options);
    } catch (error) {
      console.warn(`⚠️ Proxy rotation failed: ${error.message}`);
      errors.push({ method: 'proxy', error: error.message });
    }

    // All methods failed
    const errorMessage = `All scraping methods failed for ${url}. Errors: ${errors.map(e => `${e.method}: ${e.error}`).join(', ')}`;
    console.error(`❌ ${errorMessage}`);
    throw new Error(errorMessage);
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

    async scrapeWithFallbackStrategies(url, options = {}) {
    const errors = [];

    // Strategy 1: Try with different user agents
    for (let i = 0; i < Math.min(this.userAgents.length, 3); i++) {
      try {
        const headers = {
          'User-Agent': this.userAgents[i],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1'
        };

        const response = await axios.get(url, {
          headers,
          timeout: this.timeout,
          maxRedirects: 5,
          validateStatus: (status) => status < 400,
          responseType: 'text',
          // Add random delay to simulate human behavior
          ...options
        });

        let htmlContent = response.data;
        if (typeof htmlContent !== 'string') {
          if (Buffer.isBuffer(htmlContent)) {
            htmlContent = htmlContent.toString('utf-8');
          } else {
            htmlContent = String(htmlContent || '');
          }
        }

        if (htmlContent && htmlContent.trim().length > 50) {
          console.log(`✅ User agent ${i + 1} succeeded`);
          return this.parseScrapyResponse(htmlContent, url);
        }
      } catch (error) {
        errors.push(`User agent ${i + 1}: ${error.message}`);
      }
    }

    // Strategy 2: Try with minimal headers
    try {
      const minimalHeaders = {
        'User-Agent': this.userAgents[0],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      };

      const response = await axios.get(url, {
        headers: minimalHeaders,
        timeout: this.timeout,
        maxRedirects: 5,
        responseType: 'text'
      });

      let htmlContent = response.data;
      if (typeof htmlContent !== 'string') {
        htmlContent = String(htmlContent || '');
      }

      if (htmlContent && htmlContent.trim().length > 50) {
        console.log(`✅ Minimal headers succeeded`);
        return this.parseScrapyResponse(htmlContent, url);
      }
    } catch (error) {
      errors.push(`Minimal headers: ${error.message}`);
    }

    // Strategy 3: Try without common blocking headers
    try {
      const basicHeaders = {
        'User-Agent': this.userAgents[0],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      };

      const response = await axios.get(url, {
        headers: basicHeaders,
        timeout: this.timeout * 2, // Longer timeout
        maxRedirects: 3,
        responseType: 'text'
      });

      let htmlContent = response.data;
      if (typeof htmlContent !== 'string') {
        htmlContent = String(htmlContent || '');
      }

      if (htmlContent && htmlContent.trim().length > 50) {
        console.log(`✅ Basic headers succeeded`);
        return this.parseScrapyResponse(htmlContent, url);
      }
    } catch (error) {
      errors.push(`Basic headers: ${error.message}`);
    }

    throw new Error(`All fallback strategies failed: ${errors.join(', ')}`);
  }

  async scrapeWithPuppeteer(url, options = {}) {
    try {
      // Import puppeteer dynamically to avoid issues if not installed
      const puppeteer = require('puppeteer');

      const browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      const page = await browser.newPage();

      // Set random viewport
      await page.setViewport({
        width: 1366 + Math.floor(Math.random() * 200),
        height: 768 + Math.floor(Math.random() * 200)
      });

      // Set random user agent
      const randomUserAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
      await page.setUserAgent(randomUserAgent);

      // Navigate with timeout
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.timeout * 2
      });

      // Wait a random amount to simulate human behavior
      await page.waitForTimeout(1000 + Math.random() * 2000);

      // Get the HTML content
      const content = await page.content();

      await browser.close();

      if (content && content.trim().length > 50) {
        console.log(`✅ Puppeteer scraping succeeded`);
        return this.parseScrapyResponse(content, url);
      } else {
        throw new Error('Puppeteer returned insufficient content');
      }
    } catch (error) {
      console.error(`❌ Puppeteer scraping failed:`, error.message);
      throw error;
    }
  }

  async scrapeWithProxyRotation(url, options = {}) {
    // This would require proxy service integration
    // For now, fall back to direct HTTP with different approach
    console.log(`🔄 Proxy rotation not configured, using enhanced direct HTTP...`);

    const headers = {
      'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)],
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    const response = await axios.get(url, {
      headers,
      timeout: this.timeout * 3,
      maxRedirects: 3,
      responseType: 'text',
      // Add random query parameter to avoid caching
      params: { _t: Date.now() }
    });

    let htmlContent = response.data;
    if (typeof htmlContent !== 'string') {
      htmlContent = String(htmlContent || '');
    }

    if (htmlContent && htmlContent.trim().length > 50) {
      console.log(`✅ Enhanced direct HTTP succeeded`);
      return this.parseScrapyResponse(htmlContent, url);
    } else {
      throw new Error('Enhanced direct HTTP returned insufficient content');
    }
  }

  async scrapeWithDirectHTTP(url, options = {}) {
    // Use the new fallback strategies as the primary method
    return await this.scrapeWithFallbackStrategies(url, options);
  }

  parseScrapyResponse(html, url) {
    try {
      // Validate HTML content
      if (!html || typeof html !== 'string' || html.trim().length === 0) {
        throw new Error('Invalid or empty HTML content');
      }

      // Check if this is a redirect or error page
      if (html.includes('404') || html.includes('Not Found') || html.includes('403')) {
        throw new Error('Page not found or access denied');
      }

      const $ = cheerio.load(html);

      // Remove script and style elements
      $('script, style, noscript, iframe, nav, footer, header, .advertisement, .sidebar').remove();

      // Extract main content with multiple fallback strategies
      let mainContent = $('main, article, .content, .post, .entry, .main, .body, .article-content, .story-content');

      if (mainContent.length === 0) {
        mainContent = $('body');
      }

      // Extract title with multiple fallbacks
      const title = $('title').text().trim() ||
                   $('h1').first().text().trim() ||
                   $('meta[property="og:title"]').attr('content') ||
                   $('meta[name="title"]').attr('content') ||
                   $('[data-title]').attr('data-title') ||
                   'Untitled Article';

      // Extract description with multiple fallbacks
      const description = $('meta[name="description"]').attr('content') ||
                         $('meta[property="og:description"]').attr('content') ||
                         $('meta[name="twitter:description"]').attr('content') ||
                         $('p').first().text().trim() ||
                         '';

      // Extract text content
      let text = mainContent.text().replace(/\s+/g, ' ').trim();

      // If main content is too short, try extracting from all paragraphs
      if (text.length < 200) {
        const allParagraphs = $('p').map((i, p) => $(p).text().trim()).get().join(' ');
        if (allParagraphs.length > text.length) {
          text = allParagraphs;
        }
      }

      // Extract meta information
      const meta = {
        description: description,
        keywords: $('meta[name="keywords"]').attr('content') || '',
        author: $('meta[name="author"]').attr('content') ||
                $('meta[property="article:author"]').attr('content') || '',
        publishedTime: $('meta[property="article:published_time"]').attr('content') ||
                      $('time').attr('datetime') ||
                      $('[itemprop="datePublished"]').attr('content') || '',
        ogTitle: $('meta[property="og:title"]').attr('content') || '',
        ogDescription: $('meta[property="og:description"]').attr('content') || '',
        ogImage: $('meta[property="og:image"]').attr('content') || '',
        ogUrl: $('meta[property="og:url"]').attr('content') || ''
      };

      // Ensure we have substantial content
      if (text.length < 50) {
        throw new Error('Insufficient content extracted');
      }

      return {
        title,
        url, // Always provide the source URL
        text: text.substring(0, 15000), // Increased limit for better content
        html: mainContent.html() || html,
        meta,
        scrapedAt: new Date(),
        success: true
      };
    } catch (error) {
      console.error(`❌ Error parsing Scrapy response for ${url}:`, error.message);

      // Return minimal but valid response with URL
      return {
        title: 'Content extraction failed',
        url, // Always provide the source URL
        text: `Failed to extract content: ${error.message}`,
        html: '',
        meta: {},
        scrapedAt: new Date(),
        success: false,
        error: error.message
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
