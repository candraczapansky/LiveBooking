import type { Express, Request, Response } from "express";
import { z } from "zod";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
import { asyncHandler } from "../utils/errors.js";
import { db } from "../db.js";
import { eq, inArray, and } from "drizzle-orm";
import {
  permissions as permissionsTable,
  permissionGroups as permissionGroupsTable,
  permissionGroupMappings as permissionGroupMappingsTable,
  userPermissionGroups as userPermissionGroupsTable,
  userDirectPermissions as userDirectPermissionsTable,
} from "../../shared/schema.js";

export function registerPermissionRoutes(app: Express) {
  console.log("🔐 Registering permission routes");
  // Get all permissions
  app.get("/api/permissions", 
    authenticateToken,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        res.set("Cache-Control", "no-store");
        const permissions = await db.select().from(permissionsTable);
        res.json({
          success: true,
          data: permissions
        });
      } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch permissions",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  );

  // Get all permission groups
  app.get("/api/permission-groups",
    authenticateToken,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        res.set("Cache-Control", "no-store");
        // Fetch all groups
        const groups = await db.select().from(permissionGroupsTable);

        // Fetch all mappings with permissions in a single query
        const mappingRows = await db
          .select({
            groupId: permissionGroupMappingsTable.groupId,
            id: permissionsTable.id,
            name: permissionsTable.name,
            description: permissionsTable.description,
            category: permissionsTable.category,
            action: permissionsTable.action,
            resource: permissionsTable.resource,
            isActive: permissionsTable.isActive,
            isSystem: permissionsTable.isSystem,
          })
          .from(permissionGroupMappingsTable)
          .leftJoin(
            permissionsTable,
            eq(permissionGroupMappingsTable.permissionId, permissionsTable.id)
          );

        // Group permissions by groupId
        const groupIdToPermissions: Record<number, any[]> = {};
        for (const row of mappingRows) {
          if (!row.id) continue; // skip if no permission joined
          const arr = groupIdToPermissions[row.groupId] || (groupIdToPermissions[row.groupId] = []);
          arr.push({
            id: row.id,
            name: row.name,
            description: row.description,
            category: row.category,
            action: row.action,
            resource: row.resource,
            isActive: row.isActive,
            isSystem: row.isSystem,
          });
        }

        // Attach permissions to each group
        const groupsWithPermissions = groups.map((g) => ({
          ...g,
          permissions: groupIdToPermissions[g.id] || [],
        }));

        res.json({
          success: true,
          data: groupsWithPermissions,
        });
      } catch (error) {
        console.error('Error fetching permission groups:', error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch permission groups",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  );

  // Create permission group
  app.post("/api/permission-groups",
    authenticateToken,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { name, description, permissionIds } = req.body;
        const [group] = await db.insert(permissionGroupsTable)
          .values({ name, description, isActive: true, isSystem: false })
          .returning();

        if (Array.isArray(permissionIds)) {
          for (const permissionId of permissionIds) {
            try {
              await db.insert(permissionGroupMappingsTable)
                .values({ groupId: group.id, permissionId });
            } catch (_) {}
          }
        }
        res.json({
          success: true,
          data: group
        });
      } catch (error) {
        console.error('Error creating permission group:', error);
        res.status(500).json({
          success: false,
          message: "Failed to create permission group",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  );

  // Update permission group
  app.put("/api/permission-groups/:id",
    authenticateToken,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const groupId = parseInt(req.params.id);
        const { name, description, permissionIds } = req.body;
        const [group] = await db.update(permissionGroupsTable)
          .set({ name, description })
          .where(eq(permissionGroupsTable.id, groupId))
          .returning();

        if (Array.isArray(permissionIds)) {
          await db.delete(permissionGroupMappingsTable)
            .where(eq(permissionGroupMappingsTable.groupId, groupId));
          for (const permissionId of permissionIds) {
            try {
              await db.insert(permissionGroupMappingsTable)
                .values({ groupId, permissionId });
            } catch (_) {}
          }
        }
        // Return updated group with its permissions
        const updatedPermissions = await db
          .select({
            id: permissionsTable.id,
            name: permissionsTable.name,
            description: permissionsTable.description,
            category: permissionsTable.category,
            action: permissionsTable.action,
            resource: permissionsTable.resource,
            isActive: permissionsTable.isActive,
            isSystem: permissionsTable.isSystem,
          })
          .from(permissionGroupMappingsTable)
          .leftJoin(
            permissionsTable,
            eq(permissionGroupMappingsTable.permissionId, permissionsTable.id)
          )
          .where(eq(permissionGroupMappingsTable.groupId, groupId));

        res.json({
          success: true,
          data: { ...group, permissions: updatedPermissions.filter(p => p.id) },
        });
      } catch (error) {
        console.error('Error updating permission group:', error);
        res.status(500).json({
          success: false,
          message: "Failed to update permission group",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  );

  // Delete permission group
  app.delete("/api/permission-groups/:id",
    authenticateToken,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const groupId = parseInt(req.params.id);
        await db.delete(permissionGroupMappingsTable)
          .where(eq(permissionGroupMappingsTable.groupId, groupId));
        await db.delete(userPermissionGroupsTable)
          .where(eq(userPermissionGroupsTable.groupId, groupId));
        await db.delete(permissionGroupsTable)
          .where(eq(permissionGroupsTable.id, groupId));
        res.json({
          success: true,
          message: "Permission group deleted successfully"
        });
      } catch (error) {
        console.error('Error deleting permission group:', error);
        res.status(500).json({
          success: false,
          message: "Failed to delete permission group",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  );

  // Get user permissions
  app.get("/api/users/:id/permissions",
    authenticateToken,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        res.set("Cache-Control", "no-store");
        const userId = parseInt(req.params.id);
        // Fetch groups assigned to the user with basic fields
        const userGroups = await db
          .select({
            id: permissionGroupsTable.id,
            name: permissionGroupsTable.name,
            description: permissionGroupsTable.description,
            isActive: permissionGroupsTable.isActive,
            isSystem: permissionGroupsTable.isSystem,
          })
          .from(userPermissionGroupsTable)
          .leftJoin(
            permissionGroupsTable,
            eq(userPermissionGroupsTable.groupId, permissionGroupsTable.id)
          )
          .where(eq(userPermissionGroupsTable.userId, userId));

        const groupIds = userGroups.map(g => g.id).filter(Boolean) as number[];

        // Aggregate permission names from assigned groups
        const permissionNameSet = new Set<string>();
        if (groupIds.length > 0) {
          const rows = await db
            .select({ name: permissionsTable.name })
            .from(permissionGroupMappingsTable)
            .leftJoin(
              permissionsTable,
              eq(permissionGroupMappingsTable.permissionId, permissionsTable.id)
            )
            .where(inArray(permissionGroupMappingsTable.groupId, groupIds));
          for (const r of rows) {
            if (r.name) permissionNameSet.add(r.name);
          }
        }

        // Fetch direct permissions (grants/denies) for the user
        const directPermRows = await db
          .select({
            id: userDirectPermissionsTable.id,
            permissionId: userDirectPermissionsTable.permissionId,
            isGranted: userDirectPermissionsTable.isGranted,
            name: permissionsTable.name,
            description: permissionsTable.description,
            category: permissionsTable.category,
            action: permissionsTable.action,
            resource: permissionsTable.resource,
          })
          .from(userDirectPermissionsTable)
          .leftJoin(
            permissionsTable,
            eq(userDirectPermissionsTable.permissionId, permissionsTable.id)
          )
          .where(eq(userDirectPermissionsTable.userId, userId));

        // Apply direct permission overrides
        for (const dp of directPermRows) {
          const permName = dp.name;
          if (!permName) continue;
          if (dp.isGranted) permissionNameSet.add(permName);
          else permissionNameSet.delete(permName);
        }

        res.json({
          success: true,
          data: {
            userId,
            groups: userGroups.filter(g => g.id),
            permissions: Array.from(permissionNameSet),
            directPermissions: directPermRows.filter(r => r.permissionId),
          },
        });
      } catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch user permissions",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  );

  // Assign permission group to user
  app.post("/api/users/:id/permission-groups",
    authenticateToken,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const { groupId } = req.body;
        await db.insert(userPermissionGroupsTable).values({ userId, groupId }).onConflictDoNothing();
        // Return current groups for confirmation
        const groups = await db
          .select({
            id: permissionGroupsTable.id,
            name: permissionGroupsTable.name,
            description: permissionGroupsTable.description,
            isActive: permissionGroupsTable.isActive,
            isSystem: permissionGroupsTable.isSystem,
          })
          .from(userPermissionGroupsTable)
          .leftJoin(
            permissionGroupsTable,
            eq(userPermissionGroupsTable.groupId, permissionGroupsTable.id)
          )
          .where(eq(userPermissionGroupsTable.userId, userId));
        res.json({ success: true, data: { userId, groups: groups.filter(g => g.id) } });
      } catch (error) {
        console.error('Error assigning permission group:', error);
        res.status(500).json({
          success: false,
          message: "Failed to assign permission group",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  );

  // Remove permission group from user
  app.delete("/api/users/:id/permission-groups/:groupId",
    authenticateToken,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const groupId = parseInt(req.params.groupId);
        await db.delete(userPermissionGroupsTable)
          .where(
            and(
              eq(userPermissionGroupsTable.userId, userId),
              eq(userPermissionGroupsTable.groupId, groupId)
            )
          );
        res.json({
          success: true,
          message: "Permission group removed from user"
        });
      } catch (error) {
        console.error('Error removing permission group from user:', error);
        res.status(500).json({
          success: false,
          message: "Failed to remove permission group from user",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  );

  // Grant or deny a direct permission to a user
  app.post("/api/users/:id/direct-permissions",
    authenticateToken,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const { permissionId, isGranted } = req.body || {};
        if (!permissionId || Number.isNaN(Number(permissionId))) {
          return res.status(400).json({ success: false, message: "permissionId is required" });
        }

        // Upsert behavior: update existing row or insert new
        const existing = await db
          .select({ id: userDirectPermissionsTable.id })
          .from(userDirectPermissionsTable)
          .where(
            and(
              eq(userDirectPermissionsTable.userId, userId),
              eq(userDirectPermissionsTable.permissionId, Number(permissionId))
            )
          );

        if (existing[0]?.id) {
          await db
            .update(userDirectPermissionsTable)
            .set({ isGranted: isGranted === false ? false : true })
            .where(eq(userDirectPermissionsTable.id, existing[0].id));
        } else {
          await db
            .insert(userDirectPermissionsTable)
            .values({
              userId,
              permissionId: Number(permissionId),
              isGranted: isGranted === false ? false : true,
            } as any)
            .onConflictDoNothing();
        }

        res.json({ success: true });
      } catch (error) {
        console.error('Error setting direct permission:', error);
        res.status(500).json({
          success: false,
          message: "Failed to set direct permission",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  );

  // Remove a direct permission from a user
  app.delete("/api/users/:id/direct-permissions/:permissionId",
    authenticateToken,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const permissionId = parseInt(req.params.permissionId);

        await db
          .delete(userDirectPermissionsTable)
          .where(
            and(
              eq(userDirectPermissionsTable.userId, userId),
              eq(userDirectPermissionsTable.permissionId, permissionId)
            )
          );

        res.json({ success: true, message: "Direct permission removed" });
      } catch (error) {
        console.error('Error removing direct permission:', error);
        res.status(500).json({
          success: false,
          message: "Failed to remove direct permission",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    })
  );
}