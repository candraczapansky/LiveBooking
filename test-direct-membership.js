// Direct test of membership subscription creation
const testMembershipCreation = async () => {
  console.log("Testing membership creation...");
  
  try {
    // First, fetch a client
    const usersResponse = await fetch('http://localhost:5000/api/users');
    const users = await usersResponse.json();
    const clients = users.filter(u => u.role === 'client');
    const testClient = clients[1]; // Use second client to avoid duplicates
    
    console.log("Using client:", testClient.id, testClient.firstName, testClient.lastName);
    
    // Create subscription
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    
    const subscriptionData = {
      clientId: testClient.id,
      membershipId: 6,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      active: true,
      autoRenew: false
    };
    
    console.log("Creating subscription:", subscriptionData);
    
    const response = await fetch('http://localhost:5000/api/client-memberships', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionData)
    });
    
    const result = await response.json();
    console.log("Response status:", response.status);
    console.log("Result:", result);
    
    if (response.ok) {
      console.log("✅ SUCCESS! Membership created with ID:", result.id);
      
      // Now create payment
      const paymentData = {
        clientId: testClient.id,
        clientMembershipId: result.id,
        amount: 89,
        totalAmount: 89,
        method: 'cash',
        status: 'completed',
        type: 'membership',
        description: 'Test membership payment',
        paymentDate: new Date().toISOString()
      };
      
      console.log("Creating payment:", paymentData);
      
      const paymentResponse = await fetch('http://localhost:5000/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });
      
      const paymentResult = await paymentResponse.json();
      console.log("Payment response status:", paymentResponse.status);
      console.log("Payment result:", paymentResult);
      
      if (paymentResponse.ok) {
        console.log("✅ Payment created successfully!");
      }
    } else {
      console.error("❌ Failed to create membership:", result);
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

testMembershipCreation();
