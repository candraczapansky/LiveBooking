#!/usr/bin/env node

const BASE_URL = 'http://localhost:5001';

async function testConversationFlows() {
  console.log('🧪 Testing Conversation Flow API...\n');

  try {
    // Test 1: Get all conversation flows (should be empty initially)
    console.log('1. Getting all conversation flows...');
    const response1 = await fetch(`${BASE_URL}/api/sms-auto-respond/conversation-flows`);
    if (response1.ok) {
      const flows = await response1.json();
      console.log('   ✅ Success:', flows.length, 'flows found');
    } else {
      console.log('   ❌ Failed:', response1.status, response1.statusText);
    }

    // Test 2: Create a new conversation flow
    console.log('\n2. Creating a new conversation flow...');
    const newFlow = {
      name: 'Standard Appointment Booking',
      description: 'Default flow for booking appointments via SMS',
      steps: [
        {
          id: 'step-1',
          type: 'trigger',
          name: 'Booking Request',
          content: 'book, appointment, schedule',
          order: 1
        },
        {
          id: 'step-2',
          type: 'response',
          name: 'Ask for Service',
          content: 'Great! I\'d love to help you book an appointment. What service would you like?',
          order: 2
        },
        {
          id: 'step-3',
          type: 'question',
          name: 'Service Selection',
          content: 'Which service would you like to book?',
          order: 3
        },
        {
          id: 'step-4',
          type: 'response',
          name: 'Ask for Date',
          content: 'Perfect! What date would you like to come in?',
          order: 4
        },
        {
          id: 'step-5',
          type: 'question',
          name: 'Date Selection',
          content: 'What date works for you?',
          order: 5
        },
        {
          id: 'step-6',
          type: 'response',
          name: 'Show Available Times',
          content: 'Great! Here are the available times for {date}: {available_times}. Which time works best?',
          order: 6
        },
        {
          id: 'step-7',
          type: 'action',
          name: 'Book Appointment',
          content: 'book_appointment',
          order: 7
        }
      ],
      isActive: true
    };

    const response2 = await fetch(`${BASE_URL}/api/sms-auto-respond/conversation-flows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newFlow)
    });

    if (response2.ok) {
      const createdFlow = await response2.json();
      console.log('   ✅ Success: Flow created with ID:', createdFlow.id);
      console.log('   📝 Name:', createdFlow.name);
      console.log('   📊 Steps:', createdFlow.steps.length);
      
      // Test 3: Get the specific flow
      console.log('\n3. Getting the created flow...');
      const response3 = await fetch(`${BASE_URL}/api/sms-auto-respond/conversation-flows/${createdFlow.id}`);
      if (response3.ok) {
        const retrievedFlow = await response3.json();
        console.log('   ✅ Success: Retrieved flow');
        console.log('   📝 Name:', retrievedFlow.name);
        console.log('   📊 Steps:', retrievedFlow.steps.length);
      } else {
        console.log('   ❌ Failed to retrieve flow:', response3.status);
      }

      // Test 4: Update the flow
      console.log('\n4. Updating the flow...');
      const updatedFlow = {
        ...createdFlow,
        name: 'Updated Appointment Booking Flow',
        description: 'Updated description for the booking flow'
      };

      const response4 = await fetch(`${BASE_URL}/api/sms-auto-respond/conversation-flows`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFlow)
      });

      if (response4.ok) {
        const updatedFlowResult = await response4.json();
        console.log('   ✅ Success: Flow updated');
        console.log('   📝 New name:', updatedFlowResult.name);
      } else {
        console.log('   ❌ Failed to update flow:', response4.status);
      }

      // Test 5: Get all flows again (should have 1 now)
      console.log('\n5. Getting all flows again...');
      const response5 = await fetch(`${BASE_URL}/api/sms-auto-respond/conversation-flows`);
      if (response5.ok) {
        const flows = await response5.json();
        console.log('   ✅ Success:', flows.length, 'flows found');
        if (flows.length > 0) {
          console.log('   📝 First flow:', flows[0].name);
        }
      } else {
        console.log('   ❌ Failed:', response5.status);
      }

      // Test 6: Delete the flow
      console.log('\n6. Deleting the flow...');
      const response6 = await fetch(`${BASE_URL}/api/sms-auto-respond/conversation-flows/${createdFlow.id}`, {
        method: 'DELETE'
      });

      if (response6.ok) {
        console.log('   ✅ Success: Flow deleted');
      } else {
        console.log('   ❌ Failed to delete flow:', response6.status);
      }

      // Test 7: Verify deletion
      console.log('\n7. Verifying deletion...');
      const response7 = await fetch(`${BASE_URL}/api/sms-auto-respond/conversation-flows`);
      if (response7.ok) {
        const flows = await response7.json();
        console.log('   ✅ Success:', flows.length, 'flows remaining');
      } else {
        console.log('   ❌ Failed:', response7.status);
      }

    } else {
      console.log('   ❌ Failed to create flow:', response2.status, response2.statusText);
      const error = await response2.text();
      console.log('   📄 Error details:', error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n🎉 Conversation Flow API test completed!');
}

// Run the test
testConversationFlows(); 