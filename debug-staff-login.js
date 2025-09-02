// Debug script to fix staff login issues
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, sql } from 'drizzle-orm';
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
const neonClient = neon(databaseUrl);
const db = drizzle(neonClient);

async function main() {
  try {
    console.log("🔍 Starting staff login debug...");

    // Step 1: List all staff members from the staff table
    console.log("\n📋 Step 1: Listing all staff from staff table");
    const staffRows = await db.execute(`SELECT * FROM staff`);
    console.log(`Found ${staffRows.rowCount} staff records`);
    
    if (staffRows.rowCount === 0) {
      console.log("❌ No staff found in the staff table!");
    } else {
      // Step 2: Check if staff users exist in the users table
      console.log("\n📋 Step 2: Checking staff user accounts in users table");
      
      for (const staff of staffRows.rows) {
        const userId = staff.user_id;
        const staffId = staff.id;
        
        // Get user account
        const userRows = await db.execute(`SELECT * FROM users WHERE id = $1`, [userId]);
        
        if (userRows.rowCount === 0) {
          console.log(`❌ Staff ID ${staffId}: No matching user found for user_id ${userId}`);
          console.log("   This staff member doesn't have a valid user account and can't log in");
        } else {
          const user = userRows.rows[0];
          console.log(`✅ Staff ID ${staffId}: Found user account "${user.username}" (${user.first_name} ${user.last_name})`);
          
          // Step 3: Check user role
          if (user.role !== 'staff' && user.role !== 'admin') {
            console.log(`❌ User ${user.username} has incorrect role "${user.role}" (should be "staff" or "admin")`);
            
            // Fix the role
            await db.execute(`UPDATE users SET role = 'staff' WHERE id = $1`, [userId]);
            console.log(`✅ Fixed: Set role to "staff" for user ${user.username}`);
          }
          
          // Step 4: Check password format
          const pwd = user.password;
          const isBcryptHash = pwd && (pwd.startsWith('$2a$') || pwd.startsWith('$2b$') || pwd.startsWith('$2y$'));
          
          if (!pwd) {
            console.log(`❌ User ${user.username} has no password set`);
            
            // Fix by setting a default password
            const hashedPassword = await bcrypt.hash('password123', 10);
            await db.execute(`UPDATE users SET password = $1 WHERE id = $2`, [hashedPassword, userId]);
            console.log(`✅ Fixed: Set default password "password123" for user ${user.username}`);
          } else if (!isBcryptHash) {
            console.log(`❌ User ${user.username} has plaintext password that needs migration`);
            
            // Hash the current plaintext password
            try {
              const hashedPassword = await bcrypt.hash(pwd, 10);
              await db.execute(`UPDATE users SET password = $1 WHERE id = $2`, [hashedPassword, userId]);
              console.log(`✅ Fixed: Migrated plaintext password to bcrypt hash for user ${user.username}`);
            } catch (e) {
              console.log(`❌ Failed to hash password: ${e.message}`);
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
    const staffUsers = await db.execute(`
      SELECT u.* FROM users u 
      WHERE u.role = 'staff' 
      AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.user_id = u.id)
    `);
    
    if (staffUsers.rowCount > 0) {
      console.log(`⚠️ Found ${staffUsers.rowCount} staff users without staff records`);
      
      for (const user of staffUsers.rows) {
        console.log(`   - ${user.username} (${user.first_name} ${user.last_name})`);
      }
      
      // Offer to fix by creating staff records
      console.log("\nTo fix, run the following SQL:");
      for (const user of staffUsers.rows) {
        console.log(`
INSERT INTO staff (user_id, title) 
VALUES (${user.id}, 'Staff Member');
        `);
      }
    } else {
      console.log("✅ No orphaned staff users found");
    }

    // Step 6: Check staff members with username = null
    console.log("\n📋 Step 6: Checking for staff with missing usernames");
    const nullUsernameStaff = await db.execute(`
      SELECT u.*, s.id as staff_id FROM users u
      JOIN staff s ON s.user_id = u.id
      WHERE u.username IS NULL OR u.username = ''
    `);
    
    if (nullUsernameStaff.rowCount > 0) {
      console.log(`❌ Found ${nullUsernameStaff.rowCount} staff users with missing usernames`);
      
      for (const user of nullUsernameStaff.rows) {
        // Generate a username from first name and last name
        const firstName = user.first_name || 'staff';
        const lastName = user.last_name || `${user.id}`;
        const baseUsername = `${firstName.toLowerCase()}${lastName.toLowerCase()}`.replace(/[^a-z0-9]/g, '');
        
        // Verify it's unique and add a number if not
        let username = baseUsername;
        let suffix = 1;
        let isUnique = false;
        
        while (!isUnique) {
          const checkUser = await db.execute(`SELECT id FROM users WHERE username = $1 AND id != $2`, [username, user.id]);
          if (checkUser.rowCount === 0) {
            isUnique = true;
          } else {
            username = `${baseUsername}${suffix}`;
            suffix++;
          }
        }
        
        // Update the username
        await db.execute(`UPDATE users SET username = $1 WHERE id = $2`, [username, user.id]);
        console.log(`✅ Fixed: Set username to "${username}" for staff ${user.first_name} ${user.last_name}`);
      }
    } else {
      console.log("✅ All staff members have usernames");
    }
    
    console.log("\n🔧 Staff login debug complete!");
    console.log("Try logging in with the updated credentials.");
    console.log("If you still have issues, try using the username shown above");
    console.log("or reset the password through the login page.");

  } catch (error) {
    console.error('Error during staff login debug:', error);
  } finally {
    neonClient.end();
  }
}

main()
  .then(() => console.log('Debug script completed'))
  .catch(e => console.error('Error running debug script:', e));
