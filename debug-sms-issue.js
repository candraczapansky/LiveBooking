// Debug script to identify SMS automation issues
const BASE_URL = 'http://localhost:5000';

async function debugSMSIssue() {
  console.log('🔍 Debugging SMS Automation Issues...\n');

  try {
    // 1. Check automation rules
    console.log('1. Checking SMS automation rules...');
    const rulesResponse = await fetch(`${BASE_URL}/api/automation-rules`);
    const rules = await rulesResponse.json();
    
    const smsRules = rules.filter(rule => rule.type === 'sms');
    const afterPaymentRules = smsRules.filter(rule => rule.trigger === 'after_payment');
    
    console.log(`Total SMS rules: ${smsRules.length}`);
    console.log(`After payment SMS rules: ${afterPaymentRules.length}`);
    
    if (afterPaymentRules.length > 0) {
      console.log('Active after_payment SMS rules:');
      afterPaymentRules.forEach(rule => {
        console.log(`  - ${rule.name}: "${rule.template}" (Active: ${rule.active})`);
      });
    } else {
      console.log('❌ No after_payment SMS rules found!');
    }
    console.log('');

    // 2. Get recent appointments
    console.log('2. Checking recent appointments...');
    const appointmentsResponse = await fetch(`${BASE_URL}/api/appointments`);
    const appointments = await appointmentsResponse.json();
    
    const paidAppointments = appointments.filter(apt => apt.paymentStatus === 'paid');
    console.log(`Total appointments: ${appointments.length}`);
    console.log(`Paid appointments: ${paidAppointments.length}`);
    
    if (paidAppointments.length === 0) {
      console.log('❌ No paid appointments found to test with');
      return;
    }

    // 3. Check client communication preferences
    console.log('3. Checking client communication preferences...');
    const sampleAppointment = paidAppointments[0];
    const clientResponse = await fetch(`${BASE_URL}/api/users/${sampleAppointment.clientId}`);
    const client = await clientResponse.json();
    
    console.log('Sample client preferences:', {
      id: client.id,
      name: `${client.firstName} ${client.lastName}`,
      phone: client.phone,
      smsAccountManagement: client.smsAccountManagement,
      smsAppointmentReminders: client.smsAppointmentReminders,
      smsPromotions: client.smsPromotions
    });

    // 4. Test SMS sending directly
    console.log('4. Testing direct SMS sending...');
    if (client.phone) {
      const testSMSResponse = await fetch(`${BASE_URL}/api/test-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: client.phone,
          message: 'Test SMS from Glo Head Spa - Direct API test'
        })
      });
      
      const testSMSResult = await testSMSResponse.json();
      console.log('Direct SMS test result:', testSMSResult);
    } else {
      console.log('❌ Client has no phone number');
    }

    // 5. Check if automation should trigger for this client
    console.log('5. Checking automation trigger conditions...');
    if (afterPaymentRules.length > 0) {
      const rule = afterPaymentRules[0];
      
      // Check if SMS should be sent based on client preferences
      const shouldSendSMS = client.smsAccountManagement === true || 
                           client.smsAppointmentReminders === true || 
                           client.smsPromotions === true;
      
      console.log('Automation trigger check:', {
        ruleName: rule.name,
        clientPhone: !!client.phone,
        shouldSendSMS,
        clientPreferences: {
          smsAccountManagement: client.smsAccountManagement,
          smsAppointmentReminders: client.smsAppointmentReminders,
          smsPromotions: client.smsPromotions
        }
      });
      
      if (!shouldSendSMS) {
        console.log('❌ SMS blocked by client preferences');
        console.log('💡 Solution: Enable SMS preferences for this client');
      }
      
      if (!client.phone) {
        console.log('❌ Client has no phone number');
        console.log('💡 Solution: Add phone number for this client');
      }
    }

    // 6. Test payment confirmation to trigger automation
    console.log('6. Testing payment confirmation trigger...');
    const paymentResponse = await fetch(`${BASE_URL}/api/confirm-cash-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        appointmentId: sampleAppointment.id
      })
    });

    const paymentResult = await paymentResponse.json();
    console.log('Payment confirmation result:', paymentResult);

    console.log('\n📋 Summary:');
    console.log('1. Check if you have SMS automation rules configured');
    console.log('2. Verify client phone numbers are in correct format (+1234567890)');
    console.log('3. Enable SMS preferences for clients (smsAccountManagement, smsAppointmentReminders, or smsPromotions)');
    console.log('4. Check server logs for "SMS automation sent successfully" messages');
    console.log('5. Verify Twilio dashboard shows successful message delivery');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugSMSIssue(); 