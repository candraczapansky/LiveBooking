import { neon } from '@neondatabase/serverless';

console.log('Starting data type test...');

const sql = neon(process.env.DATABASE_URL);

async function testDataTypes() {
  console.log('🔍 Testing Data Types...\n');

  try {
    // Get staff for location 11
    const gloupStaff = await sql`
      SELECT id, user_id, locationId FROM staff WHERE locationId = 11
    `;
    
    console.log('🏢 GloUp Staff:');
    gloupStaff.forEach(staff => {
      console.log(`  Staff ID: ${staff.id} (type: ${typeof staff.id})`);
    });

    // Get schedules for location 11
    const gloupSchedules = await sql`
      SELECT id, staffId, dayOfWeek, locationId FROM staff_schedules WHERE locationId = 11
    `;
    
    console.log('\n📅 GloUp Schedules:');
    gloupSchedules.forEach(schedule => {
      console.log(`  Schedule ${schedule.id}: staffId = ${schedule.staffId} (type: ${typeof schedule.staffId})`);
    });

    // Test matching
    console.log('\n🔍 Testing Matching:');
    gloupStaff.forEach(staff => {
      const matchingSchedules = gloupSchedules.filter(schedule => schedule.staffId === staff.id);
      console.log(`Staff ${staff.id}: ${matchingSchedules.length} matching schedules`);
      
      if (matchingSchedules.length > 0) {
        matchingSchedules.forEach(schedule => {
          console.log(`  ✅ Schedule ${schedule.id}: ${schedule.dayOfWeek}`);
        });
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testDataTypes();
