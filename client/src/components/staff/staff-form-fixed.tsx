import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertStaffSchema } from "@shared/schema";

// Create staff form schema extending the insert schema
const staffFormSchema = insertStaffSchema.extend({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(1, "Phone number is required"),
  assignedServices: z.array(z.number()).default([]),
  serviceRates: z.record(z.number()).default({}),
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
  const [activeTab, setActiveTab] = useState<'profile' | 'schedule'>('profile');

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
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
    },
  });

  // Fetch all services for assignment
  const { data: services = [] } = useQuery({
    queryKey: ["/api/services"],
  });

  // Fetch staff data for editing
  const { data: staffData } = useQuery({
    queryKey: ["/api/staff", staffId],
    enabled: !!staffId,
  });

  // Create staff mutation
  const createStaffMutation = useMutation({
    mutationFn: async (data: StaffFormValues) => {
      const { assignedServices, serviceRates, ...staffData } = data;
      
      // Create user first
      const user = await apiRequest("/api/users", {
        method: "POST",
        body: {
          username: data.username,
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: "staff" as const,
        },
      });

      // Create staff member
      const staff = await apiRequest("/api/staff", {
        method: "POST",
        body: {
          ...staffData,
          userId: user.id,
        },
      });

      // Assign services if any selected
      if (assignedServices.length > 0) {
        for (const serviceId of assignedServices) {
          await apiRequest("/api/staff-services", {
            method: "POST",
            body: {
              staffId: staff.id,
              serviceId,
              hourlyRate: serviceRates[serviceId] || 0,
            },
          });
        }
      }

      return staff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({
        title: "Success",
        description: "Staff member created successfully",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create staff member",
        variant: "destructive",
      });
    },
  });

  // Update staff mutation
  const updateStaffMutation = useMutation({
    mutationFn: async (data: StaffFormValues) => {
      if (!staffId) throw new Error("Staff ID is required for update");
      
      const { assignedServices, serviceRates, username, email, password, firstName, lastName, phone, ...staffData } = data;
      
      // Update staff member
      const staff = await apiRequest(`/api/staff/${staffId}`, {
        method: "PATCH",
        body: staffData,
      });

      return staff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({
        title: "Success",
        description: "Staff member updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update staff member",
        variant: "destructive",
      });
    },
  });

  // Load staff data when editing
  useEffect(() => {
    if (staffData && staffId) {
      form.reset({
        title: staffData.title || "",
        bio: staffData.bio || "",
        commissionRate: staffData.commissionRate || 0,
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
  }, [staffData, staffId, form]);

  const onSubmit = async (data: StaffFormValues) => {
    setIsLoading(true);
    try {
      if (staffId) {
        await updateStaffMutation.mutateAsync(data);
      } else {
        await createStaffMutation.mutateAsync(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {staffId ? "Edit Staff Member" : "Add New Staff Member"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tab Selection */}
            {!staffId && (
              <div className="flex items-center space-x-2">
                <Button 
                  type="button" 
                  variant={activeTab === 'profile' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab('profile')}
                >
                  Staff Profile
                </Button>
                <Button 
                  type="button" 
                  variant={activeTab === 'schedule' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab('schedule')}
                >
                  Schedule
                </Button>
              </div>
            )}

            {/* Profile Tab Content */}
            {activeTab === 'profile' && (
              <>
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
                          <Input placeholder="johndoe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john@example.com" {...field} />
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

                {/* Professional Information */}
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
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="commissionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commission Rate (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Service Assignment */}
                {services.length > 0 && (
                  <div>
                    <FormLabel className="text-base font-medium">Assigned Services</FormLabel>
                    <div className="mt-2 space-y-3">
                      {services.map((service: any) => {
                        const isAssigned = form.watch("assignedServices").includes(service.id);
                        
                        return (
                          <div key={service.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                            <Checkbox
                              checked={isAssigned}
                              onCheckedChange={(checked) => {
                                const currentServices = form.getValues("assignedServices");
                                if (checked) {
                                  form.setValue("assignedServices", [...currentServices, service.id]);
                                } else {
                                  form.setValue("assignedServices", currentServices.filter(id => id !== service.id));
                                  // Remove rate when service is unassigned
                                  const currentRates = form.getValues("serviceRates");
                                  const { [service.id]: removed, ...remainingRates } = currentRates;
                                  form.setValue("serviceRates", remainingRates);
                                }
                              }}
                            />
                            <div className="flex-1">
                              <p className="font-medium">{service.name}</p>
                              <p className="text-sm text-gray-600">{service.description}</p>
                            </div>
                            {isAssigned && (
                              <div className="w-32">
                                <Input
                                  type="number"
                                  placeholder="Hourly rate"
                                  value={form.watch("serviceRates")[service.id] || ""}
                                  onChange={(e) => {
                                    const currentRates = form.getValues("serviceRates");
                                    form.setValue("serviceRates", {
                                      ...currentRates,
                                      [service.id]: Number(e.target.value)
                                    });
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Schedule Tab Content */}
            {activeTab === 'schedule' && (
              <div className="space-y-4">
                <div className="text-center text-gray-500 py-8">
                  <p>Schedule management will be available here.</p>
                  <p className="text-sm mt-2">This feature allows you to set working hours for staff members.</p>
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