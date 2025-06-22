import { useState, useContext, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { AuthContext } from "@/App";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { 
  Bell, 
  Moon, 
  Sun, 
  Shield, 
  Smartphone, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  Save,
  Camera,
  User
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters long"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordChangeForm = z.infer<typeof passwordChangeSchema>;

export default function Settings() {
  const { toast } = useToast();
  const { user } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [appointmentReminders, setAppointmentReminders] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Color theme state
  const [primaryColor, setPrimaryColor] = useState('#ec4899');
  const [accentColor, setAccentColor] = useState('#06b6d4');
  const [iconColor, setIconColor] = useState('#6b7280');

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

  const passwordForm = useForm<PasswordChangeForm>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeForm) => {
      const response = await fetch("/api/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.id,
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to change password");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveNotifications = () => {
    toast({
      title: "Settings saved",
      description: "Your notification preferences have been updated.",
    });
  };

  const handleChangePassword = (data: PasswordChangeForm) => {
    changePasswordMutation.mutate(data);
  };

  const handleColorChange = (colorType: 'primary' | 'accent' | 'icon', color: string) => {
    switch (colorType) {
      case 'primary':
        setPrimaryColor(color);
        break;
      case 'accent':
        setAccentColor(color);
        break;
      case 'icon':
        setIconColor(color);
        break;
    }
  };

  const applyColorTheme = () => {
    // Apply the color theme to CSS custom properties
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    document.documentElement.style.setProperty('--accent-color', accentColor);
    document.documentElement.style.setProperty('--icon-color', iconColor);
    
    // Save to localStorage for persistence
    localStorage.setItem('colorTheme', JSON.stringify({
      primary: primaryColor,
      accent: accentColor,
      icon: iconColor
    }));

    toast({
      title: "Theme updated",
      description: "Your color preferences have been saved and applied.",
    });
  };

  // Load saved color theme on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('colorTheme');
    if (savedTheme) {
      try {
        const theme = JSON.parse(savedTheme);
        setPrimaryColor(theme.primary || '#ec4899');
        setAccentColor(theme.accent || '#06b6d4');
        setIconColor(theme.icon || '#6b7280');
        
        // Apply saved colors to CSS
        document.documentElement.style.setProperty('--primary-color', theme.primary || '#ec4899');
        document.documentElement.style.setProperty('--accent-color', theme.accent || '#06b6d4');
        document.documentElement.style.setProperty('--icon-color', theme.icon || '#6b7280');
      } catch (error) {
        console.error('Error loading saved theme:', error);
      }
    }
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarOpen ? 'ml-64' : 'ml-0'
      }`}>
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profile & Settings</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your profile information, account preferences and security settings.
              </p>
            </div>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and contact information.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Picture */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src="https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120"
                  alt="Profile picture"
                />
                <AvatarFallback className="text-lg">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{user?.firstName} {user?.lastName}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {user?.role || "User"}
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Camera className="h-4 w-4 mr-2" />
                  Change Photo
                </Button>
              </div>
            </div>

            {/* Profile Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input value={user?.firstName || ""} disabled className="mt-1" />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={user?.lastName || ""} disabled className="mt-1" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled className="mt-1" />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input value={user?.phone || ""} disabled className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Username</Label>
                <Input value={user?.username || ""} disabled className="mt-1" />
              </div>
              <div>
                <Label>Member Since</Label>
                <Input 
                  value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"} 
                  disabled 
                  className="mt-1" 
                />
              </div>
            </div>

            <Button className="w-full">
              <User className="h-4 w-4 mr-2" />
              Edit Profile Information
            </Button>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sun className="h-5 w-5 mr-2" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how the application looks and feels.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Dark Mode</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Use dark theme for better viewing in low light
                </p>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>

            <Separator />

            {/* Color Customization */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-3">Color Theme</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Customize colors for icons, buttons, and interface elements
                </p>
              </div>

              {/* Primary Color */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Primary Color</Label>
                <p className="text-xs text-gray-600 dark:text-gray-400">Used for buttons, links, and active states</p>
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-2">
                    {[
                      { name: 'Blue', value: '#3b82f6', class: 'bg-blue-500' },
                      { name: 'Purple', value: '#8b5cf6', class: 'bg-purple-500' },
                      { name: 'Pink', value: '#ec4899', class: 'bg-pink-500' },
                      { name: 'Green', value: '#10b981', class: 'bg-green-500' },
                      { name: 'Orange', value: '#f59e0b', class: 'bg-orange-500' },
                      { name: 'Red', value: '#ef4444', class: 'bg-red-500' },
                    ].map((color) => (
                      <button
                        key={color.name}
                        className={`w-8 h-8 rounded-full border-2 ${primaryColor === color.value ? 'border-gray-800 ring-2 ring-offset-2 ring-gray-300' : 'border-gray-300 hover:border-gray-400'} transition-all ${color.class}`}
                        title={color.name}
                        onClick={() => handleColorChange('primary', color.value)}
                      />
                    ))}
                  </div>
                  <Input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => handleColorChange('primary', e.target.value)}
                    className="w-16 h-8 p-1 border rounded"
                    title="Custom primary color"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Accent Color</Label>
                <p className="text-xs text-gray-600 dark:text-gray-400">Used for highlights and secondary elements</p>
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-2">
                    {[
                      { name: 'Cyan', value: '#06b6d4', class: 'bg-cyan-500' },
                      { name: 'Teal', value: '#14b8a6', class: 'bg-teal-500' },
                      { name: 'Indigo', value: '#6366f1', class: 'bg-indigo-500' },
                      { name: 'Rose', value: '#f43f5e', class: 'bg-rose-500' },
                      { name: 'Amber', value: '#f59e0b', class: 'bg-amber-500' },
                      { name: 'Lime', value: '#84cc16', class: 'bg-lime-500' },
                    ].map((color) => (
                      <button
                        key={color.name}
                        className={`w-8 h-8 rounded-full border-2 ${accentColor === color.value ? 'border-gray-800 ring-2 ring-offset-2 ring-gray-300' : 'border-gray-300 hover:border-gray-400'} transition-all ${color.class}`}
                        title={color.name}
                        onClick={() => handleColorChange('accent', color.value)}
                      />
                    ))}
                  </div>
                  <Input
                    type="color"
                    value={accentColor}
                    onChange={(e) => handleColorChange('accent', e.target.value)}
                    className="w-16 h-8 p-1 border rounded"
                    title="Custom accent color"
                  />
                </div>
              </div>

              {/* Icon Color */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Icon Color</Label>
                <p className="text-xs text-gray-600 dark:text-gray-400">Default color for icons throughout the app</p>
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-2">
                    {[
                      { name: 'Gray', value: '#6b7280', class: 'bg-gray-500' },
                      { name: 'Slate', value: '#64748b', class: 'bg-slate-500' },
                      { name: 'Stone', value: '#78716c', class: 'bg-stone-500' },
                      { name: 'Neutral', value: '#737373', class: 'bg-neutral-500' },
                      { name: 'Zinc', value: '#71717a', class: 'bg-zinc-500' },
                      { name: 'Black', value: '#000000', class: 'bg-black' },
                    ].map((color) => (
                      <button
                        key={color.name}
                        className={`w-8 h-8 rounded-full border-2 ${iconColor === color.value ? 'border-gray-800 ring-2 ring-offset-2 ring-gray-300' : 'border-gray-300 hover:border-gray-400'} transition-all ${color.class}`}
                        title={color.name}
                        onClick={() => handleColorChange('icon', color.value)}
                      />
                    ))}
                  </div>
                  <Input
                    type="color"
                    value={iconColor}
                    onChange={(e) => handleColorChange('icon', e.target.value)}
                    className="w-16 h-8 p-1 border rounded"
                    title="Custom icon color"
                  />
                </div>
              </div>

              {/* Preview Section */}
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-sm font-medium">Preview</Label>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                  <div className="flex items-center space-x-3">
                    <Button size="sm" style={{ backgroundColor: primaryColor, borderColor: primaryColor }}>
                      <Save className="h-4 w-4 mr-2" />
                      Primary Button
                    </Button>
                    <Button variant="outline" size="sm" style={{ borderColor: accentColor, color: accentColor }}>
                      <Bell className="h-4 w-4 mr-2" />
                      Accent Button
                    </Button>
                  </div>
                  <div className="flex items-center space-x-2" style={{ color: iconColor }}>
                    <User className="h-4 w-4" />
                    <Settings className="h-4 w-4" />
                    <Shield className="h-4 w-4" />
                    <span className="text-sm">Sample icons</span>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              className="w-full" 
              style={{ backgroundColor: primaryColor }}
              onClick={applyColorTheme}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Appearance Settings
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure how you want to receive notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Notifications
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base flex items-center">
                    <Smartphone className="h-4 w-4 mr-2" />
                    SMS Notifications
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive notifications via text message
                  </p>
                </div>
                <Switch
                  checked={smsNotifications}
                  onCheckedChange={setSmsNotifications}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Appointment Reminders</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Get reminded about upcoming appointments
                  </p>
                </div>
                <Switch
                  checked={appointmentReminders}
                  onCheckedChange={setAppointmentReminders}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Marketing Emails</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive promotional offers and updates
                  </p>
                </div>
                <Switch
                  checked={marketingEmails}
                  onCheckedChange={setMarketingEmails}
                />
              </div>
            </div>

            <Button onClick={handleSaveNotifications} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save Notification Settings
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Security
            </CardTitle>
            <CardDescription>
              Manage your password and security preferences.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="Enter your current password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Enter your new password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your new password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={changePasswordMutation.isPending}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {changePasswordMutation.isPending ? "Changing Password..." : "Change Password"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible and destructive actions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" className="w-full">
              Delete Account
            </Button>
          </CardContent>
        </Card>
          </div>
        </main>
      </div>
    </div>
  );
}