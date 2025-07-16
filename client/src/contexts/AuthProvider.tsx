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
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (updatedUserData: Partial<User>) => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

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
      const response = await fetch(`/api/users/${userId}/color-preferences`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('No saved color preferences found');
          return;
        }
        throw new Error('Failed to load color preferences');
      }
      
      const colorPrefs = await response.json();
      console.log('Loaded color preferences:', colorPrefs);
      
      // Apply the color preferences to the DOM
      if (colorPrefs.primaryColor) {
        applyThemeColors(colorPrefs.primaryColor, colorPrefs.isDarkMode || false);
      }
      
      if (colorPrefs.primaryTextColor || colorPrefs.secondaryTextColor) {
        applyTextColors(
          colorPrefs.primaryTextColor || '#111827',
          colorPrefs.secondaryTextColor || '#6b7280'
        );
      }
      
      console.log('Color preferences applied globally');
    } catch (error) {
      console.error('Failed to load color preferences:', error);
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
    
    // Apply CSS custom properties
    root.style.setProperty('--primary', hslColor);
    root.style.setProperty('--primary-foreground', isDark ? '210 40% 98%' : '222.2 84% 4.9%');
    
    // Apply transparent button hover colors using the primary color with opacity
    root.style.setProperty('--button-primary-hover', hslColor);
    root.style.setProperty('--button-primary-hover-opacity', '0.1');
    root.style.setProperty('--button-outline-hover', hslColor);
    root.style.setProperty('--button-outline-hover-opacity', '0.1');
    
    // Update other color properties to match
    root.style.setProperty('--dropdown-selected', hslColor);
    root.style.setProperty('--accent', hslColor);
    root.style.setProperty('--sidebar-primary', hslColor);
    root.style.setProperty('--sidebar-accent-foreground', hslColor);
    
    // Apply dark/light mode styling
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  // Apply text colors function
  const applyTextColors = (primaryTextColor: string, secondaryTextColor: string) => {
    const root = document.documentElement;
    root.style.setProperty('--text-primary', primaryTextColor);
    root.style.setProperty('--text-secondary', secondaryTextColor);
  };

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
            
            // Load and apply color preferences immediately after login
            loadAndApplyColorPreferences(freshUserData.id);
          } else {
            // Fallback to localStorage data if API fails
            console.log('API failed, falling back to localStorage data');
            setUser(userData);
            setIsAuthenticated(true);
            console.log('User context set from localStorage fallback');
            
            // Dispatch event to notify all components of the fallback user data
            window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: userData }));
            
            // Load and apply color preferences immediately after login
            loadAndApplyColorPreferences(userData.id);
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

  const login = (userData: User) => {
    console.log("Login called with:", userData);
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Also update profilePicture in localStorage for backward compatibility
    if (userData.profilePicture) {
      localStorage.setItem('profilePicture', userData.profilePicture);
    }
    
    // Dispatch event to notify all components of the login
    window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: userData }));
    
    // Load and apply color preferences after login
    loadAndApplyColorPreferences(userData.id);
  };

  const logout = () => {
    console.log("Logout function called");
    setUser(null);
    setIsAuthenticated(false);
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
      
      // Dispatch event to notify all components of the update
      window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: newUser }));
      
      console.log('User context and localStorage updated');
    } else {
      console.error('Cannot update user - current user is null');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 