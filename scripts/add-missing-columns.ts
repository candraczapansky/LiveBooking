import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

async function addMissingColumns() {
  try {
    console.log('🔄 Adding missing columns...');
    
    const sql = neon(DATABASE_URL);
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');

    // Add timezone column to locations table
    await sql`ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "timezone" text DEFAULT 'America/New_York'`;
    console.log('✅ Added timezone column to locations table');

    // Add commission_type column to staff table
    await sql`ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "commission_type" text DEFAULT 'commission'`;
    console.log('✅ Added commission_type column to staff table');

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error adding missing columns:', error);
    process.exit(1);
  }
}

addMissingColumns();
