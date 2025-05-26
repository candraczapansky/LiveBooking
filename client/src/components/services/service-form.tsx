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

const serviceFormSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  categoryId: z.coerce.number().min(1, "Category is required"),
  assignedStaff: z.array(z.number()).optional(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

type ServiceFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId?: number;
};

const ServiceForm = ({ open, onOpenChange, serviceId }: ServiceFormProps) => {
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

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      duration: 30,
      price: 0,
      categoryId: undefined,
      assignedStaff: [],
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
          const assignedStaffIds = staffData.map((staff: any) => staff.id);
          
          form.reset({
            name: serviceData.name,
            description: serviceData.description || "",
            duration: serviceData.duration,
            price: serviceData.price,
            categoryId: serviceData.categoryId,
            assignedStaff: assignedStaffIds,
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
    }
  }, [serviceId, open, form, toast, onOpenChange]);

  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      const { assignedStaff, ...serviceData } = data;
      const response = await apiRequest("POST", "/api/services", serviceData);
      const service = await response.json();
      
      // Assign staff to the service
      if (assignedStaff && assignedStaff.length > 0) {
        for (const staffId of assignedStaff) {
          await apiRequest("POST", "/api/staff-services", {
            staffId,
            serviceId: service.id,
          });
        }
      }
      
      return service;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({
        title: "Success",
        description: "Service created successfully",
      });
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
      const response = await apiRequest("PUT", `/api/services/${serviceId}`, serviceData);
      const service = await response.json();
      
      // Remove all existing staff assignments for this service
      const existingStaff = await fetch(`/api/services/${serviceId}/staff`).then(res => res.json());
      for (const staff of existingStaff) {
        await apiRequest("DELETE", `/api/staff-services/${staff.staffServiceId}`);
      }
      
      // Add new staff assignments
      if (assignedStaff && assignedStaff.length > 0) {
        for (const staffId of assignedStaff) {
          await apiRequest("POST", "/api/staff-services", {
            staffId,
            serviceId: service.id,
          });
        }
      }
      
      return service;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
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
      <DialogContent className="sm:max-w-[500px]">
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

            {/* Staff Assignment */}
            <FormField
              control={form.control}
              name="assignedStaff"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Staff Members</FormLabel>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {staffMembers?.map((staff: any) => (
                      <div key={staff.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`staff-${staff.id}`}
                          checked={field.value?.includes(staff.id) || false}
                          onCheckedChange={(checked) => {
                            const currentValue = field.value || [];
                            if (checked) {
                              field.onChange([...currentValue, staff.id]);
                            } else {
                              field.onChange(currentValue.filter((id: number) => id !== staff.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`staff-${staff.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {staff.user?.firstName} {staff.user?.lastName} - {staff.title}
                        </label>
                      </div>
                    ))}
                  </div>
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
