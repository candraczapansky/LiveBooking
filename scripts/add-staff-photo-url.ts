import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function addStaffPhotoUrlColumn() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL is not set. Please set it in your .env file.');
      process.exit(1);
    }

    console.log('🔄 Connecting to database to ensure staff.photo_url exists...');
    const sql = neon(databaseUrl);

    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');

    // Add staff.photo_url column if missing
    await sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url TEXT`;
    console.log('✅ Ensured staff.photo_url column exists');

    console.log('🎉 Schema check/update completed successfully!');
  } catch (error) {
    console.error('❌ Error updating schema:', error);
    process.exit(1);
  }
}

addStaffPhotoUrlColumn();


