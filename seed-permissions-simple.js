import { db } from './server/db.js';
import {
  permissions,
  permissionGroups,
  permissionGroupMappings,
  users,
  userPermissionGroups
} from './shared/schema.js';
import { eq, sql } from 'drizzle-orm';
import { createHash } from 'crypto';

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
    const allPermissions = await db.select().from(permissions);
    console.log(`Found ${allPermissions.length} total permissions`);

    // Create permission groups with different access levels
    const adminGroup = await createOrUpdateGroup(groupNames.ADMIN, 'Full access to all features', allPermissions.map(p => p.id));
    
    // Full staff - access to everything except permissions and settings
    const fullStaffPermissions = allPermissions
      .filter(p => !p.name.includes('view_permissions') && 
                  !p.name.includes('manage_permissions') && 
                  !p.name.includes('manage_settings'))
      .map(p => p.id);
    const fullStaffGroup = await createOrUpdateGroup(groupNames.FULL_STAFF, 'Access to all features except permissions management', fullStaffPermissions);
    
    // Basic staff - only basic features
    const basicPermissionNames = [
      'view_dashboard', 'view_appointments', 'create_appointments', 'update_appointments',
      'view_clients', 'view_schedules', 'view_services', 'view_phone'
    ];
    const basicStaffPermissions = allPermissions
      .filter(p => basicPermissionNames.includes(p.name))
      .map(p => p.id);
    const basicStaffGroup = await createOrUpdateGroup(groupNames.BASIC_STAFF, 'Access to basic features only', basicStaffPermissions);
    
    // Reception - focus on appointments and clients
    const receptionPermissionNames = [
      'view_dashboard', 'view_appointments', 'create_appointments', 'update_appointments',
      'view_clients', 'create_clients', 'update_clients', 'view_forms', 'view_documents'
    ];
    const receptionPermissions = allPermissions
      .filter(p => receptionPermissionNames.includes(p.name))
      .map(p => p.id);
    const receptionGroup = await createOrUpdateGroup(groupNames.RECEPTION, 'Access for reception staff', receptionPermissions);
    
    // Reports only - only view reports and dashboard
    const reportsOnlyPermissionNames = ['view_dashboard', 'view_reports', 'view_payroll'];
    const reportsOnlyPermissions = allPermissions
      .filter(p => reportsOnlyPermissionNames.includes(p.name))
      .map(p => p.id);
    const reportsOnlyGroup = await createOrUpdateGroup(groupNames.REPORTS_ONLY, 'Access to reports only', reportsOnlyPermissions);
    
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
      const existingPerm = await db.select()
        .from(permissions)
        .where(eq(permissions.name, permDef.name));
      
      if (existingPerm.length === 0) {
        await db.insert(permissions).values({
          name: permDef.name,
          description: permDef.description,
          category: permDef.category,
          action: permDef.action,
          resource: permDef.resource,
          isActive: true,
          isSystem: true,
        });
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
  let group = await db.select().from(permissionGroups).where(eq(permissionGroups.name, name));
  
  if (group.length > 0) {
    // Update the existing group
    console.log(`Updating permission group: ${name}`);
    const [updatedGroup] = await db.update(permissionGroups)
      .set({ 
        description, 
        isActive: true,
        updatedAt: new Date()
      })
      .where(eq(permissionGroups.id, group[0].id))
      .returning();
    
    // Remove existing mappings
    await db.delete(permissionGroupMappings)
      .where(eq(permissionGroupMappings.groupId, updatedGroup.id));
    
    group = [updatedGroup];
  } else {
    // Create a new group
    console.log(`Creating permission group: ${name}`);
    group = await db.insert(permissionGroups)
      .values({
        name,
        description,
        isActive: true,
        isSystem: false,
      })
      .returning();
  }
  
  // Add new permission mappings
  for (const permissionId of permissionIds) {
    try {
      await db.insert(permissionGroupMappings)
        .values({
          groupId: group[0].id,
          permissionId
        })
        .onConflictDoNothing();
    } catch (error) {
      console.error(`Error adding permission ${permissionId} to group ${name}:`, error);
    }
  }
  
  return group[0];
}

// Helper function to get or create a staff user
async function getOrCreateStaffUser(username, email, firstName, lastName, password) {
  // Check if user exists
  let user = await db.select().from(users).where(eq(users.username, username));
  
  if (user.length === 0) {
    // Hash the password
    const hashedPassword = createHash('sha256')
      .update(password)
      .digest('hex');
    
    console.log(`Creating staff user: ${username}`);
    user = await db.insert(users)
      .values({
        username,
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role: 'staff',
      })
      .returning();
  } else {
    console.log(`Found existing user: ${username}`);
  }
  
  return user[0];
}

// Helper function to assign a user to a permission group
async function assignUserToGroup(userId, groupId) {
  // Check if assignment already exists
  const existing = await db.select()
    .from(userPermissionGroups)
    .where(eq(userPermissionGroups.userId, userId))
    .where(eq(userPermissionGroups.groupId, groupId));
  
  if (existing.length === 0) {
    console.log(`Assigning user ${userId} to group ${groupId}`);
    await db.insert(userPermissionGroups)
      .values({
        userId,
        groupId
      });
  } else {
    console.log(`User ${userId} already assigned to group ${groupId}`);
  }
}

main()
  .then(() => console.log('Permission test script completed successfully'))
  .catch(e => console.error('Error running permission test script:', e));






