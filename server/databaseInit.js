const { sequelize, User, Column, Contact, Lead, LeadSource, Tag } = require('./models');

async function initializeDatabase() {
  console.log('🚀 Initializing database tables and default data...');

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Sync all models (create tables if they don't exist)
    console.log('📊 Creating/updating database tables...');

    // Sync in order to handle dependencies
    await User.sync();
    console.log('✅ Users table ready');

    await LeadSource.sync();
    console.log('✅ LeadSources table ready');

    await Lead.sync();
    console.log('✅ Leads table ready');

    await Tag.sync();
    console.log('✅ Tags table ready');

    // Create Column table if it doesn't exist
    try {
      await sequelize.query('SELECT 1 FROM "Columns" LIMIT 1');
      console.log('✅ Columns table already exists');
    } catch (error) {
      console.log('📊 Creating Columns table...');
      await Column.sync({ force: true });
      console.log('✅ Columns table created');

      // Create default columns for all existing users
      const users = await User.findAll();
      for (const user of users) {
        try {
          await Column.createDefaultColumns(user.id);
          console.log(`📝 Created default columns for user: ${user.email}`);
        } catch (error) {
          console.log(`⚠️ Could not create default columns for user ${user.email}: ${error.message}`);
        }
      }
    }

    // Create Contact table if it doesn't exist
    try {
      await sequelize.query('SELECT 1 FROM "Contacts" LIMIT 1');
      console.log('✅ Contacts table already exists');
    } catch (error) {
      console.log('👥 Creating Contacts table...');
      await Contact.sync({ force: true });
      console.log('✅ Contacts table created');
    }

    // Create junction tables
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "LeadColumns" (
        "lead_id" UUID REFERENCES "Leads"("id") ON DELETE CASCADE,
        "column_id" UUID REFERENCES "Columns"("id") ON DELETE CASCADE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY ("lead_id", "column_id")
      );
    `);
    console.log('✅ LeadColumns junction table ready');

    console.log('🎉 Database initialization completed successfully!');

    // Log table counts
    try {
      const userCount = await User.count();
      const leadCount = await Lead.count();
      const columnCount = await Column.count();
      const contactCount = await Contact.count();

      console.log('📈 Database Summary:');
      console.log(`   Users: ${userCount}`);
      console.log(`   Leads: ${leadCount}`);
      console.log(`   Columns: ${columnCount}`);
      console.log(`   Contacts: ${contactCount}`);
    } catch (error) {
      console.log('⚠️ Could not get table counts:', error.message);
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('📊 Closing database connections...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('📊 Closing database connections...');
  await sequelize.close();
  process.exit(0);
});

module.exports = initializeDatabase;
