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
}

module.exports = WebScraper;


