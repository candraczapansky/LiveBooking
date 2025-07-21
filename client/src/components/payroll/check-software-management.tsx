import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Save, X, CreditCard, Settings, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface CheckSoftwareProvider {
  id: number;
  name: string;
  displayName: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  webhookUrl?: string;
  companyId?: string;
  locationId?: string;
  isActive: boolean;
  config?: string;
  createdAt: string;
  updatedAt: string;
}

interface PayrollCheck {
  id: number;
  payrollHistoryId?: number;
  staffId: number;
  checkNumber?: string;
  checkAmount: number;
  checkDate: string;
  providerId?: number;
  providerCheckId?: string;
  status: string;
  issueDate?: string;
  clearDate?: string;
  voidDate?: string;
  voidReason?: string;
  checkImageUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProviderFormData {
  name: string;
  displayName: string;
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  refreshToken: string;
  webhookUrl: string;
  companyId: string;
  locationId: string;
  isActive: boolean;
  config: string;
}

const CheckSoftwareManagement: React.FC = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<CheckSoftwareProvider | null>(null);
  const [formData, setFormData] = useState<ProviderFormData>({
    name: '',
    displayName: '',
    apiKey: '',
    apiSecret: '',
    accessToken: '',
    refreshToken: '',
    webhookUrl: '',
    companyId: '',
    locationId: '',
    isActive: false,
    config: ''
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch check software providers
  const { data: providers = [], isLoading, error } = useQuery({
    queryKey: ['check-software-providers'],
    queryFn: async () => {
      const response = await fetch('/api/check-software/providers');
      if (!response.ok) throw new Error('Failed to fetch check software providers');
      return response.json();
    }
  });

  // Fetch payroll checks
  const { data: payrollChecks = [] } = useQuery({
    queryKey: ['payroll-checks'],
    queryFn: async () => {
      const response = await fetch('/api/check-software/checks');
      if (!response.ok) throw new Error('Failed to fetch payroll checks');
      return response.json();
    }
  });

  // Add new provider
  const addProviderMutation = useMutation({
    mutationFn: async (data: ProviderFormData) => {
      const response = await fetch('/api/check-software/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to add check software provider');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['check-software-providers'] });
      setIsAddDialogOpen(false);
      setFormData({
        name: '',
        displayName: '',
        apiKey: '',
        apiSecret: '',
        accessToken: '',
        refreshToken: '',
        webhookUrl: '',
        companyId: '',
        locationId: '',
        isActive: false,
        config: ''
      });
      toast({
        title: "Provider Added",
        description: "Check software provider has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Add Failed",
        description: "Failed to add check software provider",
        variant: "destructive",
      });
      console.error('Add provider error:', error);
    }
  });

  // Update provider
  const updateProviderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProviderFormData }) => {
      const response = await fetch(`/api/check-software/providers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update check software provider');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['check-software-providers'] });
      setEditingProvider(null);
      setFormData({
        name: '',
        displayName: '',
        apiKey: '',
        apiSecret: '',
        accessToken: '',
        refreshToken: '',
        webhookUrl: '',
        companyId: '',
        locationId: '',
        isActive: false,
        config: ''
      });
      toast({
        title: "Provider Updated",
        description: "Check software provider has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update check software provider",
        variant: "destructive",
      });
      console.error('Update provider error:', error);
    }
  });

  // Delete provider
  const deleteProviderMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/check-software/providers/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete check software provider');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['check-software-providers'] });
      toast({
        title: "Provider Deleted",
        description: "Check software provider has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete check software provider",
        variant: "destructive",
      });
      console.error('Delete provider error:', error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProvider) {
      updateProviderMutation.mutate({ id: editingProvider.id.toString(), data: formData });
    } else {
      addProviderMutation.mutate(formData);
    }
  };

  const handleEdit = (provider: CheckSoftwareProvider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      displayName: provider.displayName,
      apiKey: provider.apiKey || '',
      apiSecret: provider.apiSecret || '',
      accessToken: provider.accessToken || '',
      refreshToken: provider.refreshToken || '',
      webhookUrl: provider.webhookUrl || '',
      companyId: provider.companyId || '',
      locationId: provider.locationId || '',
      isActive: provider.isActive,
      config: provider.config || ''
    });
  };

  const handleCancel = () => {
    setIsAddDialogOpen(false);
    setEditingProvider(null);
    setFormData({
      name: '',
      displayName: '',
      apiKey: '',
      apiSecret: '',
      accessToken: '',
      refreshToken: '',
      webhookUrl: '',
      companyId: '',
      locationId: '',
      isActive: false,
      config: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'issued': return 'bg-green-100 text-green-800';
      case 'cleared': return 'bg-blue-100 text-blue-800';
      case 'voided': return 'bg-red-100 text-red-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="mb-6">
        <AlertDescription>
          Failed to load check software providers. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Check Software Management</h2>
          <p className="text-gray-600 mt-1">
            Configure and manage payroll check processing through various check software providers
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Check Software Provider</DialogTitle>
              <p className="text-sm text-gray-600">
                Configure a new check software provider for payroll check processing.
              </p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Provider Name</Label>
                  <Select value={formData.name} onValueChange={(value) => setFormData({ ...formData, name: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quickbooks">QuickBooks Payroll</SelectItem>
                      <SelectItem value="square">Square Payroll</SelectItem>
                      <SelectItem value="gusto">Gusto</SelectItem>
                      <SelectItem value="adp">ADP</SelectItem>
                      <SelectItem value="paychex">Paychex</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="Enter display name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="Enter API key"
                  />
                </div>
                <div>
                  <Label htmlFor="apiSecret">API Secret</Label>
                  <Input
                    id="apiSecret"
                    type="password"
                    value={formData.apiSecret}
                    onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                    placeholder="Enter API secret"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accessToken">Access Token</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    value={formData.accessToken}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    placeholder="Enter access token"
                  />
                </div>
                <div>
                  <Label htmlFor="refreshToken">Refresh Token</Label>
                  <Input
                    id="refreshToken"
                    type="password"
                    value={formData.refreshToken}
                    onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
                    placeholder="Enter refresh token"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyId">Company ID</Label>
                  <Input
                    id="companyId"
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    placeholder="Enter company ID"
                  />
                </div>
                <div>
                  <Label htmlFor="locationId">Location ID</Label>
                  <Input
                    id="locationId"
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    placeholder="Enter location ID"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  placeholder="Enter webhook URL"
                />
              </div>

              <div>
                <Label htmlFor="config">Configuration (JSON)</Label>
                <Textarea
                  id="config"
                  value={formData.config}
                  onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                  placeholder="Enter additional configuration as JSON"
                  rows={4}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active Provider</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addProviderMutation.isPending}>
                  {addProviderMutation.isPending ? 'Adding...' : 'Add Provider'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Providers</p>
                <p className="text-2xl font-bold">{providers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Active Providers</p>
                <p className="text-2xl font-bold">{providers.filter((p: CheckSoftwareProvider) => p.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Total Checks</p>
                <p className="text-2xl font-bold">{payrollChecks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600">Issued Checks</p>
              <p className="text-2xl font-bold">
                                 {payrollChecks.filter((check: PayrollCheck) => check.status === 'issued').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Providers List */}
      <Card>
        <CardHeader>
          <CardTitle>Check Software Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {providers.map((provider: CheckSoftwareProvider) => (
              <div key={provider.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900">{provider.displayName}</h4>
                      <Badge variant={provider.isActive ? 'default' : 'secondary'}>
                        {provider.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline">{provider.name}</Badge>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Company ID: {provider.companyId || 'Not set'} | 
                      Location ID: {provider.locationId || 'Not set'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Updated: {new Date(provider.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(provider)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteProviderMutation.mutate(provider.id.toString())}
                      disabled={deleteProviderMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payroll Checks List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payroll Checks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payrollChecks.slice(0, 10).map((check: PayrollCheck) => (
              <div key={check.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900">
                        Check #{check.checkNumber || check.id}
                      </h4>
                      <Badge className={getStatusColor(check.status)}>
                        {check.status}
                      </Badge>
                      <span className="text-lg font-semibold">
                        ${check.checkAmount.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Date: {new Date(check.checkDate).toLocaleDateString()} | 
                      Staff ID: {check.staffId}
                    </p>
                    {check.issueDate && (
                      <p className="text-xs text-gray-500 mt-1">
                        Issued: {new Date(check.issueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {check.checkImageUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={check.checkImageUrl} target="_blank" rel="noopener noreferrer">
                        View Check
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckSoftwareManagement; 