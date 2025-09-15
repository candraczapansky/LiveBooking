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
import { useLocation } from "@/contexts/LocationContext";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";

const serviceFormSchema = z.object({
  // Required fields only
  name: z.string().min(1, "Service name is required"),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  categoryId: z.coerce.number().min(1, "Category is required"),
  locationId: z.coerce.number().optional(),
  
  // Optional fields - explicitly marked as optional
  description: z.string().optional(),
  roomId: z.coerce.number().optional().nullable(),
  bufferTimeBefore: z.coerce.number().min(0, "Buffer time must be 0 or greater").optional(),
  bufferTimeAfter: z.coerce.number().min(0, "Buffer time must be 0 or greater").optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Please enter a valid hex color code").optional(),
  isHidden: z.boolean().optional(),
  // Frontend-only flag: controls add-on behavior and mapping
  isAddOn: z.boolean().optional(),
  
  // These are handled separately and not sent to the service creation endpoint
  assignedStaff: z.array(z.object({
    staffId: z.number(),
    customRate: z.union([z.coerce.number().min(0, "Rate must be 0 or greater"), z.literal(""), z.undefined()]).transform(val => val === "" || val === undefined ? undefined : val),
    customCommissionRate: z.union([z.coerce.number().min(0, "Commission rate must be 0 or greater"), z.literal(""), z.undefined()]).transform(val => val === "" || val === undefined ? undefined : val),
  })).optional().default([]),
  requiredDevices: z.array(z.number()).optional().default([]),
  // Add-on mapping (not sent to base service create endpoint)
  appliesToServiceIds: z.array(z.number()).optional().default([]),
  // Locations restriction (frontend-only; saved via dedicated endpoints)
  locationIds: z.array(z.number()).optional().default([]),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

type ServiceFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId?: number;
  onServiceCreated?: (categoryId: number) => void;
  defaultIsHidden?: boolean;
};

const ServiceForm = ({ open, onOpenChange, serviceId, onServiceCreated, defaultIsHidden }: ServiceFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [addOnSearchQuery, setAddOnSearchQuery] = useState("");
  const { selectedLocation, defaultLocation } = useLocation();

  const { data: serviceCategories } = useQuery({
    queryKey: ['/api/service-categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/service-categories');
      const body = await response.json();
      return Array.isArray(body) ? body : body?.data ?? [];
    }
  });

  const { data: staffMembers } = useQuery({
    queryKey: ['/api/staff'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/staff');
      const body = await response.json();
      return Array.isArray(body) ? body : body?.data ?? [];
    }
  });

  const { data: rooms } = useQuery({
    queryKey: ['/api/rooms'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/rooms');
      const body = await response.json();
      return Array.isArray(body) ? body : body?.data ?? [];
    }
  });

  const { data: devices } = useQuery({
    queryKey: ['/api/devices'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/devices');
      const body = await response.json();
      return Array.isArray(body) ? body : body?.data ?? [];
    }
  });

  // All locations for selection
  const { data: allLocations = [] } = useQuery({
    queryKey: ['/api/locations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/locations');
      const body = await response.json();
      return Array.isArray(body) ? body : body?.data ?? [];
    }
  });

  // All services (for selecting which base services an add-on applies to)
  const { data: allServices } = useQuery({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/services');
      const body = await response.json();
      return Array.isArray(body) ? body : body?.data ?? [];
    }
  });

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      duration: 30,
      price: 0,
      categoryId: undefined, // Will be set by user selection
      locationId: undefined,
      roomId: null,
      bufferTimeBefore: 0,
      bufferTimeAfter: 0,
      color: "#3B82F6",
      isHidden: false,
      isAddOn: false,
      assignedStaff: [],
      requiredDevices: [],
      appliesToServiceIds: [],
      locationIds: [],
    },
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setAddOnSearchQuery("");
    }
  }, [open, form]);

  // Fetch service data if editing
  useEffect(() => {
    if (serviceId && open) {
      setIsLoading(true);
      Promise.all([
        fetch(`/api/services/${serviceId}`).then(res => res.json()),
        // Fallback approach: fetch all staff-service assignments and filter by serviceId
        fetch(`/api/staff-services`).then(res => res.json()),
        fetch(`/api/services/${serviceId}/locations`).then(res => res.json()).catch(() => ({ locationIds: [], isRestricted: false })),
        fetch(`/api/services/${serviceId}/add-on-bases`).then(res => res.json()).catch(() => ({ baseServiceIds: [] })),
      ])
        .then(([serviceData, allAssignments, locationsPayload, addOnBases]) => {
          const assignmentsForService = Array.isArray(allAssignments)
            ? allAssignments.filter((a: any) => a && a.serviceId === serviceId)
            : [];

          const assignedStaff = assignmentsForService
            .filter((assignment: any) => typeof assignment.staffId === 'number')
            .map((assignment: any) => ({
              staffId: assignment.staffId,
              customRate: assignment.customRate || undefined,
              customCommissionRate: assignment.customCommissionRate || undefined,
            }));

          form.reset({
            name: serviceData.name,
            description: serviceData.description || "",
            duration: serviceData.duration,
            price: serviceData.price,
            categoryId: serviceData.categoryId,
            locationId: serviceData.locationId,
            roomId: serviceData.roomId || undefined,
            bufferTimeBefore: serviceData.bufferTimeBefore || 0,
            bufferTimeAfter: serviceData.bufferTimeAfter || 0,
            color: serviceData.color || "#3B82F6",
            isHidden: !!serviceData.isHidden,
            isAddOn: !!(serviceData as any)?.isAddOn,
            assignedStaff: assignedStaff,
            requiredDevices: serviceData.requiredDevices || [],
            locationIds: Array.isArray(locationsPayload?.locationIds) ? locationsPayload.locationIds.map((n: any) => Number(n)) : [],
            appliesToServiceIds: Array.isArray(addOnBases?.baseServiceIds) ? addOnBases.baseServiceIds : [],
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
        locationId: undefined,
        roomId: null,
        bufferTimeBefore: 0,
        bufferTimeAfter: 0,
        color: "#3B82F6",
        isHidden: false,
        isAddOn: !!defaultIsHidden,
        assignedStaff: [],
        requiredDevices: [],
        appliesToServiceIds: [],
        locationIds: selectedLocation?.id ? [selectedLocation.id] : [],
      });
    }
  }, [serviceId, open]);

  const createServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      const { assignedStaff, appliesToServiceIds } = data;
      
      // Validate required fields
      if (!data.name || !data.duration || data.price === undefined || !data.categoryId) {
        throw new Error('Missing required fields: name, duration, price, and category are required');
      }
      
      // Start with ONLY the absolutely required fields
      let cleanServiceData: any = {
        name: data.name.trim(),
        duration: Number(data.duration),
        price: Number(data.price),
        categoryId: Number(data.categoryId),
        locationId: undefined, // Let the backend assign the default location
      };
      
      // Temporarily skip sending description to avoid DBs missing this optional column
      // if (data.description && data.description.trim() !== "") {
      //   cleanServiceData.description = data.description.trim();
      // }
      
      // Always include roomId in the request, even if null
      cleanServiceData.roomId = data.roomId ? Number(data.roomId) : null;
      
      if (typeof data.bufferTimeBefore === 'number' && data.bufferTimeBefore >= 0) {
        cleanServiceData.bufferTimeBefore = Number(data.bufferTimeBefore);
      }
      
      if (typeof data.bufferTimeAfter === 'number' && data.bufferTimeAfter >= 0) {
        cleanServiceData.bufferTimeAfter = Number(data.bufferTimeAfter);
      }
      
      if (data.color && data.color.match(/^#[0-9A-F]{6}$/i)) {
        cleanServiceData.color = data.color;
      }

      if (typeof data.isHidden === 'boolean') {
        (cleanServiceData as any).isHidden = data.isHidden;
      }
      
      console.log('🔍 Creating service with cleaned data:', cleanServiceData);
      console.log('🔍 Original form data:', data);
      console.log('🔍 API URL will be:', '/api/services');
      console.log('🔍 cleanServiceData type check:', typeof cleanServiceData);
      console.log('🔍 cleanServiceData keys:', Object.keys(cleanServiceData));
      console.log('🔍 cleanServiceData values:', Object.values(cleanServiceData));
      
      try {
        const response = await apiRequest("POST", "/api/services", cleanServiceData);
        const service = await response.json();
        
        console.log('🔍 Service created successfully:', service);
        
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

        // If creating an add-on, save mapping to base services.
        // Always create mapping when marked as add-on, even if empty, so it appears in Add-On list.
        if (data.isAddOn || defaultIsHidden) {
          await apiRequest("POST", `/api/services/${service.id}/add-on-bases`, {
            baseServiceIds: Array.isArray(appliesToServiceIds) ? appliesToServiceIds : [],
          });
        }

        // Save locations restriction mapping (empty array clears restriction)
        try {
          const locIds = Array.isArray(form.getValues('locationIds')) ? form.getValues('locationIds') : [];
          await apiRequest("POST", `/api/services/${service.id}/locations`, { locationIds: locIds });
        } catch (e) {
          console.warn("Failed to save locations mapping for service", e);
        }
        
        return service;
      } catch (error) {
        console.error('🔍 Service creation error details:', error);
        throw error;
      }
    },
    onSuccess: (service) => {
      // Invalidate all service-related queries to sync across all pages
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      // Invalidate all category-specific service queries
      queryClient.invalidateQueries({ predicate: query => 
        Array.isArray(query.queryKey) && (
          query.queryKey[0] === '/api/services' ||
          query.queryKey[0] === "/api/services"
        )
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
      console.error('❌ Service creation failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
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

      // Filter out undefined values and empty strings to prevent validation errors
      const filteredServiceData = Object.fromEntries(
        Object.entries(serviceData).filter(([_, value]) => value !== undefined && value !== null && value !== "")
      );

      // Remove frontend-only field
      delete (filteredServiceData as any).isAddOn;

      // Ensure roomId is not included if it's undefined/null
      if ((filteredServiceData as any).roomId === undefined || (filteredServiceData as any).roomId === null) {
        delete (filteredServiceData as any).roomId;
      }

      console.log("Frontend form data before sending:", data);
      console.log("Frontend assignedStaff array:", assignedStaff);
      console.log("Frontend sending data:", JSON.stringify(filteredServiceData, null, 2));

      // Update base service fields first
      // Ensure locationId is always sent on update to satisfy validators/backends expecting it
      if ((filteredServiceData as any).locationId === undefined || (filteredServiceData as any).locationId === null) {
        const fallbackLocId = form.getValues('locationId') || selectedLocation?.id || defaultLocation?.id;
        if (fallbackLocId) {
          (filteredServiceData as any).locationId = Number(fallbackLocId);
        }
      }

      // Do not force isHidden when isAddOn is checked; these are independent controls

      const response = await apiRequest("PUT", `/api/services/${serviceId}`, filteredServiceData);
      const service = await response.json();

      // Sync staff assignments: create/update assignments present in form; remove those omitted
      try {
        const assignmentsRes = await apiRequest("GET", "/api/staff-services");
        const allAssignments = await assignmentsRes.json();
        const currentAssignments = Array.isArray(allAssignments)
          ? allAssignments.filter((a: any) => a && a.serviceId === serviceId)
          : [];

        // Index current assignments by staffId for quick lookup
        const currentByStaffId = new Map<number, any>();
        currentAssignments.forEach((a: any) => {
          if (typeof a.staffId === "number") currentByStaffId.set(a.staffId, a);
        });

        // Upsert assignments from the form
        if (Array.isArray(assignedStaff)) {
          for (const assignment of assignedStaff) {
            await apiRequest("POST", "/api/staff-services", {
              staffId: assignment.staffId,
              serviceId: serviceId!,
              customRate: assignment.customRate ?? null,
              customCommissionRate: assignment.customCommissionRate ?? null,
            });
            // Mark as processed
            currentByStaffId.delete(assignment.staffId);
          }
        }

        // Remove any leftover current assignments not in the form
        for (const [, existing] of currentByStaffId) {
          await apiRequest(
            "DELETE",
            `/api/staff/${existing.staffId}/services/${serviceId}`
          );
        }
      } catch (err) {
        console.warn("Failed to sync staff assignments; continuing.", err);
      }

      // Sync add-on mapping based on isAddOn toggle
      try {
        if ((data as any)?.isAddOn) {
          // Ensure mapping exists (even if empty) and reflects selected base services
          await apiRequest("POST", `/api/services/${serviceId}/add-on-bases`, {
            baseServiceIds: Array.isArray((data as any).appliesToServiceIds) ? (data as any).appliesToServiceIds : [],
          });
        } else {
          // If no longer an add-on, remove mapping entirely
          await apiRequest("DELETE", `/api/services/${serviceId}/add-on-bases`);
        }
      } catch (e) {
        console.warn("Failed to update add-on mapping on edit; service update will proceed", e);
      }

      // Save locations restriction mapping (empty array clears restriction)
      try {
        const locIds = Array.isArray(form.getValues('locationIds')) ? form.getValues('locationIds') : [];
        await apiRequest("POST", `/api/services/${serviceId}/locations`, { locationIds: locIds });
      } catch (e) {
        console.warn("Failed to save locations mapping on edit; continuing", e);
      }

      // Do not mutate isHidden optimistically based on isAddOn; keep flags independent

      return service;
    },
    onSuccess: () => {
      // Invalidate all service-related queries to sync across all pages
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      // Invalidate all category-specific service queries (service might have moved categories)
      queryClient.invalidateQueries({ predicate: query => 
        Array.isArray(query.queryKey) && (
          query.queryKey[0] === '/api/services' ||
          query.queryKey[0] === "/api/services"
        )
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

  const handleSubmit = async (values: ServiceFormValues) => {
    
    // Check if categories are available
    if (!serviceCategories || serviceCategories.length === 0) {
      toast({
        title: "No Categories Available",
        description: "Please create at least one service category before creating a service.",
        variant: "destructive",
      });
      return;
    }
    
    // Manually trigger validation
    const isValid = await form.trigger();
    
    if (!isValid) {
      // Get the first error
      const errors = form.formState.errors;
      const errorFields = Object.keys(errors);
      const firstErrorField = errorFields[0];
      const errorMessage = errors[firstErrorField as keyof typeof errors]?.message;
      
      console.log("Form validation failed:", errors);
      console.log("First error field:", firstErrorField);
      console.log("Error message:", errorMessage);
      
      // Create a more user-friendly error message
      let userFriendlyMessage = errorMessage;
      if (firstErrorField === 'categoryId' && errorMessage?.includes('nan')) {
        userFriendlyMessage = "Please select a category";
      } else if (firstErrorField === 'name' && !form.getValues('name')?.trim()) {
        userFriendlyMessage = "Service name is required";
      } else if (firstErrorField === 'duration' && (!form.getValues('duration') || form.getValues('duration') < 1)) {
        userFriendlyMessage = "Duration must be at least 1 minute";
      } else if (firstErrorField === 'price' && (!form.getValues('price') || form.getValues('price') < 0)) {
        userFriendlyMessage = "Price must be a positive number";
      } else if (firstErrorField === 'color' && !form.getValues('color')?.match(/^#[0-9A-F]{6}$/i)) {
        userFriendlyMessage = "Please enter a valid hex color code";
      }
      
      console.log("About to call toast...");
      console.log("User friendly message:", userFriendlyMessage);
      try {
        const toastResult = toast({
          title: "Required Field Missing",
          description: userFriendlyMessage || `Please fill in the required field: ${firstErrorField}`,
          variant: "destructive",
        });
        console.log("Toast called successfully, result:", toastResult);
        console.log("Current toast state:", form.formState);
      } catch (error) {
        console.error("Toast error:", error);
        // Fallback to alert if toast fails
        alert(`Required Field Missing: ${userFriendlyMessage || firstErrorField}`);
      }
      return;
    }
    
    // If valid, proceed with submission

    if (serviceId) {
      updateServiceMutation.mutate(values);
    } else {
      createServiceMutation.mutate(values);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] p-3 sm:p-4 gap-2 overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{serviceId ? "Edit Service" : "Add New Service"}</DialogTitle>
          <DialogDescription>
            {serviceId
              ? "Update the service details below."
              : "Create a new service by filling out the form below."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-2">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="details">
                <AccordionTrigger className="text-sm">Basic Details</AccordionTrigger>
                <AccordionContent>
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
                            className="min-h-24"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
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
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="timing">
                <AccordionTrigger className="text-sm">Timing & Buffers</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-3">
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
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="category-room">
                <AccordionTrigger className="text-sm">Category & Room</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            value={typeof field.value === 'number' ? String(field.value) : (field.value || '')}
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {!serviceCategories || serviceCategories.length === 0 ? (
                                <div className="relative px-2 py-1.5 text-sm text-muted-foreground">
                                  No categories available
                                </div>
                              ) : (
                                serviceCategories.map((category: any) => (
                                  <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Only show room field for regular services, not add-ons */}
                    {!form.watch('isAddOn') && (
                      <FormField
                        control={form.control}
                        name="roomId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Room (Optional)</FormLabel>
                            <Select
                              value={field.value === null || field.value === undefined ? 'none' : String(field.value)}
                              onValueChange={(value) => field.onChange(value === 'none' ? null : parseInt(value))}
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
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Applies To (for Add-Ons only) */}
            {form.watch('isAddOn') && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="addon">
                  <AccordionTrigger className="text-sm">Add-On Settings</AccordionTrigger>
                  <AccordionContent>
                    <FormField
                      control={form.control}
                      name="appliesToServiceIds"
                      render={({ field }) => {
                        const filteredServices = Array.isArray(allServices) 
                          ? allServices.filter((s: any) => 
                              !s.isAddOn && 
                              s.name.toLowerCase().includes(addOnSearchQuery.toLowerCase())
                            )
                          : [];
                        
                        return (
                          <FormItem>
                            <FormLabel>Applies To Services</FormLabel>
                            <div className="space-y-2">
                              <Input
                                type="text"
                                placeholder="Search services..."
                                value={addOnSearchQuery}
                                onChange={(e) => setAddOnSearchQuery(e.target.value)}
                                className="w-full"
                              />
                              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                                {filteredServices.length === 0 ? (
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {addOnSearchQuery ? "No services found matching your search" : "No services available"}
                                  </div>
                                ) : (
                                  filteredServices.map((svc: any) => {
                                    const checked = (field.value || []).includes(svc.id);
                                    return (
                                      <div key={svc.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`applies-${svc.id}`}
                                          checked={checked}
                                          onCheckedChange={(isChecked) => {
                                            const current = field.value || [];
                                            if (isChecked) {
                                              field.onChange([...current, svc.id]);
                                            } else {
                                              field.onChange(current.filter((id: number) => id !== svc.id));
                                            }
                                          }}
                                        />
                                        <label htmlFor={`applies-${svc.id}`} className="text-sm cursor-pointer">
                                          {svc.name}
                                        </label>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                              {field.value && field.value.length > 0 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {field.value.length} service{field.value.length !== 1 ? 's' : ''} selected
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Select the main services this add-on can be added to.</div>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="devices-color">
                <AccordionTrigger className="text-sm">Devices & Color</AccordionTrigger>
                <AccordionContent>
                  {/* Required Devices */}
                  <FormField
                    control={form.control}
                    name="requiredDevices"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Required Devices</FormLabel>
                        <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg">
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
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="staff-assignment">
                <AccordionTrigger className="text-sm">Staff Assignment</AccordionTrigger>
                <AccordionContent>
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
                                    <label htmlFor={`staff-${staff.id}`} className="text-sm font-medium cursor-pointer">
                                      {staff.user?.firstName} {staff.user?.lastName} - {staff.title}
                                    </label>
                                  </div>
                                  {isAssigned && (
                                    <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-xs text-gray-600 mb-1 block">Custom Rate (${staff.hourlyRate || staff.fixedRate || 0}/hr default)</label>
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
                                        <label className="text-xs text-gray-600 mb-1 block">Custom Commission ({staff.commissionRate || 0}% default)</label>
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
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="visibility">
                <AccordionTrigger className="text-sm">Visibility & Add-On</AccordionTrigger>
                <AccordionContent>
                  {/* Add-On toggle (frontend only) */}
                  <FormField
                    control={form.control}
                    name="isAddOn"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="is-addon"
                            checked={!!field.value}
                            onCheckedChange={(checked) => {
                              const isChecked = !!checked;
                              field.onChange(isChecked);
                              // Do not auto-toggle isHidden here; let user control visibility separately
                            }}
                          />
                          <Label htmlFor="is-addon" className="cursor-pointer">
                            Mark as Add-On
                          </Label>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Add-ons appear under Add-On Services and can be attached to selected base services. They are typically not booked alone.
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Hide from online booking (controls visibility on client booking site) */}
                  <FormField
                    control={form.control}
                    name="isHidden"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="is-hidden"
                            checked={!!field.value}
                            onCheckedChange={(checked) => field.onChange(!!checked)}
                          />
                          <Label htmlFor="is-hidden" className="cursor-pointer">
                            Hide from online booking
                          </Label>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          When enabled, this service is hidden from clients at the online booking page (`http://glofloapp.com/booking`). Staff can still book it internally.
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="locations">
                <AccordionTrigger className="text-sm">Locations</AccordionTrigger>
                <AccordionContent>
                  {/* Locations offering this service */}
                  <FormField
                    control={form.control}
                    name="locationIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Locations offering this service</FormLabel>
                        <FormControl>
                          <ScrollArea className="h-32 w-full border rounded-md p-3">
                            <div className="space-y-2">
                              {Array.isArray(allLocations) && allLocations.length > 0 ? (
                                allLocations.map((loc: any) => (
                                  <div key={loc.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`loc-${loc.id}`}
                                      checked={field.value?.includes(loc.id) || false}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        if (checked) {
                                          field.onChange(Array.from(new Set([...current, loc.id])));
                                        } else {
                                          field.onChange(current.filter((id: number) => id !== loc.id));
                                        }
                                      }}
                                    />
                                    <label htmlFor={`loc-${loc.id}`} className="text-sm font-medium cursor-pointer">
                                      {loc.name}
                                    </label>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-gray-500">No locations found.</p>
                              )}
                            </div>
                          </ScrollArea>
                        </FormControl>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Leave empty to allow at all locations. Select one or more to restrict.</div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <DialogFooter className="shrink-0">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceForm;
