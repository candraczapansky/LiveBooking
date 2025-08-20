import { db } from "../db";
import { sql } from "drizzle-orm";

// Default permissions that will be created
const DEFAULT_PERMISSIONS = [
  // Client Management
  { name: 'view_client_contact_info', description: 'View client contact information', category: 'Client Management' },
  { name: 'edit_client_contact_info', description: 'Edit client contact information', category: 'Client Management' },
  { name: 'view_client_history', description: 'View client appointment and service history', category: 'Client Management' },
  { name: 'view_client_notes', description: 'View client notes and comments', category: 'Client Management' },
  { name: 'edit_client_notes', description: 'Edit client notes and comments', category: 'Client Management' },
  
  // Calendar Management
  { name: 'view_calendar', description: 'View appointment calendar', category: 'Calendar Management' },
  { name: 'edit_calendar', description: 'Create, edit, and cancel appointments', category: 'Calendar Management' },
  { name: 'view_staff_schedule', description: 'View staff schedules', category: 'Calendar Management' },
  { name: 'edit_staff_schedule', description: 'Edit staff schedules', category: 'Calendar Management' },
  
  // Services and Products
  { name: 'view_services', description: 'View available services', category: 'Services & Products' },
  { name: 'edit_services', description: 'Create and edit services', category: 'Services & Products' },
  { name: 'view_products', description: 'View available products', category: 'Services & Products' },
  { name: 'edit_products', description: 'Create and edit products', category: 'Services & Products' },
  { name: 'manage_inventory', description: 'Manage product inventory', category: 'Services & Products' },
  
  // Reports and Analytics
  { name: 'view_sales_reports', description: 'View sales reports and analytics', category: 'Reports & Analytics' },
  { name: 'view_client_reports', description: 'View client reports and analytics', category: 'Reports & Analytics' },
  { name: 'view_staff_reports', description: 'View staff performance reports', category: 'Reports & Analytics' },
  { name: 'view_financial_reports', description: 'View financial reports and revenue data', category: 'Reports & Analytics' },
  
  // Staff Management
  { name: 'view_staff_list', description: 'View list of staff members', category: 'Staff Management' },
  { name: 'edit_staff_info', description: 'Edit staff information', category: 'Staff Management' },
  { name: 'manage_staff_permissions', description: 'Manage staff permissions and access', category: 'Staff Management' },
  { name: 'view_staff_performance', description: 'View staff performance metrics', category: 'Staff Management' },
  
  // Marketing and Communications
  { name: 'view_marketing_campaigns', description: 'View marketing campaigns', category: 'Marketing & Communications' },
  { name: 'edit_marketing_campaigns', description: 'Create and edit marketing campaigns', category: 'Marketing & Communications' },
  { name: 'send_communications', description: 'Send emails and SMS to clients', category: 'Marketing & Communications' },
  { name: 'view_communication_history', description: 'View communication history', category: 'Marketing & Communications' },
  
  // Settings and Configuration
  { name: 'view_business_settings', description: 'View business settings', category: 'Settings & Configuration' },
  { name: 'edit_business_settings', description: 'Edit business settings', category: 'Settings & Configuration' },
  { name: 'manage_system_config', description: 'Manage system configuration', category: 'Settings & Configuration' },
  
  // Payment and Billing
  { name: 'view_payment_history', description: 'View payment history', category: 'Payment & Billing' },
  { name: 'process_payments', description: 'Process payments and refunds', category: 'Payment & Billing' },
  { name: 'view_billing_info', description: 'View billing information', category: 'Payment & Billing' },
  { name: 'edit_billing_info', description: 'Edit billing information', category: 'Payment & Billing' },
  
  // Time Clock
  { name: 'view_time_clock', description: 'View time clock entries', category: 'Time Clock' },
  { name: 'edit_time_clock', description: 'Edit time clock entries', category: 'Time Clock' },
  { name: 'manage_payroll', description: 'Manage payroll and time tracking', category: 'Time Clock' },
  
  // Forms and Data Collection
  { name: 'view_forms', description: 'View client forms and submissions', category: 'Forms & Data' },
  { name: 'edit_forms', description: 'Create and edit forms', category: 'Forms & Data' },
  { name: 'export_data', description: 'Export client and business data', category: 'Forms & Data' },
  
  // Advanced Features
  { name: 'manage_automation', description: 'Manage business automation rules', category: 'Advanced Features' },
  { name: 'view_ai_conversations', description: 'View AI conversation history', category: 'Advanced Features' },
  { name: 'manage_knowledge_base', description: 'Manage business knowledge base', category: 'Advanced Features' }
];

// Default permission groups with their assigned permissions
const DEFAULT_PERMISSION_GROUPS = [
  {
    name: 'Owner',
    description: 'Full access to all features and data',
    permissions: [
      'view_client_contact_info', 'edit_client_contact_info', 'view_client_history', 'view_client_notes', 'edit_client_notes',
      'view_calendar', 'edit_calendar', 'view_staff_schedule', 'edit_staff_schedule',
      'view_services', 'edit_services', 'view_products', 'edit_products', 'manage_inventory',
      'view_sales_reports', 'view_client_reports', 'view_staff_reports', 'view_financial_reports',
      'view_staff_list', 'edit_staff_info', 'manage_staff_permissions', 'view_staff_performance',
      'view_marketing_campaigns', 'edit_marketing_campaigns', 'send_communications', 'view_communication_history',
      'view_business_settings', 'edit_business_settings', 'manage_system_config',
      'view_payment_history', 'process_payments', 'view_billing_info', 'edit_billing_info',
      'view_time_clock', 'edit_time_clock', 'manage_payroll',
      'view_forms', 'edit_forms', 'export_data',
      'manage_automation', 'view_ai_conversations', 'manage_knowledge_base'
    ]
  },
  {
    name: 'Manager',
    description: 'Management level access with most features',
    permissions: [
      'view_client_contact_info', 'edit_client_contact_info', 'view_client_history', 'view_client_notes', 'edit_client_notes',
      'view_calendar', 'edit_calendar', 'view_staff_schedule', 'edit_staff_schedule',
      'view_services', 'edit_services', 'view_products', 'edit_products', 'manage_inventory',
      'view_sales_reports', 'view_client_reports', 'view_staff_reports', 'view_financial_reports',
      'view_staff_list', 'edit_staff_info', 'view_staff_performance',
      'view_marketing_campaigns', 'edit_marketing_campaigns', 'send_communications', 'view_communication_history',
      'view_business_settings', 'edit_business_settings',
      'view_payment_history', 'process_payments', 'view_billing_info', 'edit_billing_info',
      'view_time_clock', 'edit_time_clock',
      'view_forms', 'edit_forms', 'export_data',
      'view_ai_conversations', 'manage_knowledge_base'
    ]
  },
  {
    name: 'Receptionist',
    description: 'Front desk access for client management and appointments',
    permissions: [
      'view_client_contact_info', 'edit_client_contact_info', 'view_client_history', 'view_client_notes', 'edit_client_notes',
      'view_calendar', 'edit_calendar', 'view_staff_schedule',
      'view_services', 'view_products',
      'view_sales_reports', 'view_client_reports',
      'view_staff_list',
      'view_marketing_campaigns', 'send_communications', 'view_communication_history',
      'view_business_settings',
      'view_payment_history', 'process_payments', 'view_billing_info', 'edit_billing_info',
      'view_forms', 'view_ai_conversations'
    ]
  },
  {
    name: 'Stylist/Therapist',
    description: 'Service provider access for appointments and client management',
    permissions: [
      'view_client_contact_info', 'view_client_history', 'view_client_notes', 'edit_client_notes',
      'view_calendar', 'edit_calendar', 'view_staff_schedule',
      'view_services', 'view_products',
      'view_sales_reports', 'view_client_reports',
      'view_staff_list',
      'view_payment_history', 'view_billing_info',
      'view_time_clock', 'edit_time_clock',
      'view_forms', 'view_ai_conversations'
    ]
  },
  {
    name: 'Assistant',
    description: 'Limited access for support tasks',
    permissions: [
      'view_client_contact_info', 'view_client_history', 'view_client_notes',
      'view_calendar', 'view_staff_schedule',
      'view_services', 'view_products',
      'view_sales_reports',
      'view_staff_list',
      'view_payment_history', 'view_billing_info',
      'view_time_clock',
      'view_forms'
    ]
  }
];

async function seedPermissions() {
  try {
    console.log('Starting permission seeding...');
    
    // First, create permission categories
    const categories = [...new Set(DEFAULT_PERMISSIONS.map(p => p.category))];
    const categoryMap = new Map();
    
    for (const categoryName of categories) {
      console.log(`Creating category: ${categoryName}`);
      const result: any = await db.execute(
        sql`INSERT INTO permission_categories (name, description) VALUES (${categoryName}, ${`Permissions for ${categoryName}`}) ON CONFLICT (name) DO NOTHING RETURNING id, name`
      );
      const rows = result?.rows ?? result;
      if (rows && rows.length > 0) {
        const row = rows[0];
        categoryMap.set(categoryName, row.id);
        console.log(`Created category: ${categoryName} with ID: ${row.id}`);
      } else {
        // Get existing category ID
        const existing: any = await db.execute(
          sql`SELECT id FROM permission_categories WHERE name = ${categoryName}`
        );
        const existingRows = existing?.rows ?? existing;
        if (existingRows && existingRows.length > 0) {
          categoryMap.set(categoryName, existingRows[0].id);
          console.log(`Found existing category: ${categoryName} with ID: ${existingRows[0].id}`);
        }
      }
    }
    
    // Create permissions
    const permissionMap = new Map<string, number>();
    
    for (const permission of DEFAULT_PERMISSIONS) {
      console.log(`Creating permission: ${permission.name}`);
      const categoryId = categoryMap.get(permission.category);
      
      const result: any = await db.execute(
        sql`INSERT INTO permissions (name, description, category_id, is_active) VALUES (${permission.name}, ${permission.description}, ${categoryId}, true) ON CONFLICT (name) DO NOTHING RETURNING id, name`
      );
      const rows = result?.rows ?? result;
      
      if (rows && rows.length > 0) {
        permissionMap.set(permission.name, rows[0].id);
        console.log(`Created permission: ${permission.name} with ID: ${rows[0].id}`);
      } else {
        // Get existing permission ID
        const existing: any = await db.execute(
          sql`SELECT id FROM permissions WHERE name = ${permission.name}`
        );
        const existingRows = existing?.rows ?? existing;
        if (existingRows && existingRows.length > 0) {
          permissionMap.set(permission.name, existingRows[0].id);
          console.log(`Found existing permission: ${permission.name} with ID: ${existingRows[0].id}`);
        }
      }
    }
    
    // Create permission groups
    for (const group of DEFAULT_PERMISSION_GROUPS) {
      console.log(`Creating permission group: ${group.name}`);
      
      const result: any = await db.execute(
        sql`INSERT INTO permission_groups (name, description, is_active) VALUES (${group.name}, ${group.description}, true) ON CONFLICT (name) DO NOTHING RETURNING id, name`
      );
      const rows = result?.rows ?? result;
      
      let groupId;
      if (rows && rows.length > 0) {
        groupId = rows[0].id;
        console.log(`Created permission group: ${group.name} with ID: ${groupId}`);
      } else {
        // Get existing group ID
        const existing: any = await db.execute(
          sql`SELECT id FROM permission_groups WHERE name = ${group.name}`
        );
        const existingRows = existing?.rows ?? existing;
        if (existingRows && existingRows.length > 0) {
          groupId = existingRows[0].id;
          console.log(`Found existing permission group: ${group.name} with ID: ${groupId}`);
        }
      }
      
      if (groupId) {
        // Assign permissions to the group
        for (const permissionName of group.permissions) {
          const permissionId = permissionMap.get(permissionName);
          if (permissionId) {
            await db.execute(
              sql`INSERT INTO permission_group_mappings (group_id, permission_id) VALUES (${groupId}, ${permissionId}) ON CONFLICT (group_id, permission_id) DO NOTHING`
            );
            console.log(`Assigned permission ${permissionName} to group ${group.name}`);
          } else {
            console.warn(`Permission not found: ${permissionName}`);
          }
        }
      }
    }
    
    console.log('Permission seeding completed successfully!');
    
    // Print summary
    const permissionCountRes: any = await db.execute(sql`SELECT COUNT(*) as count FROM permissions`);
    const groupCountRes: any = await db.execute(sql`SELECT COUNT(*) as count FROM permission_groups`);
    const categoryCountRes: any = await db.execute(sql`SELECT COUNT(*) as count FROM permission_categories`);
    const permissionCountRows = permissionCountRes?.rows ?? permissionCountRes;
    const groupCountRows = groupCountRes?.rows ?? groupCountRes;
    const categoryCountRows = categoryCountRes?.rows ?? categoryCountRes;
    
    console.log(`\nSummary:`);
    console.log(`- ${permissionCountRows?.[0]?.count ?? 0} permissions created`);
    console.log(`- ${groupCountRows?.[0]?.count ?? 0} permission groups created`);
    console.log(`- ${categoryCountRows?.[0]?.count ?? 0} permission categories created`);
    
  } catch (error) {
    console.error('Error seeding permissions:', error);
    process.exit(1);
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedPermissions().then(() => {
    console.log('Seeding completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
}

export { seedPermissions }; 