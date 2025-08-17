import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function verifyDatabase() {
  try {
    const sql = neon(DATABASE_URL);
    
    console.log('🔍 Verifying database restoration...');
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');
    
    // Check key tables
    const tables = [
      'users',
      'staff', 
      'clients',
      'services',
      'service_categories',
      'locations',
      'rooms',
      'appointments'
    ];
    
    console.log('\n📊 Database Record Counts:');
    console.log('========================');
    
    for (const table of tables) {
      try {
        const result = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
        const count = result[0].count;
        console.log(`${table.padEnd(20)}: ${count} records`);
      } catch (error) {
        console.log(`${table.padEnd(20)}: ❌ Error - ${error.message}`);
      }
    }
    
    // Check for admin user
    console.log('\n👑 Admin User Check:');
    try {
      const adminUser = await sql`SELECT id, email, role FROM users WHERE email = 'admin@gloheadspa.com'`;
      if (adminUser.length > 0) {
        console.log(`✅ Admin user found: ${adminUser[0].email} (ID: ${adminUser[0].id}, Role: ${adminUser[0].role})`);
      } else {
        console.log('❌ Admin user not found');
      }
    } catch (error) {
      console.log(`❌ Error checking admin user: ${error.message}`);
    }
    
    // Check for sample data
    console.log('\n📝 Sample Data Check:');
    try {
      const serviceCount = await sql`SELECT COUNT(*) as count FROM services`;
      const staffCount = await sql`SELECT COUNT(*) as count FROM staff`;
      const clientCount = await sql`SELECT COUNT(*) as count FROM clients`;
      
      console.log(`Services: ${serviceCount[0].count}`);
      console.log(`Staff: ${staffCount[0].count}`);
      console.log(`Clients: ${clientCount[0].count}`);
      
      if (serviceCount[0].count > 0 && staffCount[0].count > 0 && clientCount[0].count > 0) {
        console.log('✅ Sample data appears to be present');
      } else {
        console.log('❌ Sample data may be missing');
      }
    } catch (error) {
      console.log(`❌ Error checking sample data: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifyDatabase();











