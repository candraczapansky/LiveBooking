import { DatabaseStorage } from './server/storage.ts';

async function seedPermissions() {
  console.log('🌱 Seeding permissions system...');

  try {
    const storage = new DatabaseStorage();
    await storage.initializeConnection();

    // 1. Create permissions
    console.log('📝 Creating permissions...');
    
    const permissionData = [
      // Client Management
      { name: 'view_clients', description: 'View client information', category: 'clients', action: 'read', resource: 'client_contact_info' },
      { name: 'create_clients', description: 'Create new clients', category: 'clients', action: 'create', resource: 'client_contact_info' },
      { name: 'edit_clients', description: 'Edit client information', category: 'clients', action: 'update', resource: 'client_contact_info' },
      { name: 'delete_clients', description: 'Delete clients', category: 'clients', action: 'delete', resource: 'client_contact_info' },
      
      // Appointment Management
      { name: 'view_appointments', description: 'View appointments', category: 'appointments', action: 'read', resource: 'calendar' },
      { name: 'create_appointments', description: 'Create appointments', category: 'appointments', action: 'create', resource: 'calendar' },
      { name: 'edit_appointments', description: 'Edit appointments', category: 'appointments', action: 'update', resource: 'calendar' },
      { name: 'cancel_appointments', description: 'Cancel appointments', category: 'appointments', action: 'delete', resource: 'calendar' },
      
      // Staff Management
      { name: 'view_staff', description: 'View staff information', category: 'staff', action: 'read', resource: 'staff_management' },
      { name: 'create_staff', description: 'Create new staff members', category: 'staff', action: 'create', resource: 'staff_management' },
      { name: 'edit_staff', description: 'Edit staff information', category: 'staff', action: 'update', resource: 'staff_management' },
      { name: 'delete_staff', description: 'Delete staff members', category: 'staff', action: 'delete', resource: 'staff_management' },
      
      // Services Management
      { name: 'view_services', description: 'View services', category: 'services', action: 'read', resource: 'service_management' },
      { name: 'create_services', description: 'Create new services', category: 'services', action: 'create', resource: 'service_management' },
      { name: 'edit_services', description: 'Edit services', category: 'services', action: 'update', resource: 'service_management' },
      { name: 'delete_services', description: 'Delete services', category: 'services', action: 'delete', resource: 'service_management' },
      
      // Reports
      { name: 'view_reports', description: 'View reports', category: 'reports', action: 'read', resource: 'reports' },
      { name: 'export_reports', description: 'Export reports', category: 'reports', action: 'export', resource: 'reports' },
      
      // Settings
      { name: 'view_settings', description: 'View system settings', category: 'settings', action: 'read', resource: 'system_settings' },
      { name: 'edit_settings', description: 'Edit system settings', category: 'settings', action: 'update', resource: 'system_settings' },
      
      // Permissions Management
      { name: 'view_permissions', description: 'View permissions', category: 'permissions', action: 'read', resource: 'permission_management' },
      { name: 'manage_permissions', description: 'Manage permissions and groups', category: 'permissions', action: 'manage', resource: 'permission_management' },
      
      // Financial
      { name: 'view_payments', description: 'View payment information', category: 'financial', action: 'read', resource: 'payment_management' },
      { name: 'process_payments', description: 'Process payments', category: 'financial', action: 'create', resource: 'payment_management' },
      { name: 'view_payroll', description: 'View payroll information', category: 'financial', action: 'read', resource: 'payroll_management' },
      
      // Marketing
      { name: 'view_marketing', description: 'View marketing campaigns', category: 'marketing', action: 'read', resource: 'marketing_management' },
      { name: 'create_marketing', description: 'Create marketing campaigns', category: 'marketing', action: 'create', resource: 'marketing_management' },
      { name: 'edit_marketing', description: 'Edit marketing campaigns', category: 'marketing', action: 'update', resource: 'marketing_management' },
    ];

    const createdPermissions = [];
    for (const perm of permissionData) {
      const created = await storage.createPermission({
        ...perm,
        isActive: true,
        isSystem: true
      });
      createdPermissions.push(created);
      console.log(`✅ Created permission: ${perm.name}`);
    }

    // 2. Create permission groups
    console.log('👥 Creating permission groups...');
    
    const groupData = [
      {
        name: 'Administrator',
        description: 'Full system access with all permissions',
        isSystem: true,
        isActive: true
      },
      {
        name: 'Manager',
        description: 'Management access with most permissions except system settings',
        isSystem: true,
        isActive: true
      },
      {
        name: 'Stylist',
        description: 'Standard stylist access for appointments and client management',
        isSystem: true,
        isActive: true
      },
      {
        name: 'Receptionist',
        description: 'Front desk access for appointments and basic client management',
        isSystem: true,
        isActive: true
      },
      {
        name: 'Assistant',
        description: 'Limited access for basic tasks and viewing',
        isSystem: true,
        isActive: true
      }
    ];

    const createdGroups = [];
    for (const group of groupData) {
      const created = await storage.createPermissionGroup({
        ...group,
        createdBy: 1 // Admin user
      });
      createdGroups.push(created);
      console.log(`✅ Created permission group: ${group.name}`);
    }

    // 3. Map permissions to groups
    console.log('🔗 Mapping permissions to groups...');
    
    // Administrator - all permissions
    for (const perm of createdPermissions) {
      await storage.assignPermissionsToGroup(createdGroups[0].id, [perm.id]);
    }
    console.log('✅ Mapped all permissions to Administrator group');

    // Manager - most permissions except system settings
    const managerPermissions = createdPermissions.filter(p => 
      !p.name.includes('edit_settings') && 
      !p.name.includes('manage_permissions')
    );
    for (const perm of managerPermissions) {
      await storage.assignPermissionsToGroup(createdGroups[1].id, [perm.id]);
    }
    console.log('✅ Mapped manager permissions');

    // Stylist - appointment and client management
    const stylistPermissions = createdPermissions.filter(p => 
      p.category === 'appointments' || 
      p.category === 'clients' ||
      p.name === 'view_services' ||
      p.name === 'view_payments' ||
      p.name === 'process_payments'
    );
    for (const perm of stylistPermissions) {
      await storage.assignPermissionsToGroup(createdGroups[2].id, [perm.id]);
    }
    console.log('✅ Mapped stylist permissions');

    // Receptionist - basic appointment and client access
    const receptionistPermissions = createdPermissions.filter(p => 
      p.name === 'view_clients' ||
      p.name === 'create_clients' ||
      p.name === 'edit_clients' ||
      p.name === 'view_appointments' ||
      p.name === 'create_appointments' ||
      p.name === 'edit_appointments' ||
      p.name === 'view_services' ||
      p.name === 'view_payments' ||
      p.name === 'process_payments'
    );
    for (const perm of receptionistPermissions) {
      await storage.assignPermissionsToGroup(createdGroups[3].id, [perm.id]);
    }
    console.log('✅ Mapped receptionist permissions');

    // Assistant - view-only access
    const assistantPermissions = createdPermissions.filter(p => 
      p.action === 'read' && 
      (p.category === 'clients' || p.category === 'appointments' || p.category === 'services')
    );
    for (const perm of assistantPermissions) {
      await storage.assignPermissionsToGroup(createdGroups[4].id, [perm.id]);
    }
    console.log('✅ Mapped assistant permissions');

    // 4. Assign Administrator group to admin user
    console.log('👤 Assigning Administrator group to admin user...');
    await storage.assignPermissionGroupToUser(1, createdGroups[0].id);
    console.log('✅ Assigned Administrator group to admin user');

    console.log('🎉 Permissions system seeded successfully!');
    console.log(`📊 Created ${createdPermissions.length} permissions`);
    console.log(`👥 Created ${createdGroups.length} permission groups`);
    console.log('🔗 Mapped permissions to groups');

  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
  }
}

seedPermissions(); 