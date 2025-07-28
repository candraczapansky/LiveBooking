import fetch from 'node-fetch';

async function findEmailUser() {
  console.log('🔍 Finding user with email: Candraczapansky@gmail.com\n');
  
  try {
    // Get all users to search through
    const response = await fetch('http://localhost:5000/api/users');
    
    if (response.ok) {
      const users = await response.json();
      console.log(`📊 Total users in database: ${users.length}`);
      
      // Find the user with the specific email
      const targetUser = users.find(user => 
        user.email === 'Candraczapansky@gmail.com'
      );
      
      if (targetUser) {
        console.log('✅ Found user with Candraczapansky@gmail.com:');
        console.log(`   ID: ${targetUser.id}`);
        console.log(`   Name: ${targetUser.firstName} ${targetUser.lastName}`);
        console.log(`   Email: ${targetUser.email}`);
        console.log(`   Phone: ${targetUser.phone}`);
        console.log(`   Role: ${targetUser.role}`);
        console.log(`   Username: ${targetUser.username}`);
      } else {
        console.log('❌ No user found with email: Candraczapansky@gmail.com');
        
        // Show some users with similar emails for debugging
        console.log('\n🔍 Checking for similar emails:');
        const similarEmails = users.filter(user => 
          user.email.toLowerCase().includes('candrac') ||
          user.email.toLowerCase().includes('zapansky')
        );
        
        if (similarEmails.length > 0) {
          console.log(`Found ${similarEmails.length} users with similar emails:`);
          similarEmails.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} - ${user.email}`);
          });
        } else {
          console.log('No users found with similar emails');
        }
      }
    } else {
      console.error('❌ Failed to fetch users:', response.status);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findEmailUser(); 