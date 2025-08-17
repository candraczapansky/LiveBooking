import fetch from 'node-fetch';

async function testBookingSMS() {
  try {
    console.log('🧪 Testing booking SMS confirmation...');
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test booking an appointment
    const bookingData = {
      clientId: 1, // Assuming client ID 1 exists
      serviceId: 1, // Assuming service ID 1 exists
      staffId: 1, // Assuming staff ID 1 exists
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
      status: 'confirmed',
      notes: 'Test booking for SMS confirmation'
    };
    
    console.log('📅 Booking data:', bookingData);
    
    const response = await fetch('http://localhost:3000/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookingData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Booking successful:', result.id);
      console.log('📱 Check your SMS logs to verify only one confirmation was sent');
    } else {
      const error = await response.text();
      console.log('❌ Booking failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testBookingSMS(); 