import { neon } from '@neondatabase/serverless';

console.log('Starting test script...');

const sql = neon(process.env.DATABASE_URL);

async function testStaffScheduleMatching() {
  console.log('🔍 Testing Staff and Schedule Data Structures...\n');

  try {
    console.log('Connecting to database...');
    
    // Get all staff
    const allStaff = await sql`
      SELECT * FROM staff ORDER BY id
    `;
    
    console.log('📋 All Staff:');
    allStaff.forEach(staff => {
      console.log(`  ID: ${staff.id}, User ID: ${staff.user_id}, Location: ${staff.locationId}`);
    });

    // Get staff for location 11 (GloUp)
    const gloupStaff = await sql`
      SELECT * FROM staff WHERE locationId = 11
    `;
    
    console.log('\n🏢 GloUp Staff (locationId = 11):');
    gloupStaff.forEach(staff => {
      console.log(`  ID: ${staff.id}, User ID: ${staff.user_id}, Location: ${staff.locationId}`);
    });

    // Get all schedules
    const allSchedules = await sql`
      SELECT * FROM staff_schedules ORDER BY staffId, dayOfWeek
    `;
    
    console.log('\n📅 All Schedules:');
    allSchedules.forEach(schedule => {
      console.log(`  ID: ${schedule.id}, Staff: ${schedule.staffId}, Day: ${schedule.dayOfWeek}, Location: ${schedule.locationId}`);
    });

    // Get schedules for location 11 (GloUp)
    const gloupSchedules = await sql`
      SELECT * FROM staff_schedules WHERE locationId = 11 ORDER BY staffId, dayOfWeek
    `;
    
    console.log('\n🏢 GloUp Schedules (locationId = 11):');
    gloupSchedules.forEach(schedule => {
      console.log(`  ID: ${schedule.id}, Staff: ${schedule.staffId}, Day: ${schedule.dayOfWeek}, Location: ${schedule.locationId}`);
    });

    // Test matching logic
    console.log('\n🔍 Testing Matching Logic:');
    gloupStaff.forEach(staff => {
      const staffSchedules = gloupSchedules.filter(schedule => schedule.staffId === staff.id);
      console.log(`\nStaff ${staff.id}:`);
      if (staffSchedules.length > 0) {
        staffSchedules.forEach(schedule => {
          console.log(`  ✅ Schedule ${schedule.id}: ${schedule.dayOfWeek} (${schedule.startTime}-${schedule.endTime})`);
        });
      } else {
        console.log(`  ❌ No schedules found for staff ${staff.id}`);
      }
    });

    // Test the specific issue with Candra (staff ID 61)
    console.log('\n🎯 Testing Candra specifically (staff ID 61):');
    const candraSchedules = gloupSchedules.filter(s => s.staffId === 61);
    console.log(`Candra (staff ID 61) has ${candraSchedules.length} schedules:`);
    candraSchedules.forEach(s => {
      console.log(`  Schedule ${s.id}: ${s.dayOfWeek} (${s.startTime}-${s.endTime})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testStaffScheduleMatching();
