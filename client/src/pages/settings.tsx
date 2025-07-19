import { useState, useEffect, useRef, useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { AuthContext } from "@/contexts/AuthProvider";
import { useSidebar } from "@/contexts/SidebarContext";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User, 
  Lock, 
  Sun, 
  Moon, 
  Camera, 
  Save, 
  Shield, 
  Smartphone,
  Palette,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import TwoFactorSetupModal from "@/components/TwoFactorSetupModal";
import TwoFactorDisableModal from "@/components/TwoFactorDisableModal";
import timeZones from "@/lib/timezones"; // We'll add a list of IANA timezones

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
  useDocumentTitle("Settings - Glo Head Spa");
  
  const { toast } = useToast();
  const { user, updateUser, colorPreferencesApplied } = useContext(AuthContext);
  const { isOpen: sidebarOpen } = useSidebar();

  // Theme states
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedDarkMode = localStorage.getItem('darkMode');
      if (savedDarkMode !== null) {
        return savedDarkMode === 'true';
      }
      // Default to false instead of checking current state
      return false;
    }
    return false;
  });

  // Color customization states
  const [customColor, setCustomColor] = useState(() => {
    return localStorage.getItem('primaryColor') || '#8b5cf6';
  });

  // Text color states
  const [textColor, setTextColor] = useState(() => {
    return localStorage.getItem('textColor') || '#1f2937';
  });

  // Profile states
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || ''); 
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profilePicture, setProfilePicture] = useState<string | null>(user?.profilePicture || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2FA states
  const [show2faSetup, setShow2faSetup] = useState(false);
  const [show2faDisable, setShow2faDisable] = useState(false);
  const twoFactorEnabled = user?.twoFactorEnabled;

  // Load profile picture from user data or localStorage on component mount
  useEffect(() => {
    console.log('Settings page - Loading profile picture...');
    console.log('User from context:', user);
    console.log('User profile picture from context:', user?.profilePicture);
    
    // Prioritize database profile picture from user context
    if (user && user.profilePicture) {
      console.log('Using profile picture from user context');
      setProfilePicture(user.profilePicture);
      // Also sync to localStorage as backup
      localStorage.setItem('profilePicture', user.profilePicture);
    } else {
      // Fallback to localStorage if no database profile picture
      const savedPicture = localStorage.getItem('profilePicture');
      console.log('Profile picture from localStorage:', savedPicture ? 'Found' : 'Not found');
      if (savedPicture) {
        console.log('Using profile picture from localStorage');
        setProfilePicture(savedPicture);
      }
    }
  }, [user]);

  // Listen for user data updates (includes profile picture updates)
  useEffect(() => {
    const handleUserDataUpdate = (event: CustomEvent) => {
      console.log('Settings page received user data update:', event.detail);
      if (event.detail && event.detail.profilePicture) {
        setProfilePicture(event.detail.profilePicture);
        localStorage.setItem('profilePicture', event.detail.profilePicture);
      }
    };

    window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    };
  }, []);

  // Notification states
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  // Password form
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordForm = useForm<PasswordChangeForm>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Timezone state
  const [timezone, setTimezone] = useState<string>("America/New_York");
  type BusinessSettingsType = { timezone: string };
  const { data: businessSettings, refetch: refetchBusinessSettings } = useQuery<BusinessSettingsType>({
    queryKey: ["/api/business-settings"],
    queryFn: async () => {
      const res = await fetch("/api/business-settings");
      if (!res.ok) throw new Error("Failed to fetch business settings");
      return res.json();
    },
  });

  // Update timezone state when businessSettings changes
  useEffect(() => {
    if (businessSettings && businessSettings.timezone) {
      setTimezone(businessSettings.timezone);
    }
  }, [businessSettings]);

  // Remove auto-save from handleTimezoneChange
  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimezone(e.target.value);
  };

  // Add a save handler
  const handleSaveTimezone = async () => {

    try {
      const response = await fetch("/api/business-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[DEBUG] API error:", response.status, errorData);
        console.log("Error: Failed to save timezone. Please try again.");
        return;
      }
      
      const data = await response.json();
      
      console.log("Success: Timezone saved successfully");
      refetchBusinessSettings();
    } catch (error) {
      console.error("[DEBUG] Network error:", error);
      console.log("Error: Failed to save timezone. Please try again.");
    }
  };

  // Load user color preferences
  const loadUserColorPreferences = async () => {
    try {
      if (!user?.id) {
        console.log("No user ID available for loading color preferences");
        return;
      }
      
      const response = await fetch(`/api/users/${user.id}/color-preferences`);
      if (response.ok) {
        const colorPrefs = await response.json();
        if (colorPrefs) {
          console.log("Loaded user color preferences:", colorPrefs);
          if (colorPrefs.primaryColor) {
            setCustomColor(colorPrefs.primaryColor);
            localStorage.setItem('primaryColor', colorPrefs.primaryColor);
          }
          if (colorPrefs.primaryTextColor) {
            setTextColor(colorPrefs.primaryTextColor);
            localStorage.setItem('textColor', colorPrefs.primaryTextColor);
          }
        }
      } else if (response.status === 404) {
        console.log("No color preferences found, using defaults");
      } else {
        console.error("Error loading color preferences:", response.status);
      }
    } catch (error) {
      console.error("Error loading user color preferences:", error);
    }
  };

  // Load color preferences on mount
  useEffect(() => {
    if (user?.id) {
      loadUserColorPreferences();
    }
  }, [user?.id]);

  // Apply color preferences
  useEffect(() => {
    if (colorPreferencesApplied) {
      console.log("Color preferences applied, updating settings page");
      loadUserColorPreferences();
    }
  }, [colorPreferencesApplied]);

  // Apply primary color when it changes
  useEffect(() => {
    if (customColor) {
      // Don't apply colors directly - let AuthProvider handle it
      console.log('Primary color effect triggered:', customColor);
    }
  }, [customColor]);

  // Apply text colors when they change
  useEffect(() => {
    if (textColor) {
      // Don't apply colors directly - let AuthProvider handle it
      console.log('Text color effect triggered:', textColor);
    }
  }, [textColor]);



  // Color utility functions
  function hexToHsl(hex: string): { h: number; s: number; l: number } {
    // Remove the # if present
    hex = hex.replace('#', '');
    
    // Parse the hex values
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  // Function to save color preferences immediately
  const saveColorPreferences = async (primaryColor: string, textColor: string) => {
    if (!user?.id) {
      console.log("No user ID available for saving color preferences");
      return;
    }
    
    try {
      const response = await fetch(`/api/users/${user.id}/color-preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          primaryColor,
          primaryTextColor: textColor,
          isDarkMode: false
        }),
      });
      
      if (response.ok) {
        const colorData = await response.json();
        console.log("Color preferences saved immediately:", colorData);
        
        // Dispatch color preferences updated event
        window.dispatchEvent(new CustomEvent('colorPreferencesUpdated'));
      } else {
        console.error("Failed to save color preferences:", response.status);
      }
    } catch (error) {
      console.error("Error saving color preferences:", error);
    }
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    localStorage.setItem('primaryColor', color);
    
    // Save color preferences immediately
    saveColorPreferences(color, textColor);
    
    // Dispatch color change event for immediate application
    window.dispatchEvent(new CustomEvent('colorChange', {
      detail: {
        type: 'colorChange',
        primaryColor: color
      }
    }));
    
    console.log('Primary color changed to:', color);
  };

  const handleTextColorChange = (color: string) => {
    setTextColor(color);
    localStorage.setItem('textColor', color);
    
    // Save color preferences immediately
    saveColorPreferences(customColor, color);
    
    // Dispatch color change event for immediate application
    window.dispatchEvent(new CustomEvent('colorChange', {
      detail: {
        type: 'colorChange',
        textColor: color
      }
    }));
    
    console.log('Text color changed to:', color);
  };



  const handleSaveProfile = () => {
    console.log("Saving profile...");
    console.log("User ID:", user?.id);
    console.log("Profile data:", {
      firstName,
      lastName,
      email,
      phone,
      profilePicture,
      primaryColor: customColor,
      textColor
    });

    if (!user?.id) {
      console.log("Error: No user ID available");
      return;
    }

    // Save profile data (without colors) to user table
    fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phone,
        profilePicture
      }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      return response.json();
    })
    .then(data => {
      console.log("Profile updated successfully:", data);
      
      // Update the user context
      if (updateUser) {
        updateUser(data);
      }
      
      // Dispatch custom event for other components
      const event = new CustomEvent('userDataUpdated', { detail: data });
      window.dispatchEvent(event);
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(data));
      localStorage.setItem('profilePicture', data.profilePicture || '');
      
      // Now save color preferences to the dedicated endpoint
      return fetch(`/api/users/${user.id}/color-preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          primaryColor: customColor,
          primaryTextColor: textColor,
          secondaryTextColor: textColorSecondary,
          isDarkMode: false
        }),
      });
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to save color preferences');
      }
      return response.json();
    })
    .then(colorData => {
      console.log("Color preferences saved successfully:", colorData);
      console.log("Success: Profile and color preferences updated successfully");
      
      // Dispatch color preferences updated event
      window.dispatchEvent(new CustomEvent('colorPreferencesUpdated'));
    })
    .catch(error => {
      console.error("Error updating profile or color preferences:", error);
      console.log("Error: Failed to update profile. Please try again.");
    });
  };

  const handleChangePassword = (data: PasswordChangeForm) => {
    console.log("Changing password...");
    console.log("Password data:", data);

    fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to change password');
      }
      return response.json();
    })
    .then(data => {
      console.log("Password changed successfully:", data);
      console.log("Success: Password changed successfully");
      passwordForm.reset();
    })
    .catch(error => {
      console.error("Error changing password:", error);
      console.log("Error: Failed to change password. Please try again.");
    });
  };

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setProfilePicture(result);
      console.log("Profile picture updated locally");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
        <Header />
        
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  Settings
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Manage your account settings and preferences
                </p>
              </div>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Profile Information
                    </CardTitle>
                    <CardDescription>
                      Update your personal information and profile picture.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Profile Picture */}
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage 
                          src={profilePicture || "/placeholder-avatar.svg"} 
                          alt="Profile picture"
                        />
                        <AvatarFallback>
                          {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Change Picture
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePictureChange}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {/* Name Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Contact Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={handleSaveProfile}
                      className="w-full h-12"
                      style={{ 
                        backgroundColor: customColor,
                        borderColor: customColor
                      }}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Profile
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Lock className="h-5 w-5 mr-2" />
                      Security Settings
                    </CardTitle>
                    <CardDescription>
                      Manage your password and security preferences.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Change Password Form */}
                    <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4">
                      <div>
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showCurrentPassword ? "text" : "password"}
                            {...passwordForm.register("currentPassword")}
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
                        {passwordForm.formState.errors.currentPassword && (
                          <p className="text-sm text-red-600 mt-1">
                            {passwordForm.formState.errors.currentPassword.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            {...passwordForm.register("newPassword")}
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
                        {passwordForm.formState.errors.newPassword && (
                          <p className="text-sm text-red-600 mt-1">
                            {passwordForm.formState.errors.newPassword.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            {...passwordForm.register("confirmPassword")}
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
                        {passwordForm.formState.errors.confirmPassword && (
                          <p className="text-sm text-red-600 mt-1">
                            {passwordForm.formState.errors.confirmPassword.message}
                          </p>
                        )}
                      </div>

                      <Button 
                        type="submit"
                        className="w-full h-12"
                        style={{ 
                          backgroundColor: customColor,
                          borderColor: customColor
                        }}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Change Password
                      </Button>
                    </form>

                    <Separator />

                    {/* Two-Factor Authentication */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Two-Factor Authentication</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {twoFactorEnabled
                            ? "Two-factor authentication is enabled for your account."
                            : "Add an extra layer of security to your account."}
                        </p>
                      </div>
                      {twoFactorEnabled ? (
                        <Button
                          variant="destructive"
                          className="h-10 min-w-[120px]"
                          onClick={() => setShow2faDisable(true)}
                        >
                          Disable 2FA
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="h-10 min-w-[120px]"
                          onClick={() => setShow2faSetup(true)}
                        >
                          Enable 2FA
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Smartphone className="h-5 w-5 mr-2" />
                      Notification Preferences
                    </CardTitle>
                    <CardDescription>
                      Choose how you want to receive notifications.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base flex items-center">
                          <Smartphone className="h-4 w-4 mr-2" />
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
                          Receive notifications via SMS
                        </p>
                      </div>
                      <Switch
                        checked={smsNotifications}
                        onCheckedChange={setSmsNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Push Notifications</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Receive push notifications in your browser
                        </p>
                      </div>
                      <Switch
                        checked={pushNotifications}
                        onCheckedChange={setPushNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Marketing Emails</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Receive promotional emails and updates
                        </p>
                      </div>
                      <Switch
                        checked={marketingEmails}
                        onCheckedChange={setMarketingEmails}
                      />
                    </div>

                    <Button 
                      className="w-full h-12"
                      style={{ 
                        backgroundColor: customColor,
                        borderColor: customColor
                      }}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Notification Preferences
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Appearance Tab */}
              <TabsContent value="appearance" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Palette className="h-5 w-5 mr-2" />
                      Appearance Settings
                    </CardTitle>
                    <CardDescription>
                      Customize the look and feel of your application.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Theme Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Dark Mode</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Switch between light and dark themes
                        </p>
                      </div>
                      <Switch
                        checked={darkMode}
                        onCheckedChange={(checked) => {
                          setDarkMode(checked);
                          localStorage.setItem('darkMode', checked.toString());
                          if (checked) {
                            document.documentElement.classList.add('dark');
                          } else {
                            document.documentElement.classList.remove('dark');
                          }
                        }}
                      />
                    </div>

                    {/* Primary Color */}
                    <div>
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={customColor}
                          onChange={(e) => handleCustomColorChange(e.target.value)}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={customColor}
                          onChange={(e) => handleCustomColorChange(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    {/* Text Color */}
                    <div>
                      <Label htmlFor="textColor">Text Color</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Input
                          id="textColor"
                          type="color"
                          value={textColor}
                          onChange={(e) => handleTextColorChange(e.target.value)}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={textColor}
                          onChange={(e) => handleTextColorChange(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={handleSaveProfile}
                      className="w-full h-12"
                      style={{ 
                        backgroundColor: customColor,
                        borderColor: customColor
                      }}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Appearance Settings
                    </Button>
                  </CardContent>
                </Card>

                {/* Business Timezone */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Business Timezone</CardTitle>
                    <CardDescription>
                      Select the timezone for your business. All appointment times will be shown in this timezone.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      value={timezone}
                      onChange={handleTimezoneChange}
                      className="block w-full mt-2 p-2 border rounded"
                    >
                      {timeZones.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                    <Button className="mt-4" onClick={handleSaveTimezone}>Save</Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      {/* 2FA Modals */}
      <TwoFactorSetupModal
        isOpen={show2faSetup}
        onClose={() => setShow2faSetup(false)}
        userId={user?.id}
        onSuccess={async () => {
          setShow2faSetup(false);
          // Refetch user or update context
          const res = await fetch(`/api/users`);
          const users = await res.json();
          const updated = users.find((u: any) => u.id === user.id);
          if (updated) updateUser(updated);
          toast({ title: "2FA enabled!", description: "Two-factor authentication is now active." });
        }}
      />
      <TwoFactorDisableModal
        isOpen={show2faDisable}
        onClose={() => setShow2faDisable(false)}
        userId={user?.id}
        twoFactorMethod={user?.twoFactorMethod}
        onSuccess={async () => {
          setShow2faDisable(false);
          // Refetch user or update context
          const res = await fetch(`/api/users`);
          const users = await res.json();
          const updated = users.find((u: any) => u.id === user.id);
          if (updated) updateUser(updated);
          toast({ title: "2FA disabled", description: "Two-factor authentication has been turned off." });
        }}
      />
    </div>
  );
}