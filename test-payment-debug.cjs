require('dotenv/config');
const { neon } = require('@neondatabase/serverless');

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

async function testPaymentDebug() {
  console.log('🔧 Testing Payment Processing Debug');
  console.log('==================================\n');

  try {
    const sql = neon(DATABASE_URL);
    
    // Test database connection
    await sql`SELECT 1`;
    console.log('✅ Database connection successful');

    // Test different payment request formats
    console.log('\n🌐 Testing Payment Request Formats:');
    
    const testCases = [
      {
        name: 'Cash Payment (Simple)',
        data: {
          amount: 25.00,
          sourceId: "cash",
          type: "appointment_payment",
          description: "Test cash payment"
        }
      },
      {
        name: 'Card Payment (Frontend Format)',
        data: {
          amount: 25.00,
          tipAmount: 0,
          totalAmount: 25.00,
          cardData: {
            cardNumber: "4111111111111111",
            cardExpiryMonth: "12",
            cardExpiryYear: "25",
            cardCVV: "123"
          },
          type: "appointment_payment",
          description: "Test card payment"
        }
      },
      {
        name: 'Card Payment (Server Expected Format)',
        data: {
          amount: 25.00,
          cardData: {
            cardNumber: "4111111111111111",
            cardExpiryMonth: "12",
            cardExpiryYear: "25",
            cardCVV: "123"
          },
          type: "appointment_payment",
          description: "Test card payment"
        }
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n📝 Testing: ${testCase.name}`);
      console.log('Request data:', JSON.stringify(testCase.data, null, 2));
      
      try {
        const response = await fetch('https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api/create-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testCase.data)
        });
        
        const responseText = await response.text();
        console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          try {
            const responseData = JSON.parse(responseText);
            console.log('✅ Success Response:', JSON.stringify(responseData, null, 2));
          } catch (e) {
            console.log('✅ Success Response (raw):', responseText);
          }
        } else {
          console.log('❌ Error Response:', responseText);
        }
      } catch (error) {
        console.log('❌ Request failed:', error.message);
      }
    }

    console.log('\n🔧 DEBUG SUMMARY:');
    console.log('==================');
    console.log('1. ✅ Database connection is working');
    console.log('2. 🔍 Testing different payment request formats');
    console.log('3. 📋 Identifying which format causes 500 errors');
    console.log('4. 🎯 Will provide solution based on test results');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPaymentDebug().catch(console.error); 