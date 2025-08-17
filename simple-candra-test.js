import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function simpleCandraTest() {
  console.log('🔍 Simple Candra Test...');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Check all staff records
    console.log('\n👨‍💼 All staff records:');
    const allStaff = await sql`
      SELECT s.*, u.first_name, u.last_name, l.name as location_name
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN locations l ON s.location_id = l.id
      ORDER BY u.first_name, u.last_name
    `;
    
    allStaff.forEach(staff => {
      console.log(`  - ${staff.first_name} ${staff.last_name}: Staff ID ${staff.id}, Location: ${staff.location_name || 'NULL'} (${staff.location_id})`);
    });
    
    // Check all schedules
    console.log('\n📅 All schedules:');
    const allSchedules = await sql`
      SELECT ss.*, s.title as staff_title, u.first_name, u.last_name, l.name as location_name
      FROM staff_schedules ss
      LEFT JOIN staff s ON ss.staff_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN locations l ON ss.location_id = l.id
      ORDER BY u.first_name, u.last_name, ss.day_of_week
    `;
    
    allSchedules.forEach(schedule => {
      console.log(`  - ${schedule.first_name} ${schedule.last_name}: ${schedule.day_of_week} ${schedule.start_time}-${schedule.end_time}, Location: ${schedule.location_name || 'NULL'} (${schedule.location_id})`);
    });
    
    // Check locations
    console.log('\n🏢 All locations:');
    const locations = await sql`SELECT * FROM locations ORDER BY id`;
    locations.forEach(loc => {
      console.log(`  - ID: ${loc.id}, Name: ${loc.name}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

simpleCandraTest().catch(console.error);
