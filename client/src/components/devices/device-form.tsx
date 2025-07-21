import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Device, insertDeviceSchema, Service } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const deviceFormSchema = insertDeviceSchema.extend({
  name: z.string().min(1, "Device name is required"),
  deviceType: z.string().min(1, "Device type is required"),
  status: z.string().min(1, "Status is required"),
  serviceIds: z.array(z.number()).optional(),
});

type DeviceFormData = z.infer<typeof deviceFormSchema>;

interface DeviceFormProps {
  device?: Device | null;
  onClose: () => void;
}

const deviceTypes = [
  { value: "hair_dryer", label: "Hair Dryer" },
  { value: "massage_table", label: "Massage Table" },
  { value: "styling_chair", label: "Styling Chair" },
  { value: "facial_steamer", label: "Facial Steamer" },
  { value: "pedicure_chair", label: "Pedicure Chair" },
  { value: "manicure_table", label: "Manicure Table" },
  { value: "wax_warmer", label: "Wax Warmer" },
  { value: "uv_lamp", label: "UV Lamp" },
  { value: "hot_towel_cabinet", label: "Hot Towel Cabinet" },
  { value: "other", label: "Other" },
];

const statusOptions = [
  { value: "available", label: "Available" },
  { value: "in_use", label: "In Use" },
  { value: "maintenance", label: "Maintenance" },
  { value: "broken", label: "Broken" },
];

export function DeviceForm({ device, onClose }: DeviceFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available services for selection
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const form = useForm<DeviceFormData>({
    resolver: zodResolver(deviceFormSchema),
    defaultValues: {
      name: device?.name || "",
      description: device?.description || "",
      deviceType: device?.deviceType || "",
      brand: device?.brand || "",
      model: device?.model || "",
      serialNumber: device?.serialNumber || "",
      purchaseDate: device?.purchaseDate || "",
      warrantyExpiry: device?.warrantyExpiry || "",
      status: device?.status || "available",
      isActive: device?.isActive ?? true,
      serviceIds: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: DeviceFormData) => apiRequest("POST", "/api/devices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({
        title: "Success",
        description: "Device created successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create device",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: DeviceFormData) =>
      apiRequest("PUT", `/api/devices/${device!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({
        title: "Success",
        description: "Device updated successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update device",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DeviceFormData) => {
    if (device) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">
            {device ? "Edit Device" : "Add New Device"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Device Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Hair Dryer Station 1" className="h-12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Device Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select device type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {deviceTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the device..."
                      className="resize-none"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Dyson, Babyliss" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., SuperSonic HD07" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ABC123456789" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warrantyExpiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warranty Expiry</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Services that need this device */}
            <FormField
              control={form.control}
              name="serviceIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Services That Need This Device</FormLabel>
                  <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg">
                    {services.length === 0 ? (
                      <div className="col-span-2 text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        No services available
                      </div>
                    ) : (
                      services.map((service) => (
                        <div key={service.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`service-${service.id}`}
                            checked={field.value?.includes(service.id) || false}
                            onCheckedChange={(checked) => {
                              const currentIds = field.value || [];
                              if (checked) {
                                field.onChange([...currentIds, service.id]);
                              } else {
                                field.onChange(currentIds.filter(id => id !== service.id));
                              }
                            }}
                          />
                          <Label 
                            htmlFor={`service-${service.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {service.name}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Select which services require this device for scheduling and resource management
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Device</FormLabel>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Inactive devices won't appear in device selection lists
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-2 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="w-full sm:w-auto h-12 order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full sm:w-auto h-12 order-1 sm:order-2"
              >
                {isLoading ? "Saving..." : device ? "Update Device" : "Create Device"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}