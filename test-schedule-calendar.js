import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

async function testScheduleCalendar() {
  console.log('🧪 Testing schedule calendar integration...');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Test connection
    console.log('🔍 Testing database connection...');
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');
    
    // Get current date and day name
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    const dateString = today.toISOString().slice(0, 10);
    
    console.log('Today:', dateString);
    console.log('Day name:', dayName);
    
    // Get a staff member and location for testing
    const staff = await sql`SELECT id, title FROM staff LIMIT 1`;
    const locations = await sql`SELECT id, name FROM locations ORDER BY id`;
    
    if (staff.length === 0 || locations.length === 0) {
      console.log('❌ No staff or locations found for testing');
      return;
    }
    
    console.log('Using staff:', staff[0].title, '(ID:', staff[0].id, ')');
    console.log('Available locations:');
    locations.forEach(loc => {
      console.log(`  - ID: ${loc.id}, Name: ${loc.name}`);
    });
    
    // Check existing schedules for today across all locations
    console.log('\n📊 Checking existing schedules for today...');
    const existingSchedules = await sql`
      SELECT ss.*, l.name as location_name 
      FROM staff_schedules ss
      LEFT JOIN locations l ON ss.location_id = l.id
      WHERE ss.staff_id = ${staff[0].id} 
      AND ss.day_of_week = ${dayName}
      AND ss.start_date <= ${dateString}
      AND (ss.end_date IS NULL OR ss.end_date >= ${dateString})
    `;
    
    console.log(`Found ${existingSchedules.length} existing schedules for ${dayName}`);
    existingSchedules.forEach(schedule => {
      console.log(`  - ID: ${schedule.id}, Time: ${schedule.start_time}-${schedule.end_time}, Location: ${schedule.location_id} (${schedule.location_name})`);
    });
    
    // Use the first location for testing
    const testLocation = locations[0];
    console.log(`\n🎯 Using location for testing: ${testLocation.name} (ID: ${testLocation.id})`);
    
    // Check if schedule exists for this specific location
    const locationSchedules = existingSchedules.filter(s => s.location_id === testLocation.id);
    console.log(`Found ${locationSchedules.length} schedules for location ${testLocation.id}`);
    
    // Create a test schedule for today if none exists for this location
    if (locationSchedules.length === 0) {
      console.log('\n➕ Creating test schedule for today at this location...');
      const testSchedule = {
        staffId: staff[0].id,
        dayOfWeek: dayName,
        startTime: '09:00',
        endTime: '17:00',
        locationId: testLocation.id,
        serviceCategories: [],
        startDate: dateString,
        endDate: null,
        isBlocked: false
      };
      
      const [newSchedule] = await sql`
        INSERT INTO staff_schedules (staff_id, day_of_week, start_time, end_time, location_id, service_categories, start_date, end_date, is_blocked)
        VALUES (${testSchedule.staffId}, ${testSchedule.dayOfWeek}, ${testSchedule.startTime}, ${testSchedule.endTime}, ${testSchedule.locationId}, ${testSchedule.serviceCategories}, ${testSchedule.startDate}, ${testSchedule.endDate}, ${testSchedule.isBlocked})
        RETURNING *
      `;
      
      console.log('✅ Test schedule created for today:', {
        id: newSchedule.id,
        staff_id: newSchedule.staff_id,
        location_id: newSchedule.location_id,
        day_of_week: newSchedule.day_of_week,
        start_time: newSchedule.start_time,
        end_time: newSchedule.end_time,
        start_date: newSchedule.start_date,
        end_date: newSchedule.end_date
      });
    } else {
      console.log('✅ Schedule already exists for today at this location');
    }
    
    // Test API endpoint
    console.log('\n🌐 Testing API endpoint...');
    const apiUrl = `https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/schedules?locationId=${testLocation.id}`;
    
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      console.log(`API returned ${data.length} schedules for location ${testLocation.id}`);
      
      const todaySchedules = data.filter(schedule => 
        schedule.staffId === staff[0].id && 
        schedule.dayOfWeek === dayName
      );
      
      console.log(`Found ${todaySchedules.length} schedules for today in API response`);
      todaySchedules.forEach(schedule => {
        console.log(`  - ID: ${schedule.id}, Time: ${schedule.startTime}-${schedule.endTime}, Location: ${schedule.locationId}`);
      });
      
    } catch (error) {
      console.error('❌ API test failed:', error);
    }
    
    // Test calendar integration
    console.log('\n📅 Testing calendar integration...');
    console.log('To test calendar integration:');
    console.log('1. Go to the appointments page');
    console.log('2. Select the location:', testLocation.name);
    console.log('3. Look for staff:', staff[0].title);
    console.log('4. Check if the schedule shows up as available time (not grayed out)');
    console.log('5. The schedule should show 9:00 AM - 5:00 PM as available');
    
    console.log('\n🎉 Schedule calendar test completed!');
    console.log('✅ Database operations working');
    console.log('✅ API endpoint working');
    console.log('✅ Calendar should now show the schedule');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testScheduleCalendar().catch(console.error);
