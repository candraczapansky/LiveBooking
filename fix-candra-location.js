import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function fixCandraLocation() {
  console.log('🔧 Fixing Candra\'s location assignment...');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Find Candra's staff record
    console.log('\n👨‍💼 Finding Candra\'s staff record...');
    const candraStaff = await sql`
      SELECT s.*, u.first_name, u.last_name
      FROM staff s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE LOWER(u.first_name) LIKE '%candra%' 
      AND LOWER(u.last_name) LIKE '%czapansky%'
      LIMIT 1
    `;
    
    if (candraStaff.length === 0) {
      console.log('❌ No staff record found for Candra');
      return;
    }
    
    const staff = candraStaff[0];
    console.log(`Found Candra: ${staff.first_name} ${staff.last_name}, Staff ID: ${staff.id}, Current Location: ${staff.location_id}`);
    
    // Check her schedules to determine the correct location
    console.log('\n📅 Checking Candra\'s schedules...');
    const schedules = await sql`
      SELECT ss.*, l.name as location_name
      FROM staff_schedules ss
      LEFT JOIN locations l ON ss.location_id = l.id
      WHERE ss.staff_id = ${staff.id}
      ORDER BY ss.location_id
    `;
    
    console.log(`Found ${schedules.length} schedules for Candra:`);
    schedules.forEach(schedule => {
      console.log(`  - ${schedule.day_of_week} ${schedule.start_time}-${schedule.end_time}, Location: ${schedule.location_name} (ID: ${schedule.location_id})`);
    });
    
    // Determine the most common location from her schedules
    const locationCounts = {};
    schedules.forEach(schedule => {
      const locId = schedule.location_id;
      locationCounts[locId] = (locationCounts[locId] || 0) + 1;
    });
    
    const mostCommonLocation = Object.entries(locationCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (mostCommonLocation) {
      const [locationId, count] = mostCommonLocation;
      console.log(`\n🎯 Most common location: ID ${locationId} (${count} schedules)`);
      
      // Get location name
      const location = await sql`SELECT name FROM locations WHERE id = ${parseInt(locationId)}`;
      const locationName = location[0]?.name || 'Unknown';
      console.log(`Location name: ${locationName}`);
      
      // Update Candra's staff record
      console.log('\n🔧 Updating Candra\'s staff record...');
      await sql`
        UPDATE staff 
        SET location_id = ${parseInt(locationId)}
        WHERE id = ${staff.id}
      `;
      
      console.log(`✅ Updated Candra's location to: ${locationName} (ID: ${locationId})`);
      
      // Verify the update
      console.log('\n✅ Verifying update...');
      const updatedStaff = await sql`
        SELECT s.*, u.first_name, u.last_name, l.name as location_name
        FROM staff s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN locations l ON s.location_id = l.id
        WHERE s.id = ${staff.id}
      `;
      
      console.log(`Updated record: ${updatedStaff[0].first_name} ${updatedStaff[0].last_name}, Location: ${updatedStaff[0].location_name} (ID: ${updatedStaff[0].location_id})`);
      
      // Test API endpoint
      console.log('\n🌐 Testing API endpoint...');
      const apiUrl = `https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/staff?locationId=${locationId}`;
      
      try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        console.log(`API returned ${data.length} staff for location ${locationId}`);
        
        const candraInLocation = data.find(staff => 
          staff.user && 
          (staff.user.firstName?.toLowerCase().includes('candra') || 
           staff.user.lastName?.toLowerCase().includes('czapansky'))
        );
        
        if (candraInLocation) {
          console.log(`✅ Found Candra in location ${locationName}:`, {
            id: candraInLocation.id,
            title: candraInLocation.title,
            locationId: candraInLocation.locationId,
            user: candraInLocation.user
          });
        } else {
          console.log(`❌ Candra still not found in location ${locationName}`);
        }
        
      } catch (error) {
        console.error(`❌ API test failed:`, error);
      }
      
    } else {
      console.log('❌ No schedules found to determine location');
    }
    
    console.log('\n🎉 Fix completed!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

fixCandraLocation().catch(console.error);
