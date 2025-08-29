import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error('DATABASE_URL must be set');
  process.exit(1);
}

async function main() {
  console.log('🔧 Ensuring staff_schedules.service_categories column exists...');
  const sql = neon(DATABASE_URL);

  try {
    // Create column if missing
    await sql`ALTER TABLE staff_schedules ADD COLUMN IF NOT EXISTS service_categories TEXT[] DEFAULT '{}'`;
    console.log('✅ Added/verified column: service_categories (TEXT[] DEFAULT \'{}\')');

    // Verify
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'staff_schedules'
      ORDER BY ordinal_position
    `;
    const found = columns.find((c) => c.column_name === 'service_categories');
    if (!found) {
      throw new Error('service_categories column was not found after ALTER TABLE');
    }
    console.log('📋 Column details:', found);
    console.log('🎉 staff_schedules.service_categories is ready.');
  } catch (err) {
    console.error('❌ Failed to add/verify service_categories column:', err);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


