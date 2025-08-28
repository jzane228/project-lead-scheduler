const { sequelize, Column, Contact } = require('./models');

async function fixDatabaseTables() {
  console.log('🔧 Checking and creating missing database tables...');

  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check if Column table exists, create if not
    try {
      await sequelize.query('SELECT 1 FROM "Columns" LIMIT 1');
      console.log('✅ Columns table already exists');
    } catch (error) {
      console.log('📊 Columns table does not exist, creating...');
      await Column.sync({ force: true });
      console.log('✅ Columns table created successfully');

      // Create default columns
      console.log('📝 Creating default columns...');
      await Column.createDefaultColumns(1); // Assuming user ID 1 exists
      console.log('✅ Default columns created');
    }

    // Check if Contact table exists, create if not
    try {
      await sequelize.query('SELECT 1 FROM "Contacts" LIMIT 1');
      console.log('✅ Contacts table already exists');
    } catch (error) {
      console.log('👥 Contacts table does not exist, creating...');
      await Contact.sync({ force: true });
      console.log('✅ Contacts table created successfully');
    }

    // Check if LeadColumns junction table exists (for many-to-many relationship)
    try {
      await sequelize.query('SELECT 1 FROM "LeadColumns" LIMIT 1');
      console.log('✅ LeadColumns junction table already exists');
    } catch (error) {
      console.log('🔗 LeadColumns junction table does not exist, creating...');
      // This should be created automatically by Sequelize associations
      await sequelize.sync();
      console.log('✅ Junction tables created successfully');
    }

    console.log('🎉 All database tables are ready!');

    // Verify tables exist by querying them
    console.log('🔍 Verifying tables...');
    const columnCount = await Column.count();
    const contactCount = await Contact.count();

    console.log(`📊 Columns table: ${columnCount} records`);
    console.log(`👥 Contacts table: ${contactCount} records`);

  } catch (error) {
    console.error('❌ Error fixing database tables:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the fix
if (require.main === module) {
  fixDatabaseTables().catch(console.error);
}

module.exports = fixDatabaseTables;

