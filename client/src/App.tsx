import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/contexts/SidebarContext";

import { useState, useEffect } from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Services from "@/pages/services";
import Clients from "@/pages/clients";
import Staff from "@/pages/staff-simple";
import Rooms from "@/pages/rooms";
import Devices from "@/pages/devices";
import Appointments from "@/pages/appointments";
import Memberships from "@/pages/memberships";
import Reports from "@/pages/reports";
import Marketing from "@/pages/marketing";
import Settings from "@/pages/settings-mobile";
import Schedule from "@/pages/schedule";
import ClientBooking from "@/pages/client-booking";
import PointOfSale from "@/pages/pos";
import Products from "@/pages/products";
import EmailTest from "@/pages/email-test";

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  createdAt?: string;
  stripeCustomerId?: string | null;
};

export type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
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
});

function Router() {
  const { isAuthenticated } = useAuth();

  // Public routes that don't require authentication
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/booking" component={ClientBooking} />
        <Route path="/" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  // Protected routes that require authentication
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/services" component={Services} />
      <Route path="/clients" component={Clients} />
      <Route path="/staff" component={Staff} />
      <Route path="/pos" component={PointOfSale} />
      <Route path="/products" component={Products} />
      <Route path="/rooms" component={Rooms} />
      <Route path="/devices" component={Devices} />
      <Route path="/appointments" component={Appointments} />
      <Route path="/memberships" component={Memberships} />
      <Route path="/reports" component={Reports} />
      <Route path="/marketing" component={Marketing} />
      <Route path="/email-test" component={EmailTest} />
      <Route path="/settings" component={Settings} />
      <Route path="/schedule" component={Schedule} />
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
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAuthenticated(true);
        console.log("Auth initialized from localStorage:", userData);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = (userData: User) => {
    console.log("Login called with:", userData);
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
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

  return { user, isAuthenticated, login, logout };
}

function App() {
  const auth = useAuth();

  // Clear any cached achievement data and toasts on app start
  React.useEffect(() => {
    // Nuclear option - clear ALL localStorage and sessionStorage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.log('Storage clear failed:', e);
    }
    
    // Clear any indexedDB
    if ('indexedDB' in window) {
      indexedDB.databases().then(databases => {
        databases.forEach(db => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      }).catch(console.error);
    }
    
    // Clear service worker cache
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Simple cleanup without complex DOM manipulation
    const cleanup = () => {
      try {
        // Just remove any remaining toasts quietly
        const toasts = document.querySelectorAll('[data-sonner-toast], [data-state="open"]');
        toasts.forEach(toast => {
          if (toast.textContent?.includes('Achievement') || toast.textContent?.includes('Meet the Team')) {
            toast.remove();
          }
        });
      } catch (e) {
        // Ignore errors
      }
    };
    
    // Run cleanup once
    setTimeout(cleanup, 100);
    
    // Clear any existing toast notifications
    const event = new CustomEvent('clear-all-toasts');
    window.dispatchEvent(event);
    
    // Cleanup
    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  return (
    <AuthContext.Provider value={auth}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SidebarProvider>
            <Router />
          </SidebarProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

export default App;
