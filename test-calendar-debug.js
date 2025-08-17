import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function testCalendarDebug() {
  console.log('🧪 Testing calendar debug...');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Get current date info
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    const dateString = today.toISOString().slice(0, 10);
    
    console.log('Today:', dateString);
    console.log('Day name:', dayName);
    
    // Get staff and location
    const staff = await sql`SELECT id, title FROM staff LIMIT 1`;
    const locations = await sql`SELECT id, name FROM locations ORDER BY id LIMIT 1`;
    
    if (staff.length === 0 || locations.length === 0) {
      console.log('❌ No staff or locations found');
      return;
    }
    
    console.log('Using staff:', staff[0].title, '(ID:', staff[0].id, ')');
    console.log('Using location:', locations[0].name, '(ID:', locations[0].id, ')');
    
    // Create a test schedule for today
    console.log('\n➕ Creating test schedule...');
    const testSchedule = {
      staffId: staff[0].id,
      dayOfWeek: dayName,
      startTime: '10:00',
      endTime: '18:00',
      locationId: locations[0].id,
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
    
    console.log('✅ Test schedule created:', {
      id: newSchedule.id,
      staff_id: newSchedule.staff_id,
      location_id: newSchedule.location_id,
      day_of_week: newSchedule.day_of_week,
      start_time: newSchedule.start_time,
      end_time: newSchedule.end_time,
      start_date: newSchedule.start_date,
      end_date: newSchedule.end_date
    });
    
    // Test API endpoint
    console.log('\n🌐 Testing API endpoint...');
    const apiUrl = `https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/schedules?locationId=${locations[0].id}`;
    
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      console.log(`API returned ${data.length} schedules for location ${locations[0].id}`);
      
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
    
    console.log('\n📅 Calendar Debug Instructions:');
    console.log('1. Go to the appointments page');
    console.log('2. Select location:', locations[0].name);
    console.log('3. Look for staff:', staff[0].title);
    console.log('4. Check if 10:00 AM - 6:00 PM shows as available (not grayed out)');
    console.log('5. Open browser console to see debug logs');
    
    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testCalendarDebug().catch(console.error);
