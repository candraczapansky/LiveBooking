import { Client } from 'pg';

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'beautybook',
  user: 'postgres',
  password: 'password'
});

async function testEmailAutomation() {
  try {
    await client.connect();
    console.log('Database connected');

    // Check automation rules
    console.log('\n=== CHECKING AUTOMATION RULES ===');
    const rulesResult = await client.query('SELECT * FROM automation_rules');
    console.log('Automation rules found:', rulesResult.rows.length);
    
    if (rulesResult.rows.length > 0) {
      console.log('Rules:', rulesResult.rows.map(r => ({
        id: r.id,
        name: r.name,
        trigger: r.trigger,
        type: r.type,
        active: r.active
      })));
    }

    // Check if booking confirmation rule exists
    const bookingRule = rulesResult.rows.find(rule => rule.trigger === 'booking_confirmation');
    console.log('\n=== BOOKING CONFIRMATION RULE ===');
    console.log('Found booking confirmation rule:', !!bookingRule);
    if (bookingRule) {
      console.log('Rule details:', {
        id: bookingRule.id,
        name: bookingRule.name,
        trigger: bookingRule.trigger,
        type: bookingRule.type,
        active: bookingRule.active,
        subject: bookingRule.subject,
        template: bookingRule.template?.substring(0, 100) + '...'
      });
    }

    // Test email sending directly
    console.log('\n=== TESTING EMAIL SENDING ===');
    const { sendEmail } = await import('./server/email.js');
    
    const emailResult = await sendEmail({
      to: 'test@example.com',
      from: 'hello@headspaglo.com',
      subject: 'Test Email from Automation',
      html: '<h1>Test Email</h1><p>This is a test email from the automation system.</p>'
    });
    
    console.log('Email sending result:', emailResult);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

testEmailAutomation(); 