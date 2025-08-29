import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

async function fixTargetClientIds() {
  try {
    console.log('🔄 Fixing target_client_ids column...');
    
    const sql = neon(DATABASE_URL);
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');

    // Drop the old column
    await sql`ALTER TABLE "marketing_campaigns" DROP COLUMN IF EXISTS "target_client_ids"`;
    console.log('✅ Dropped old target_client_ids column');

    // Add the new column
    await sql`ALTER TABLE "marketing_campaigns" ADD COLUMN "target_client_ids" text[] DEFAULT '{}'`;
    console.log('✅ Added new target_client_ids column');

    console.log('🎉 Fix completed successfully!');
  } catch (error) {
    console.error('❌ Error fixing target_client_ids:', error);
    process.exit(1);
  }
}

fixTargetClientIds();
