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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  DollarSign,
  Shield,
  Users,
  Plus
} from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface PermissionGroup {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  isSystem: boolean;
}

interface StaffFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const StaffForm: React.FC<StaffFormProps> = ({ onSuccess, onCancel }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    title: '',
    bio: '',
    commissionType: 'commission',
    commissionRate: '',
    hourlyRate: '',
    fixedRate: '',
    selectedPermissionGroups: [] as number[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch available users for staff creation
  const { data: availableUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['available-users'],
    queryFn: async () => {
      const response = await fetch('/api/users?role=client');
      const data = await response.json();
      return data.data as User[];
    },
  });

  // Fetch permission groups
  const { data: permissionGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['permission-groups'],
    queryFn: async () => {
      const response = await fetch('/api/permission-groups');
      const data = await response.json();
      return data.data as PermissionGroup[];
    },
  });

  // Create staff mutation
  const createStaffMutation = useMutation({
    mutationFn: async (staffData: any) => {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffData),
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Assign permission groups if selected
      if (formData.selectedPermissionGroups.length > 0) {
        formData.selectedPermissionGroups.forEach(async (groupId) => {
          await fetch(`/api/users/${data.data.userId}/permission-groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId }),
          });
        });
      }

      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onSuccess?.();
    },
  });

  // Register staff user mutation
  const registerStaffMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await fetch('/api/register/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Create staff record
      createStaffMutation.mutate({
        userId: data.user.id,
        title: formData.title,
        bio: formData.bio,
        commissionType: formData.commissionType,
        commissionRate: formData.commissionRate ? parseFloat(formData.commissionRate) : null,
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
        fixedRate: formData.fixedRate ? parseFloat(formData.fixedRate) : null,
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.username) newErrors.username = 'Username is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.title) newErrors.title = 'Job title is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Register staff user
    registerStaffMutation.mutate({
      username: formData.username,
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePermissionGroupToggle = (groupId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedPermissionGroups: prev.selectedPermissionGroups.includes(groupId)
        ? prev.selectedPermissionGroups.filter(id => id !== groupId)
        : [...prev.selectedPermissionGroups, groupId]
    }));
  };

  if (usersLoading || groupsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading form data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create New Staff Member</h1>
        <p className="text-gray-600">
          Add a new staff member with appropriate permissions and compensation settings
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Enter the staff member's personal and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="Enter username"
                  className={errors.username ? 'border-red-500' : ''}
                />
                {errors.username && (
                  <p className="text-sm text-red-500 mt-1">{errors.username}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter password"
                  className={errors.password ? 'border-red-500' : ''}
                />
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">{errors.password}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="Enter first name"
                  className={errors.firstName ? 'border-red-500' : ''}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Enter last name"
                  className={errors.lastName ? 'border-red-500' : ''}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Job Information
            </CardTitle>
            <CardDescription>
              Set the staff member's job title, bio, and compensation structure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Senior Stylist, Massage Therapist"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-500 mt-1">{errors.title}</p>
                )}
              </div>
              <div>
                <Label htmlFor="commissionType">Compensation Type</Label>
                <Select
                  value={formData.commissionType}
                  onValueChange={(value) => handleInputChange('commissionType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commission">Commission</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="fixed">Fixed Salary</SelectItem>
                    <SelectItem value="hourly_plus_commission">Hourly + Commission</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Enter staff member bio"
                rows={3}
              />
            </div>

            {/* Compensation Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {formData.commissionType === 'commission' && (
                <div>
                  <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                  <Input
                    id="commissionRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.commissionRate}
                    onChange={(e) => handleInputChange('commissionRate', e.target.value)}
                    placeholder="e.g., 15"
                  />
                </div>
              )}
              {(formData.commissionType === 'hourly' || formData.commissionType === 'hourly_plus_commission') && (
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.hourlyRate}
                    onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                    placeholder="e.g., 25.00"
                  />
                </div>
              )}
              {formData.commissionType === 'fixed' && (
                <div>
                  <Label htmlFor="fixedRate">Fixed Salary ($)</Label>
                  <Input
                    id="fixedRate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.fixedRate}
                    onChange={(e) => handleInputChange('fixedRate', e.target.value)}
                    placeholder="e.g., 3000.00"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Access Permissions
            </CardTitle>
            <CardDescription>
              Select permission groups to control what this staff member can access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {permissionGroups?.map((group) => (
                  <div
                    key={group.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.selectedPermissionGroups.includes(group.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePermissionGroupToggle(group.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={formData.selectedPermissionGroups.includes(group.id)}
                        onChange={() => handlePermissionGroupToggle(group.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{group.name}</h4>
                          {group.isSystem && (
                            <Badge variant="secondary" className="text-xs">System</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {formData.selectedPermissionGroups.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-2">Selected Permission Groups:</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.selectedPermissionGroups.map((groupId) => {
                      const group = permissionGroups?.find(g => g.id === groupId);
                      return group ? (
                        <Badge key={groupId} variant="outline" className="text-blue-700">
                          {group.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createStaffMutation.isPending || registerStaffMutation.isPending}
          >
            {createStaffMutation.isPending || registerStaffMutation.isPending ? (
              'Creating Staff Member...'
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Staff Member
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Error Alert */}
      {(createStaffMutation.isError || registerStaffMutation.isError) && (
        <Alert variant="destructive">
          <AlertDescription>
            {createStaffMutation.error?.message || registerStaffMutation.error?.message || 
             'An error occurred while creating the staff member. Please try again.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default StaffForm; 