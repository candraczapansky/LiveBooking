// Standalone script to seed permissions without dependencies on server code
import { createClient } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';

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
const neonClient = createClient({ connectionString: databaseUrl });
const db = drizzle(neonClient);

// Define tables structure (simplified from schema)
const tables = {
  permissions: "permissions",
  permissionGroups: "permission_groups", 
  permissionGroupMappings: "permission_group_mappings",
  users: "users",
  userPermissionGroups: "user_permission_groups"
};

// Define test permission group names
const groupNames = {
  ADMIN: 'Admin',
  FULL_STAFF: 'Full Staff',
  BASIC_STAFF: 'Basic Staff',
  RECEPTION: 'Reception',
  REPORTS_ONLY: 'Reports Only',
};

async function main() {
  console.log('Starting permission system test...');

  try {
    // Create base permissions if they don't exist
    await createBasePermissions();
    
    // Get all permissions for reference
    const allPermissions = await db.execute(sql`SELECT * FROM ${sql.identifier(tables.permissions)}`);
    console.log(`Found ${allPermissions.rowCount} total permissions`);
    
    // Create permission groups with different access levels
    const adminGroup = await createOrUpdateGroup(
      groupNames.ADMIN, 
      'Full access to all features', 
      allPermissions.rows.map(p => p.id)
    );
    
    // Full staff - access to everything except permissions and settings
    const fullStaffPermissions = allPermissions.rows
      .filter(p => !p.name.includes('view_permissions') && 
                  !p.name.includes('manage_permissions') && 
                  !p.name.includes('manage_settings'))
      .map(p => p.id);
    const fullStaffGroup = await createOrUpdateGroup(
      groupNames.FULL_STAFF, 
      'Access to all features except permissions management', 
      fullStaffPermissions
    );
    
    // Basic staff - only basic features
    const basicPermissionNames = [
      'view_dashboard', 'view_appointments', 'create_appointments', 'update_appointments',
      'view_clients', 'view_schedules', 'view_services', 'view_phone'
    ];
    const basicStaffPermissions = allPermissions.rows
      .filter(p => basicPermissionNames.includes(p.name))
      .map(p => p.id);
    const basicStaffGroup = await createOrUpdateGroup(
      groupNames.BASIC_STAFF, 
      'Access to basic features only', 
      basicStaffPermissions
    );
    
    // Reception - focus on appointments and clients
    const receptionPermissionNames = [
      'view_dashboard', 'view_appointments', 'create_appointments', 'update_appointments',
      'view_clients', 'create_clients', 'update_clients', 'view_forms', 'view_documents'
    ];
    const receptionPermissions = allPermissions.rows
      .filter(p => receptionPermissionNames.includes(p.name))
      .map(p => p.id);
    const receptionGroup = await createOrUpdateGroup(
      groupNames.RECEPTION, 
      'Access for reception staff', 
      receptionPermissions
    );
    
    // Reports only - only view reports and dashboard
    const reportsOnlyPermissionNames = ['view_dashboard', 'view_reports', 'view_payroll'];
    const reportsOnlyPermissions = allPermissions.rows
      .filter(p => reportsOnlyPermissionNames.includes(p.name))
      .map(p => p.id);
    const reportsOnlyGroup = await createOrUpdateGroup(
      groupNames.REPORTS_ONLY, 
      'Access to reports only', 
      reportsOnlyPermissions
    );
    
    console.log('Created permission groups successfully');

    // Get or create test staff users
    const staffUsers = await Promise.all([
      getOrCreateStaffUser('fullstaff', 'fullstaff@example.com', 'Full', 'Staff', 'password'),
      getOrCreateStaffUser('basicstaff', 'basicstaff@example.com', 'Basic', 'Staff', 'password'),
      getOrCreateStaffUser('reception', 'reception@example.com', 'Reception', 'Staff', 'password'),
      getOrCreateStaffUser('reports', 'reports@example.com', 'Reports', 'User', 'password'),
    ]);
    
    console.log(`Created or found ${staffUsers.length} staff users`);
    
    // Assign permission groups to users
    await assignUserToGroup(staffUsers[0].id, fullStaffGroup.id);
    await assignUserToGroup(staffUsers[1].id, basicStaffGroup.id);
    await assignUserToGroup(staffUsers[2].id, receptionGroup.id);
    await assignUserToGroup(staffUsers[3].id, reportsOnlyGroup.id);
    
    console.log('Permission groups assigned to test users');
    
    // Print user login details
    console.log('\nTest User Login Credentials:');
    staffUsers.forEach(user => {
      console.log(`${user.email} / password`);
    });
    
  } catch (error) {
    console.error('Error in test script:', error);
  } finally {
    // Close the database connection
    neonClient.end();
  }
}

async function createBasePermissions() {
  // Define all permission categories and their permissions
  const permissionDefinitions = [
    { name: 'view_dashboard', category: 'dashboard', action: 'view', resource: 'dashboard', description: 'View dashboard' },
    { name: 'view_appointments', category: 'appointments', action: 'view', resource: 'appointments', description: 'View appointments' },
    { name: 'create_appointments', category: 'appointments', action: 'create', resource: 'appointments', description: 'Create appointments' },
    { name: 'update_appointments', category: 'appointments', action: 'update', resource: 'appointments', description: 'Update appointments' },
    { name: 'delete_appointments', category: 'appointments', action: 'delete', resource: 'appointments', description: 'Delete appointments' },
    { name: 'view_clients', category: 'clients', action: 'view', resource: 'clients', description: 'View clients' },
    { name: 'create_clients', category: 'clients', action: 'create', resource: 'clients', description: 'Create clients' },
    { name: 'update_clients', category: 'clients', action: 'update', resource: 'clients', description: 'Update clients' },
    { name: 'delete_clients', category: 'clients', action: 'delete', resource: 'clients', description: 'Delete clients' },
    { name: 'view_staff', category: 'staff', action: 'view', resource: 'staff', description: 'View staff' },
    { name: 'create_staff', category: 'staff', action: 'create', resource: 'staff', description: 'Create staff' },
    { name: 'update_staff', category: 'staff', action: 'update', resource: 'staff', description: 'Update staff' },
    { name: 'delete_staff', category: 'staff', action: 'delete', resource: 'staff', description: 'Delete staff' },
    { name: 'view_services', category: 'services', action: 'view', resource: 'services', description: 'View services' },
    { name: 'create_services', category: 'services', action: 'create', resource: 'services', description: 'Create services' },
    { name: 'update_services', category: 'services', action: 'update', resource: 'services', description: 'Update services' },
    { name: 'delete_services', category: 'services', action: 'delete', resource: 'services', description: 'Delete services' },
    { name: 'view_schedules', category: 'schedules', action: 'view', resource: 'schedules', description: 'View schedules' },
    { name: 'create_schedules', category: 'schedules', action: 'create', resource: 'schedules', description: 'Create schedules' },
    { name: 'update_schedules', category: 'schedules', action: 'update', resource: 'schedules', description: 'Update schedules' },
    { name: 'delete_schedules', category: 'schedules', action: 'delete', resource: 'schedules', description: 'Delete schedules' },
    { name: 'view_reports', category: 'reports', action: 'view', resource: 'reports', description: 'View reports' },
    { name: 'view_payroll', category: 'reports', action: 'view', resource: 'payroll', description: 'View payroll' },
    { name: 'view_retail', category: 'retail', action: 'view', resource: 'retail', description: 'View retail' },
    { name: 'view_pos', category: 'retail', action: 'view', resource: 'pos', description: 'View POS' },
    { name: 'view_products', category: 'retail', action: 'view', resource: 'products', description: 'View products' },
    { name: 'view_gift_certificates', category: 'retail', action: 'view', resource: 'gift_certificates', description: 'View gift certificates' },
    { name: 'view_communications', category: 'communications', action: 'view', resource: 'communications', description: 'View communications' },
    { name: 'view_automations', category: 'communications', action: 'view', resource: 'automations', description: 'View automations' },
    { name: 'view_marketing', category: 'communications', action: 'view', resource: 'marketing', description: 'View marketing' },
    { name: 'view_ai_messaging', category: 'communications', action: 'view', resource: 'ai_messaging', description: 'View AI messaging' },
    { name: 'view_sms_inbox', category: 'communications', action: 'view', resource: 'sms_inbox', description: 'View SMS inbox' },
    { name: 'view_phone', category: 'communications', action: 'view', resource: 'phone', description: 'View phone' },
    { name: 'view_business_settings', category: 'settings', action: 'view', resource: 'business_settings', description: 'View business settings' },
    { name: 'view_locations', category: 'settings', action: 'view', resource: 'locations', description: 'View locations' },
    { name: 'view_settings', category: 'settings', action: 'view', resource: 'settings', description: 'View settings' },
    { name: 'view_permissions', category: 'settings', action: 'view', resource: 'permissions', description: 'View permissions' },
    { name: 'view_forms', category: 'clients', action: 'view', resource: 'forms', description: 'View forms' },
    { name: 'view_documents', category: 'clients', action: 'view', resource: 'documents', description: 'View documents' },
    { name: 'view_note_templates', category: 'clients', action: 'view', resource: 'note_templates', description: 'View note templates' },
    { name: 'view_client_booking', category: 'clients', action: 'view', resource: 'client_booking', description: 'View client booking' },
    { name: 'view_memberships', category: 'clients', action: 'view', resource: 'memberships', description: 'View memberships' },
    { name: 'view_classes', category: 'services', action: 'view', resource: 'classes', description: 'View classes' },
    { name: 'view_devices', category: 'services', action: 'view', resource: 'devices', description: 'View devices' },
    { name: 'view_rooms', category: 'services', action: 'view', resource: 'rooms', description: 'View rooms' },
    { name: 'view_time_clock', category: 'staff', action: 'view', resource: 'time_clock', description: 'View time clock' },
  ];

  // Insert all permissions
  for (const permDef of permissionDefinitions) {
    try {
      // Check if permission already exists
      const existingPerm = await db.execute(
        `SELECT * FROM "${tables.permissions}" WHERE name = $1`, [permDef.name]
      );
      
      if (existingPerm.rowCount === 0) {
        await db.execute(
          sql`INSERT INTO ${sql.identifier(tables.permissions)} 
              (name, description, category, action, resource, is_active, is_system) 
              VALUES (${permDef.name}, ${permDef.description}, ${permDef.category}, 
                     ${permDef.action}, ${permDef.resource}, true, true)`
        );
        console.log(`Created permission: ${permDef.name}`);
      }
    } catch (error) {
      console.error(`Error creating permission ${permDef.name}:`, error);
    }
  }
}

// Helper function to create or update a permission group
async function createOrUpdateGroup(name, description, permissionIds) {
  // Check if the group exists
  const existingGroup = await db.execute(
    sql`SELECT * FROM ${sql.identifier(tables.permissionGroups)} WHERE name = ${name}`
  );
  
  let groupId;
  
  if (existingGroup.rowCount > 0) {
    // Update existing group
    groupId = existingGroup.rows[0].id;
    console.log(`Updating permission group: ${name}`);
    
    await db.execute(
      sql`UPDATE ${sql.identifier(tables.permissionGroups)} 
          SET description = ${description}, is_active = true, updated_at = NOW()
          WHERE id = ${groupId}`
    );
    
    // Remove existing mappings
    await db.execute(
      sql`DELETE FROM ${sql.identifier(tables.permissionGroupMappings)} 
          WHERE group_id = ${groupId}`
    );
  } else {
    // Create new group
    console.log(`Creating permission group: ${name}`);
    const result = await db.execute(
      sql`INSERT INTO ${sql.identifier(tables.permissionGroups)} 
          (name, description, is_active, is_system)
          VALUES (${name}, ${description}, true, false)
          RETURNING id`
    );
    groupId = result.rows[0].id;
  }
  
  // Add permission mappings
  for (const permissionId of permissionIds) {
    try {
      await db.execute(
        sql`INSERT INTO ${sql.identifier(tables.permissionGroupMappings)} 
            (group_id, permission_id)
            VALUES (${groupId}, ${permissionId})
            ON CONFLICT DO NOTHING`
      );
    } catch (error) {
      console.error(`Error adding permission ${permissionId} to group ${name}:`, error);
    }
  }
  
  const groupResult = await db.execute(
    sql`SELECT * FROM ${sql.identifier(tables.permissionGroups)} WHERE id = ${groupId}`
  );
  return groupResult.rows[0];
}

// Helper function to get or create a staff user
async function getOrCreateStaffUser(username, email, firstName, lastName, password) {
  // Check if user exists
  const existingUser = await db.execute(
    sql`SELECT * FROM ${sql.identifier(tables.users)} WHERE username = ${username}`
  );
  
  if (existingUser.rowCount === 0) {
    // Hash the password with SHA-256
    const hashedPassword = crypto.createHash('sha256')
      .update(password)
      .digest('hex');
    
    console.log(`Creating staff user: ${username}`);
    const result = await db.execute(
      sql`INSERT INTO ${sql.identifier(tables.users)} 
          (username, email, first_name, last_name, password, role) 
          VALUES (${username}, ${email}, ${firstName}, ${lastName}, ${hashedPassword}, 'staff')
          RETURNING *`
    );
    return result.rows[0];
  } else {
    console.log(`Found existing user: ${username}`);
    return existingUser.rows[0];
  }
}

// Helper function to assign a user to a permission group
async function assignUserToGroup(userId, groupId) {
  // Check if assignment already exists
  const existingAssignment = await db.execute(
    sql`SELECT * FROM ${sql.identifier(tables.userPermissionGroups)} 
        WHERE user_id = ${userId} AND group_id = ${groupId}`
  );
  
  if (existingAssignment.rowCount === 0) {
    console.log(`Assigning user ${userId} to group ${groupId}`);
    await db.execute(
      sql`INSERT INTO ${sql.identifier(tables.userPermissionGroups)} 
          (user_id, group_id) 
          VALUES (${userId}, ${groupId})`
    );
  } else {
    console.log(`User ${userId} already assigned to group ${groupId}`);
  }
}

main()
  .then(() => console.log('Permission test script completed successfully'))
  .catch(e => console.error('Error running permission test script:', e));
