import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

async function testCandraStaff() {
  console.log('🔍 Testing Candra Czapansky staff record...');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Test connection
    console.log('🔍 Testing database connection...');
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');
    
    // Find Candra's user record
    console.log('\n👤 Looking for Candra Czapansky user record...');
    const users = await sql`
      SELECT * FROM users 
      WHERE LOWER(first_name) LIKE '%candra%' 
      OR LOWER(last_name) LIKE '%czapansky%'
      OR LOWER(first_name || ' ' || last_name) LIKE '%candra%'
      ORDER BY role DESC, id
    `;
    
    console.log(`Found ${users.length} user records for Candra:`);
    users.forEach(user => {
      console.log(`  - ID: ${user.id}, Name: ${user.first_name} ${user.last_name}, Email: ${user.email}, Role: ${user.role}`);
    });
    
    if (users.length === 0) {
      console.log('❌ No user found for Candra Czapansky');
      return;
    }
    
    // Find the first user with staff role
    const candraUser = users.find(user => user.role === 'staff') || users[0];
    console.log(`\n🎯 Using user: ${candraUser.first_name} ${candraUser.last_name} (ID: ${candraUser.id}, Role: ${candraUser.role})`);
    
    // Find Candra's staff record
    console.log('\n👨‍💼 Looking for Candra\'s staff record...');
    const staffRecords = await sql`
      SELECT s.*, u.first_name, u.last_name, l.name as location_name
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN locations l ON s.location_id = l.id
      WHERE s.user_id = ${candraUser.id}
    `;
    
    console.log(`Found ${staffRecords.length} staff records for Candra:`);
    staffRecords.forEach(staff => {
      console.log(`  - Staff ID: ${staff.id}, Title: ${staff.title}, Location: ${staff.location_name || 'NULL'} (ID: ${staff.location_id})`);
    });
    
    if (staffRecords.length === 0) {
      console.log('❌ No staff record found for Candra');
      return;
    }
    
    const candraStaff = staffRecords[0];
    console.log(`\n🎯 Using staff record: ${candraStaff.title} (ID: ${candraStaff.id})`);
    
    // Check Candra's schedules
    console.log('\n📅 Looking for Candra\'s schedules...');
    const schedules = await sql`
      SELECT ss.*, l.name as location_name
      FROM staff_schedules ss
      LEFT JOIN locations l ON ss.location_id = l.id
      WHERE ss.staff_id = ${candraStaff.id}
      ORDER BY ss.day_of_week, ss.start_time
    `;
    
    console.log(`Found ${schedules.length} schedules for Candra:`);
    schedules.forEach(schedule => {
      console.log(`  - ID: ${schedule.id}, Day: ${schedule.day_of_week}, Time: ${schedule.start_time}-${schedule.end_time}, Location: ${schedule.location_name || 'NULL'} (ID: ${schedule.location_id})`);
    });
    
    // Check all locations
    console.log('\n🏢 Checking all locations...');
    const locations = await sql`SELECT * FROM locations ORDER BY id`;
    console.log('Available locations:');
    locations.forEach(loc => {
      console.log(`  - ID: ${loc.id}, Name: ${loc.name}`);
    });
    
    // Test API endpoints
    console.log('\n🌐 Testing API endpoints...');
    
    // Test staff API for each location
    for (const location of locations) {
      console.log(`\nTesting staff API for location: ${location.name} (ID: ${location.id})`);
      const apiUrl = `https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/staff?locationId=${location.id}`;
      
      try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        console.log(`API returned ${data.length} staff for location ${location.id}`);
        
        const candraInLocation = data.find((staff) => 
          staff.user && 
          (staff.user.firstName?.toLowerCase().includes('candra') || 
           staff.user.lastName?.toLowerCase().includes('czapansky'))
        );
        
        if (candraInLocation) {
          console.log(`✅ Found Candra in location ${location.name}:`, {
            id: candraInLocation.id,
            title: candraInLocation.title,
            locationId: candraInLocation.locationId,
            user: candraInLocation.user
          });
        } else {
          console.log(`❌ Candra not found in location ${location.name}`);
        }
        
      } catch (error) {
        console.error(`❌ API test failed for location ${location.id}:`, error);
      }
    }
    
    // Test schedules API for each location
    console.log('\n📅 Testing schedules API...');
    for (const location of locations) {
      console.log(`\nTesting schedules API for location: ${location.name} (ID: ${location.id})`);
      const apiUrl = `https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/schedules?locationId=${location.id}`;
      
      try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        console.log(`API returned ${data.length} schedules for location ${location.id}`);
        
        const candraSchedules = data.filter((schedule) => schedule.staffId === candraStaff.id);
        console.log(`Found ${candraSchedules.length} schedules for Candra in location ${location.name}`);
        
        if (candraSchedules.length > 0) {
          candraSchedules.forEach(schedule => {
            console.log(`  - Day: ${schedule.dayOfWeek}, Time: ${schedule.startTime}-${schedule.endTime}, Location: ${schedule.locationId}`);
          });
        }
        
      } catch (error) {
        console.error(`❌ Schedules API test failed for location ${location.id}:`, error);
      }
    }
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`Candra's staff record location: ${candraStaff.location_name || 'NULL'} (ID: ${candraStaff.location_id})`);
    console.log(`Candra's schedules location: ${schedules.length > 0 ? schedules[0].location_name || 'NULL' : 'No schedules'} (ID: ${schedules.length > 0 ? schedules[0].location_id : 'N/A'})`);
    
    if (candraStaff.location_id === null) {
      console.log('\n⚠️  ISSUE: Candra\'s staff record has no location assigned!');
      console.log('This is why she\'s not appearing in the calendar filter.');
    }
    
    if (schedules.length > 0 && schedules[0].location_id !== candraStaff.location_id) {
      console.log('\n⚠️  ISSUE: Candra\'s schedules and staff record have different locations!');
      console.log('This could cause issues with calendar display.');
    }
    
    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testCandraStaff().catch(console.error);
