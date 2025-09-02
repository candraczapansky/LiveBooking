// Script to grant basic permissions to all staff users
const { Client } = require('pg');
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

    // Step 1: Create a basic staff permission group if it doesn't exist
    console.log("Creating/Finding 'Basic Staff' permission group...");
    const basicGroupResult = await client.query(`
      SELECT * FROM permission_groups WHERE name = 'Basic Staff'
    `);

    let basicGroupId;
    if (basicGroupResult.rows.length === 0) {
      console.log("Creating 'Basic Staff' permission group...");
      const newGroup = await client.query(`
        INSERT INTO permission_groups (name, description, is_active, is_system)
        VALUES ('Basic Staff', 'Basic permissions for staff members', true, false)
        RETURNING id
      `);
      basicGroupId = newGroup.rows[0].id;
    } else {
      basicGroupId = basicGroupResult.rows[0].id;
      console.log(`Found existing 'Basic Staff' group with ID ${basicGroupId}`);
    }

    // Step 2: Get all essential permissions
    console.log("Finding essential permissions...");
    const essentialPermissionNames = [
      'view_dashboard',
      'view_appointments', 
      'create_appointments', 
      'update_appointments',
      'view_clients', 
      'view_schedules',
      'view_staff',
      'view_services'
    ];

    const essentialPermissions = await client.query(`
      SELECT id, name FROM permissions
      WHERE name = ANY($1)
    `, [essentialPermissionNames]);

    console.log(`Found ${essentialPermissions.rows.length} essential permissions`);

    // Step 3: Assign these permissions to the Basic Staff group
    console.log("Assigning permissions to Basic Staff group...");
    
    // First clear existing mappings
    await client.query(`
      DELETE FROM permission_group_mappings
      WHERE group_id = $1
    `, [basicGroupId]);
    
    // Add new mappings
    for (const permission of essentialPermissions.rows) {
      await client.query(`
        INSERT INTO permission_group_mappings (group_id, permission_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [basicGroupId, permission.id]);
      console.log(`Added permission '${permission.name}' to Basic Staff group`);
    }

    // Step 4: Assign all staff users to this permission group
    console.log("Assigning all staff users to Basic Staff group...");
    const staffUsers = await client.query(`
      SELECT u.id, u.username FROM users u
      JOIN staff s ON s.user_id = u.id
    `);

    for (const user of staffUsers.rows) {
      await client.query(`
        INSERT INTO user_permission_groups (user_id, group_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [user.id, basicGroupId]);
      console.log(`Assigned user ${user.username} (ID: ${user.id}) to Basic Staff group`);
    }

    console.log("\n✅ All staff users now have basic permissions!");
    console.log("Staff should now be able to see the dashboard and essential features.");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
    console.log("Database connection closed");
  }
}

main();






