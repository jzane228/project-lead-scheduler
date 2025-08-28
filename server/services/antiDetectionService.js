const axios = require('axios');
const https = require('https');

/**
 * Advanced Anti-Detection Service
 * Implements sophisticated tactics to avoid bot detection
 * Features:
 * - Intelligent user agent rotation
 * - Proxy rotation with health checking
 * - Request throttling with randomization
 * - Header randomization
 * - Behavioral simulation
 * - Session management
 */
class AntiDetectionService {
  constructor(config) {
    this.config = config || {};
    this.userAgents = this.getAdvancedUserAgents();
    this.proxies = this.initializeProxies();
    this.sessions = new Map();
    this.requestHistory = new Map();

    // Performance tracking
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      blockedRequests: 0,
      averageDelay: 0,
      lastRequestTime: Date.now()
    };

    console.log('🛡️ Anti-Detection Service initialized');
    console.log(`   User agents: ${this.userAgents.length}`);
    console.log(`   Proxies: ${this.proxies.length}`);
  }

  /**
   * Advanced user agent collection with realistic signatures
   */
  getAdvancedUserAgents() {
    return [
      // Chrome Desktop
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

      // Firefox Desktop
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',

      // Safari Desktop
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',

      // Edge Desktop
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',

      // Mobile browsers
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',

      // Tablet browsers
      'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',

      // Older browsers for variety
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
    ];
  }

  /**
   * Initialize proxy list with health checking
   */
  initializeProxies() {
    const proxyList = this.config.antiDetection?.proxies || [];

    if (proxyList.length === 0) {
      console.log('⚠️ No proxies configured, using direct connections');
      return [];
    }

    const proxies = proxyList.map(proxy => ({
      url: proxy,
      health: 100, // Start with perfect health
      lastUsed: 0,
      failures: 0,
      successes: 0
    }));

    console.log(`✅ Initialized ${proxies.length} proxies`);
    return proxies;
  }

  /**
   * Get randomized headers for a request
   */
  getRandomizedHeaders(baseHeaders = {}) {
    const userAgent = this.getRandomUserAgent();

    return {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': this.getRandomAcceptLanguage(),
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': Math.random() > 0.5 ? '1' : undefined, // Do Not Track header
      'Cache-Control': 'max-age=0',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Sec-Ch-Ua-Mobile': this.isMobileUserAgent(userAgent) ? '?1' : '?0',
      'Sec-Ch-Ua-Platform': this.getPlatformFromUserAgent(userAgent),
      ...baseHeaders
    };
  }

  /**
   * Get random user agent
   */
  getRandomUserAgent() {
    const index = Math.floor(Math.random() * this.userAgents.length);
    return this.userAgents[index];
  }

  /**
   * Get random accept language
   */
  getRandomAcceptLanguage() {
    const languages = [
      'en-US,en;q=0.9',
      'en-US,en;q=0.9,es;q=0.8',
      'en-US,en;q=0.9,fr;q=0.8,de;q=0.7',
      'en-GB,en;q=0.9,en-US;q=0.8',
      'en-CA,en;q=0.9,en-US;q=0.8,fr-CA;q=0.7'
    ];

    return languages[Math.floor(Math.random() * languages.length)];
  }

  /**
   * Check if user agent is mobile
   */
  isMobileUserAgent(userAgent) {
    return userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('Android');
  }

  /**
   * Extract platform from user agent
   */
  getPlatformFromUserAgent(userAgent) {
    if (userAgent.includes('Windows')) return '"Windows"';
    if (userAgent.includes('Macintosh')) return '"macOS"';
    if (userAgent.includes('Linux')) return '"Linux"';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return '"iOS"';
    if (userAgent.includes('Android')) return '"Android"';
    return '"Unknown"';
  }

  /**
   * Get healthy proxy for request
   */
  getHealthyProxy() {
    if (this.proxies.length === 0) return null;

    // Filter healthy proxies (health > 50)
    const healthyProxies = this.proxies.filter(proxy => proxy.health > 50);

    if (healthyProxies.length === 0) {
      console.warn('⚠️ No healthy proxies available');
      return null;
    }

    // Select proxy with lowest recent usage
    const now = Date.now();
    healthyProxies.sort((a, b) => a.lastUsed - b.lastUsed);

    const selectedProxy = healthyProxies[0];
    selectedProxy.lastUsed = now;

    return selectedProxy;
  }

  /**
   * Calculate intelligent delay between requests
   */
  calculateDelay(targetUrl, isSameDomain = false) {
    const baseDelay = this.config.scraping?.rateLimit ? (60000 / this.config.scraping.rateLimit) : 2000;

    // Domain-based delays
    if (isSameDomain) {
      // Same domain - longer delay to avoid rate limiting
      return baseDelay * (2 + Math.random());
    }

    // Different domain - shorter delay
    return baseDelay * (0.5 + Math.random());
  }

  /**
   * Apply request throttling
   */
  async applyThrottling(targetUrl) {
    if (!this.config.antiDetection?.enabled) return;

    const now = Date.now();
    const timeSinceLastRequest = now - this.stats.lastRequestTime;

    // Extract domain for domain-based throttling
    const domain = this.extractDomain(targetUrl);
    const lastDomainRequest = this.requestHistory.get(domain) || 0;

    // Calculate required delays
    const globalDelay = this.calculateDelay(targetUrl, false);
    const domainDelay = this.calculateDelay(targetUrl, now - lastDomainRequest < 5000); // 5 second window

    const requiredDelay = Math.max(globalDelay, domainDelay);

    if (timeSinceLastRequest < requiredDelay) {
      const actualDelay = requiredDelay - timeSinceLastRequest;
      console.log(`⏱️ Throttling: waiting ${actualDelay.toFixed(0)}ms before next request`);
      await this.delay(actualDelay);
    }

    // Update request history
    this.requestHistory.set(domain, now);
    this.stats.lastRequestTime = now;
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Make request with anti-detection measures
   */
  async makeRequest(url, options = {}) {
    if (!this.config.antiDetection?.enabled) {
      // Fallback to regular axios request
      return await axios.get(url, options);
    }

    // Apply throttling
    await this.applyThrottling(url);

    // Get randomized headers
    const headers = this.getRandomizedHeaders(options.headers || {});

    // Get healthy proxy
    const proxy = this.getHealthyProxy();

    // Prepare request configuration
    const requestConfig = {
      ...options,
      headers,
      timeout: options.timeout || this.config.scraping?.timeout || 10000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500 // Accept 4xx errors for analysis
    };

    // Add proxy if available
    if (proxy) {
      requestConfig.proxy = {
        host: proxy.url.split(':')[0],
        port: parseInt(proxy.url.split(':')[1])
      };
    }

    // Add HTTPS agent for better SSL handling
    requestConfig.httpsAgent = new https.Agent({
      rejectUnauthorized: false, // Handle self-signed certificates
      keepAlive: true,
      timeout: requestConfig.timeout
    });

    this.stats.totalRequests++;

    try {
      const response = await axios.get(url, requestConfig);

      // Update proxy health on success
      if (proxy) {
        proxy.successes++;
        proxy.health = Math.min(100, proxy.health + 5);
      }

      this.stats.successfulRequests++;
      return response;

    } catch (error) {
      // Update proxy health on failure
      if (proxy) {
        proxy.failures++;
        proxy.health = Math.max(0, proxy.health - 10);
      }

      this.stats.blockedRequests++;

      // Analyze error for anti-detection insights
      if (error.response) {
        const statusCode = error.response.status;

        if (statusCode === 403) {
          console.warn(`🚫 Access forbidden for ${url} - possible bot detection`);
        } else if (statusCode === 429) {
          console.warn(`⏱️ Rate limited for ${url} - increasing delay`);
          // Increase delay for this domain
          const domain = this.extractDomain(url);
          this.requestHistory.set(domain, Date.now() + 30000); // 30 second penalty
        }
      }

      throw error;
    }
  }

  /**
   * Create realistic browsing session
   */
  createSession(domain) {
    const sessionId = `${domain}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session = {
      id: sessionId,
      domain,
      startTime: Date.now(),
      requests: 0,
      userAgent: this.getRandomUserAgent(),
      cookies: {},
      referer: null
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get or create session for domain
   */
  getSessionForDomain(domain) {
    // Look for existing session for this domain
    for (const [sessionId, session] of this.sessions) {
      if (session.domain === domain && session.requests < 10) { // Limit requests per session
        return session;
      }
    }

    // Create new session
    return this.createSession(domain);
  }

  /**
   * Simulate human-like browsing behavior
   */
  async simulateHumanBehavior(session, url) {
    if (!session) return;

    session.requests++;

    // Random mouse movements (simulated in logs)
    if (Math.random() > 0.7) {
      console.log(`🖱️ Simulating mouse movement for session ${session.id}`);
      await this.delay(Math.random() * 1000);
    }

    // Random scrolling
    if (Math.random() > 0.8) {
      console.log(`📜 Simulating scroll for session ${session.id}`);
      await this.delay(Math.random() * 2000);
    }

    // Update session referer
    session.referer = url;
  }

  /**
   * Get comprehensive anti-detection statistics
   */
  getStats() {
    const successRate = this.stats.totalRequests > 0
      ? (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2)
      : 0;

    const blockRate = this.stats.totalRequests > 0
      ? (this.stats.blockedRequests / this.stats.totalRequests * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      successRate: `${successRate}%`,
      blockRate: `${blockRate}%`,
      activeSessions: this.sessions.size,
      healthyProxies: this.proxies.filter(p => p.health > 50).length,
      totalProxies: this.proxies.length
    };
  }

  /**
   * Clean up old sessions
   */
  cleanupSessions() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, session] of this.sessions) {
      if (now - session.startTime > maxAge) {
        this.sessions.delete(sessionId);
      }
    }

    console.log(`🧹 Cleaned up sessions, ${this.sessions.size} active remaining`);
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for proxies
   */
  async healthCheckProxies() {
    if (this.proxies.length === 0) return;

    console.log('🔍 Performing proxy health check...');

    for (const proxy of this.proxies) {
      try {
        const testUrl = 'https://httpbin.org/ip';
        const startTime = Date.now();

        await axios.get(testUrl, {
          proxy: {
            host: proxy.url.split(':')[0],
            port: parseInt(proxy.url.split(':')[1])
          },
          timeout: 5000
        });

        const responseTime = Date.now() - startTime;
        proxy.health = Math.min(100, proxy.health + 10);
        proxy.responseTime = responseTime;

      } catch (error) {
        proxy.health = Math.max(0, proxy.health - 20);
        console.warn(`⚠️ Proxy ${proxy.url} health decreased to ${proxy.health}%`);
      }
    }

    const healthyCount = this.proxies.filter(p => p.health > 50).length;
    console.log(`✅ Proxy health check complete: ${healthyCount}/${this.proxies.length} healthy`);
  }

  /**
   * Advanced request with full anti-detection suite
   */
  async makeAdvancedRequest(url, options = {}) {
    const domain = this.extractDomain(url);
    const session = this.getSessionForDomain(domain);

    // Apply all anti-detection measures
    await this.applyThrottling(url);
    await this.simulateHumanBehavior(session, url);

    // Get comprehensive headers
    const headers = this.getRandomizedHeaders(options.headers || {});
    headers['Referer'] = session.referer || 'https://www.google.com/';

    // Make the request
    const enhancedOptions = {
      ...options,
      headers
    };

    return await this.makeRequest(url, enhancedOptions);
  }
}

module.exports = AntiDetectionService;
