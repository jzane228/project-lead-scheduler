const { sequelize, Industry, User } = require('../models');

const sampleIndustries = [
  {
    name: 'Technology',
    description: 'Software development, IT services, and technology consulting',
    commonKeywords: ['software', 'development', 'IT', 'technology', 'digital', 'web', 'mobile', 'cloud'],
    suggestedSources: [
      'https://techcrunch.com',
      'https://venturebeat.com',
      'https://www.theverge.com',
      'https://www.wired.com'
    ]
  },
  {
    name: 'Healthcare',
    description: 'Medical services, pharmaceuticals, and healthcare technology',
    commonKeywords: ['healthcare', 'medical', 'pharmaceutical', 'biotech', 'telemedicine', 'health tech'],
    suggestedSources: [
      'https://www.healthcareitnews.com',
      'https://www.fiercebiotech.com',
      'https://www.mobihealthnews.com'
    ]
  },
  {
    name: 'Finance',
    description: 'Banking, fintech, and financial services',
    commonKeywords: ['fintech', 'banking', 'financial', 'payments', 'lending', 'insurance', 'investment'],
    suggestedSources: [
      'https://www.finextra.com',
      'https://www.fintechfutures.com',
      'https://www.americanbanker.com'
    ]
  },
  {
    name: 'Manufacturing',
    description: 'Industrial manufacturing and supply chain',
    commonKeywords: ['manufacturing', 'industrial', 'supply chain', 'automation', 'logistics', 'production'],
    suggestedSources: [
      'https://www.industryweek.com',
      'https://www.manufacturingtomorrow.com',
      'https://www.automationworld.com'
    ]
  },
  {
    name: 'Real Estate',
    description: 'Property development, construction, and real estate services',
    commonKeywords: ['real estate', 'construction', 'property', 'development', 'architecture', 'engineering'],
    suggestedSources: [
      'https://www.bisnow.com',
      'https://www.commercialobserver.com',
      'https://www.globest.com'
    ]
  },
  {
    name: 'Education',
    description: 'Educational technology and learning services',
    commonKeywords: ['edtech', 'education', 'learning', 'training', 'online learning', 'e-learning'],
    suggestedSources: [
      'https://www.edsurge.com',
      'https://www.educationdive.com',
      'https://www.insidehighered.com'
    ]
  },
  {
    name: 'Marketing & Advertising',
    description: 'Digital marketing, advertising, and creative services',
    commonKeywords: ['marketing', 'advertising', 'digital marketing', 'creative', 'branding', 'social media'],
    suggestedSources: [
      'https://www.adweek.com',
      'https://www.marketingdive.com',
      'https://www.campaignlive.com'
    ]
  },
  {
    name: 'E-commerce',
    description: 'Online retail and e-commerce platforms',
    commonKeywords: ['e-commerce', 'retail', 'online shopping', 'marketplace', 'dropshipping', 'digital commerce'],
    suggestedSources: [
      'https://www.digitalcommerce360.com',
      'https://www.pymnts.com',
      'https://www.retailwire.com'
    ]
  },
  {
    name: 'Consulting',
    description: 'Business consulting and professional services',
    commonKeywords: ['consulting', 'business', 'strategy', 'management', 'professional services', 'advisory'],
    suggestedSources: [
      'https://www.consulting.com',
      'https://www.strategy-business.com',
      'https://www.mckinsey.com'
    ]
  },
  {
    name: 'Energy & Utilities',
    description: 'Renewable energy, utilities, and sustainability',
    commonKeywords: ['energy', 'renewable', 'sustainability', 'utilities', 'clean tech', 'green energy'],
    suggestedSources: [
      'https://www.greentechmedia.com',
      'https://www.utilitydive.com',
      'https://www.renewableenergyworld.com'
    ]
  }
];

async function setupDatabase() {
  try {
    console.log('Setting up database...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync database models
    await sequelize.sync({ force: true }); // This will drop and recreate all tables
    console.log('Database models synchronized.');
    
    // Insert sample industries
    console.log('Inserting sample industries...');
    for (const industry of sampleIndustries) {
      await Industry.create(industry);
    }
    console.log(`Inserted ${sampleIndustries.length} industries.`);
    
    // Create a sample admin user
    console.log('Creating sample admin user...');
    const adminUser = await User.create({
      email: 'admin@example.com',
      password: 'admin123',
      first_name: 'Admin',
      last_name: 'User',
      company: 'Lead Generator',
      subscription_tier: 'enterprise',
      max_leads_per_month: 10000,
      max_scraping_configs: 50
    });
    
    // Associate admin user with Technology industry
    const techIndustry = await Industry.findOne({ where: { name: 'Technology' } });
    if (techIndustry) {
      await adminUser.setIndustry(techIndustry);
    }
    
    console.log('Sample admin user created: admin@example.com / admin123');
    
    console.log('Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start the server: npm run server:dev');
    console.log('2. Start the client: npm run client:dev');
    console.log('3. Login with: admin@example.com / admin123');
    
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
