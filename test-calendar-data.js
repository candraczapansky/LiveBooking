import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function testCalendarData() {
  console.log('🔍 Testing Calendar Data...');
  
  const sql = neon(DATABASE_URL);
  
  try {
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
    
    // Check Candra's schedules for today
    console.log('\n📅 Checking Candra\'s schedules for today...');
    const todaySchedules = await sql`
      SELECT ss.*, l.name as location_name
      FROM staff_schedules ss
      LEFT JOIN locations l ON ss.location_id = l.id
      WHERE ss.staff_id = ${staff.id} 
      AND ss.day_of_week = ${dayName}
      AND ss.start_date <= ${dateString}
      AND (ss.end_date IS NULL OR ss.end_date >= ${dateString})
    `;
    
    console.log(`Found ${todaySchedules.length} schedules for today (${dayName}):`);
    todaySchedules.forEach(schedule => {
      console.log(`  - ${schedule.start_time}-${schedule.end_time}, Location: ${schedule.location_name} (${schedule.location_id}), Blocked: ${schedule.is_blocked}`);
    });
    
    // Check Candra's schedules for GloUp location
    console.log('\n📅 Checking Candra\'s schedules for GloUp location...');
    const gloopSchedules = await sql`
      SELECT ss.*, l.name as location_name
      FROM staff_schedules ss
      LEFT JOIN locations l ON ss.location_id = l.id
      WHERE ss.staff_id = ${staff.id} 
      AND ss.location_id = 11
      ORDER BY ss.day_of_week
    `;
    
    console.log(`Found ${gloopSchedules.length} schedules for GloUp location:`);
    gloopSchedules.forEach(schedule => {
      console.log(`  - ${schedule.day_of_week} ${schedule.start_time}-${schedule.end_time}, Blocked: ${schedule.is_blocked}`);
    });
    
    // Check if today's schedule is for GloUp
    const todayGloopSchedule = todaySchedules.filter(s => s.location_id === 11);
    console.log(`\n📅 Today's GloUp schedules: ${todayGloopSchedule.length}`);
    todayGloopSchedule.forEach(schedule => {
      console.log(`  - ${schedule.start_time}-${schedule.end_time}, Blocked: ${schedule.is_blocked}`);
    });
    
    // Test API for today's data
    console.log('\n🌐 Testing API for today\'s data...');
    try {
      const schedulesResponse = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/schedules?locationId=11');
      const schedulesData = await schedulesResponse.json();
      
      const todayApiSchedules = schedulesData.filter(s => 
        s.staffId === staff.id && 
        s.dayOfWeek === dayName
      );
      
      console.log(`API returned ${todayApiSchedules.length} schedules for today (${dayName}):`);
      todayApiSchedules.forEach(schedule => {
        console.log(`  - ${schedule.startTime}-${schedule.endTime}, Location: ${schedule.locationId}, Blocked: ${schedule.isBlocked}`);
      });
      
    } catch (error) {
      console.error('❌ API test failed:', error);
    }
    
    // Check if there are any appointments for Candra today
    console.log('\n📅 Checking appointments for Candra today...');
    const todayAppointments = await sql`
      SELECT a.*, s.title as service_name
      FROM appointments a
      LEFT JOIN services s ON a.service_id = s.id
      WHERE a.staff_id = ${staff.id}
      AND DATE(a.start_time) = ${dateString}
    `;
    
    console.log(`Found ${todayAppointments.length} appointments for Candra today:`);
    todayAppointments.forEach(apt => {
      console.log(`  - ${apt.start_time} - ${apt.end_time}, Service: ${apt.service_name}`);
    });
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`Today: ${dateString} (${dayName})`);
    console.log(`Candra's location: ${staff.location_name} (${staff.location_id})`);
    console.log(`Today's schedules: ${todaySchedules.length} total, ${todayGloopSchedule.length} for GloUp`);
    console.log(`GloUp schedules: ${gloopSchedules.length} total`);
    console.log(`Today's appointments: ${todayAppointments.length}`);
    
    if (todayGloopSchedule.length === 0) {
      console.log('\n⚠️  ISSUE: Candra has no schedules for today in GloUp location!');
      console.log('This is why she\'s not showing up on the calendar today.');
    } else {
      console.log('\n✅ Candra has schedules for today in GloUp location.');
      console.log('The calendar should show her availability.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCalendarData().catch(console.error);
