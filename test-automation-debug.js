console.log('🔍 Starting comprehensive automation system debug...');

// Test 1: Check automation rules in database
async function testAutomationRules() {
  try {
    console.log('\n📋 Test 1: Checking automation rules in database...');
    
    const response = await fetch('http://localhost:5000/api/automation-rules');
    if (response.ok) {
      const rules = await response.json();
      console.log(`✅ Found ${rules.length} automation rules:`);
      rules.forEach(rule => {
        console.log(`  - ${rule.name} (${rule.type}, ${rule.trigger}, active: ${rule.active})`);
      });
      return rules;
    } else {
      console.log(`❌ Failed to fetch automation rules: ${response.status}`);
      return [];
    }
  } catch (error) {
    console.log('❌ Error fetching automation rules:', error.message);
    return [];
  }
}

// Test 2: Check client preferences
async function testClientPreferences() {
  try {
    console.log('\n👤 Test 2: Checking client preferences...');
    
    const response = await fetch('http://localhost:5000/api/users/1');
    if (response.ok) {
      const client = await response.json();
      console.log('✅ Client preferences:');
      console.log(`  - Email: ${client.email}`);
      console.log(`  - Phone: ${client.phone}`);
      console.log(`  - Email Appointment Reminders: ${client.emailAppointmentReminders}`);
      console.log(`  - SMS Appointment Reminders: ${client.smsAppointmentReminders}`);
      console.log(`  - Email Account Management: ${client.emailAccountManagement}`);
      console.log(`  - SMS Account Management: ${client.smsAccountManagement}`);
      console.log(`  - Email Promotions: ${client.emailPromotions}`);
      console.log(`  - SMS Promotions: ${client.smsPromotions}`);
      return client;
    } else {
      console.log(`❌ Failed to fetch client: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.log('❌ Error fetching client:', error.message);
    return null;
  }
}

// Test 3: Check email configuration
async function testEmailConfiguration() {
  try {
    console.log('\n📧 Test 3: Checking email configuration...');
    
    const response = await fetch('http://localhost:5000/api/system-config/email');
    if (response.ok) {
      const config = await response.json();
      console.log('✅ Email configuration:', config);
    } else {
      console.log('❌ No email configuration found in database');
    }
    
    // Check environment variables
    console.log('Environment variables:');
    console.log(`  - SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? 'Set' : 'Not set'}`);
    console.log(`  - SENDGRID_FROM_EMAIL: ${process.env.SENDGRID_FROM_EMAIL || 'Not set'}`);
    
  } catch (error) {
    console.log('❌ Error checking email configuration:', error.message);
  }
}

// Test 4: Check SMS configuration
async function testSMSConfiguration() {
  try {
    console.log('\n📱 Test 4: Checking SMS configuration...');
    
    const response = await fetch('http://localhost:5000/api/system-config/sms');
    if (response.ok) {
      const config = await response.json();
      console.log('✅ SMS configuration:', config);
    } else {
      console.log('❌ No SMS configuration found in database');
    }
    
    // Check environment variables
    console.log('Environment variables:');
    console.log(`  - TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Not set'}`);
    console.log(`  - TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Not set'}`);
    console.log(`  - TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER || 'Not set'}`);
    
  } catch (error) {
    console.log('❌ Error checking SMS configuration:', error.message);
  }
}

// Test 5: Create a test appointment to trigger automation
async function testAutomationTrigger() {
  try {
    console.log('\n🎯 Test 5: Creating test appointment to trigger automation...');
    
    const appointmentData = {
      clientId: 1,
      serviceId: 1,
      staffId: 1,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
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

// Test 6: Check if automation rules were triggered
async function checkAutomationResults() {
  try {
    console.log('\n🔍 Test 6: Checking if automation rules were triggered...');
    
    // Wait a moment for automation to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response = await fetch('http://localhost:5000/api/automation-rules');
    if (response.ok) {
      const rules = await response.json();
      console.log('Updated automation rules:');
      rules.forEach(rule => {
        console.log(`  - ${rule.name}: sent ${rule.sentCount} times, last run: ${rule.lastRun}`);
      });
    }
  } catch (error) {
    console.log('❌ Error checking automation results:', error.message);
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 Starting comprehensive automation system debug...\n');
  
  const rules = await testAutomationRules();
  const client = await testClientPreferences();
  await testEmailConfiguration();
  await testSMSConfiguration();
  
  if (rules.length > 0 && client) {
    console.log('\n📊 Analysis:');
    console.log(`- Found ${rules.length} automation rules`);
    console.log(`- Client has email: ${!!client.email}`);
    console.log(`- Client has phone: ${!!client.phone}`);
    console.log(`- Email preferences enabled: ${client.emailAppointmentReminders || client.emailAccountManagement || client.emailPromotions}`);
    console.log(`- SMS preferences enabled: ${client.smsAppointmentReminders || client.smsAccountManagement || client.smsPromotions}`);
    
    if (rules.length > 0) {
      await testAutomationTrigger();
      await checkAutomationResults();
    }
  }
  
  console.log('\n✅ Automation system debug completed!');
}

// Run the tests
runAllTests().catch(console.error); 