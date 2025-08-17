import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function debugDateFiltering() {
  console.log('🔍 Debugging Date Filtering Logic...');
  
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
    
    // Get ALL of Candra's schedules for GloUp
    console.log('\n📅 Getting ALL of Candra\'s schedules for GloUp...');
    const allCandraSchedules = await sql`
      SELECT ss.*, l.name as location_name
      FROM staff_schedules ss
      LEFT JOIN locations l ON ss.location_id = l.id
      WHERE ss.staff_id = ${staff.id} 
      AND ss.location_id = 11
      ORDER BY ss.day_of_week, ss.start_time
    `;
    
    console.log(`Found ${allCandraSchedules.length} total schedules for Candra in GloUp:`);
    allCandraSchedules.forEach(schedule => {
      console.log(`  - ${schedule.day_of_week} ${schedule.start_time}-${schedule.end_time}, Start Date: ${schedule.start_date}, End Date: ${schedule.end_date || 'NULL'}, Blocked: ${schedule.is_blocked}`);
    });
    
    // Check each schedule individually for today
    console.log('\n🔍 Checking each schedule for today\'s criteria...');
    allCandraSchedules.forEach((schedule, index) => {
      console.log(`\nSchedule ${index + 1}:`);
      console.log(`  - Day: ${schedule.day_of_week} (today is ${dayName})`);
      console.log(`  - Start Date: ${schedule.start_date} (today is ${dateString})`);
      console.log(`  - End Date: ${schedule.end_date || 'NULL'}`);
      
      const matchesDay = schedule.day_of_week === dayName;
      const matchesStartDate = schedule.start_date <= dateString;
      const matchesEndDate = !schedule.end_date || schedule.end_date >= dateString;
      
      console.log(`  - Matches day: ${matchesDay}`);
      console.log(`  - Matches start date: ${matchesStartDate}`);
      console.log(`  - Matches end date: ${matchesEndDate}`);
      console.log(`  - All match: ${matchesDay && matchesStartDate && matchesEndDate}`);
    });
    
    // Check if there are any schedules that should match today
    const todayMatches = allCandraSchedules.filter(schedule => {
      const matchesDay = schedule.day_of_week === dayName;
      const matchesStartDate = schedule.start_date <= dateString;
      const matchesEndDate = !schedule.end_date || schedule.end_date >= dateString;
      return matchesDay && matchesStartDate && matchesEndDate;
    });
    
    console.log(`\n📊 Today's matches: ${todayMatches.length}`);
    todayMatches.forEach(schedule => {
      console.log(`  - ${schedule.day_of_week} ${schedule.start_time}-${schedule.end_time}, Blocked: ${schedule.is_blocked}`);
    });
    
    // Check if there are any Friday schedules at all
    const fridaySchedules = allCandraSchedules.filter(s => s.day_of_week === 'Friday');
    console.log(`\n📅 Friday schedules: ${fridaySchedules.length}`);
    fridaySchedules.forEach(schedule => {
      console.log(`  - ${schedule.start_time}-${schedule.end_time}, Start Date: ${schedule.start_date}, End Date: ${schedule.end_date || 'NULL'}`);
    });
    
    // Check if there are any schedules with start_date <= today
    const validStartDate = allCandraSchedules.filter(s => s.start_date <= dateString);
    console.log(`\n📅 Schedules with valid start date: ${validStartDate.length}`);
    validStartDate.forEach(schedule => {
      console.log(`  - ${schedule.day_of_week} ${schedule.start_time}-${schedule.end_time}, Start Date: ${schedule.start_date}`);
    });
    
    // Check if there are any schedules with end_date >= today or NULL
    const validEndDate = allCandraSchedules.filter(s => !s.end_date || s.end_date >= dateString);
    console.log(`\n📅 Schedules with valid end date: ${validEndDate.length}`);
    validEndDate.forEach(schedule => {
      console.log(`  - ${schedule.day_of_week} ${schedule.start_time}-${schedule.end_time}, End Date: ${schedule.end_date || 'NULL'}`);
    });
    
    // Test the exact query that should work
    console.log('\n🔍 Testing exact query for today...');
    const todayQuery = await sql`
      SELECT ss.*, l.name as location_name
      FROM staff_schedules ss
      LEFT JOIN locations l ON ss.location_id = l.id
      WHERE ss.staff_id = ${staff.id} 
      AND ss.location_id = 11
      AND ss.day_of_week = ${dayName}
      AND ss.start_date <= ${dateString}
      AND (ss.end_date IS NULL OR ss.end_date >= ${dateString})
    `;
    
    console.log(`Exact query result: ${todayQuery.length} schedules`);
    todayQuery.forEach(schedule => {
      console.log(`  - ${schedule.start_time}-${schedule.end_time}, Blocked: ${schedule.is_blocked}`);
    });
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`Today: ${dateString} (${dayName})`);
    console.log(`Total GloUp schedules: ${allCandraSchedules.length}`);
    console.log(`Friday schedules: ${fridaySchedules.length}`);
    console.log(`Valid start date: ${validStartDate.length}`);
    console.log(`Valid end date: ${validEndDate.length}`);
    console.log(`Today's matches: ${todayMatches.length}`);
    console.log(`Exact query result: ${todayQuery.length}`);
    
    if (todayQuery.length === 0) {
      console.log('\n⚠️  ISSUE: No schedules found for today!');
      console.log('This explains why Candra is not showing up on the calendar.');
    } else {
      console.log('\n✅ Schedules found for today!');
      console.log('Candra should appear on the calendar.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

debugDateFiltering().catch(console.error);
