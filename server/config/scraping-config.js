/**
 * Advanced Scraping Configuration
 * This file contains all the configuration for premium API integrations
 * and advanced scraping tactics.
 */

module.exports = {
  // Premium API Configuration
  apis: {
    newsapi: {
      enabled: process.env.NEWS_API_KEY ? true : false,
      key: process.env.NEWS_API_KEY,
      baseUrl: 'https://newsapi.org/v2',
      rateLimit: 100, // requests per day
      timeout: 10000
    },

    googleNews: {
      enabled: process.env.GOOGLE_API_KEY ? true : false,
      key: process.env.GOOGLE_API_KEY,
      searchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID || '017576662512468239146:omuauf_lfve',
      baseUrl: 'https://www.googleapis.com/customsearch/v1',
      rateLimit: 100, // Google Custom Search has lower limits
      timeout: 10000
    },

    bingNews: {
      enabled: process.env.BING_API_KEY ? true : false,
      key: process.env.BING_API_KEY,
      baseUrl: 'https://api.bing.microsoft.com/v7.0/news/search',
      rateLimit: 1000,
      timeout: 8000
    },

    deepseek: {
      enabled: process.env.DEEPSEEK_API_KEY ? true : false,
      key: process.env.DEEPSEEK_API_KEY,
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      maxTokens: 4000,
      temperature: 0.3
    }
  },

  // Scraping Configuration
  scraping: {
    usePremiumAPIs: process.env.USE_PREMIUM_APIS !== 'false',
    smartExtraction: process.env.SMART_EXTRACTION === 'true',
    rateLimit: parseInt(process.env.SCRAPING_RATE_LIMIT) || 10,
    timeout: parseInt(process.env.SCRAPING_TIMEOUT) || 10000,
    maxRetries: 3,
    userAgents: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0'
    ]
  },

  // Search Engines Configuration
  searchEngines: {
    google: {
      name: 'Google News Search',
      searchUrl: 'https://news.google.com/search?q={keywords}&hl=en-US&gl=US&ceid=US:en',
      enabled: true,
      priority: 1
    },

    bing: {
      name: 'Bing News Search',
      searchUrl: 'https://www.bing.com/news/search?q={keywords}',
      enabled: true,
      priority: 2
    },

    reuters: {
      name: 'Reuters Business',
      searchUrl: 'https://www.reuters.com/search/news?blob={keywords}&sortBy=relevance&dateRange=all',
      enabled: true,
      priority: 3
    },

    bloomberg: {
      name: 'Bloomberg Business',
      searchUrl: 'https://www.bloomberg.com/search?query={keywords}&sort=relevance',
      enabled: true,
      priority: 4
    },

    wsj: {
      name: 'Wall Street Journal',
      searchUrl: 'https://www.wsj.com/search?query={keywords}&isToggleOn=true&operator=AND&sortBy=relevance&source=wsjarticle,wsjblogs',
      enabled: true,
      priority: 5
    }
  },

  // Industry-Specific Sources
  industrySources: {
    construction: [
      {
        name: 'Construction Dive',
        searchUrl: 'https://www.constructiondive.com/search/?q={keywords}',
        category: 'construction'
      },
      {
        name: 'Engineering News Record',
        searchUrl: 'https://www.enr.com/search?q={keywords}',
        category: 'construction'
      }
    ],

    hospitality: [
      {
        name: 'Hotel News Now',
        searchUrl: 'https://www.hotelnewsnow.com/search?query={keywords}',
        category: 'hospitality'
      },
      {
        name: 'Hospitality Technology',
        searchUrl: 'https://hospitalitytech.com/search?query={keywords}',
        category: 'hospitality'
      }
    ],

    realEstate: [
      {
        name: 'Real Estate Weekly',
        searchUrl: 'https://rew-online.com/search/?q={keywords}',
        category: 'real estate'
      },
      {
        name: 'Commercial Property Executive',
        searchUrl: 'https://www.cpexecutive.com/search?q={keywords}',
        category: 'real estate'
      }
    ]
  },

  // Data Extraction Configuration
  extraction: {
    maxContacts: 3,
    confidenceThreshold: 70,
    patterns: {
      company: [
        /([A-Z][a-zA-Z\s&.,]+?)\s+(?:announces|launches|develops|constructs|expands|opens|plans|proposes)/i,
        /(?:announced by|developed by|constructed by|launched by)\s+([A-Z][a-zA-Z\s&.,]+?)(?:\s|$|,|\.)/i,
        /([A-Z][a-zA-Z\s&.,]+?)\s+(?:Inc|LLC|Corp|Corporation|Group|Holdings|Enterprises|Partners|Associates|Company|Ltd|Limited)/i
      ],

      location: [
        /([A-Z][a-zA-Z\s,]+?)\s+(?:hotel|resort|apartment|office|building|complex|development|project)/i,
        /(?:hotel|resort|apartment|office|building|complex|development|project)\s+(?:in|at|near)\s+([A-Z][a-zA-Z\s,]+?)(?:\s|$|,|\.)/i,
        /([A-Z][a-zA-Z\s]+?),\s*([A-Z]{2})/i
      ],

      budget: [
        /[\$]?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|K|m|M|b|B|thousand|million|billion)/i,
        /(?:budget|cost|investment|price|amount|value)\s*(?:of|:)?\s*[\$]?(\d+(?:,\d{3})*(?:\.\d{2})?)/i
      ],

      contact: {
        email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
        phone: /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
        name: /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+?)(?:\s*,?\s*(?:CEO|CTO|CFO|President|Director|Manager|VP))/gi
      }
    }
  },

  // Validation Configuration
  validation: {
    urlValidation: {
      required: true,
      checkHttps: true,
      blockPatterns: [
        /\/search/, /\/tag/, /\/category/, /\/author/, /\/page/,
        /\/feed/, /\/rss/, /\/comments/, /\/login/, /\/register/,
        /\.(jpg|jpeg|png|gif|pdf|doc|docx)$/i
      ]
    },

    contentValidation: {
      minTitleLength: 10,
      maxTitleLength: 200,
      minSnippetLength: 20,
      relevanceThreshold: 0.3
    }
  },

  // Anti-Detection Measures
  antiDetection: {
    enabled: true,
    delayBetweenRequests: 1000, // milliseconds
    randomDelay: true,
    rotateUserAgents: true,
    useProxies: process.env.PROXY_LIST ? true : false,
    proxies: process.env.PROXY_LIST ? process.env.PROXY_LIST.split(',') : []
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enablePerformanceMetrics: true,
    logFailedRequests: true,
    maxLogEntries: 1000
  }
};
