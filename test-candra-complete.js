import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

async function testCandraComplete() {
  console.log('🔍 Comprehensive Candra Test...');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Wait for server to start
    console.log('⏳ Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check Candra's current database state
    console.log('\n📊 Checking Candra\'s database state...');
    const candraStaff = await sql`
      SELECT s.*, u.first_name, u.last_name, l.name as location_name
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN locations l ON s.location_id = l.id
      WHERE LOWER(u.first_name) LIKE '%candra%' 
      AND LOWER(u.last_name) LIKE '%czapansky%'
      LIMIT 1
    `;
    
    if (candraStaff.length === 0) {
      console.log('❌ No staff record found for Candra');
      return;
    }
    
    const staff = candraStaff[0];
    console.log(`✅ Candra found: ${staff.first_name} ${staff.last_name}, Staff ID: ${staff.id}, Location: ${staff.location_name} (${staff.location_id})`);
    
    // Check Candra's schedules
    console.log('\n📅 Checking Candra\'s schedules...');
    const schedules = await sql`
      SELECT ss.*, l.name as location_name
      FROM staff_schedules ss
      LEFT JOIN locations l ON ss.location_id = l.id
      WHERE ss.staff_id = ${staff.id}
      ORDER BY ss.location_id, ss.day_of_week
    `;
    
    console.log(`Found ${schedules.length} schedules for Candra:`);
    schedules.forEach(schedule => {
      console.log(`  - ${schedule.day_of_week} ${schedule.start_time}-${schedule.end_time}, Location: ${schedule.location_name} (${schedule.location_id})`);
    });
    
    // Test all API endpoints
    console.log('\n🌐 Testing all API endpoints...');
    
    // Test 1: Staff API for GloUp (location 11)
    console.log('\n1️⃣ Testing Staff API for GloUp (location 11)...');
    try {
      const staffResponse = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/staff?locationId=11');
      const staffData = await staffResponse.json();
      console.log(`Staff API returned ${staffData.length} staff for GloUp`);
      
      const candraInStaff = staffData.find(s => s.id === staff.id);
      if (candraInStaff) {
        console.log(`✅ Candra found in staff API:`, {
          id: candraInStaff.id,
          title: candraInStaff.title,
          locationId: candraInStaff.locationId,
          user: candraInStaff.user
        });
      } else {
        console.log(`❌ Candra NOT found in staff API`);
        staffData.forEach(s => {
          console.log(`  - ${s.user?.firstName} ${s.user?.lastName}: ID ${s.id}, Location: ${s.locationId}`);
        });
      }
    } catch (error) {
      console.error('❌ Staff API test failed:', error);
    }
    
    // Test 2: Schedules API for GloUp (location 11)
    console.log('\n2️⃣ Testing Schedules API for GloUp (location 11)...');
    try {
      const schedulesResponse = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/schedules?locationId=11');
      const schedulesData = await schedulesResponse.json();
      console.log(`Schedules API returned ${schedulesData.length} schedules for GloUp`);
      
      const candraSchedules = schedulesData.filter(s => s.staffId === staff.id);
      console.log(`Found ${candraSchedules.length} schedules for Candra in API`);
      
      if (candraSchedules.length > 0) {
        candraSchedules.forEach(schedule => {
          console.log(`  - ${schedule.dayOfWeek} ${schedule.startTime}-${schedule.endTime}, Location: ${schedule.locationId}`);
        });
      } else {
        console.log(`❌ No schedules found for Candra in API`);
      }
    } catch (error) {
      console.error('❌ Schedules API test failed:', error);
    }
    
    // Test 3: All staff API (no location filter)
    console.log('\n3️⃣ Testing All Staff API (no location filter)...');
    try {
      const allStaffResponse = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/staff');
      const allStaffData = await allStaffResponse.json();
      console.log(`All Staff API returned ${allStaffData.length} staff total`);
      
      const candraInAllStaff = allStaffData.find(s => s.id === staff.id);
      if (candraInAllStaff) {
        console.log(`✅ Candra found in all staff API:`, {
          id: candraInAllStaff.id,
          title: candraInAllStaff.title,
          locationId: candraInAllStaff.locationId,
          user: candraInAllStaff.user
        });
      } else {
        console.log(`❌ Candra NOT found in all staff API`);
      }
    } catch (error) {
      console.error('❌ All Staff API test failed:', error);
    }
    
    // Test 4: All schedules API (no location filter)
    console.log('\n4️⃣ Testing All Schedules API (no location filter)...');
    try {
      const allSchedulesResponse = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/schedules');
      const allSchedulesData = await allSchedulesResponse.json();
      console.log(`All Schedules API returned ${allSchedulesData.length} schedules total`);
      
      const candraAllSchedules = allSchedulesData.filter(s => s.staffId === staff.id);
      console.log(`Found ${candraAllSchedules.length} schedules for Candra in all schedules API`);
      
      if (candraAllSchedules.length > 0) {
        candraAllSchedules.forEach(schedule => {
          console.log(`  - ${schedule.dayOfWeek} ${schedule.startTime}-${schedule.endTime}, Location: ${schedule.locationId}`);
        });
      } else {
        console.log(`❌ No schedules found for Candra in all schedules API`);
      }
    } catch (error) {
      console.error('❌ All Schedules API test failed:', error);
    }
    
    // Test 5: Check if there are any appointments for Candra
    console.log('\n5️⃣ Checking appointments for Candra...');
    try {
      const appointmentsResponse = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/appointments?locationId=11');
      const appointmentsData = await appointmentsResponse.json();
      console.log(`Appointments API returned ${appointmentsData.length} appointments for GloUp`);
      
      const candraAppointments = appointmentsData.filter(a => a.staffId === staff.id);
      console.log(`Found ${candraAppointments.length} appointments for Candra in GloUp`);
    } catch (error) {
      console.error('❌ Appointments API test failed:', error);
    }
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`Candra's staff record: Location ${staff.location_id} (${staff.location_name})`);
    console.log(`Candra's schedules: ${schedules.length} total schedules`);
    console.log(`GloUp schedules: ${schedules.filter(s => s.location_id === 11).length} schedules`);
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Go to the appointments page');
    console.log('2. Select "GloUp" location from the dropdown');
    console.log('3. Check if Candra appears in the staff filter');
    console.log('4. Check if her schedules show on the calendar');
    console.log('5. If not working, check browser console for errors');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCandraComplete().catch(console.error);
