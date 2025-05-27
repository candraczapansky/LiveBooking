import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Wrench, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Device } from "@shared/schema";
import { DeviceForm } from "@/components/devices/device-form";
import { apiRequest } from "@/lib/queryClient";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { AppLayout } from "@/components/layout/app-layout";

export default function DevicesPage() {
  useDocumentTitle("Devices - Salon Management");
  
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: devices = [], isLoading } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/devices/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({
        title: "Success",
        description: "Device deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete device",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (device: Device) => {
    setEditingDevice(device);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this device?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingDevice(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in_use":
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case "maintenance":
        return <Wrench className="h-4 w-4 text-yellow-500" />;
      case "broken":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "in_use":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "broken":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Devices</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Devices</h1>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Device
        </Button>
      </div>

      {devices.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">No devices found. Add your first device to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => (
            <Card key={device.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg text-gray-900 dark:text-gray-100">{device.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(device.status)}
                      <Badge className={getStatusColor(device.status)}>
                        {device.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(device)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(device.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">Type:</span> {device.deviceType.replace('_', ' ')}
                  </div>
                  {device.brand && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Brand:</span> {device.brand}
                    </div>
                  )}
                  {device.model && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Model:</span> {device.model}
                    </div>
                  )}
                  {device.description && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {device.description}
                    </div>
                  )}
                  {device.purchaseDate && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Purchased:</span> {device.purchaseDate}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <DeviceForm
          device={editingDevice}
          onClose={handleCloseForm}
        />
      )}
      </div>
    </AppLayout>
  );
}