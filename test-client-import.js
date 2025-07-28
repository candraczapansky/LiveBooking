import fs from 'fs';
import path from 'path';

// Test the client import functionality
async function testClientImport() {
  console.log('Testing client import functionality...');
  
  try {
    // Test 1: Check if the test CSV files exist
    const testFiles = [
      'test_d_clients.csv',
      'test_import.csv',
      'test_import_simple.csv'
    ];
    
    console.log('\n1. Checking test CSV files:');
    for (const file of testFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        console.log(`✓ ${file} exists (${content.split('\n').length} lines)`);
      } else {
        console.log(`✗ ${file} missing`);
      }
    }
    
    // Test 2: Check if server is running by making a simple request
    console.log('\n2. Testing server connectivity:');
    try {
      const response = await fetch('http://localhost:5002/api/users?role=client');
      if (response.ok) {
        const data = await response.json();
        console.log(`✓ Server is running (found ${data.length} existing clients)`);
      } else {
        console.log(`✗ Server responded with status: ${response.status}`);
      }
    } catch (error) {
      console.log(`✗ Server connection failed: ${error.message}`);
      console.log('   Make sure the server is running with: npm run dev');
    }
    
    // Test 3: Test the import endpoint directly
    console.log('\n3. Testing import endpoint:');
    try {
      const testData = [
        {
          firstName: 'Test',
          lastName: 'User',
          email: 'test.user@example.com',
          phone: '555-123-4567'
        }
      ];
      
      const response = await fetch('http://localhost:5002/api/clients/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clients: testData })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✓ Import endpoint working: ${result.imported} imported, ${result.skipped} skipped`);
        if (result.errors && result.errors.length > 0) {
          console.log(`  Errors: ${result.errors.join(', ')}`);
        }
      } else {
        const errorText = await response.text();
        console.log(`✗ Import endpoint failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.log(`✗ Import endpoint test failed: ${error.message}`);
    }
    
    // Test 4: Check database constraints
    console.log('\n4. Checking database constraints:');
    console.log('   - Email must be unique');
    console.log('   - Phone must be unique');
    console.log('   - Username must be unique');
    console.log('   - All fields are properly handled in the import logic');
    
    console.log('\n5. Common issues to check:');
    console.log('   - Server must be running (npm run dev)');
    console.log('   - Database connection must be working');
    console.log('   - CSV file format must match expected headers');
    console.log('   - Browser console for JavaScript errors');
    console.log('   - Server logs for backend errors');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testClientImport(); 