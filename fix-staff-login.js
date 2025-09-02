// Simple script to fix staff login issues using direct SQL
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import bcrypt from 'bcrypt';

// Load environment variables
dotenv.config();

// Get database URL from .env file or environment
let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  try {
    // Attempt to read from .env file manually if process.env didn't work
    const envFile = fs.readFileSync('.env', 'utf8');
    const dbUrlMatch = envFile.match(/DATABASE_URL=(.+)/);
    if (dbUrlMatch && dbUrlMatch[1]) {
      databaseUrl = dbUrlMatch[1].trim();
    }
  } catch (err) {
    console.error("Couldn't find DATABASE_URL in .env file", err);
  }
}

if (!databaseUrl) {
  console.error("ERROR: DATABASE_URL environment variable is required");
  process.exit(1);
}

// Configure neon client
const sql = neon(databaseUrl);

async function main() {
  try {
    console.log("🔍 Starting staff login fix...");

    // Step 1: List all staff members from the staff table
    console.log("\n📋 Step 1: Listing all staff from staff table");
    const staffRows = await sql`SELECT * FROM staff`;
    console.log(`Found ${staffRows.length} staff records`);
    
    if (staffRows.length === 0) {
      console.log("❌ No staff found in the staff table!");
    } else {
      // Step 2: Check if staff users exist in the users table
      console.log("\n📋 Step 2: Checking staff user accounts in users table");
      
      for (const staff of staffRows) {
        const userId = staff.user_id;
        const staffId = staff.id;
        
        // Get user account
        const userRows = await sql`SELECT * FROM users WHERE id = ${userId}`;
        
        if (userRows.length === 0) {
          console.log(`❌ Staff ID ${staffId}: No matching user found for user_id ${userId}`);
          console.log("   This staff member doesn't have a valid user account and can't log in");
        } else {
          const user = userRows[0];
          console.log(`✅ Staff ID ${staffId}: Found user account "${user.username}" (${user.first_name} ${user.last_name})`);
          
          // Step 3: Check user role
          if (user.role !== 'staff' && user.role !== 'admin') {
            console.log(`❌ User ${user.username} has incorrect role "${user.role}" (should be "staff" or "admin")`);
            
            // Fix the role
            await sql`UPDATE users SET role = 'staff' WHERE id = ${userId}`;
            console.log(`✅ Fixed: Set role to "staff" for user ${user.username}`);
          }
          
          // Step 4: Check password format
          const pwd = user.password;
          const isBcryptHash = pwd && (pwd.startsWith('$2a$') || pwd.startsWith('$2b$') || pwd.startsWith('$2y$'));
          
          if (!pwd) {
            console.log(`❌ User ${user.username} has no password set`);
            
            // Fix by setting a default password
            const hashedPassword = await bcrypt.hash('password123', 10);
            await sql`UPDATE users SET password = ${hashedPassword} WHERE id = ${userId}`;
            console.log(`✅ Fixed: Set default password "password123" for user ${user.username}`);
          } else if (!isBcryptHash) {
            console.log(`❌ User ${user.username} has plaintext password that needs migration`);
            
            try {
              // Hash the current plaintext password
              const hashedPassword = await bcrypt.hash(pwd, 10);
              await sql`UPDATE users SET password = ${hashedPassword} WHERE id = ${userId}`;
              console.log(`✅ Fixed: Migrated plaintext password to bcrypt hash for user ${user.username}`);
            } catch (e) {
              console.log(`❌ Failed to hash password: ${e.message}`);
              
              // Fallback: set a default password
              try {
                const defaultPassword = await bcrypt.hash('password123', 10);
                await sql`UPDATE users SET password = ${defaultPassword} WHERE id = ${userId}`;
                console.log(`✅ Fixed: Set default password "password123" for user ${user.username}`);
              } catch (err) {
                console.log(`❌ Failed to set default password: ${err.message}`);
              }
            }
          } else {
            console.log(`✅ Password format looks good (bcrypt hash)`);
          }
        }
        console.log("-----");
      }
    }

    // Step 5: Check if there are orphaned staff (users with role=staff but no staff record)
    console.log("\n📋 Step 5: Checking for orphaned staff users");
    const staffUsers = await sql`
      SELECT u.* FROM users u 
      WHERE u.role = 'staff' 
      AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.user_id = u.id)
    `;
    
    if (staffUsers.length > 0) {
      console.log(`⚠️ Found ${staffUsers.length} staff users without staff records`);
      
      for (const user of staffUsers) {
        console.log(`   - ${user.username} (${user.first_name} ${user.last_name})`);
        
        // Create staff record
        console.log(`   Creating staff record for user ${user.username}...`);
        try {
          await sql`INSERT INTO staff (user_id, title) VALUES (${user.id}, 'Staff Member')`;
          console.log(`   ✅ Created staff record for ${user.username}`);
        } catch (e) {
          console.log(`   ❌ Failed to create staff record: ${e.message}`);
        }
      }
    } else {
      console.log("✅ No orphaned staff users found");
    }

    // Step 6: Check staff members with username = null
    console.log("\n📋 Step 6: Checking for staff with missing usernames");
    const nullUsernameStaff = await sql`
      SELECT u.*, s.id as staff_id FROM users u
      JOIN staff s ON s.user_id = u.id
      WHERE u.username IS NULL OR u.username = ''
    `;
    
    if (nullUsernameStaff.length > 0) {
      console.log(`❌ Found ${nullUsernameStaff.length} staff users with missing usernames`);
      
      for (const user of nullUsernameStaff) {
        // Generate a username from first name and last name
        const firstName = user.first_name || 'staff';
        const lastName = user.last_name || `${user.id}`;
        const baseUsername = `${firstName.toLowerCase()}${lastName.toLowerCase()}`.replace(/[^a-z0-9]/g, '');
        
        // Verify it's unique and add a number if not
        let username = baseUsername;
        let suffix = 1;
        let isUnique = false;
        
        while (!isUnique) {
          const checkUser = await sql`SELECT id FROM users WHERE username = ${username} AND id != ${user.id}`;
          if (checkUser.length === 0) {
            isUnique = true;
          } else {
            username = `${baseUsername}${suffix}`;
            suffix++;
          }
        }
        
        // Update the username
        await sql`UPDATE users SET username = ${username} WHERE id = ${user.id}`;
        console.log(`✅ Fixed: Set username to "${username}" for staff ${user.first_name} ${user.last_name}`);
      }
    } else {
      console.log("✅ All staff members have usernames");
    }
    
    // Step 7: Reset all staff passwords to make it easier to log in
    console.log("\n📋 Step 7: Resetting all staff passwords for easy login");
    const defaultPassword = await bcrypt.hash('password123', 10);
    
    const staffToReset = await sql`
      SELECT u.* FROM users u
      JOIN staff s ON s.user_id = u.id
    `;
    
    console.log(`Found ${staffToReset.length} staff accounts to reset passwords`);
    
    for (const user of staffToReset) {
      await sql`UPDATE users SET password = ${defaultPassword} WHERE id = ${user.id}`;
      console.log(`✅ Reset password for ${user.username} (${user.first_name} ${user.last_name})`);
    }
    
    console.log("\n🔧 Staff login fix complete!");
    console.log("All staff passwords have been reset to 'password123'");
    console.log("You can now log in using the staff username and this password.");

  } catch (error) {
    console.error('Error during staff login fix:', error);
  }
}

main()
  .then(() => console.log('Fix script completed'))
  .catch(e => console.error('Error running fix script:', e));






