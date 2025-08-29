import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

async function testFinalFix() {
  console.log('🔍 Testing Final Fix...');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Wait for server to start
    console.log('⏳ Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get current date info
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    const dateString = today.toISOString().slice(0, 10);
    
    console.log('Today:', dateString);
    console.log('Day name:', dayName);
    
    // Get Candra's staff record
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
    console.log(`Candra: ${staff.first_name} ${staff.last_name}, Staff ID: ${staff.id}, Location: ${staff.location_name} (${staff.location_id})`);
    
    // Test the fixed date comparison logic
    console.log('\n🎯 Testing Fixed Date Comparison Logic...');
    
    // Get Candra's schedules for GloUp
    const schedules = await sql`
      SELECT ss.*, l.name as location_name
      FROM staff_schedules ss
      LEFT JOIN locations l ON ss.location_id = l.id
      WHERE ss.staff_id = ${staff.id} 
      AND ss.location_id = 11
      ORDER BY ss.day_of_week, ss.start_time
    `;
    
    console.log(`Found ${schedules.length} schedules for Candra in GloUp:`);
    schedules.forEach(schedule => {
      console.log(`  - ${schedule.day_of_week} ${schedule.start_time}-${schedule.end_time}, Start Date: ${schedule.start_date}, End Date: ${schedule.end_date || 'NULL'}`);
    });
    
    // Simulate the fixed JavaScript logic
    console.log('\n🔧 Simulating Fixed JavaScript Logic...');
    const todayMatches = schedules.filter(schedule => {
      const matchesStaff = schedule.staff_id === staff.id;
      const matchesDay = schedule.day_of_week === dayName;
      
      // Fixed date comparison logic
      const todayString = dateString;
      const startDateString = typeof schedule.start_date === 'string' 
        ? schedule.start_date 
        : new Date(schedule.start_date).toISOString().slice(0, 10);
      const endDateString = schedule.end_date 
        ? (typeof schedule.end_date === 'string' 
          ? schedule.end_date 
          : new Date(schedule.end_date).toISOString().slice(0, 10))
        : null;
      
      const matchesStartDate = startDateString <= todayString;
      const matchesEndDate = !endDateString || endDateString >= todayString;
      
      console.log(`Schedule ${schedule.id}: staff=${matchesStaff}, day=${matchesDay}, startDate=${startDateString}<=${todayString}=${matchesStartDate}, endDate=${endDateString}>=${todayString}=${matchesEndDate}`);
      
      return matchesStaff && matchesDay && matchesStartDate && matchesEndDate;
    });
    
    console.log(`\n📊 Today's matches with fixed logic: ${todayMatches.length}`);
    todayMatches.forEach(schedule => {
      console.log(`  - ${schedule.day_of_week} ${schedule.start_time}-${schedule.end_time}, Blocked: ${schedule.is_blocked}`);
    });
    
    // Test API endpoints
    console.log('\n🌐 Testing API Endpoints...');
    
    // Test staff API
    try {
      const staffResponse = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/staff?locationId=11');
      const staffData = await staffResponse.json();
      console.log(`Staff API: ${staffData.length} staff returned`);
      
      const candraInStaff = staffData.find(s => s.id === staff.id);
      if (candraInStaff) {
        console.log(`✅ Candra found in staff API`);
      } else {
        console.log(`❌ Candra NOT found in staff API`);
      }
    } catch (error) {
      console.error('❌ Staff API test failed:', error);
    }
    
    // Test schedules API
    try {
      const schedulesResponse = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/schedules?locationId=11');
      const schedulesData = await schedulesResponse.json();
      console.log(`Schedules API: ${schedulesData.length} schedules returned`);
      
      const candraSchedules = schedulesData.filter(s => s.staffId === staff.id);
      console.log(`Candra schedules: ${candraSchedules.length} found`);
      
      // Test the fixed logic on API data
      const todayApiMatches = candraSchedules.filter(schedule => {
        const matchesDay = schedule.dayOfWeek === dayName;
        
        // Fixed date comparison logic
        const todayString = dateString;
        const startDateString = typeof schedule.startDate === 'string' 
          ? schedule.startDate 
          : new Date(schedule.startDate).toISOString().slice(0, 10);
        const endDateString = schedule.endDate 
          ? (typeof schedule.endDate === 'string' 
            ? schedule.endDate 
            : new Date(schedule.endDate).toISOString().slice(0, 10))
          : null;
        
        const matchesStartDate = startDateString <= todayString;
        const matchesEndDate = !endDateString || endDateString >= todayString;
        
        return matchesDay && matchesStartDate && matchesEndDate;
      });
      
      console.log(`Today's API matches with fixed logic: ${todayApiMatches.length}`);
      todayApiMatches.forEach(schedule => {
        console.log(`  - ${schedule.dayOfWeek} ${schedule.startTime}-${schedule.endTime}, Blocked: ${schedule.isBlocked}`);
      });
      
    } catch (error) {
      console.error('❌ Schedules API test failed:', error);
    }
    
    // Summary
    console.log('\n📋 FINAL SUMMARY:');
    console.log(`Today: ${dateString} (${dayName})`);
    console.log(`Candra's location: ${staff.location_name} (${staff.location_id})`);
    console.log(`Total schedules: ${schedules.length}`);
    console.log(`Today's matches (fixed logic): ${todayMatches.length}`);
    
    if (todayMatches.length > 0) {
      console.log('\n✅ SUCCESS: Candra has schedules for today!');
      console.log('The calendar should now show Candra\'s availability.');
      console.log('\n🎯 Next Steps:');
      console.log('1. Go to the appointments page');
      console.log('2. Select "GloUp" location from the dropdown');
      console.log('3. Candra should now appear in the staff filter');
      console.log('4. Her schedules should show up on the calendar');
    } else {
      console.log('\n❌ ISSUE: Still no schedules found for today!');
      console.log('The fix may not have been applied correctly.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFinalFix().catch(console.error); 