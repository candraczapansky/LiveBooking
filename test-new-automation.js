console.log('🎯 Testing new automation system...');

async function testNewAutomationSystem() {
  try {
    console.log('\n👤 Testing with client ID: 28995');
    
    // First, verify the client exists and has proper preferences
    const clientResponse = await fetch('http://localhost:5000/api/users/28995');
    if (!clientResponse.ok) {
      console.log(`❌ Client 28995 not found`);
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
    
    // Create a test appointment with a much later time (next month)
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(15); // 15th of next month
    nextMonth.setHours(10, 0, 0, 0); // 10 AM
    
    const appointmentData = {
      clientId: 28995,
      serviceId: 1,
      staffId: 1,
      startTime: nextMonth.toISOString(),
      endTime: new Date(nextMonth.getTime() + 60 * 60 * 1000).toISOString(),
      status: "confirmed"
    };
    
    console.log('Creating appointment with data:', appointmentData);
    console.log('Appointment date:', nextMonth.toLocaleDateString());
    console.log('Appointment time:', nextMonth.toLocaleTimeString());
    
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
      
      // Wait for automation to process
      console.log('⏳ Waiting for automation to process...');
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      // Check if automation rules were triggered
      const rulesResponse = await fetch('http://localhost:5000/api/automation-rules');
      if (rulesResponse.ok) {
        const rules = await rulesResponse.json();
        console.log('\n📊 Automation results:');
        rules.forEach(rule => {
          console.log(`  - ${rule.name}: sent ${rule.sentCount} times, last run: ${rule.lastRun}`);
        });
        
        // Check if any rules were triggered
        const triggeredRules = rules.filter(rule => rule.sentCount > 0);
        if (triggeredRules.length > 0) {
          console.log('\n🎉 SUCCESS: Automation rules were triggered!');
          console.log(`📧 ${triggeredRules.filter(r => r.type === 'email').length} email rules triggered`);
          console.log(`📱 ${triggeredRules.filter(r => r.type === 'sms').length} SMS rules triggered`);
        } else {
          console.log('\n⚠️ No automation rules were triggered.');
          console.log('Check the server console for automation trigger logs.');
        }
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

// Run the test
testNewAutomationSystem().catch(console.error); 