// Test script to verify note history functionality
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5001'; // Adjust port if needed

async function testNoteHistory() {
  console.log('🧪 Testing Note History System...\n');

  // Test 1: Create a note history entry
  console.log('1. Testing note history creation...');
  try {
    const noteData = {
      clientId: 27951, // Use an existing client ID
      appointmentId: 203, // Use an existing appointment ID
      noteContent: 'Test note content with timestamp functionality',
      noteType: 'appointment',
      createdBy: 1,
      createdByRole: 'staff'
    };

    const response = await fetch(`${BASE_URL}/api/note-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Note history entry created successfully');
      console.log('   Note ID:', data.id);
      console.log('   Created at:', data.createdAt);
    } else {
      console.log('❌ Failed to create note history entry:', data);
    }
  } catch (error) {
    console.log('❌ Error creating note history entry:', error.message);
  }

  // Test 2: Get note history for client
  console.log('\n2. Testing note history retrieval for client...');
  try {
    const response = await fetch(`${BASE_URL}/api/note-history/client/27951`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Note history retrieved successfully');
      console.log('   Number of notes:', data.length);
      if (data.length > 0) {
        console.log('   Latest note:', data[0].noteContent.substring(0, 50) + '...');
        console.log('   Created at:', data[0].createdAt);
      }
    } else {
      console.log('❌ Failed to retrieve note history:', data);
    }
  } catch (error) {
    console.log('❌ Error retrieving note history:', error.message);
  }

  // Test 3: Get note history for appointment
  console.log('\n3. Testing note history retrieval for appointment...');
  try {
    const response = await fetch(`${BASE_URL}/api/note-history/appointment/203`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Appointment note history retrieved successfully');
      console.log('   Number of notes:', data.length);
      if (data.length > 0) {
        console.log('   Latest note:', data[0].noteContent.substring(0, 50) + '...');
        console.log('   Note type:', data[0].noteType);
      }
    } else {
      console.log('❌ Failed to retrieve appointment note history:', data);
    }
  } catch (error) {
    console.log('❌ Error retrieving appointment note history:', error.message);
  }

  console.log('\n🎉 Note history testing completed!');
}

testNoteHistory().catch(console.error); 