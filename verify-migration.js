import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

async function verifyMigration() {
  console.log('🔍 Verifying database migration...');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Check locations table
    console.log('\nChecking locations table...');
    const locationsTable = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'locations'
      );
    `;
    console.log('Locations table exists:', locationsTable[0].exists);
    
    // Check location_id column in services table
    console.log('\nChecking location_id column in services table...');
    const locationIdColumn = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'location_id'
      );
    `;
    console.log('location_id column exists:', locationIdColumn[0].exists);
    
    // Check default location
    console.log('\nChecking default location...');
    const defaultLocation = await sql`
      SELECT * FROM locations WHERE is_default = true;
    `;
    console.log('Default location:', defaultLocation[0] || 'None');
    
    // Check services with location_id
    console.log('\nChecking services with location_id...');
    const servicesWithLocation = await sql`
      SELECT COUNT(*) as count FROM services WHERE location_id IS NOT NULL;
    `;
    console.log('Services with location_id:', servicesWithLocation[0].count);
    
  } catch (error) {
    console.error('❌ Error verifying migration:', error);
    process.exit(1);
  }
}

verifyMigration();
