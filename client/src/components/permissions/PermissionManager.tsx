import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiRequest } from '@/lib/queryClient';
import { 
  Users, 
  Shield, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  EyeOff,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface Permission {
  id: number;
  name: string;
  description: string;
  category: string;
  action: string;
  resource: string;
  isActive: boolean;
  isSystem: boolean;
}

interface PermissionGroup {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  isSystem: boolean;
  permissions?: Permission[];
}

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface UserPermissions {
  userId: number;
  permissions: string[];
  groups: PermissionGroup[];
  directPermissions: any[];
}

const PermissionManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('groups');
  const [selectedGroup, setSelectedGroup] = useState<PermissionGroup | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [isAssignGroupOpen, setIsAssignGroupOpen] = useState(false);
  const [selectedCreatePermIds, setSelectedCreatePermIds] = useState<Set<number>>(new Set());
  const [selectedEditPermIds, setSelectedEditPermIds] = useState<Set<number>>(new Set());
  const [assignGroupId, setAssignGroupId] = useState<string>("");

  // Fetch permissions
  const { data: permissions, isLoading: permissionsLoading, error: permissionsError } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/permissions');
        if (!response.ok) {
          throw new Error(`Failed to fetch permissions: ${response.statusText}`);
        }
        const data = await response.json();
        return data.data as Permission[];
      } catch (error) {
        console.error('Error fetching permissions:', error);
        throw error;
      }
    },
    retry: 1,
  });

  // Fetch permission groups
  const { data: groups, isLoading: groupsLoading, error: groupsError } = useQuery({
    queryKey: ['permission-groups'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/permission-groups');
        if (!response.ok) {
          throw new Error(`Failed to fetch permission groups: ${response.statusText}`);
        }
        const data = await response.json();
        return data.data as PermissionGroup[];
      } catch (error) {
        console.error('Error fetching permission groups:', error);
        throw error;
      }
    },
    retry: 1,
  });

  // Fetch users
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/users');
        if (!response.ok) {
          throw new Error(`Failed to fetch users: ${response.statusText}`);
        }
        const data = await response.json();
        return (Array.isArray(data) ? data : (data.data as User[])) || [];
      } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
    },
    retry: 1,
  });

  // Fetch user permissions
  const { data: userPermissions, isLoading: userPermissionsLoading, error: userPermissionsError } = useQuery({
    queryKey: ['user-permissions', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return null;
      try {
        const response = await apiRequest('GET', `/api/users/${selectedUser.id}/permissions`);
        if (!response.ok) {
          throw new Error(`Failed to fetch user permissions: ${response.statusText}`);
        }
        const data = await response.json();
        return data.data as UserPermissions;
      } catch (error) {
        console.error('Error fetching user permissions:', error);
        throw error;
      }
    },
    enabled: !!selectedUser,
    retry: 1,
  });

  // Create permission group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: {
      name: string;
      description?: string;
      permissionIds: number[];
    }) => {
      const response = await apiRequest('POST', '/api/permission-groups', groupData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-groups'] });
      setIsCreateGroupOpen(false);
    },
  });

  // Update permission group mutation
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest('PUT', `/api/permission-groups/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-groups'] });
      setIsEditGroupOpen(false);
    },
  });

  // Assign permission group to user mutation
  const assignGroupMutation = useMutation({
    mutationFn: async ({ userId, groupId }: { userId: number; groupId: number }) => {
      const response = await apiRequest('POST', `/api/users/${userId}/permission-groups`, { groupId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      setIsAssignGroupOpen(false);
    },
  });

  // Group permissions by category
  const permissionsByCategory = permissions?.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>) || {};

  const handleCreateGroup = (formData: FormData) => {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const selectedPermissions = Array.from(selectedCreatePermIds);

    createGroupMutation.mutate({
      name,
      description,
      permissionIds: selectedPermissions,
    });
  };

  const handleUpdateGroup = (formData: FormData) => {
    if (!selectedGroup) return;

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const selectedPermissions = Array.from(selectedEditPermIds);

    updateGroupMutation.mutate({
      id: selectedGroup.id,
      data: {
        name,
        description,
        permissionIds: selectedPermissions,
      },
    });
  };

  const handleAssignGroup = (formData: FormData) => {
    if (!selectedUser) return;

    const groupIdRaw = formData.get('groupId');
    const groupId = groupIdRaw ? Number(groupIdRaw) : NaN;
    if (!groupId || Number.isNaN(groupId)) {
      return;
    }

    assignGroupMutation.mutate({
      userId: selectedUser.id,
      groupId,
    });
  };

  // Initialize edit selections when opening the dialog
  useEffect(() => {
    if (isEditGroupOpen && selectedGroup) {
      setSelectedEditPermIds(new Set((selectedGroup.permissions || []).map(p => p.id)));
    }
  }, [isEditGroupOpen, selectedGroup]);

  // Reset create selections when opening create dialog
  useEffect(() => {
    if (isCreateGroupOpen) {
      setSelectedCreatePermIds(new Set());
    }
  }, [isCreateGroupOpen]);

  // Show loading state (after all hooks are declared to preserve hook order)
  if (permissionsLoading || groupsLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  // Show error states
  if (permissionsError || groupsError || usersError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <XCircle className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Permissions</h3>
          <p className="text-sm text-gray-600 mb-4">
            {permissionsError?.message || groupsError?.message || usersError?.message || 'An error occurred while loading permissions.'}
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Permission Management</h1>
          <p className="text-gray-600">
            Manage user permissions and access levels
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setIsCreateGroupOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Group
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="groups">Permission Groups</TabsTrigger>
          <TabsTrigger value="users">User Permissions</TabsTrigger>
          <TabsTrigger value="permissions">All Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permission Groups</CardTitle>
              <CardDescription>
                Manage permission groups and their assigned permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groups?.map((group) => (
                  <Card key={group.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        {group.isSystem && (
                          <Badge variant="secondary">System</Badge>
                        )}
                      </div>
                      <CardDescription>{group.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Selected permissions ({group.permissions?.length || 0})</div>
                          {group.permissions && group.permissions.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {group.permissions.map((p) => (
                                <Badge key={p.id} variant="outline">{p.name}</Badge>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">No permissions assigned</div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedGroup(group);
                              setSelectedEditPermIds(new Set((group.permissions || []).map(p => p.id)));
                              setIsEditGroupOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          {!group.isSystem && (
                            <Button variant="outline" size="sm" className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Permissions</CardTitle>
              <CardDescription>
                Assign permission groups to users and manage individual permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="user-select">Select User</Label>
                    <Select onValueChange={(value) => {
                      const user = users?.find(u => u.id.toString() === value);
                      setSelectedUser(user || null);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.firstName} {user.lastName} ({user.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => setIsAssignGroupOpen(true)}
                    disabled={!selectedUser}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Assign Group
                  </Button>
                </div>

                {selectedUser && userPermissions && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        {selectedUser.firstName} {selectedUser.lastName}'s Permissions
                      </h3>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Permission Groups</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {userPermissions.groups.length > 0 ? (
                              <div className="space-y-2">
                                {userPermissions.groups.map((group) => (
                                  <Badge key={group.id} variant="outline">
                                    {group.name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">No groups assigned</p>
                            )}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Direct Permissions</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-32">
                              {userPermissions.permissions.length > 0 ? (
                                <div className="space-y-1">
                                  {userPermissions.permissions.map((permission) => (
                                    <div key={permission} className="flex items-center space-x-2">
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                      <span className="text-sm">{permission}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">No direct permissions</p>
                              )}
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Permissions</CardTitle>
              <CardDescription>
                View all available permissions organized by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(permissionsByCategory).map(([category, perms]) => (
                  <div key={category}>
                    <h3 className="text-lg font-semibold mb-3 capitalize">
                      {category.replace('_', ' ')}
                    </h3>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {perms.map((permission) => (
                        <div
                          key={permission.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{permission.name}</p>
                            <p className="text-sm text-gray-600">
                              {permission.description}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {permission.action}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Permission Group Dialog */}
      <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Permission Group</DialogTitle>
            <DialogDescription>
              Create a new permission group and assign permissions to it.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleCreateGroup(new FormData(e.currentTarget));
          }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Group Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" />
              </div>
              <div>
                <Label>Permissions</Label>
                <ScrollArea className="h-64 border rounded-md p-4">
                  {Object.entries(permissionsByCategory).map(([category, perms]) => (
                    <div key={category} className="mb-4">
                      <h4 className="font-medium mb-2 capitalize">
                        {category.replace('_', ' ')}
                      </h4>
                      <div className="space-y-2">
                        {perms.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`permission-${permission.id}`}
                              checked={selectedCreatePermIds.has(permission.id)}
                              onCheckedChange={(checked) => {
                                setSelectedCreatePermIds((prev) => {
                                  const next = new Set(prev);
                                  if (checked) next.add(permission.id); else next.delete(permission.id);
                                  return next;
                                });
                              }}
                            />
                            <Label htmlFor={`permission-${permission.id}`} className="text-sm">
                              {permission.description}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateGroupOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createGroupMutation.isPending}>
                {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Permission Group Dialog */}
      <Dialog open={isEditGroupOpen} onOpenChange={setIsEditGroupOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Permission Group</DialogTitle>
            <DialogDescription>
              Modify the permission group and its assigned permissions.
            </DialogDescription>
          </DialogHeader>
          {selectedGroup && (
            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateGroup(new FormData(e.currentTarget));
            }}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Group Name</Label>
                  <Input id="edit-name" name="name" defaultValue={selectedGroup.name} required />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea id="edit-description" name="description" defaultValue={selectedGroup.description} />
                </div>
                <div>
                  <Label>Permissions</Label>
                  <ScrollArea className="h-64 border rounded-md p-4">
                    {Object.entries(permissionsByCategory).map(([category, perms]) => (
                      <div key={category} className="mb-4">
                        <h4 className="font-medium mb-2 capitalize">
                          {category.replace('_', ' ')}
                        </h4>
                        <div className="space-y-2">
                          {perms.map((permission) => (
                            <div key={permission.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-permission-${permission.id}`}
                                checked={selectedEditPermIds.has(permission.id)}
                                onCheckedChange={(checked) => {
                                  setSelectedEditPermIds((prev) => {
                                    const next = new Set(prev);
                                    if (checked) next.add(permission.id); else next.delete(permission.id);
                                    return next;
                                  });
                                }}
                              />
                              <Label htmlFor={`edit-permission-${permission.id}`} className="text-sm">
                                {permission.description}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditGroupOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateGroupMutation.isPending}>
                  {updateGroupMutation.isPending ? 'Updating...' : 'Update Group'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Permission Group Dialog */}
      <Dialog open={isAssignGroupOpen} onOpenChange={setIsAssignGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Permission Group</DialogTitle>
            <DialogDescription>
              Assign a permission group to {selectedUser?.firstName} {selectedUser?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleAssignGroup(new FormData(e.currentTarget));
          }}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="group-select">Permission Group</Label>
                <input type="hidden" name="groupId" value={assignGroupId} />
                <Select value={assignGroupId} onValueChange={setAssignGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a permission group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups?.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAssignGroupOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assignGroupMutation.isPending || !assignGroupId}>
                {assignGroupMutation.isPending ? 'Assigning...' : 'Assign Group'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PermissionManager; 