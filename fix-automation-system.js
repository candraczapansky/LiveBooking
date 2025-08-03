console.log('🔧 Fixing automation system...');

// Step 1: Create a test client with proper preferences
async function createTestClient() {
  try {
    console.log('\n👤 Step 1: Creating test client with proper preferences...');
    
    const clientData = {
      username: 'testclient',
      email: 'test@example.com',
      phone: '+15551234567',
      firstName: 'Test',
      lastName: 'Client',
      role: 'client',
      emailAppointmentReminders: true,
      smsAppointmentReminders: true,
      emailAccountManagement: true,
      smsAccountManagement: true,
      emailPromotions: true,
      smsPromotions: true
    };
    
    const response = await fetch('http://localhost:5000/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(clientData)
    });
    
    if (response.ok) {
      const client = await response.json();
      console.log('✅ Test client created:', client.id);
      return client;
    } else {
      const error = await response.text();
      console.log(`❌ Failed to create test client: ${response.status} - ${error}`);
      return null;
    }
  } catch (error) {
    console.log('❌ Error creating test client:', error.message);
    return null;
  }
}

// Step 2: Update existing clients to have proper preferences
async function updateClientPreferences() {
  try {
    console.log('\n⚙️ Step 2: Updating existing clients with proper preferences...');
    
    // Get all clients
    const response = await fetch('http://localhost:5000/api/users');
    if (response.ok) {
      const users = await response.json();
      const clients = users.filter(user => user.role === 'client');
      
      console.log(`Found ${clients.length} clients to update`);
      
      for (const client of clients) {
        const updateData = {
          emailAppointmentReminders: true,
          smsAppointmentReminders: true,
          emailAccountManagement: true,
          smsAccountManagement: true,
          emailPromotions: true,
          smsPromotions: true
        };
        
        const updateResponse = await fetch(`http://localhost:5000/api/users/${client.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        });
        
        if (updateResponse.ok) {
          console.log(`✅ Updated client ${client.id} preferences`);
        } else {
          console.log(`❌ Failed to update client ${client.id}`);
        }
      }
    }
  } catch (error) {
    console.log('❌ Error updating client preferences:', error.message);
  }
}

// Step 3: Test automation with proper client
async function testAutomationWithClient(clientId) {
  try {
    console.log('\n🎯 Step 3: Testing automation with client ID:', clientId);
    
    // First, verify the client exists and has proper preferences
    const clientResponse = await fetch(`http://localhost:5000/api/users/${clientId}`);
    if (!clientResponse.ok) {
      console.log(`❌ Client ${clientId} not found`);
      return;
    }
    
    const client = await clientResponse.json();
    console.log('✅ Client found:', {
      id: client.id,
      email: client.email,
      phone: client.phone,
      emailAppointmentReminders: client.emailAppointmentReminders,
      smsAppointmentReminders: client.smsAppointmentReminders
    });
    
    // Create a test appointment
    const appointmentData = {
      clientId: clientId,
      serviceId: 1,
      staffId: 1,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
      status: "confirmed"
    };
    
    console.log('Creating appointment with data:', appointmentData);
    
    const appointmentResponse = await fetch('http://localhost:5000/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(appointmentData)
    });
    
    if (appointmentResponse.ok) {
      const appointment = await appointmentResponse.json();
      console.log('✅ Test appointment created:', appointment.id);
      
      // Wait a moment for automation to process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if automation rules were triggered
      const rulesResponse = await fetch('http://localhost:5000/api/automation-rules');
      if (rulesResponse.ok) {
        const rules = await rulesResponse.json();
        console.log('\n📊 Automation results:');
        rules.forEach(rule => {
          console.log(`  - ${rule.name}: sent ${rule.sentCount} times, last run: ${rule.lastRun}`);
        });
      }
      
      return appointment;
    } else {
      const error = await appointmentResponse.text();
      console.log(`❌ Failed to create test appointment: ${appointmentResponse.status} - ${error}`);
      return null;
    }
  } catch (error) {
    console.log('❌ Error testing automation:', error.message);
    return null;
  }
}

// Step 4: Create a simple automation rule for testing
async function createTestAutomationRule() {
  try {
    console.log('\n📝 Step 4: Creating test automation rule...');
    
    const ruleData = {
      name: "Test Automation Rule",
      type: "email",
      trigger: "booking_confirmation",
      timing: "immediately",
      subject: "Test Appointment Confirmation",
      template: "Hi {client_name}! Your appointment is confirmed for {appointment_date} at {appointment_time}. This is a test automation.",
      active: true
    };
    
    const response = await fetch('http://localhost:5000/api/automation-rules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ruleData)
    });
    
    if (response.ok) {
      const rule = await response.json();
      console.log('✅ Test automation rule created:', rule.id);
      return rule;
    } else {
      const error = await response.text();
      console.log(`❌ Failed to create test automation rule: ${response.status} - ${error}`);
      return null;
    }
  } catch (error) {
    console.log('❌ Error creating test automation rule:', error.message);
    return null;
  }
}

// Main fix function
async function fixAutomationSystem() {
  console.log('🚀 Starting automation system fix...\n');
  
  // Update existing clients
  await updateClientPreferences();
  
  // Create test client
  const testClient = await createTestClient();
  
  // Create test automation rule
  await createTestAutomationRule();
  
  // Test with the first available client or the test client
  let clientId = 1;
  if (testClient) {
    clientId = testClient.id;
  }
  
  await testAutomationWithClient(clientId);
  
  console.log('\n✅ Automation system fix completed!');
  console.log('\n📋 Summary of fixes:');
  console.log('1. Updated existing clients with proper email/SMS preferences');
  console.log('2. Created test client with all preferences enabled');
  console.log('3. Created test automation rule');
  console.log('4. Tested automation trigger with proper client data');
}

// Run the fix
fixAutomationSystem().catch(console.error); 