// Run the SQL script to fix staff visibility
const { Client } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log("Connecting to database...");
    await client.connect();
    console.log("Connected to database");

    // Read the SQL file
    console.log("Reading SQL file...");
    const sqlScript = fs.readFileSync('fix-staff-visibility.sql', 'utf8');
    
    // Execute the SQL script
    console.log("Executing SQL script...");
    await client.query(sqlScript);
    
    console.log("\n✅ SQL script executed successfully!");

    // Verify permissions were assigned
    console.log("\nVerifying permissions were assigned correctly...");
    
    const basicGroupResult = await client.query(`
      SELECT id FROM permission_groups WHERE name = 'Basic Staff'
    `);
    
    if (basicGroupResult.rows.length === 0) {
      console.log("Error: Basic Staff permission group not found!");
      return;
    }
    
    const basicGroupId = basicGroupResult.rows[0].id;
    
    // Check group permissions
    const permissionsResult = await client.query(`
      SELECT p.name
      FROM permissions p
      JOIN permission_group_mappings pgm ON p.id = pgm.permission_id
      WHERE pgm.group_id = $1
    `, [basicGroupId]);
    
    console.log(`\nPermissions in Basic Staff group (${permissionsResult.rows.length}):`);
    permissionsResult.rows.forEach(row => console.log(`- ${row.name}`));
    
    // Check user assignments
    const usersResult = await client.query(`
      SELECT u.username, u.first_name, u.last_name
      FROM users u
      JOIN user_permission_groups upg ON u.id = upg.user_id
      WHERE upg.group_id = $1
    `, [basicGroupId]);
    
    console.log(`\nUsers assigned to Basic Staff group (${usersResult.rows.length}):`);
    usersResult.rows.forEach(row => console.log(`- ${row.username} (${row.first_name} ${row.last_name})`));

    console.log("\n✅ Staff visibility fix complete!");
    console.log("Staff should now be able to see the dashboard and essential features.");
    console.log("Please try logging in again.");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
    console.log("Database connection closed");
  }
}

main();






