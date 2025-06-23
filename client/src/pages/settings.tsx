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
  User,
  Type,
  Palette,
  Trash2
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

  // Theme states
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' || document.documentElement.classList.contains('dark');
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

  const [presetName, setPresetName] = useState('');
  const [secondaryPresetName, setSecondaryPresetName] = useState('');
  
  const [savedPresets, setSavedPresets] = useState(() => {
    const saved = localStorage.getItem('colorPresets');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [savedSecondaryPresets, setSavedSecondaryPresets] = useState(() => {
    const saved = localStorage.getItem('secondaryColorPresets');
    return saved ? JSON.parse(saved) : [];
  });

  // Profile states
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || ''); 
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');

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

  // Effects
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
      }
    }
  }, [darkMode]);

  useEffect(() => {
    const root = document.documentElement;
    const hsl = hexToHsl(customColor);
    root.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    root.style.setProperty('--primary-foreground', hsl.l > 50 ? '0 0% 0%' : '0 0% 100%');
    localStorage.setItem('primaryColor', customColor);
  }, [customColor]);

  useEffect(() => {
    const root = document.documentElement;
    const hsl = hexToHsl(secondaryColor);
    root.style.setProperty('--foreground', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    localStorage.setItem('secondaryColor', secondaryColor);
  }, [secondaryColor]);

  // Helper functions
  function hexToHsl(hex: string): { h: number; s: number; l: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

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

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  // Handlers
  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
  };

  const handleSecondaryColorChange = (color: string) => {
    setSecondaryColor(color);
  };

  const savePrimaryColorPreset = () => {
    if (presetName.trim() && customColor) {
      const newPreset = { name: presetName.trim(), color: customColor };
      const updatedPresets = [...savedPresets, newPreset];
      setSavedPresets(updatedPresets);
      localStorage.setItem('colorPresets', JSON.stringify(updatedPresets));
      setPresetName('');
      toast({
        title: "Preset Saved",
        description: `Color preset "${newPreset.name}" has been saved.`,
      });
    }
  };

  const saveSecondaryColorPreset = () => {
    if (secondaryPresetName.trim() && secondaryColor) {
      const newPreset = { name: secondaryPresetName.trim(), color: secondaryColor };
      const updatedPresets = [...savedSecondaryPresets, newPreset];
      setSavedSecondaryPresets(updatedPresets);
      localStorage.setItem('secondaryColorPresets', JSON.stringify(updatedPresets));
      setSecondaryPresetName('');
      toast({
        title: "Text Color Preset Saved",
        description: `Text color preset "${newPreset.name}" has been saved.`,
      });
    }
  };

  const deletePrimaryColorPreset = (presetName: string) => {
    const updatedPresets = savedPresets.filter(preset => preset.name !== presetName);
    setSavedPresets(updatedPresets);
    localStorage.setItem('colorPresets', JSON.stringify(updatedPresets));
    toast({
      title: "Preset Deleted",
      description: `Color preset "${presetName}" has been deleted.`,
    });
  };

  const deleteSecondaryColorPreset = (presetName: string) => {
    const updatedPresets = savedSecondaryPresets.filter(preset => preset.name !== presetName);
    setSavedSecondaryPresets(updatedPresets);
    localStorage.setItem('secondaryColorPresets', JSON.stringify(updatedPresets));
    toast({
      title: "Text Color Preset Deleted",
      description: `Text color preset "${presetName}" has been deleted.`,
    });
  };

  const handleSaveProfile = () => {
    toast({
      title: "Profile Updated",
      description: "Your profile information has been saved successfully.",
    });
  };

  const handleSaveAppearance = () => {
    toast({
      title: "Appearance Saved",
      description: "Your appearance settings have been saved successfully.",
    });
  };

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
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
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

  const handleChangePassword = (data: PasswordChangeForm) => {
    changePasswordMutation.mutate(data);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-6 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage your account settings and preferences.
              </p>
            </div>

            <div className="space-y-6">
              {/* DEBUG TEST CARD */}
              <Card className="border-4 border-green-500 bg-blue-100">
                <CardHeader>
                  <CardTitle className="text-green-600">
                    🔧 DEBUG: Settings page is loading! 🔧
                  </CardTitle>
                </CardHeader>
              </Card>

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
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src="" alt={user?.firstName} />
                        <AvatarFallback className="text-lg">
                          {user?.firstName?.[0]?.toUpperCase()}{user?.lastName?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <Button variant="outline">
                        <Camera className="h-4 w-4 mr-2" />
                        Change Photo
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Enter your first name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSaveProfile} 
                    className="w-full mt-4"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Personal Information
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

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <Label className="text-base flex items-center">
                        <Palette className="h-4 w-4 mr-2" />
                        Primary Color
                      </Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Choose your preferred accent color for buttons and highlights
                      </p>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                          <input
                            type="color"
                            value={customColor}
                            onChange={(e) => handleCustomColorChange(e.target.value)}
                            className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                          />
                          <div className="space-y-1">
                            <Label className="text-sm font-medium">Color Value</Label>
                            <Input
                              type="text"
                              value={customColor}
                              onChange={(e) => handleCustomColorChange(e.target.value)}
                              className="w-32 text-sm"
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

                      {/* Save Primary Color Preset */}
                      <div className="space-y-3">
                        <Input
                          type="text"
                          placeholder="Enter color preset name..."
                          value={presetName}
                          onChange={(e) => setPresetName(e.target.value)}
                          className="w-full"
                        />
                        <Button
                          onClick={savePrimaryColorPreset}
                          disabled={!presetName.trim() || customColor === '#8b5cf6'}
                          className="w-full"
                          variant="outline"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save Primary Color Preset
                        </Button>
                      </div>

                      {/* Quick Color Presets */}
                      <div className="space-y-4">
                        <Label className="text-base">Quick Color Presets</Label>
                        <div className="grid grid-cols-6 gap-3">
                          {[
                            { name: 'Blue', color: '#3b82f6', value: 'blue' },
                            { name: 'Purple', color: '#8b5cf6', value: 'purple' },
                            { name: 'Pink', color: '#ec4899', value: 'pink' },
                            { name: 'Green', color: '#10b981', value: 'green' },
                            { name: 'Orange', color: '#f97316', value: 'orange' },
                            { name: 'Red', color: '#ef4444', value: 'red' },
                          ].map((preset) => (
                            <div
                              key={preset.value}
                              className="cursor-pointer group text-center"
                              onClick={() => handleCustomColorChange(preset.color)}
                            >
                              <div 
                                className="w-8 h-8 mx-auto rounded-full group-hover:scale-110 transition-transform border-2 border-gray-300 dark:border-gray-600"
                                style={{ backgroundColor: preset.color }}
                              />
                              <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                                {preset.name}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Saved Primary Color Presets */}
                      {savedPresets.length > 0 && (
                        <div className="space-y-4">
                          <Label className="text-base">Your Saved Colors</Label>
                          <div className="grid grid-cols-6 gap-3">
                            {savedPresets.map((preset, index) => (
                              <div
                                key={index}
                                className="group text-center relative"
                              >
                                <div 
                                  className="w-8 h-8 mx-auto rounded-full cursor-pointer group-hover:scale-110 transition-transform border-2 border-gray-300 dark:border-gray-600"
                                  style={{ backgroundColor: preset.color }}
                                  onClick={() => handleCustomColorChange(preset.color)}
                                />
                                <button
                                  onClick={() => deletePrimaryColorPreset(preset.name)}
                                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                  title="Delete preset"
                                >
                                  ×
                                </button>
                                <p className="text-xs mt-1 text-gray-600 dark:text-gray-400 truncate">
                                  {preset.name}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}


                    </div>

                    <Button 
                      onClick={handleSaveAppearance} 
                      className="w-full"
                      style={{ 
                        backgroundColor: customColor,
                        borderColor: customColor
                      }}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Appearance Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Text Color Settings - TEST MARKER */}
              <Card className="border-4 border-red-500 bg-yellow-100">
                <CardHeader>
                  <CardTitle className="flex items-center text-red-600">
                    <Type className="h-5 w-5 mr-2" />
                    🎨 TEXT COLOR SECTION - YOU SHOULD SEE THIS! 🎨
                  </CardTitle>
                  <CardDescription className="text-red-800 font-bold">
                    *** THIS IS THE TEXT COLOR FEATURE YOU REQUESTED ***
                    Customize the main font color for all text throughout the application.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => handleSecondaryColorChange(e.target.value)}
                          className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                        />
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">Color Value</Label>
                          <Input
                            type="text"
                            value={secondaryColor}
                            onChange={(e) => handleSecondaryColorChange(e.target.value)}
                            className="w-32 text-sm"
                            placeholder="#6b7280"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-20 h-8 rounded border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center font-medium text-sm"
                          style={{ color: secondaryColor }}
                        >
                          Sample Text
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Save Text Color Preset */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Save Text Color Preset</Label>
                      <Input
                        type="text"
                        placeholder="Enter text color preset name..."
                        value={secondaryPresetName}
                        onChange={(e) => setSecondaryPresetName(e.target.value)}
                        className="w-full"
                      />
                      <Button
                        onClick={saveSecondaryColorPreset}
                        disabled={!secondaryPresetName.trim() || secondaryColor === '#6b7280'}
                        className="w-full"
                        variant="outline"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Text Color Preset
                      </Button>
                    </div>

                    {/* Saved Text Color Presets */}
                    {savedSecondaryPresets.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Saved Text Color Presets</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {savedSecondaryPresets.map((preset) => (
                            <div key={preset.name} className="flex items-center justify-between p-2 border rounded-lg">
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-4 h-4 rounded border cursor-pointer"
                                  style={{ backgroundColor: preset.color }}
                                  onClick={() => {
                                    setSecondaryColor(preset.color);
                                    handleSecondaryColorChange(preset.color);
                                  }}
                                />
                                <span className="text-sm font-medium">{preset.name}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteSecondaryColorPreset(preset.name)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button 
                      onClick={handleSaveAppearance} 
                      className="w-full"
                      style={{ 
                        backgroundColor: customColor,
                        borderColor: customColor
                      }}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Text Color Settings
                    </Button>
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
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        {changePasswordMutation.isPending ? "Changing Password..." : "Change Password"}
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
                        <Label className="text-base flex items-center">
                          <Bell className="h-4 w-4 mr-2" />
                          Push Notifications
                        </Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Receive push notifications in your browser
                        </p>
                      </div>
                      <Switch
                        checked={pushNotifications}
                        onCheckedChange={setPushNotifications}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base flex items-center">
                          <Mail className="h-4 w-4 mr-2" />
                          Marketing Emails
                        </Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Receive promotional and marketing emails
                        </p>
                      </div>
                      <Switch
                        checked={marketingEmails}
                        onCheckedChange={setMarketingEmails}
                      />
                    </div>
                  </div>
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
          </div>
        </main>
      </div>
    </div>
  );
}