import React, { Suspense, lazy } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/contexts/AuthProvider";
import { BusinessSettingsProvider } from "@/contexts/BusinessSettingsContext";
import PersistentMobileMenu from "@/components/layout/persistent-mobile-menu";

// Lazy load components for better performance
const NotFound = lazy(() => import("@/pages/not-found"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Login = lazy(() => import("@/pages/login"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const ForgotPasswordSMS = lazy(() => import("@/pages/forgot-password-sms"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const Services = lazy(() => import("@/pages/services"));
const Clients = lazy(() => import("@/pages/clients"));
const ClientsImport = lazy(() => import("@/pages/clients-import"));
const Staff = lazy(() => import("@/pages/staff-simple"));
const Rooms = lazy(() => import("@/pages/rooms"));
const Devices = lazy(() => import("@/pages/devices"));
const Appointments = lazy(() => import("@/pages/appointments"));
const Memberships = lazy(() => import("@/pages/memberships"));
const Reports = lazy(() => import("@/pages/reports"));
const Marketing = lazy(() => import("@/pages/marketing"));
const Automations = lazy(() => import("@/pages/automations"));
const NoteTemplates = lazy(() => import("@/pages/note-templates"));
const Settings = lazy(() => import("@/pages/settings"));
const Schedule = lazy(() => import("@/pages/schedule"));
const StaffSchedule = lazy(() => import("@/pages/staff-schedule"));
const StaffScheduleDetail = lazy(() => import("@/pages/staff-schedule-detail"));
const ClientBooking = lazy(() => import("@/pages/client-booking"));
const PointOfSale = lazy(() => import("@/pages/pos"));
const Products = lazy(() => import("@/pages/products"));
const EmailTest = lazy(() => import("@/pages/email-test"));
const GiftCertificatesPage = lazy(() => import("@/pages/gift-certificates"));
const PhonePage = lazy(() => import("@/pages/phone"));
const FormsPage = lazy(() => import("@/pages/forms"));
const FormDisplay = lazy(() => import("@/pages/form-display"));
const AIMessagingPage = lazy(() => import("@/pages/ai-messaging"));
const PayrollPage = lazy(() => import("@/pages/payroll"));

// Loading component for lazy-loaded routes
const PageLoading = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400">Loading page...</p>
    </div>
  </div>
);

function Router() {
  const { isAuthenticated, loading } = useAuth();

  // Show loading indicator while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Public routes that don't require authentication
  if (!isAuthenticated) {
    return (
      <Suspense fallback={<PageLoading />}>
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
      </Suspense>
    );
  }

  // Protected routes that require authentication
  return (
    <Suspense fallback={<PageLoading />}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/services" component={Services} />
        <Route path="/clients" component={Clients} />
        <Route path="/clients/:clientId" component={Clients} />
        <Route path="/clients-import" component={ClientsImport} />
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
        <Route path="/note-templates" component={NoteTemplates} />
        <Route path="/phone" component={PhonePage} />
        <Route path="/forms" component={FormsPage} />
        <Route path="/ai-messaging" component={AIMessagingPage} />
        <Route path="/payroll" component={PayrollPage} />
        <Route path="/email-test" component={EmailTest} />
        <Route path="/settings" component={Settings} />
        <Route path="/schedule" component={Schedule} />
        <Route path="/staff-schedule/:id" component={StaffScheduleDetail} />
        <Route path="/staff-schedule" component={StaffSchedule} />
        <Route path="/booking" component={ClientBooking} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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

  // Check if we're on a public form route
  const isPublicFormRoute = window.location.pathname.match(/^\/forms\/\d+$/);

  // For public form routes, render without AuthProvider to avoid user data fetching
  if (isPublicFormRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoading />}>
            <FormDisplay />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SidebarProvider>
            <BusinessSettingsProvider>
              <Router />
              <Toaster />
              {/* Global Mobile Menu - persists across all navigation */}
              <PersistentMobileMenu />
            </BusinessSettingsProvider>
          </SidebarProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
