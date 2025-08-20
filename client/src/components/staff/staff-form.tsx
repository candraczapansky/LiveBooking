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
import { AntiAutofillInput } from "@/components/ui/anti-autofill-input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, X, Shield, CheckCircle } from "lucide-react";
// Removed Checkbox to prevent nested state update loops during permission toggles
import { Badge } from "@/components/ui/badge";
// Select already imported above in this file

// Staff form schema
const staffFormSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  bio: z.string().optional(),
  photo: z.string().optional(),
  commissionType: z.enum(["hourly", "commission", "fixed", "hourly_commission"]).default("commission"),
  commissionRate: z.number().min(0).max(100).default(0),
  hourlyRate: z.number().min(0).optional(),
  fixedSalary: z.number().min(0).optional(),
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  permissionGroups: z.array(z.number()).default([]),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

type StaffFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId?: number;
};

const StaffForm = ({ open, onOpenChange, staffId }: StaffFormProps) => {
  console.log("StaffForm component rendered - open:", open, "staffId:", staffId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [staffData, setStaffData] = useState<any>(null);
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
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      permissionGroups: [],
    },
  });

  // Watch permission groups once to avoid multiple subscriptions per render
  const selectedPermissionGroups = form.watch('permissionGroups') || [];

  // Fetch permission groups
  const { data: permissionGroups, isLoading: permissionGroupsLoading } = useQuery({
    queryKey: ['permission-groups'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/permission-groups");
      return response.json();
    },
  });



  // Use React Query to fetch staff data
  const { data: staffQueryData, isLoading } = useQuery({
    queryKey: ['/api/staff', staffId],
    enabled: !!staffId && open,
  });

  // Update form when staff data changes
  useEffect(() => {
    if (staffQueryData && open) {
      console.log("Setting form data from staffQueryData:", staffQueryData);
      // staffQueryData comes back as an array, so we need to get the first element
      const staffData = Array.isArray(staffQueryData) ? staffQueryData[0] : staffQueryData;
      setStaffData(staffData);
      
      // Load user's permission groups
      const loadUserPermissions = async () => {
        try {
          const userId = staffData?.userId;
          if (userId) {
            const response = await apiRequest("GET", `/api/user-permission-groups/${userId}`);
            const userGroups = await response.json();
            const groupIds = userGroups.data?.map((group: any) => group.groupId) || [];
            
            const formData = {
              title: staffData?.title || "",
              bio: staffData?.bio || "",
              commissionRate: staffData?.commissionType === 'commission' 
                ? (staffData?.commissionRate || 0) * 100  // Convert from decimal to percentage for form
                : 0,
              hourlyRate: staffData?.hourlyRate || 0,
              fixedSalary: staffData?.fixedRate || 0,
              commissionType: staffData?.commissionType || "commission",
              firstName: staffData?.user?.firstName || "",
              lastName: staffData?.user?.lastName || "",
              email: staffData?.user?.email || "",
              phone: staffData?.user?.phone || "",
              photo: staffData?.photoUrl || "",
              permissionGroups: groupIds,
            };
            console.log("Form data being set:", formData);
            form.reset(formData);
          }
        } catch (error) {
          console.error("Failed to load user permission groups:", error);
          // Set form data without permission groups if loading fails
          const formData = {
            title: staffData?.title || "",
            bio: staffData?.bio || "",
            commissionRate: staffData?.commissionType === 'commission' 
              ? (staffData?.commissionRate || 0) * 100
              : 0,
            hourlyRate: staffData?.hourlyRate || 0,
            fixedSalary: staffData?.fixedRate || 0,
            commissionType: staffData?.commissionType || "commission",
            firstName: staffData?.user?.firstName || "",
            lastName: staffData?.user?.lastName || "",
            email: staffData?.user?.email || "",
            phone: staffData?.user?.phone || "",
            photo: staffData?.photoUrl || "",
            permissionGroups: [],
          };
          form.reset(formData);
        }
      };
      
      loadUserPermissions();
    } else if (open && !staffId) {
      // Reset form for new staff member
      form.reset({
        title: "",
        bio: "",
        commissionRate: 0,
        hourlyRate: 0,
        fixedSalary: 0,
        commissionType: "commission",
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        photo: "",
        permissionGroups: [],
      });
    }
  }, [staffQueryData, open, staffId, form]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  // Assigned services for this staff member (edit mode)
  const { data: assignedServices, isLoading: assignedServicesLoading } = useQuery({
    queryKey: ['/api/staff', staffId, 'services'],
    enabled: !!staffId && open,
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/staff/${staffId}/services`);
      const body = await res.json();
      return Array.isArray(body) ? body : (body?.data ?? []);
    }
  });

  // All services for dropdown
  const { data: allServices } = useQuery({
    queryKey: ['/api/services'],
    enabled: open,
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/services');
      const body = await res.json();
      return Array.isArray(body) ? body : (body?.data ?? []);
    }
  });

  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  const createStaffMutation = useMutation({
    mutationFn: async (data: StaffFormValues) => {
      console.log("createStaffMutation.mutationFn called with data:", data);
      
      // Always create a new user for staff
      let userId;
      
      // Generate username from first and last name with timestamp for uniqueness
      const baseUsername = `${data.firstName.toLowerCase()}${data.lastName.toLowerCase()}`.replace(/[^a-z0-9]/g, '');
      const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp
      const username = `${baseUsername}${timestamp}`;
      const randomSuffix = Math.random().toString(36).slice(-6);
      const defaultPassword = `${data.firstName || 'Staff'}${randomSuffix}!A1`; // Ensure >= 8 chars to satisfy backend validation
      
      console.log(`Creating user with username: ${username}`);
      
      const userData = {
        username,
        email: data.email,
        password: defaultPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || "",
        role: "staff",
      };

      console.log("Sending user data to /api/register/staff:", userData);

      try {
        const userResponse = await apiRequest("POST", "/api/register/staff", userData);
        console.log("User creation response status:", userResponse.status);
        
        if (!userResponse.ok) {
          const errorData = await userResponse.json();
          console.log(`Failed to create user with username: ${username}, error: ${errorData.error}`);
          
          // Provide more specific error messages
          if (errorData.error?.includes("Username already taken")) {
            throw new Error("Username already exists. Please try again.");
          } else if (errorData.error?.includes("Email already registered")) {
            throw new Error("Email address is already registered. Please use a different email.");
          } else if (errorData.error?.includes("Phone number already registered")) {
            throw new Error("Phone number is already registered. Please use a different phone number.");
          } else {
            throw new Error(errorData.error || "Failed to create user account");
          }
        }

        const user = await userResponse.json();
        userId = user.user.id; // Fix: access user.id from the nested response structure
        console.log(`Successfully created user with username: ${username}, userId: ${userId}`);
      } catch (error) {
        console.error("User creation error:", error);
        throw error; // Re-throw to be handled by onError
      }

      // Create staff member using the userId obtained above
      console.log("Created user with ID:", userId);

      const staffData: any = {
        userId,
        title: data.title,
        bio: data.bio || "",
        commissionType: data.commissionType,
        commissionRate: data.commissionType === 'commission' ? data.commissionRate / 100 : null,
        hourlyRate: data.commissionType === 'hourly' ? data.hourlyRate : null,
        fixedRate: data.commissionType === 'fixed' ? data.fixedSalary : null,
      };
      if (data.photo) {
        staffData.photoUrl = data.photo;
      }

      console.log("Sending staff data to /api/staff:", staffData);

      try {
        const staffResponse = await apiRequest("POST", "/api/staff", staffData);
        console.log("Staff creation response status:", staffResponse.status);
        
        if (!staffResponse.ok) {
          const errorData = await staffResponse.json();
          console.log("Staff creation failed with error:", errorData);
          throw new Error(errorData.error || "Failed to create staff member");
        }

        const staff = await staffResponse.json();
        console.log("Staff creation successful:", staff);

        // Assign permission groups if any are selected
        if (data.permissionGroups && data.permissionGroups.length > 0) {
          console.log("Assigning permission groups:", data.permissionGroups);
          for (const groupId of data.permissionGroups) {
            try {
              await apiRequest("POST", "/api/user-permission-groups", {
                userId: userId,
                groupId: groupId
              });
              console.log(`Assigned permission group ${groupId} to user ${userId}`);
            } catch (error) {
              console.error(`Failed to assign permission group ${groupId}:`, error);
              // Continue with other groups even if one fails
            }
          }
        }

        return staff;
      } catch (error) {
        console.error("Staff creation error:", error);
        // If staff creation fails, we should clean up the user we just created
        if (userId) {
          try {
            await apiRequest("DELETE", `/api/users/${userId}`);
            console.log("Cleaned up user after staff creation failure");
          } catch (cleanupError) {
            console.error("Failed to cleanup user after staff creation failure:", cleanupError);
          }
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      console.log("Staff member created successfully!");
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Staff creation mutation error:", error);
      console.error("Failed to create staff member:", error instanceof Error ? error.message : "Unknown error");
    }
  });

  const updateStaffMutation = useMutation({
    mutationFn: async (data: StaffFormValues) => {
      if (!staffId) throw new Error("Staff ID is required for update");
      
      console.log("Updating staff with data:", data);

      // Update user information
      const userData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
      };

      const userId = staffData?.userId;
      if (!userId) throw new Error("Staff user ID not found");
      
      console.log("Updating user:", userId, "with data:", userData);
      const userResponse = await apiRequest("PATCH", `/api/users/${userId}`, userData);
      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        throw new Error(errorData.error || "Failed to update user");
      }

      // Update staff information
      const staffUpdateData = {
        title: data.title,
        bio: data.bio,
        commission_type: data.commissionType,
        commission_rate: data.commissionType === 'commission' ? data.commissionRate / 100 : null,
        hourly_rate: data.commissionType === 'hourly' ? data.hourlyRate : null,
        fixed_rate: data.commissionType === 'fixed' ? data.fixedSalary : null,
        photo_url: data.photo || null,
      };

      console.log("Sending PATCH request to:", `/api/staff/${staffId}`, "with data:", staffUpdateData);
      const staffResponse = await apiRequest("PATCH", `/api/staff/${staffId}`, staffUpdateData);
      console.log("Staff update response status:", staffResponse.status);
      
      if (!staffResponse.ok) {
        const errorData = await staffResponse.json();
        console.error("Staff update failed with error:", errorData);
        throw new Error(errorData.error || "Failed to update staff member");
      }

      const updatedStaff = await staffResponse.json();
      console.log("Staff update successful, returned data:", updatedStaff);

      // Update permission groups
      if (data.permissionGroups !== undefined) {
        console.log("Updating permission groups for user:", userId);
        
        // First, get current permission groups
        try {
          const currentGroupsResponse = await apiRequest("GET", `/api/user-permission-groups/${userId}`);
          const currentGroups = await currentGroupsResponse.json();
          const currentGroupIds = currentGroups.data?.map((group: any) => group.groupId) || [];
          
          // Remove groups that are no longer selected
          for (const groupId of currentGroupIds) {
            if (!data.permissionGroups.includes(groupId)) {
              try {
                await apiRequest("DELETE", `/api/user-permission-groups/${userId}/${groupId}`);
                console.log(`Removed permission group ${groupId} from user ${userId}`);
              } catch (error) {
                console.error(`Failed to remove permission group ${groupId}:`, error);
              }
            }
          }
          
          // Add new groups that are selected
          for (const groupId of data.permissionGroups) {
            if (!currentGroupIds.includes(groupId)) {
              try {
                await apiRequest("POST", "/api/user-permission-groups", {
                  userId: userId,
                  groupId: groupId
                });
                console.log(`Added permission group ${groupId} to user ${userId}`);
              } catch (error) {
                console.error(`Failed to add permission group ${groupId}:`, error);
              }
            }
          }
        } catch (error) {
          console.error("Failed to update permission groups:", error);
        }
      }

      return updatedStaff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      queryClient.invalidateQueries({ queryKey: ['/api/staff', staffId] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      console.log("Staff member updated successfully!");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Failed to update staff member:", error instanceof Error ? error.message : "Unknown error");
    }
  });

  const onSubmit = async (data: StaffFormValues) => {
    console.log("Form submission data:", data);
    console.log("Form errors:", form.formState.errors);
    console.log("Current form values from watch:", form.getValues());
    console.log("StaffData in state:", staffData);
    console.log("Form is valid:", form.formState.isValid);
    console.log("Form is dirty:", form.formState.isDirty);
    
    // Enhanced validation with detailed error messages
    const validationErrors = [];
    
    if (!data.email?.trim()) {
      validationErrors.push("Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      validationErrors.push("Please enter a valid email address");
    }
    
    if (!data.firstName?.trim()) {
      validationErrors.push("First name is required");
    }
    
    if (!data.lastName?.trim()) {
      validationErrors.push("Last name is required");
    }
    
    if (!data.title?.trim()) {
      validationErrors.push("Job title is required");
    }
    
    // Check commission rate based on commission type
    if (data.commissionType === 'commission' && (data.commissionRate <= 0 || data.commissionRate > 100)) {
      validationErrors.push("Commission rate must be between 0 and 100%");
    }
    
    if (data.commissionType === 'hourly' && (!data.hourlyRate || data.hourlyRate <= 0)) {
      validationErrors.push("Hourly rate must be greater than 0");
    }
    
    if (data.commissionType === 'fixed' && (!data.fixedSalary || data.fixedSalary <= 0)) {
      validationErrors.push("Fixed salary must be greater than 0");
    }
    
    if (validationErrors.length > 0) {
      console.error("Validation errors:", validationErrors);
      // Toast system is disabled, so we'll just log the errors
      console.error("Validation Error:", validationErrors.join(", "));
      return;
    }
    
    try {
      if (staffId) {
        console.log("Calling update mutation for staff ID:", staffId);
        updateStaffMutation.mutate(data);
      } else {
        console.log("Calling create mutation for new staff");
        createStaffMutation.mutate(data);
      }
    } catch (error) {
      console.error("Error in onSubmit:", error);
      // Toast system is disabled, so we'll just log the error
      console.error("Form submission failed:", error instanceof Error ? error.message : "Unknown error");
    }
  };



  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error("Invalid file type: Please select an image file (JPEG, PNG, GIF, etc.)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error("File too large: Please select an image smaller than 5MB");
      return;
    }

    setUploadingPhoto(true);

    try {
      // Convert file to data URL for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        form.setValue('photo', dataUrl);
        setUploadingPhoto(false);
      };
      reader.onerror = () => {
        console.error("Upload failed: Failed to read the image file");
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload failed: Failed to process the image file");
      setUploadingPhoto(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate autoComplete="off">
            {/* Anti-autofill hidden fields */}
            <input type="text" style={{ display: 'none' }} tabIndex={-1} />
            <input type="password" style={{ display: 'none' }} tabIndex={-1} />
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
                      <AntiAutofillInput 
                        placeholder="John" 
                        value={field.value || ''}
                        onChange={field.onChange}
                      />
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
                      <AntiAutofillInput 
                        placeholder="Doe" 
                        value={field.value || ''}
                        onChange={field.onChange}
                      />
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
                      <Input 
                        type="text" 
                        placeholder="Enter email address" 
                        autoComplete="nope"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        data-lpignore="true"
                        data-form-type="other"
                        {...field} 
                      />
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
                      <Input 
                        placeholder="(555) 123-4567" 
                        autoComplete="nope"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        data-lpignore="true"
                        data-form-type="other"
                        {...field} 
                      />
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
                            onClick={() => {
                              field.onChange("");
                              if (fileInputRef.current) {
                                fileInputRef.current.value = "";
                              }
                            }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Remove Photo
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                        
                        {!field.value && (
                          <div className="text-center">
                            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 mb-2">
                              Upload a profile photo
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={triggerFileUpload}
                              disabled={uploadingPhoto}
                            >
                              {uploadingPhoto ? "Uploading..." : "Choose File"}
                            </Button>
                            <p className="text-xs text-gray-500 mt-2">
                              JPEG, PNG, GIF up to 5MB
                            </p>
                          </div>
                        )}
                        
                        {field.value && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={triggerFileUpload}
                            disabled={uploadingPhoto}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploadingPhoto ? "Uploading..." : "Change Photo"}
                          </Button>
                        )}
                      </div>
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

            {/* Permissions Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold">Access Permissions</h3>
              </div>
              <p className="text-sm text-gray-600">
                Select permission groups to control what this staff member can access
              </p>
              
              {permissionGroupsLoading ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">Loading permission groups...</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {permissionGroups?.data?.map((group: any) => (
                    <div
                      key={group.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedPermissionGroups.includes(group.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        const currentGroups = selectedPermissionGroups;
                        const next = currentGroups.includes(group.id)
                          ? currentGroups.filter((id: number) => id !== group.id)
                          : [...currentGroups, group.id];
                        form.setValue('permissionGroups', next, { shouldDirty: true, shouldTouch: true });
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5 h-4 w-4 flex items-center justify-center">
                          {selectedPermissionGroups.includes(group.id) ? (
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                          ) : (
                            <span className="inline-block h-4 w-4 border border-gray-300 rounded" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{group.name}</h4>
                            {group.isSystem && (
                              <Badge variant="secondary" className="text-xs">System</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Services Assignment (Edit only) */}
            {staffId && (
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Assign Services</h3>
                </div>

                {/* Assigned services list */}
                {assignedServicesLoading ? (
                  <div className="text-sm text-gray-500">Loading services…</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(assignedServices || []).length === 0 && (
                      <div className="text-sm text-gray-500">No services assigned</div>
                    )}
                    {(assignedServices || []).map((svc: any) => (
                      <div key={svc.id} className="inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-xs">
                        <span>{svc.name}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await apiRequest('DELETE', `/api/staff/${staffId}/services/${svc.id}`);
                              queryClient.invalidateQueries({ queryKey: ['/api/staff', staffId, 'services'] });
                            } catch (e) {}
                          }}
                          className="text-gray-500 hover:text-red-600"
                          aria-label="Remove service"
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add service */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                    <SelectTrigger>
                      <SelectValue placeholder={(allServices || []).length === 0 ? 'No services available' : 'Select a service'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(allServices || []).length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-gray-500">No services available</div>
                      ) : (
                        (allServices || []).map((svc: any) => (
                          <SelectItem key={svc.id} value={svc.id.toString()}>
                            {svc.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      const idNum = parseInt(selectedServiceId);
                      if (!idNum) {
                        console.error('Select a service first');
                        return;
                      }
                      try {
                        await apiRequest('POST', '/api/staff-services', { staffId, serviceId: idNum });
                        setSelectedServiceId("");
                        queryClient.invalidateQueries({ queryKey: ['/api/staff', staffId, 'services'] });
                      } catch (e) {}
                    }}
                    className="h-9"
                  >
                    Add Service
                  </Button>
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