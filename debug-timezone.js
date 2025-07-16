// Debug script to test timezone conversion
const BASE_URL = 'http://localhost:5000';

async function debugTimezone() {
  console.log('🔍 Debugging timezone conversion...\n');

  try {
    // 1. Get all appointments
    console.log('1. Fetching appointments...');
    const response = await fetch(`${BASE_URL}/api/appointments`);
    const appointments = await response.json();
    
    console.log(`Found ${appointments.length} appointments\n`);

    if (appointments.length > 0) {
      // 2. Show the first appointment's time data
      const firstAppointment = appointments[0];
      console.log('2. First appointment time data:');
      console.log('   Raw startTime from API:', firstAppointment.startTime);
      console.log('   Raw endTime from API:', firstAppointment.endTime);
      console.log('   Type of startTime:', typeof firstAppointment.startTime);
      console.log('   Is startTime a Date?', firstAppointment.startTime instanceof Date);
      
      // 3. Test different parsing methods
      console.log('\n3. Testing different parsing methods:');
      
      const rawStartTime = firstAppointment.startTime;
      
      // Method 1: Direct Date constructor
      const method1 = new Date(rawStartTime);
      console.log('   Method 1 (new Date()):', method1.toISOString());
      console.log('   Method 1 (local):', method1.toLocaleString());
      
      // Method 2: Parse as local time components
      if (typeof rawStartTime === 'string' && rawStartTime.includes(' ')) {
        const [datePart, timePart] = rawStartTime.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute, second] = timePart.split(':').map(Number);
        const method2 = new Date(year, month - 1, day, hour, minute, second || 0);
        console.log('   Method 2 (local components):', method2.toISOString());
        console.log('   Method 2 (local):', method2.toLocaleString());
      }
      
      // Method 3: Parse as UTC
      if (typeof rawStartTime === 'string') {
        const method3 = new Date(rawStartTime + 'Z');
        console.log('   Method 3 (UTC):', method3.toISOString());
        console.log('   Method 3 (local):', method3.toLocaleString());
      }
      
      // 4. Show timezone offset
      console.log('\n4. Timezone information:');
      console.log('   Current timezone offset:', new Date().getTimezoneOffset(), 'minutes');
      console.log('   Current timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
      
      // 5. Test creating a new appointment time
      console.log('\n5. Testing appointment creation time:');
      const testDate = new Date(2025, 0, 27, 10, 0, 0); // Jan 27, 2025 at 10:00 AM
      console.log('   Test date (10:00 AM local):', testDate.toISOString());
      console.log('   Test date (local):', testDate.toLocaleString());
      
      // 6. Show all appointments with their times
      console.log('\n6. All appointments with times:');
      appointments.forEach((apt, index) => {
        const startTime = new Date(apt.startTime);
        const endTime = new Date(apt.endTime);
        console.log(`   ${index + 1}. ID: ${apt.id}`);
        console.log(`      Raw start: ${apt.startTime}`);
        console.log(`      Parsed start: ${startTime.toISOString()}`);
        console.log(`      Local start: ${startTime.toLocaleString()}`);
        console.log(`      Raw end: ${apt.endTime}`);
        console.log(`      Parsed end: ${endTime.toISOString()}`);
        console.log(`      Local end: ${endTime.toLocaleString()}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the debug
debugTimezone(); 