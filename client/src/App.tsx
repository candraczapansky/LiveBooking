import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Services from "@/pages/services";
import Clients from "@/pages/clients";
import Staff from "@/pages/staff";
import Appointments from "@/pages/appointments";
import Memberships from "@/pages/memberships";
import Reports from "@/pages/reports";
import Marketing from "@/pages/marketing";
import Settings from "@/pages/settings";
import ClientBooking from "@/pages/client-booking";

type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
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
  login: () => {},
  logout: () => {},
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
      <Route path="/appointments" component={Appointments} />
      <Route path="/memberships" component={Memberships} />
      <Route path="/reports" component={Reports} />
      <Route path="/marketing" component={Marketing} />
      <Route path="/settings" component={Settings} />
      <Route path="/booking" component={ClientBooking} />
      <Route component={NotFound} />
    </Switch>
  );
}

function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const isAuthenticated = !!user;

  useEffect(() => {
    // Check for user in localStorage on initial load
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return { user, isAuthenticated, login, logout };
}

function App() {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

export default App;
