const fetch = require('node-fetch');

async function testAppointment() {
  try {
    // First, get staff list
    const staffRes = await fetch('http://localhost:3002/api/staff');
    const staff = await staffRes.json();
    console.log('Total staff:', staff.length);
    
    // Use staff ID 11 as mentioned earlier
    const staffId = 11;
    
    // Create a test appointment for August 10, 2025 at 11:00 AM
    const appointment = {
      clientId: 1,
      serviceId: 1,
      staffId: staffId,
      locationId: 1,
      startTime: "2025-08-10T11:00:00.000Z",
      endTime: "2025-08-10T12:00:00.000Z",
      status: "confirmed",
      paymentStatus: "unpaid",
      notes: "Test appointment at 11am"
    };
    
    const createRes = await fetch('http://localhost:3002/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointment)
    });
    
    if (createRes.ok) {
      const created = await createRes.json();
      console.log('Created appointment:', created);
      
      // Now fetch appointments to verify
      const verifyRes = await fetch('http://localhost:3002/api/appointments?locationId=1');
      const appointments = await verifyRes.json();
      const aug10Apps = appointments.filter(a => a.startTime && a.startTime.startsWith('2025-08-10'));
      console.log('Appointments on Aug 10, 2025:', aug10Apps.length);
      aug10Apps.forEach(a => {
        console.log('  -', a.id, 'Staff:', a.staffId, 'Time:', a.startTime, 'Status:', a.status);
      });
    } else {
      console.log('Failed to create appointment:', createRes.status, await createRes.text());
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testAppointment();
