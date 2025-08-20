import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function checkSchema() {
  console.log('🔍 Checking database schema...');
  
  const sql = postgres(DATABASE_URL);
  
  try {
    // Check locations table schema
    console.log('\nLocations table schema:');
    const locationColumns = await sql`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'locations'
      ORDER BY ordinal_position;
    `;
    console.log(locationColumns);
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

checkSchema();
