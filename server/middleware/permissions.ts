import { Request, Response, NextFunction } from 'express';
import { PermissionsService } from '../services/permissions';
import { IStorage } from '../storage';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

/**
 * Middleware to check if user has a specific permission
 */
export function requirePermission(permissionName: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'AuthenticationError',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
      }

      const storage = req.app.locals.storage as IStorage;
      const permissionsService = new PermissionsService(storage);
      
      const hasPermission = await permissionsService.hasPermission(req.user.id, permissionName);
      
      if (!hasPermission) {
        return res.status(403).json({
          error: 'AuthorizationError',
          message: `Permission '${permissionName}' required`,
          timestamp: new Date().toISOString(),
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Permission check failed',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Middleware to check if user has permission for a specific resource and action
 */
export function requireResourcePermission(resource: string, action: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'AuthenticationError',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
      }

      const storage = req.app.locals.storage as IStorage;
      const permissionsService = new PermissionsService(storage);
      
      const hasPermission = await permissionsService.hasResourcePermission(req.user.id, resource, action);
      
      if (!hasPermission) {
        return res.status(403).json({
          error: 'AuthorizationError',
          message: `Permission '${action}_${resource}' required`,
          timestamp: new Date().toISOString(),
        });
      }

      next();
    } catch (error) {
      console.error('Resource permission check error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Permission check failed',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Middleware to check if user has any of the specified permissions
 */
export function requireAnyPermission(permissionNames: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'AuthenticationError',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
      }

      const storage = req.app.locals.storage as IStorage;
      const permissionsService = new PermissionsService(storage);
      
      const hasAnyPermission = await permissionsService.hasAnyPermission(req.user.id, permissionNames);
      
      if (!hasAnyPermission) {
        return res.status(403).json({
          error: 'AuthorizationError',
          message: `One of the following permissions required: ${permissionNames.join(', ')}`,
          timestamp: new Date().toISOString(),
        });
      }

      next();
    } catch (error) {
      console.error('Any permission check error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Permission check failed',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Middleware to check if user has all of the specified permissions
 */
export function requireAllPermissions(permissionNames: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'AuthenticationError',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
      }

      const storage = req.app.locals.storage as IStorage;
      const permissionsService = new PermissionsService(storage);
      
      const hasAllPermissions = await permissionsService.hasAllPermissions(req.user.id, permissionNames);
      
      if (!hasAllPermissions) {
        return res.status(403).json({
          error: 'AuthorizationError',
          message: `All of the following permissions required: ${permissionNames.join(', ')}`,
          timestamp: new Date().toISOString(),
        });
      }

      next();
    } catch (error) {
      console.error('All permissions check error:', error);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Permission check failed',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Middleware to check if user is admin (bypasses permission checks)
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'AuthenticationError',
      message: 'Authentication required',
      timestamp: new Date().toISOString(),
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'AuthorizationError',
      message: 'Admin access required',
      timestamp: new Date().toISOString(),
    });
  }

  next();
}

/**
 * Middleware to check if user is staff or admin
 */
export function requireStaffOrAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'AuthenticationError',
      message: 'Authentication required',
      timestamp: new Date().toISOString(),
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'staff') {
    return res.status(403).json({
      error: 'AuthorizationError',
      message: 'Staff or admin access required',
      timestamp: new Date().toISOString(),
    });
  }

  next();
}

/**
 * Helper function to get user permissions for use in route handlers
 */
export async function getUserPermissions(req: AuthenticatedRequest): Promise<string[]> {
  if (!req.user) {
    return [];
  }

  try {
    const storage = req.app.locals.storage as IStorage;
    const permissionsService = new PermissionsService(storage);
    const userPermissions = await permissionsService.getUserPermissions(req.user.id);
    return userPermissions.permissions;
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

/**
 * Helper function to check if user has permission (for use in route handlers)
 */
export async function checkPermission(req: AuthenticatedRequest, permissionName: string): Promise<boolean> {
  if (!req.user) {
    return false;
  }

  try {
    const storage = req.app.locals.storage as IStorage;
    const permissionsService = new PermissionsService(storage);
    return await permissionsService.hasPermission(req.user.id, permissionName);
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
} 