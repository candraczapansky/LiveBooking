import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function addPhotoUrl() {
  try {
    console.log('🔄 Adding photo_url column...');
    
    const sql = neon(DATABASE_URL);
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');

    // Add photo_url column
    await sql`ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS photo_url TEXT`;
    console.log('✅ Added photo_url column');

    console.log('🎉 Schema update completed successfully!');
  } catch (error) {
    console.error('❌ Error updating schema:', error);
    process.exit(1);
  }
}

addPhotoUrl();
