import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function testCalendarDisplay() {
  console.log('🔍 Testing Calendar Display Logic...');
  
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
    
    // Simulate the calendar's getBackgroundEvents logic
    console.log('\n🎯 Simulating Calendar Background Events Logic...');
    
    // Get all schedules for GloUp location
    const allSchedules = await sql`
      SELECT ss.*, s.title as staff_title, u.first_name, u.last_name, l.name as location_name
      FROM staff_schedules ss
      LEFT JOIN staff s ON ss.staff_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN locations l ON ss.location_id = l.id
      WHERE ss.location_id = 11
      ORDER BY u.first_name, u.last_name, ss.day_of_week
    `;
    
    console.log(`Total schedules for GloUp: ${allSchedules.length}`);
    
    // Simulate the calendar's day checking logic
    const baseDate = today;
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - d.getDay() + i); // start from Sunday
      return d;
    });
    
    console.log(`\n📅 Checking all 7 days of the week:`);
    days.forEach((date, index) => {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const dateString = date.toISOString().slice(0, 10);
      
      // Find schedules for Candra on this day
      const daySchedules = allSchedules.filter(schedule => 
        schedule.staff_id === staff.id &&
        schedule.day_of_week === dayName &&
        schedule.start_date <= dateString &&
        (!schedule.end_date || schedule.end_date >= dateString)
      );
      
      console.log(`Day ${index + 1} (${dayName} ${dateString}): ${daySchedules.length} schedules for Candra`);
      daySchedules.forEach(schedule => {
        console.log(`  - ${schedule.start_time}-${schedule.end_time}, Blocked: ${schedule.is_blocked}`);
      });
    });
    
    // Check today specifically
    const todaySchedules = allSchedules.filter(schedule => 
      schedule.staff_id === staff.id &&
      schedule.day_of_week === dayName &&
      schedule.start_date <= dateString &&
      (!schedule.end_date || schedule.end_date >= dateString)
    );
    
    console.log(`\n🎯 Today's schedules for Candra: ${todaySchedules.length}`);
    todaySchedules.forEach(schedule => {
      console.log(`  - ${schedule.start_time}-${schedule.end_time}, Blocked: ${schedule.is_blocked}`);
    });
    
    // Simulate background events creation
    console.log('\n🎨 Simulating Background Events Creation...');
    const backgroundEvents = [];
    
    todaySchedules.forEach(schedule => {
      if (!schedule.is_blocked) {
        // This should create available time slots (not grayed out)
        console.log(`✅ Available time: ${schedule.start_time}-${schedule.end_time}`);
        backgroundEvents.push({
          start: schedule.start_time,
          end: schedule.end_time,
          type: 'available',
          staffId: schedule.staff_id
        });
      } else {
        // This should create blocked time slots (grayed out)
        console.log(`❌ Blocked time: ${schedule.start_time}-${schedule.end_time}`);
        backgroundEvents.push({
          start: schedule.start_time,
          end: schedule.end_time,
          type: 'blocked',
          staffId: schedule.staff_id
        });
      }
    });
    
    console.log(`\n📊 Background Events Summary:`);
    console.log(`Total background events: ${backgroundEvents.length}`);
    console.log(`Available events: ${backgroundEvents.filter(e => e.type === 'available').length}`);
    console.log(`Blocked events: ${backgroundEvents.filter(e => e.type === 'blocked').length}`);
    
    if (backgroundEvents.length === 0) {
      console.log('\n⚠️  ISSUE: No background events created for Candra today!');
      console.log('This means the calendar will show her as completely unavailable.');
    } else {
      console.log('\n✅ Background events created successfully.');
      console.log('The calendar should show Candra\'s availability.');
    }
    
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
    } catch (error) {
      console.error('❌ Schedules API test failed:', error);
    }
    
    console.log('\n📋 SUMMARY:');
    console.log(`Today: ${dateString} (${dayName})`);
    console.log(`Candra's location: ${staff.location_name} (${staff.location_id})`);
    console.log(`Today's schedules: ${todaySchedules.length}`);
    console.log(`Background events: ${backgroundEvents.length}`);
    
    if (todaySchedules.length > 0 && backgroundEvents.length === 0) {
      console.log('\n⚠️  ISSUE: Schedules exist but no background events created!');
      console.log('This suggests a problem with the calendar\'s background event logic.');
    } else if (todaySchedules.length === 0) {
      console.log('\n⚠️  ISSUE: No schedules for today!');
      console.log('Candra has no schedules for today, so she won\'t appear as available.');
    } else {
      console.log('\n✅ Everything looks correct!');
      console.log('Candra should appear on the calendar with her availability.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCalendarDisplay().catch(console.error);
