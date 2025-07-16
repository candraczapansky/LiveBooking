// Script to create comprehensive SMS automation rules
const BASE_URL = 'http://localhost:5000';

const automationRules = [
  {
    name: "Payment Confirmation SMS",
    type: "sms",
    trigger: "after_payment",
    timing: "immediately",
    template: "Thank you for your payment at Glo Head Spa! Your appointment has been confirmed. We look forward to seeing you. If you need to reschedule, please call us at least 24 hours in advance."
  },
  {
    name: "Appointment Reminder SMS",
    type: "sms",
    trigger: "appointment_reminder",
    timing: "24 hours before",
    template: "Hi {clientFirstName}! This is a friendly reminder about your appointment tomorrow at {appointmentTime} with {staffName}. Please arrive 10 minutes early. Call us if you need to reschedule."
  },
  {
    name: "Booking Confirmation SMS",
    type: "sms",
    trigger: "booking_confirmation",
    timing: "immediately",
    template: "Your appointment at Glo Head Spa has been confirmed for {appointmentDate} at {appointmentTime} with {staffName}. We'll see you soon!"
  },
  {
    name: "Follow-up SMS",
    type: "sms",
    trigger: "follow_up",
    timing: "3 days after",
    template: "Hi {clientFirstName}! We hope you enjoyed your recent visit to Glo Head Spa. How was your experience? We'd love to see you again soon!"
  },
  {
    name: "Cancellation SMS",
    type: "sms",
    trigger: "cancellation",
    timing: "immediately",
    template: "Your appointment at Glo Head Spa has been cancelled. If you'd like to reschedule, please call us. We look forward to seeing you soon!"
  },
  {
    name: "No Show Follow-up SMS",
    type: "sms",
    trigger: "no_show",
    timing: "immediately",
    template: "Hi {clientFirstName}, we missed you at your appointment today. Please call us to reschedule. We want to ensure you get the care you deserve."
  }
];

async function createAutomationRules() {
  console.log('📱 Creating SMS Automation Rules...\n');

  for (const rule of automationRules) {
    try {
      console.log(`Creating rule: ${rule.name}...`);
      
      const response = await fetch(`${BASE_URL}/api/automation-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(rule)
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ Created: ${rule.name}`);
      } else {
        console.log(`❌ Failed to create ${rule.name}:`, result.error);
      }
    } catch (error) {
      console.log(`❌ Error creating ${rule.name}:`, error.message);
    }
  }

  console.log('\n📋 Created SMS automation rules:');
  console.log('1. Payment Confirmation SMS - Sends after payment');
  console.log('2. Appointment Reminder SMS - Sends 24 hours before');
  console.log('3. Booking Confirmation SMS - Sends when appointment is booked');
  console.log('4. Follow-up SMS - Sends 3 days after appointment');
  console.log('5. Cancellation SMS - Sends when appointment is cancelled');
  console.log('6. No Show Follow-up SMS - Sends when client doesn\'t show up');
  
  console.log('\n💡 Next steps:');
  console.log('1. Make sure clients have SMS preferences enabled');
  console.log('2. Test by making a payment on an appointment');
  console.log('3. Check server logs for automation trigger messages');
  console.log('4. Verify SMS delivery in Twilio dashboard');
}

createAutomationRules(); 