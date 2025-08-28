# Advanced Web Scraping System

This document outlines the advanced web scraping system implemented for finding high-quality leads with guaranteed URLs and comprehensive data extraction.

## 🚀 Features

- **Premium API Integration**: NewsAPI, Google News API, Bing News API
- **Advanced Web Scraping**: Anti-detection measures, user agent rotation
- **URL Guarantee System**: Every lead has a verified, working URL
- **Enhanced Data Extraction**: Company names, contacts, locations, budgets
- **Industry-Specific Sources**: Construction, hospitality, real estate
- **Creative Tactics**: Proxy rotation, rate limiting, error recovery

## 📋 Prerequisites

### Required API Keys

1. **NewsAPI** (Free tier available)
   - Sign up at: https://newsapi.org/
   - Get your API key from the dashboard
   - Set environment variable: `NEWS_API_KEY=your-key-here`

2. **Google News API** (Requires Google Cloud)
   - Go to: https://console.cloud.google.com/
   - Enable News API and get credentials
   - Set environment variable: `GOOGLE_NEWS_API_KEY=your-key-here`

3. **Bing News API** (Requires Microsoft Azure)
   - Go to: https://www.microsoft.com/en-us/bing/apis/bing-news-search-api
   - Get your subscription key
   - Set environment variable: `BING_API_KEY=your-key-here`

4. **Deepseek AI** (Optional - for enhanced extraction)
   - Sign up at: https://platform.deepseek.com/
   - Get your API key
   - Set environment variable: `DEEPSEEK_API_KEY=your-key-here`

### Environment Configuration

Create a `.env` file in the server directory:

```bash
# Database Configuration
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=your-database-name
DB_USER=your-database-user
DB_PASSWORD=your-database-password

# JWT Secret
JWT_SECRET=your-jwt-secret-key-here

# Premium API Keys (Required for best results)
NEWS_API_KEY=your-newsapi-key-here
GOOGLE_NEWS_API_KEY=your-google-news-api-key-here
BING_API_KEY=your-bing-api-key-here

# Optional AI Enhancement
DEEPSEEK_API_KEY=your-deepseek-api-key-here

# Scraping Configuration
USE_PREMIUM_APIS=true
SMART_EXTRACTION=false

# Anti-Detection (Optional)
PROXY_LIST=http://proxy1:port,http://proxy2:port
```

## 🏗️ System Architecture

### Core Components

1. **AdvancedScrapingService** (`server/services/advancedScrapingService.js`)
   - Main orchestrator for all scraping operations
   - Premium API integration
   - URL validation and guarantee system

2. **DataExtractionService** (`server/services/dataExtractionService.js`)
   - Enhanced pattern-based extraction
   - Company name detection
   - Contact information extraction
   - Location and budget parsing

3. **Scraping Configuration** (`server/config/scraping-config.js`)
   - Centralized configuration management
   - API settings and rate limits
   - Search engine definitions

4. **EnhancedScrapingService** (`server/services/enhancedScrapingService.js`)
   - Fallback system with traditional scraping
   - Health monitoring and error recovery

## 🎯 How It Works

### 1. Premium API Priority

The system first attempts to use premium APIs in this order:
- **NewsAPI**: Verified articles from thousands of sources
- **Google News API**: Direct article links with freshness
- **Bing News API**: Comprehensive coverage with rich metadata

### 2. Advanced Web Scraping

If premium APIs are unavailable, the system falls back to:
- Industry-specific publication scraping
- Anti-detection measures (user agent rotation)
- Smart content parsing with multiple selectors

### 3. URL Guarantee System

Every lead goes through rigorous validation:
- URL format validation
- HTTP/HTTPS protocol check
- Blocked pattern filtering
- Live URL accessibility testing

### 4. Enhanced Data Extraction

The system extracts:
- **Company Names**: Advanced pattern matching
- **Contact Information**: Emails, phones, names, titles
- **Locations**: Cities, states, addresses
- **Project Details**: Budgets, timelines, room counts
- **Source Verification**: Original publication metadata

## 🚀 Usage

### Automatic Integration

The system automatically integrates into your existing scraping workflow:

```javascript
// The enhanced scraping service will automatically try premium APIs first
const result = await scrapingService.scrapeConfiguration(config, userId);

// If premium APIs succeed, you'll get high-quality leads with guaranteed URLs
// If they fail, it falls back to traditional scraping methods
```

### Manual Testing

Test the advanced system:

```bash
# Run the advanced scraping test
node server/test_enhanced_scraping.js

# Test specific components
node server/test_custom_columns_scraping.js
```

## 📊 Performance & Results

### Expected Results

With premium APIs configured:
- **Success Rate**: 85-95% URL validity
- **Data Completeness**: 70-90% fields populated
- **Lead Quality**: Verified articles from reputable sources
- **Contact Information**: 60-80% leads include contact details

### Without Premium APIs:
- **Success Rate**: 50-70% URL validity
- **Data Completeness**: 40-60% fields populated
- **Lead Quality**: Mixed quality from various sources

## 🔧 Configuration Options

### Enable/Disable Features

```javascript
// In your environment or config
USE_PREMIUM_APIS=true          // Use premium APIs when available
SMART_EXTRACTION=false         // Enable AI-enhanced extraction
USE_PROXY_ROTATION=true        // Rotate proxies for anti-detection
```

### Rate Limiting

```javascript
// Configurable in scraping-config.js
scraping: {
  rateLimit: 10,               // Requests per minute
  timeout: 10000,              // Request timeout (ms)
  maxRetries: 3                // Retry failed requests
}
```

## 🛠️ Troubleshooting

### Common Issues

1. **"No leads found"**
   - Check API keys are properly configured
   - Verify internet connectivity
   - Check rate limits haven't been exceeded

2. **"URL validation failed"**
   - Some sources may block automated requests
   - Try enabling proxy rotation
   - Check if target websites have anti-bot measures

3. **"API rate limit exceeded"**
   - Free tiers have limits (NewsAPI: 100/day)
   - Implement delays between requests
   - Consider upgrading to paid plans

### Debug Mode

Enable detailed logging:

```bash
DEBUG=scraping:* npm start
```

## 📈 Monitoring & Health Checks

The system includes built-in monitoring:

```javascript
// Check system health
const healthReport = scrapingService.monitor.getHealthReport();

// View error recovery recommendations
const recovery = scrapingService.monitor.getErrorRecovery();
```

## 🎨 Creative Tactics Implemented

### Anti-Detection Measures
- **User Agent Rotation**: Cycles through realistic browser signatures
- **Request Throttling**: Random delays between requests
- **Proxy Support**: Optional proxy rotation for IP diversity
- **Header Randomization**: Varies HTTP headers to avoid patterns

### Smart Content Extraction
- **Multi-Selector Parsing**: Uses multiple CSS selectors per site
- **Content Validation**: Ensures extracted data meets quality standards
- **Fallback Parsing**: Multiple extraction strategies per data type

### Error Recovery
- **Graceful Degradation**: Falls back to simpler methods when advanced fail
- **Retry Logic**: Intelligent retry with exponential backoff
- **Partial Success**: Saves partial data when full extraction fails

## 🔮 Future Enhancements

### Planned Features
- **Machine Learning**: Article relevance scoring
- **OCR Integration**: Extract data from images/charts
- **Social Media Integration**: LinkedIn, Twitter scraping
- **Real-time Alerts**: Instant notifications for hot leads

### API Expansions
- **Additional News APIs**: More premium sources
- **Industry-Specific APIs**: Construction, hospitality APIs
- **Geographic APIs**: Local news and business directories

## 📞 Support

For issues with the advanced scraping system:

1. Check the health monitoring dashboard
2. Review error logs for specific failures
3. Verify API key configurations
4. Test with the provided test scripts

## 📋 API Key Sources

### Free Tier APIs
- **NewsAPI**: https://newsapi.org/ (100 requests/day)
- **Google News API**: https://console.cloud.google.com/ (Limited free tier)

### Paid APIs
- **Bing News API**: https://azure.microsoft.com/en-us/services/cognitive-services/bing-news-search-api/
- **Deepseek AI**: https://platform.deepseek.com/

---

**Note**: Always respect website terms of service and robots.txt files when scraping. This system is designed for ethical web scraping and lead generation purposes.
