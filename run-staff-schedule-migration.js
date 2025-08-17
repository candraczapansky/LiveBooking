import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function runStaffScheduleMigration() {
  console.log('🔧 Running staff schedule location migration...');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Test connection
    console.log('🔍 Testing database connection...');
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');
    
    // Add location_id column to staff_schedules table
    console.log('\n📝 Adding location_id column to staff_schedules table...');
    await sql`ALTER TABLE staff_schedules ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id)`;
    console.log('✅ Added location_id column to staff_schedules table');
    
    // Update existing schedules to use the default location
    console.log('\n🔄 Updating existing schedules to use default location...');
    await sql`
      UPDATE staff_schedules 
      SET location_id = (SELECT id FROM locations WHERE is_default = true LIMIT 1) 
      WHERE location_id IS NULL
    `;
    console.log('✅ Updated existing schedules to use default location');
    
    // Drop the old location column
    console.log('\n🗑️ Dropping old location column...');
    await sql`ALTER TABLE staff_schedules DROP COLUMN IF EXISTS location`;
    console.log('✅ Dropped old location column');
    
    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const scheduleColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'staff_schedules' 
      AND column_name IN ('location_id', 'location')
      ORDER BY column_name
    `;
    
    console.log('Staff schedules table columns found:', scheduleColumns.map(c => c.column_name));
    
    // Check if any schedules exist
    const scheduleCount = await sql`SELECT COUNT(*) as count FROM staff_schedules`;
    console.log('Total schedules in database:', scheduleCount[0].count);
    
    console.log('\n🎉 Staff schedule location migration completed successfully!');
    console.log('✅ location_id column added and linked to locations table');
    console.log('✅ Existing schedules updated to use default location');
    console.log('✅ Old location text column removed');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runStaffScheduleMigration().catch(console.error);
