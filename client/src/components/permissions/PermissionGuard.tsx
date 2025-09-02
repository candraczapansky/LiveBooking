import React, { useMemo, memo } from 'react';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useAuth } from '@/contexts/AuthProvider';

interface PermissionGuardProps {
  /**
   * The permission required to render children
   */
  permission?: string;
  
  /**
   * Array of permissions where any one is required
   */
  anyPermissions?: string[];
  
  /**
   * Array of permissions where all are required
   */
  allPermissions?: string[];
  
  /**
   * Resource and action pair
   */
  resource?: string;
  action?: string;
  
  /**
   * If true, content will be rendered as a placeholder when permission is denied
   * If false (default), nothing will be rendered
   */
  fallback?: React.ReactNode;
  
  /**
   * Content to render when permission is granted
   */
  children: React.ReactNode;
}

/**
 * Component that conditionally renders its children based on user permissions
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = memo(({ 
  permission,
  anyPermissions,
  allPermissions,
  resource,
  action,
  fallback = null,
  children 
}) => {
  const { user } = useAuth();
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions, 
    hasResourcePermission,
    loading 
  } = useUserPermissions();

  // Calculate access status with memoization to avoid recalculation on every render
  const hasAccess = useMemo(() => {
    // Admin users have access to everything
    if (user?.role === 'admin') {
      return true;
    }
    
    // While loading, assume no access (will be updated once loading completes)
    if (loading) {
      return false;
    }
    
    // Check permissions based on props provided
    if (permission) {
      return hasPermission(permission);
    } else if (anyPermissions && anyPermissions.length > 0) {
      return hasAnyPermission(anyPermissions);
    } else if (allPermissions && allPermissions.length > 0) {
      return hasAllPermissions(allPermissions);
    } else if (resource && action) {
      return hasResourcePermission(resource, action);
    } else {
      // If no permission checks are specified, allow access
      return true;
    }
  }, [
    user?.role,
    loading,
    permission,
    anyPermissions,
    allPermissions,
    resource,
    action,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasResourcePermission
  ]);
  
  // While loading, don't render anything to avoid flashing
  if (loading) return null;
  
  // Return children if access granted, otherwise fallback or null
  return hasAccess ? <>{children}</> : (fallback ? <>{fallback}</> : null);
});

export default PermissionGuard;
