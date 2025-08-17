import { db } from "../db.js";
import { sql } from "drizzle-orm";

// Default permissions that will be created
const DEFAULT_PERMISSIONS = [
  // Client Management
  { name: 'view_client_contact_info', description: 'View client contact information', category: 'Client Management' },
  { name: 'edit_client_contact_info', description: 'Edit client contact information', category: 'Client Management' },
  { name: 'view_client_history', description: 'View client appointment and purchase history', category: 'Client Management' },
  { name: 'create_client', description: 'Create new client accounts', category: 'Client Management' },
  { name: 'delete_client', description: 'Delete client accounts', category: 'Client Management' },
  
  // Calendar Management
  { name: 'view_calendar', description: 'View appointment calendar', category: 'Calendar Management' },
  { name: 'edit_calendar', description: 'Create, edit, and delete appointments', category: 'Calendar Management' },
  { name: 'view_other_staff_calendar', description: 'View appointments for other staff members', category: 'Calendar Management' },
  { name: 'edit_other_staff_calendar', description: 'Edit appointments for other staff members', category: 'Calendar Management' },
  
  // Services Management
  { name: 'view_services', description: 'View available services', category: 'Services Management' },
  { name: 'edit_services', description: 'Create, edit, and delete services', category: 'Services Management' },
  { name: 'view_service_pricing', description: 'View service pricing information', category: 'Services Management' },
  { name: 'edit_service_pricing', description: 'Edit service pricing', category: 'Services Management' },
  
  // Products Management
  { name: 'view_products', description: 'View available products', category: 'Products Management' },
  { name: 'edit_products', description: 'Create, edit, and delete products', category: 'Products Management' },
  { name: 'view_product_inventory', description: 'View product inventory levels', category: 'Products Management' },
  { name: 'edit_product_inventory', description: 'Edit product inventory levels', category: 'Products Management' },
  
  // Sales and Transactions
  { name: 'view_sales', description: 'View sales transactions', category: 'Sales Management' },
  { name: 'create_sales', description: 'Create new sales transactions', category: 'Sales Management' },
  { name: 'edit_sales', description: 'Edit existing sales transactions', category: 'Sales Management' },
  { name: 'void_sales', description: 'Void or refund sales transactions', category: 'Sales Management' },
  { name: 'view_sales_reports', description: 'View sales reports and analytics', category: 'Sales Management' },
  
  // Staff Management
  { name: 'view_staff', description: 'View staff member information', category: 'Staff Management' },
  { name: 'edit_staff', description: 'Create, edit, and delete staff accounts', category: 'Staff Management' },
  { name: 'view_staff_schedules', description: 'View staff schedules', category: 'Staff Management' },
  { name: 'edit_staff_schedules', description: 'Edit staff schedules', category: 'Staff Management' },
  { name: 'view_staff_performance', description: 'View staff performance metrics', category: 'Staff Management' },
  
  // Reports and Analytics
  { name: 'view_reports', description: 'View business reports and analytics', category: 'Reports Management' },
  { name: 'export_reports', description: 'Export reports to various formats', category: 'Reports Management' },
  { name: 'view_financial_reports', description: 'View financial reports and revenue data', category: 'Reports Management' },
  { name: 'view_client_reports', description: 'View client analytics and retention reports', category: 'Reports Management' },
  
  // Settings and Configuration
  { name: 'view_settings', description: 'View application settings', category: 'Settings Management' },
  { name: 'edit_settings', description: 'Edit application settings', category: 'Settings Management' },
  { name: 'view_business_info', description: 'View business information', category: 'Settings Management' },
  { name: 'edit_business_info', description: 'Edit business information', category: 'Settings Management' },
  
  // Permissions Management
  { name: 'view_permissions', description: 'View user permissions and access levels', category: 'Permissions Management' },
  { name: 'edit_permissions', description: 'Edit user permissions and access levels', category: 'Permissions Management' },
  { name: 'view_permission_groups', description: 'View permission groups', category: 'Permissions Management' },
  { name: 'edit_permission_groups', description: 'Create and edit permission groups', category: 'Permissions Management' },
  
  // System Administration
  { name: 'view_system_logs', description: 'View system logs and activity', category: 'System Administration' },
  { name: 'manage_backups', description: 'Manage database backups', category: 'System Administration' },
  { name: 'view_system_health', description: 'View system health and performance metrics', category: 'System Administration' },
];

// Default permission groups with their assigned permissions
const DEFAULT_PERMISSION_GROUPS = [
  {
    name: 'Owner',
    description: 'Full access to all features and data',
    permissions: [
      'view_client_contact_info', 'edit_client_contact_info', 'view_client_history', 'create_client', 'delete_client',
      'view_calendar', 'edit_calendar', 'view_other_staff_calendar', 'edit_other_staff_calendar',
      'view_services', 'edit_services', 'view_service_pricing', 'edit_service_pricing',
      'view_products', 'edit_products', 'view_product_inventory', 'edit_product_inventory',
      'view_sales', 'create_sales', 'edit_sales', 'void_sales', 'view_sales_reports',
      'view_staff', 'edit_staff', 'view_staff_schedules', 'edit_staff_schedules', 'view_staff_performance',
      'view_reports', 'export_reports', 'view_financial_reports', 'view_client_reports',
      'view_settings', 'edit_settings', 'view_business_info', 'edit_business_info',
      'view_permissions', 'edit_permissions', 'view_permission_groups', 'edit_permission_groups',
      'view_system_logs', 'manage_backups', 'view_system_health'
    ]
  },
  {
    name: 'Manager',
    description: 'Management-level access with most administrative capabilities',
    permissions: [
      'view_client_contact_info', 'edit_client_contact_info', 'view_client_history', 'create_client',
      'view_calendar', 'edit_calendar', 'view_other_staff_calendar', 'edit_other_staff_calendar',
      'view_services', 'edit_services', 'view_service_pricing', 'edit_service_pricing',
      'view_products', 'edit_products', 'view_product_inventory', 'edit_product_inventory',
      'view_sales', 'create_sales', 'edit_sales', 'void_sales', 'view_sales_reports',
      'view_staff', 'view_staff_schedules', 'edit_staff_schedules', 'view_staff_performance',
      'view_reports', 'export_reports', 'view_financial_reports', 'view_client_reports',
      'view_settings', 'view_business_info', 'edit_business_info',
      'view_permissions', 'view_permission_groups'
    ]
  },
  {
    name: 'Receptionist',
    description: 'Front desk access for client management and basic operations',
    permissions: [
      'view_client_contact_info', 'edit_client_contact_info', 'view_client_history', 'create_client',
      'view_calendar', 'edit_calendar',
      'view_services', 'view_service_pricing',
      'view_products', 'view_product_inventory',
      'view_sales', 'create_sales', 'edit_sales',
      'view_reports', 'export_reports'
    ]
  },
  {
    name: 'Stylist/Therapist',
    description: 'Service provider access for appointments and client management',
    permissions: [
      'view_client_contact_info', 'view_client_history',
      'view_calendar', 'edit_calendar',
      'view_services', 'view_service_pricing',
      'view_products', 'view_product_inventory',
      'view_sales', 'create_sales',
      'view_reports'
    ]
  },
  {
    name: 'Assistant',
    description: 'Limited access for basic support tasks',
    permissions: [
      'view_client_contact_info',
      'view_calendar',
      'view_services',
      'view_products',
      'view_sales'
    ]
  }
];

async function seedPermissions() {
  try {
    console.log('Starting permission seeding...');
    
    // Create permission categories first
    const categories = [...new Set(DEFAULT_PERMISSIONS.map(p => p.category))];
    console.log(`Creating ${categories.length} permission categories...`);
    
    for (const category of categories) {
      try {
        await db.execute(sql`
          INSERT INTO permission_categories (name, description)
          VALUES (${category}, ${`Permissions related to ${category.toLowerCase()}`})
          ON CONFLICT (name) DO NOTHING
        `);
        console.log(`✓ Created category: ${category}`);
      } catch (error) {
        console.log(`Category ${category} already exists or error:`, error.message);
      }
    }
    
    // Create individual permissions
    console.log(`Creating ${DEFAULT_PERMISSIONS.length} permissions...`);
    for (const permission of DEFAULT_PERMISSIONS) {
      try {
        await db.execute(sql`
          INSERT INTO permissions (name, description, category, action, resource, is_system)
          VALUES (
            ${permission.name}, 
            ${permission.description}, 
            ${permission.category},
            ${permission.name.split('_')[0]}, -- Extract action from permission name
            ${permission.name.split('_').slice(1).join('_')}, -- Extract resource from permission name
            true
          )
          ON CONFLICT (name) DO NOTHING
        `);
        console.log(`✓ Created permission: ${permission.name}`);
      } catch (error) {
        console.log(`Permission ${permission.name} already exists or error:`, error.message);
      }
    }
    
    // Create permission groups
    console.log(`Creating ${DEFAULT_PERMISSION_GROUPS.length} permission groups...`);
    for (const group of DEFAULT_PERMISSION_GROUPS) {
      try {
        const result = await db.execute(sql`
          INSERT INTO permission_groups (name, description, is_system)
          VALUES (${group.name}, ${group.description}, true)
          ON CONFLICT (name) DO NOTHING
          RETURNING id
        `);
        
        if (result.rows.length > 0) {
          const groupId = result.rows[0].id;
          console.log(`✓ Created group: ${group.name} (ID: ${groupId})`);
          
          // Assign permissions to this group
          for (const permissionName of group.permissions) {
            try {
              await db.execute(sql`
                INSERT INTO permission_group_mappings (group_id, permission_id)
                SELECT ${groupId}, id FROM permissions WHERE name = ${permissionName}
                ON CONFLICT (group_id, permission_id) DO NOTHING
              `);
            } catch (error) {
              console.log(`Error assigning permission ${permissionName} to group ${group.name}:`, error.message);
            }
          }
          console.log(`  ✓ Assigned ${group.permissions.length} permissions to ${group.name}`);
        } else {
          console.log(`Group ${group.name} already exists`);
        }
      } catch (error) {
        console.log(`Error creating group ${group.name}:`, error.message);
      }
    }
    
    console.log('Permission seeding completed successfully!');
    
    // Summary
    const permissionsCount = await db.execute(sql`SELECT COUNT(*) as count FROM permissions`);
    const groupsCount = await db.execute(sql`SELECT COUNT(*) as count FROM permission_groups`);
    const categoriesCount = await db.execute(sql`SELECT COUNT(*) as count FROM permission_categories`);
    
    console.log('\n📊 Seeding Summary:');
    console.log(`- Permission Categories: ${categoriesCount.rows[0].count}`);
    console.log(`- Permissions: ${permissionsCount.rows[0].count}`);
    console.log(`- Permission Groups: ${groupsCount.rows[0].count}`);
    
  } catch (error) {
    console.error('Error seeding permissions:', error);
    process.exit(1);
  }
}

// Run the seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedPermissions().then(() => {
    console.log('Seeding completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
}

export { seedPermissions }; 