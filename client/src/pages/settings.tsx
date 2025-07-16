import { useState, useContext, useEffect, useRef } from "react";
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
import { AuthContext } from "@/contexts/AuthProvider";
import { apiRequest } from "@/lib/queryClient";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import Layout from "@/components/layout/layout";

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
  User,
  Type,
  Palette
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import timeZones from "@/lib/timezones"; // We'll add a list of IANA timezones
import { useQuery } from "@tanstack/react-query";

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
  const { user, updateUser } = useContext(AuthContext);

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
  
  const [secondaryColor, setSecondaryColor] = useState(() => {
    return localStorage.getItem('secondaryColor') || '#6b7280';
  });

  // Text color states
  const [textColor, setTextColor] = useState(() => {
    return localStorage.getItem('textColor') || '#1f2937';
  });
  
  const [textColorSecondary, setTextColorSecondary] = useState(() => {
    return localStorage.getItem('textColorSecondary') || '#6b7280';
  });



  // Profile states
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || ''); 
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profilePicture, setProfilePicture] = useState<string | null>(user?.profilePicture || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    console.log("[DEBUG] Save button clicked. Timezone:", timezone);
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
      console.log("[DEBUG] API response:", response.status, data);
      refetchBusinessSettings();
      console.log("Timezone updated! Business timezone set to", timezone);
    } catch (error) {
      console.error("[DEBUG] Network error:", error);
      console.log("Error: Network error. Please check your connection and try again.");
    }
  };

  // Effects
  useEffect(() => {
    // Load color preferences from database when user is available
    const loadUserColorPreferences = async () => {
      if (user?.id) {
        try {
          const response = await fetch(`/api/users/${user.id}/color-preferences`);
          if (response.ok) {
            const preferences = await response.json();
            if (preferences) {
              // Apply database preferences
              setCustomColor(preferences.primaryColor || '#8b5cf6');
              setTextColor(preferences.primaryTextColor || '#1f2937');
              setTextColorSecondary(preferences.secondaryTextColor || '#6b7280');
              setDarkMode(preferences.isDarkMode || false);
              


              
              // Apply text colors immediately
              const primaryHsl = hexToHsl(preferences.primaryTextColor || '#1f2937');
              const secondaryHsl = hexToHsl(preferences.secondaryTextColor || '#6b7280');
              document.documentElement.style.setProperty('--text-primary', `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`);
              document.documentElement.style.setProperty('--text-secondary', `${secondaryHsl.h} ${secondaryHsl.s}% ${secondaryHsl.l}%`);
              
              console.log('Loaded color preferences from database:', preferences);
              return; // Exit early if database preferences were loaded
            }
          }
        } catch (error) {
          console.error('Failed to load color preferences from database:', error);
        }
      }
      
      // Fallback to localStorage if database loading fails or user not available
      const savedDarkMode = localStorage.getItem('darkMode') === 'true';
      if (savedDarkMode !== darkMode) {
        setDarkMode(savedDarkMode);
      }
      document.documentElement.classList.toggle('dark', savedDarkMode);
      
      // Apply saved colors on component mount
      const savedPrimaryColor = localStorage.getItem('primaryColor') || '#8b5cf6';
      const savedSecondaryColor = localStorage.getItem('secondaryColor') || '#f3f4f6';
      
      const hsl = hexToHsl(savedPrimaryColor);
      document.documentElement.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      
      // Apply transparent hover colors on mount
      document.documentElement.style.setProperty('--button-primary-hover', `${hsl.h} ${hsl.s}% ${hsl.l}`);
      document.documentElement.style.setProperty('--button-primary-hover-opacity', '0.1');
      document.documentElement.style.setProperty('--button-outline-hover', `${hsl.h} ${hsl.s}% ${hsl.l}`);
      document.documentElement.style.setProperty('--button-outline-hover-opacity', '0.1');
      
      // Update other color properties
      document.documentElement.style.setProperty('--dropdown-selected', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      document.documentElement.style.setProperty('--accent', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      document.documentElement.style.setProperty('--sidebar-primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      document.documentElement.style.setProperty('--sidebar-accent-foreground', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      
      const secondaryHsl = hexToHsl(savedSecondaryColor);
      document.documentElement.style.setProperty('--secondary', `${secondaryHsl.h} ${secondaryHsl.s}% ${secondaryHsl.l}%`);
      
      // Apply saved text colors from localStorage
      const savedTextColor = localStorage.getItem('textColor') || '#1f2937';
      const savedTextColorSecondary = localStorage.getItem('textColorSecondary') || '#6b7280';
      const textPrimaryHsl = hexToHsl(savedTextColor);
      const textSecondaryHsl = hexToHsl(savedTextColorSecondary);
      document.documentElement.style.setProperty('--text-primary', `${textPrimaryHsl.h} ${textPrimaryHsl.s}% ${textPrimaryHsl.l}%`);
      document.documentElement.style.setProperty('--text-secondary', `${textSecondaryHsl.h} ${textSecondaryHsl.s}% ${textSecondaryHsl.l}%`);
    };
    
    loadUserColorPreferences();
  }, [user?.id]); // Re-run when user ID changes

  useEffect(() => {
    // Apply dark mode changes
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode.toString());
    
    // Force a re-render of the body background
    document.body.className = document.body.className;
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('primaryColor', customColor);
    localStorage.setItem('secondaryColor', secondaryColor);
    
    // Apply custom color to CSS custom properties
    const hsl = hexToHsl(customColor);
    document.documentElement.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    
    // Set transparent hover colors using the primary color with opacity
    document.documentElement.style.setProperty('--button-primary-hover', `${hsl.h} ${hsl.s}% ${hsl.l}`);
    document.documentElement.style.setProperty('--button-primary-hover-opacity', '0.1');
    
    // Update outline button hover color to use transparent primary color
    document.documentElement.style.setProperty('--button-outline-hover', `${hsl.h} ${hsl.s}% ${hsl.l}`);
    document.documentElement.style.setProperty('--button-outline-hover-opacity', '0.1');
    
    // Also update dropdown colors to match the primary color
    document.documentElement.style.setProperty('--dropdown-selected', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    document.documentElement.style.setProperty('--dropdown-selected-foreground', '210 40% 98%');
    
    // Update accent colors to match primary
    document.documentElement.style.setProperty('--accent', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    
    // Update sidebar colors to use primary color for active states
    document.documentElement.style.setProperty('--sidebar-primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    document.documentElement.style.setProperty('--sidebar-accent-foreground', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    
    const secondaryHsl = hexToHsl(secondaryColor);
    document.documentElement.style.setProperty('--secondary', `${secondaryHsl.h} ${secondaryHsl.s}% ${secondaryHsl.l}%`);
  }, [customColor, secondaryColor]);

  // Apply text colors on mount and when they change
  useEffect(() => {
    const primaryHsl = hexToHsl(textColor);
    const secondaryHsl = hexToHsl(textColorSecondary);
    document.documentElement.style.setProperty('--text-primary', `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`);
    document.documentElement.style.setProperty('--text-secondary', `${secondaryHsl.h} ${secondaryHsl.s}% ${secondaryHsl.l}%`);
  }, [textColor, textColorSecondary]);

  // Color conversion utility
  function hexToHsl(hex: string): { h: number; s: number; l: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      return { h: 0, s: 0, l: 0 };
    }

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  // Handlers
  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    // Auto-save to database
    if (user?.id) {
      fetch(`/api/users/${user.id}/color-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryColor: color,
          primaryTextColor: textColor,
          secondaryTextColor: textColorSecondary,
          isDarkMode: darkMode
        }),
      }).catch(error => {
        console.error('Error auto-saving color preferences:', error);
      });
    }
  };

  const handleSecondaryColorChange = (color: string) => {
    setSecondaryColor(color);
  };

  const handleTextColorChange = (color: string) => {
    setTextColor(color);
    localStorage.setItem('textColor', color);
    // Convert hex to HSL and apply text color to root element
    const hsl = hexToHsl(color);
    document.documentElement.style.setProperty('--text-primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    // Auto-save to database
    if (user?.id) {
      fetch(`/api/users/${user.id}/color-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryColor: customColor,
          primaryTextColor: color,
          secondaryTextColor: textColorSecondary,
          isDarkMode: darkMode
        }),
      }).catch(error => {
        console.error('Error auto-saving text color preferences:', error);
      });
    }
  };

  const handleTextColorSecondaryChange = (color: string) => {
    setTextColorSecondary(color);
    localStorage.setItem('textColorSecondary', color);
    // Convert hex to HSL and apply secondary text color to root element
    const hsl = hexToHsl(color);
    document.documentElement.style.setProperty('--text-secondary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    // Auto-save to database
    if (user?.id) {
      fetch(`/api/users/${user.id}/color-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryColor: customColor,
          primaryTextColor: textColor,
          secondaryTextColor: color,
          isDarkMode: darkMode
        }),
      }).catch(error => {
        console.error('Error auto-saving secondary text color preferences:', error);
      });
    }
  };





  const handleSaveProfile = () => {
    console.log('handleSaveProfile called in main settings');
    console.log('Current user:', user);
    console.log('Current form values:', { firstName, lastName, email, phone });
    
    updateProfileMutation.mutate({
      firstName,
      lastName,
      email,
      phone
    });
  };



  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: { firstName: string; lastName: string; email: string; phone: string }) => {
      const userId = user?.id;
      
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      console.log('Settings page - Updating profile for user:', userId);
      console.log('Profile data being sent:', profileData);
      
      const response = await apiRequest("PUT", `/api/users/${userId}`, profileData);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Profile update failed:', errorData);
        throw new Error(errorData.error || 'Failed to update profile');
      }
      
      const result = await response.json();
      console.log('Profile update successful:', result);
      return result;
    },
    onSuccess: (updatedUser) => {
      console.log('Profile update success callback triggered');
      console.log('Updated user data received:', updatedUser);
      
      // Update localStorage first to ensure data persistence
      localStorage.setItem('user', JSON.stringify(updatedUser));
      console.log('localStorage updated with new user data');
      
      // Update form fields to reflect the changes
      setFirstName(updatedUser.firstName || '');
      setLastName(updatedUser.lastName || '');
      setEmail(updatedUser.email || '');
      setPhone(updatedUser.phone || '');
      
      // Try to update context (might not work due to timing issues)
      if (updateUser && typeof updateUser === 'function') {
        console.log('Attempting to update user context');
        updateUser(updatedUser);
      } else {
        console.log('Context updateUser not available, relying on localStorage');
      }
      
      // Dispatch custom event to notify other components (like header) of user data update
      window.dispatchEvent(new CustomEvent('userDataUpdated', { 
        detail: updatedUser 
      }));
      console.log('User data update event dispatched');
      
      console.log("Profile updated:", "Your profile information has been saved successfully.");
    },
    onError: (error) => {
      console.error('Profile update error callback triggered:', error);
      console.log("Update failed:", "Failed to update profile. Please try again.");
    },
  });

  // Mutations
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeForm) => {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to change password');
      }
      
      return response.json();
    },
    onSuccess: () => {
      console.log("Password Changed:", "Your password has been updated successfully.");
      passwordForm.reset();
    },
    onError: (error: Error) => {
      console.log("Error:", error.message);
    },
  });

  const handleChangePassword = (data: PasswordChangeForm) => {
    changePasswordMutation.mutate(data);
  };

  // Profile picture upload handler
  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        console.error("Invalid file type: Please select an image file.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        console.error("File too large: Please select an image smaller than 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64String = e.target?.result as string;
        setProfilePicture(base64String);
        // Save to database
        if (user?.id) {
          try {
            const response = await fetch(`/api/users/${user.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ profilePicture: base64String })
            });
            if (response.ok) {
              const updatedUser = await response.json();
              localStorage.setItem('user', JSON.stringify(updatedUser));
              localStorage.setItem('profilePicture', base64String);
              if (updateUser) updateUser({ profilePicture: base64String });
              window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: updatedUser }));
              console.log("Photo updated: Your profile photo has been changed successfully.");
            } else {
              console.error("Upload failed: Failed to save profile picture.");
            }
          } catch (error) {
            console.error("Upload failed: Failed to save profile picture.");
          }
        }
      };
      reader.onerror = () => {
        console.error("Upload failed: Failed to process the image. Please try again.");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-2 text-sm md:text-base text-gray-600 dark:text-gray-400">
            Manage your account settings and preferences.
          </p>
        </div>

        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details and contact information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profilePicture || user?.profilePicture || "/placeholder-avatar.jpg"} />
                  <AvatarFallback className="text-lg">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleProfilePictureChange}
                />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Camera className="h-4 w-4 mr-2" />
                  Change Photo
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter your first name"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter your last name"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className="h-12"
                  />
                </div>
              </div>

              <Button 
                onClick={handleSaveProfile} 
                className="w-full md:w-auto h-12"
                disabled={updateProfileMutation.isPending}
                style={{ 
                  backgroundColor: customColor,
                  borderColor: customColor
                }}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateProfileMutation.isPending ? "Saving..." : "Save Personal Information"}
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
                  onCheckedChange={(checked) => {
                    setDarkMode(checked);
                    // Auto-save to database
                    if (user?.id) {
                      fetch(`/api/users/${user.id}/color-preferences`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          primaryColor: customColor,
                          primaryTextColor: textColor,
                          secondaryTextColor: textColorSecondary,
                          isDarkMode: checked,

                        }),
                      }).catch(error => {
                        console.error('Error auto-saving dark mode preferences:', error);
                      });
                    }
                  }}
                />
              </div>

              <Separator />

              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-base flex items-center">
                    <Palette className="h-4 w-4 mr-2" />
                    Primary Color
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Choose your preferred accent color for buttons and highlights
                  </p>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => handleCustomColorChange(e.target.value)}
                        className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                      />
                      <div className="space-y-1 flex-1">
                        <Label className="text-sm font-medium">Color Value</Label>
                        <Input
                          type="text"
                          value={customColor}
                          onChange={(e) => handleCustomColorChange(e.target.value)}
                          className="w-full sm:w-32 text-sm h-10"
                          placeholder="#8b5cf6"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-12 h-8 rounded border-2 border-gray-300 dark:border-gray-600 cursor-pointer flex items-center justify-center text-white font-medium text-sm"
                        style={{ backgroundColor: customColor }}
                      >
                        Demo
                      </div>
                    </div>
                  </div>



                </div>


              </div>
            </CardContent>
          </Card>

          {/* Text Color Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Type className="h-5 w-5 mr-2" />
                Text Colors
              </CardTitle>
              <CardDescription>
                Customize the text colors used throughout the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Primary Text Color */}
              <div className="space-y-4">
                <Label className="text-base flex items-center">
                  <Type className="h-4 w-4 mr-2" />
                  Primary Text Color
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Main text color for headings and primary content
                </p>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => handleTextColorChange(e.target.value)}
                      className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Color Value</Label>
                      <Input
                        type="text"
                        value={textColor}
                        onChange={(e) => handleTextColorChange(e.target.value)}
                        className="w-32 text-sm"
                        placeholder="#1f2937"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-32 h-10 rounded border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center font-semibold text-sm bg-white dark:bg-gray-800"
                      style={{ color: textColor }}
                    >
                      Primary Text
                    </div>
                  </div>
                </div>
                

              </div>

              <Separator />

              {/* Secondary Text Color */}
              <div className="space-y-4">
                <Label className="text-base flex items-center">
                  <Type className="h-4 w-4 mr-2" />
                  Secondary Text Color
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Secondary text color for descriptions and less important content
                </p>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={textColorSecondary}
                      onChange={(e) => handleTextColorSecondaryChange(e.target.value)}
                      className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Color Value</Label>
                      <Input
                        type="text"
                        value={textColorSecondary}
                        onChange={(e) => handleTextColorSecondaryChange(e.target.value)}
                        className="w-32 text-sm"
                        placeholder="#6b7280"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-32 h-10 rounded border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-sm bg-white dark:bg-gray-800"
                      style={{ color: textColorSecondary }}
                    >
                      Secondary Text
                    </div>
                  </div>
                </div>
              </div>


            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="h-5 w-5 mr-2" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-6">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showCurrentPassword ? "text" : "password"}
                              placeholder="Enter your current password"
                              {...field}
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
                              type={showNewPassword ? "text" : "password"}
                              placeholder="Enter your new password"
                              {...field}
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
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm your new password"
                              {...field}
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
                    style={{ 
                      backgroundColor: customColor,
                      borderColor: customColor
                    }}
                  >
                    {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notifications
              </CardTitle>
              <CardDescription>
                Control how you receive notifications from the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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

          {/* Privacy & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Privacy & Security
              </CardTitle>
              <CardDescription>
                Manage your privacy settings and security preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Button variant="outline" className="h-10 min-w-[80px]">
                  Enable
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Profile Visibility</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Control who can see your profile information
                  </p>
                </div>
                <Button variant="outline" className="h-10 min-w-[80px]">
                  Manage
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Data Export</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Download a copy of your data
                  </p>
                </div>
                <Button variant="outline" className="h-10 min-w-[80px]">
                  Export
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base text-red-600 dark:text-red-400">Delete Account</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button variant="destructive" className="h-10 min-w-[80px]">
                  Delete
                </Button>
              </div>
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

        </div>
      </div>
    </Layout>
  );
}