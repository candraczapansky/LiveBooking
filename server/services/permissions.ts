import { IStorage } from '../storage.js';
import { Permission, PermissionGroup, UserPermissionGroup, UserDirectPermission, PermissionGroupMapping } from '../../shared/schema.js';

export interface PermissionCheck {
  userId: number;
  permission: string;
  resource?: string;
  action?: string;
}

export interface UserPermissions {
  userId: number;
  permissions: string[];
  groups: PermissionGroup[];
  directPermissions: UserDirectPermission[];
}

export interface PermissionGroupWithPermissions extends PermissionGroup {
  permissions: Permission[];
}

export class PermissionsService {
  constructor(private storage: IStorage) {}

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(userId: number, permissionName: string): Promise<boolean> {
    try {
      // Get user's permissions
      const userPermissions = await this.getUserPermissions(userId);
      
      // Check if user has the permission directly or through groups
      return userPermissions.permissions.includes(permissionName);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if a user has permission for a specific resource and action
   */
  async hasResourcePermission(userId: number, resource: string, action: string): Promise<boolean> {
    try {
      const permissionName = `${action}_${resource}`;
      return await this.hasPermission(userId, permissionName);
    } catch (error) {
      console.error('Error checking resource permission:', error);
      return false;
    }
  }

  /**
   * Get all permissions for a user (from groups and direct assignments)
   */
  async getUserPermissions(userId: number): Promise<UserPermissions> {
    try {
      // Get user's permission groups
      const userGroups = await this.storage.getUserPermissionGroups(userId);
      
      // Get permissions from groups
      const groupPermissions = new Set<string>();
      const groups: PermissionGroup[] = [];
      
      for (const userGroup of userGroups) {
        const group = await this.storage.getPermissionGroup(userGroup.groupId);
        if (group && group.isActive) {
          groups.push(group);
          
          // Get permissions for this group
          const groupMappings = await (this.storage as any).getPermissionGroupMappings?.(userGroup.groupId) ?? [];
          for (const mapping of groupMappings as any[]) {
            const permission = await this.storage.getPermission(mapping.permissionId);
            if (permission && permission.isActive) {
              groupPermissions.add(permission.name);
            }
          }
        }
      }
      
      // Get direct permissions
      const directPermissions = await this.storage.getUserDirectPermissions(userId);
      const directPermissionNames = new Set<string>();
      
      for (const directPerm of directPermissions) {
        const permission = await this.storage.getPermission(directPerm.permissionId);
        if (permission && permission.isActive) {
          if (directPerm.isGranted) {
            directPermissionNames.add(permission.name);
          } else {
            // Remove permission if explicitly denied
            directPermissionNames.delete(permission.name);
            groupPermissions.delete(permission.name);
          }
        }
      }
      
      // Combine all permissions
      const allPermissions = [...groupPermissions, ...directPermissionNames];
      
      return {
        userId,
        permissions: allPermissions,
        groups,
        directPermissions,
      };
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return {
        userId,
        permissions: [],
        groups: [],
        directPermissions: [],
      };
    }
  }

  /**
   * Get permission group with all its permissions
   */
  async getPermissionGroupWithPermissions(groupId: number): Promise<PermissionGroupWithPermissions | null> {
    try {
      const group = await this.storage.getPermissionGroup(groupId);
      if (!group) return null;
      
      const mappings = await (this.storage as any).getPermissionGroupMappings?.(groupId) ?? [];
      const permissions: Permission[] = [];
      
      for (const mapping of mappings) {
        const permission = await this.storage.getPermission(mapping.permissionId);
        if (permission) {
          permissions.push(permission);
        }
      }
      
      return {
        ...group,
        permissions,
      };
    } catch (error) {
      console.error('Error getting permission group with permissions:', error);
      return null;
    }
  }

  /**
   * Create a new permission group
   */
  async createPermissionGroup(groupData: {
    name: string;
    description?: string;
    permissionIds?: number[];
    createdBy: number;
  }): Promise<PermissionGroup> {
    try {
      const group = await this.storage.createPermissionGroup({
        name: groupData.name,
        description: groupData.description,
        createdBy: groupData.createdBy,
      });
      
      // Add permissions to the group
      if (groupData.permissionIds && groupData.permissionIds.length > 0) {
        for (const permissionId of groupData.permissionIds) {
          await (this.storage as any).createPermissionGroupMapping?.({
            groupId: group.id,
            permissionId,
          });
        }
      }
      
      return group;
    } catch (error) {
      console.error('Error creating permission group:', error);
      throw error;
    }
  }

  /**
   * Update a permission group
   */
  async updatePermissionGroup(groupId: number, updates: {
    name?: string;
    description?: string;
    isActive?: boolean;
    permissionIds?: number[];
  }): Promise<PermissionGroup | null> {
    try {
      const group = await this.storage.getPermissionGroup(groupId);
      if (!group) return null;
      
      // Update group details
      const updatedGroup = await this.storage.updatePermissionGroup(groupId, updates);
      
      // Update permissions if provided
      if (updates.permissionIds !== undefined) {
        // Remove existing permissions
        await (this.storage as any).deletePermissionGroupMappings?.(groupId);
        
        // Add new permissions
        for (const permissionId of updates.permissionIds) {
          await (this.storage as any).createPermissionGroupMapping?.({
            groupId,
            permissionId,
          });
        }
      }
      
      return updatedGroup;
    } catch (error) {
      console.error('Error updating permission group:', error);
      throw error;
    }
  }

  /**
   * Assign a permission group to a user
   */
  async assignPermissionGroupToUser(userId: number, groupId: number, assignedBy: number): Promise<UserPermissionGroup> {
    try {
      // Check if user already has this group
      const existingAssignment = await (this.storage as any).getUserPermissionGroup?.(userId, groupId);
      if (existingAssignment) {
        throw new Error('User already has this permission group');
      }
      
      return await (this.storage as any).createUserPermissionGroup?.({
        userId,
        groupId,
        assignedBy,
      });
    } catch (error) {
      console.error('Error assigning permission group to user:', error);
      throw error;
    }
  }

  /**
   * Remove a permission group from a user
   */
  async removePermissionGroupFromUser(userId: number, groupId: number): Promise<boolean> {
    try {
      const assignment = await (this.storage as any).getUserPermissionGroup?.(userId, groupId);
      if (!assignment) {
        return false;
      }
      
      await (this.storage as any).deleteUserPermissionGroup?.(assignment.id);
      return true;
    } catch (error) {
      console.error('Error removing permission group from user:', error);
      throw error;
    }
  }

  /**
   * Grant a direct permission to a user
   */
  async grantDirectPermission(userId: number, permissionId: number, assignedBy: number): Promise<UserDirectPermission> {
    try {
      // Check if permission already exists
      const existingPermission = await (this.storage as any).getUserDirectPermission?.(userId, permissionId);
      if (existingPermission) {
        // Update existing permission
        return await (this.storage as any).updateUserDirectPermission?.(existingPermission.id, {
          isGranted: true,
          assignedBy,
        });
      }
      
      return await (this.storage as any).createUserDirectPermission?.({
        userId,
        permissionId,
        isGranted: true,
        assignedBy,
      });
    } catch (error) {
      console.error('Error granting direct permission:', error);
      throw error;
    }
  }

  /**
   * Deny a direct permission to a user
   */
  async denyDirectPermission(userId: number, permissionId: number, assignedBy: number): Promise<UserDirectPermission> {
    try {
      // Check if permission already exists
      const existingPermission = await (this.storage as any).getUserDirectPermission?.(userId, permissionId);
      if (existingPermission) {
        // Update existing permission
        return await (this.storage as any).updateUserDirectPermission?.(existingPermission.id, {
          isGranted: false,
          assignedBy,
        });
      }
      
      return await (this.storage as any).createUserDirectPermission?.({
        userId,
        permissionId,
        isGranted: false,
        assignedBy,
      });
    } catch (error) {
      console.error('Error denying direct permission:', error);
      throw error;
    }
  }

  /**
   * Remove a direct permission from a user
   */
  async removeDirectPermission(userId: number, permissionId: number): Promise<boolean> {
    try {
      const permission = await (this.storage as any).getUserDirectPermission?.(userId, permissionId);
      if (!permission) {
        return false;
      }
      
      await (this.storage as any).deleteUserDirectPermission?.(permission.id);
      return true;
    } catch (error) {
      console.error('Error removing direct permission:', error);
      throw error;
    }
  }

  /**
   * Get all permission groups
   */
  async getAllPermissionGroups(): Promise<PermissionGroup[]> {
    try {
      return await this.storage.getAllPermissionGroups();
    } catch (error) {
      console.error('Error getting all permission groups:', error);
      return [];
    }
  }

  /**
   * Get all permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    try {
      return await this.storage.getAllPermissions();
    } catch (error) {
      console.error('Error getting all permissions:', error);
      return [];
    }
  }

  /**
   * Get permissions by category
   */
  async getPermissionsByCategory(category: string): Promise<Permission[]> {
    try {
      return await this.storage.getPermissionsByCategory(category);
    } catch (error) {
      console.error('Error getting permissions by category:', error);
      return [];
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(userId: number, permissionNames: string[]): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      return permissionNames.some(permission => userPermissions.permissions.includes(permission));
    } catch (error) {
      console.error('Error checking any permission:', error);
      return false;
    }
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(userId: number, permissionNames: string[]): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      return permissionNames.every(permission => userPermissions.permissions.includes(permission));
    } catch (error) {
      console.error('Error checking all permissions:', error);
      return false;
    }
  }
} 