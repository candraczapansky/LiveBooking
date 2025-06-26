import { useState, useContext, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/App";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { apiRequest } from "@/lib/queryClient";

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
  const { user, updateUser } = useContext(AuthContext);
  const [localUser, setLocalUser] = useState<any>(null);
  
  // Use context user or fallback to localStorage user
  const currentUser = user || localUser;

  // Update profileData when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setProfileData({
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        username: currentUser.username || ''
      });
    }
  }, [currentUser]);
  
  // Debug logging for user context
  useEffect(() => {
    console.log('Settings page mounted');
    console.log('User from context:', user);
    console.log('localStorage user data:', localStorage.getItem('user'));
    
    // If user is null but localStorage has data, load it into local state
    if (!user) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        console.error('User context is null but localStorage has user data:', storedUser);
        try {
          const userData = JSON.parse(storedUser);
          console.log('Parsed localStorage user data:', userData);
          setLocalUser(userData);
        } catch (e) {
          console.error('Error parsing localStorage user data:', e);
        }
      }
    } else {
      setLocalUser(user);
    }
  }, [user]);

  const [darkMode, setDarkMode] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  // Handle profile picture change
  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      // Create a FileReader to convert the image to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        setProfilePicture(base64String);
        localStorage.setItem('profilePicture', base64String);
        
        toast({
          title: "Photo updated",
          description: "Your profile photo has been changed successfully.",
        });
      };
      
      reader.onerror = () => {
        toast({
          title: "Upload failed",
          description: "Failed to process the image. Please try again.",
          variant: "destructive",
        });
      };
      
      reader.readAsDataURL(file);
    }
  };

  // Load profile picture from localStorage on component mount
  useEffect(() => {
    const savedPicture = localStorage.getItem('profilePicture');
    if (savedPicture) {
      setProfilePicture(savedPicture);
    }
  }, []);
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

  // Button icons state
  const [showButtonIcons, setShowButtonIcons] = useState(() => {
    const saved = localStorage.getItem('showButtonIcons');
    return saved !== null ? JSON.parse(saved) : false;
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
    
    // Apply dropdown colors to match primary color
    root.style.setProperty('--dropdown-selected', `${h} ${s}% ${l}%`);
    root.style.setProperty('--dropdown-selected-foreground', `${h} ${s}% ${l > 50 ? 10 : 90}%`);
    
    // Apply sidebar colors to match primary color
    root.style.setProperty('--sidebar-primary', `${h} ${s}% ${l}%`);
    root.style.setProperty('--sidebar-accent', `${h} ${Math.max(s - 10, 0)}% ${Math.min(l + 10, 95)}%`);
    root.style.setProperty('--sidebar-accent-foreground', `${h} ${s}% ${l}%`);
    root.style.setProperty('--sidebar-ring', `${h} ${s}% ${l}%`);
    
    // Apply ring color
    root.style.setProperty('--ring', `${h} ${s}% ${l}%`);
    
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
    
    // Apply button icons setting globally
    document.documentElement.classList.toggle('hide-button-icons', !showButtonIcons);
  };



  // Load color preferences from database when user is available
  useEffect(() => {
    const loadUserColorPreferences = async () => {
      if (user?.id) {
        try {
          const response = await fetch(`/api/users/${user.id}/color-preferences`);
          if (response.ok) {
            const preferences = await response.json();
            if (preferences) {
              // Apply database preferences
              setCustomColor(preferences.primaryColor || '#f4a4c0');
              setPrimaryTextColor(preferences.primaryTextColor || '#000000');
              setSecondaryTextColor(preferences.secondaryTextColor || '#6b7280');
              setDarkMode(preferences.isDarkMode || false);
              
              if (preferences.savedBrandColors) {
                setSavedBrandColors(JSON.parse(preferences.savedBrandColors));
              }
              if (preferences.savedTextColors) {
                setSavedTextColors(JSON.parse(preferences.savedTextColors));
              }
              
              // Apply the loaded colors
              applyThemeColors(preferences.primaryColor || '#f4a4c0', preferences.isDarkMode || false);
              applyTextColors(preferences.primaryTextColor || '#000000', preferences.secondaryTextColor || '#6b7280');
              
              console.log('Loaded color preferences from database:', preferences);
              return; // Exit early if database preferences were loaded
            }
          }
        } catch (error) {
          console.error('Failed to load color preferences from database:', error);
        }
      }
      
      // Fallback to localStorage if database loading fails or user not available
      const savedProfilePicture = localStorage.getItem('profilePicture');
      setProfilePicture(savedProfilePicture);
      
      const savedTheme = localStorage.getItem('theme') || 'blue';
      const savedDarkMode = localStorage.getItem('darkMode') === 'true';
      const savedCustomColor = localStorage.getItem('customColor') || '#f4a4c0';
      const savedSecondaryColor = localStorage.getItem('secondaryColor') || '#6b7280';
      const savedPrimaryTextColor = localStorage.getItem('primaryTextColor') || '#000000';
      const savedSecondaryTextColor = localStorage.getItem('secondaryTextColor') || '#6b7280';
      const savedShowButtonIcons = localStorage.getItem('showButtonIcons');
      if (savedShowButtonIcons !== null) {
        setShowButtonIcons(JSON.parse(savedShowButtonIcons));
      }
      
      setSelectedTheme(savedTheme);
      setDarkMode(savedDarkMode);
      setCustomColor(savedCustomColor);
      setSecondaryColor(savedSecondaryColor);
      setPrimaryTextColor(savedPrimaryTextColor);
      setSecondaryTextColor(savedSecondaryTextColor);
      
      // Apply the loaded colors
      applyThemeColors(savedCustomColor, savedDarkMode);
      applyTextColors(savedPrimaryTextColor, savedSecondaryTextColor);
    };
    
    loadUserColorPreferences();
  }, [user?.id]); // Re-run when user ID changes

  const handleSaveAppearance = () => {
    localStorage.setItem('theme', selectedTheme);
    localStorage.setItem('customColor', customColor);
    localStorage.setItem('secondaryColor', secondaryColor);
    localStorage.setItem('darkMode', darkMode.toString());
    localStorage.setItem('primaryTextColor', primaryTextColor);
    localStorage.setItem('secondaryTextColor', secondaryTextColor);
    localStorage.setItem('showButtonIcons', JSON.stringify(showButtonIcons));
    
    // Apply the colors immediately
    applyThemeColors(customColor, darkMode);
    applyTextColors(primaryTextColor, secondaryTextColor);
    
    // Apply button icons setting
    document.documentElement.classList.toggle('hide-button-icons', !showButtonIcons);
    
    toast({
      title: "Appearance saved",
      description: "Your appearance preferences including text colors have been updated.",
    });
  };



  const saveColorPreferencesMutation = useMutation({
    mutationFn: async (preferences: any) => {
      if (!user?.id) {
        throw new Error('User ID is required');
      }
      
      const response = await fetch(`/api/users/${user.id}/color-preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save color preferences');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Silently save to database - no toast needed for auto-save
    },
    onError: (error) => {
      console.error('Failed to save color preferences:', error);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileDataWithUserId: { firstName: string; lastName: string; email: string; phone: string; userId?: number }) => {
      const { userId, ...profileData } = profileDataWithUserId;
      const targetUserId = userId || user?.id;
      
      if (!targetUserId) {
        console.error('No user ID found');
        throw new Error('User ID is required');
      }
      
      console.log('Starting profile update...');
      console.log('User ID:', targetUserId);
      console.log('Profile data being sent:', profileData);
      console.log('API URL:', `/api/users/${targetUserId}`);
      
      const response = await fetch(`/api/users/${targetUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Update failed:', errorData);
        throw new Error(errorData.error || 'Failed to update profile');
      }
      
      const result = await response.json();
      console.log('API Update successful, received:', result);
      return result;
    },
    onSuccess: (updatedUser) => {
      console.log('Profile update success callback triggered');
      console.log('Updated user data received:', updatedUser);
      
      // Update localStorage first to ensure data persistence
      localStorage.setItem('user', JSON.stringify(updatedUser));
      console.log('localStorage updated with new user data');
      
      // Update the profile data state to reflect the changes in UI
      setProfileData({
        firstName: updatedUser.firstName || '',
        lastName: updatedUser.lastName || '',
        email: updatedUser.email || '',
        phone: updatedUser.phone || '',
        username: updatedUser.username || ''
      });
      console.log('Profile data state updated for UI');
      
      // Try to update context (might not work due to timing issues)
      if (updateUser && typeof updateUser === 'function') {
        console.log('Attempting to update user context');
        updateUser(updatedUser);
      } else {
        console.log('Context updateUser not available, relying on localStorage');
      }
      
      // Update the local user state immediately for UI display
      setLocalUser(updatedUser);
      
      // Dispatch custom event to notify other components (like header) of user data update
      window.dispatchEvent(new CustomEvent('userDataUpdated', { 
        detail: updatedUser 
      }));
      console.log('User data update event dispatched');
      
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved successfully.",
      });
      setIsEditingProfile(false);
      console.log('Profile update success flow completed');
    },
    onError: (error) => {
      console.error('Profile update error callback triggered:', error);
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    console.log('handleSaveProfile called');
    console.log('Current user:', user);
    console.log('Current profileData state:', profileData);
    
    // Get user ID from context or localStorage as fallback
    let userId = user?.id;
    
    if (!userId) {
      console.log('User context not available, checking localStorage...');
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          userId = userData.id;
          console.log('Using user ID from localStorage:', userId);
        } catch (e) {
          console.error('Error parsing localStorage user data:', e);
        }
      }
    }
    
    if (!userId) {
      console.error('No user ID available for profile save');
      toast({
        title: "Error",
        description: "User session not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Starting profile mutation with user ID:', userId);
    updateProfileMutation.mutate({ 
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email,
      phone: profileData.phone,
      userId 
    });
    console.log('Profile mutation triggered');
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
                    ref={(input) => {
                      if (input) {
                        (window as any).profileInputRef = input;
                      }
                    }}
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('profile-picture-input') as HTMLInputElement;
                      if (input) {
                        input.click();
                      }
                    }}
                    style={{ 
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      margin: "0 auto",
                      cursor: "pointer"
                    }}
                  >
                    <Camera style={{ width: "16px", height: "16px", color: primaryTextColor }} />
                    Change Photo
                  </Button>
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
                  <div style={{ display: "flex", gap: "12px", marginTop: "20px", flexWrap: "wrap" }}>
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={updateProfileMutation.isPending}
                      style={{ 
                        flex: 1, 
                        height: "48px", 
                        fontSize: "16px",
                        backgroundColor: customColor,
                        borderColor: customColor,
                        minWidth: "140px"
                      }}
                    >
                      <Save style={{ width: "18px", height: "18px", marginRight: "8px", color: "white" }} />
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
                          {currentUser?.firstName || 'Not set'}
                        </p>
                      </div>
                      <div>
                        <label style={{ fontSize: "14px", fontWeight: "500", color: "#6b7280", display: "block", marginBottom: "4px" }}>
                          Last Name
                        </label>
                        <p style={{ fontSize: "16px", color: "#111827", margin: 0 }}>
                          {currentUser?.lastName || 'Not set'}
                        </p>
                      </div>
                      <div>
                        <label style={{ fontSize: "14px", fontWeight: "500", color: "#6b7280", display: "block", marginBottom: "4px" }}>
                          Email
                        </label>
                        <p style={{ fontSize: "16px", color: "#111827", margin: 0 }}>
                          {currentUser?.email || 'Not set'}
                        </p>
                      </div>
                      <div>
                        <label style={{ fontSize: "14px", fontWeight: "500", color: "#6b7280", display: "block", marginBottom: "4px" }}>
                          Phone
                        </label>
                        <p style={{ fontSize: "16px", color: "#111827", margin: 0 }}>
                          {currentUser?.phone || 'Not set'}
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
                <Palette style={{ width: "20px", height: "20px", marginRight: "8px", color: primaryTextColor }} />
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
                    <Moon style={{ width: "20px", height: "20px", marginRight: "12px", color: primaryTextColor }} />
                  ) : (
                    <Sun style={{ width: "20px", height: "20px", marginRight: "12px", color: primaryTextColor }} />
                  )}
                  <span style={{ fontSize: "16px", fontWeight: "500", color: primaryTextColor }}>Dark Mode</span>
                </div>
                <Switch
                  checked={darkMode}
                  onCheckedChange={(checked) => {
                    setDarkMode(checked);
                    applyThemeColors(customColor, checked);
                    // Save dark mode preference
                    localStorage.setItem('darkMode', checked.toString());
                    // Auto-save to database
                    if (user?.id) {
                      saveColorPreferencesMutation.mutate({
                        userId: user.id,
                        primaryColor: customColor,
                        primaryTextColor,
                        secondaryTextColor,
                        isDarkMode: checked,
                        savedBrandColors: JSON.stringify(savedBrandColors),
                        savedTextColors: JSON.stringify(savedTextColors)
                      });
                    }
                  }}
                />
              </div>

              {/* Theme Colors */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ fontSize: "16px", fontWeight: "500", marginBottom: "12px", display: "block", color: primaryTextColor }}>
                  Primary Color
                </label>
                
                {/* Color Preset Options */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "14px", fontWeight: "500", marginBottom: "8px", display: "block", color: secondaryTextColor }}>
                    Quick Colors
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
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
                          height: "56px",
                          borderRadius: "8px",
                          backgroundColor: preset.color,
                          border: customColor === preset.color ? "3px solid #374151" : "2px solid #e5e7eb",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontWeight: "500",
                          fontSize: "14px",
                          textShadow: "0 1px 2px rgba(0,0,0,0.3)"
                        }}
                        title={preset.name}
                      >
                        {preset.name}
                      </button>
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
                          // Auto-save to database
                          saveColorPreferencesMutation.mutate({ savedBrandColors: JSON.stringify(updated) });
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
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                      {savedBrandColors.map((preset: any, index: number) => (
                        <div
                          key={index}
                          style={{
                            padding: "12px",
                            borderRadius: "8px",
                            backgroundColor: "white",
                            border: customColor === preset.color ? "2px solid #374151" : "1px solid #e5e7eb",
                            transition: "all 0.2s",
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            position: "relative",
                            minHeight: "56px"
                          }}
                        >
                          <button
                            onClick={() => {
                              setCustomColor(preset.color);
                              applyThemeColors(preset.color, darkMode);
                              // Auto-save to database
                              saveColorPreferencesMutation.mutate({ primaryColor: preset.color });
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              flex: 1,
                              backgroundColor: "transparent",
                              border: "none",
                              cursor: "pointer",
                              textAlign: "left",
                              padding: "0"
                            }}
                            title={`Select ${preset.name}`}
                          >
                            <div 
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "6px",
                                backgroundColor: preset.color,
                                flexShrink: 0,
                                border: "1px solid #e5e7eb"
                              }}
                            />
                            <div style={{ fontSize: "13px", lineHeight: "1.3", flex: 1 }}>
                              <div style={{ fontWeight: "600", color: "#111827", marginBottom: "2px" }}>{preset.name}</div>
                              <div style={{ color: "#6b7280", fontSize: "11px" }}>{preset.color}</div>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              const updated = savedBrandColors.filter((_: any, i: number) => i !== index);
                              setSavedBrandColors(updated);
                              localStorage.setItem('savedBrandColors', JSON.stringify(updated));
                              // Auto-save to database
                              saveColorPreferencesMutation.mutate({ savedBrandColors: JSON.stringify(updated) });
                            }}
                            style={{
                              width: "24px",
                              height: "24px",
                              backgroundColor: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "12px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0
                            }}
                            title="Delete"
                          >
                            ×
                          </button>
                        </div>
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
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <input
                      type="color"
                      id="color-picker"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        applyThemeColors(e.target.value, darkMode);
                      }}
                      style={{ 
                        width: "80px", 
                        height: "56px", 
                        border: "2px solid #e5e7eb", 
                        borderRadius: "8px",
                        cursor: "pointer",
                        backgroundColor: "white",
                        WebkitAppearance: "none",
                        padding: "4px"
                      }}
                    />
                    <input
                      type="text"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                          applyThemeColors(e.target.value, darkMode);
                          // Auto-save to database
                          if (user?.id) {
                            saveColorPreferencesMutation.mutate({
                              userId: user.id,
                              primaryColor: e.target.value,
                              primaryTextColor,
                              secondaryTextColor,
                              isDarkMode: darkMode,
                              savedBrandColors: JSON.stringify(savedBrandColors),
                              savedTextColors: JSON.stringify(savedTextColors)
                            });
                          }
                        }
                      }}
                      style={{
                        flex: 1,
                        height: "56px",
                        border: "2px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "0 16px",
                        fontSize: "16px",
                        fontFamily: "monospace"
                      }}
                      placeholder="#f4a4c0"
                    />
                  </div>
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
                        // Auto-save to database
                        if (user?.id) {
                          saveColorPreferencesMutation.mutate({
                            userId: user.id,
                            primaryColor: customColor,
                            primaryTextColor: e.target.value,
                            secondaryTextColor,
                            isDarkMode: darkMode,
                            savedBrandColors: JSON.stringify(savedBrandColors),
                            savedTextColors: JSON.stringify(savedTextColors)
                          });
                        }
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
                        // Auto-save to database
                        if (user?.id && /^#[0-9A-F]{6}$/i.test(e.target.value)) {
                          saveColorPreferencesMutation.mutate({
                            userId: user.id,
                            primaryColor: customColor,
                            primaryTextColor: e.target.value,
                            secondaryTextColor,
                            isDarkMode: darkMode,
                            savedBrandColors: JSON.stringify(savedBrandColors),
                            savedTextColors: JSON.stringify(savedTextColors)
                          });
                        }
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
                        // Auto-save to database
                        if (user?.id) {
                          saveColorPreferencesMutation.mutate({
                            userId: user.id,
                            primaryColor: customColor,
                            primaryTextColor,
                            secondaryTextColor: e.target.value,
                            isDarkMode: darkMode,
                            savedBrandColors: JSON.stringify(savedBrandColors),
                            savedTextColors: JSON.stringify(savedTextColors)
                          });
                        }
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
                        // Auto-save to database
                        if (user?.id && /^#[0-9A-F]{6}$/i.test(e.target.value)) {
                          saveColorPreferencesMutation.mutate({
                            userId: user.id,
                            primaryColor: customColor,
                            primaryTextColor,
                            secondaryTextColor: e.target.value,
                            isDarkMode: darkMode,
                            savedBrandColors: JSON.stringify(savedBrandColors),
                            savedTextColors: JSON.stringify(savedTextColors)
                          });
                        }
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

                {/* Button Icons Toggle */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "14px", fontWeight: "500", marginBottom: "8px", display: "block", color: "#6b7280" }}>
                    Button Icons
                  </label>
                  <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px" }}>
                    Show or hide icons on buttons throughout the application
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Switch
                      checked={showButtonIcons}
                      onCheckedChange={(checked) => {
                        setShowButtonIcons(checked);
                        localStorage.setItem('showButtonIcons', JSON.stringify(checked));
                        document.documentElement.classList.toggle('hide-button-icons', !checked);
                      }}
                    />
                    <span style={{ fontSize: "14px", color: primaryTextColor }}>
                      {showButtonIcons ? 'Icons enabled' : 'Icons disabled'}
                    </span>
                  </div>
                  <div style={{ 
                    marginTop: "8px", 
                    padding: "12px", 
                    backgroundColor: "#f9fafb", 
                    borderRadius: "6px",
                    fontSize: "14px"
                  }}>
                    Preview: <Button 
                      style={{ 
                        fontSize: "12px", 
                        height: "32px", 
                        backgroundColor: customColor,
                        borderColor: customColor,
                        marginLeft: "8px"
                      }}
                    >
                      {showButtonIcons && <Save style={{ width: "14px", height: "14px", marginRight: "6px" }} />}
                      Sample Button
                    </Button>
                  </div>
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
                        // Auto-save to database
                        saveColorPreferencesMutation.mutate({ savedTextColors: JSON.stringify(updated) });
                      }
                    }}
                    style={{
                      padding: "4px 8px",
                      fontSize: "10px",
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
                
                {savedTextColors.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(1, 1fr)", gap: "12px" }}>
                    {savedTextColors.map((preset: any, index: number) => (
                      <div
                        key={index}
                        style={{
                          padding: "12px",
                          borderRadius: "8px",
                          border: (primaryTextColor === preset.primary && secondaryTextColor === preset.secondary) ? "2px solid #374151" : "1px solid #e5e7eb",
                          backgroundColor: "white",
                          transition: "all 0.2s",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          minHeight: "60px"
                        }}
                      >
                        <button
                          onClick={() => {
                            setPrimaryTextColor(preset.primary);
                            setSecondaryTextColor(preset.secondary);
                            applyTextColors(preset.primary, preset.secondary);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            flex: 1,
                            backgroundColor: "transparent",
                            border: "none",
                            cursor: "pointer",
                            textAlign: "left",
                            padding: "0"
                          }}
                          title={`Select ${preset.name}`}
                        >
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <div 
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "4px",
                                backgroundColor: preset.primary,
                                border: "1px solid #e5e7eb"
                              }}
                            />
                            <div 
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "4px",
                                backgroundColor: preset.secondary,
                                border: "1px solid #e5e7eb"
                              }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: preset.primary, fontSize: "14px", fontWeight: "600", marginBottom: "2px" }}>
                              {preset.name}
                            </div>
                            <div style={{ color: preset.secondary, fontSize: "12px" }}>
                              Primary: {preset.primary} | Secondary: {preset.secondary}
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            const updated = savedTextColors.filter((_: any, i: number) => i !== index);
                            setSavedTextColors(updated);
                            localStorage.setItem('savedTextColors', JSON.stringify(updated));
                            // Auto-save to database
                            saveColorPreferencesMutation.mutate({ savedTextColors: JSON.stringify(updated) });
                          }}
                          style={{
                            width: "28px",
                            height: "28px",
                            backgroundColor: "#ef4444",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "14px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0
                          }}
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
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

              <Button 
                onClick={handleSaveAppearance} 
                style={{ 
                  width: "100%", 
                  height: "48px", 
                  fontSize: "16px",
                  backgroundColor: customColor,
                  borderColor: customColor
                }}
              >
                <Save style={{ width: "18px", height: "18px", marginRight: "8px", color: "white" }} />
                Save Appearance Settings
              </Button>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}