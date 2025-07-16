import twilio from 'twilio';

// Get environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('=== Twilio API Test ===\n');

// Check if environment variables are set
console.log('1. Environment Variables Check:');
console.log(`   Account SID: ${accountSid ? '✓ Set' : '✗ Missing'}`);
console.log(`   Auth Token: ${authToken ? '✓ Set' : '✗ Missing'}`);
console.log(`   Phone Number: ${twilioPhoneNumber ? '✓ Set' : '✗ Missing'}`);

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.log('\n❌ Missing required Twilio environment variables');
  process.exit(1);
}

// Validate Account SID format
if (!accountSid.startsWith('AC')) {
  console.log('\n❌ Invalid Account SID format. Account SID must start with "AC"');
  process.exit(1);
}

console.log('\n2. Initializing Twilio Client...');
const client = twilio(accountSid, authToken);

// Test 1: Check account details
async function testAccountDetails() {
  try {
    console.log('\n3. Testing Account Details...');
    const account = await client.api.accounts(accountSid).fetch();
    console.log(`   ✓ Account Status: ${account.status}`);
    console.log(`   ✓ Account Type: ${account.type}`);
    console.log(`   ✓ Account Name: ${account.friendlyName}`);
    
    if (account.status !== 'active') {
      console.log(`   ⚠️  Warning: Account is not active (${account.status})`);
    }
  } catch (error) {
    console.log(`   ❌ Failed to fetch account details: ${error.message}`);
    return false;
  }
  return true;
}

// Test 2: Check phone number details
async function testPhoneNumber() {
  try {
    console.log('\n4. Testing Phone Number...');
    const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({
      phoneNumber: twilioPhoneNumber
    });
    
    if (incomingPhoneNumbers.length === 0) {
      console.log(`   ❌ Phone number ${twilioPhoneNumber} not found in your account`);
      return false;
    }
    
    const phoneNumber = incomingPhoneNumbers[0];
    console.log(`   ✓ Phone Number: ${phoneNumber.phoneNumber}`);
    console.log(`   ✓ Friendly Name: ${phoneNumber.friendlyName}`);
    console.log(`   ✓ Status: ${phoneNumber.status}`);
    console.log(`   ✓ Capabilities:`, phoneNumber.capabilities);
    
    if (!phoneNumber.capabilities.sms) {
      console.log(`   ❌ Phone number does not support SMS`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ Failed to check phone number: ${error.message}`);
    return false;
  }
}

// Test 3: Check account balance
async function testAccountBalance() {
  try {
    console.log('\n5. Testing Account Balance...');
    const balance = await client.api.accounts(accountSid).balance.fetch();
    console.log(`   ✓ Current Balance: $${balance.balance}`);
    console.log(`   ✓ Currency: ${balance.currency}`);
    
    if (parseFloat(balance.balance) < 1.0) {
      console.log(`   ⚠️  Warning: Low balance ($${balance.balance}). You may need to add funds to send SMS.`);
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ Failed to check balance: ${error.message}`);
    return false;
  }
}

// Test 4: Send a test SMS
async function testSendSMS() {
  try {
    console.log('\n6. Testing SMS Send...');
    
    // Use a test phone number (you can change this to your own number)
    const testPhoneNumber = '+1234567890'; // Replace with your actual phone number for testing
    
    console.log(`   Attempting to send test SMS to ${testPhoneNumber}...`);
    
    const message = await client.messages.create({
      body: 'Test SMS from Glo Head Spa - Twilio API is working correctly!',
      from: twilioPhoneNumber,
      to: testPhoneNumber
    });
    
    console.log(`   ✓ SMS sent successfully!`);
    console.log(`   ✓ Message SID: ${message.sid}`);
    console.log(`   ✓ Status: ${message.status}`);
    console.log(`   ✓ Price: $${message.price || 'N/A'}`);
    
    return true;
  } catch (error) {
    console.log(`   ❌ Failed to send SMS: ${error.message}`);
    console.log(`   Error Code: ${error.code}`);
    console.log(`   More Info: ${error.moreInfo || 'N/A'}`);
    
    // Common error codes and solutions
    if (error.code === 21211) {
      console.log(`   💡 Solution: Invalid phone number format. Use E.164 format (+1234567890)`);
    } else if (error.code === 21608) {
      console.log(`   💡 Solution: Insufficient account balance`);
    } else if (error.code === 21614) {
      console.log(`   💡 Solution: Phone number not verified (for trial accounts)`);
    } else if (error.code === 21610) {
      console.log(`   💡 Solution: Phone number not owned by your account`);
    }
    
    return false;
  }
}

// Test 5: Check message history
async function testMessageHistory() {
  try {
    console.log('\n7. Testing Message History...');
    const messages = await client.messages.list({ limit: 5 });
    
    console.log(`   ✓ Found ${messages.length} recent messages`);
    
    if (messages.length > 0) {
      console.log('   Recent messages:');
      messages.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg.direction} to ${msg.to} - ${msg.status} (${msg.dateCreated})`);
      });
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ Failed to fetch message history: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n=== Running Twilio API Tests ===\n');
  
  const results = {
    accountDetails: await testAccountDetails(),
    phoneNumber: await testPhoneNumber(),
    balance: await testAccountBalance(),
    messageHistory: await testMessageHistory()
  };
  
  // Only test SMS send if other tests pass
  if (results.accountDetails && results.phoneNumber && results.balance) {
    results.smsSend = await testSendSMS();
  } else {
    console.log('\n6. Skipping SMS Send Test (prerequisites not met)');
    results.smsSend = false;
  }
  
  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Account Details: ${results.accountDetails ? '✓ PASS' : '❌ FAIL'}`);
  console.log(`Phone Number: ${results.phoneNumber ? '✓ PASS' : '❌ FAIL'}`);
  console.log(`Account Balance: ${results.balance ? '✓ PASS' : '❌ FAIL'}`);
  console.log(`Message History: ${results.messageHistory ? '✓ PASS' : '❌ FAIL'}`);
  console.log(`SMS Send: ${results.smsSend ? '✓ PASS' : '❌ FAIL'}`);
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\nOverall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Twilio API is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above for solutions.');
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('\n❌ Test execution failed:', error.message);
  process.exit(1);
}); 