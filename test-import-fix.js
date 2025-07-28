import fetch from 'node-fetch';

async function testImportFix() {
  console.log('Testing client import functionality after proxy fix...');
  
  try {
    // Test the import endpoint directly
    const testData = [
      {
        firstName: 'Test',
        lastName: 'Import',
        email: 'test.import@example.com',
        phone: '555-987-6543'
      }
    ];
    
    console.log('Sending test import request...');
    const response = await fetch('http://localhost:5002/api/clients/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ clients: testData })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✓ Import successful!');
      console.log(`  - Imported: ${result.imported} clients`);
      console.log(`  - Skipped: ${result.skipped} clients`);
      if (result.errors && result.errors.length > 0) {
        console.log(`  - Errors: ${result.errors.join(', ')}`);
      }
    } else {
      const errorText = await response.text();
      console.log(`✗ Import failed: ${response.status} - ${errorText}`);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testImportFix(); 