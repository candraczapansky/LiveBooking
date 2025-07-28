import { neon } from '@neondatabase/serverless';

// Check if DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function removePhoneConstraint() {
  console.log('🔧 Removing phone unique constraint...\n');
  
  try {
    // Create direct SQL connection
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('1. 🔍 Checking if constraint exists...');
    
    // Check if constraint exists
    const constraintCheck = await sql`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'users' AND constraint_name = 'users_phone_unique'
    `;
    
    if (constraintCheck.length > 0) {
      console.log('   ✅ Phone unique constraint found, removing it...');
      
      // Remove the constraint
      await sql`ALTER TABLE users DROP CONSTRAINT users_phone_unique`;
      console.log('   ✅ Phone unique constraint removed successfully');
    } else {
      console.log('   ℹ️  Phone unique constraint does not exist');
    }
    
    // Verify constraint was removed
    console.log('\n2. 🔍 Verifying constraint removal...');
    const verifyCheck = await sql`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'users' AND constraint_name = 'users_phone_unique'
    `;
    
    if (verifyCheck.length === 0) {
      console.log('   ✅ Phone unique constraint successfully removed');
      console.log('\n🎉 You can now update users with duplicate phone numbers!');
    } else {
      console.log('   ❌ Phone unique constraint still exists');
    }
    
  } catch (error) {
    console.error('❌ Error removing phone constraint:', error.message);
  }
}

removePhoneConstraint(); 