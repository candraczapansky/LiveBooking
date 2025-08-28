export class PermissionsService {
    constructor(storage) {
        this.storage = storage;
    }
    /**
     * Check if a user has a specific permission
     */
    async hasPermission(userId, permissionName) {
        try {
            // Get user's permissions
            const userPermissions = await this.getUserPermissions(userId);
            // Check if user has the permission directly or through groups
            return userPermissions.permissions.includes(permissionName);
        }
        catch (error) {
            console.error('Error checking permission:', error);
            return false;
        }
    }
    /**
     * Check if a user has permission for a specific resource and action
     */
    async hasResourcePermission(userId, resource, action) {
        try {
            const permissionName = `${action}_${resource}`;
            return await this.hasPermission(userId, permissionName);
        }
        catch (error) {
            console.error('Error checking resource permission:', error);
            return false;
        }
    }
    /**
     * Get all permissions for a user (from groups and direct assignments)
     */
    async getUserPermissions(userId) {
        try {
            // Get user's permission groups
            const userGroups = await this.storage.getUserPermissionGroups(userId);
            // Get permissions from groups
            const groupPermissions = new Set();
            const groups = [];
            for (const userGroup of userGroups) {
                const group = await this.storage.getPermissionGroup(userGroup.groupId);
                if (group && group.isActive) {
                    groups.push(group);
                    // Get permissions for this group
                    const groupMappings = await this.storage.getPermissionGroupMappings?.(userGroup.groupId) ?? [];
                    for (const mapping of groupMappings) {
                        const permission = await this.storage.getPermission(mapping.permissionId);
                        if (permission && permission.isActive) {
                            groupPermissions.add(permission.name);
                        }
                    }
                }
            }
            // Get direct permissions
            const directPermissions = await this.storage.getUserDirectPermissions(userId);
            const directPermissionNames = new Set();
            for (const directPerm of directPermissions) {
                const permission = await this.storage.getPermission(directPerm.permissionId);
                if (permission && permission.isActive) {
                    if (directPerm.isGranted) {
                        directPermissionNames.add(permission.name);
                    }
                    else {
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
        }
        catch (error) {
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
    async getPermissionGroupWithPermissions(groupId) {
        try {
            const group = await this.storage.getPermissionGroup(groupId);
            if (!group)
                return null;
            const mappings = await this.storage.getPermissionGroupMappings?.(groupId) ?? [];
            const permissions = [];
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
        }
        catch (error) {
            console.error('Error getting permission group with permissions:', error);
            return null;
        }
    }
    /**
     * Create a new permission group
     */
    async createPermissionGroup(groupData) {
        try {
            const group = await this.storage.createPermissionGroup({
                name: groupData.name,
                description: groupData.description,
                createdBy: groupData.createdBy,
            });
            // Add permissions to the group
            if (groupData.permissionIds && groupData.permissionIds.length > 0) {
                for (const permissionId of groupData.permissionIds) {
                    await this.storage.createPermissionGroupMapping?.({
                        groupId: group.id,
                        permissionId,
                    });
                }
            }
            return group;
        }
        catch (error) {
            console.error('Error creating permission group:', error);
            throw error;
        }
    }
    /**
     * Update a permission group
     */
    async updatePermissionGroup(groupId, updates) {
        try {
            const group = await this.storage.getPermissionGroup(groupId);
            if (!group)
                return null;
            // Update group details
            const updatedGroup = await this.storage.updatePermissionGroup(groupId, updates);
            // Update permissions if provided
            if (updates.permissionIds !== undefined) {
                // Remove existing permissions
                await this.storage.deletePermissionGroupMappings?.(groupId);
                // Add new permissions
                for (const permissionId of updates.permissionIds) {
                    await this.storage.createPermissionGroupMapping?.({
                        groupId,
                        permissionId,
                    });
                }
            }
            return updatedGroup;
        }
        catch (error) {
            console.error('Error updating permission group:', error);
            throw error;
        }
    }
    /**
     * Assign a permission group to a user
     */
    async assignPermissionGroupToUser(userId, groupId, assignedBy) {
        try {
            // Check if user already has this group
            const existingAssignment = await this.storage.getUserPermissionGroup?.(userId, groupId);
            if (existingAssignment) {
                throw new Error('User already has this permission group');
            }
            return await this.storage.createUserPermissionGroup?.({
                userId,
                groupId,
                assignedBy,
            });
        }
        catch (error) {
            console.error('Error assigning permission group to user:', error);
            throw error;
        }
    }
    /**
     * Remove a permission group from a user
     */
    async removePermissionGroupFromUser(userId, groupId) {
        try {
            const assignment = await this.storage.getUserPermissionGroup?.(userId, groupId);
            if (!assignment) {
                return false;
            }
            await this.storage.deleteUserPermissionGroup?.(assignment.id);
            return true;
        }
        catch (error) {
            console.error('Error removing permission group from user:', error);
            throw error;
        }
    }
    /**
     * Grant a direct permission to a user
     */
    async grantDirectPermission(userId, permissionId, assignedBy) {
        try {
            // Check if permission already exists
            const existingPermission = await this.storage.getUserDirectPermission?.(userId, permissionId);
            if (existingPermission) {
                // Update existing permission
                return await this.storage.updateUserDirectPermission?.(existingPermission.id, {
                    isGranted: true,
                    assignedBy,
                });
            }
            return await this.storage.createUserDirectPermission?.({
                userId,
                permissionId,
                isGranted: true,
                assignedBy,
            });
        }
        catch (error) {
            console.error('Error granting direct permission:', error);
            throw error;
        }
    }
    /**
     * Deny a direct permission to a user
     */
    async denyDirectPermission(userId, permissionId, assignedBy) {
        try {
            // Check if permission already exists
            const existingPermission = await this.storage.getUserDirectPermission?.(userId, permissionId);
            if (existingPermission) {
                // Update existing permission
                return await this.storage.updateUserDirectPermission?.(existingPermission.id, {
                    isGranted: false,
                    assignedBy,
                });
            }
            return await this.storage.createUserDirectPermission?.({
                userId,
                permissionId,
                isGranted: false,
                assignedBy,
            });
        }
        catch (error) {
            console.error('Error denying direct permission:', error);
            throw error;
        }
    }
    /**
     * Remove a direct permission from a user
     */
    async removeDirectPermission(userId, permissionId) {
        try {
            const permission = await this.storage.getUserDirectPermission?.(userId, permissionId);
            if (!permission) {
                return false;
            }
            await this.storage.deleteUserDirectPermission?.(permission.id);
            return true;
        }
        catch (error) {
            console.error('Error removing direct permission:', error);
            throw error;
        }
    }
    /**
     * Get all permission groups
     */
    async getAllPermissionGroups() {
        try {
            return await this.storage.getAllPermissionGroups();
        }
        catch (error) {
            console.error('Error getting all permission groups:', error);
            return [];
        }
    }
    /**
     * Get all permissions
     */
    async getAllPermissions() {
        try {
            return await this.storage.getAllPermissions();
        }
        catch (error) {
            console.error('Error getting all permissions:', error);
            return [];
        }
    }
    /**
     * Get permissions by category
     */
    async getPermissionsByCategory(category) {
        try {
            return await this.storage.getPermissionsByCategory(category);
        }
        catch (error) {
            console.error('Error getting permissions by category:', error);
            return [];
        }
    }
    /**
     * Check if user has any of the specified permissions
     */
    async hasAnyPermission(userId, permissionNames) {
        try {
            const userPermissions = await this.getUserPermissions(userId);
            return permissionNames.some(permission => userPermissions.permissions.includes(permission));
        }
        catch (error) {
            console.error('Error checking any permission:', error);
            return false;
        }
    }
    /**
     * Check if user has all of the specified permissions
     */
    async hasAllPermissions(userId, permissionNames) {
        try {
            const userPermissions = await this.getUserPermissions(userId);
            return permissionNames.every(permission => userPermissions.permissions.includes(permission));
        }
        catch (error) {
            console.error('Error checking all permissions:', error);
            return false;
        }
    }
}
