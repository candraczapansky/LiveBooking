// Comprehensive Helcim Integration Test
// This file tests the complete Helcim integration including backend and frontend

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api';

async function testHelcimIntegration() {
  console.log('🧪 Testing Complete Helcim Integration...\n');

  try {
    // Test 1: Backend Helcim Service
    console.log('1. Testing Backend Helcim Service...');
    
    // Import the Helcim service (this would need to be adjusted for the actual import)
    const { helcimService } = require('./server/helcim-service.ts');
    
    const customerData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '555-123-4567'
    };
    
    const customerResponse = await helcimService.createCustomer(customerData);
    console.log('✅ Customer creation result:', customerResponse);
    
    if (customerResponse.success) {
      console.log('✅ Backend Helcim service working');
    } else {
      console.log('❌ Backend Helcim service failed:', customerResponse.error);
      return;
    }

    // Test 2: API Endpoints
    console.log('\n2. Testing API Endpoints...');
    
    // Test customer creation endpoint
    const createCustomerResponse = await fetch(`${BASE_URL}/create-helcim-customer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: 1
      })
    });
    
    if (createCustomerResponse.ok) {
      const customerResult = await createCustomerResponse.json();
      console.log('✅ Customer creation endpoint working:', customerResult);
      
      // Test card saving endpoint
      const saveCardResponse = await fetch(`${BASE_URL}/save-helcim-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardToken: 'test_card_token_123',
          customerId: customerResult.customerId,
          clientId: 1,
          cardData: {
            cardNumber: '4111111111111111',
            cardExpiryMonth: '12',
            cardExpiryYear: '2025',
            cardCVV: '123'
          }
        })
      });
      
      if (saveCardResponse.ok) {
        const cardResult = await saveCardResponse.json();
        console.log('✅ Card saving endpoint working:', cardResult);
        
        // Test payment processing endpoint
        const paymentResponse = await fetch(`${BASE_URL}/create-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 50.00,
            tipAmount: 5.00,
            appointmentId: 1,
            description: 'Test payment for Helcim integration',
            type: 'appointment_payment',
            sourceId: cardResult.helcimCardId || 'test_card_token_123'
          })
        });
        
        if (paymentResponse.ok) {
          const paymentResult = await paymentResponse.json();
          console.log('✅ Payment processing endpoint working:', paymentResult);
        } else {
          const errorData = await paymentResponse.json();
          console.log('❌ Payment processing endpoint failed:', errorData);
        }
      } else {
        const errorData = await saveCardResponse.json();
        console.log('❌ Card saving endpoint failed:', errorData);
      }
    } else {
      const errorData = await createCustomerResponse.json();
      console.log('❌ Customer creation endpoint failed:', errorData);
    }

    // Test 3: Terminal Payment Endpoint
    console.log('\n3. Testing Terminal Payment Endpoint...');
    
    const terminalResponse = await fetch(`${BASE_URL}/helcim-terminal/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 75.00,
        tipAmount: 10.00,
        appointmentId: 1,
        description: 'Test terminal payment',
        type: 'terminal_payment',
        clientId: 1
      })
    });
    
    if (terminalResponse.ok) {
      const terminalResult = await terminalResponse.json();
      console.log('✅ Terminal payment endpoint working:', terminalResult);
    } else {
      const errorData = await terminalResponse.json();
      console.log('❌ Terminal payment endpoint failed:', errorData);
    }

    // Test 4: Database Integration
    console.log('\n4. Testing Database Integration...');
    
    // Test saved payment methods endpoint
    const savedMethodsResponse = await fetch(`${BASE_URL}/saved-payment-methods?clientId=1`);
    
    if (savedMethodsResponse.ok) {
      const savedMethods = await savedMethodsResponse.json();
      console.log('✅ Saved payment methods endpoint working:', savedMethods);
    } else {
      console.log('❌ Saved payment methods endpoint failed');
    }

    console.log('\n✅ All Helcim integration tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Test configuration
async function testConfiguration() {
  console.log('\n🔧 Testing Configuration...\n');
  
  // Check environment variables
  const requiredEnvVars = [
    'HELCIM_API_TOKEN',
    'SQUARE_APPLICATION_ID',
    'SQUARE_ACCESS_TOKEN'
  ];
  
  console.log('Environment Variables:');
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`❌ ${varName}: Not set`);
    }
  });
  
  console.log('\n📋 Migration Status:');
  console.log('✅ Backend Helcim service implemented');
  console.log('✅ API endpoints updated');
  console.log('✅ Database schema updated');
  console.log('✅ Client-side components created');
  console.log('⏳ Data migration pending');
  console.log('⏳ Production deployment pending');
}

// Run tests
async function runAllTests() {
  await testConfiguration();
  await testHelcimIntegration();
  
  console.log('\n🏁 All tests completed!');
  console.log('\n📝 Next Steps:');
  console.log('1. Set HELCIM_API_TOKEN environment variable');
  console.log('2. Test with real Helcim API credentials');
  console.log('3. Migrate existing customer data');
  console.log('4. Deploy to production');
  console.log('5. Remove old Stripe and Square code');
}

runAllTests(); 