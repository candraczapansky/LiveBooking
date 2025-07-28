import fetch from 'node-fetch';

async function testPhoneFormat() {
  console.log('🧪 Testing Phone Number Formatting\n');

  try {
    // Test with plain 10-digit numbers like in the CSV
    console.log('1. 📤 Testing import with plain 10-digit phone numbers...');
    const testClients = [
      {
        firstName: 'Erikah',
        lastName: 'Davis',
        email: 'erikah.davis.test@example.com',
        phone: '9186459539'  // Plain 10-digit format from CSV
      },
      {
        firstName: 'Erin',
        lastName: 'Davis',
        email: 'erin.davis.test@example.com',
        phone: '5397660578'  // Plain 10-digit format from CSV
      },
      {
        firstName: 'Esther',
        lastName: 'Davis',
        email: 'esther.davis.test@example.com',
        phone: '9189782414'  // Plain 10-digit format from CSV
      }
    ];

    const importResponse = await fetch('http://localhost:5001/api/clients/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clients: testClients })
    });

    if (importResponse.ok) {
      const result = await importResponse.json();
      console.log(`   ✓ Import result: ${result.imported} imported, ${result.skipped} skipped`);
      if (result.errors && result.errors.length > 0) {
        console.log(`   ⚠️  Import errors: ${result.errors.join(', ')}`);
      }
    } else {
      const errorText = await importResponse.text();
      console.log(`   ❌ Import failed: ${importResponse.status} - ${errorText}`);
      return;
    }

    // Wait for database update
    console.log('\n2. ⏳ Waiting for database update...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check API response
    console.log('\n3. 🔍 Checking API response...');
    const apiResponse = await fetch('http://localhost:5001/api/users?role=client');

    if (apiResponse.ok) {
      const clients = await apiResponse.json();

      // Find our test clients
      const testClientsFound = clients.filter(client =>
        client.email.includes('erikah.davis.test@example.com') ||
        client.email.includes('erin.davis.test@example.com') ||
        client.email.includes('esther.davis.test@example.com')
      );

      console.log(`   📊 Found ${testClientsFound.length} test clients in API response`);

      testClientsFound.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.firstName} ${client.lastName}`);
        console.log(`      Email: ${client.email}`);
        console.log(`      Phone: "${client.phone}" (type: ${typeof client.phone})`);
        console.log(`      Phone length: ${client.phone ? client.phone.length : 0}`);
        
        // Check if phone is properly formatted
        if (client.phone && client.phone.includes('(') && client.phone.includes(')')) {
          console.log(`      ✅ Phone is properly formatted`);
        } else {
          console.log(`      ❌ Phone is not properly formatted`);
        }
      });

      // Check if any clients have phone numbers
      const clientsWithPhones = clients.filter(client => client.phone && client.phone !== '');
      console.log(`\n   📱 Total clients with phone numbers: ${clientsWithPhones.length} out of ${clients.length}`);

      if (clientsWithPhones.length > 0) {
        console.log('   ✅ Phone numbers are being imported and retrieved correctly!');
      } else {
        console.log('   ❌ Phone numbers are not being retrieved correctly');
      }
    } else {
      console.log(`   ❌ Failed to get clients: ${apiResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Error testing phone format:', error.message);
  }
}

testPhoneFormat(); 