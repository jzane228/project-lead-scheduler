# 🚀 Project Lead Scheduler - AI-Powered Lead Generation Platform

A comprehensive web-based platform that leverages AI to automatically discover and extract business leads from the internet. Built with React, Node.js, and OpenAI's GPT-4 for intelligent content analysis.

## ✨ Features

### 🔍 **Intelligent Web Scraping**
- **Multi-source scraping**: News sites, search engines, and custom websites
- **AI-powered lead extraction**: GPT-4 analyzes content to identify business opportunities
- **Keyword-based discovery**: User-defined keywords and industry-specific searches
- **Automated scheduling**: Hourly, daily, weekly, or monthly scraping intervals

### 📊 **Lead Management**
- **Structured lead data**: Company info, contact details, project descriptions
- **AI-extracted insights**: Estimated value, urgency, industry classification
- **Duplicate prevention**: Smart deduplication across sources
- **Lead scoring**: Priority and status management

### 💳 **Subscription Tiers**
- **Free**: 3 configs, 50 leads/month, daily scraping
- **Basic ($29/month)**: 10 configs, 200 leads/month, daily scraping
- **Premium ($99/month)**: 25 configs, 500 leads/month, hourly scraping
- **Enterprise ($299/month)**: 100 configs, unlimited leads, hourly scraping

### 🔧 **Configuration Management**
- **Flexible scraping rules**: Keywords, sources, frequency, location
- **Industry targeting**: Pre-defined industry categories
- **Custom search queries**: Advanced search syntax support
- **Real-time monitoring**: Active/inactive status, last run times

## 🏗️ Architecture

### Frontend (React)
- **Modern UI**: Tailwind CSS with Framer Motion animations
- **State Management**: React Query for server state
- **Routing**: React Router v6 with protected routes
- **Components**: Modular, reusable component architecture

### Backend (Node.js/Express)
- **RESTful API**: Comprehensive scraping and lead management endpoints
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT-based user authentication
- **Scheduling**: Node-cron for automated scraping jobs

### AI & Scraping
- **OpenAI Integration**: GPT-4 for intelligent content analysis
- **Web Scraping**: Puppeteer for dynamic content, Cheerio for static parsing
- **Multi-source**: Google, Bing, news sites, custom websites
- **Rate Limiting**: Respectful scraping with configurable delays

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- OpenAI API key
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd project-lead-scheduler
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**
   ```bash
   npm run setup:db
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

### Environment Variables

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lead_generator
DB_USER=your_username
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Scraping
SCRAPING_INTERVAL_MINUTES=60
MAX_CONCURRENT_SCRAPES=5
USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
```

## 📖 Usage Guide

### 1. **User Registration & Login**
- Create an account with email/password
- Select your industry and company details
- Choose your subscription plan

### 2. **Setting Up Scraping Configurations**
- Navigate to **Scraping** section
- Click **New Configuration**
- Configure:
  - **Name**: Descriptive name for your search
  - **Industry**: Target industry sector
  - **Keywords**: Search terms (e.g., "hiring developers", "seeking contractors")
  - **Sources**: Specific websites to monitor (optional)
  - **Frequency**: How often to run (hourly/daily/weekly/monthly)
  - **Max Results**: Limit per scraping run

### 3. **Monitoring & Management**
- **Dashboard**: Overview of leads, configurations, and exports
- **Active Configs**: View and manage running scraping jobs
- **Lead Review**: Examine discovered leads and their details
- **Export Setup**: Configure automated lead delivery

### 4. **Subscription Management**
- **Settings → Subscription**: View current plan and limits
- **Upgrade/Downgrade**: Change plans as needed
- **Usage Tracking**: Monitor configuration and lead limits

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh JWT token

### Scraping Configurations
- `GET /api/scraping/configs` - List user's configurations
- `POST /api/scraping/configs` - Create new configuration
- `PUT /api/scraping/configs/:id` - Update configuration
- `DELETE /api/scraping/configs/:id` - Delete configuration
- `PATCH /api/scraping/configs/:id/toggle` - Toggle active status

### Leads
- `GET /api/leads` - List discovered leads
- `GET /api/leads/:id` - Get specific lead details
- `PUT /api/leads/:id` - Update lead information

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

## 🗄️ Database Schema

### Core Tables
- **Users**: User accounts and subscription information
- **Industries**: Pre-defined industry categories
- **ScrapingConfigs**: Scraping configuration rules
- **Leads**: Discovered business opportunities
- **LeadSources**: Source tracking for leads
- **ExportSchedules**: Automated export configurations

### Key Relationships
- Users belong to Industries
- Users have many ScrapingConfigs
- ScrapingConfigs generate many Leads
- Leads are associated with LeadSources

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API request throttling
- **Input Validation**: Comprehensive request validation
- **SQL Injection Protection**: Sequelize ORM with parameterized queries
- **CORS Configuration**: Controlled cross-origin access

## 🚀 Deployment

### Production Considerations
- **Environment Variables**: Secure configuration management
- **Database**: Production PostgreSQL instance
- **Scraping Ethics**: Respect robots.txt and rate limits
- **Monitoring**: Log aggregation and performance monitoring
- **Backup**: Regular database backups

### Docker Support
```bash
# Build and run with Docker
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions

## 🔮 Roadmap

### Phase 2 Features
- **Advanced AI Processing**: Custom extraction rules
- **CRM Integrations**: Salesforce, HubSpot, Pipedrive
- **Email Automation**: Lead nurturing campaigns
- **Analytics Dashboard**: Lead performance metrics
- **Mobile App**: React Native mobile application

### Phase 3 Features
- **Machine Learning**: Predictive lead scoring
- **Advanced Scheduling**: Custom cron expressions
- **Webhook Support**: Real-time notifications
- **API Rate Limiting**: Tiered API access
- **Multi-tenant**: White-label solutions

---

**Built with ❤️ for business growth and lead generation automation**
