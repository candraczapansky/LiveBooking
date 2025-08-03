import { Client } from 'pg';

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'beautybook',
  user: 'postgres',
  password: 'password'
});

async function debugAutomation() {
  try {
    await client.connect();
    console.log('Database connected');

    // Check automation rules
    console.log('\n=== CHECKING AUTOMATION RULES ===');
    const rulesResult = await client.query('SELECT * FROM automation_rules');
    console.log('Automation rules found:', rulesResult.rows.length);
    console.log('Rules:', rulesResult.rows);

    // Check if booking confirmation rule exists
    const bookingRule = rulesResult.rows.find(rule => rule.trigger === 'booking_confirmation');
    console.log('\n=== BOOKING CONFIRMATION RULE ===');
    console.log('Found booking confirmation rule:', !!bookingRule);
    if (bookingRule) {
      console.log('Rule details:', bookingRule);
    }

    // Test automation trigger manually
    console.log('\n=== TESTING AUTOMATION TRIGGER ===');
    const testAppointment = {
      id: 240,
      clientId: 75,
      staffId: 61,
      serviceId: 1321,
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      status: 'confirmed'
    };

    // Import and test the automation trigger
    const { triggerBookingConfirmation } = await import('./server/automation-triggers.js');
    
    // Create a mock storage object
    const mockStorage = {
      getAllAutomationRules: async () => rulesResult.rows,
      getUser: async (id) => {
        const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0];
      },
      getService: async (id) => {
        const result = await client.query('SELECT * FROM services WHERE id = $1', [id]);
        return result.rows[0];
      },
      updateAutomationRuleSentCount: async (id, count) => {
        console.log(`Would update rule ${id} sent count to ${count}`);
      }
    };

    console.log('Testing automation trigger...');
    await triggerBookingConfirmation(testAppointment, mockStorage);
    console.log('Automation trigger test completed');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

debugAutomation(); 