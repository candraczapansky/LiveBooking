import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function fixSchema() {
  try {
    console.log('🔄 Fixing database schema...');
    
    const sql = neon(DATABASE_URL);
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');

    // Add total_amount column
    await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS total_amount DOUBLE PRECISION`;
    console.log('✅ Added total_amount column');

    console.log('🎉 Schema fix completed successfully!');
  } catch (error) {
    console.error('❌ Error fixing schema:', error);
    process.exit(1);
  }
}

fixSchema();
