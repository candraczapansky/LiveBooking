import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function testLocationIntegration() {
  console.log('🧪 Testing location integration for staff schedules...');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Test connection
    console.log('🔍 Testing database connection...');
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');
    
    // Check locations
    console.log('\n📍 Checking locations...');
    const locations = await sql`SELECT id, name, is_default FROM locations ORDER BY id`;
    console.log('Locations found:', locations.length);
    locations.forEach(loc => {
      console.log(`  - ID: ${loc.id}, Name: ${loc.name}, Default: ${loc.is_default}`);
    });
    
    // Check staff
    console.log('\n👥 Checking staff...');
    const staff = await sql`SELECT id, title, location_id FROM staff ORDER BY id`;
    console.log('Staff found:', staff.length);
    staff.forEach(s => {
      console.log(`  - ID: ${s.id}, Title: ${s.title}, Location ID: ${s.location_id}`);
    });
    
    // Check staff schedules
    console.log('\n📅 Checking staff schedules...');
    const schedules = await sql`SELECT id, staff_id, day_of_week, location_id FROM staff_schedules ORDER BY id`;
    console.log('Schedules found:', schedules.length);
    schedules.forEach(schedule => {
      console.log(`  - ID: ${schedule.id}, Staff ID: ${schedule.staff_id}, Day: ${schedule.day_of_week}, Location ID: ${schedule.location_id}`);
    });
    
    // Test API endpoints
    console.log('\n🌐 Testing API endpoints...');
    
    // Test locations endpoint
    try {
      const locationsResponse = await fetch('http://localhost:5003/api/locations', {
        headers: {
          'x-user-id': '1',
        },
      });
      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        console.log('✅ Locations API working, found:', locationsData.length, 'locations');
      } else {
        console.log('❌ Locations API failed:', locationsResponse.status);
      }
    } catch (error) {
      console.log('❌ Locations API error:', error.message);
    }
    
    // Test schedules endpoint
    try {
      const schedulesResponse = await fetch('http://localhost:5003/api/schedules', {
        headers: {
          'x-user-id': '1',
        },
      });
      if (schedulesResponse.ok) {
        const schedulesData = await schedulesResponse.json();
        console.log('✅ Schedules API working, found:', schedulesData.length, 'schedules');
      } else {
        console.log('❌ Schedules API failed:', schedulesResponse.status);
      }
    } catch (error) {
      console.log('❌ Schedules API error:', error.message);
    }
    
    // Test schedules with location filter
    if (locations.length > 0) {
      const firstLocationId = locations[0].id;
      try {
        const filteredSchedulesResponse = await fetch(`http://localhost:5003/api/schedules?locationId=${firstLocationId}`, {
          headers: {
            'x-user-id': '1',
          },
        });
        if (filteredSchedulesResponse.ok) {
          const filteredSchedulesData = await filteredSchedulesResponse.json();
          console.log(`✅ Filtered schedules API working for location ${firstLocationId}, found:`, filteredSchedulesData.length, 'schedules');
        } else {
          console.log('❌ Filtered schedules API failed:', filteredSchedulesResponse.status);
        }
      } catch (error) {
        console.log('❌ Filtered schedules API error:', error.message);
      }
    }
    
    console.log('\n🎉 Location integration test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testLocationIntegration().catch(console.error);
