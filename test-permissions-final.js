const BASE_URL = 'http://localhost:5010';

async function testPermissionsSystem() {
  console.log('🧪 Testing final permissions system...');
  
  try {
    // 1. Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'stylist1',
        password: 'password'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log(`User role: ${loginData.user.role}`);
    console.log(`User ID: ${loginData.user.id}`);
    
    // 2. Test permission groups endpoint
    console.log('2. Testing permission groups endpoint...');
    const groupsResponse = await fetch(`${BASE_URL}/api/permission-groups`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    
    if (!groupsResponse.ok) {
      throw new Error(`Failed to load permission groups: ${groupsResponse.status}`);
    }
    
    const groupsData = await groupsResponse.json();
    console.log('✅ Permission groups loaded successfully');
    console.log(`Number of groups: ${groupsData.data.length}`);
    console.log('Groups found:');
    groupsData.data.forEach(group => {
      console.log(`  - ${group.name}: ${group.description}`);
    });
    
    // 3. Test permissions endpoint
    console.log('3. Testing permissions endpoint...');
    const permissionsResponse = await fetch(`${BASE_URL}/api/permissions`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    
    if (!permissionsResponse.ok) {
      throw new Error(`Failed to load permissions: ${permissionsResponse.status}`);
    }
    
    const permissionsData = await permissionsResponse.json();
    console.log('✅ Permissions loaded successfully');
    console.log(`Number of permissions: ${permissionsData.data.length}`);
    
    // 4. Test user permission groups endpoint
    console.log('4. Testing user permission groups endpoint...');
    const userGroupsResponse = await fetch(`${BASE_URL}/api/user-permission-groups/${loginData.user.id}`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    
    if (!userGroupsResponse.ok) {
      throw new Error(`Failed to load user permission groups: ${userGroupsResponse.status}`);
    }
    
    const userGroupsData = await userGroupsResponse.json();
    console.log('✅ User permission groups loaded successfully');
    console.log(`Number of user groups: ${userGroupsData.data.length}`);
    
    // 5. Test staff creation with permissions
    console.log('5. Testing staff creation with permissions...');
    const timestamp = Date.now();
    const staffData = {
      username: `teststaff${timestamp}`,
      email: `teststaff${timestamp}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'Staff',
      role: 'staff',
      phone: '555-123-4567',
      permissions: [1, 2, 3] // Assign some permission groups
    };
    
    const createStaffResponse = await fetch(`${BASE_URL}/api/register/staff`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify(staffData)
    });
    
    if (!createStaffResponse.ok) {
      const errorData = await createStaffResponse.json();
      throw new Error(`Staff creation failed: ${createStaffResponse.status} - ${errorData.message}`);
    }
    
    const createStaffData = await createStaffResponse.json();
    console.log('✅ Staff creation successful');
    console.log(`Created staff member: ${staffData.username}`);
    
    console.log('\n🎉 Permissions system test completed successfully!');
    console.log('📊 Summary:');
    console.log(`  - Permissions: ${permissionsData.data.length}`);
    console.log(`  - Permission Groups: ${groupsData.data.length}`);
    console.log(`  - User Groups: ${userGroupsData.data.length}`);
    console.log(`  - Staff Creation: ✅ Working`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testPermissionsSystem(); 