import { db } from "../db";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { permissions, permissionGroups, permissionGroupMappings, userPermissionGroups } from "@shared/schema";

export class PermissionsStorage {
  async getAllPermissions() {
    try {
      const result = await db.select().from(permissions);
      return result;
    } catch (error) {
      console.error('Error getting all permissions:', error);
      throw error;
    }
  }

  async getAllPermissionGroups() {
    try {
      const result = await db.select().from(permissionGroups);
      return result;
    } catch (error) {
      console.error('Error getting all permission groups:', error);
      throw error;
    }
  }

  async createPermissionGroup(data: any) {
    try {
      const { name, description, permissionIds } = data;

      // Create the permission group
      const [group] = await db.insert(permissionGroups)
        .values({
          name,
          description,
          isActive: true,
          isSystem: false,
        })
        .returning();

      // Assign permissions to the group
      if (permissionIds && permissionIds.length > 0) {
        await Promise.all(permissionIds.map(async (permissionId: number) => {
          await db.insert(permissionGroupMappings)
            .values({
              groupId: group.id,
              permissionId,
            })
            .onConflictDoNothing();
        }));
      }

      return group;
    } catch (error) {
      console.error('Error creating permission group:', error);
      throw error;
    }
  }

  async updatePermissionGroup(id: number, data: any) {
    try {
      const { name, description, permissionIds } = data;

      // Update the permission group
      const [group] = await db.update(permissionGroups)
        .set({
          name,
          description,
          updatedAt: new Date(),
        })
        .where(eq(permissionGroups.id, id))
        .returning();

      // If permissionIds is provided, update the group's permissions
      if (permissionIds) {
        // First, remove all existing mappings
        await db.delete(permissionGroupMappings)
          .where(eq(permissionGroupMappings.groupId, id));

        // Then, add the new mappings
        await Promise.all(permissionIds.map(async (permissionId: number) => {
          await db.insert(permissionGroupMappings)
            .values({
              groupId: id,
              permissionId,
            })
            .onConflictDoNothing();
        }));
      }

      return group;
    } catch (error) {
      console.error('Error updating permission group:', error);
      throw error;
    }
  }

  async deletePermissionGroup(id: number) {
    try {
      // Delete all permission mappings for this group
      await db.delete(permissionGroupMappings)
        .where(eq(permissionGroupMappings.groupId, id));

      // Delete all user assignments to this group
      await db.delete(userPermissionGroups)
        .where(eq(userPermissionGroups.groupId, id));

      // Delete the group itself
      await db.delete(permissionGroups)
        .where(eq(permissionGroups.id, id));
    } catch (error) {
      console.error('Error deleting permission group:', error);
      throw error;
    }
  }

  async getUserPermissions(userId: number) {
    try {
      // Get user's permission groups
      const groups = await db.select({
        id: permissionGroups.id,
        name: permissionGroups.name,
        description: permissionGroups.description,
        isActive: permissionGroups.isActive,
        isSystem: permissionGroups.isSystem,
      })
      .from(userPermissionGroups)
      .innerJoin(permissionGroups, eq(userPermissionGroups.groupId, permissionGroups.id))
      .where(eq(userPermissionGroups.userId, userId));

      // Get all permissions from these groups
      const groupPermissions = await db.select({
        name: permissions.name,
      })
      .from(permissionGroupMappings)
      .innerJoin(permissions, eq(permissionGroupMappings.permissionId, permissions.id))
      .where(sql`${permissionGroupMappings.groupId} IN (${groups.map(g => g.id).join(', ')})`);

      // Get user's direct permissions
      const directPermissions = await this.getUserDirectPermissions(userId);

      return {
        userId,
        groups,
        permissions: [...new Set([
          ...groupPermissions.map(p => p.name),
          ...directPermissions.map(p => p.name),
        ])],
        directPermissions,
      };
    } catch (error) {
      console.error('Error getting user permissions:', error);
      throw error;
    }
  }

  async assignPermissionGroupToUser(userId: number, groupId: number) {
    try {
      await db.insert(userPermissionGroups)
        .values({
          userId,
          groupId,
        })
        .onConflictDoNothing();
    } catch (error) {
      console.error('Error assigning permission group to user:', error);
      throw error;
    }
  }

  // Existing methods...
  async getUserDirectPermissions(userId: number) {
    try {
      const result = await db.select()
        .from(permissions)
        .where(sql`id IN (SELECT permission_id FROM user_direct_permissions WHERE user_id = ${userId})`);
      return result;
    } catch (error) {
      console.error('Error getting user direct permissions:', error);
      throw error;
    }
  }

  async getUserDirectPermission(userId: number, permissionId: number) {
    try {
      const [result] = await db.select()
        .from(permissions)
        .where(sql`id = ${permissionId} AND id IN (SELECT permission_id FROM user_direct_permissions WHERE user_id = ${userId})`);
      return result || null;
    } catch (error) {
      console.error('Error getting user direct permission:', error);
      throw error;
    }
  }

  async createUserDirectPermission(data: any) {
    try {
      const { userId, permissionId } = data;
      await db.execute(sql`
        INSERT INTO user_direct_permissions (user_id, permission_id)
        VALUES (${userId}, ${permissionId})
        ON CONFLICT (user_id, permission_id) DO NOTHING
      `);
      return this.getUserDirectPermission(userId, permissionId);
    } catch (error) {
      console.error('Error creating user direct permission:', error);
      throw error;
    }
  }

  async updateUserDirectPermission(id: number, data: any) {
    try {
      const { isGranted } = data;
      await db.execute(sql`
        UPDATE user_direct_permissions
        SET is_granted = ${isGranted}
        WHERE id = ${id}
      `);
      return this.getUserDirectPermission(data.userId, data.permissionId);
    } catch (error) {
      console.error('Error updating user direct permission:', error);
      throw error;
    }
  }

  async deleteUserDirectPermission(id: number) {
    try {
      await db.execute(sql`
        DELETE FROM user_direct_permissions
        WHERE id = ${id}
      `);
    } catch (error) {
      console.error('Error deleting user direct permission:', error);
      throw error;
    }
  }
}