import fs from 'fs';
import fetch from 'node-fetch';

async function debugClientImport() {
  console.log('🔍 Debugging Client Import Functionality\n');
  
  try {
    // Test 1: Check server status
    console.log('1. ✅ Server Status Check');
    const serverResponse = await fetch('http://localhost:5001/api/users?role=client');
    if (serverResponse.ok) {
      const data = await serverResponse.json();
      console.log(`   ✓ Server running on port 5001`);
      console.log(`   ✓ Found ${data.length} existing clients`);
    } else {
      console.log(`   ✗ Server error: ${serverResponse.status}`);
      return;
    }
    
    // Test 2: Check test CSV files
    console.log('\n2. 📁 CSV File Check');
    const testFiles = ['test_d_clients.csv', 'test_import.csv', 'test_import_simple.csv'];
    for (const file of testFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n').length - 1; // Subtract header
        console.log(`   ✓ ${file}: ${lines} data rows`);
      } else {
        console.log(`   ✗ ${file}: Missing`);
      }
    }
    
    // Test 3: Test import API directly
    console.log('\n3. 🔧 API Import Test');
    const testData = [
      {
        firstName: 'Debug',
        lastName: 'Test',
        email: 'debug.test@example.com',
        phone: '555-111-9999'
      }
    ];
    
    const importResponse = await fetch('http://localhost:5001/api/clients/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clients: testData })
    });
    
    if (importResponse.ok) {
      const result = await importResponse.json();
      console.log(`   ✓ Import API working: ${result.imported} imported, ${result.skipped} skipped`);
      if (result.errors && result.errors.length > 0) {
        console.log(`   ⚠️  Errors: ${result.errors.join(', ')}`);
      }
    } else {
      const errorText = await importResponse.text();
      console.log(`   ✗ Import API failed: ${importResponse.status} - ${errorText}`);
    }
    
    // Test 4: Check frontend accessibility
    console.log('\n4. 🌐 Frontend Check');
    const frontendResponse = await fetch('http://localhost:5001/');
    if (frontendResponse.ok) {
      console.log('   ✓ Frontend accessible at http://localhost:5001/');
    } else {
      console.log(`   ✗ Frontend not accessible: ${frontendResponse.status}`);
    }
    
    // Test 5: Provide troubleshooting steps
    console.log('\n5. 🛠️  Troubleshooting Steps');
    console.log('   If client import is still not working:');
    console.log('   1. Open browser developer tools (F12)');
    console.log('   2. Go to http://localhost:5001/');
    console.log('   3. Navigate to Clients page');
    console.log('   4. Click Import button');
    console.log('   5. Check Console tab for JavaScript errors');
    console.log('   6. Check Network tab for API request failures');
    console.log('   7. Try uploading one of the test CSV files:');
    console.log('      - test_d_clients.csv');
    console.log('      - test_import.csv');
    console.log('      - test_import_simple.csv');
    
    console.log('\n6. 📋 CSV Format Requirements');
    console.log('   Required columns (case-insensitive):');
    console.log('   - firstName (or "First Name")');
    console.log('   - lastName (or "Last Name")');
    console.log('   - email (optional, will generate if missing)');
    console.log('   - phone (optional, will generate if missing)');
    
    console.log('\n7. ✅ Expected Behavior');
    console.log('   - Missing emails: Auto-generated with format: name.row.timestamp@placeholder.com');
    console.log('   - Missing phones: Auto-generated with format: 555-000-XXXX-XXXX');
    console.log('   - Duplicate emails: Auto-modified with suffix');
    console.log('   - Duplicate phones: Auto-modified with suffix');
    console.log('   - Import results: Shows success/error counts');
    console.log('   - Client list: Automatically refreshes after import');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugClientImport(); 