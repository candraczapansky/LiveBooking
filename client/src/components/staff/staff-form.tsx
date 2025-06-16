import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

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
import { Upload, X } from "lucide-react";

// Staff form schema
const staffFormSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  bio: z.string().optional(),
  photo: z.string().optional(),
  commissionType: z.enum(["hourly", "commission", "fixed", "hourly_commission"]).default("commission"),
  commissionRate: z.number().min(0).max(100).default(0),
  hourlyRate: z.number().min(0).optional(),
  fixedSalary: z.number().min(0).optional(),
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  assignedServices: z.array(z.number()).default([]),
  serviceRates: z.record(z.string(), z.object({
    customRate: z.number().optional(),
    customCommissionRate: z.number().optional(),
  })).default({}),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

type StaffFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId?: number;
};

const StaffForm = ({ open, onOpenChange, staffId }: StaffFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      title: "",
      bio: "",
      photo: "",
      commissionType: "commission",
      commissionRate: 0,
      hourlyRate: 0,
      fixedSalary: 0,
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      assignedServices: [],
      serviceRates: {},
    },
  });

  // Fetch all services for assignment
  const { data: services } = useQuery({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const response = await fetch('/api/services');
      if (!response.ok) throw new Error('Failed to fetch services');
      return response.json();
    },
    enabled: open
  });

  // Fetch staff data if editing
  useEffect(() => {
    if (staffId && open) {
      setIsLoading(true);
      fetch(`/api/staff/${staffId}`)
        .then(res => res.json())
        .then(data => {
          // Fetch staff services
          fetch(`/api/staff/${staffId}/services`)
            .then(res => res.json())
            .then(staffServices => {
              const assignedServiceIds = staffServices.map((service: any) => service.id);
              
              // Build service rates object from existing assignments
              const serviceRates: Record<string, { customRate?: number; customCommissionRate?: number }> = {};
              staffServices.forEach((service: any) => {
                if (service.customRate || service.customCommissionRate) {
                  serviceRates[service.id.toString()] = {
                    customRate: service.customRate,
                    customCommissionRate: service.customCommissionRate,
                  };
                }
              });
              
              form.reset({
                title: data.title || "",
                bio: data.bio || "",
                commissionRate: data.commissionRate || 0,
                firstName: data.user?.firstName || "",
                lastName: data.user?.lastName || "",
                email: data.user?.email || "",
                username: data.user?.username || "",
                password: "", // Don't pre-fill password
                phone: data.user?.phone || "",
                assignedServices: assignedServiceIds,
                serviceRates: serviceRates,
              });
            })
            .catch(err => {
              console.error("Error fetching staff services:", err);
              toast({
                title: "Error",
                description: "Failed to load staff services",
                variant: "destructive",
              });
            })
            .finally(() => setIsLoading(false));
        })
        .catch(err => {
          console.error("Error fetching staff:", err);
          toast({
            title: "Error",
            description: "Failed to load staff data",
            variant: "destructive",
          });
          setIsLoading(false);
        });
    } else if (open && !staffId) {
      // Reset form for new staff member
      form.reset({
        title: "",
        bio: "",
        commissionRate: 0,
        username: "",
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: "",
        assignedServices: [],
        serviceRates: {},
      });
    }
  }, [staffId, open, form]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const createStaffMutation = useMutation({
    mutationFn: async (data: StaffFormValues) => {
      // Always create a new user for staff
      let userId;
      
      // Generate a unique username if the provided one fails
      let username = data.username;
      let userCreated = false;
      let attempts = 0;
      
      while (!userCreated && attempts < 5) {
        const userData = {
          username: attempts === 0 ? username : `${username}${attempts}`,
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: "staff",
        };

        const userResponse = await apiRequest("POST", "/api/register", userData);
        if (userResponse.ok) {
          const user = await userResponse.json();
          userId = user.id;
          userCreated = true;
        } else {
          const errorData = await userResponse.json();
          if (errorData.error?.includes("Username already taken")) {
            attempts++;
          } else {
            throw new Error(errorData.error || "Failed to create user");
          }
        }
      }
      
      if (!userCreated) {
        throw new Error("Unable to create a unique username. Please try a different username.");
      }

      // Create staff member
      const staffData = {
        userId: userId,
        title: data.title,
        bio: data.bio,
        commissionRate: data.commissionRate,
      };

      const staffResponse = await apiRequest("POST", "/api/staff", staffData);
      if (!staffResponse.ok) {
        const errorData = await staffResponse.json();
        throw new Error(errorData.error || "Failed to create staff member");
      }

      const staff = await staffResponse.json();

      // Assign services to staff
      for (const serviceId of data.assignedServices) {
        const serviceAssignment = {
          staffId: staff.id,
          serviceId: serviceId,
          customRate: data.serviceRates[serviceId.toString()]?.customRate,
          customCommissionRate: data.serviceRates[serviceId.toString()]?.customCommissionRate,
        };
        
        await apiRequest("POST", "/api/staff-services", serviceAssignment);
      }

      return staff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      toast({
        title: "Success",
        description: "Staff member created successfully!",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create staff member: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const updateStaffMutation = useMutation({
    mutationFn: async (data: StaffFormValues) => {
      if (!staffId) throw new Error("Staff ID is required for update");

      // Update user information
      const userData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
      };

      const userResponse = await apiRequest("PATCH", `/api/users/${staffId}`, userData);
      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        throw new Error(errorData.error || "Failed to update user");
      }

      // Update staff information
      const staffData = {
        title: data.title,
        bio: data.bio,
        commissionRate: data.commissionRate,
      };

      const staffResponse = await apiRequest("PATCH", `/api/staff/${staffId}`, staffData);
      if (!staffResponse.ok) {
        const errorData = await staffResponse.json();
        throw new Error(errorData.error || "Failed to update staff member");
      }

      // Update service assignments
      const existingServices = await fetch(`/api/staff/${staffId}/services`).then(res => res.json());
      const existingServiceIds = existingServices.map((service: any) => service.id);

      // Remove services that are no longer assigned
      for (const existingServiceId of existingServiceIds) {
        if (!data.assignedServices.includes(existingServiceId)) {
          await apiRequest("DELETE", `/api/staff-services/staff/${staffId}/service/${existingServiceId}`);
        }
      }

      // Add new services or update existing ones
      for (const serviceId of data.assignedServices) {
        const serviceAssignment = {
          staffId: staffId,
          serviceId: serviceId,
          customRate: data.serviceRates[serviceId.toString()]?.customRate,
          customCommissionRate: data.serviceRates[serviceId.toString()]?.customCommissionRate,
        };

        if (existingServiceIds.includes(serviceId)) {
          // Update existing assignment
          const existingAssignment = existingServices.find((s: any) => s.id === serviceId);
          if (existingAssignment) {
            await apiRequest("PATCH", `/api/staff-services/${existingAssignment.staffServiceId}`, serviceAssignment);
          }
        } else {
          // Create new assignment
          await apiRequest("POST", "/api/staff-services", serviceAssignment);
        }
      }

      return await staffResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      toast({
        title: "Success",
        description: "Staff member updated successfully!",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update staff member: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const onSubmit = async (data: StaffFormValues) => {
    if (staffId) {
      updateStaffMutation.mutate(data);
    } else {
      createStaffMutation.mutate(data);
    }
  };

  const handleServiceToggle = (serviceId: number, checked: boolean) => {
    const currentServices = form.getValues('assignedServices');
    if (checked) {
      form.setValue('assignedServices', [...currentServices, serviceId]);
    } else {
      form.setValue('assignedServices', currentServices.filter(id => id !== serviceId));
      // Remove custom rates for this service
      const currentRates = form.getValues('serviceRates');
      const newRates = { ...currentRates };
      delete newRates[serviceId.toString()];
      form.setValue('serviceRates', newRates);
    }
  };

  const handleCustomRateChange = (serviceId: number, field: 'customRate' | 'customCommissionRate', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    const currentRates = form.getValues('serviceRates');
    const serviceKey = serviceId.toString();
    
    form.setValue('serviceRates', {
      ...currentRates,
      [serviceKey]: {
        ...currentRates[serviceKey],
        [field]: numValue,
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{staffId ? "Edit Staff Member" : "Add New Staff Member"}</DialogTitle>
          <DialogDescription>
            {staffId ? "Update the staff member information below." : "Create a new staff member by filling out the form below."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Staff Profile Header */}
            {!staffId && (
              <div className="flex items-center space-x-2">
                <Button 
                  type="button" 
                  variant="default" 
                  size="sm"
                  disabled
                >
                  Staff Profile
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    setLocation('/schedule');
                  }}
                >
                  Schedule
                </Button>
              </div>
            )}

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe" {...field} disabled={!!staffId} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {!staffId && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Job Information */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Hair Stylist" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the staff member's experience and specialties..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="photo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Photo (Optional)</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {field.value && (
                        <div className="flex items-center space-x-4">
                          <img 
                            src={field.value} 
                            alt="Staff photo preview" 
                            className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => field.onChange("")}
                          >
                            Remove Photo
                          </Button>
                        </div>
                      )}
                      <Input 
                        type="url"
                        placeholder="Enter photo URL (e.g., https://example.com/photo.jpg)"
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                      <p className="text-xs text-gray-500">
                        Upload your photo to a hosting service and paste the URL here, or use a professional headshot URL.
                      </p>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Structure */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="commissionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Structure</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="commission">Commission Only</SelectItem>
                        <SelectItem value="hourly">Hourly Only</SelectItem>
                        <SelectItem value="fixed">Fixed Salary</SelectItem>
                        <SelectItem value="hourly_commission">Hourly + Commission</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Commission Rate - Show for commission and hourly_commission */}
              {(form.watch('commissionType') === 'commission' || form.watch('commissionType') === 'hourly_commission') && (
                <FormField
                  control={form.control}
                  name="commissionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commission Rate (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="100" 
                          step="0.1"
                          placeholder="15"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Hourly Rate - Show for hourly and hourly_commission */}
              {(form.watch('commissionType') === 'hourly' || form.watch('commissionType') === 'hourly_commission') && (
                <FormField
                  control={form.control}
                  name="hourlyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          placeholder="25.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Fixed Salary - Show for fixed */}
              {form.watch('commissionType') === 'fixed' && (
                <FormField
                  control={form.control}
                  name="fixedSalary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annual Salary ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="1000"
                          placeholder="50000"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Service Assignment */}
            {services && services.length > 0 && (
              <div className="space-y-3">
                <FormLabel>Assigned Services</FormLabel>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {services.map((service: any) => {
                    const isAssigned = form.watch('assignedServices').includes(service.id);
                    const serviceRates = form.watch('serviceRates')[service.id.toString()] || {};
                    
                    return (
                      <div key={service.id} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`service-${service.id}`}
                            checked={isAssigned}
                            onCheckedChange={(checked) => handleServiceToggle(service.id, !!checked)}
                          />
                          <label 
                            htmlFor={`service-${service.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {service.name} - ${service.price}
                          </label>
                        </div>
                        
                        {isAssigned && (
                          <div className="ml-6 grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-gray-600">Custom Rate ($)</label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder={service.price}
                                value={serviceRates.customRate || ''}
                                onChange={(e) => handleCustomRateChange(service.id, 'customRate', e.target.value)}
                                className="h-7 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600">Custom Commission (%)</label>
                              <Input
                                type="number"
                                step="0.1"
                                placeholder="Use default"
                                value={serviceRates.customCommissionRate || ''}
                                onChange={(e) => handleCustomRateChange(service.id, 'customCommissionRate', e.target.value)}
                                className="h-7 text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || createStaffMutation.isPending || updateStaffMutation.isPending}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 bg-[#ff8d8f]"
              >
                {isLoading || createStaffMutation.isPending || updateStaffMutation.isPending
                  ? "Saving..."
                  : staffId
                  ? "Update Staff Member"
                  : "Create Staff Member"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default StaffForm;