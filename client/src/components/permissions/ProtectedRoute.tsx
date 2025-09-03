import React from 'react';
import { Redirect } from 'wouter';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { useAuth } from '@/contexts/AuthProvider';

interface ProtectedRouteProps {
  /**
   * The permission required to access the route
   */
  permission?: string;
  
  /**
   * Array of permissions where any one is required to access the route
   */
  anyPermissions?: string[];
  
  /**
   * Array of permissions where all are required to access the route
   */
  allPermissions?: string[];
  
  /**
   * Resource and action pair for permission check
   */
  resource?: string;
  action?: string;
  
  /**
   * Where to redirect if permission check fails
   * Default: /dashboard
   */
  redirectTo?: string;
  
  /**
   * Content to render when permission is granted
   */
  children: React.ReactNode;
}

/**
 * Component that protects routes based on user permissions
 * Redirects to fallback route if user doesn't have required permissions
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  permission,
  anyPermissions,
  allPermissions,
  resource,
  action,
  redirectTo = '/dashboard',
  children 
}) => {
  const { user } = useAuth();
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions, 
    hasResourcePermission,
    permissionGroups,
    loading 
  } = useUserPermissions();
  
  // Admin users have access to everything
  if (user?.role === 'admin') {
    return <>{children}</>;
  }
  
  // While loading, show nothing to prevent flickering
  if (loading) return null;
  
  // Check permissions based on props provided
  let hasAccess = false;
  
  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (anyPermissions && anyPermissions.length > 0) {
    hasAccess = hasAnyPermission(anyPermissions);
  } else if (allPermissions && allPermissions.length > 0) {
    hasAccess = hasAllPermissions(allPermissions);
  } else if (resource && action) {
    hasAccess = hasResourcePermission(resource, action);
  } else {
    // If no permission checks are specified, allow access
    hasAccess = true;
  }
  
  // Debug logging for appointments route
  if (anyPermissions?.includes('view_appointments') || anyPermissions?.includes('view_calendar')) {
    console.log('ProtectedRoute (Appointments) check:', {
      user: user?.username,
      role: user?.role,
      anyPermissions,
      hasAccess,
      loading,
      permissionGroups: permissionGroups?.map(g => g.name)
    });
  }
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  // Redirect if permission check fails
  return <Redirect to={redirectTo} />;
};

export default ProtectedRoute;
