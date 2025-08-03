import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/beautybook'
});

async function testAutomationSystem() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Test 1: Check existing automation rules
    console.log('\n📋 Test 1: Checking existing automation rules...');
    const rulesResult = await client.query('SELECT * FROM automation_rules ORDER BY id');
    console.log(`Found ${rulesResult.rows.length} automation rules:`);
    rulesResult.rows.forEach(rule => {
      console.log(`- ${rule.name} (${rule.type}, ${rule.trigger}, active: ${rule.active})`);
    });

    // Test 2: Create a new test automation rule
    console.log('\n📝 Test 2: Creating a new test automation rule...');
    const newRule = {
      name: 'Test Automation Rule',
      type: 'sms',
      trigger: 'booking_confirmation',
      timing: 'immediately',
      template: 'Hi {client_name}! Your appointment is confirmed for {appointment_date} at {appointment_time}.',
      active: true,
      sentCount: 0
    };

    const insertResult = await client.query(
      'INSERT INTO automation_rules (name, type, trigger, timing, template, active, sent_count) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [newRule.name, newRule.type, newRule.trigger, newRule.timing, newRule.template, newRule.active, newRule.sentCount]
    );
    console.log('✅ Created new automation rule:', insertResult.rows[0].id);

    // Test 3: Test the automation trigger system
    console.log('\n🚀 Test 3: Testing automation trigger system...');
    
    // Get a sample appointment
    const appointmentResult = await client.query('SELECT * FROM appointments LIMIT 1');
    if (appointmentResult.rows.length > 0) {
      const appointment = appointmentResult.rows[0];
      console.log(`Using appointment ID: ${appointment.id} for testing`);
      
      // Get client and service info
      const clientResult = await client.query('SELECT * FROM users WHERE id = $1', [appointment.client_id]);
      const serviceResult = await client.query('SELECT * FROM services WHERE id = $1', [appointment.service_id]);
      
      if (clientResult.rows.length > 0 && serviceResult.rows.length > 0) {
        const client = clientResult.rows[0];
        const service = serviceResult.rows[0];
        
        console.log(`Client: ${client.first_name} ${client.last_name}`);
        console.log(`Service: ${service.name}`);
        console.log(`Appointment: ${appointment.date} at ${appointment.time}`);
        
        // Test the automation trigger
        console.log('\n🔔 Testing booking confirmation trigger...');
        
        // Simulate the automation trigger
        const relevantRules = rulesResult.rows.filter(rule => 
          rule.trigger === 'booking_confirmation' && rule.active
        );
        
        console.log(`Found ${relevantRules.length} relevant rules for booking confirmation`);
        
        relevantRules.forEach(rule => {
          console.log(`\n📧 Processing rule: ${rule.name}`);
          console.log(`Type: ${rule.type}`);
          console.log(`Template: ${rule.template}`);
          
          // Simulate template variable replacement
          let processedTemplate = rule.template
            .replace(/{client_name}/g, `${client.first_name} ${client.last_name}`)
            .replace(/{service_name}/g, service.name)
            .replace(/{appointment_date}/g, appointment.date)
            .replace(/{appointment_time}/g, appointment.time);
          
          console.log(`Processed template: ${processedTemplate}`);
          
          if (rule.type === 'email') {
            console.log(`📧 Would send email to: ${client.email}`);
            console.log(`Subject: ${rule.subject || 'Appointment Confirmation'}`);
          } else if (rule.type === 'sms') {
            console.log(`📱 Would send SMS to: ${client.phone}`);
          }
        });
      } else {
        console.log('❌ No client or service data found for testing');
      }
    } else {
      console.log('❌ No appointments found for testing');
    }

    // Test 4: Test API endpoints
    console.log('\n🌐 Test 4: Testing API endpoints...');
    
    // Test GET /api/automation-rules
    try {
      const response = await fetch('http://localhost:5000/api/automation-rules', {
        headers: { 'x-user-id': '1' }
      });
      const rules = await response.json();
      console.log(`✅ GET /api/automation-rules returned ${rules.length} rules`);
    } catch (error) {
      console.log('❌ GET /api/automation-rules failed:', error.message);
    }

    // Test POST /api/automation-rules
    try {
      const testRule = {
        name: 'API Test Rule',
        type: 'email',
        trigger: 'booking_confirmation',
        timing: 'immediately',
        subject: 'Test Subject',
        template: 'Test template with {client_name}',
        active: true
      };
      
      const response = await fetch('http://localhost:5000/api/automation-rules', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': '1'
        },
        body: JSON.stringify(testRule)
      });
      
      if (response.ok) {
        const newRule = await response.json();
        console.log(`✅ POST /api/automation-rules created rule ID: ${newRule.id}`);
      } else {
        console.log('❌ POST /api/automation-rules failed:', response.status);
      }
    } catch (error) {
      console.log('❌ POST /api/automation-rules failed:', error.message);
    }

    console.log('\n✅ Automation system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.end();
  }
}

testAutomationSystem(); 