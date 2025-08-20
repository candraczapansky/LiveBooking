import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useSidebar } from "@/contexts/SidebarContext";
import { SidebarController } from "@/components/layout/sidebar";
// import Header from "@/components/layout/header"; // Provided by MainLayout
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, CheckCircle, AlertCircle, Wrench, XCircle } from "lucide-react";
import { DeviceForm } from "@/components/devices/device-form";
import { Device } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function DevicesPage() {
  useDocumentTitle("Devices | Glo Head Spa");
  
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOpen: sidebarOpen } = useSidebar();

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <SidebarController />
        <div className={`flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
        }`}>
          <main className="flex-1 p-6">
            <div className="space-y-6 px-2 sm:px-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Devices</h1>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      <div className={`flex flex-col transition-all duration-300 ${
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
      }`}>
        <main className="flex-1 p-6">
          <div className="space-y-6 px-2 sm:px-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Devices</h1>
                        <Button
              onClick={() => setShowForm(true)}
              variant="default"
              className="w-full sm:w-auto h-12 text-base"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Device
            </Button>
          </div>

          {devices.length === 0 ? (
            <Card className="mx-4 sm:mx-0">
              <CardContent className="p-8 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
                    <Wrench className="h-8 w-8 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No devices found</h3>
                    <p className="text-gray-500 dark:text-gray-400">Add your first device to get started.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {devices.map((device) => (
                <Card key={device.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mx-4 sm:mx-0">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2 min-w-0 flex-1">
                        <CardTitle className="text-lg md:text-xl text-gray-900 dark:text-gray-100 leading-tight">{device.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(device.status)}
                          <Badge className={`${getStatusColor(device.status)} text-xs`}>
                            {device.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(device)}
                          className="h-10 w-10 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="Edit device"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(device.id)}
                          className="h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete device"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="text-sm md:text-base text-gray-600 dark:text-gray-300">
                        <span className="font-medium text-gray-900 dark:text-gray-100">Type:</span> {device.deviceType.replace('_', ' ')}
                      </div>
                      {device.brand && (
                        <div className="text-sm md:text-base text-gray-600 dark:text-gray-300">
                          <span className="font-medium text-gray-900 dark:text-gray-100">Brand:</span> {device.brand}
                        </div>
                      )}
                      {device.model && (
                        <div className="text-sm md:text-base text-gray-600 dark:text-gray-300">
                          <span className="font-medium text-gray-900 dark:text-gray-100">Model:</span> {device.model}
                        </div>
                      )}
                      {device.description && (
                        <div className="text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                          {device.description}
                        </div>
                      )}
                      {device.purchaseDate && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
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
        </main>
      </div>
    </div>
  );
}