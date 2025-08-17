import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function checkGloopLocation() {
  console.log('🔍 Checking GloUp location specifically...');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Check GloUp location (ID: 11)
    console.log('\n🏢 Checking GloUp location (ID: 11)...');
    const gloopLocation = await sql`SELECT * FROM locations WHERE id = 11`;
    console.log(`Location: ${gloopLocation[0]?.name} (ID: ${gloopLocation[0]?.id})`);
    
    // Check staff for GloUp location
    console.log('\n👨‍💼 Staff for GloUp location:');
    const gloopStaff = await sql`
      SELECT s.*, u.first_name, u.last_name, l.name as location_name
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN locations l ON s.location_id = l.id
      WHERE s.location_id = 11
    `;
    
    console.log(`Found ${gloopStaff.length} staff for GloUp:`);
    gloopStaff.forEach(staff => {
      console.log(`  - ${staff.first_name} ${staff.last_name}: Staff ID ${staff.id}, Location: ${staff.location_name} (${staff.location_id})`);
    });
    
    // Check schedules for GloUp location
    console.log('\n📅 Schedules for GloUp location:');
    const gloopSchedules = await sql`
      SELECT ss.*, s.title as staff_title, u.first_name, u.last_name, l.name as location_name
      FROM staff_schedules ss
      LEFT JOIN staff s ON ss.staff_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN locations l ON ss.location_id = l.id
      WHERE ss.location_id = 11
      ORDER BY u.first_name, u.last_name, ss.day_of_week
    `;
    
    console.log(`Found ${gloopSchedules.length} schedules for GloUp:`);
    gloopSchedules.forEach(schedule => {
      console.log(`  - ${schedule.first_name} ${schedule.last_name}: ${schedule.day_of_week} ${schedule.start_time}-${schedule.end_time}`);
    });
    
    // Test API endpoint for GloUp
    console.log('\n🌐 Testing API endpoint for GloUp...');
    const apiUrl = `https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/staff?locationId=11`;
    
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      console.log(`API returned ${data.length} staff for GloUp location`);
      
      data.forEach(staff => {
        console.log(`  - ${staff.user?.firstName} ${staff.user?.lastName}: Staff ID ${staff.id}, Location: ${staff.locationId}`);
      });
      
    } catch (error) {
      console.error(`❌ API test failed:`, error);
    }
    
    // Test schedules API for GloUp
    console.log('\n📅 Testing schedules API for GloUp...');
    const schedulesApiUrl = `https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/schedules?locationId=11`;
    
    try {
      const response = await fetch(schedulesApiUrl);
      const data = await response.json();
      console.log(`API returned ${data.length} schedules for GloUp location`);
      
      data.forEach(schedule => {
        console.log(`  - Staff ID ${schedule.staffId}: ${schedule.dayOfWeek} ${schedule.startTime}-${schedule.endTime}`);
      });
      
    } catch (error) {
      console.error(`❌ Schedules API test failed:`, error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

checkGloopLocation().catch(console.error);
