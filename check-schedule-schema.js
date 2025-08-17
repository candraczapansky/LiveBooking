import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function checkScheduleSchema() {
  console.log('🔍 Checking staff_schedules table schema...');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Test connection
    console.log('🔍 Testing database connection...');
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');
    
    // Check staff_schedules table structure
    console.log('\n📋 Checking staff_schedules table structure...');
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'staff_schedules' 
      ORDER BY ordinal_position
    `;
    
    console.log('Staff_schedules table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
    });
    
    // Check if location_id column exists
    const locationIdExists = columns.some(col => col.column_name === 'location_id');
    console.log(`\n📍 location_id column exists: ${locationIdExists}`);
    
    // Check if location column still exists
    const locationExists = columns.some(col => col.column_name === 'location');
    console.log(`📍 location column still exists: ${locationExists}`);
    
    // Check sample data
    console.log('\n📊 Checking sample data...');
    const sampleData = await sql`SELECT * FROM staff_schedules LIMIT 3`;
    console.log('Sample schedules:', sampleData.length);
    sampleData.forEach((schedule, index) => {
      console.log(`  Schedule ${index + 1}:`, {
        id: schedule.id,
        staff_id: schedule.staff_id,
        day_of_week: schedule.day_of_week,
        location_id: schedule.location_id,
        start_time: schedule.start_time,
        end_time: schedule.end_time
      });
    });
    
    // Check foreign key constraints
    console.log('\n🔗 Checking foreign key constraints...');
    const foreignKeys = await sql`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'staff_schedules'
    `;
    
    console.log('Foreign key constraints:');
    foreignKeys.forEach(fk => {
      console.log(`  - ${fk.constraint_name}: ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    
    console.log('\n🎉 Schema check completed!');
    
  } catch (error) {
    console.error('❌ Schema check failed:', error);
    process.exit(1);
  }
}

checkScheduleSchema().catch(console.error);
