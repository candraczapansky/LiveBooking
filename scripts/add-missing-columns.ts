import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

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
