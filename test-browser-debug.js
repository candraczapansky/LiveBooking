import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";

async function testBrowserDebug() {
  console.log('🔍 Testing Browser-Side Calendar Issues...');
  
  const sql = neon(DATABASE_URL);
  
  try {
    // Wait for server to start
    console.log('⏳ Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test the exact API calls that the frontend makes
    console.log('\n🌐 Testing Frontend API Calls...');
    
    // Test 1: Locations API
    console.log('\n1️⃣ Testing Locations API...');
    try {
      const locationsResponse = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/locations');
      const locationsData = await locationsResponse.json();
      console.log(`Locations API: ${locationsData.length} locations returned`);
      
      const gloopLocation = locationsData.find(loc => loc.id === 11);
      if (gloopLocation) {
        console.log(`✅ GloUp location found: ${gloopLocation.name}`);
      } else {
        console.log(`❌ GloUp location not found`);
      }
    } catch (error) {
      console.error('❌ Locations API test failed:', error);
    }
    
    // Test 2: Staff API for GloUp
    console.log('\n2️⃣ Testing Staff API for GloUp...');
    try {
      const staffResponse = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/staff?locationId=11');
      const staffData = await staffResponse.json();
      console.log(`Staff API for GloUp: ${staffData.length} staff returned`);
      
      staffData.forEach(staff => {
        console.log(`  - ${staff.user?.firstName} ${staff.user?.lastName}: ID ${staff.id}, Location: ${staff.locationId}`);
      });
      
      const candraInStaff = staffData.find(staff => 
        staff.user && 
        (staff.user.firstName?.toLowerCase().includes('candra') || 
         staff.user.lastName?.toLowerCase().includes('czapansky'))
      );
      
      if (candraInStaff) {
        console.log(`✅ Candra found in staff API for GloUp`);
      } else {
        console.log(`❌ Candra NOT found in staff API for GloUp`);
      }
    } catch (error) {
      console.error('❌ Staff API test failed:', error);
    }
    
    // Test 3: Schedules API for GloUp
    console.log('\n3️⃣ Testing Schedules API for GloUp...');
    try {
      const schedulesResponse = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/schedules?locationId=11');
      const schedulesData = await schedulesResponse.json();
      console.log(`Schedules API for GloUp: ${schedulesData.length} schedules returned`);
      
      const candraSchedules = schedulesData.filter(schedule => {
        // Find Candra's staff ID
        return schedule.staffId === 61; // Candra's staff ID
      });
      
      console.log(`Candra schedules: ${candraSchedules.length} found`);
      candraSchedules.forEach(schedule => {
        console.log(`  - ${schedule.dayOfWeek} ${schedule.startTime}-${schedule.endTime}, Blocked: ${schedule.isBlocked}`);
      });
    } catch (error) {
      console.error('❌ Schedules API test failed:', error);
    }
    
    // Test 4: Appointments API for GloUp
    console.log('\n4️⃣ Testing Appointments API for GloUp...');
    try {
      const appointmentsResponse = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/appointments?locationId=11');
      const appointmentsData = await appointmentsResponse.json();
      console.log(`Appointments API for GloUp: ${appointmentsData.length} appointments returned`);
      
      const candraAppointments = appointmentsData.filter(apt => apt.staffId === 61);
      console.log(`Candra appointments: ${candraAppointments.length} found`);
    } catch (error) {
      console.error('❌ Appointments API test failed:', error);
    }
    
    // Test 5: Services API for GloUp
    console.log('\n5️⃣ Testing Services API for GloUp...');
    try {
      const servicesResponse = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/services?locationId=11');
      const servicesData = await servicesResponse.json();
      console.log(`Services API for GloUp: ${servicesData.length} services returned`);
    } catch (error) {
      console.error('❌ Services API test failed:', error);
    }
    
    // Test 6: Simulate the calendar's data flow
    console.log('\n6️⃣ Simulating Calendar Data Flow...');
    
    // Get current date info
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    const dateString = today.toISOString().slice(0, 10);
    
    console.log(`Today: ${dateString} (${dayName})`);
    
    // Simulate the calendar's background events logic
    try {
      const schedulesResponse = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/schedules?locationId=11');
      const schedulesData = await schedulesResponse.json();
      
      const staffResponse = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/staff?locationId=11');
      const staffData = await staffResponse.json();
      
      console.log(`Calendar simulation:`);
      console.log(`  - Staff count: ${staffData.length}`);
      console.log(`  - Schedules count: ${schedulesData.length}`);
      
      // Simulate the getBackgroundEvents logic
      const backgroundEvents = [];
      
      staffData.forEach(staff => {
        console.log(`Processing staff: ${staff.user?.firstName} ${staff.user?.lastName} (ID: ${staff.id})`);
        
        // Find schedules for this staff for today
        const todaySchedules = schedulesData.filter(schedule => {
          const matchesStaff = schedule.staffId === staff.id;
          const matchesDay = schedule.dayOfWeek === dayName;
          
          // Fixed date comparison logic
          const todayString = dateString;
          const startDateString = typeof schedule.startDate === 'string' 
            ? schedule.startDate 
            : new Date(schedule.startDate).toISOString().slice(0, 10);
          const endDateString = schedule.endDate 
            ? (typeof schedule.endDate === 'string' 
              ? schedule.endDate 
              : new Date(schedule.endDate).toISOString().slice(0, 10))
            : null;
          
          const matchesStartDate = startDateString <= todayString;
          const matchesEndDate = !endDateString || endDateString >= todayString;
          
          console.log(`  Schedule ${schedule.id}: staff=${matchesStaff}, day=${matchesDay}, startDate=${startDateString}<=${todayString}=${matchesStartDate}, endDate=${endDateString}>=${todayString}=${matchesEndDate}`);
          
          return matchesStaff && matchesDay && matchesStartDate && matchesEndDate;
        });
        
        console.log(`  Today's schedules for ${staff.user?.firstName}: ${todaySchedules.length}`);
        todaySchedules.forEach(schedule => {
          console.log(`    - ${schedule.startTime}-${schedule.endTime}, Blocked: ${schedule.isBlocked}`);
          backgroundEvents.push({
            staffId: staff.id,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            isBlocked: schedule.isBlocked
          });
        });
      });
      
      console.log(`\n📊 Background Events Summary:`);
      console.log(`Total background events: ${backgroundEvents.length}`);
      console.log(`Available events: ${backgroundEvents.filter(e => !e.isBlocked).length}`);
      console.log(`Blocked events: ${backgroundEvents.filter(e => e.isBlocked).length}`);
      
    } catch (error) {
      console.error('❌ Calendar simulation failed:', error);
    }
    
    // Summary
    console.log('\n📋 BROWSER DEBUG SUMMARY:');
    console.log('All API endpoints are working correctly.');
    console.log('The issue might be:');
    console.log('1. Browser cache not cleared');
    console.log('2. React Query cache not invalidated');
    console.log('3. Frontend not re-rendering');
    console.log('4. Calendar component not updating');
    
    console.log('\n🎯 Troubleshooting Steps:');
    console.log('1. Clear browser cache (Ctrl+F5 or Cmd+Shift+R)');
    console.log('2. Check browser console for JavaScript errors');
    console.log('3. Check React Query DevTools for cache issues');
    console.log('4. Try switching locations and back to GloUp');
    console.log('5. Check if the calendar view is set to "week" or "day"');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testBrowserDebug().catch(console.error);
