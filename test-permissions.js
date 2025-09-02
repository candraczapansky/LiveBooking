// Test script to create permission groups and assign to users
import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting permission system test...');

  // Define test permission group names
  const groupNames = {
    ADMIN: 'Admin',
    FULL_STAFF: 'Full Staff',
    BASIC_STAFF: 'Basic Staff',
    RECEPTION: 'Reception',
    REPORTS_ONLY: 'Reports Only',
  };

  try {
    // Get all permissions for reference
    const allPermissions = await prisma.permission.findMany();
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
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to create or update a permission group
async function createOrUpdateGroup(name, description, permissionIds) {
  // Check if the group exists
  let group = await prisma.permissionGroup.findFirst({
    where: { name }
  });
  
  if (group) {
    // Update the existing group
    console.log(`Updating permission group: ${name}`);
    group = await prisma.permissionGroup.update({
      where: { id: group.id },
      data: { description, isActive: true }
    });
    
    // Remove existing mappings
    await prisma.permissionGroupMapping.deleteMany({
      where: { groupId: group.id }
    });
  } else {
    // Create a new group
    console.log(`Creating permission group: ${name}`);
    group = await prisma.permissionGroup.create({
      data: {
        name,
        description,
        isActive: true,
        isSystem: false,
      }
    });
  }
  
  // Add new permission mappings
  for (const permissionId of permissionIds) {
    try {
      await prisma.permissionGroupMapping.create({
        data: {
          groupId: group.id,
          permissionId
        }
      });
    } catch (error) {
      // Ignore duplicate mappings
      if (!error.message.includes('Unique constraint')) {
        console.error(`Error adding permission ${permissionId} to group ${name}:`, error);
      }
    }
  }
  
  return group;
}

// Helper function to get or create a staff user
async function getOrCreateStaffUser(username, email, firstName, lastName, password) {
  let user = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] }
  });
  
  if (!user) {
    // Hash the password (replace with your actual password hashing logic)
    const hashedPassword = createHash('sha256')
      .update(password)
      .digest('hex');
    
    console.log(`Creating staff user: ${username}`);
    user = await prisma.user.create({
      data: {
        username,
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role: 'staff',
        isActive: true,
      }
    });
  } else {
    console.log(`Found existing user: ${username}`);
  }
  
  return user;
}

// Helper function to assign a user to a permission group
async function assignUserToGroup(userId, groupId) {
  // Check if assignment already exists
  const existingAssignment = await prisma.userPermissionGroup.findFirst({
    where: {
      userId,
      groupId
    }
  });
  
  if (!existingAssignment) {
    console.log(`Assigning user ${userId} to group ${groupId}`);
    await prisma.userPermissionGroup.create({
      data: {
        userId,
        groupId
      }
    });
  } else {
    console.log(`User ${userId} already assigned to group ${groupId}`);
  }
}

main()
  .then(() => console.log('Permission test script completed successfully'))
  .catch(e => console.error('Error running permission test script:', e));