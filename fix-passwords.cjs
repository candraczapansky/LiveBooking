// CommonJS script to fix staff passwords
const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log("Connecting to database...");
    await client.connect();
    console.log("Connected to database");

    // Get all staff users
    const staffResult = await client.query(`
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role
      FROM users u
      JOIN staff s ON s.user_id = u.id
    `);

    console.log(`Found ${staffResult.rows.length} staff users`);
    
    if (staffResult.rows.length === 0) {
      console.log("No staff users found.");
      return;
    }
    
    // Generate a hashed password (same for all users)
    const plainPassword = 'password123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    // Update staff passwords
    for (const user of staffResult.rows) {
      await client.query(
        `UPDATE users SET password = $1 WHERE id = $2`,
        [hashedPassword, user.id]
      );
      
      console.log(`✅ Reset password for ${user.username || user.email} (${user.first_name || ''} ${user.last_name || ''})`);
    }
    
    console.log("\n✅ All staff passwords have been reset!");
    console.log("You can now log in with any staff username and password 'password123'");
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
    console.log("Database connection closed");
  }
}

main();







