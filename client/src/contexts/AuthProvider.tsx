import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  profilePicture?: string;
  createdAt?: string;
  stripeCustomerId?: string | null;
  // Two-factor authentication fields
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  twoFactorBackupCodes?: string | null;
  twoFactorMethod?: string;
  twoFactorEmailCode?: string | null;
  twoFactorEmailCodeExpiry?: string | null;
  // Color preference fields
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  textColorSecondary?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (updatedUserData: Partial<User>) => void;
  loading: boolean;
  colorPreferencesApplied: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
  loading: true,
  colorPreferencesApplied: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [colorPreferencesApplied, setColorPreferencesApplied] = useState(false);

  // Function to fetch fresh user data from database
  const fetchFreshUserData = async (userId: number) => {
    try {
      console.log(`Fetching fresh user data for user ${userId}`);
      const response = await fetch(`/api/users/${userId}`);
      
      if (!response.ok) {
        console.error('Failed to fetch fresh user data');
        return null;
      }
      
      const freshUserData = await response.json();
      console.log('Fresh user data fetched successfully:', freshUserData);
      return freshUserData;
    } catch (error) {
      console.error('Error fetching fresh user data:', error);
      return null;
    }
  };

  // Function to load and apply color preferences
  const loadAndApplyColorPreferences = async (userId: number) => {
    try {
      console.log(`Loading color preferences for user ${userId}`);
      
      // Fetch color preferences from the dedicated API endpoint
      const response = await fetch(`/api/users/${userId}/color-preferences`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('No saved color preferences found, using defaults');
          // Apply default colors if no preferences exist
          applyThemeColors('#8b5cf6', false);
          applyTextColors('#111827', '#6b7280');
          setColorPreferencesApplied(true);
          return;
        }
        throw new Error(`Failed to load color preferences: ${response.status} ${response.statusText}`);
      }
      
      const colorPrefs = await response.json();
      console.log('Loaded color preferences from API:', colorPrefs);
      
      if (!colorPrefs || (typeof colorPrefs === 'object' && Object.keys(colorPrefs).length === 0)) {
        console.log('No valid color preferences found, using defaults');
        // Apply default colors if preferences are empty
        applyThemeColors('#8b5cf6', false);
        applyTextColors('#111827', '#6b7280');
        setColorPreferencesApplied(true);
        return;
      }
      
      // Apply the color preferences to the DOM with higher priority
      if (colorPrefs.primaryColor) {
        console.log('Applying primary color:', colorPrefs.primaryColor);
        applyThemeColors(colorPrefs.primaryColor, colorPrefs.isDarkMode || false);
      } else {
        console.log('No primary color found, using default');
        applyThemeColors('#8b5cf6', false);
      }
      
      if (colorPrefs.primaryTextColor || colorPrefs.secondaryTextColor) {
        console.log('Applying text colors:', colorPrefs.primaryTextColor, colorPrefs.secondaryTextColor);
        applyTextColors(
          colorPrefs.primaryTextColor || '#111827',
          colorPrefs.secondaryTextColor || '#6b7280'
        );
      } else {
        console.log('No text colors found, using defaults');
        applyTextColors('#111827', '#6b7280');
      }
      
      setColorPreferencesApplied(true);
      console.log('Color preferences applied globally');
      
      // Dispatch event to notify components of color update
      window.dispatchEvent(new CustomEvent('colorPreferencesUpdated'));
      
      // Apply colors again after a short delay to ensure they stick
      setTimeout(() => {
        console.log('Re-applying colors to ensure they stick');
        if (colorPrefs.primaryColor) {
          applyThemeColors(colorPrefs.primaryColor, colorPrefs.isDarkMode || false);
        }
        if (colorPrefs.primaryTextColor || colorPrefs.secondaryTextColor) {
          applyTextColors(
            colorPrefs.primaryTextColor || '#111827',
            colorPrefs.secondaryTextColor || '#6b7280'
          );
        }
      }, 500);
      
    } catch (error) {
      console.error('Failed to load color preferences:', error);
      // Apply default colors on error
      applyThemeColors('#8b5cf6', false);
      applyTextColors('#111827', '#6b7280');
      setColorPreferencesApplied(true);
    }
  };

  // Apply theme colors function
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
      
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    const hslColor = hexToHsl(primaryColor);
    console.log('Setting primary color HSL:', hslColor);
    
    // Apply CSS custom properties with priority
    root.style.setProperty('--primary', hslColor, 'important');
    root.style.setProperty('--primary-foreground', isDark ? '210 40% 98%' : '222.2 84% 4.9%', 'important');
    root.style.setProperty('--accent', hslColor, 'important');
    root.style.setProperty('--ring', hslColor, 'important');
    
    // Apply dark/light mode styling
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    console.log('Theme colors applied successfully');
  };

  // Apply text colors function
  const applyTextColors = (primaryTextColor: string, secondaryTextColor: string) => {
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
      
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };
    
    const primaryHsl = hexToHsl(primaryTextColor);
    const secondaryHsl = hexToHsl(secondaryTextColor);
    
    console.log('Setting text colors - Primary HSL:', primaryHsl, 'Secondary HSL:', secondaryHsl);
    
    root.style.setProperty('--text-primary', primaryHsl, 'important');
    root.style.setProperty('--text-secondary', secondaryHsl, 'important');
    
    console.log('Text colors applied successfully');
  };

  // Function to force refresh colors
  const forceRefreshColors = () => {
    if (user) {
      console.log('Force refreshing colors for user:', user.id);
      loadAndApplyColorPreferences(user.id);
    }
  };

  // Add global event listeners for color refresh
  useEffect(() => {
    // Listen for color changes in settings
    const handleColorChange = (event: CustomEvent) => {
      if (event.detail && event.detail.type === 'colorChange') {
        console.log('Color change detected:', event.detail);
        const { primaryColor, textColor, textColorSecondary } = event.detail;
        
        if (primaryColor) {
          console.log('Applying primary color change:', primaryColor);
          applyThemeColors(primaryColor, false);
        }
        
        if (textColor || textColorSecondary) {
          console.log('Applying text color change:', textColor, textColorSecondary);
          applyTextColors(
            textColor || '#111827',
            textColorSecondary || '#6b7280'
          );
        }
      }
    };
    
    // Add global function for manual color refresh (for debugging)
    (window as any).refreshColors = forceRefreshColors;
    (window as any).getCurrentColors = () => {
      const root = document.documentElement;
      return {
        primary: root.style.getPropertyValue('--primary'),
        textPrimary: root.style.getPropertyValue('--text-primary'),
        textSecondary: root.style.getPropertyValue('--text-secondary'),
        user: user
      };
    };

    window.addEventListener('colorChange', handleColorChange as EventListener);

    return () => {
      window.removeEventListener('colorChange', handleColorChange as EventListener);
      delete (window as any).refreshColors;
      delete (window as any).getCurrentColors;
    };
  }, [user]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData: User = JSON.parse(storedUser);
        console.log('Parsed user data:', userData);
        
        // Fetch fresh user data from database to ensure we have latest profile picture
        fetchFreshUserData(userData.id).then((freshUserData) => {
          if (freshUserData) {
            console.log('Using fresh user data from database:', freshUserData);
            setUser(freshUserData);
            setIsAuthenticated(true);
            // Update localStorage with fresh data
            localStorage.setItem('user', JSON.stringify(freshUserData));
            
            // Also update profilePicture in localStorage for backward compatibility
            if (freshUserData.profilePicture) {
              localStorage.setItem('profilePicture', freshUserData.profilePicture);
            }
            
            console.log('User context set with fresh data');
            
            // Dispatch event to notify all components of the fresh user data
            window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: freshUserData }));
            
            // Apply color preferences immediately after setting user data
            setTimeout(() => {
              console.log('Applying color preferences immediately after login');
              loadAndApplyColorPreferences(freshUserData.id);
            }, 200);
          } else {
            // Fallback to localStorage data if API fails
            console.log('API failed, falling back to localStorage data');
            setUser(userData);
            setIsAuthenticated(true);
            console.log('User context set from localStorage fallback');
            
            // Dispatch event to notify all components of the fallback user data
            window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: userData }));
            
            // Apply color preferences immediately after setting user data
            setTimeout(() => {
              console.log('Applying color preferences immediately after login (fallback)');
              loadAndApplyColorPreferences(userData.id);
            }, 200);
          }
        });
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    } else {
      console.log('No user data found in localStorage');
    }
    setLoading(false);
  }, []);

  // Apply color preferences whenever user data changes
  useEffect(() => {
    if (user && !colorPreferencesApplied) {
      console.log('User data changed, applying color preferences');
      // Add a small delay to ensure DOM is ready and default CSS is applied
      setTimeout(() => {
        loadAndApplyColorPreferences(user.id);
      }, 100);
    }
  }, [user, colorPreferencesApplied]);

  const login = (userData: User) => {
    console.log("Login called with:", userData);
    setUser(userData);
    setIsAuthenticated(true);
    setColorPreferencesApplied(false); // Reset flag on login
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Also update profilePicture in localStorage for backward compatibility
    if (userData.profilePicture) {
      localStorage.setItem('profilePicture', userData.profilePicture);
    }
    
    // Dispatch event to notify all components of the login
    window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: userData }));
    
    // Apply color preferences immediately after login with multiple attempts
    console.log('Applying color preferences on login');
    
    // Immediate application
    loadAndApplyColorPreferences(userData.id);
    
    // Apply again after a short delay
    setTimeout(() => {
      console.log('Re-applying colors after login delay');
      loadAndApplyColorPreferences(userData.id);
    }, 100);
  };

  const logout = () => {
    console.log("Logout function called");
    setUser(null);
    setIsAuthenticated(false);
    setColorPreferencesApplied(false); // Reset flag on logout
    localStorage.removeItem('user');
    localStorage.removeItem('profilePicture');
    // Clear color preferences from the DOM
    const root = document.documentElement;
    root.style.removeProperty('--primary');
    root.style.removeProperty('--primary-foreground');
    root.style.removeProperty('--button-primary-hover');
    root.style.removeProperty('--button-primary-hover-opacity');
    root.style.removeProperty('--button-outline-hover');
    root.style.removeProperty('--button-outline-hover-opacity');
    root.style.removeProperty('--dropdown-selected');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--sidebar-primary');
    root.style.removeProperty('--sidebar-accent-foreground');
    root.style.removeProperty('--text-primary');
    root.style.removeProperty('--text-secondary');
    root.classList.remove('dark');
    console.log("About to redirect to login");
    // Force redirect to login page
    window.location.replace('/login');
  };

  const updateUser = (updatedUserData: Partial<User>) => {
    console.log('updateUser called with:', updatedUserData);
    console.log('Current user before update:', user);
    
    if (user) {
      const newUser: User = { ...user, ...updatedUserData };
      console.log('New user data after merge:', newUser);
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      // Also update profilePicture in localStorage for backward compatibility
      if (newUser.profilePicture) {
        localStorage.setItem('profilePicture', newUser.profilePicture);
      }
      
      // Apply color preferences if they were updated
      if (updatedUserData.primaryColor || updatedUserData.textColor || updatedUserData.textColorSecondary) {
        console.log('Color preferences updated, applying new colors');
        if (updatedUserData.primaryColor) {
          applyThemeColors(updatedUserData.primaryColor, false);
        }
        if (updatedUserData.textColor || updatedUserData.textColorSecondary) {
          applyTextColors(
            updatedUserData.textColor || newUser.textColor || '#111827',
            updatedUserData.textColorSecondary || newUser.textColorSecondary || '#6b7280'
          );
        }
      }
      
      // If color preferences were updated, also reload them from the API to ensure consistency
      if (updatedUserData.primaryColor || updatedUserData.textColor || updatedUserData.textColorSecondary) {
        console.log('Color preferences updated, reloading from API');
        setTimeout(() => {
          loadAndApplyColorPreferences(newUser.id);
        }, 100);
      }
      
      // Dispatch event to notify all components of the update
      window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: newUser }));
      
      console.log('User context and localStorage updated');
    } else {
      console.error('Cannot update user - current user is null');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, updateUser, loading, colorPreferencesApplied }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 