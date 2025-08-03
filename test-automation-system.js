import { Client } from 'pg';

async function testAutomationSystem() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'beautybook',
    user: 'postgres',
    password: 'postgres'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Test 1: Check if automation rules exist
    const rulesResult = await client.query('SELECT * FROM automation_rules ORDER BY id DESC LIMIT 5');
    console.log('📋 Automation Rules:', rulesResult.rows.length, 'found');
    rulesResult.rows.forEach(rule => {
      console.log(`  - ${rule.name} (${rule.type}, ${rule.trigger}, active: ${rule.active})`);
    });

    // Test 2: Check if there are any appointments to test with
    const appointmentsResult = await client.query('SELECT * FROM appointments ORDER BY id DESC LIMIT 3');
    console.log('📅 Recent Appointments:', appointmentsResult.rows.length, 'found');
    appointmentsResult.rows.forEach(apt => {
      console.log(`  - Appointment ${apt.id}: ${apt.start_time} (Client: ${apt.client_id}, Service: ${apt.service_id})`);
    });

    // Test 3: Check client preferences for email/SMS
    if (appointmentsResult.rows.length > 0) {
      const clientId = appointmentsResult.rows[0].client_id;
      const clientResult = await client.query('SELECT * FROM users WHERE id = $1', [clientId]);
      if (clientResult.rows.length > 0) {
        const client = clientResult.rows[0];
        console.log('👤 Client Preferences:', {
          email: client.email,
          phone: client.phone,
          emailAppointmentReminders: client.email_appointment_reminders,
          smsAppointmentReminders: client.sms_appointment_reminders
        });
      }
    }

    // Test 4: Check if automation triggers are being called
    console.log('🔧 Testing automation trigger...');
    
    // Simulate a booking confirmation trigger
    const testAppointment = appointmentsResult.rows[0];
    if (testAppointment) {
      console.log('🎯 Testing with appointment:', testAppointment.id);
      
      // Import and test the automation trigger
      const { triggerBookingConfirmation } = await import('./server/automation-triggers.js');
      
      // Create a mock storage object for testing
      const mockStorage = {
        getAllAutomationRules: async () => rulesResult.rows,
        getService: async (id) => {
          const result = await client.query('SELECT * FROM services WHERE id = $1', [id]);
          return result.rows[0];
        },
        getUser: async (id) => {
          const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
          return result.rows[0];
        },
        getStaff: async (id) => {
          const result = await client.query('SELECT * FROM staff WHERE id = $1', [id]);
          return result.rows[0];
        },
        updateAutomationRuleSentCount: async (id, count) => {
          console.log(`📊 Would update rule ${id} sent count to ${count}`);
        }
      };

      try {
        await triggerBookingConfirmation(testAppointment, mockStorage);
        console.log('✅ Automation trigger test completed successfully');
      } catch (error) {
        console.error('❌ Automation trigger test failed:', error);
      }
    }

  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await client.end();
  }
}

testAutomationSystem(); 