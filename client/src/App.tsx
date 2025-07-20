import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/contexts/AuthProvider";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import MobileDashboard from "@/pages/mobile-dashboard";
import Login from "@/pages/login";
import ForgotPassword from "@/pages/forgot-password";
import ForgotPasswordSMS from "@/pages/forgot-password-sms";
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
import FormsPage from "@/pages/forms";
import FormDisplay from "@/pages/form-display";

function Router() {
  const { isAuthenticated, user, loading } = useAuth();

  console.log("Router render - isAuthenticated:", isAuthenticated, "user:", user, "loading:", loading);



  // Show loading indicator while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Glo Head Spa...</p>
        </div>
      </div>
    );
  }

  // Public routes that don't require authentication
  if (!isAuthenticated) {
    console.log("Showing public routes (not authenticated)");
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/forgot-password-sms" component={ForgotPasswordSMS} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/booking" component={ClientBooking} />
        <Route path="/forms/:id" component={FormDisplay} />
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
      <Route path="/forms" component={FormsPage} />
      <Route path="/forms/:id" component={FormDisplay} />
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

function App() {
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
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SidebarProvider>
            <Router />
            <Toaster />
          </SidebarProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
