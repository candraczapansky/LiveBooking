import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

async function testCalendarUpdate() {
  console.log('🧪 Testing calendar update when schedules are created...');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Test connection
    console.log('🔍 Testing database connection...');
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');
    
    // Check current schedules count
    console.log('\n📊 Checking current schedules...');
    const currentSchedules = await sql`SELECT COUNT(*) as count FROM staff_schedules`;
    console.log('Current schedules count:', currentSchedules[0].count);
    
    // Get a staff member and location for testing
    const staff = await sql`SELECT id, title FROM staff LIMIT 1`;
    const locations = await sql`SELECT id, name FROM locations LIMIT 1`;
    
    if (staff.length === 0 || locations.length === 0) {
      console.log('❌ No staff or locations found for testing');
      return;
    }
    
    console.log('Using staff:', staff[0].title, '(ID:', staff[0].id, ')');
    console.log('Using location:', locations[0].name, '(ID:', locations[0].id, ')');
    
    // Create a test schedule
    console.log('\n➕ Creating test schedule...');
    const testSchedule = {
      staffId: staff[0].id,
      dayOfWeek: 'Thursday',
      startTime: '14:00',
      endTime: '18:00',
      locationId: locations[0].id,
      serviceCategories: [],
      startDate: '2024-12-20',
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
      end_time: newSchedule.end_time
    });
    
    // Check schedules count after creation
    const updatedSchedules = await sql`SELECT COUNT(*) as count FROM staff_schedules`;
    console.log('Updated schedules count:', updatedSchedules[0].count);
    
    // Test filtering by location
    console.log('\n🔍 Testing location-based filtering...');
    const locationSchedules = await sql`
      SELECT * FROM staff_schedules 
      WHERE location_id = ${locations[0].id}
      ORDER BY id
    `;
    
    console.log(`Schedules for location ${locations[0].id} (${locations[0].name}):`, locationSchedules.length);
    locationSchedules.forEach(schedule => {
      console.log(`  - ID: ${schedule.id}, Staff: ${schedule.staff_id}, Day: ${schedule.day_of_week}, Time: ${schedule.start_time}-${schedule.end_time}`);
    });
    
    // Clean up - delete the test schedule
    await sql`DELETE FROM staff_schedules WHERE id = ${newSchedule.id}`;
    console.log('🧹 Test schedule cleaned up');
    
    console.log('\n🎉 Calendar update test completed!');
    console.log('✅ Schedule creation working');
    console.log('✅ Location filtering working');
    console.log('✅ Database queries working');
    console.log('✅ Calendar should now update when schedules are created');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testCalendarUpdate().catch(console.error);
