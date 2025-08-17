import { Express, Request, Response } from 'express';
import { IStorage } from '../storage';
import { PermissionsService } from '../services/permissions';
import { 
  requireAdmin, 
  requireStaffOrAdmin,
  requirePermission,
  requireAnyPermission,
  AuthenticatedRequest 
} from '../middleware/permissions';
import { authenticateToken } from '../middleware/auth';
import { validateInput, sanitizeInputString } from '../middleware/security';
import { z } from 'zod';

// Validation schemas
const createPermissionGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  permissionIds: z.array(z.number()).optional(),
});

const updatePermissionGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  permissionIds: z.array(z.number()).optional(),
});

const assignPermissionGroupSchema = z.object({
  userId: z.number().positive('User ID is required'),
  groupId: z.number().positive('Group ID is required'),
});

const grantDirectPermissionSchema = z.object({
  userId: z.number().positive('User ID is required'),
  permissionId: z.number().positive('Permission ID is required'),
});

const denyDirectPermissionSchema = z.object({
  userId: z.number().positive('User ID is required'),
  permissionId: z.number().positive('Permission ID is required'),
});

const createPermissionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  action: z.string().min(1, 'Action is required'),
  resource: z.string().min(1, 'Resource is required'),
});

const checkPermissionSchema = z.object({
  permissionName: z.string().optional(),
  resource: z.string().optional(),
  action: z.string().optional(),
});

export function registerPermissionRoutes(app: Express, storage: IStorage) {
  const permissionsService = new PermissionsService(storage);

  // Get all permissions
  app.get('/api/permissions', 
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      // Allow admin and staff users to access permissions
      if (req.user?.role !== 'admin' && req.user?.role !== 'staff') {
        return res.status(403).json({
          error: 'AuthorizationError',
          message: 'Admin or staff access required',
          timestamp: new Date().toISOString(),
        });
      }
      try {
        const permissions = await permissionsService.getAllPermissions();
        res.json({
          success: true,
          data: permissions,
        });
      } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to fetch permissions',
        });
      }
    }
  );

  // Get permissions by category
  app.get('/api/permissions/category/:category',
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      // Allow admin and staff users to access permissions
      if (req.user?.role !== 'admin' && req.user?.role !== 'staff') {
        return res.status(403).json({
          error: 'AuthorizationError',
          message: 'Admin or staff access required',
          timestamp: new Date().toISOString(),
        });
      }
      try {
        const { category } = req.params;
        const permissions = await permissionsService.getPermissionsByCategory(category);
        res.json({
          success: true,
          data: permissions,
        });
      } catch (error) {
        console.error('Error fetching permissions by category:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to fetch permissions by category',
        });
      }
    }
  );

  // Create new permission (admin only)
  app.post('/api/permissions',
    authenticateToken,
    requireAdmin,
    validateInput(createPermissionSchema),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { name, description, category, action, resource } = req.body;
        
        const permission = await storage.createPermission({
          name: sanitizeInputString(name),
          description: description ? sanitizeInputString(description) : undefined,
          category: sanitizeInputString(category),
          action: sanitizeInputString(action),
          resource: sanitizeInputString(resource),
        });

        res.status(201).json({
          success: true,
          data: permission,
        });
      } catch (error) {
        console.error('Error creating permission:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to create permission',
        });
      }
    }
  );

  // Get all permission groups
  app.get('/api/permission-groups',
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      // Allow admin and staff users to access permission groups
      if (req.user?.role !== 'admin' && req.user?.role !== 'staff') {
        return res.status(403).json({
          error: 'AuthorizationError',
          message: 'Admin or staff access required',
          timestamp: new Date().toISOString(),
        });
      }
      try {
        const groups = await permissionsService.getAllPermissionGroups();
        res.json({
          success: true,
          data: groups,
        });
      } catch (error) {
        console.error('Error fetching permission groups:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to fetch permission groups',
        });
      }
    }
  );

  // Get permission group with permissions
  app.get('/api/permission-groups/:id',
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      // Allow admin and staff users to access permission groups
      if (req.user?.role !== 'admin' && req.user?.role !== 'staff') {
        return res.status(403).json({
          error: 'AuthorizationError',
          message: 'Admin or staff access required',
          timestamp: new Date().toISOString(),
        });
      }
      try {
        const groupId = parseInt(req.params.id);
        const group = await permissionsService.getPermissionGroupWithPermissions(groupId);
        
        if (!group) {
          return res.status(404).json({
            error: 'NotFoundError',
            message: 'Permission group not found',
          });
        }

        res.json({
          success: true,
          data: group,
        });
      } catch (error) {
        console.error('Error fetching permission group:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to fetch permission group',
        });
      }
    }
  );

  // Create new permission group
  app.post('/api/permission-groups',
    authenticateToken,
    requireAdmin,
    validateInput(createPermissionGroupSchema),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { name, description, permissionIds } = req.body;
        
        const group = await permissionsService.createPermissionGroup({
          name: sanitizeInputString(name),
          description: description ? sanitizeInputString(description) : undefined,
          permissionIds,
          createdBy: req.user!.id,
        });

        res.status(201).json({
          success: true,
          data: group,
        });
      } catch (error) {
        console.error('Error creating permission group:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to create permission group',
        });
      }
    }
  );

  // Update permission group
  app.put('/api/permission-groups/:id',
    authenticateToken,
    requireAdmin,
    validateInput(updatePermissionGroupSchema),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const groupId = parseInt(req.params.id);
        const updates = req.body;
        
        const group = await permissionsService.updatePermissionGroup(groupId, updates);
        
        if (!group) {
          return res.status(404).json({
            error: 'NotFoundError',
            message: 'Permission group not found',
          });
        }

        res.json({
          success: true,
          data: group,
        });
      } catch (error) {
        console.error('Error updating permission group:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to update permission group',
        });
      }
    }
  );

  // Delete permission group
  app.delete('/api/permission-groups/:id',
    authenticateToken,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const groupId = parseInt(req.params.id);
        const group = await storage.getPermissionGroup(groupId);
        
        if (!group) {
          return res.status(404).json({
            error: 'NotFoundError',
            message: 'Permission group not found',
          });
        }

        if (group.isSystem) {
          return res.status(400).json({
            error: 'ValidationError',
            message: 'Cannot delete system permission groups',
          });
        }

        await storage.deletePermissionGroup(groupId);
        
        res.json({
          success: true,
          message: 'Permission group deleted successfully',
        });
      } catch (error) {
        console.error('Error deleting permission group:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to delete permission group',
        });
      }
    }
  );

  // Get user permissions
  app.get('/api/users/:id/permissions',
    authenticateToken,
    requireAnyPermission(['view_user_permissions', 'manage_user_permissions']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const userPermissions = await permissionsService.getUserPermissions(userId);
        
        res.json({
          success: true,
          data: userPermissions,
        });
      } catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to fetch user permissions',
        });
      }
    }
  );

  // Assign permission group to user
  app.post('/api/users/:id/permission-groups',
    authenticateToken,
    requireAdmin,
    validateInput(assignPermissionGroupSchema),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const { groupId } = req.body;
        
        await permissionsService.assignPermissionGroupToUser(userId, groupId);
        
        res.json({
          success: true,
          message: 'Permission group assigned successfully',
        });
      } catch (error) {
        console.error('Error assigning permission group:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to assign permission group',
        });
      }
    }
  );

  // Remove permission group from user
  app.delete('/api/users/:id/permission-groups/:groupId',
    authenticateToken,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const groupId = parseInt(req.params.groupId);
        
        await permissionsService.removePermissionGroupFromUser(userId, groupId);
        
        res.json({
          success: true,
          message: 'Permission group removed successfully',
        });
      } catch (error) {
        console.error('Error removing permission group:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to remove permission group',
        });
      }
    }
  );

  // Grant direct permission to user
  app.post('/api/users/:id/permissions',
    authenticateToken,
    requireAdmin,
    validateInput(grantDirectPermissionSchema),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const { permissionId } = req.body;
        
        await permissionsService.grantDirectPermission(userId, permissionId, req.user!.id);
        
        res.json({
          success: true,
          message: 'Direct permission granted successfully',
        });
      } catch (error) {
        console.error('Error granting direct permission:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to grant direct permission',
        });
      }
    }
  );

  // Deny direct permission to user
  app.post('/api/users/:id/permissions/deny',
    authenticateToken,
    requireAdmin,
    validateInput(denyDirectPermissionSchema),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const { permissionId } = req.body;
        
        await permissionsService.denyDirectPermission(userId, permissionId, req.user!.id);
        
        res.json({
          success: true,
          message: 'Direct permission denied successfully',
        });
      } catch (error) {
        console.error('Error denying direct permission:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to deny direct permission',
        });
      }
    }
  );

  // Remove direct permission from user
  app.delete('/api/users/:id/permissions/:permissionId',
    authenticateToken,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const permissionId = parseInt(req.params.permissionId);
        
        await permissionsService.removeDirectPermission(userId, permissionId);
        
        res.json({
          success: true,
          message: 'Direct permission removed successfully',
        });
      } catch (error) {
        console.error('Error removing direct permission:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to remove direct permission',
        });
      }
    }
  );

  // Check if user has permission
  app.post('/api/permissions/check',
    authenticateToken,
    validateInput(checkPermissionSchema),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { permissionName, resource, action } = req.body;
        
        let hasPermission = false;
        if (resource && action) {
          hasPermission = await permissionsService.hasResourcePermission(req.user!.id, resource, action);
        } else if (permissionName) {
          hasPermission = await permissionsService.hasPermission(req.user!.id, permissionName);
        }
        
        res.json({
          success: true,
          data: {
            hasPermission,
            permissionName: permissionName || `${action}_${resource}`,
          },
        });
      } catch (error) {
        console.error('Error checking permission:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to check permission',
        });
      }
    }
  );

  // Get current user's permissions
  app.get('/api/permissions/my',
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userPermissions = await permissionsService.getUserPermissions(req.user!.id);
        
        res.json({
          success: true,
          data: userPermissions,
        });
      } catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to fetch user permissions',
        });
      }
    }
  );

  // Get user permission groups
  app.get('/api/users/:id/permission-groups',
    authenticateToken,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const groups = await permissionsService.getUserPermissions(userId);
        
        res.json({
          success: true,
          data: groups,
        });
      } catch (error) {
        console.error('Error fetching user permission groups:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to fetch user permission groups',
        });
      }
    }
  );

  // Get user permission groups (alternative endpoint)
  app.get('/api/user-permission-groups/:userId',
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        const groups = await storage.getUserPermissionGroups(userId);
        
        res.json({
          success: true,
          data: groups,
        });
      } catch (error) {
        console.error('Error fetching user permission groups:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to fetch user permission groups',
        });
      }
    }
  );

  // Assign permission group to user (alternative endpoint)
  app.post('/api/user-permission-groups',
    authenticateToken,
    validateInput(assignPermissionGroupSchema),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { userId, groupId } = req.body;
        
        await storage.assignPermissionGroupToUser(userId, groupId);
        
        res.json({
          success: true,
          message: 'Permission group assigned successfully',
        });
      } catch (error) {
        console.error('Error assigning permission group:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to assign permission group',
        });
      }
    }
  );

  // Remove permission group from user (alternative endpoint)
  app.delete('/api/user-permission-groups/:userId/:groupId',
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        const groupId = parseInt(req.params.groupId);
        
        await storage.removePermissionGroupFromUser(userId, groupId);
        
        res.json({
          success: true,
          message: 'Permission group removed successfully',
        });
      } catch (error) {
        console.error('Error removing permission group:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to remove permission group',
        });
      }
    }
  );

  // Assign permission group to user
  app.post('/api/users/:id/permission-groups',
    authenticateToken,
    requireAdmin,
    validateInput(assignPermissionGroupSchema),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const { groupId } = req.body;
        
        await permissionsService.assignPermissionGroupToUser(userId, groupId);
        
        res.json({
          success: true,
          message: 'Permission group assigned successfully',
        });
      } catch (error) {
        console.error('Error assigning permission group:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to assign permission group',
        });
      }
    }
  );

  // Remove permission group from user
  app.delete('/api/users/:id/permission-groups/:groupId',
    authenticateToken,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const groupId = parseInt(req.params.groupId);
        
        await permissionsService.removePermissionGroupFromUser(userId, groupId);
        
        res.json({
          success: true,
          message: 'Permission group removed successfully',
        });
      } catch (error) {
        console.error('Error removing permission group:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to remove permission group',
        });
      }
    }
  );

  // Temporary seeding endpoint (remove in production)
  app.post('/api/permissions/seed',
    authenticateToken,
    async (req: AuthenticatedRequest, res: Response) => {
      // Only allow admin users to seed
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          error: 'AuthorizationError',
          message: 'Admin access required for seeding',
          timestamp: new Date().toISOString(),
        });
      }
      
      try {
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

        console.log('Starting permission seeding...');
        
        // Create permission categories first
        const categories = Array.from(new Set(DEFAULT_PERMISSIONS.map(p => p.category)));
        console.log(`Creating ${categories.length} permission categories...`);
        
        for (const category of categories) {
          try {
            await storage.createPermission({
              name: `category_${category.toLowerCase().replace(/\s+/g, '_')}`,
              description: `Permissions related to ${category.toLowerCase()}`,
              category: category,
              action: 'category',
              resource: category.toLowerCase().replace(/\s+/g, '_')
            });
            console.log(`✓ Created category: ${category}`);
          } catch (error: any) {
            console.log(`Category ${category} already exists or error:`, error.message);
          }
        }
        
        // Create individual permissions
        console.log(`Creating ${DEFAULT_PERMISSIONS.length} permissions...`);
        for (const permission of DEFAULT_PERMISSIONS) {
          try {
            await storage.createPermission({
              name: permission.name,
              description: permission.description,
              category: permission.category,
              action: permission.name.split('_')[0], // Extract action
              resource: permission.name.split('_').slice(1).join('_'), // Extract resource
              isSystem: true // Mark as system permission
            });
            console.log(`✓ Created permission: ${permission.name}`);
          } catch (error: any) {
            console.log(`Permission ${permission.name} already exists or error:`, error.message);
          }
        }
        
        // Create permission groups
        console.log(`Creating ${DEFAULT_PERMISSION_GROUPS.length} permission groups...`);
        for (const group of DEFAULT_PERMISSION_GROUPS) {
          try {
            const result = await storage.createPermissionGroup({
              name: group.name,
              description: group.description,
              isSystem: true, // Mark as system group
              createdBy: req.user!.id
            });
            
            if (result) {
              const groupId = result.id;
              console.log(`✓ Created group: ${group.name} (ID: ${groupId})`);
              
              // Assign permissions to this group
              for (const permissionName of group.permissions) {
                try {
                  // Find permission by name (we'll need to get all permissions and filter)
                  const allPermissions = await storage.getAllPermissions();
                  const permission = allPermissions.find(p => p.name === permissionName);
                  if (permission) {
                    await storage.assignPermissionsToGroup(groupId, [permission.id]);
                    console.log(`  ✓ Assigned permission ${permissionName} to group ${group.name}`);
                  } else {
                    console.log(`Permission ${permissionName} not found for group ${group.name}`);
                  }
                } catch (error: any) {
                  console.log(`Error assigning permission ${permissionName} to group ${group.name}:`, error.message);
                }
              }
              console.log(`  ✓ Assigned ${group.permissions.length} permissions to ${group.name}`);
            } else {
              console.log(`Group ${group.name} already exists`);
            }
          } catch (error: any) {
            console.log(`Error creating group ${group.name}:`, error.message);
          }
        }
        
        console.log('Permission seeding completed successfully!');
        
        // Summary - using placeholder values since the storage methods might not be implemented yet
        const summary = {
          categories: categories.length,
          permissions: DEFAULT_PERMISSIONS.length,
          groups: DEFAULT_PERMISSION_GROUPS.length
        };
        
        console.log('\n📊 Seeding Summary:');
        console.log(`- Permission Categories: ${summary.categories}`);
        console.log(`- Permissions: ${summary.permissions}`);
        console.log(`- Permission Groups: ${summary.groups}`);
        
        res.json({
          success: true,
          message: 'Permissions seeded successfully',
          summary: summary
        });
        
      } catch (error: any) {
        console.error('Error seeding permissions:', error);
        res.status(500).json({
          error: 'InternalServerError',
          message: 'Failed to seed permissions',
          details: error.message
        });
      }
    }
  );
} 