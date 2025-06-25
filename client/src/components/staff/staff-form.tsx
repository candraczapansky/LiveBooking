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
  email: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
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
    },
  });



  // Fetch staff data if editing
  useEffect(() => {
    if (staffId && open) {
      setIsLoading(true);
      fetch(`/api/staff/${staffId}`)
        .then(res => res.json())
        .then(data => {
          setStaffData(data); // Store staff data for later use
          form.reset({
            title: data.title || "",
            bio: data.bio || "",
            commissionRate: data.commissionRate || 0,
            firstName: data.user?.firstName || "",
            lastName: data.user?.lastName || "",
            email: data.user?.email || "",
            phone: data.user?.phone || "",
          });
          setIsLoading(false);
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
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
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
      
      // Generate username from first and last name with timestamp for uniqueness
      const baseUsername = `${data.firstName.toLowerCase()}${data.lastName.toLowerCase()}`.replace(/[^a-z0-9]/g, '');
      const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp
      const username = `${baseUsername}${timestamp}`;
      const defaultPassword = `${data.firstName}123!`; // Simple default password
      
      console.log(`Creating user with username: ${username}`);
      
      const userData = {
        username,
        email: data.email,
        password: defaultPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: "staff",
      };

      const userResponse = await apiRequest("POST", "/api/register", userData);
      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        console.log(`Failed to create user with username: ${username}, error: ${errorData.error}`);
        throw new Error(errorData.error || "Failed to create user");
      }

      const user = await userResponse.json();
      userId = user.id;
      console.log(`Successfully created user with username: ${username}`);


      // Create staff member
      const staffData = {
        userId: userId,
        title: data.title,
        bio: data.bio,
        commissionType: data.commissionType,
        commissionRate: data.commissionType === 'commission' ? data.commissionRate / 100 : undefined,
        hourlyRate: data.commissionType === 'hourly' ? data.commissionRate : undefined,
        fixedRate: data.commissionType === 'fixed' ? data.commissionRate : undefined,
      };

      const staffResponse = await apiRequest("POST", "/api/staff", staffData);
      if (!staffResponse.ok) {
        const errorData = await staffResponse.json();
        throw new Error(errorData.error || "Failed to create staff member");
      }

      const staff = await staffResponse.json();
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
    console.log("Form submission data:", data);
    console.log("Form errors:", form.formState.errors);
    
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
      toast({
        title: "Error",
        description: `Form submission failed: ${error.message}`,
        variant: "destructive",
      });
    }
  };



  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, GIF, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
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
        toast({
          title: "Upload failed",
          description: "Failed to read the image file",
          variant: "destructive",
        });
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to process the image file",
        variant: "destructive",
      });
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder="Enter email address" 
                        autoComplete="off"
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