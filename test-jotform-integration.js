// Test script for Jotform integration
const BASE_URL = 'http://localhost:5000';

async function testJotformIntegration() {
  console.log('Testing Jotform Integration...\n');

  try {
    // Test webhook status
    console.log('1. Testing webhook status...');
    const statusResponse = await fetch(`${BASE_URL}/api/jotform/webhook`);
    const statusData = await statusResponse.json();
    console.log('Webhook status:', statusData);
    console.log('');

    // Test with sample Jotform submission data
    console.log('2. Testing with sample submission data...');
    const sampleSubmission = {
      formID: "test_form_123",
      submissionID: "test_submission_456",
      created_at: new Date().toISOString(),
      answers: {
        "1": { "answer": "John" },                    // First Name
        "2": { "answer": "Doe" },                     // Last Name
        "3": { "answer": "john.doe@example.com" },    // Email
        "4": { "answer": "555-123-4567" },            // Phone
        "5": { "answer": "Haircut" },                 // Service
        "6": { "answer": "2025-01-28" },              // Date
        "7": { "answer": "10:00" },                   // Time
        "8": { "answer": "First time client" },       // Notes
        "9": { "answer": "Jane Smith" }               // Staff Member
      }
    };

    const submissionResponse = await fetch(`${BASE_URL}/api/jotform/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sampleSubmission)
    });

    const submissionData = await submissionResponse.json();
    console.log('Submission result:', submissionData);
    console.log('');

    // Test with minimal data
    console.log('3. Testing with minimal data...');
    const minimalSubmission = {
      formID: "test_form_123",
      submissionID: "test_submission_789",
      created_at: new Date().toISOString(),
      answers: {
        "1": { "answer": "Jane" },
        "2": { "answer": "Smith" },
        "3": { "answer": "jane.smith@example.com" },
        "5": { "answer": "Massage" },
        "6": { "answer": "2025-01-29" },
        "7": { "answer": "14:00" }
      }
    };

    const minimalResponse = await fetch(`${BASE_URL}/api/jotform/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(minimalSubmission)
    });

    const minimalData = await minimalResponse.json();
    console.log('Minimal submission result:', minimalData);
    console.log('');

    console.log('✅ Jotform integration test completed!');
    console.log('\nNext steps:');
    console.log('1. Check your app logs for processing details');
    console.log('2. Verify appointments were created in your app');
    console.log('3. Set up your actual Jotform form with the correct field mappings');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testJotformIntegration(); 