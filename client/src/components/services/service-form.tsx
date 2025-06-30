import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const serviceFormSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  categoryId: z.coerce.number().min(1, "Category is required"),
  roomId: z.coerce.number().optional(),
  bufferTimeBefore: z.coerce.number().min(0, "Buffer time must be 0 or greater").default(0),
  bufferTimeAfter: z.coerce.number().min(0, "Buffer time must be 0 or greater").default(0),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Please enter a valid hex color code"),
  assignedStaff: z.array(z.object({
    staffId: z.number(),
    customRate: z.union([z.coerce.number().min(0, "Rate must be 0 or greater"), z.literal(""), z.undefined()]).transform(val => val === "" || val === undefined ? undefined : val),
    customCommissionRate: z.union([z.coerce.number().min(0, "Commission rate must be 0 or greater"), z.literal(""), z.undefined()]).transform(val => val === "" || val === undefined ? undefined : val),
  })).default([]),
  requiredDevices: z.array(z.number()).optional(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

type ServiceFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId?: number;
  onServiceCreated?: (categoryId: number) => void;
};

const ServiceForm = ({ open, onOpenChange, serviceId, onServiceCreated }: ServiceFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: serviceCategories } = useQuery({
    queryKey: ['/api/service-categories'],
    queryFn: async () => {
      const response = await fetch('/api/service-categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  const { data: staffMembers } = useQuery({
    queryKey: ['/api/staff'],
    queryFn: async () => {
      const response = await fetch('/api/staff');
      if (!response.ok) throw new Error('Failed to fetch staff');
      return response.json();
    }
  });

  const { data: rooms } = useQuery({
    queryKey: ['/api/rooms'],
    queryFn: async () => {
      const response = await fetch('/api/rooms');
      if (!response.ok) throw new Error('Failed to fetch rooms');
      return response.json();
    }
  });

  const { data: devices } = useQuery({
    queryKey: ['/api/devices'],
    queryFn: async () => {
      const response = await fetch('/api/devices');
      if (!response.ok) throw new Error('Failed to fetch devices');
      return response.json();
    }
  });

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      duration: 30,
      price: 0,
      categoryId: undefined,
      roomId: undefined,
      bufferTimeBefore: 0,
      bufferTimeAfter: 0,
      color: "#3B82F6",
      assignedStaff: [],
      requiredDevices: [],
    },
  });

  // Fetch service data if editing
  useEffect(() => {
    if (serviceId && open) {
      setIsLoading(true);
      Promise.all([
        fetch(`/api/services/${serviceId}`).then(res => res.json()),
        fetch(`/api/services/${serviceId}/staff`).then(res => res.json())
      ])
        .then(([serviceData, staffData]) => {
          // Transform staff data to match form requirements
          const assignedStaff = staffData.map((staff: any) => ({
            staffId: staff.id,
            customRate: staff.customRate || undefined,
            customCommissionRate: staff.customCommissionRate || undefined,
          }));
          
          form.reset({
            name: serviceData.name,
            description: serviceData.description || "",
            duration: serviceData.duration,
            price: serviceData.price,
            categoryId: serviceData.categoryId,
            roomId: serviceData.roomId || undefined,
            bufferTimeBefore: serviceData.bufferTimeBefore || 0,
            bufferTimeAfter: serviceData.bufferTimeAfter || 0,
            color: serviceData.color || "#3B82F6",
            assignedStaff: assignedStaff,
            requiredDevices: serviceData.requiredDevices || [],
          });
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Error fetching service:", err);
          toast({
            title: "Error",
            description: "Failed to load service data",
            variant: "destructive",
          });
          setIsLoading(false);
          onOpenChange(false);
        });
    } else if (open && !serviceId) {
      // Reset form for new service
      form.reset({
        name: "",
        description: "",
        duration: 30,
        price: 0,
        categoryId: undefined,
        roomId: undefined,
        bufferTimeBefore: 0,
        bufferTimeAfter: 0,
        color: "#3B82F6",
        assignedStaff: [],
        requiredDevices: [],
      });
    }
  }, [serviceId, open]);

  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      const { assignedStaff, ...serviceData } = data;
      const response = await apiRequest("POST", "/api/services", serviceData);
      const service = await response.json();
      
      // Assign staff to the service with custom rates
      if (assignedStaff && assignedStaff.length > 0) {
        for (const assignment of assignedStaff) {
          await apiRequest("POST", "/api/staff-services", {
            staffId: assignment.staffId,
            serviceId: service.id,
            customRate: assignment.customRate || null,
            customCommissionRate: assignment.customCommissionRate || null,
          });
        }
      }
      
      return service;
    },
    onSuccess: (service) => {
      // Invalidate all service-related queries to sync across all pages
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      // Also invalidate queries with any additional parameters
      queryClient.invalidateQueries({ predicate: query => 
        Array.isArray(query.queryKey) && query.queryKey[0] === '/api/services' ||
        Array.isArray(query.queryKey) && query.queryKey[0] === "/api/services"
      });
      toast({
        title: "Success",
        description: "Service created successfully",
      });
      // Call the callback to switch to the correct category
      if (onServiceCreated && service.categoryId) {
        onServiceCreated(service.categoryId);
      }
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create service: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const updateServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      const { assignedStaff, ...serviceData } = data;
      
      // Send the service data along with assigned staff to the backend
      const fullServiceData = {
        ...serviceData,
        assignedStaff: assignedStaff
      };
      
      console.log("Frontend sending data:", JSON.stringify(fullServiceData, null, 2));
      
      const response = await apiRequest("PUT", `/api/services/${serviceId}`, fullServiceData);
      const service = await response.json();
      
      return service;
    },
    onSuccess: () => {
      // Invalidate all service-related queries to sync across all pages
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      // Also invalidate queries with any additional parameters
      queryClient.invalidateQueries({ predicate: query => 
        Array.isArray(query.queryKey) && query.queryKey[0] === '/api/services' ||
        Array.isArray(query.queryKey) && query.queryKey[0] === "/api/services"
      });
      toast({
        title: "Success",
        description: "Service updated successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update service: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (values: ServiceFormValues) => {
    if (serviceId) {
      updateServiceMutation.mutate(values);
    } else {
      createServiceMutation.mutate(values);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{serviceId ? "Edit Service" : "Add New Service"}</DialogTitle>
          <DialogDescription>
            {serviceId
              ? "Update the service details below."
              : "Create a new service by filling out the form below."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Haircut & Style" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the service..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Buffer Time Settings */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bufferTimeBefore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buffer Time Before (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bufferTimeAfter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buffer Time After (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {serviceCategories?.map((category: any) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room (Optional)</FormLabel>
                    <Select
                      value={field.value?.toString() || "none"}
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a room" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No room assigned</SelectItem>
                        {rooms?.filter((room: any) => room.isActive)?.map((room: any) => (
                          <SelectItem key={room.id} value={room.id.toString()}>
                            {room.name} {room.capacity > 1 ? `(${room.capacity} capacity)` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Required Devices */}
            <FormField
              control={form.control}
              name="requiredDevices"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Required Devices</FormLabel>
                  <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg">
                    {!devices || devices.length === 0 ? (
                      <div className="col-span-2 text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        No devices available
                      </div>
                    ) : (
                      devices.filter((device: any) => device.isActive).map((device: any) => (
                        <div key={device.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`device-${device.id}`}
                            checked={field.value?.includes(device.id) || false}
                            onCheckedChange={(checked) => {
                              const currentIds = field.value || [];
                              if (checked) {
                                field.onChange([...currentIds, device.id]);
                              } else {
                                field.onChange(currentIds.filter((id: number) => id !== device.id));
                              }
                            }}
                          />
                          <Label 
                            htmlFor={`device-${device.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {device.name}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Select devices that are required for this service
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service Color */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Color</FormLabel>
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <Input 
                        type="color" 
                        {...field} 
                        className="w-16 h-10 p-1 border rounded cursor-pointer"
                      />
                    </FormControl>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder="#3B82F6" 
                        {...field}
                        className="flex-1 font-mono uppercase"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Staff Assignment */}
            <FormField
              control={form.control}
              name="assignedStaff"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Staff Members</FormLabel>
                  {staffMembers && staffMembers.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto border rounded-md p-3">
                      {staffMembers.map((staff: any) => {
                        const isAssigned = field.value?.some((assignment: any) => assignment.staffId === staff.id) || false;
                        const currentAssignment = field.value?.find((assignment: any) => assignment.staffId === staff.id);
                        
                        return (
                          <div key={staff.id} className="border rounded-lg p-3 space-y-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`staff-${staff.id}`}
                                checked={isAssigned}
                                onCheckedChange={(checked) => {
                                  const currentValue = field.value || [];
                                  if (checked) {
                                    field.onChange([...currentValue, { 
                                      staffId: staff.id,
                                      customRate: undefined,
                                      customCommissionRate: undefined
                                    }]);
                                  } else {
                                    field.onChange(currentValue.filter((assignment: any) => assignment.staffId !== staff.id));
                                  }
                                }}
                              />
                              <label
                                htmlFor={`staff-${staff.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {staff.user?.firstName} {staff.user?.lastName} - {staff.title}
                              </label>
                            </div>
                            
                            {isAssigned && (
                              <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-gray-600 mb-1 block">
                                    Custom Rate (${staff.hourlyRate || staff.fixedRate || 0}/hr default)
                                  </label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder={`Default: $${staff.hourlyRate || staff.fixedRate || 0}`}
                                    value={currentAssignment?.customRate || ""}
                                    onChange={(e) => {
                                      const newValue = field.value?.map((assignment: any) => 
                                        assignment.staffId === staff.id 
                                          ? { ...assignment, customRate: e.target.value ? parseFloat(e.target.value) : undefined }
                                          : assignment
                                      );
                                      field.onChange(newValue);
                                    }}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600 mb-1 block">
                                    Custom Commission ({staff.commissionRate || 0}% default)
                                  </label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder={`Default: ${staff.commissionRate || 0}%`}
                                    value={currentAssignment?.customCommissionRate || ""}
                                    onChange={(e) => {
                                      const newValue = field.value?.map((assignment: any) => 
                                        assignment.staffId === staff.id 
                                          ? { ...assignment, customCommissionRate: e.target.value ? parseFloat(e.target.value) : undefined }
                                          : assignment
                                      );
                                      field.onChange(newValue);
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground p-4 border rounded-md bg-muted/50">
                      No staff members available. Please create staff members first to assign them to services.
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || createServiceMutation.isPending || updateServiceMutation.isPending}
              >
                {isLoading || createServiceMutation.isPending || updateServiceMutation.isPending
                  ? "Saving..."
                  : serviceId
                  ? "Update Service"
                  : "Create Service"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceForm;
