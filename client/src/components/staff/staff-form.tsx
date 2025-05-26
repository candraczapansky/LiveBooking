import { useState, useEffect, useRef } from "react";
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

// Staff form schema
const staffFormSchema = z.object({
  userId: z.coerce.number().optional(),
  title: z.string().min(1, "Job title is required"),
  bio: z.string().optional(),
  commissionRate: z.coerce.number().min(0, "Commission rate must be a positive number or zero").max(1, "Commission rate must be between 0 and 1"),
  username: z.string().min(1, "Username is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  phone: z.string().optional(),
  photoUrl: z.string().optional(),
  assignedServices: z.array(z.coerce.number()).optional(),
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
  const [isExistingUser, setIsExistingUser] = useState(false);

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      userId: undefined,
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

  // Fetch existing users for dropdown
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: open && isExistingUser
  });

  // Fetch staff data if editing
  useEffect(() => {
    if (staffId && open) {
      setIsLoading(true);
      fetch(`/api/staff/${staffId}`)
        .then(res => res.json())
        .then(data => {
          setIsExistingUser(true);
          
          // Fetch staff services
          fetch(`/api/staff/${staffId}/services`)
            .then(res => res.json())
            .then(staffServices => {
              const assignedServiceIds = staffServices.map((service: any) => service.id);
              
              form.reset({
                userId: data.userId,
                title: data.title,
                bio: data.bio || "",
                commissionRate: data.commissionRate,
                photoUrl: data.photoUrl || "",
                firstName: data.user?.firstName || "",
                lastName: data.user?.lastName || "",
                email: data.user?.email || "",
                phone: data.user?.phone || "",
                assignedServices: assignedServiceIds,
              });
              
              setIsLoading(false);
            })
            .catch(err => {
              console.error("Error fetching staff services:", err);
              setIsLoading(false);
            });
        })
        .catch(err => {
          console.error("Error fetching staff:", err);
          toast({
            title: "Error",
            description: "Failed to load staff data",
            variant: "destructive",
          });
          setIsLoading(false);
          onOpenChange(false);
        });
    }
  }, [staffId, open, form, toast, onOpenChange]);

  const createStaffMutation = useMutation({
    mutationFn: async (data: StaffFormValues) => {
      let userId;

      // If it's not an existing user, create a new user first
      if (!isExistingUser) {
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
      } else {
        userId = data.userId;
      }

      // Create staff profile
      const staffData = {
        userId,
        title: data.title,
        bio: data.bio,
        commissionRate: data.commissionRate,
        photoUrl: data.photoUrl,
      };

      const staffResponse = await apiRequest("POST", "/api/staff", staffData);
      const staff = await staffResponse.json();

      // Assign services to staff
      if (data.assignedServices && data.assignedServices.length > 0) {
        for (const serviceId of data.assignedServices) {
          await apiRequest("POST", "/api/staff-services", {
            staffId: staff.id,
            serviceId,
          });
        }
      }

      return staff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      toast({
        title: "Success",
        description: "Staff member created successfully",
      });
      form.reset();
      onOpenChange(false);
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
      // Update user data if needed
      if (data.firstName || data.lastName || data.email || data.phone) {
        const userData = {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
        };

        await apiRequest("PUT", `/api/users/${data.userId}`, userData);
      }

      // Update staff profile
      const staffData = {
        title: data.title,
        bio: data.bio,
        commissionRate: data.commissionRate,
        photoUrl: data.photoUrl,
      };

      const staffResponse = await apiRequest("PUT", `/api/staff/${staffId}`, staffData);
      const staff = await staffResponse.json();

      // Update service assignments
      if (data.assignedServices) {
        // First, fetch current service assignments
        const response = await fetch(`/api/staff/${staffId}/services`);
        const currentServices = await response.json();
        const currentServiceIds = currentServices.map((service: any) => service.id);

        // Remove services no longer assigned
        for (const serviceId of currentServiceIds) {
          if (!data.assignedServices.includes(serviceId)) {
            await apiRequest("DELETE", `/api/staff/${staffId}/services/${serviceId}`, null);
          }
        }

        // Add newly assigned services
        for (const serviceId of data.assignedServices) {
          if (!currentServiceIds.includes(serviceId)) {
            await apiRequest("POST", "/api/staff-services", {
              staffId: staffId,
              serviceId,
            });
          }
        }
      }

      return staff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      toast({
        title: "Success",
        description: "Staff member updated successfully",
      });
      form.reset();
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

  const onSubmit = (values: StaffFormValues) => {
    if (staffId) {
      updateStaffMutation.mutate(values);
    } else {
      createStaffMutation.mutate(values);
    }
  };

  const toggleUserType = () => {
    setIsExistingUser(!isExistingUser);
    form.reset({
      ...form.getValues(),
      userId: undefined,
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
    });
  };

  const handleUserSelect = (userId: string) => {
    // Fetch user details and populate form
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(user => {
        form.setValue('userId', parseInt(userId));
        form.setValue('firstName', user.firstName || "");
        form.setValue('lastName', user.lastName || "");
        form.setValue('email', user.email || "");
        form.setValue('phone', user.phone || "");
      })
      .catch(err => {
        console.error("Error fetching user details:", err);
        toast({
          title: "Error",
          description: "Failed to load user details",
          variant: "destructive",
        });
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{staffId ? "Edit Staff Member" : "Add New Staff Member"}</DialogTitle>
          <DialogDescription>
            {staffId
              ? "Update the staff member's details below."
              : "Create a new staff member by filling out the form below."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Staff Type Selection */}
            {!staffId && (
              <div className="flex items-center space-x-2">
                <Button 
                  type="button" 
                  variant={isExistingUser ? "outline" : "default"} 
                  size="sm"
                  onClick={() => setIsExistingUser(false)}
                >
                  New User
                </Button>
                <Button 
                  type="button" 
                  variant={isExistingUser ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setIsExistingUser(true)}
                >
                  Existing User
                </Button>
              </div>
            )}

            {/* User Selection for Existing User */}
            {isExistingUser && !staffId && (
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select User</FormLabel>
                    <Select 
                      onValueChange={value => handleUserSelect(value)}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users?.filter((user: any) => user.role !== 'staff').map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.firstName} {user.lastName} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* New User Fields */}
            {!isExistingUser && !staffId && (
              <>
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
                          <Input type="password" placeholder="••••••" {...field} />
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
                          <Input placeholder="(123) 456-7890" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Display user info if editing */}
            {staffId && (
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
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(123) 456-7890" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Staff Profile Fields */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Senior Stylist" {...field} />
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
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Photo (Optional)</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const result = event.target?.result as string;
                              field.onChange(result);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="cursor-pointer"
                      />
                      {field.value && (
                        <div className="flex items-center space-x-4">
                          <img
                            src={field.value}
                            alt="Staff photo preview"
                            className="h-16 w-16 object-cover rounded-full border"
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
                    </div>
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
                  <FormLabel>Commission Rate (0-1)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      {...field} 
                      placeholder="e.g., 0.3 for 30%"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service Assignments */}
            <div>
              <FormLabel className="block mb-2">Assigned Services</FormLabel>
              <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                {services?.map((service: any) => (
                  <div key={service.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`service-${service.id}`}
                      checked={form.watch('assignedServices')?.includes(service.id)}
                      onCheckedChange={(checked) => {
                        const currentServices = form.watch('assignedServices') || [];
                        if (checked) {
                          form.setValue('assignedServices', [...currentServices, service.id]);
                        } else {
                          form.setValue(
                            'assignedServices',
                            currentServices.filter((id: number) => id !== service.id)
                          );
                        }
                      }}
                    />
                    <label
                      htmlFor={`service-${service.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {service.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || createStaffMutation.isPending || updateStaffMutation.isPending}
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
