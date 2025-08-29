require('dotenv/config');
const { neon } = require('@neondatabase/serverless');

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

async function testWebhookSetup() {
  console.log('🔧 Testing Webhook Setup');
  console.log('========================\n');

  try {
    const sql = neon(DATABASE_URL);
    
    // Test database connection
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');

    // Test server endpoints
    console.log('\n🌐 Testing Server Endpoints:');
    
    const endpoints = [
      'http://localhost:5000/api/services',
      'http://localhost:5000/api/staff',
      'http://localhost:5000/api/create-payment'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          console.log(`✅ ${endpoint} - OK`);
        } else {
          console.log(`❌ ${endpoint} - ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint} - Error: ${error.message}`);
      }
    }

    console.log('\n📋 Webhook Configuration Summary:');
    console.log('==================================');
    console.log('');
    console.log('🔧 **HELCIM WEBHOOK SETUP REQUIRED**');
    console.log('');
    console.log('You need to configure webhooks in your Helcim admin panel:');
    console.log('');
    console.log('1. **Go to:** glo-head-spa.myhelcim.com/admin/helcim-js-configs');
    console.log('2. **Click on "Webhooks" tab**');
    console.log('3. **Add these webhook configurations:**');
    console.log('');
    console.log('**Payment Success Webhook:**');
    console.log('- Event Type: payment.success');
    console.log('- URL: https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/helcim/webhook/payment-success');
    console.log('- Method: POST');
    console.log('- Active: Yes');
    console.log('');
    console.log('**Payment Failed Webhook:**');
    console.log('- Event Type: payment.failed');
    console.log('- URL: https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/helcim/webhook/payment-failed');
    console.log('- Method: POST');
    console.log('- Active: Yes');
    console.log('');
    console.log('**Customer Created Webhook:**');
    console.log('- Event Type: customer.created');
    console.log('- URL: https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/helcim/webhook/customer-created');
    console.log('- Method: POST');
    console.log('- Active: Yes');
    console.log('');
    console.log('🔍 **TROUBLESHOOTING STEPS:**');
    console.log('');
    console.log('1. **If webhooks don\'t work with Replit domain:**');
    console.log('   - Use ngrok for local development');
    console.log('   - Run: ngrok http 5000');
    console.log('   - Use the ngrok URL for webhooks');
    console.log('');
    console.log('2. **Test webhook endpoints:**');
    console.log('   curl -X POST "https://your-domain/api/helcim/webhook/payment-success" \\');
    console.log('        -H "Content-Type: application/json" \\');
    console.log('        -d \'{"test": "webhook"}\'');
    console.log('');
    console.log('3. **Check Helcim API documentation** for exact webhook requirements');
    console.log('');
    console.log('4. **Verify your API token has webhook permissions**');
    console.log('');
    console.log('🎯 **NEXT STEPS:**');
    console.log('');
    console.log('1. Configure webhooks in Helcim admin panel');
    console.log('2. Test webhook endpoints');
    console.log('3. Try processing a test payment');
    console.log('4. Check server logs for webhook activity');
    console.log('5. Verify payment status updates are working');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWebhookSetup().catch(console.error); 