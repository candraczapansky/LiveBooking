const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function testConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    const sql = neon(DATABASE_URL);
    
    // Test connection
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Database connection successful:', result);
    
    // Check if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log('📋 Available tables:', tables.map(t => t.table_name));
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection().catch(console.error);
