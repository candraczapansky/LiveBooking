console.log('🔧 Fixing client preferences...');

async function fixClientPreferences() {
  try {
    console.log('\n👤 Fixing client 28995 preferences...');
    
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
        smsAppointmentReminders: updatedClient.smsAppointmentReminders,
        emailAccountManagement: updatedClient.emailAccountManagement,
        smsAccountManagement: updatedClient.smsAccountManagement,
        emailPromotions: updatedClient.emailPromotions,
        smsPromotions: updatedClient.smsPromotions
      });
      
      // Now test the automation
      console.log('\n🎯 Testing automation with fixed client...');
      
      const appointmentData = {
        clientId: 28995,
        serviceId: 1,
        staffId: 1,
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
        status: "confirmed"
      };
      
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
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check automation results
        const rulesResponse = await fetch('http://localhost:5000/api/automation-rules');
        if (rulesResponse.ok) {
          const rules = await rulesResponse.json();
          console.log('\n📊 Automation results:');
          rules.forEach(rule => {
            console.log(`  - ${rule.name}: sent ${rule.sentCount} times, last run: ${rule.lastRun}`);
          });
          
          const triggeredRules = rules.filter(rule => rule.sentCount > 0);
          if (triggeredRules.length > 0) {
            console.log('\n🎉 SUCCESS: Automation rules were triggered!');
            console.log(`📧 ${triggeredRules.filter(r => r.type === 'email').length} email rules triggered`);
            console.log(`📱 ${triggeredRules.filter(r => r.type === 'sms').length} SMS rules triggered`);
          } else {
            console.log('\n⚠️ Still no automation rules triggered. Checking automation trigger code...');
          }
        }
      } else {
        const error = await appointmentResponse.text();
        console.log(`❌ Failed to create test appointment: ${appointmentResponse.status} - ${error}`);
      }
      
    } else {
      const error = await response.text();
      console.log(`❌ Failed to update client preferences: ${response.status} - ${error}`);
    }
  } catch (error) {
    console.log('❌ Error fixing client preferences:', error.message);
  }
}

// Run the fix
fixClientPreferences().catch(console.error); 