// Comprehensive calendar debug script
const BASE_URL = 'http://localhost:5000';

async function debugCalendar() {
  console.log('🔍 Comprehensive Calendar Debug...\n');

  try {
    // 1. Test API endpoints
    console.log('1. Testing API endpoints...');
    
    const appointmentsResponse = await fetch(`${BASE_URL}/api/appointments`);
    const appointments = await appointmentsResponse.json();
    console.log(`   Appointments API: ${appointments.length} appointments returned`);
    
    const staffResponse = await fetch(`${BASE_URL}/api/staff`);
    const staff = await staffResponse.json();
    console.log(`   Staff API: ${staff.length} staff members returned`);
    
    const servicesResponse = await fetch(`${BASE_URL}/api/services`);
    const services = await servicesResponse.json();
    console.log(`   Services API: ${services.length} services returned`);
    
    // 2. Test specific endpoints used by calendar
    console.log('\n2. Testing calendar-specific endpoints...');
    
    const activeAppointmentsResponse = await fetch(`${BASE_URL}/api/appointments/active`);
    const activeAppointments = await activeAppointmentsResponse.json();
    console.log(`   Active appointments: ${activeAppointments.length} appointments`);
    
    // 3. Analyze appointment data
    console.log('\n3. Analyzing appointment data...');
    
    if (appointments.length > 0) {
      const today = new Date();
      const todayString = today.toDateString();
      
      console.log(`   Today's date: ${todayString}`);
      
      const todayAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.startTime);
        return aptDate.toDateString() === todayString;
      });
      
      console.log(`   Appointments for today: ${todayAppointments.length}`);
      
      if (todayAppointments.length > 0) {
        console.log('   Sample today appointments:');
        todayAppointments.slice(0, 3).forEach((apt, i) => {
          const startTime = new Date(apt.startTime);
          const endTime = new Date(apt.endTime);
          console.log(`     ${i + 1}. ID: ${apt.id}, Staff: ${apt.staffId}, Start: ${startTime.toLocaleTimeString()}, End: ${endTime.toLocaleTimeString()}`);
        });
      }
    }
    
    // 4. Test date conversion logic
    console.log('\n4. Testing date conversion logic...');
    
    if (appointments.length > 0) {
      const sampleApt = appointments[0];
      const originalTime = sampleApt.startTime;
      const parsedTime = new Date(originalTime);
      
      console.log(`   Sample appointment time: ${originalTime}`);
      console.log(`   Parsed as Date: ${parsedTime.toISOString()}`);
      console.log(`   Local time: ${parsedTime.toLocaleString()}`);
      console.log(`   UTC time: ${parsedTime.toUTCString()}`);
      
      // Test the isSameLocalDay function logic
      const today = new Date();
      const isSameDay = parsedTime.toDateString() === today.toDateString();
      console.log(`   Is same day as today: ${isSameDay}`);
    }
    
    // 5. Test staff data
    console.log('\n5. Testing staff data...');
    
    if (staff.length > 0) {
      console.log(`   Staff members: ${staff.map(s => `${s.id}: ${s.name}`).join(', ')}`);
    }
    
    console.log('\n✅ Debug complete!');
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

debugCalendar(); 