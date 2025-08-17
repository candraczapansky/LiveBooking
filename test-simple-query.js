import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function testQuery() {
  try {
    const sql = neon(DATABASE_URL);
    
    console.log('Testing database connection...');
    await sql`SELECT 1`;
    console.log('✅ Connection successful');
    
    // Check if tables exist and have data
    console.log('\nChecking tables...');
    
    const tables = ['users', 'staff', 'clients', 'services', 'service_categories', 'locations', 'rooms', 'appointments'];
    
    for (const table of tables) {
      try {
        const count = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
        console.log(`✅ ${table}: ${count[0].count} records`);
      } catch (error) {
        console.log(`❌ ${table}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testQuery();











