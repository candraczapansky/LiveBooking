// Very simple script to fix staff login using Node.js pg client
import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("ERROR: DATABASE_URL environment variable is required");
  process.exit(1);
}

// Create connection pool
const pool = new Pool({
  connectionString: databaseUrl,
});

async function main() {
  console.log("🔧 Starting staff login fix...");

  try {
    // Step 1: Reset passwords for all staff users
    console.log("Step 1: Getting all staff users");
    
    const { rows: staffUsers } = await pool.query(`
      SELECT u.* FROM users u
      JOIN staff s ON s.user_id = u.id
    `);
    
    console.log(`Found ${staffUsers.length} staff users`);
    
    // Step 2: Reset passwords
    console.log("\nStep 2: Resetting passwords for all staff users");
    
    // Generate hashed password (same for all users to keep it simple)
    const defaultPassword = await bcrypt.hash('password123', 10);
    
    for (const user of staffUsers) {
      try {
        await pool.query(`
          UPDATE users SET password = $1
          WHERE id = $2
        `, [defaultPassword, user.id]);
        
        console.log(`✅ Reset password for ${user.username || user.email} (${user.first_name} ${user.last_name})`);
      } catch (err) {
        console.error(`❌ Failed to reset password for user ${user.id}:`, err.message);
      }
    }
    
    // Step 3: Ensure staff role is set correctly
    console.log("\nStep 3: Ensuring staff role is set correctly");
    
    for (const user of staffUsers) {
      if (user.role !== 'staff' && user.role !== 'admin') {
        try {
          await pool.query(`
            UPDATE users SET role = 'staff'
            WHERE id = $1
          `, [user.id]);
          
          console.log(`✅ Updated role to 'staff' for ${user.username || user.email}`);
        } catch (err) {
          console.error(`❌ Failed to update role for user ${user.id}:`, err.message);
        }
      }
    }
    
    // Step 4: Fix any missing usernames
    console.log("\nStep 4: Fixing missing usernames");
    
    for (const user of staffUsers) {
      if (!user.username) {
        // Generate username from first and last name
        const firstName = (user.first_name || '').toLowerCase();
        const lastName = (user.last_name || '').toLowerCase();
        let username = `${firstName}${lastName}`;
        
        // If name is too short, use email prefix
        if (username.length < 3 && user.email) {
          username = user.email.split('@')[0];
        }
        
        // Fallback to staffID if still no username
        if (!username || username.length < 3) {
          username = `staff${user.id}`;
        }
        
        // Remove special characters
        username = username.replace(/[^a-z0-9]/g, '');
        
        try {
          await pool.query(`
            UPDATE users SET username = $1
            WHERE id = $2
          `, [username, user.id]);
          
          console.log(`✅ Set username to "${username}" for ${user.first_name} ${user.last_name}`);
        } catch (err) {
          console.error(`❌ Failed to set username for user ${user.id}:`, err.message);
        }
      }
    }
    
    // Step 5: Display login credentials for staff members
    console.log("\n📋 Staff Login Credentials:");
    console.log("All staff passwords have been reset to: password123\n");
    
    const { rows: updatedUsers } = await pool.query(`
      SELECT u.username, u.email, u.first_name, u.last_name 
      FROM users u
      JOIN staff s ON s.user_id = u.id
      ORDER BY u.first_name, u.last_name
    `);
    
    console.log("Username | Email | Name");
    console.log("---------|-------|------");
    
    updatedUsers.forEach(user => {
      console.log(`${user.username} | ${user.email} | ${user.first_name} ${user.last_name}`);
    });
    
    console.log("\n✅ Fix complete! You can now log in using any staff username with password 'password123'");
    
  } catch (error) {
    console.error('Error during staff login fix:', error);
  } finally {
    // Close pool
    await pool.end();
  }
}

main()
  .catch(e => console.error('Error running fix script:', e));






