// Debug script for SMS automation system
const BASE_URL = 'http://localhost:5000';

async function debugAutomation() {
  console.log('🔍 Debugging SMS Automation System...\n');

  try {
    // 1. Check if automation rules exist
    console.log('1. Checking automation rules...');
    const rulesResponse = await fetch(`${BASE_URL}/api/automation-rules`);
    const rules = await rulesResponse.json();
    console.log('Automation rules found:', rules.length);
    rules.forEach(rule => {
      console.log(`  - ${rule.name} (${rule.type}, ${rule.trigger}, active: ${rule.active})`);
    });
    console.log('');

    // 2. Check SMS configuration
    console.log('2. Checking SMS configuration...');
    const smsConfigResponse = await fetch(`${BASE_URL}/api/sms-config`);
    const smsConfig = await smsConfigResponse.json();
    console.log('SMS Config:', smsConfig);
    console.log('');

    // 3. Test a sample appointment payment to trigger automation
    console.log('3. Testing automation trigger with sample data...');
    
    // First, get a sample appointment
    const appointmentsResponse = await fetch(`${BASE_URL}/api/appointments`);
    const appointments = await appointmentsResponse.json();
    
    if (appointments.length > 0) {
      const sampleAppointment = appointments[0];
      console.log('Sample appointment:', {
        id: sampleAppointment.id,
        clientId: sampleAppointment.clientId,
        serviceId: sampleAppointment.serviceId,
        status: sampleAppointment.status,
        paymentStatus: sampleAppointment.paymentStatus
      });

      // Test triggering after payment automation
      console.log('4. Triggering after_payment automation...');
      const triggerResponse = await fetch(`${BASE_URL}/api/automation-rules/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appointmentId: sampleAppointment.id,
          customTriggerName: 'after_payment'
        })
      });
      
      const triggerResult = await triggerResponse.json();
      console.log('Trigger result:', triggerResult);
    } else {
      console.log('No appointments found to test with');
    }

    // 4. Check client preferences
    console.log('5. Checking client communication preferences...');
    if (appointments.length > 0) {
      const clientResponse = await fetch(`${BASE_URL}/api/users/${appointments[0].clientId}`);
      const client = await clientResponse.json();
      console.log('Client preferences:', {
        smsAccountManagement: client.smsAccountManagement,
        smsAppointmentReminders: client.smsAppointmentReminders,
        smsPromotions: client.smsPromotions,
        phone: client.phone
      });
    }

    console.log('\n✅ Debug complete! Check the output above for issues.');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugAutomation(); 