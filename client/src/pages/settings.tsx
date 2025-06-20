import { useState, useEffect } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useToast } from "@/hooks/use-toast";
import { useContext } from "react";
import { AuthContext } from "@/App";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Building, 
  Bell, 
  Lock, 
  CreditCard, 
  Mail, 
  Smartphone,
  Globe,
  Clock,
  PaintBucket,
  CheckSquare
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import SavedPaymentMethods from "@/components/payment/saved-payment-methods";

// Business Information Form Schema
const businessInfoSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address"),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  description: z.string().optional(),
});

// User Profile Form Schema
const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Password must be at least 6 characters").optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: "Current password is required to set a new password",
  path: ["currentPassword"],
}).refine((data) => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Notification Settings Form Schema
const notificationSchema = z.object({
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(true),
  newAppointmentNotifications: z.boolean().default(true),
  appointmentReminderNotifications: z.boolean().default(true),
  marketingNotifications: z.boolean().default(true),
});

type BusinessInfoValues = z.infer<typeof businessInfoSchema>;
type ProfileValues = z.infer<typeof profileSchema>;
type NotificationValues = z.infer<typeof notificationSchema>;

const SettingsPage = () => {
  useDocumentTitle("Settings | BeautyBook");
  const { toast } = useToast();
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("business");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const checkSidebarState = () => {
      const globalSidebarState = (window as any).sidebarIsOpen;
      if (globalSidebarState !== undefined) {
        setSidebarOpen(globalSidebarState);
      }
    };

    const interval = setInterval(checkSidebarState, 100);
    return () => clearInterval(interval);
  }, []);

  // Business Info Form
  const businessInfoForm = useForm<BusinessInfoValues>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: {
      businessName: "BeautyBook Salon & Spa",
      address: "123 Main Street",
      city: "San Francisco",
      state: "CA",
      zipCode: "94105",
      phone: "(555) 123-4567",
      email: "contact@beautybook.com",
      website: "https://beautybook.com",
      description: "A premium salon and spa offering a wide range of beauty and wellness services.",
    },
  });

  // Profile Form
  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Notification Settings Form
  const notificationForm = useForm<NotificationValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: true,
      smsNotifications: true,
      newAppointmentNotifications: true,
      appointmentReminderNotifications: true,
      marketingNotifications: false,
    },
  });

  const handleSaveBusinessInfo = (values: BusinessInfoValues) => {
    console.log("Business info values:", values);
    toast({
      title: "Settings Saved",
      description: "Your business information has been updated.",
    });
  };

  const handleSaveProfile = (values: ProfileValues) => {
    console.log("Profile values:", values);
    toast({
      title: "Profile Updated",
      description: "Your profile information has been saved.",
    });
  };

  const handleSaveNotifications = (values: NotificationValues) => {
    console.log("Notification values:", values);
    toast({
      title: "Notification Settings Saved",
      description: "Your notification preferences have been updated.",
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarOpen ? 'ml-64' : 'ml-0'
      }`}>
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Manage your salon settings and preferences
              </p>
            </div>
            
            {/* Settings Tabs */}
            <Tabs defaultValue="business" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="business" className="flex items-center">
                  <Building className="h-4 w-4 mr-2" />
                  Business
                </TabsTrigger>
                <TabsTrigger value="profile" className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="payment" className="flex items-center">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Payment Methods
                </TabsTrigger>
                <TabsTrigger value="appearance" className="flex items-center">
                  <PaintBucket className="h-4 w-4 mr-2" />
                  Appearance
                </TabsTrigger>
              </TabsList>
              
              {/* Business Information Tab */}
              <TabsContent value="business">
                <Card>
                  <CardHeader>
                    <CardTitle>Business Information</CardTitle>
                    <CardDescription>
                      Manage your salon's business details that will appear on customer-facing materials
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...businessInfoForm}>
                      <form onSubmit={businessInfoForm.handleSubmit(handleSaveBusinessInfo)} className="space-y-6">
                        <FormField
                          control={businessInfoForm.control}
                          name="businessName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={businessInfoForm.control}
                            name="address"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Address</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={businessInfoForm.control}
                              name="city"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>City</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={businessInfoForm.control}
                              name="state"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>State</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={businessInfoForm.control}
                              name="zipCode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Zip Code</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={businessInfoForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={businessInfoForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={businessInfoForm.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Website (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={businessInfoForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Description (Optional)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  rows={3}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormDescription>
                                Brief description of your business that will appear on your booking page.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="pt-4 flex justify-end">
                          <Button type="submit">Save Changes</Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
                
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Business Hours</CardTitle>
                    <CardDescription>
                      Set your salon's operating hours for each day of the week
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                        <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b">
                          <div className="font-medium mb-2 sm:mb-0">{day}</div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <select className="border border-gray-300 dark:border-gray-600 rounded p-1 text-sm">
                              <option>9:00 AM</option>
                              <option>10:00 AM</option>
                              <option>Closed</option>
                            </select>
                            <span>to</span>
                            <select className="border border-gray-300 dark:border-gray-600 rounded p-1 text-sm">
                              <option>5:00 PM</option>
                              <option>6:00 PM</option>
                              <option>7:00 PM</option>
                              <option>Closed</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-4 flex justify-end">
                      <Button onClick={() => toast({ title: "Hours Saved", description: "Your business hours have been updated." })}>
                        Save Hours
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Profile Tab */}
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Profile</CardTitle>
                    <CardDescription>
                      Manage your personal information and account settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(handleSaveProfile)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={profileForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={profileForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number (Optional)</FormLabel>
                                <FormControl>
                                  <Input {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="pt-2">
                          <h3 className="text-base font-medium mb-4">Change Password</h3>
                          <div className="space-y-4">
                            <FormField
                              control={profileForm.control}
                              name="currentPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Current Password</FormLabel>
                                  <FormControl>
                                    <Input type="password" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={profileForm.control}
                                name="newPassword"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>New Password</FormLabel>
                                    <FormControl>
                                      <Input type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={profileForm.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Confirm New Password</FormLabel>
                                    <FormControl>
                                      <Input type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-4 flex justify-end">
                          <Button type="submit">Save Profile</Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
                
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center text-red-600">
                      <Lock className="h-5 w-5 mr-2" />
                      Danger Zone
                    </CardTitle>
                    <CardDescription>
                      Irreversible actions that affect your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                        <div>
                          <h3 className="font-medium">Delete Account</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            This will permanently delete your account and all associated data.
                          </p>
                        </div>
                        <Button 
                          variant="destructive" 
                          className="mt-3 md:mt-0"
                          onClick={() => 
                            toast({
                              title: "Action Not Available",
                              description: "Account deletion is disabled in the demo.",
                              variant: "destructive"
                            })
                          }
                        >
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Notifications Tab */}
              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Settings</CardTitle>
                    <CardDescription>
                      Control how you receive notifications from the system
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...notificationForm}>
                      <form onSubmit={notificationForm.handleSubmit(handleSaveNotifications)} className="space-y-6">
                        <div className="space-y-4">
                          <h3 className="text-base font-medium flex items-center">
                            <Mail className="h-4 w-4 mr-2" />
                            Email Notifications
                          </h3>
                          <FormField
                            control={notificationForm.control}
                            name="emailNotifications"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                                <div className="space-y-0.5">
                                  <FormLabel>Receive Email Notifications</FormLabel>
                                  <FormDescription>
                                    Get updates and alerts via email
                                  </FormDescription>
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
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="text-base font-medium flex items-center">
                            <Smartphone className="h-4 w-4 mr-2" />
                            SMS Notifications
                          </h3>
                          <FormField
                            control={notificationForm.control}
                            name="smsNotifications"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                                <div className="space-y-0.5">
                                  <FormLabel>Receive SMS Notifications</FormLabel>
                                  <FormDescription>
                                    Get updates and alerts via text message
                                  </FormDescription>
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
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="text-base font-medium">Notification Types</h3>
                          
                          <FormField
                            control={notificationForm.control}
                            name="newAppointmentNotifications"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                                <div className="space-y-0.5">
                                  <FormLabel>New Appointment Notifications</FormLabel>
                                  <FormDescription>
                                    Receive alerts when new appointments are booked
                                  </FormDescription>
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
                          
                          <FormField
                            control={notificationForm.control}
                            name="appointmentReminderNotifications"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                                <div className="space-y-0.5">
                                  <FormLabel>Appointment Reminder Notifications</FormLabel>
                                  <FormDescription>
                                    Receive reminders about upcoming appointments
                                  </FormDescription>
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
                          
                          <FormField
                            control={notificationForm.control}
                            name="marketingNotifications"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                                <div className="space-y-0.5">
                                  <FormLabel>Marketing Notifications</FormLabel>
                                  <FormDescription>
                                    Receive promotional offers and updates
                                  </FormDescription>
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
                        </div>
                        
                        <div className="pt-4 flex justify-end">
                          <Button type="submit">Save Notification Settings</Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Payment Methods Tab */}
              <TabsContent value="payment">
                <SavedPaymentMethods />
              </TabsContent>
              
              {/* Appearance Tab */}
              <TabsContent value="appearance">
                <Card>
                  <CardHeader>
                    <CardTitle>Appearance Settings</CardTitle>
                    <CardDescription>
                      Customize the look and feel of your BeautyBook dashboard
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-medium mb-4">Theme</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                            <div className="h-24 bg-white"></div>
                            <div className="p-4 flex items-center justify-between">
                              <span className="text-sm font-medium">Light</span>
                              <CheckSquare className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          
                          <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                            <div className="h-24 bg-gray-900"></div>
                            <div className="p-4 flex items-center justify-between">
                              <span className="text-sm font-medium">Dark</span>
                              <div className="h-5 w-5"></div>
                            </div>
                          </div>
                          
                          <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                            <div className="h-24 bg-gradient-to-b from-white to-gray-900"></div>
                            <div className="p-4 flex items-center justify-between">
                              <span className="text-sm font-medium">System</span>
                              <div className="h-5 w-5"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4">
                        <h3 className="text-base font-medium mb-4">Branding</h3>
                        <div className="space-y-4">
                          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                            <h4 className="text-sm font-medium mb-2">Logo</h4>
                            <div className="flex items-center space-x-4">
                              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center text-gray-400">
                                <Globe className="h-8 w-8" />
                              </div>
                              <Button variant="outline">Upload Logo</Button>
                            </div>
                          </div>
                          
                          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                            <h4 className="text-sm font-medium mb-2">Primary Color</h4>
                            <div className="flex items-center space-x-4">
                              <div className="w-8 h-8 bg-primary rounded"></div>
                              <Input type="text" value="#4F46E5" readOnly className="w-32" />
                              <Button variant="outline">Change</Button>
                            </div>
                          </div>
                          
                          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                            <h4 className="text-sm font-medium mb-2">Secondary Color</h4>
                            <div className="flex items-center space-x-4">
                              <div className="w-8 h-8 bg-secondary rounded"></div>
                              <Input type="text" value="#10B981" readOnly className="w-32" />
                              <Button variant="outline">Change</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4 flex justify-end">
                        <Button onClick={() => toast({ title: "Appearance Settings Saved", description: "Your appearance settings have been updated." })}>
                          Save Appearance Settings
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Booking Widget Customization</CardTitle>
                    <CardDescription>
                      Customize the appearance of your client-facing booking widget
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                        <h4 className="text-sm font-medium mb-2">Widget Header</h4>
                        <Input defaultValue="Book Your Appointment" />
                      </div>
                      
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                        <h4 className="text-sm font-medium mb-2">Welcome Message</h4>
                        <Textarea 
                          defaultValue="Welcome to BeautyBook Salon & Spa. Please select a service to get started with your booking."
                          rows={3}
                        />
                      </div>
                      
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Show Service Images</h4>
                          <Switch defaultChecked />
                        </div>
                      </div>
                      
                      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Show Staff Photos</h4>
                          <Switch defaultChecked />
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-6 flex justify-end">
                      <Button onClick={() => toast({ title: "Widget Settings Saved", description: "Your booking widget settings have been updated." })}>
                        Save Widget Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
