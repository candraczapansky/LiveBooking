import { useState, useContext, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters long"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordChangeForm = z.infer<typeof passwordChangeSchema>;

export default function SettingsMobile() {
  const { toast } = useToast();
  const { user } = useContext(AuthContext);

  const [darkMode, setDarkMode] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    username: user?.username || ''
  });
  const [selectedTheme, setSelectedTheme] = useState('blue');
  const [customColor, setCustomColor] = useState('#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState('#6b7280');
  const [primaryTextColor, setPrimaryTextColor] = useState(() => {
    return localStorage.getItem('primaryTextColor') || '#111827';
  });
  const [secondaryTextColor, setSecondaryTextColor] = useState(() => {
    return localStorage.getItem('secondaryTextColor') || '#6b7280';
  });
  
  // Saved brand colors state
  const [savedBrandColors, setSavedBrandColors] = useState(() => {
    const saved = localStorage.getItem('savedBrandColors');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [savedTextColors, setSavedTextColors] = useState(() => {
    const saved = localStorage.getItem('savedTextColors');
    return saved ? JSON.parse(saved) : [];
  });

  const applyThemeColors = (primaryColor: string, isDark: boolean = false) => {
    const root = document.documentElement;
    
    // Convert hex to HSL for CSS custom properties
    const hexToHsl = (hex: string) => {
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
    };
    
    const { h, s, l } = hexToHsl(primaryColor);
    
    // Apply primary color variations
    root.style.setProperty('--primary', `${h} ${s}% ${l}%`);
    root.style.setProperty('--primary-foreground', `${h} ${s}% ${l > 50 ? 10 : 90}%`);
    
    // Generate complementary colors
    root.style.setProperty('--accent', `${h} ${Math.max(s - 10, 0)}% ${Math.min(l + 10, 95)}%`);
    root.style.setProperty('--accent-foreground', `${h} ${s}% ${l > 50 ? 10 : 90}%`);
    
    // Apply dark/light mode styling
    if (isDark) {
      document.documentElement.classList.add('dark');
      // Force dark mode background and text colors
      document.body.style.backgroundColor = 'hsl(240 10% 3.9%)';
      document.body.style.color = 'hsl(0 0% 98%)';
      // Apply to all main containers and override any white backgrounds
      const containers = document.querySelectorAll('main, .main-content, .page-container, #root > div, .flex, [style*="background"], [style*="white"]');
      containers.forEach(container => {
        if (container instanceof HTMLElement) {
          container.style.backgroundColor = 'hsl(240 10% 3.9%)';
          container.style.color = 'hsl(0 0% 98%)';
        }
      });
      // Force the root div to have dark background
      const rootDiv = document.querySelector('#root > div');
      if (rootDiv instanceof HTMLElement) {
        rootDiv.style.setProperty('background-color', 'hsl(240 10% 3.9%)', 'important');
      }
    } else {
      document.documentElement.classList.remove('dark');
      // Force light mode background and text colors
      document.body.style.backgroundColor = 'hsl(0 0% 100%)';
      document.body.style.color = 'hsl(222.2 84% 4.9%)';
      // Apply to all main containers
      const containers = document.querySelectorAll('main, .main-content, .page-container, #root > div, .flex, [style*="background"]');
      containers.forEach(container => {
        if (container instanceof HTMLElement) {
          container.style.backgroundColor = 'hsl(0 0% 100%)';
          container.style.color = 'hsl(222.2 84% 4.9%)';
        }
      });
      // Force the root div to have light background
      const rootDiv = document.querySelector('#root > div');
      if (rootDiv instanceof HTMLElement) {
        rootDiv.style.setProperty('background-color', 'hsl(0 0% 100%)', 'important');
      }
    }
  };

  const applyTextColors = (primaryText: string, secondaryText: string) => {
    const root = document.documentElement;
    
    // Convert hex to HSL for text colors
    const hexToHsl = (hex: string) => {
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
    };
    
    // Apply primary text color
    const primaryHsl = hexToHsl(primaryText);
    root.style.setProperty('--text-primary', `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`);
    
    // Apply secondary text color
    const secondaryHsl = hexToHsl(secondaryText);
    root.style.setProperty('--text-secondary', `${secondaryHsl.h} ${secondaryHsl.s}% ${secondaryHsl.l}%`);
    
    // Update global foreground colors to match custom text colors
    root.style.setProperty('--foreground', `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`);
    root.style.setProperty('--muted-foreground', `${secondaryHsl.h} ${secondaryHsl.s}% ${secondaryHsl.l}%`);
    root.style.setProperty('--card-foreground', `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`);
    root.style.setProperty('--popover-foreground', `${primaryHsl.h} ${primaryHsl.s}% ${primaryHsl.l}%`);
    
    // Save to localStorage
    localStorage.setItem('primaryTextColor', primaryText);
    localStorage.setItem('secondaryTextColor', secondaryText);
  };



  useEffect(() => {
    const savedProfilePicture = localStorage.getItem('profilePicture');
    setProfilePicture(savedProfilePicture);
    
    const savedTheme = localStorage.getItem('theme') || 'blue';
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    const savedCustomColor = localStorage.getItem('customColor') || '#3b82f6';
    const savedSecondaryColor = localStorage.getItem('secondaryColor') || '#6b7280';
    const savedPrimaryTextColor = localStorage.getItem('primaryTextColor') || '#111827';
    const savedSecondaryTextColor = localStorage.getItem('secondaryTextColor') || '#6b7280';
    
    setSelectedTheme(savedTheme);
    setDarkMode(savedDarkMode);
    setCustomColor(savedCustomColor);
    setSecondaryColor(savedSecondaryColor);
    setPrimaryTextColor(savedPrimaryTextColor);
    setSecondaryTextColor(savedSecondaryTextColor);
    
    // Apply saved theme after state update
    setTimeout(() => {
      applyThemeColors(savedCustomColor, savedDarkMode);
      applyTextColors(savedPrimaryTextColor, savedSecondaryTextColor);
    }, 100);
  }, []);

  const handleSaveAppearance = () => {
    localStorage.setItem('theme', selectedTheme);
    localStorage.setItem('customColor', customColor);
    localStorage.setItem('secondaryColor', secondaryColor);
    localStorage.setItem('darkMode', darkMode.toString());
    localStorage.setItem('primaryTextColor', primaryTextColor);
    localStorage.setItem('secondaryTextColor', secondaryTextColor);
    
    // Apply the colors immediately
    applyThemeColors(customColor, darkMode);
    applyTextColors(primaryTextColor, secondaryTextColor);
    
    toast({
      title: "Appearance saved",
      description: "Your appearance preferences including text colors have been updated.",
    });
  };

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setProfilePicture(result);
        localStorage.setItem('profilePicture', result);
        window.dispatchEvent(new CustomEvent('profilePictureUpdated', { detail: result }));
        toast({
          title: "Profile picture updated",
          description: "Your profile picture has been changed successfully.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: { firstName: string; lastName: string; email: string; phone: string }) => {
      const response = await fetch(`/api/users/${user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      return response.json();
    },
    onSuccess: (updatedUser) => {
      // Update the user context with the new data
      if (user) {
        const newUser = { ...user, ...updatedUser };
        localStorage.setItem('user', JSON.stringify(newUser));
        // Trigger a page refresh to update the context
        window.location.reload();
      }
      

      
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved successfully.",
      });
      setIsEditingProfile(false);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      width: "100vw",
      backgroundColor: "#f9fafb",
      overflow: "hidden"
    }}>
      <SidebarController />
      
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100%",
        marginLeft: 0,
        overflow: "hidden"
      }}>
        <Header />
        
        <main style={{
          flex: 1,
          height: "calc(100vh - 64px)",
          width: "100%",
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
          backgroundColor: "#f9fafb",
          padding: "12px"
        }}>
          <div style={{
            maxWidth: "480px",
            margin: "0 auto",
            width: "100%",
            minHeight: "calc(100vh - 88px)"
          }}>
            
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
              <h1 style={{ 
                fontSize: "24px", 
                fontWeight: "700", 
                color: "#111827", 
                marginBottom: "8px",
                lineHeight: "1.2" 
              }}>Profile & Settings</h1>
              <p style={{ 
                fontSize: "16px", 
                color: "#6b7280", 
                lineHeight: "1.5",
                margin: 0 
              }}>
                Manage your profile information, account preferences and security settings.
              </p>
            </div>

            {/* Profile Information Card */}
            <div style={{
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              marginBottom: "24px",
              padding: "24px",
              display: "block",
              visibility: "visible",
              minHeight: "200px"
            }}>
              <h2 style={{ 
                fontSize: "18px", 
                fontWeight: "600", 
                color: "#111827", 
                marginBottom: "16px",
                display: "flex",
                alignItems: "center"
              }}>
                <User style={{ width: "20px", height: "20px", marginRight: "8px" }} />
                Personal Information
              </h2>
              
              {/* Profile Picture */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px", gap: "16px" }}>
                <div 
                  className="profile-circle"
                  style={{
                    backgroundImage: `url(${profilePicture || "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300"})`
                  }}
                ></div>
                <div style={{ textAlign: "center" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px", color: "#111827" }}>
                    {user?.firstName || 'First'} {user?.lastName || 'Last'}
                  </h3>
                  <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>
                    {user?.email || 'email@example.com'}
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    style={{ display: "none" }}
                    id="profile-picture-input"
                  />
                  <label htmlFor="profile-picture-input" style={{ cursor: "pointer" }}>
                    <Button 
                      variant="outline" 
                      size="sm"
                      type="button"
                      style={{ 
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        margin: "0 auto"
                      }}
                    >
                      <Camera style={{ width: "16px", height: "16px" }} />
                      Change Photo
                    </Button>
                  </label>
                </div>
              </div>

              {/* Profile Form */}
              {isEditingProfile ? (
                <div style={{ display: "grid", gap: "20px" }}>
                  <div>
                    <label style={{ fontSize: "16px", fontWeight: "500", marginBottom: "12px", display: "block", color: "#374151" }}>
                      First Name
                    </label>
                    <Input
                      value={profileData.firstName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Enter first name"
                      style={{ height: "48px", fontSize: "16px" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "16px", fontWeight: "500", marginBottom: "12px", display: "block", color: "#374151" }}>
                      Last Name
                    </label>
                    <Input
                      value={profileData.lastName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Enter last name"
                      style={{ height: "48px", fontSize: "16px" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "16px", fontWeight: "500", marginBottom: "12px", display: "block", color: "#374151" }}>
                      Email
                    </label>
                    <Input
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email"
                      type="email"
                      style={{ height: "48px", fontSize: "16px" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "16px", fontWeight: "500", marginBottom: "12px", display: "block", color: "#374151" }}>
                      Phone
                    </label>
                    <Input
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter phone number"
                      type="tel"
                      style={{ height: "48px", fontSize: "16px" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={updateProfileMutation.isPending}
                      style={{ 
                        flex: 1, 
                        height: "48px", 
                        fontSize: "16px",
                        backgroundColor: customColor,
                        borderColor: customColor
                      }}
                    >
                      <Save style={{ width: "18px", height: "18px", marginRight: "8px" }} />
                      {updateProfileMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditingProfile(false)} style={{ flex: 1, height: "48px", fontSize: "16px" }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Display Current Profile Information */}
                  <div style={{ marginBottom: "24px", padding: "16px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                    <div style={{ display: "grid", gap: "12px" }}>
                      <div>
                        <label style={{ fontSize: "14px", fontWeight: "500", color: "#6b7280", display: "block", marginBottom: "4px" }}>
                          First Name
                        </label>
                        <p style={{ fontSize: "16px", color: "#111827", margin: 0 }}>
                          {user?.firstName || 'Not set'}
                        </p>
                      </div>
                      <div>
                        <label style={{ fontSize: "14px", fontWeight: "500", color: "#6b7280", display: "block", marginBottom: "4px" }}>
                          Last Name
                        </label>
                        <p style={{ fontSize: "16px", color: "#111827", margin: 0 }}>
                          {user?.lastName || 'Not set'}
                        </p>
                      </div>
                      <div>
                        <label style={{ fontSize: "14px", fontWeight: "500", color: "#6b7280", display: "block", marginBottom: "4px" }}>
                          Email
                        </label>
                        <p style={{ fontSize: "16px", color: "#111827", margin: 0 }}>
                          {user?.email || 'Not set'}
                        </p>
                      </div>
                      <div>
                        <label style={{ fontSize: "14px", fontWeight: "500", color: "#6b7280", display: "block", marginBottom: "4px" }}>
                          Phone
                        </label>
                        <p style={{ fontSize: "16px", color: "#111827", margin: 0 }}>
                          {user?.phone || 'Not set'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => setIsEditingProfile(true)} 
                    style={{ 
                      width: "100%", 
                      height: "48px", 
                      fontSize: "16px",
                      backgroundColor: customColor,
                      borderColor: customColor
                    }}
                  >
                    Edit Personal Information
                  </Button>
                </div>
              )}
            </div>

            {/* Appearance Settings Card */}
            <div style={{
              backgroundColor: "white",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              marginBottom: "24px",
              padding: "24px",
              display: "block",
              visibility: "visible",
              minHeight: "200px"
            }}>
              <h2 style={{ 
                fontSize: "18px", 
                fontWeight: "600", 
                color: "#111827", 
                marginBottom: "16px",
                display: "flex",
                alignItems: "center"
              }}>
                <Palette style={{ width: "20px", height: "20px", marginRight: "8px" }} />
                Appearance
              </h2>
              
              {/* Dark Mode Toggle */}
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                marginBottom: "20px",
                padding: "16px",
                backgroundColor: "#f9fafb",
                borderRadius: "8px",
                minHeight: "56px"
              }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {darkMode ? (
                    <Moon style={{ width: "20px", height: "20px", marginRight: "12px", color: "#6366f1" }} />
                  ) : (
                    <Sun style={{ width: "20px", height: "20px", marginRight: "12px", color: "#f59e0b" }} />
                  )}
                  <span style={{ fontSize: "16px", fontWeight: "500", color: "#111827" }}>Dark Mode</span>
                </div>
                <Switch
                  checked={darkMode}
                  onCheckedChange={(checked) => {
                    setDarkMode(checked);
                    applyThemeColors(customColor, checked);
                    // Save dark mode preference
                    localStorage.setItem('darkMode', checked.toString());
                  }}
                />
              </div>

              {/* Theme Colors */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ fontSize: "16px", fontWeight: "500", marginBottom: "12px", display: "block", color: "#374151" }}>
                  Primary Color
                </label>
                
                {/* Color Preset Options */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "14px", fontWeight: "500", marginBottom: "8px", display: "block", color: "#6b7280" }}>
                    Quick Colors
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px" }}>
                    {[
                      { color: "#3b82f6", name: "Blue" },
                      { color: "#8b5cf6", name: "Purple" },
                      { color: "#ef4444", name: "Red" },
                      { color: "#10b981", name: "Green" },
                      { color: "#f59e0b", name: "Orange" },
                      { color: "#ec4899", name: "Pink" },
                    ].map((preset) => (
                      <button
                        key={preset.color}
                        onClick={() => {
                          setCustomColor(preset.color);
                          applyThemeColors(preset.color, darkMode);
                        }}
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "8px",
                          backgroundColor: preset.color,
                          border: customColor === preset.color ? "3px solid #374151" : "2px solid #e5e7eb",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Saved Brand Colors */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "500", color: "#6b7280" }}>
                      Saved Brand Colors
                    </label>
                    <button
                      onClick={() => {
                        const name = prompt("Enter a name for this color:");
                        if (name && customColor) {
                          const newBrandColor = { name, color: customColor };
                          const updated = [...savedBrandColors, newBrandColor];
                          setSavedBrandColors(updated);
                          localStorage.setItem('savedBrandColors', JSON.stringify(updated));
                        }
                      }}
                      style={{
                        padding: "4px 8px",
                        fontSize: "12px",
                        backgroundColor: customColor,
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer"
                      }}
                    >
                      Save Current
                    </button>
                  </div>
                  
                  {savedBrandColors.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                      {savedBrandColors.map((preset, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setCustomColor(preset.color);
                            applyThemeColors(preset.color, darkMode);
                          }}
                          style={{
                            padding: "10px",
                            borderRadius: "8px",
                            backgroundColor: "white",
                            border: customColor === preset.color ? "2px solid #374151" : "1px solid #e5e7eb",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            position: "relative"
                          }}
                          title={preset.name}
                        >
                          <div 
                            style={{
                              width: "24px",
                              height: "24px",
                              borderRadius: "6px",
                              backgroundColor: preset.color,
                              flexShrink: 0
                            }}
                          />
                          <div style={{ fontSize: "12px", lineHeight: "1.2", flex: 1 }}>
                            <div style={{ fontWeight: "600", color: "#111827" }}>{preset.name}</div>
                            <div style={{ color: "#6b7280", fontSize: "10px" }}>{preset.color}</div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = savedBrandColors.filter((_, i) => i !== index);
                              setSavedBrandColors(updated);
                              localStorage.setItem('savedBrandColors', JSON.stringify(updated));
                            }}
                            style={{
                              position: "absolute",
                              top: "2px",
                              right: "2px",
                              width: "16px",
                              height: "16px",
                              backgroundColor: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: "2px",
                              fontSize: "10px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                            title="Delete"
                          >
                            ×
                          </button>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      padding: "20px",
                      textAlign: "center",
                      border: "2px dashed #d1d5db",
                      borderRadius: "8px",
                      color: "#6b7280",
                      fontSize: "14px"
                    }}>
                      No saved brand colors yet. Choose a primary color above and click "Save Current" to create your brand palette.
                    </div>
                  )}
                </div>

                {/* Custom Color Input */}
                <div style={{ position: "relative" }}>
                  <label style={{ fontSize: "14px", fontWeight: "500", marginBottom: "8px", display: "block", color: "#6b7280" }}>
                    Custom Color
                  </label>
                  <input
                    type="color"
                    id="color-picker"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    style={{ 
                      width: "100%", 
                      height: "48px", 
                      border: "2px solid #e5e7eb", 
                      borderRadius: "8px",
                      cursor: "pointer",
                      backgroundColor: "white",
                      WebkitAppearance: "none",
                      padding: "4px"
                    }}
                  />
                  <div 
                    style={{
                      position: "absolute",
                      top: "36px",
                      right: "12px",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                      fontSize: "12px",
                      color: "#6b7280",
                      backgroundColor: "white",
                      padding: "2px 4px",
                      borderRadius: "4px"
                    }}
                  >
                    {customColor}
                  </div>
                </div>
              </div>

              {/* Text Color Settings */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ fontSize: "16px", fontWeight: "500", marginBottom: "12px", display: "block", color: "#374151" }}>
                  Text Colors
                </label>
                
                {/* Primary Text Color */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "14px", fontWeight: "500", marginBottom: "8px", display: "block", color: "#6b7280" }}>
                    Primary Text Color (Headings & Main Text)
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <input
                      type="color"
                      value={primaryTextColor}
                      onChange={(e) => {
                        setPrimaryTextColor(e.target.value);
                        applyTextColors(e.target.value, secondaryTextColor);
                      }}
                      style={{
                        width: "60px",
                        height: "40px",
                        borderRadius: "8px",
                        border: "2px solid #e5e7eb",
                        cursor: "pointer",
                        WebkitAppearance: "none",
                        padding: "4px"
                      }}
                    />
                    <input
                      type="text"
                      value={primaryTextColor}
                      onChange={(e) => {
                        setPrimaryTextColor(e.target.value);
                        applyTextColors(e.target.value, secondaryTextColor);
                      }}
                      style={{
                        flex: 1,
                        height: "40px",
                        border: "2px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "0 12px",
                        fontSize: "14px"
                      }}
                      placeholder="#111827"
                    />
                  </div>
                  <div style={{ 
                    marginTop: "8px", 
                    padding: "12px", 
                    backgroundColor: "#f9fafb", 
                    borderRadius: "6px",
                    color: primaryTextColor,
                    fontSize: "14px",
                    fontWeight: "600"
                  }}>
                    Preview: This is how primary text will look
                  </div>
                </div>

                {/* Secondary Text Color */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "14px", fontWeight: "500", marginBottom: "8px", display: "block", color: "#6b7280" }}>
                    Secondary Text Color (Descriptions & Muted Text)
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <input
                      type="color"
                      value={secondaryTextColor}
                      onChange={(e) => {
                        setSecondaryTextColor(e.target.value);
                        applyTextColors(primaryTextColor, e.target.value);
                      }}
                      style={{
                        width: "60px",
                        height: "40px",
                        borderRadius: "8px",
                        border: "2px solid #e5e7eb",
                        cursor: "pointer",
                        WebkitAppearance: "none",
                        padding: "4px"
                      }}
                    />
                    <input
                      type="text"
                      value={secondaryTextColor}
                      onChange={(e) => {
                        setSecondaryTextColor(e.target.value);
                        applyTextColors(primaryTextColor, e.target.value);
                      }}
                      style={{
                        flex: 1,
                        height: "40px",
                        border: "2px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "0 12px",
                        fontSize: "14px"
                      }}
                      placeholder="#6b7280"
                    />
                  </div>
                  <div style={{ 
                    marginTop: "8px", 
                    padding: "12px", 
                    backgroundColor: "#f9fafb", 
                    borderRadius: "6px",
                    color: secondaryTextColor,
                    fontSize: "14px"
                  }}>
                    Preview: This is how secondary text will look
                  </div>
                </div>

                {/* Text Color Presets */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "14px", fontWeight: "500", marginBottom: "8px", display: "block", color: "#6b7280" }}>
                    Text Color Presets
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginBottom: "12px" }}>
                    {[
                      { primary: "#111827", secondary: "#6b7280", name: "Classic Dark", subtitle: "Traditional" },
                      { primary: "#1f2937", secondary: "#9ca3af", name: "Charcoal", subtitle: "Modern" },
                      { primary: "#374151", secondary: "#9ca3af", name: "Medium Gray", subtitle: "Balanced" },
                      { primary: "#000000", secondary: "#666666", name: "Pure Black", subtitle: "Bold" },
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => {
                          setPrimaryTextColor(preset.primary);
                          setSecondaryTextColor(preset.secondary);
                          applyTextColors(preset.primary, preset.secondary);
                        }}
                        style={{
                          padding: "10px",
                          borderRadius: "8px",
                          border: (primaryTextColor === preset.primary && secondaryTextColor === preset.secondary) ? "2px solid #374151" : "1px solid #e5e7eb",
                          backgroundColor: "white",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.2s"
                        }}
                        title={`${preset.name} - ${preset.subtitle}`}
                      >
                        <div style={{ color: preset.primary, fontSize: "12px", fontWeight: "600", marginBottom: "2px" }}>
                          {preset.name}
                        </div>
                        <div style={{ color: preset.secondary, fontSize: "10px" }}>
                          {preset.subtitle}
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {/* Saved Brand Text Colors */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "500", color: "#6b7280" }}>
                      Saved Text Colors
                    </label>
                    <button
                      onClick={() => {
                        const name = prompt("Enter a name for this text color combination:");
                        if (name) {
                          const newTextColor = { 
                            name, 
                            primary: primaryTextColor, 
                            secondary: secondaryTextColor 
                          };
                          const updated = [...savedTextColors, newTextColor];
                          setSavedTextColors(updated);
                          localStorage.setItem('savedTextColors', JSON.stringify(updated));
                        }
                      }}
                      style={{
                        padding: "4px 8px",
                        fontSize: "10px",
                        backgroundColor: primaryTextColor,
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer"
                      }}
                    >
                      Save Current
                    </button>
                  </div>
                  
                  {savedTextColors.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                      {savedTextColors.map((preset, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setPrimaryTextColor(preset.primary);
                            setSecondaryTextColor(preset.secondary);
                            applyTextColors(preset.primary, preset.secondary);
                          }}
                          style={{
                            padding: "10px",
                            borderRadius: "8px",
                            border: (primaryTextColor === preset.primary && secondaryTextColor === preset.secondary) ? "2px solid #374151" : "1px solid #e5e7eb",
                            backgroundColor: "white",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s",
                            position: "relative"
                          }}
                          title={preset.name}
                        >
                          <div style={{ color: preset.primary, fontSize: "12px", fontWeight: "600", marginBottom: "2px" }}>
                            {preset.name}
                          </div>
                          <div style={{ color: preset.secondary, fontSize: "10px" }}>
                            Primary: {preset.primary} | Secondary: {preset.secondary}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = savedTextColors.filter((_, i) => i !== index);
                              setSavedTextColors(updated);
                              localStorage.setItem('savedTextColors', JSON.stringify(updated));
                            }}
                            style={{
                              position: "absolute",
                              top: "2px",
                              right: "2px",
                              width: "16px",
                              height: "16px",
                              backgroundColor: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: "2px",
                              fontSize: "10px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                            title="Delete"
                          >
                            ×
                          </button>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      padding: "16px",
                      textAlign: "center",
                      border: "2px dashed #d1d5db",
                      borderRadius: "8px",
                      color: "#6b7280",
                      fontSize: "12px"
                    }}>
                      No saved text colors yet. Adjust your text colors above and click "Save Current" to create your text palette.
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={handleSaveAppearance} style={{ width: "100%", height: "48px", fontSize: "16px" }}>
                <Save style={{ width: "18px", height: "18px", marginRight: "8px" }} />
                Save Appearance Settings
              </Button>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}