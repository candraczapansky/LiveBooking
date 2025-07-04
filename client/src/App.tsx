import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { Toaster } from "@/components/ui/toaster";

import { useState, useEffect } from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import MobileDashboard from "@/pages/mobile-dashboard";
import Login from "@/pages/login";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Services from "@/pages/services";
import Clients from "@/pages/clients";
import Staff from "@/pages/staff-simple";
import Rooms from "@/pages/rooms";
import Devices from "@/pages/devices";
import Appointments from "@/pages/appointments";
import Memberships from "@/pages/memberships";
import Reports from "@/pages/reports";
import Marketing from "@/pages/marketing";
import Automations from "@/pages/automations";
import Settings from "@/pages/settings";
import Schedule from "@/pages/schedule";
import StaffSchedule from "@/pages/staff-schedule";
import StaffScheduleDetail from "@/pages/staff-schedule-detail";
import ClientBooking from "@/pages/client-booking";
import PointOfSale from "@/pages/pos";
import Products from "@/pages/products";
import EmailTest from "@/pages/email-test";
import GiftCertificatesPage from "@/pages/gift-certificates";
import PhonePage from "@/pages/phone";

type User = {
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
};

export type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updatedUserData: Partial<User>) => void;
};

export const AuthContext = React.createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: () => {
    console.log("Default login function called - context not properly provided");
  },
  logout: () => {
    console.log("Default logout function called - context not properly provided");
    localStorage.removeItem('user');
    localStorage.clear();
    window.location.replace('/');
  },
  updateUser: () => {
    console.log("Default updateUser function called - context not properly provided");
  },
});

function Router() {
  const { isAuthenticated, user } = useAuth();

  console.log("Router render - isAuthenticated:", isAuthenticated, "user:", user);

  // Public routes that don't require authentication
  if (!isAuthenticated) {
    console.log("Showing public routes (not authenticated)");
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/booking" component={ClientBooking} />
        <Route path="/" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  // Protected routes that require authentication
  console.log("Showing protected routes (authenticated)");
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/services" component={Services} />
      <Route path="/clients" component={Clients} />
      <Route path="/staff" component={Staff} />
      <Route path="/pos" component={PointOfSale} />
      <Route path="/products" component={Products} />
      <Route path="/gift-certificates" component={GiftCertificatesPage} />
      <Route path="/rooms" component={Rooms} />
      <Route path="/devices" component={Devices} />
      <Route path="/appointments" component={Appointments} />
      <Route path="/memberships" component={Memberships} />
      <Route path="/reports" component={Reports} />
      <Route path="/marketing" component={Marketing} />
      <Route path="/automations" component={Automations} />
      <Route path="/phone" component={PhonePage} />
      <Route path="/email-test" component={EmailTest} />
      <Route path="/settings" component={Settings} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/staff-schedule/:id" component={StaffScheduleDetail} />
      <Route path="/staff-schedule" component={StaffSchedule} />
      <Route path="/booking" component={ClientBooking} />
      <Route component={NotFound} />
    </Switch>
  );
}

function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // Check for user in localStorage on initial load
    const storedUser = localStorage.getItem('user');
    console.log('useAuth useEffect - checking localStorage for user');
    console.log('Stored user data:', storedUser);
    
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        console.log('Parsed user data:', userData);
        
        // Fetch fresh user data from database to ensure we have latest profile picture
        fetchFreshUserData(userData.id).then((freshUserData) => {
          if (freshUserData) {
            console.log('Using fresh user data from database:', freshUserData);
            setUser(freshUserData);
            setIsAuthenticated(true);
            // Update localStorage with fresh data
            localStorage.setItem('user', JSON.stringify(freshUserData));
            console.log('User context set with fresh data');
            
            // Load and apply color preferences immediately after login
            loadAndApplyColorPreferences(freshUserData.id);
          } else {
            // Fallback to localStorage data if API fails
            console.log('API failed, falling back to localStorage data');
            setUser(userData);
            setIsAuthenticated(true);
            console.log('User context set from localStorage fallback');
            
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
  }, []);

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
      console.log('Fresh user data fetched successfully');
      return freshUserData;
    } catch (error) {
      console.error('Error fetching fresh user data:', error);
      return null;
    }
  };

  // Function to load and apply color preferences
  const loadAndApplyColorPreferences = async (userId: number) => {
    try {
      console.log(`Loading color preferences for user ${userId} in App.tsx`);
      const response = await fetch(`/api/users/${userId}/color-preferences`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('No saved color preferences found in App.tsx');
          return;
        }
        throw new Error('Failed to load color preferences');
      }
      
      const colorPrefs = await response.json();
      console.log('Loaded color preferences in App.tsx:', colorPrefs);
      
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
      console.error('Failed to load color preferences in App.tsx:', error);
    }
  };

  // Apply theme colors function (copied from settings)
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
    
    // Parse HSL values for hover calculation
    const hslValues = hslColor.split(' ');
    const h = parseInt(hslValues[0]);
    const s = parseInt(hslValues[1]);
    const l = parseInt(hslValues[2]);
    
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
    
    // Apply dark/light mode styling with DOM manipulation
    if (isDark) {
      root.classList.add('dark');
      // Force dark mode background and text colors
      document.body.style.setProperty('background-color', 'hsl(240 10% 3.9%)', 'important');
      document.body.style.setProperty('color', 'hsl(0 0% 98%)', 'important');
      
      // Apply to all main containers and override any white backgrounds
      setTimeout(() => {
        const containers = document.querySelectorAll('main, .main-content, .page-container, #root > div, .flex, [style*="background"], [style*="white"]');
        containers.forEach(container => {
          if (container instanceof HTMLElement) {
            container.style.setProperty('background-color', 'hsl(240 10% 3.9%)', 'important');
            container.style.setProperty('color', 'hsl(0 0% 98%)', 'important');
          }
        });
        
        // Force all text elements to use dark mode colors
        const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, label, button, a, li, td, th, text');
        textElements.forEach(element => {
          if (element instanceof HTMLElement) {
            element.style.setProperty('color', 'hsl(0 0% 98%)', 'important');
          }
        });
        
        // Force the root div to have dark background
        const rootDiv = document.querySelector('#root > div');
        if (rootDiv instanceof HTMLElement) {
          rootDiv.style.setProperty('background-color', 'hsl(240 10% 3.9%)', 'important');
        }
      }, 100);
    } else {
      root.classList.remove('dark');
      // Force light mode background and text colors
      document.body.style.setProperty('background-color', 'hsl(0 0% 100%)', 'important');
      document.body.style.setProperty('color', 'hsl(222.2 84% 4.9%)', 'important');
      
      // Apply to all main containers
      setTimeout(() => {
        const containers = document.querySelectorAll('main, .main-content, .page-container, #root > div, .flex, [style*="background"]');
        containers.forEach(container => {
          if (container instanceof HTMLElement) {
            container.style.setProperty('background-color', 'hsl(0 0% 100%)', 'important');
            container.style.setProperty('color', 'hsl(222.2 84% 4.9%)', 'important');
          }
        });
        
        // Force all text elements to use light mode colors
        const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, label, button, a, li, td, th, text');
        textElements.forEach(element => {
          if (element instanceof HTMLElement) {
            element.style.setProperty('color', 'hsl(222.2 84% 4.9%)', 'important');
          }
        });
        
        // Force the root div to have light background
        const rootDiv = document.querySelector('#root > div');
        if (rootDiv instanceof HTMLElement) {
          rootDiv.style.setProperty('background-color', 'hsl(0 0% 100%)', 'important');
        }
      }, 100);
    }
  };

  // Apply text colors function (copied from settings)
  const applyTextColors = (primaryTextColor: string, secondaryTextColor: string) => {
    const root = document.documentElement;
    root.style.setProperty('--text-primary', primaryTextColor);
    root.style.setProperty('--text-secondary', secondaryTextColor);
  };

  const login = (userData: User) => {
    console.log("Login called with:", userData);
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Load and apply color preferences after login
    loadAndApplyColorPreferences(userData.id);
  };

  const updateUser = (updatedUserData: Partial<User>) => {
    console.log('updateUser called with:', updatedUserData);
    console.log('Current user before update:', user);
    
    if (user) {
      const newUser = { ...user, ...updatedUserData };
      console.log('New user data after merge:', newUser);
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      console.log('User context and localStorage updated');
    } else {
      console.error('Cannot update user - current user is null');
    }
  };

  const logout = () => {
    console.log("Logout function called");
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    console.log("About to redirect to login");
    // Force redirect to login page
    window.location.replace('/login');
  };

  return { user, isAuthenticated, login, logout, updateUser };
}

function App() {
  const auth = useAuth();

  // Simple cleanup on app start
  React.useEffect(() => {
    // Clear any achievement-related localStorage
    try {
      localStorage.removeItem("easterEggs");
    } catch (e) {
      // Ignore errors
    }
  }, []);

  return (
    <AuthContext.Provider value={auth}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SidebarProvider>
            <Router />
            <Toaster />
          </SidebarProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

export default App;
