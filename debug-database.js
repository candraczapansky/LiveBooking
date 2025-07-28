import { neon } from '@neondatabase/serverless';

// Check if DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.log('💡 Please set the DATABASE_URL environment variable');
  process.exit(1);
}

async function debugDatabase() {
  console.log('🔍 Debugging Database Structure\n');
  
  try {
    // Create direct SQL connection
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('1. 📊 Checking users table structure...');
    
    // Get all columns in users table
    const columnsResult = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;
    
    console.log('   📋 Users table columns:');
    columnsResult.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check if phone column exists
    const phoneColumn = columnsResult.find(col => col.column_name === 'phone');
    if (phoneColumn) {
      console.log('\n   ✅ Phone column exists in database');
      console.log(`   📱 Phone column details: ${phoneColumn.data_type} (nullable: ${phoneColumn.is_nullable})`);
    } else {
      console.log('\n   ❌ Phone column does NOT exist in database');
    }
    
    // Check constraints
    console.log('\n2. 🔒 Checking constraints...');
    const constraintsResult = await sql`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name = 'users'
    `;
    
    console.log('   📋 Users table constraints:');
    constraintsResult.forEach(constraint => {
      console.log(`   - ${constraint.constraint_name}: ${constraint.constraint_type}`);
    });
    
    // Check if phone unique constraint exists
    const phoneConstraint = constraintsResult.find(c => c.constraint_name === 'users_phone_unique');
    if (phoneConstraint) {
      console.log('\n   ✅ Phone unique constraint exists');
    } else {
      console.log('\n   ❌ Phone unique constraint does NOT exist');
    }
    
    // Test inserting a phone number directly
    console.log('\n3. 🧪 Testing direct phone insertion...');
    
    // Get a test user
    const testUser = await sql`SELECT id, email FROM users LIMIT 1`;
    if (testUser.length > 0) {
      const userId = testUser[0].id;
      console.log(`   📝 Testing with user ID: ${userId}`);
      
      // Try to update the user with a phone number
      try {
        await sql`UPDATE users SET phone = '555-TEST-1234' WHERE id = ${userId}`;
        console.log('   ✅ Successfully updated user with phone number');
        
        // Check if the phone number was stored
        const updatedUser = await sql`SELECT id, email, phone FROM users WHERE id = ${userId}`;
        if (updatedUser.length > 0) {
          console.log(`   📱 Stored phone: "${updatedUser[0].phone}"`);
        }
      } catch (error) {
        console.log(`   ❌ Error updating phone: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging database:', error.message);
  }
}

debugDatabase(); 