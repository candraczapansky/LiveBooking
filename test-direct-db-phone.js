import { neon } from '@neondatabase/serverless';

// Check if DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.log('💡 Please set the DATABASE_URL environment variable');
  process.exit(1);
}

async function testDirectDatabasePhone() {
  console.log('🔍 Testing Direct Database Phone Storage\n');
  
  try {
    // Create direct SQL connection
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('1. 📊 Checking recent users with phone numbers...');
    
    // Get recent users and check their phone numbers
    const recentUsers = await sql`
      SELECT id, email, first_name, last_name, phone 
      FROM users 
      WHERE phone IS NOT NULL AND phone != ''
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    console.log(`   📋 Found ${recentUsers.length} users with phone numbers`);
    
    recentUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.first_name} ${user.last_name}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Phone: "${user.phone}" (type: ${typeof user.phone})`);
      console.log(`      Phone length: ${user.phone ? user.phone.length : 0}`);
    });
    
    // Check our test users specifically
    console.log('\n2. 🔍 Checking our test users...');
    const testUsers = await sql`
      SELECT id, email, first_name, last_name, phone 
      FROM users 
      WHERE email LIKE '%phone.fix.test@example.com%'
      ORDER BY created_at DESC
    `;
    
    console.log(`   📋 Found ${testUsers.length} test users`);
    
    testUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.first_name} ${user.last_name}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Phone: "${user.phone}" (type: ${typeof user.phone})`);
      console.log(`      Phone length: ${user.phone ? user.phone.length : 0}`);
    });
    
    // Check if phone column exists and has data
    console.log('\n3. 📊 Checking phone column statistics...');
    const phoneStats = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT(phone) as users_with_phone,
        COUNT(CASE WHEN phone != '' THEN 1 END) as users_with_non_empty_phone
      FROM users
    `;
    
    console.log('   📊 Phone column statistics:');
    console.log(`      Total users: ${phoneStats[0].total_users}`);
    console.log(`      Users with phone (not null): ${phoneStats[0].users_with_phone}`);
    console.log(`      Users with non-empty phone: ${phoneStats[0].users_with_non_empty_phone}`);
    
    // Check a few random users to see their phone status
    console.log('\n4. 🔍 Checking random users...');
    const randomUsers = await sql`
      SELECT id, email, first_name, last_name, phone 
      FROM users 
      ORDER BY RANDOM() 
      LIMIT 5
    `;
    
    randomUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.first_name} ${user.last_name}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Phone: "${user.phone}" (type: ${typeof user.phone})`);
      console.log(`      Phone length: ${user.phone ? user.phone.length : 0}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing direct database:', error.message);
  }
}

testDirectDatabasePhone(); 