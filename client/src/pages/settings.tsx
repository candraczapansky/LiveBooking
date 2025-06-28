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

  const [presetName, setPresetName] = useState('');
  const [secondaryPresetName, setSecondaryPresetName] = useState('');
  const [textPresetName, setTextPresetName] = useState('');
  
  const [savedPresets, setSavedPresets] = useState(() => {
    const saved = localStorage.getItem('colorPresets');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [savedSecondaryPresets, setSavedSecondaryPresets] = useState(() => {
    const saved = localStorage.getItem('secondaryColorPresets');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [savedTextPresets, setSavedTextPresets] = useState(() => {
    const saved = localStorage.getItem('textColorPresets');
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
    // Apply the saved dark mode on component mount
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
  }, []);

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
    document.documentElement.style.setProperty('--text-primary', textColor);
    document.documentElement.style.setProperty('--text-secondary', textColorSecondary);
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
  };

  const handleSecondaryColorChange = (color: string) => {
    setSecondaryColor(color);
  };

  const handleTextColorChange = (color: string) => {
    setTextColor(color);
    localStorage.setItem('textColor', color);
    // Apply text color to root element
    document.documentElement.style.setProperty('--text-primary', color);
  };

  const handleTextColorSecondaryChange = (color: string) => {
    setTextColorSecondary(color);
    localStorage.setItem('textColorSecondary', color);
    // Apply secondary text color to root element
    document.documentElement.style.setProperty('--text-secondary', color);
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
    const updatedPresets = savedPresets.filter((preset: any) => preset.name !== presetName);
    setSavedPresets(updatedPresets);
    localStorage.setItem('colorPresets', JSON.stringify(updatedPresets));
    toast({
      title: "Preset Deleted",
      description: `Color preset "${presetName}" has been deleted.`,
    });
  };

  const deleteSecondaryColorPreset = (presetName: string) => {
    const updatedPresets = savedSecondaryPresets.filter((preset: any) => preset.name !== presetName);
    setSavedSecondaryPresets(updatedPresets);
    localStorage.setItem('secondaryColorPresets', JSON.stringify(updatedPresets));
    toast({
      title: "Text Color Preset Deleted",
      description: `Text color preset "${presetName}" has been deleted.`,
    });
  };

  const saveTextColorPreset = () => {
    if (textPresetName.trim() && textColor) {
      const newPreset = { name: textPresetName.trim(), color: textColor };
      const updatedPresets = [...savedTextPresets, newPreset];
      setSavedTextPresets(updatedPresets);
      localStorage.setItem('textColorPresets', JSON.stringify(updatedPresets));
      setTextPresetName('');
      toast({
        title: "Text Color Preset Saved",
        description: `Text color preset "${newPreset.name}" has been saved.`,
      });
    }
  };

  const deleteTextColorPreset = (presetName: string) => {
    const updatedPresets = savedTextPresets.filter((preset: any) => preset.name !== presetName);
    setSavedTextPresets(updatedPresets);
    localStorage.setItem('textColorPresets', JSON.stringify(updatedPresets));
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
                      <AvatarImage src="/placeholder-avatar.jpg" />
                      <AvatarFallback className="text-lg">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <Button variant="outline" size="sm">
                      <Camera className="h-4 w-4 mr-2" />
                      Change Photo
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
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
                    className="w-full md:w-auto"
                    style={{ 
                      backgroundColor: customColor,
                      borderColor: customColor
                    }}
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
                            { name: 'Green', color: '#10b981', value: 'emerald' },
                            { name: 'Orange', color: '#f59e0b', value: 'amber' },
                            { name: 'Red', color: '#ef4444', value: 'red' },
                            { name: 'Pink', color: '#ec4899', value: 'pink' },
                          ].map((preset) => (
                            <div key={preset.value} className="text-center">
                              <div
                                className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer mx-auto mb-2"
                                style={{ backgroundColor: preset.color }}
                                onClick={() => handleCustomColorChange(preset.color)}
                              />
                              <span className="text-xs text-gray-600 dark:text-gray-400">{preset.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Saved Primary Color Presets */}
                      {savedPresets.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-base">Saved Primary Color Presets</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {savedPresets.map((preset: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <div 
                                    className="w-4 h-4 rounded-full border cursor-pointer"
                                    style={{ backgroundColor: preset.color }}
                                    onClick={() => handleCustomColorChange(preset.color)}
                                  />
                                  <span className="text-sm font-medium">{preset.name}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deletePrimaryColorPreset(preset.name)}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
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
                    
                    {/* Save Primary Text Color Preset */}
                    <div className="space-y-3">
                      <Input
                        type="text"
                        placeholder="Enter text color preset name..."
                        value={textPresetName}
                        onChange={(e) => setTextPresetName(e.target.value)}
                        className="w-full"
                      />
                      <Button
                        onClick={saveTextColorPreset}
                        disabled={!textPresetName.trim() || textColor === '#1f2937'}
                        className="w-full"
                        variant="outline"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Primary Text Color Preset
                      </Button>
                    </div>

                    {/* Saved Primary Text Color Presets */}
                    {savedTextPresets.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Saved Primary Text Color Presets</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {savedTextPresets.map((preset: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-4 h-4 rounded-full border"
                                  style={{ backgroundColor: preset.color }}
                                />
                                <span className="text-sm" style={{ color: preset.color }}>
                                  {preset.name}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleTextColorChange(preset.color)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Palette className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteTextColorPreset(preset.name)}
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                    className="w-full"
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
                    <Button variant="outline" size="sm">
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
                    <Button variant="outline" size="sm">
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
                    <Button variant="outline" size="sm">
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
                    <Button variant="destructive" size="sm">
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}