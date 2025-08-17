import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function updateCandraToGloop() {
  console.log('🔧 Updating Candra to GloUp location...');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Find Candra's staff record
    console.log('\n👨‍💼 Finding Candra\'s staff record...');
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
    console.log(`Found Candra: ${staff.first_name} ${staff.last_name}, Staff ID: ${staff.id}, Current Location: ${staff.location_name || 'NULL'} (${staff.location_id})`);
    
    // Update Candra's staff record to GloUp (location 11)
    console.log('\n🔧 Updating Candra\'s staff record to GloUp...');
    await sql`
      UPDATE staff 
      SET location_id = 11
      WHERE id = ${staff.id}
    `;
    
    console.log(`✅ Updated Candra's location to: GloUp (ID: 11)`);
    
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
    
    // Test API endpoint for GloUp
    console.log('\n🌐 Testing API endpoint for GloUp...');
    const apiUrl = `https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/staff?locationId=11`;
    
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      console.log(`API returned ${data.length} staff for GloUp location`);
      
      const candraInLocation = data.find(staff => 
        staff.user && 
        (staff.user.firstName?.toLowerCase().includes('candra') || 
         staff.user.lastName?.toLowerCase().includes('czapansky'))
      );
      
      if (candraInLocation) {
        console.log(`✅ Found Candra in GloUp location:`, {
          id: candraInLocation.id,
          title: candraInLocation.title,
          locationId: candraInLocation.locationId,
          user: candraInLocation.user
        });
      } else {
        console.log(`❌ Candra not found in GloUp location`);
      }
      
    } catch (error) {
      console.error(`❌ API test failed:`, error);
    }
    
    // Test schedules API for GloUp
    console.log('\n📅 Testing schedules API for GloUp...');
    const schedulesApiUrl = `https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/schedules?locationId=11`;
    
    try {
      const response = await fetch(schedulesApiUrl);
      const data = await response.json();
      console.log(`API returned ${data.length} schedules for GloUp location`);
      
      const candraSchedules = data.filter(schedule => schedule.staffId === staff.id);
      console.log(`Found ${candraSchedules.length} schedules for Candra in GloUp`);
      
      if (candraSchedules.length > 0) {
        candraSchedules.forEach(schedule => {
          console.log(`  - ${schedule.dayOfWeek} ${schedule.startTime}-${schedule.endTime}`);
        });
      }
      
    } catch (error) {
      console.error(`❌ Schedules API test failed:`, error);
    }
    
    console.log('\n🎉 Update completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Go to the appointments page');
    console.log('2. Select "GloUp" location from the location selector');
    console.log('3. Candra should now appear in the staff filter dropdown');
    console.log('4. Her schedules should show up on the calendar');
    
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

updateCandraToGloop().catch(console.error);
