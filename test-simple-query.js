import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

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











