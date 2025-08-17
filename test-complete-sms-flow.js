// Complete test for the structured SMS assistant
async function testCompleteFlow() {
  console.log('🧪 Testing Complete SMS Flow\n');

  const storage = new MockStorage();
  const assistant = new MockSMSStructuredAssistant(storage);

  const testPhone = '+1234567890';
  
  // Step 1: Greeting
  console.log('📱 Step 1: Greeting');
  await assistant.processMessage({
    from: testPhone,
    to: '+1987654321',
    body: 'Hi, I want to book an appointment',
    timestamp: new Date().toISOString(),
    messageId: 'step_1'
  });
  console.log('');

  // Step 2: Service selection
  console.log('📱 Step 2: Service selection');
  await assistant.processMessage({
    from: testPhone,
    to: '+1987654321',
    body: 'I want the signature head spa',
    timestamp: new Date().toISOString(),
    messageId: 'step_2'
  });
  console.log('');

  // Step 3: Date selection
  console.log('📱 Step 3: Date selection');
  await assistant.processMessage({
    from: testPhone,
    to: '+1987654321',
    body: 'tomorrow',
    timestamp: new Date().toISOString(),
    messageId: 'step_3'
  });
  console.log('');

  // Step 4: Time selection (this triggers get_available_times)
  console.log('📱 Step 4: Time selection');
  await assistant.processMessage({
    from: testPhone,
    to: '+1987654321',
    body: '9:00 AM',
    timestamp: new Date().toISOString(),
    messageId: 'step_4'
  });
  console.log('');

  // Step 5: User selects a time from available times
  console.log('📱 Step 5: User selects time');
  await assistant.processMessage({
    from: testPhone,
    to: '+1987654321',
    body: '9:00 AM',
    timestamp: new Date().toISOString(),
    messageId: 'step_5'
  });
  console.log('');

  // Step 6: Client name
  console.log('📱 Step 6: Client name');
  await assistant.processMessage({
    from: testPhone,
    to: '+1987654321',
    body: 'John Smith',
    timestamp: new Date().toISOString(),
    messageId: 'step_6'
  });
  console.log('');

  // Step 7: Client email
  console.log('📱 Step 7: Client email');
  await assistant.processMessage({
    from: testPhone,
    to: '+1987654321',
    body: 'john.smith@email.com',
    timestamp: new Date().toISOString(),
    messageId: 'step_7'
  });
  console.log('');

  // Step 8: Client phone
  console.log('📱 Step 8: Client phone');
  await assistant.processMessage({
    from: testPhone,
    to: '+1987654321',
    body: '+1234567890',
    timestamp: new Date().toISOString(),
    messageId: 'step_8'
  });
  console.log('');

  // Step 9: Confirmation
  console.log('📱 Step 9: Confirmation');
  await assistant.processMessage({
    from: testPhone,
    to: '+1987654321',
    body: 'yes, that\'s correct',
    timestamp: new Date().toISOString(),
    messageId: 'step_9'
  });
  console.log('');

  console.log('✅ Complete SMS Flow test completed!');
}

// Run the test
testCompleteFlow().catch(console.error); 