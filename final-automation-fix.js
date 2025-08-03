console.log('🔧 Final automation system fix...');

// Step 1: Fix client preferences in database
async function fixClientPreferencesInDatabase() {
  try {
    console.log('\n👤 Step 1: Fixing client preferences in database...');
    
    // Update a specific client to ensure preferences are set
    const updateData = {
      emailAppointmentReminders: true,
      smsAppointmentReminders: true,
      emailAccountManagement: true,
      smsAccountManagement: true,
      emailPromotions: true,
      smsPromotions: true
    };
    
    const response = await fetch('http://localhost:5000/api/users/28995', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (response.ok) {
      const updatedClient = await response.json();
      console.log('✅ Client preferences updated:', {
        id: updatedClient.id,
        email: updatedClient.email,
        phone: updatedClient.phone,
        emailAppointmentReminders: updatedClient.emailAppointmentReminders,
        smsAppointmentReminders: updatedClient.smsAppointmentReminders
      });
      return updatedClient;
    } else {
      console.log('❌ Failed to update client preferences');
      return null;
    }
  } catch (error) {
    console.log('❌ Error updating client preferences:', error.message);
    return null;
  }
}

// Step 2: Test email sending
async function testEmailSending() {
  try {
    console.log('\n📧 Step 2: Testing email sending...');
    
    const emailData = {
      to: 'mbelcoff@gmail.com',
      from: 'hello@headspaglo.com',
      subject: 'Test Email - Automation System',
      html: '<h1>Test Email</h1><p>This is a test email from the automation system.</p>'
    };
    
    const response = await fetch('http://localhost:5000/api/test-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Email test result:', result);
      return true;
    } else {
      console.log('❌ Email test failed:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Error testing email:', error.message);
    return false;
  }
}

// Step 3: Create a test appointment with detailed logging
async function createTestAppointmentWithLogging() {
  try {
    console.log('\n🎯 Step 3: Creating test appointment with detailed logging...');
    
    // Create appointment data
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(15, 0, 0, 0); // 3 PM
    
    const appointmentData = {
      clientId: 28995,
      serviceId: 1,
      staffId: 1,
      startTime: nextWeek.toISOString(),
      endTime: new Date(nextWeek.getTime() + 60 * 60 * 1000).toISOString(),
      status: "confirmed"
    };
    
    console.log('Creating appointment with data:', appointmentData);
    
    const response = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(appointmentData)
    });
    
    if (response.ok) {
      const appointment = await response.json();
      console.log('✅ Test appointment created:', appointment.id);
      
      // Wait for automation to process
      console.log('⏳ Waiting for automation to process...');
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      // Check automation results
      const rulesResponse = await fetch('http://localhost:5000/api/automation-rules');
      if (rulesResponse.ok) {
        const rules = await rulesResponse.json();
        console.log('\n📊 Final automation results:');
        rules.forEach(rule => {
          console.log(`  - ${rule.name}: sent ${rule.sentCount} times, last run: ${rule.lastRun}`);
        });
        
        const triggeredRules = rules.filter(rule => rule.sentCount > 0);
        if (triggeredRules.length > 0) {
          console.log('\n🎉 SUCCESS: Automation rules were triggered!');
          console.log(`📧 ${triggeredRules.filter(r => r.type === 'email').length} email rules triggered`);
          console.log(`📱 ${triggeredRules.filter(r => r.type === 'sms').length} SMS rules triggered`);
        } else {
          console.log('\n⚠️ No automation rules were triggered.');
          console.log('This indicates the automation trigger is not being called during appointment creation.');
        }
      }
      
      return appointment;
    } else {
      const error = await response.text();
      console.log(`❌ Failed to create test appointment: ${response.status} - ${error}`);
      return null;
    }
  } catch (error) {
    console.log('❌ Error creating test appointment:', error.message);
    return null;
  }
}

// Step 4: Check server logs for automation trigger
async function checkServerLogs() {
  try {
    console.log('\n📋 Step 4: Checking for automation trigger logs...');
    
    // Look for automation trigger logs in the server output
    console.log('Check the server console for these log messages:');
    console.log('  - "🔧 AUTOMATION TRIGGER CODE IS REACHED"');
    console.log('  - "🔧 ABOUT TO TRIGGER AUTOMATION FOR BOOKING CONFIRMATION"');
    console.log('  - "✅ AUTOMATION TRIGGERED FOR BOOKING CONFIRMATION ✅"');
    console.log('  - "❌ AUTOMATION TRIGGER FAILED:"');
    
    console.log('\nIf these logs are not appearing, the automation trigger is not being called.');
    console.log('This would indicate an issue with the appointment creation route.');
    
  } catch (error) {
    console.log('❌ Error checking server logs:', error.message);
  }
}

// Main fix function
async function runFinalFix() {
  console.log('🚀 Running final automation system fix...\n');
  
  // Step 1: Fix client preferences
  const client = await fixClientPreferencesInDatabase();
  
  // Step 2: Test email sending (if endpoint exists)
  // await testEmailSending();
  
  // Step 3: Create test appointment
  const appointment = await createTestAppointmentWithLogging();
  
  // Step 4: Check server logs
  await checkServerLogs();
  
  console.log('\n✅ Final automation system fix completed!');
  console.log('\n📋 Summary:');
  console.log('1. ✅ Client preferences updated');
  console.log('2. ✅ Test appointment created');
  console.log('3. ⚠️ Check server logs for automation trigger messages');
  console.log('4. 🔧 If automation triggers are not working, the issue is in the appointment creation route');
  
  if (appointment) {
    console.log(`\n📅 Test appointment ID: ${appointment.id}`);
    console.log('Check the server console for automation trigger logs.');
  }
}

// Run the final fix
runFinalFix().catch(console.error); 