// Test script for SMS automation
const BASE_URL = 'http://localhost:5000';

async function testSMSAutomation() {
  console.log('🧪 Testing SMS Automation...\n');

  try {
    // 1. Check automation rules
    console.log('1. Checking automation rules...');
    const rulesResponse = await fetch(`${BASE_URL}/api/automation-rules`);
    const rules = await rulesResponse.json();
    
    const smsRules = rules.filter(rule => rule.type === 'sms' && rule.trigger === 'after_payment');
    console.log(`Found ${smsRules.length} SMS after_payment rules:`, smsRules.map(r => r.name));
    console.log('');

    // 2. Get a sample appointment
    console.log('2. Getting sample appointment...');
    const appointmentsResponse = await fetch(`${BASE_URL}/api/appointments`);
    const appointments = await appointmentsResponse.json();
    
    if (appointments.length === 0) {
      console.log('❌ No appointments found. Create an appointment first.');
      return;
    }

    const appointment = appointments[0];
    console.log('Sample appointment:', {
      id: appointment.id,
      clientId: appointment.clientId,
      paymentStatus: appointment.paymentStatus
    });

    // 3. Get client details
    console.log('3. Getting client details...');
    const clientResponse = await fetch(`${BASE_URL}/api/users/${appointment.clientId}`);
    const client = await clientResponse.json();
    
    console.log('Client SMS preferences:', {
      phone: client.phone,
      smsAccountManagement: client.smsAccountManagement,
      smsAppointmentReminders: client.smsAppointmentReminders,
      smsPromotions: client.smsPromotions
    });

    // 4. Test payment confirmation to trigger automation
    console.log('4. Testing payment confirmation...');
    const paymentResponse = await fetch(`${BASE_URL}/api/confirm-cash-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        appointmentId: appointment.id
      })
    });

    const paymentResult = await paymentResponse.json();
    console.log('Payment result:', paymentResult);

    if (paymentResult.success) {
      console.log('✅ Payment confirmed successfully!');
      console.log('📱 Check if SMS was sent to:', client.phone);
      console.log('📋 Check server logs for automation trigger details');
    } else {
      console.log('❌ Payment failed:', paymentResult.error);
    }

    console.log('\n🔍 Next steps:');
    console.log('1. Check your server logs for automation trigger messages');
    console.log('2. Verify the client has a valid phone number');
    console.log('3. Check if Twilio is properly configured');
    console.log('4. Look for "SMS automation sent successfully" in logs');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSMSAutomation(); 