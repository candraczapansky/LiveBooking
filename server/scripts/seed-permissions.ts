import { IStorage } from '../storage.js';
import { PermissionsService } from '../services/permissions.js';

// Default permissions organized by category
const DEFAULT_PERMISSIONS = [
  // Client Management
  {
    name: 'view_client_contact_info',
    description: 'View client contact information',
    category: 'clients',
    action: 'view',
    resource: 'client_contact_info',
  },
  {
    name: 'edit_client_contact_info',
    description: 'Edit client contact information',
    category: 'clients',
    action: 'edit',
    resource: 'client_contact_info',
  },
  {
    name: 'view_client_notes',
    description: 'View client notes and history',
    category: 'clients',
    action: 'view',
    resource: 'client_notes',
  },
  {
    name: 'edit_client_notes',
    description: 'Add and edit client notes',
    category: 'clients',
    action: 'edit',
    resource: 'client_notes',
  },
  {
    name: 'view_client_payment_info',
    description: 'View client payment information',
    category: 'clients',
    action: 'view',
    resource: 'client_payment_info',
  },
  {
    name: 'edit_client_payment_info',
    description: 'Edit client payment information',
    category: 'clients',
    action: 'edit',
    resource: 'client_payment_info',
  },

  // Calendar Management
  {
    name: 'view_calendar',
    description: 'View appointment calendar',
    category: 'calendar',
    action: 'view',
    resource: 'calendar',
  },
  {
    name: 'edit_calendar',
    description: 'Create and edit appointments',
    category: 'calendar',
    action: 'edit',
    resource: 'calendar',
  },
  {
    name: 'delete_appointments',
    description: 'Delete appointments',
    category: 'calendar',
    action: 'delete',
    resource: 'appointments',
  },
  {
    name: 'view_other_staff_calendar',
    description: 'View other staff members\' calendars',
    category: 'calendar',
    action: 'view',
    resource: 'other_staff_calendar',
  },

  // Reports
  {
    name: 'view_sales_reports',
    description: 'View sales and revenue reports',
    category: 'reports',
    action: 'view',
    resource: 'sales_reports',
  },
  {
    name: 'view_client_reports',
    description: 'View client analytics and reports',
    category: 'reports',
    action: 'view',
    resource: 'client_reports',
  },
  {
    name: 'view_staff_reports',
    description: 'View staff performance reports',
    category: 'reports',
    action: 'view',
    resource: 'staff_reports',
  },
  {
    name: 'view_appointment_reports',
    description: 'View appointment and attendance reports',
    category: 'reports',
    action: 'view',
    resource: 'appointment_reports',
  },
  {
    name: 'export_reports',
    description: 'Export reports to CSV/PDF',
    category: 'reports',
    action: 'export',
    resource: 'reports',
  },

  // Services and Products
  {
    name: 'view_services',
    description: 'View services and pricing',
    category: 'services',
    action: 'view',
    resource: 'services',
  },
  {
    name: 'edit_services',
    description: 'Create and edit services',
    category: 'services',
    action: 'edit',
    resource: 'services',
  },
  {
    name: 'view_products',
    description: 'View products and inventory',
    category: 'products',
    action: 'view',
    resource: 'products',
  },
  {
    name: 'edit_products',
    description: 'Create and edit products',
    category: 'products',
    action: 'edit',
    resource: 'products',
  },

  // Staff Management
  {
    name: 'view_staff_info',
    description: 'View staff information',
    category: 'staff',
    action: 'view',
    resource: 'staff_info',
  },
  {
    name: 'edit_staff_info',
    description: 'Edit staff information',
    category: 'staff',
    action: 'edit',
    resource: 'staff_info',
  },
  {
    name: 'view_staff_schedules',
    description: 'View staff schedules',
    category: 'staff',
    action: 'view',
    resource: 'staff_schedules',
  },
  {
    name: 'edit_staff_schedules',
    description: 'Edit staff schedules',
    category: 'staff',
    action: 'edit',
    resource: 'staff_schedules',
  },
  {
    name: 'view_staff_earnings',
    description: 'View staff earnings and commissions',
    category: 'staff',
    action: 'view',
    resource: 'staff_earnings',
  },

  // Settings and Configuration
  {
    name: 'view_business_settings',
    description: 'View business settings',
    category: 'settings',
    action: 'view',
    resource: 'business_settings',
  },
  {
    name: 'edit_business_settings',
    description: 'Edit business settings',
    category: 'settings',
    action: 'edit',
    resource: 'business_settings',
  },
  {
    name: 'view_system_settings',
    description: 'View system configuration',
    category: 'settings',
    action: 'view',
    resource: 'system_settings',
  },
  {
    name: 'edit_system_settings',
    description: 'Edit system configuration',
    category: 'settings',
    action: 'edit',
    resource: 'system_settings',
  },

  // User Management
  {
    name: 'view_users',
    description: 'View user accounts',
    category: 'users',
    action: 'view',
    resource: 'users',
  },
  {
    name: 'create_users',
    description: 'Create new user accounts',
    category: 'users',
    action: 'create',
    resource: 'users',
  },
  {
    name: 'edit_users',
    description: 'Edit user accounts',
    category: 'users',
    action: 'edit',
    resource: 'users',
  },
  {
    name: 'delete_users',
    description: 'Delete user accounts',
    category: 'users',
    action: 'delete',
    resource: 'users',
  },

  // Permission Management
  {
    name: 'view_permissions',
    description: 'View permissions and permission groups',
    category: 'permissions',
    action: 'view',
    resource: 'permissions',
  },
  {
    name: 'view_permission_groups',
    description: 'View permission groups',
    category: 'permissions',
    action: 'view',
    resource: 'permission_groups',
  },
  {
    name: 'manage_user_permissions',
    description: 'Assign and manage user permissions',
    category: 'permissions',
    action: 'manage',
    resource: 'user_permissions',
  },

  // Marketing
  {
    name: 'view_marketing_campaigns',
    description: 'View marketing campaigns',
    category: 'marketing',
    action: 'view',
    resource: 'marketing_campaigns',
  },
  {
    name: 'create_marketing_campaigns',
    description: 'Create marketing campaigns',
    category: 'marketing',
    action: 'create',
    resource: 'marketing_campaigns',
  },
  {
    name: 'edit_marketing_campaigns',
    description: 'Edit marketing campaigns',
    category: 'marketing',
    action: 'edit',
    resource: 'marketing_campaigns',
  },

  // Financial
  {
    name: 'view_financial_reports',
    description: 'View financial reports and statements',
    category: 'financial',
    action: 'view',
    resource: 'financial_reports',
  },
  {
    name: 'process_refunds',
    description: 'Process refunds and adjustments',
    category: 'financial',
    action: 'process',
    resource: 'refunds',
  },
  {
    name: 'view_payment_history',
    description: 'View detailed payment history',
    category: 'financial',
    action: 'view',
    resource: 'payment_history',
  },
];

// Default permission groups
const DEFAULT_PERMISSION_GROUPS = [
  {
    name: 'Owner',
    description: 'Full access to all features and settings',
    isSystem: true,
    permissions: [
      'view_client_contact_info', 'edit_client_contact_info',
      'view_client_notes', 'edit_client_notes',
      'view_client_payment_info', 'edit_client_payment_info',
      'view_calendar', 'edit_calendar', 'delete_appointments', 'view_other_staff_calendar',
      'view_sales_reports', 'view_client_reports', 'view_staff_reports', 'view_appointment_reports', 'export_reports',
      'view_services', 'edit_services', 'view_products', 'edit_products',
      'view_staff_info', 'edit_staff_info', 'view_staff_schedules', 'edit_staff_schedules', 'view_staff_earnings',
      'view_business_settings', 'edit_business_settings', 'view_system_settings', 'edit_system_settings',
      'view_users', 'create_users', 'edit_users', 'delete_users',
      'view_permissions', 'view_permission_groups', 'manage_user_permissions',
      'view_marketing_campaigns', 'create_marketing_campaigns', 'edit_marketing_campaigns',
      'view_financial_reports', 'process_refunds', 'view_payment_history',
    ],
  },
  {
    name: 'Manager',
    description: 'Management access with most features',
    isSystem: true,
    permissions: [
      'view_client_contact_info', 'edit_client_contact_info',
      'view_client_notes', 'edit_client_notes',
      'view_client_payment_info', 'edit_client_payment_info',
      'view_calendar', 'edit_calendar', 'delete_appointments', 'view_other_staff_calendar',
      'view_sales_reports', 'view_client_reports', 'view_staff_reports', 'view_appointment_reports', 'export_reports',
      'view_services', 'edit_services', 'view_products', 'edit_products',
      'view_staff_info', 'edit_staff_info', 'view_staff_schedules', 'edit_staff_schedules', 'view_staff_earnings',
      'view_business_settings', 'edit_business_settings',
      'view_users', 'create_users', 'edit_users',
      'view_permissions', 'view_permission_groups', 'manage_user_permissions',
      'view_marketing_campaigns', 'create_marketing_campaigns', 'edit_marketing_campaigns',
      'view_financial_reports', 'process_refunds', 'view_payment_history',
    ],
  },
  {
    name: 'Receptionist',
    description: 'Front desk access for client management and appointments',
    isSystem: true,
    permissions: [
      'view_client_contact_info', 'edit_client_contact_info',
      'view_client_notes', 'edit_client_notes',
      'view_client_payment_info', 'edit_client_payment_info',
      'view_calendar', 'edit_calendar',
      'view_sales_reports', 'view_client_reports', 'view_appointment_reports',
      'view_services', 'view_products',
      'view_staff_info', 'view_staff_schedules',
      'view_business_settings',
      'view_users', 'create_users',
    ],
  },
  {
    name: 'Stylist/Therapist',
    description: 'Service provider access for appointments and client management',
    isSystem: true,
    permissions: [
      'view_client_contact_info',
      'view_client_notes', 'edit_client_notes',
      'view_calendar', 'edit_calendar',
      'view_sales_reports', 'view_client_reports',
      'view_services', 'view_products',
      'view_staff_info', 'view_staff_schedules', 'view_staff_earnings',
    ],
  },
  {
    name: 'Assistant',
    description: 'Limited access for support tasks',
    isSystem: true,
    permissions: [
      'view_client_contact_info',
      'view_client_notes',
      'view_calendar',
      'view_sales_reports',
      'view_services', 'view_products',
      'view_staff_info',
    ],
  },
];

export async function seedPermissions(storage: IStorage) {
  console.log('🌱 Seeding permissions and permission groups...');
  
  const permissionsService = new PermissionsService(storage);
  
  try {
    // Create permissions
    console.log('Creating permissions...');
    const createdPermissions: { [key: string]: number } = {};
    
    for (const permission of DEFAULT_PERMISSIONS) {
      const existingPermission = await (storage as any).getPermissionByName?.(permission.name) ?? undefined;
      if (!existingPermission) {
        const created = await storage.createPermission({
          name: permission.name,
          description: permission.description,
          category: permission.category,
          action: permission.action,
          resource: permission.resource,
          isSystem: true,
        });
        createdPermissions[permission.name] = created.id;
        console.log(`✅ Created permission: ${permission.name}`);
      } else {
        createdPermissions[permission.name] = existingPermission.id;
        console.log(`ℹ️  Permission already exists: ${permission.name}`);
      }
    }
    
    // Create permission groups
    console.log('\nCreating permission groups...');
    for (const group of DEFAULT_PERMISSION_GROUPS) {
      const existingGroup = await (storage as any).getPermissionGroupByName?.(group.name) ?? undefined;
      if (!existingGroup) {
        const createdGroup = await permissionsService.createPermissionGroup({
          name: group.name,
          description: group.description,
          permissionIds: group.permissions.map(p => createdPermissions[p]).filter(Boolean),
          createdBy: 1, // Assuming admin user ID is 1
        });
        console.log(`✅ Created permission group: ${group.name}`);
      } else {
        console.log(`ℹ️  Permission group already exists: ${group.name}`);
      }
    }
    
    console.log('\n🎉 Permission seeding completed successfully!');
    
    // Print summary
    const totalPermissions = await storage.getAllPermissions();
    const totalGroups = await storage.getAllPermissionGroups();
    
    console.log(`\n📊 Summary:`);
    console.log(`- Total permissions: ${totalPermissions.length}`);
    console.log(`- Total permission groups: ${totalGroups.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding permissions:', error);
    throw error;
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  // This would be called from a script that sets up the storage
  console.log('This script should be run through the main application');
} 