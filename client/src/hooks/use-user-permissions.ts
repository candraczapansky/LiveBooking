import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { apiRequest } from '@/lib/queryClient';

export interface UserPermissions {
  userId: number;
  permissions: string[];
  groups: {
    id: number;
    name: string;
    description: string;
    isActive: boolean;
    isSystem: boolean;
  }[];
  directPermissions: {
    id: number;
    permissionId: number;
    isGranted: boolean;
    name: string;
    description: string;
    category: string;
    action: string;
    resource: string;
  }[];
}

/**
 * Hook to fetch and manage the current logged-in user's permissions
 */
export function useUserPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<UserPermissions['groups']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [directPermissions, setDirectPermissions] = useState<UserPermissions['directPermissions']>([]);

  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!user) {
        setPermissions([]);
        setPermissionGroups([]);
        setDirectPermissions([]);
        setLoading(false);
        return;
      }

      // Check for cached permissions to avoid unnecessary API calls
      const cachedPermissionsStr = localStorage.getItem(`permissions_${user.id}`);
      const cachedPermissionsTimestamp = localStorage.getItem(`permissions_${user.id}_timestamp`);
      const now = Date.now();
      const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
      
      // For Basic Staff users, always fetch fresh permissions to avoid caching issues
      const isBasicStaffUser = user.role === 'staff' && user.permissionGroups?.some((group: any) => 
        group.name.toLowerCase().includes('basic')
      );
      
      if (isBasicStaffUser) {
        console.log('useUserPermissions: Clearing cache for Basic Staff user to ensure fresh permissions');
        localStorage.removeItem(`permissions_${user.id}`);
        localStorage.removeItem(`permissions_${user.id}_timestamp`);
      }
      
      // Use cached permissions if available and not expired (and not Basic Staff)
      if (!isBasicStaffUser && cachedPermissionsStr && cachedPermissionsTimestamp && 
          (now - parseInt(cachedPermissionsTimestamp)) < CACHE_TTL) {
        try {
          const cachedData = JSON.parse(cachedPermissionsStr);
          setPermissions(cachedData.permissions || []);
          setPermissionGroups(cachedData.groups || []);
          setDirectPermissions(cachedData.directPermissions || []);
          setLoading(false);
          return;
        } catch (e) {
          console.error('Error parsing cached permissions:', e);
          // Fall through to fetch fresh data if parsing fails
        }
      }

      try {
        setLoading(true);
        setError(null);
        const response = await apiRequest('GET', `/api/users/${user.id}/permissions`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch user permissions: ${response.statusText}`);
        }
        
        const data = await response.json();
        const userPermissions = data.data as UserPermissions;
        
        setPermissions(userPermissions.permissions || []);
        setPermissionGroups(userPermissions.groups || []);
        setDirectPermissions(userPermissions.directPermissions || []);
        
            // Debug logging for Basic Staff permissions
    if (userPermissions.groups?.some(g => g.name.toLowerCase().includes('basic'))) {
      console.log('Basic Staff user permissions:', {
        userId: user.id,
        permissions: userPermissions.permissions,
        groups: userPermissions.groups,
        directPermissions: userPermissions.directPermissions
      });
      console.log('Full permissions array:', userPermissions.permissions);
      
      // Clear any cached permissions to force fresh data
      try {
        localStorage.removeItem(`permissions_${user.id}`);
        localStorage.removeItem(`permissions_${user.id}_timestamp`);
        console.log('Cleared cached permissions for user', user.id);
      } catch (e) {
        console.error('Error clearing cache:', e);
      }
    }
        
        // Cache the permissions
        try {
          localStorage.setItem(`permissions_${user.id}`, JSON.stringify(userPermissions));
          localStorage.setItem(`permissions_${user.id}_timestamp`, now.toString());
        } catch (e) {
          console.error('Error caching permissions:', e);
        }
      } catch (err) {
        console.error('Error fetching user permissions:', err);
        setError(err instanceof Error ? err : new Error('Unknown error fetching permissions'));
        setPermissions([]);
        setPermissionGroups([]);
        setDirectPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserPermissions();
  }, [user]);

  /**
   * Check if the user has a specific permission
   */
  const hasPermission = (permissionName: string): boolean => {
    // Admin users have all permissions
    if (user?.role === 'admin') return true;
    
    const hasIt = permissions.includes(permissionName);
    
    // Debug logging for Basic Staff users
    if (permissionGroups?.some(g => g.name.toLowerCase().includes('basic'))) {
      console.log(`hasPermission('${permissionName}'): ${hasIt}`, {
        userPermissions: permissions,
        userRole: user?.role,
        permissionGroups: permissionGroups
      });
    }
    
    return hasIt;
  };

  /**
   * Check if the user has any of the provided permissions
   */
  const hasAnyPermission = (permissionNames: string[]): boolean => {
    // Admin users have all permissions
    if (user?.role === 'admin') return true;
    
    const hasAny = permissionNames.some(name => permissions.includes(name));
    
    // Debug logging for Basic Staff users
    if (permissionGroups?.some(g => g.name.toLowerCase().includes('basic'))) {
      console.log(`hasAnyPermission([${permissionNames.join(', ')}]): ${hasAny}`, {
        userPermissions: permissions,
        userRole: user?.role,
        permissionGroups: permissionGroups,
        matchingPermissions: permissionNames.filter(name => permissions.includes(name))
      });
    }
    
    return hasAny;
  };

  /**
   * Check if the user has all of the provided permissions
   */
  const hasAllPermissions = (permissionNames: string[]): boolean => {
    // Admin users have all permissions
    if (user?.role === 'admin') return true;
    
    return permissionNames.every(name => permissions.includes(name));
  };

  /**
   * Check if the user has permission for a specific resource and action
   */
  const hasResourcePermission = (resource: string, action: string): boolean => {
    // Admin users have all permissions
    if (user?.role === 'admin') return true;
    
    const permissionName = `${action}_${resource}`;
    return permissions.includes(permissionName);
  };

  return {
    permissions,
    permissionGroups,
    directPermissions,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasResourcePermission,
  };
}

