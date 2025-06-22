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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('blue');
  const [customColor, setCustomColor] = useState('#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState('#6b7280');
  const [savedPresets, setSavedPresets] = useState<Array<{name: string, color: string}>>([]);
  const [presetName, setPresetName] = useState('');
  const [secondaryPresetName, setSecondaryPresetName] = useState('');
  const [savedSecondaryPresets, setSavedSecondaryPresets] = useState<Array<{name: string, color: string}>>([]);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [appointmentReminders, setAppointmentReminders] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Load saved appearance settings on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'blue';
    const savedCustomColor = localStorage.getItem('customColor') || '#3b82f6';
    const savedSecondaryColor = localStorage.getItem('secondaryColor') || '#6b7280';
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    const savedPresetColors = localStorage.getItem('savedPresets');
    const savedSecondaryPresetColors = localStorage.getItem('savedSecondaryPresets');

    setSelectedTheme(savedTheme);
    setCustomColor(savedCustomColor);
    setSecondaryColor(savedSecondaryColor);
    setDarkMode(savedDarkMode);
    
    if (savedPresetColors) {
      setSavedPresets(JSON.parse(savedPresetColors));
    }
    
    if (savedSecondaryPresetColors) {
      setSavedSecondaryPresets(JSON.parse(savedSecondaryPresetColors));
    }

    // Apply saved custom colors
    if (savedTheme === 'custom' || savedCustomColor !== '#3b82f6') {
      const hslColor = hexToHsl(savedCustomColor);
      const root = document.documentElement;
      root.style.setProperty('--dropdown-selected', hslColor);
      root.style.setProperty('--dropdown-selected-foreground', '0 0% 98%');
    }

    // Apply saved secondary color to font
    if (savedSecondaryColor !== '#6b7280') {
      const hslSecondaryColor = hexToHsl(savedSecondaryColor);
      const root = document.documentElement;
      // Keep appropriate background for light/dark mode
      if (document.documentElement.classList.contains('dark')) {
        root.style.setProperty('--secondary', '240 3.7% 15.9%'); // Dark background
      } else {
        root.style.setProperty('--secondary', '210 40% 96%'); // Light background
      }
      root.style.setProperty('--secondary-foreground', hslSecondaryColor); // Use custom color for text
    }
  }, []);

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

  // Initialize theme settings from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'blue';
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    
    setSelectedTheme(savedTheme);
    setDarkMode(savedDarkMode);
    
    // Apply saved theme
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Update dark mode class on document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

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

  // Convert hex to HSL format
  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    const hslColor = hexToHsl(color);
    
    // Apply custom color to CSS variables immediately
    const root = document.documentElement;
    root.style.setProperty('--dropdown-selected', hslColor);
    root.style.setProperty('--dropdown-selected-foreground', '0 0% 98%');
    root.style.setProperty('--primary-color', color);
    
    // Set theme to custom
    setSelectedTheme('custom');
  };

  const handleSecondaryColorChange = (color: string) => {
    setSecondaryColor(color);
    const hslColor = hexToHsl(color);
    
    // Apply secondary color to CSS variables immediately
    const root = document.documentElement;
    // Keep appropriate background for light/dark mode
    if (document.documentElement.classList.contains('dark')) {
      root.style.setProperty('--secondary', '240 3.7% 15.9%'); // Dark background
    } else {
      root.style.setProperty('--secondary', '210 40% 96%'); // Light background
    }
    root.style.setProperty('--secondary-foreground', hslColor); // Use custom color for text
    root.style.setProperty('--secondary-color', color);
    
    // Save to localStorage
    localStorage.setItem('secondary-color', color);
    
    // Set theme to custom
    setSelectedTheme('custom');
  };

  const savePrimaryColorPreset = () => {
    if (!presetName.trim() || customColor === '#3b82f6') return;
    
    const newPreset = { name: presetName.trim(), color: customColor };
    const updatedPresets = [...savedPresets, newPreset];
    setSavedPresets(updatedPresets);
    localStorage.setItem('savedPresets', JSON.stringify(updatedPresets));
    
    toast({
      title: "Primary color saved",
      description: `"${presetName}" has been added to your primary color presets.`,
    });
    
    setPresetName('');
  };

  const deletePrimaryColorPreset = (nameToDelete: string) => {
    const updatedPresets = savedPresets.filter(preset => preset.name !== nameToDelete);
    setSavedPresets(updatedPresets);
    localStorage.setItem('savedPresets', JSON.stringify(updatedPresets));
    
    toast({
      title: "Primary color preset deleted",
      description: "Primary color preset has been removed.",
    });
  };

  const saveSecondaryColorPreset = () => {
    if (!secondaryPresetName.trim() || secondaryColor === '#6b7280') return;
    
    const newPreset = { name: secondaryPresetName.trim(), color: secondaryColor };
    const updatedPresets = [...savedSecondaryPresets, newPreset];
    setSavedSecondaryPresets(updatedPresets);
    localStorage.setItem('savedSecondaryPresets', JSON.stringify(updatedPresets));
    
    toast({
      title: "Text color saved",
      description: `"${secondaryPresetName}" has been added to your text color presets.`,
    });
    
    setSecondaryPresetName('');
  };

  const deleteSecondaryColorPreset = (nameToDelete: string) => {
    const updatedPresets = savedSecondaryPresets.filter(preset => preset.name !== nameToDelete);
    setSavedSecondaryPresets(updatedPresets);
    localStorage.setItem('savedSecondaryPresets', JSON.stringify(updatedPresets));
    
    toast({
      title: "Text color preset deleted",
      description: "Text color preset has been removed.",
    });
  };

  const handleSaveAppearance = () => {
    // Save appearance settings to localStorage
    localStorage.setItem('theme', selectedTheme);
    localStorage.setItem('customColor', customColor);
    localStorage.setItem('secondaryColor', secondaryColor);
    localStorage.setItem('darkMode', darkMode.toString());
    localStorage.setItem('savedPresets', JSON.stringify(savedPresets));
    
    toast({
      title: "Appearance saved",
      description: "Your appearance preferences have been updated.",
    });
  };

  const handleChangePassword = (data: PasswordChangeForm) => {
    changePasswordMutation.mutate(data);
  };

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

            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base flex items-center">
                  <Palette className="h-4 w-4 mr-2" />
                  Primary Theme Color
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose the main accent color for primary buttons and highlights
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
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                  

                </div>

                {/* Save Primary Color Section */}
                <div className="space-y-3 mt-4">
                  <Input
                    type="text"
                    placeholder="Enter primary color preset name..."
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    className="w-full"
                  />
                  <div 
                    onClick={savePrimaryColorPreset}
                    className={`w-full text-white hover:opacity-90 cursor-pointer px-4 py-3 rounded-md font-medium flex items-center justify-center transition-all ${(!presetName.trim() || customColor === '#3b82f6') ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ 
                      backgroundColor: `${customColor} !important`,
                      border: 'none', 
                      boxShadow: 'none'
                    } as React.CSSProperties}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Primary Color
                  </div>
                </div>


              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base flex items-center">
                  <Palette className="h-4 w-4 mr-2" />
                  Text Color
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose the main font color for all text throughout the application
                </p>
                
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
                  

                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Enter text color preset name..."
                  value={secondaryPresetName}
                  onChange={(e) => setSecondaryPresetName(e.target.value)}
                  className="flex-1"
                />
                <div 
                  onClick={saveSecondaryColorPreset}
                  className={`text-white hover:opacity-90 cursor-pointer px-4 py-2 rounded-md font-medium flex items-center justify-center transition-all ${(!secondaryPresetName.trim() || secondaryColor === '#6b7280') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ 
                    backgroundColor: `${secondaryColor} !important`,
                    border: 'none', 
                    boxShadow: 'none'
                  } as React.CSSProperties}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save Text Color
                </div>
              </div>

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

              <Separator />

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
                    { name: 'Teal', color: '#14b8a6', value: 'teal' },
                    { name: 'Indigo', color: '#6366f1', value: 'indigo' },
                    { name: 'Rose', color: '#f43f5e', value: 'rose' },
                    { name: 'Emerald', color: '#059669', value: 'emerald' },
                    { name: 'Amber', color: '#f59e0b', value: 'amber' },
                    { name: 'Cyan', color: '#06b6d4', value: 'cyan' },
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
                          onClick={() => deletePreset(index)}
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

            <div 
              onClick={handleSaveAppearance} 
              className="w-full text-white hover:opacity-90 cursor-pointer px-4 py-3 rounded-md font-medium flex items-center justify-center transition-all"
              style={{ 
                backgroundColor: `${customColor} !important`,
                border: 'none', 
                boxShadow: 'none'
              } as React.CSSProperties}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Appearance Settings
            </div>
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