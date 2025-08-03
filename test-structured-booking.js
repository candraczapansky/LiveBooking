import { SMSAutoRespondService } from './server/sms-auto-respond-service.js';

// Mock storage for testing
class MockStorage {
  async getUserByPhone(phone) {
    return {
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      phone: phone,
      email: 'test@example.com'
    };
  }
  
  async getAllServices() {
    return [
      { id: 1, name: 'Signature Head Spa', price: 99, duration: 60 },
      { id: 2, name: 'Deluxe Head Spa', price: 160, duration: 90 },
      { id: 3, name: 'Platinum Head Spa', price: 220, duration: 120 }
    ];
  }
  
  async createAppointment(data) {
    console.log('📅 Creating appointment:', data);
    return { id: 123, ...data };
  }
}

async function testStructuredBooking() {
  console.log('🧪 Testing Structured Booking Flow');
  
  const storage = new MockStorage();
  const service = SMSAutoRespondService.getInstance(storage);
  
  // Test 1: Initial booking request
  console.log('\n📱 Test 1: Initial booking request');
  const result1 = await service.processIncomingSMS({
    from: '+1234567890',
    to: '+1987654321',
    body: 'I want to book an appointment',
    timestamp: new Date().toISOString(),
    messageId: 'test1'
  });
  
  console.log('Result 1:', result1);
  
  // Test 2: Service selection
  console.log('\n📱 Test 2: Service selection');
  const result2 = await service.processIncomingSMS({
    from: '+1234567890',
    to: '+1987654321',
    body: 'Signature Head Spa',
    timestamp: new Date().toISOString(),
    messageId: 'test2'
  });
  
  console.log('Result 2:', result2);
  
  // Test 3: Date selection
  console.log('\n📱 Test 3: Date selection');
  const result3 = await service.processIncomingSMS({
    from: '+1234567890',
    to: '+1987654321',
    body: 'tomorrow',
    timestamp: new Date().toISOString(),
    messageId: 'test3'
  });
  
  console.log('Result 3:', result3);
  
  // Test 4: Time selection (this should trigger the booking)
  console.log('\n📱 Test 4: Time selection');
  const result4 = await service.processIncomingSMS({
    from: '+1234567890',
    to: '+1987654321',
    body: '10:30 AM',
    timestamp: new Date().toISOString(),
    messageId: 'test4'
  });
  
  console.log('Result 4:', result4);
  
  // Test 5: Verify no loop (should not ask for service again)
  console.log('\n📱 Test 5: Verify no loop');
  const result5 = await service.processIncomingSMS({
    from: '+1234567890',
    to: '+1987654321',
    body: 'hello',
    timestamp: new Date().toISOString(),
    messageId: 'test5'
  });
  
  console.log('Result 5:', result5);
  
  console.log('\n✅ Structured booking test completed!');
}

testStructuredBooking().catch(console.error); 