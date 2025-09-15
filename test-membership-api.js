// Test if we can create a membership subscription
async function testAPI() {
  console.log("Testing Membership Subscription API...\n");
  
  try {
    // Test 1: Fetch memberships
    console.log("1. Fetching memberships...");
    const membershipsRes = await fetch('http://localhost:5000/api/memberships');
    const memberships = await membershipsRes.json();
    console.log(`   ✓ Found ${memberships.length} membership plans`);
    
    // Test 2: Fetch users/clients
    console.log("\n2. Fetching clients...");
    const usersRes = await fetch('http://localhost:5000/api/users');
    const users = await usersRes.json();
    const clients = users.filter(u => u.role === 'client');
    console.log(`   ✓ Found ${clients.length} clients`);
    
    // Test 3: Create a test subscription
    console.log("\n3. Creating test subscription...");
    const testClient = clients[2]; // Use third client
    const testMembership = memberships[0];
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    
    const subscriptionData = {
      clientId: testClient.id,
      membershipId: testMembership.id,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      active: true,
      autoRenew: false
    };
    
    console.log(`   Creating subscription for ${testClient.firstName} ${testClient.lastName}...`);
    
    const createRes = await fetch('http://localhost:5000/api/client-memberships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscriptionData)
    });
    
    if (createRes.ok) {
      const newSubscription = await createRes.json();
      console.log(`   ✓ Subscription created with ID: ${newSubscription.id}`);
    } else {
      console.log(`   ✗ Failed: ${createRes.status} ${createRes.statusText}`);
    }
    
    // Test 4: Fetch all subscriptions
    console.log("\n4. Fetching all client memberships...");
    const subsRes = await fetch('http://localhost:5000/api/client-memberships');
    const subscriptions = await subsRes.json();
    console.log(`   ✓ Total active subscriptions: ${subscriptions.length}`);
    
    // Show first few
    console.log("\n   Recent subscriptions:");
    subscriptions.slice(0, 3).forEach(sub => {
      console.log(`   - Client ${sub.clientId}: Membership ${sub.membershipId} (ID: ${sub.id})`);
    });
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testAPI();
