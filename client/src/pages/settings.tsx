import { useState, useEffect, useRef, useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { AuthContext } from "@/contexts/AuthProvider";
import { useSidebar } from "@/contexts/SidebarContext";
import { SidebarController } from "@/components/layout/sidebar";
// import Header from "@/components/layout/header"; // Provided by MainLayout
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
// import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Lock, 
  // Sun, 
  // Moon, 
  Camera, 
  Save, 
  // Shield, 
  Smartphone,
  Palette,
  Eye,
  EyeOff,
  // CheckCircle,
  // AlertTriangle,
  // Info,
  Settings as SettingsIcon
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
// import { apiRequest } from "@/lib/queryClient";
import TwoFactorSetupModal from "@/components/TwoFactorSetupModal";
import TwoFactorDisableModal from "@/components/TwoFactorDisableModal";
import VerifyHelcimPayments from "@/components/payments/verify-helcim-payments";
import MatchHelcimPayments from "@/components/payments/match-helcim-payments";

import timeZones from "@/lib/timezones"; // We'll add a list of IANA timezones
import { useBusinessSettings } from "@/contexts/BusinessSettingsContext";

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

  // Theme states - Dark Mode removed

  // Color customization states
  const [customColor, setCustomColor] = useState(() => {
    return localStorage.getItem('primaryColor') || '#8b5cf6';
  });

  // Text color states
  const [textColor, setTextColor] = useState(() => {
    return localStorage.getItem('textColor') || '#1f2937';
  });


  const businessLogoInputRef = useRef<HTMLInputElement>(null);

  // 2FA states
  const [show2faSetup, setShow2faSetup] = useState(false);
  const [show2faDisable, setShow2faDisable] = useState(false);
  const twoFactorEnabled = user?.twoFactorEnabled;



  // Notification states - updated to use actual user preferences
  const [emailAccountManagement, setEmailAccountManagement] = useState(user?.emailAccountManagement ?? true);
  const [emailAppointmentReminders, setEmailAppointmentReminders] = useState(user?.emailAppointmentReminders ?? true);
  const [emailPromotions, setEmailPromotions] = useState(user?.emailPromotions ?? false);
  const [smsAccountManagement, setSmsAccountManagement] = useState(user?.smsAccountManagement ?? false);
  const [smsAppointmentReminders, setSmsAppointmentReminders] = useState(user?.smsAppointmentReminders ?? true);
  const [smsPromotions, setSmsPromotions] = useState(user?.smsPromotions ?? false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [isSavingNotificationPreferences, setIsSavingNotificationPreferences] = useState(false);

  // Load user notification preferences when user data changes
  useEffect(() => {
    if (user) {
      setEmailAccountManagement(user.emailAccountManagement ?? true);
      setEmailAppointmentReminders(user.emailAppointmentReminders ?? true);
      setEmailPromotions(user.emailPromotions ?? false);
      setSmsAccountManagement(user.smsAccountManagement ?? false);
      setSmsAppointmentReminders(user.smsAppointmentReminders ?? true);
      setSmsPromotions(user.smsPromotions ?? false);
    }
  }, [user]);

  // Function to save notification preferences
  const handleSaveNotificationPreferences = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingNotificationPreferences(true);
    
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailAccountManagement,
          emailAppointmentReminders,
          emailPromotions,
          smsAccountManagement,
          smsAppointmentReminders,
          smsPromotions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save notification preferences');
      }

      const result = await response.json();
      
      // Update the user context if updateUser function is available
      if (updateUser) {
        updateUser({ ...user, ...result });
      }
      
      toast({
        title: "Success",
        description: "Notification preferences saved successfully!",
      });
      setNotificationPreferencesSaved(true);
      setTimeout(() => setNotificationPreferencesSaved(false), 3000);
    } catch (error: any) {
      console.error("Error saving notification preferences:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save notification preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingNotificationPreferences(false);
    }
  };

  // Password form
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Account information states
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });

  const passwordForm = useForm<PasswordChangeForm>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Business settings
  const { businessSettings, updateBusinessSettings, isLoading: businessSettingsLoading } = useBusinessSettings();
  
  // Business settings form state
  const [businessName, setBusinessName] = useState(businessSettings?.businessName || '');
  const [businessLogo, setBusinessLogo] = useState<string | null>(businessSettings?.businessLogo || null);
  const [businessAddress, setBusinessAddress] = useState(businessSettings?.address || '');
  const [businessPhone, setBusinessPhone] = useState(businessSettings?.phone || '');
  const [businessEmail, setBusinessEmail] = useState(businessSettings?.email || '');
  const [businessWebsite, setBusinessWebsite] = useState(businessSettings?.website || '');
  const [timezone, setTimezone] = useState<string>(businessSettings?.timezone || "America/New_York");
  const [currency, setCurrency] = useState(businessSettings?.currency || "USD");
  const [taxRate, setTaxRate] = useState(businessSettings?.taxRate || 0.08);
  const [receiptFooter, setReceiptFooter] = useState(businessSettings?.receiptFooter || '');
  const [businessSettingsSaved, setBusinessSettingsSaved] = useState(false);
  const [notificationPreferencesSaved, setNotificationPreferencesSaved] = useState(false);
  const [appearanceSettingsSaved, setAppearanceSettingsSaved] = useState(false);
  
  // Update form state when business settings change
  useEffect(() => {
    if (businessSettings) {
      setBusinessName(businessSettings.businessName || '');
      setBusinessLogo(businessSettings.businessLogo || null);
      setBusinessAddress(businessSettings.address || '');
      setBusinessPhone(businessSettings.phone || '');
      setBusinessEmail(businessSettings.email || '');
      setBusinessWebsite(businessSettings.website || '');
      setTimezone(businessSettings.timezone || "America/New_York");
      setCurrency(businessSettings.currency || "USD");
      setTaxRate(businessSettings.taxRate || 0.08);
      setReceiptFooter(businessSettings.receiptFooter || '');
    }
  }, [businessSettings]);

  // Business settings handlers
  const handleBusinessLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setBusinessLogo(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBusinessSettings = async () => {
    try {
      await updateBusinessSettings({
        businessName,
        businessLogo: businessLogo || undefined,
        address: businessAddress,
        phone: businessPhone,
        email: businessEmail,
        website: businessWebsite,
        timezone,
        currency,
        taxRate,
        receiptFooter,
      });
      console.log("Success: Business settings saved successfully");
      
      // Show success toast
      toast({
        title: "Success",
        description: "Business settings saved successfully!",
      });
      setBusinessSettingsSaved(true);
      setTimeout(() => setBusinessSettingsSaved(false), 3000); // Hide "Saved" after 3 seconds
    } catch (error) {
      console.error("Error saving business settings:", error);
      
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to save business settings. Please try again.",
        variant: "destructive",
      });
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





  const handleChangePassword = async (data: PasswordChangeForm) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    
    try {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to change password');
      }

      const result = await response.json();
      
      toast({
        title: "Success",
        description: "Password changed successfully!",
      });
      
      passwordForm.reset();
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to change password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUpdateAccount = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingAccount(true);
    
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: accountForm.username,
          email: accountForm.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update account information');
      }

      const result = await response.json();
      
      toast({
        title: "Success",
        description: "Account information updated successfully!",
      });
      
      setIsEditingAccount(false);
      
      // Update the user context if updateUser function is available
      if (updateUser) {
        updateUser({ ...user, ...result });
      }
    } catch (error: any) {
      console.error("Error updating account:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update account information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingAccount(false);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarController isOpen={sidebarOpen} isMobile={false} />
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
        
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

            <Tabs defaultValue="business" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5 bg-white dark:bg-gray-800">
                <TabsTrigger 
                  value="security"
                  className="bg-white dark:bg-gray-800 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:border-2 data-[state=active]:border-current data-[state=active]:text-current hover:bg-white dark:hover:bg-gray-800 hover:!bg-white dark:hover:!bg-gray-800"
                  style={{ 
                    color: customColor
                  } as React.CSSProperties}
                >
                  Security
                </TabsTrigger>
                <TabsTrigger 
                  value="notifications"
                  className="bg-white dark:bg-gray-800 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:border-2 data-[state=active]:border-current data-[state=active]:text-current hover:bg-white dark:hover:bg-gray-800 hover:!bg-white dark:hover:!bg-gray-800"
                  style={{ 
                    color: customColor
                  } as React.CSSProperties}
                >
                  Notifications
                </TabsTrigger>
                <TabsTrigger 
                  value="appearance"
                  className="bg-white dark:bg-gray-800 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:border-2 data-[state=active]:border-current data-[state=active]:text-current hover:bg-white dark:hover:bg-gray-800 hover:!bg-white dark:hover:!bg-gray-800"
                  style={{ 
                    color: customColor
                  } as React.CSSProperties}
                >
                  Appearance
                </TabsTrigger>
                <TabsTrigger 
                  value="business"
                  className="bg-white dark:bg-gray-800 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:border-2 data-[state=active]:border-current data-[state=active]:text-current hover:bg-white dark:hover:bg-gray-800 hover:!bg-white dark:hover:!bg-gray-800"
                  style={{ 
                    color: customColor
                  } as React.CSSProperties}
                >
                  Business
                </TabsTrigger>
            <TabsTrigger 
              value="payment-verification"
              className="bg-white dark:bg-gray-800 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:border-2 data-[state=active]:border-current data-[state=active]:text-current hover:bg-white dark:hover:bg-gray-800 hover:!bg-white dark:hover:!bg-gray-800"
              style={{ 
                color: customColor
              } as React.CSSProperties}
            >
              Payment Verification
            </TabsTrigger>
            <TabsTrigger 
              value="payment-matching"
              className="bg-white dark:bg-gray-800 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:border-2 data-[state=active]:border-current data-[state=active]:text-current hover:bg-white dark:hover:bg-gray-800 hover:!bg-white dark:hover:!bg-gray-800"
              style={{ 
                color: customColor
              } as React.CSSProperties}
            >
              Payment Matching
            </TabsTrigger>

              </TabsList>

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
                    {/* Account Information */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium">Account Information</Label>
                        {!isEditingAccount ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAccountForm({
                                username: user?.username || '',
                                email: user?.email || '',
                              });
                              setIsEditingAccount(true);
                            }}
                          >
                            Edit
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsEditingAccount(false)}
                              disabled={isUpdatingAccount}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleUpdateAccount}
                              disabled={isUpdatingAccount}
                              variant="outline"
                              style={{ 
                                borderColor: customColor,
                                color: customColor,
                                '--tw-ring-color': customColor
                              } as React.CSSProperties}
                              className="hover:bg-transparent hover:border-opacity-80 focus:ring-2 focus:ring-offset-2"
                            >
                              {isUpdatingAccount ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {!isEditingAccount ? (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Username</p>
                              <p className="font-medium text-gray-900 dark:text-gray-100">{user?.username || 'Not available'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                              <p className="font-medium text-gray-900 dark:text-gray-100">{user?.email || 'Not available'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Role</p>
                              <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">{user?.role || 'Not available'}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="editUsername">Username</Label>
                              <Input
                                id="editUsername"
                                value={accountForm.username}
                                onChange={(e) => setAccountForm(prev => ({ ...prev, username: e.target.value }))}
                                placeholder="Enter username"
                                disabled={isUpdatingAccount}
                              />
                            </div>
                            <div>
                              <Label htmlFor="editEmail">Email</Label>
                              <Input
                                id="editEmail"
                                type="email"
                                value={accountForm.email}
                                onChange={(e) => setAccountForm(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="Enter email"
                                disabled={isUpdatingAccount}
                              />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Role: <span className="font-medium capitalize">{user?.role || 'Not available'}</span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Role cannot be changed from this interface
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

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
                              <EyeOff className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-500" />
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
                              <EyeOff className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-500" />
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
                              <EyeOff className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-500" />
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
                        className="w-full h-12 hover:bg-transparent hover:border-opacity-80 focus:ring-2 focus:ring-offset-2"
                        disabled={isChangingPassword}
                        variant="outline"
                        style={{ 
                          borderColor: customColor,
                          color: customColor,
                          '--tw-ring-color': customColor
                        } as React.CSSProperties}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        {isChangingPassword ? "Changing Password..." : "Change Password"}
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
                    {/* Email Notifications Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email Notifications</h3>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Account Management</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Receive account-related notifications via email
                          </p>
                        </div>
                        <Switch
                          checked={emailAccountManagement}
                          onCheckedChange={setEmailAccountManagement}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Appointment Reminders</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Receive appointment reminders via email
                          </p>
                        </div>
                        <Switch
                          checked={emailAppointmentReminders}
                          onCheckedChange={setEmailAppointmentReminders}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Marketing & Promotions</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Receive promotional emails and updates
                          </p>
                        </div>
                        <Switch
                          checked={emailPromotions}
                          onCheckedChange={setEmailPromotions}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* SMS Notifications Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">SMS Notifications</h3>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Account Management</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Receive account-related notifications via SMS
                          </p>
                        </div>
                        <Switch
                          checked={smsAccountManagement}
                          onCheckedChange={setSmsAccountManagement}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Appointment Reminders</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Receive appointment reminders via SMS
                          </p>
                        </div>
                        <Switch
                          checked={smsAppointmentReminders}
                          onCheckedChange={setSmsAppointmentReminders}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Marketing & Promotions</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Receive promotional messages via SMS
                          </p>
                        </div>
                        <Switch
                          checked={smsPromotions}
                          onCheckedChange={setSmsPromotions}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Browser Notifications Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Browser Notifications</h3>
                      
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
                    </div>

                    <Button 
                      onClick={handleSaveNotificationPreferences}
                      className="w-full h-12 hover:bg-transparent hover:border-opacity-80 focus:ring-2 focus:ring-offset-2"
                      variant="outline"
                      style={{ 
                        borderColor: customColor,
                        color: customColor,
                        '--tw-ring-color': customColor
                      } as React.CSSProperties}
                      disabled={isSavingNotificationPreferences}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSavingNotificationPreferences ? 'Saving...' : notificationPreferencesSaved ? 'Saved!' : 'Save Notification Preferences'}
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
                    {/* Dark Mode toggle removed per request */}

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
                      onClick={() => {
                        saveColorPreferences(customColor, textColor);
                        toast({
                          title: "Success",
                          description: "Appearance settings saved successfully!",
                        });
                        setAppearanceSettingsSaved(true);
                        setTimeout(() => setAppearanceSettingsSaved(false), 3000);
                      }}
                      className="w-full h-12 hover:bg-transparent hover:border-opacity-80 focus:ring-2 focus:ring-offset-2"
                      variant="outline"
                      style={{ 
                        borderColor: customColor,
                        color: customColor,
                        '--tw-ring-color': customColor
                      } as React.CSSProperties}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {appearanceSettingsSaved ? 'Saved!' : 'Save Appearance Settings'}
                    </Button>
                  </CardContent>
                </Card>


              </TabsContent>

              {/* Business Tab */}
              <TabsContent value="business" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <SettingsIcon className="h-5 w-5 mr-2" />
                      Business Information
                    </CardTitle>
                    <CardDescription>
                      Configure your business details and branding.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Business Logo */}
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {businessLogo ? (
                          <img 
                            src={businessLogo} 
                            alt="Business logo" 
                            className="h-20 w-20 object-contain border rounded-lg"
                          />
                        ) : (
                          <div className="h-20 w-20 bg-gray-100 dark:bg-gray-800 border rounded-lg flex items-center justify-center">
                            <Camera className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <Button
                          variant="outline"
                          onClick={() => businessLogoInputRef.current?.click()}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          {businessLogo ? 'Change Logo' : 'Upload Logo'}
                        </Button>
                        <input
                          ref={businessLogoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleBusinessLogoChange}
                          className="hidden"
                        />
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Upload your business logo (PNG, JPG, SVG)
                        </p>
                      </div>
                    </div>

                    {/* Business Name */}
                    <div>
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Enter your business name"
                      />
                    </div>

                    {/* Contact Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="businessPhone">Phone</Label>
                        <Input
                          id="businessPhone"
                          type="tel"
                          value={businessPhone}
                          onChange={(e) => setBusinessPhone(e.target.value)}
                          placeholder="Business phone number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="businessEmail">Email</Label>
                        <Input
                          id="businessEmail"
                          type="email"
                          value={businessEmail}
                          onChange={(e) => setBusinessEmail(e.target.value)}
                          placeholder="Business email address"
                        />
                      </div>
                    </div>

                    {/* Address and Website */}
                    <div>
                      <Label htmlFor="businessAddress">Address</Label>
                      <Input
                        id="businessAddress"
                        value={businessAddress}
                        onChange={(e) => setBusinessAddress(e.target.value)}
                        placeholder="Business address"
                      />
                    </div>

                    <div>
                      <Label htmlFor="businessWebsite">Website</Label>
                      <Input
                        id="businessWebsite"
                        type="url"
                        value={businessWebsite}
                        onChange={(e) => setBusinessWebsite(e.target.value)}
                        placeholder="https://your-website.com"
                      />
                    </div>

                    {/* Business Settings */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <select
                          id="timezone"
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="block w-full mt-2 p-2 border rounded"
                        >
                          {timeZones.map((tz) => (
                            <option key={tz} value={tz}>{tz}</option>
                          ))}
                        </select>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          All appointment times will be shown in this timezone
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="currency">Currency</Label>
                        <select
                          id="currency"
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="block w-full mt-2 p-2 border rounded"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="CAD">CAD (C$)</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="taxRate">Tax Rate (%)</Label>
                        <Input
                          id="taxRate"
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={taxRate}
                          onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                          placeholder="0.08"
                        />
                      </div>
                    </div>

                    {/* Receipt Footer */}
                    <div>
                      <Label htmlFor="receiptFooter">Receipt Footer</Label>
                      <textarea
                        id="receiptFooter"
                        value={receiptFooter}
                        onChange={(e) => setReceiptFooter(e.target.value)}
                        placeholder="Thank you for your business!"
                        style={{
                          display: 'block',
                          width: '100%',
                          marginTop: '0.5rem',
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          minHeight: '80px',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    <Button 
                      onClick={handleSaveBusinessSettings}
                      className="w-full h-12 hover:bg-transparent hover:border-opacity-80 focus:ring-2 focus:ring-offset-2"
                      variant="outline"
                      style={{ 
                        borderColor: customColor,
                        color: customColor,
                        '--tw-ring-color': customColor
                      } as React.CSSProperties}
                      disabled={businessSettingsLoading}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {businessSettingsLoading ? 'Saving...' : businessSettingsSaved ? 'Saved!' : 'Save Business Settings'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Payment Verification Tab */}
          <TabsContent value="payment-verification" className="space-y-6">
            <VerifyHelcimPayments />
          </TabsContent>
          
          <TabsContent value="payment-matching" className="space-y-6">
            <MatchHelcimPayments />
          </TabsContent>

            </Tabs>
          </div>
        </div>
      </div>
      {/* 2FA Modals */}
      <TwoFactorSetupModal
        isOpen={show2faSetup}
        onClose={() => setShow2faSetup(false)}
        userId={user?.id || 0}
        onSuccess={async () => {
          setShow2faSetup(false);
          // Refetch user or update context
          const res = await fetch(`/api/users`);
          const users = await res.json();
          const updated = users.find((u: any) => u.id === user?.id);
          if (updated && updateUser) updateUser(updated);
          toast({
            title: "Success",
            description: "Two-factor authentication has been enabled successfully.",
          });
        }}
      />
      <TwoFactorDisableModal
        isOpen={show2faDisable}
        onClose={() => setShow2faDisable(false)}
        userId={user?.id || 0}
        twoFactorMethod={user?.twoFactorMethod}
        onSuccess={async () => {
          setShow2faDisable(false);
          // Refetch user or update context
          const res = await fetch(`/api/users`);
          const users = await res.json();
          const updated = users.find((u: any) => u.id === user?.id);
          if (updated && updateUser) updateUser(updated);
          toast({
            title: "Success",
            description: "Two-factor authentication has been disabled successfully.",
          });
        }}
      />
    </div>
  );
}