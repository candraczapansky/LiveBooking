# 🔐 Comprehensive Permissions System Guide

## Overview

This implementation provides a robust, granular permissions system similar to Mindbody's user permissions. It allows you to create custom permission groups, assign specific permissions to users, and control access to different features of your salon/spa management system.

## 🏗️ System Architecture

### Database Schema

The permissions system consists of several interconnected tables:

1. **`permissions`** - Individual permissions (e.g., "view_client_contact_info")
2. **`permission_groups`** - Collections of permissions (e.g., "Receptionist", "Manager")
3. **`permission_group_mappings`** - Links permissions to groups
4. **`user_permission_groups`** - Links users to permission groups
5. **`user_direct_permissions`** - Individual permission overrides for users
6. **`permission_categories`** - Organizes permissions by category

### Key Features

- **Granular Permissions**: Control access at the feature level
- **Permission Groups**: Pre-configured permission sets for common roles
- **Direct Permissions**: Override group permissions for individual users
- **Permission Denial**: Explicitly deny permissions to users
- **System Groups**: Protected default permission groups
- **Category Organization**: Permissions organized by feature area

## 📋 Default Permission Groups

### 1. Owner
**Full access to all features and settings**
- All client management permissions
- All calendar and appointment permissions
- All reports and analytics
- All service and product management
- All staff management
- All business and system settings
- All user and permission management
- All marketing and financial features

### 2. Manager
**Management access with most features**
- All client management permissions
- All calendar and appointment permissions
- All reports and analytics
- All service and product management
- All staff management (except delete users)
- All business settings (except system settings)
- All marketing and financial features

### 3. Receptionist
**Front desk access for client management and appointments**
- Client contact information (view/edit)
- Client notes (view/edit)
- Client payment information (view/edit)
- Calendar management (view/edit appointments)
- Sales reports (view only)
- Client reports (view only)
- Appointment reports (view only)
- Services and products (view only)
- Staff information (view only)
- Staff schedules (view only)
- Business settings (view only)
- User creation

### 4. Stylist/Therapist
**Service provider access for appointments and client management**
- Client contact information (view only)
- Client notes (view/edit)
- Calendar management (view/edit appointments)
- Sales reports (view only)
- Client reports (view only)
- Services and products (view only)
- Staff information (view only)
- Staff schedules (view only)
- Staff earnings (view own)

### 5. Assistant
**Limited access for support tasks**
- Client contact information (view only)
- Client notes (view only)
- Calendar (view only)
- Sales reports (view only)
- Services and products (view only)
- Staff information (view only)

## 🔧 Permission Categories

### Clients
- `view_client_contact_info` - View client contact information
- `edit_client_contact_info` - Edit client contact information
- `view_client_notes` - View client notes and history
- `edit_client_notes` - Add and edit client notes
- `view_client_payment_info` - View client payment information
- `edit_client_payment_info` - Edit client payment information

### Calendar
- `view_calendar` - View appointment calendar
- `edit_calendar` - Create and edit appointments
- `delete_appointments` - Delete appointments
- `view_other_staff_calendar` - View other staff members' calendars

### Reports
- `view_sales_reports` - View sales and revenue reports
- `view_client_reports` - View client analytics and reports
- `view_staff_reports` - View staff performance reports
- `view_appointment_reports` - View appointment and attendance reports
- `export_reports` - Export reports to CSV/PDF

### Services & Products
- `view_services` - View services and pricing
- `edit_services` - Create and edit services
- `view_products` - View products and inventory
- `edit_products` - Create and edit products

### Staff Management
- `view_staff_info` - View staff information
- `edit_staff_info` - Edit staff information
- `view_staff_schedules` - View staff schedules
- `edit_staff_schedules` - Edit staff schedules
- `view_staff_earnings` - View staff earnings and commissions

### Settings
- `view_business_settings` - View business settings
- `edit_business_settings` - Edit business settings
- `view_system_settings` - View system configuration
- `edit_system_settings` - Edit system configuration

### Users
- `view_users` - View user accounts
- `create_users` - Create new user accounts
- `edit_users` - Edit user accounts
- `delete_users` - Delete user accounts

### Permissions
- `view_permissions` - View permissions and permission groups
- `view_permission_groups` - View permission groups
- `manage_user_permissions` - Assign and manage user permissions

### Marketing
- `view_marketing_campaigns` - View marketing campaigns
- `create_marketing_campaigns` - Create marketing campaigns
- `edit_marketing_campaigns` - Edit marketing campaigns

### Financial
- `view_financial_reports` - View financial reports and statements
- `process_refunds` - Process refunds and adjustments
- `view_payment_history` - View detailed payment history

## 🚀 Getting Started

### 1. Database Migration

Run the database migration to create the permission tables:

```bash
npm run db:migrate
```

### 2. Seed Default Permissions

Seed the database with default permissions and permission groups:

```bash
npm run seed:permissions
```

### 3. Access Permission Management

Navigate to the Permission Management interface in your admin panel to:
- Create custom permission groups
- Assign permissions to users
- Manage individual user permissions
- View all available permissions

## 🎯 Usage Examples

### Creating a Custom Permission Group

1. Go to Permission Management → Permission Groups
2. Click "Create Group"
3. Enter group name and description
4. Select permissions from different categories
5. Save the group

### Assigning Permissions to a Staff Member

#### During Staff Creation
1. Create a new staff member
2. In the "Access Permissions" section, select appropriate permission groups
3. The staff member will automatically have those permissions

#### After Staff Creation
1. Go to Permission Management → User Permissions
2. Select the staff member
3. Click "Assign Group" to add permission groups
4. Use direct permissions for individual permission overrides

### Checking Permissions in Code

```typescript
// Check if user has a specific permission
const hasPermission = await permissionsService.hasPermission(userId, 'view_client_contact_info');

// Check if user has permission for a resource and action
const canEditCalendar = await permissionsService.hasResourcePermission(userId, 'calendar', 'edit');

// Check if user has any of multiple permissions
const canViewReports = await permissionsService.hasAnyPermission(userId, [
  'view_sales_reports',
  'view_client_reports',
  'view_staff_reports'
]);
```

### Using Permission Middleware

```typescript
// Protect routes with specific permissions
app.get('/api/clients', 
  requireAuth,
  requirePermission('view_client_contact_info'),
  async (req, res) => {
    // Route handler
  }
);

// Protect routes with resource permissions
app.post('/api/appointments',
  requireAuth,
  requireResourcePermission('calendar', 'edit'),
  async (req, res) => {
    // Route handler
  }
);

// Protect routes with multiple permission options
app.get('/api/reports',
  requireAuth,
  requireAnyPermission(['view_sales_reports', 'view_client_reports']),
  async (req, res) => {
    // Route handler
  }
);
```

## 🔒 Security Features

### Permission Inheritance
- Users inherit permissions from their assigned groups
- Direct permissions can override group permissions
- Explicit permission denials take precedence over group permissions

### System Protection
- System permission groups cannot be deleted
- System permissions cannot be deleted
- Admin users bypass permission checks

### Audit Trail
- All permission assignments are logged
- Track who assigned permissions and when
- Support for permission expiration dates

## 📊 API Endpoints

### Permission Management
- `GET /api/permissions` - Get all permissions
- `GET /api/permissions/category/:category` - Get permissions by category
- `POST /api/permissions` - Create new permission (admin only)

### Permission Groups
- `GET /api/permission-groups` - Get all permission groups
- `GET /api/permission-groups/:id` - Get permission group with permissions
- `POST /api/permission-groups` - Create new permission group
- `PUT /api/permission-groups/:id` - Update permission group
- `DELETE /api/permission-groups/:id` - Delete permission group

### User Permissions
- `GET /api/users/:id/permissions` - Get user permissions
- `POST /api/users/:id/permission-groups` - Assign permission group to user
- `DELETE /api/users/:id/permission-groups/:groupId` - Remove permission group from user
- `POST /api/users/:id/permissions` - Grant direct permission to user
- `POST /api/users/:id/permissions/deny` - Deny direct permission to user
- `DELETE /api/users/:id/permissions/:permissionId` - Remove direct permission from user

### Permission Checking
- `POST /api/permissions/check` - Check if user has specific permission
- `GET /api/permissions/my` - Get current user's permissions

## 🎨 Frontend Components

### PermissionManager Component
A comprehensive React component for managing permissions with:
- Permission group creation and editing
- User permission assignment
- Permission overview and organization
- Real-time permission checking

### StaffForm Component
Enhanced staff creation form with:
- Permission group selection during staff creation
- Visual permission group display
- Integration with permission management system

## 🔧 Configuration

### Environment Variables
```env
# Permission system configuration
PERMISSION_CACHE_TTL=300 # Cache permissions for 5 minutes
PERMISSION_CHECK_ENABLED=true # Enable permission checking
```

### Default Settings
- Permission groups are cached for 5 minutes
- System permission groups are protected from deletion
- Admin users bypass all permission checks
- Permission denials take precedence over grants

## 📈 Best Practices

### 1. Permission Design
- Use descriptive permission names
- Group related permissions together
- Follow the pattern: `action_resource`
- Keep permissions granular but not excessive

### 2. Group Management
- Create groups for common roles
- Use system groups for standard roles
- Create custom groups for specific needs
- Document group purposes clearly

### 3. User Assignment
- Assign users to groups rather than individual permissions
- Use direct permissions sparingly
- Review user permissions regularly
- Document permission changes

### 4. Security
- Regularly audit permission assignments
- Monitor permission usage
- Implement permission expiration where appropriate
- Log all permission changes

## 🚨 Troubleshooting

### Common Issues

1. **User can't access features they should have**
   - Check if user is assigned to correct permission groups
   - Verify permissions are active
   - Check for explicit permission denials

2. **Permission groups not appearing**
   - Ensure groups are active
   - Check if user has permission to view groups
   - Verify database connection

3. **Permission changes not taking effect**
   - Clear permission cache
   - Check if user is logged out and back in
   - Verify permission assignment was successful

### Debug Commands

```bash
# Check user permissions
curl -H "Authorization: Bearer TOKEN" /api/permissions/my

# Check specific permission
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"permissionName":"view_client_contact_info"}' \
  /api/permissions/check

# List all permission groups
curl -H "Authorization: Bearer TOKEN" /api/permission-groups
```

## 📚 Additional Resources

- [Database Schema Documentation](./shared/schema.ts)
- [Permission Service Documentation](./server/services/permissions.ts)
- [Permission Middleware Documentation](./server/middleware/permissions.ts)
- [API Routes Documentation](./server/routes/permissions.ts)
- [Frontend Component Documentation](./client/src/components/permissions/)

---

This permissions system provides the foundation for secure, granular access control in your salon/spa management system, similar to enterprise-level solutions like Mindbody. 