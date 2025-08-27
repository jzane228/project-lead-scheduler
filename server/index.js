const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const scrapingRoutes = require('./routes/scraping');
const leadsRoutes = require('./routes/leads');
const exportRoutes = require('./routes/export');
const crmRoutes = require('./routes/crm');
const dashboardRoutes = require('./routes/dashboard');
const industryRoutes = require('./routes/industries');
const tagsRoutes = require('./routes/tags');
const settingsRoutes = require('./routes/settings');
const columnsRoutes = require('./routes/columns');

// Import database connection
const { sequelize } = require('./models');
// Import services
const SchedulerService = require('./services/schedulerService');

// Security middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests from any origin in production
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // Allow all origins in production for now
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased for development
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint (no database required)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Railway health check endpoint (no database required)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Test endpoint (no database required)
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Server is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/scraping', scrapingRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/industries', industryRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/columns', columnsRoutes);
app.use('/api/analytics', require('./routes/analytics'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize scheduler service
const schedulerService = new SchedulerService();

// Seed industries data
const seedIndustries = async () => {
  const { Industry } = require('./models');
  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Real Estate',
    'Manufacturing',
    'Retail',
    'Construction',
    'Transportation',
    'Food & Beverage',
    'Entertainment',
    'Energy',
    'Agriculture',
    'Consulting',
    'Legal Services',
    'Marketing',
    'Human Resources',
    'Research & Development',
    'Government',
    'Non-profit'
  ];

  for (const industryName of industries) {
    try {
      await Industry.findOrCreate({
        where: { name: industryName },
        defaults: { name: industryName }
      });
    } catch (error) {
      console.log(`Industry ${industryName} already exists or error:`, error.message);
    }
  }
  console.log('Industries seeded successfully');
};

// Start server
const startServer = async () => {
  try {
    // Test database connection
    console.log('Attempting database connection...');
    console.log(`DB_HOST: ${process.env.DB_HOST}`);
    console.log(`DB_PORT: ${process.env.DB_PORT}`);
    console.log(`DB_NAME: ${process.env.DB_NAME}`);
    console.log(`DB_USER: ${process.env.DB_USER ? '***' : 'NOT SET'}`);

    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync database models (only in development, not in production)
    if (process.env.NODE_ENV !== 'production') {
      console.log('Syncing database models...');
      await sequelize.sync({ alter: true });
      console.log('Database models synchronized.');
    } else {
      console.log('Production environment: skipping database sync');
    }

    // Seed industries data
    console.log('Seeding industries data...');
    await seedIndustries();

    // Initialize scheduler (with error handling)
    console.log('Initializing scheduler...');
    try {
      await schedulerService.initialize();
      console.log('Scheduler initialized successfully');
    } catch (error) {
      console.error('Scheduler initialization failed:', error.message);
      console.log('Continuing without scheduler...');
    }

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received, shutting down gracefully`);

      server.close(async () => {
        console.log('HTTP server closed');

        try {
          await schedulerService.close();
          console.log('Scheduler service closed');

          await sequelize.close();
          console.log('Database connection closed');

          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);

    // Don't exit in production, try to start server anyway
    if (process.env.NODE_ENV === 'production') {
      console.log('Attempting to start server without database connection...');
      const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} (without database)`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
      });
    } else {
      process.exit(1);
    }
  }
};

startServer();
