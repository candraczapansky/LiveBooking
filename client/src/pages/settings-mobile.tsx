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
import { useEasterEgg } from "@/contexts/EasterEggContext";
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
  const { checkEasterEgg } = useEasterEgg();
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

  // Track settings page visit
  useEffect(() => {
    checkEasterEgg("settings_guru");
  }, [checkEasterEgg]);

  useEffect(() => {
    const savedProfilePicture = localStorage.getItem('profilePicture');
    setProfilePicture(savedProfilePicture);
    
    const savedTheme = localStorage.getItem('theme') || 'blue';
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    const savedCustomColor = localStorage.getItem('customColor') || '#3b82f6';
    const savedSecondaryColor = localStorage.getItem('secondaryColor') || '#6b7280';
    
    setSelectedTheme(savedTheme);
    setDarkMode(savedDarkMode);
    setCustomColor(savedCustomColor);
    setSecondaryColor(savedSecondaryColor);
  }, []);

  const handleSaveAppearance = () => {
    localStorage.setItem('theme', selectedTheme);
    localStorage.setItem('customColor', customColor);
    localStorage.setItem('secondaryColor', secondaryColor);
    localStorage.setItem('darkMode', darkMode.toString());
    
    if (customColor !== '#3b82f6' || secondaryColor !== '#6b7280' || selectedTheme !== 'blue') {
      checkEasterEgg("theme_master");
    }
    
    toast({
      title: "Appearance saved",
      description: "Your appearance preferences have been updated.",
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

  const handleSaveProfile = () => {
    localStorage.setItem('profileData', JSON.stringify(profileData));
    checkEasterEgg("profile_perfectionist");
    
    toast({
      title: "Profile updated",
      description: "Your profile information has been saved.",
    });
    setIsEditingProfile(false);
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
                    <Button onClick={handleSaveProfile} style={{ flex: 1, height: "48px", fontSize: "16px" }}>
                      <Save style={{ width: "18px", height: "18px", marginRight: "8px" }} />
                      Save
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
                  
                  <Button onClick={() => setIsEditingProfile(true)} style={{ width: "100%", height: "48px", fontSize: "16px" }}>
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
                  onCheckedChange={setDarkMode}
                />
              </div>

              {/* Theme Colors */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ fontSize: "16px", fontWeight: "500", marginBottom: "12px", display: "block", color: "#374151" }}>
                  Primary Color
                </label>
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  style={{ 
                    width: "100%", 
                    height: "48px", 
                    border: "2px solid #e5e7eb", 
                    borderRadius: "8px",
                    cursor: "pointer",
                    backgroundColor: "white"
                  }}
                />
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