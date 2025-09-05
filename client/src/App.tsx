import { Suspense, lazy, useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/contexts/AuthProvider";
import { BusinessSettingsProvider } from "@/contexts/BusinessSettingsContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { GlobalErrorBoundary } from "@/components/error-boundary";
import ProtectedRoute from "@/components/permissions/ProtectedRoute";

// Lazy load components
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
const Classes = lazy(() => import("@/pages/classes"));
const Marketing = lazy(() => import("@/pages/marketing"));
const Automations = lazy(() => import("@/pages/automations"));
const NoteTemplates = lazy(() => import("@/pages/note-templates"));
const Settings = lazy(() => import("@/pages/settings"));
const Schedule = lazy(() => import("@/pages/schedule"));
const StaffSchedule = lazy(() => import("@/pages/staff-schedule"));
const StaffScheduleDetail = lazy(() => import("@/pages/staff-schedule-detail-simple"));
const ClientBooking = lazy(() => import("@/pages/client-booking"));
const ClientBookingTest = lazy(() => import("@/pages/appointments"));
const PointOfSale = lazy(() => import("@/pages/pos"));
const Products = lazy(() => import("@/pages/products"));
const EmailTest = lazy(() => import("@/pages/email-test"));
const GiftCertificatesPage = lazy(() => import("@/pages/gift-certificates"));
const PhonePage = lazy(() => import("@/pages/phone"));
const FormsPage = lazy(() => import("@/pages/forms"));
const FormDisplay = lazy(() => import("@/pages/form-display"));
const DocumentsPage = lazy(() => import("@/pages/documents"));
const DocumentDisplay = lazy(() => import("@/pages/document-display"));
const AIMessagingPage = lazy(() => import("@/pages/ai-messaging"));
const PayrollPage = lazy(() => import("@/pages/payroll"));
const Locations = lazy(() => import("@/pages/locations"));
const PermissionsPage = lazy(() => import("@/pages/permissions"));
const TimeClockPage = lazy(() => import("@/pages/time-clock"));
const HelpPage = lazy(() => import("@/pages/help"));
const HelpAppointmentsDetailed = lazy(() => import("@/pages/help/appointments-detailed"));
const HelpClientsDetailed = lazy(() => import("@/pages/help/clients-detailed"));
const HelpPOSDetailed = lazy(() => import("@/pages/help/pos-detailed"));
const HelpProductsDetailed = lazy(() => import("@/pages/help/products-detailed"));
const HelpStaffDetailed = lazy(() => import("@/pages/help/staff-detailed"));
const HelpLocationsDetailed = lazy(() => import("@/pages/help/locations-detailed"));
const HelpReportsDetailed = lazy(() => import("@/pages/help/reports-detailed"));
const HelpMarketingDetailed = lazy(() => import("@/pages/help/marketing-detailed"));
const HelpAutomationsDetailed = lazy(() => import("@/pages/help/automations-detailed"));
const HelpFormsDetailed = lazy(() => import("@/pages/help/forms-detailed"));
const HelpDocumentsDetailed = lazy(() => import("@/pages/help/documents-detailed"));
const HelpPayrollDetailed = lazy(() => import("@/pages/help/payroll-detailed"));
const HelpPermissionsDetailed = lazy(() => import("@/pages/help/permissions-detailed"));
const HelpTimeClockDetailed = lazy(() => import("@/pages/help/time-clock-detailed"));
const HelpSettingsDetailed = lazy(() => import("@/pages/help/settings-detailed"));
const HelpAIMessagingDetailed = lazy(() => import("@/pages/help/ai-messaging-detailed"));
const HelpGiftCertificatesDetailed = lazy(() => import("@/pages/help/gift-certificates-detailed"));
const HelpDevicesDetailed = lazy(() => import("@/pages/help/devices-detailed"));
const HelpClassesDetailed = lazy(() => import("@/pages/help/classes-detailed"));
const HelpRoomsDetailed = lazy(() => import("@/pages/help/rooms-detailed"));
const HelpPhoneDetailed = lazy(() => import("@/pages/help/phone-detailed"));
const HelpNoteTemplatesDetailed = lazy(() => import("@/pages/help/note-templates-detailed"));
const HelpScheduleDetailed = lazy(() => import("@/pages/help/schedule-detailed"));
const HelpStaffScheduleDetailed = lazy(() => import("@/pages/help/staff-schedule-detailed"));
const HelpMembershipsDetailed = lazy(() => import("@/pages/help/memberships-detailed"));
const BookingDesign = lazy(() => import("@/pages/booking-design"));

// Loading component for lazy-loaded routes
const PageLoading = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

function Router() {
  const { isAuthenticated, loading, user } = useAuth();
  const [location, navigate] = useLocation();
  const isClient = isAuthenticated && user?.role === 'client';
  
  // Debug logging for user role
  if (user?.username === 'lupe' || user?.firstName === 'Lupe') {
    console.log('Router: Lupe user data:', {
      username: user.username,
      role: user.role,
      isAuthenticated,
      loading,
      location,
      isClient
    });
  }

  // Force authenticated clients to stay on /booking
  useEffect(() => {
    if (isClient && location !== '/booking') {
      try { navigate('/booking', { replace: true }); } catch {}
    }
  }, [isClient, location, navigate]);

  // Show loading indicator while checking authentication
  if (loading) {
    return <PageLoading />;
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
          <Route path="/documents/:id" component={DocumentDisplay} />
          <Route path="/" component={Login} />
          <Route component={Login} />
        </Switch>
      </Suspense>
    );
  }

  // Restrict authenticated clients to booking only
  if (isClient) {
    return (
      <Suspense fallback={<PageLoading />}>
        <Switch>
          <Route path="/booking" component={ClientBooking} />
          <Route component={() => null} />
        </Switch>
      </Suspense>
    );
  }

  // Protected routes that require authentication
  return (
    <Suspense fallback={<PageLoading />}>
      <PageWrapper>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/booking-test" component={ClientBookingTest} />
          <Route path="/booking-design" component={() => (
            <ProtectedRoute anyPermissions={["view_business_settings", "edit_business_settings"]}>
              <BookingDesign />
            </ProtectedRoute>
          )} />
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
          <Route path="/appointments" component={() => {
            console.log('Appointments route hit!');
            return (
              <ProtectedRoute anyPermissions={[
                'view_calendar',
                'edit_calendar',
                'view_appointments',
                'create_appointments',
                'edit_appointments',
                'update_appointments',
              ]}>
                <Appointments />
              </ProtectedRoute>
            );
          }} />
          <Route path="/classes" component={Classes} />
          <Route path="/memberships" component={Memberships} />
          <Route path="/reports" component={Reports} />
          <Route path="/marketing" component={Marketing} />
          <Route path="/automations" component={Automations} />
          <Route path="/note-templates" component={NoteTemplates} />
          <Route path="/phone" component={PhonePage} />
          <Route path="/forms" component={FormsPage} />
          <Route path="/documents" component={DocumentsPage} />
          <Route path="/ai-messaging" component={AIMessagingPage} />
          <Route path="/payroll" component={PayrollPage} />
          <Route path="/locations" component={Locations} />
          <Route path="/permissions" component={PermissionsPage} />
          <Route path="/time-clock" component={TimeClockPage} />
          <Route path="/email-test" component={EmailTest} />
          <Route path="/settings" component={Settings} />
          <Route path="/schedule" component={Schedule} />
          <Route path="/help/appointments" component={HelpAppointmentsDetailed} />
          <Route path="/help/clients" component={HelpClientsDetailed} />
          <Route path="/help/pos" component={HelpPOSDetailed} />
          <Route path="/help/products" component={HelpProductsDetailed} />
          <Route path="/help/staff" component={HelpStaffDetailed} />
          <Route path="/help/locations" component={HelpLocationsDetailed} />
          <Route path="/help/reports" component={HelpReportsDetailed} />
          <Route path="/help/marketing" component={HelpMarketingDetailed} />
          <Route path="/help/automations" component={HelpAutomationsDetailed} />
          <Route path="/help/forms" component={HelpFormsDetailed} />
          <Route path="/help/documents" component={HelpDocumentsDetailed} />
          <Route path="/help/payroll" component={HelpPayrollDetailed} />
          <Route path="/help/permissions" component={HelpPermissionsDetailed} />
          <Route path="/help/time-clock" component={HelpTimeClockDetailed} />
          <Route path="/help/settings" component={HelpSettingsDetailed} />
          <Route path="/help/ai-messaging" component={HelpAIMessagingDetailed} />
          <Route path="/help/gift-certificates" component={HelpGiftCertificatesDetailed} />
          <Route path="/help/devices" component={HelpDevicesDetailed} />
          <Route path="/help/classes" component={HelpClassesDetailed} />
          <Route path="/help/rooms" component={HelpRoomsDetailed} />
          <Route path="/help/phone" component={HelpPhoneDetailed} />
          <Route path="/help/note-templates" component={HelpNoteTemplatesDetailed} />
          <Route path="/help/schedule" component={HelpScheduleDetailed} />
          <Route path="/help/staff-schedule" component={HelpStaffScheduleDetailed} />
          <Route path="/help/memberships" component={HelpMembershipsDetailed} />
          <Route path="/help" component={HelpPage} />
          <Route path="/staff-schedule/:id" component={StaffScheduleDetail} />
          <Route path="/staff-schedule" component={StaffSchedule} />
          <Route component={NotFound} />
        </Switch>
      </PageWrapper>
    </Suspense>
  );
}

export default function App() {
  const [location] = useLocation();
  // Normalize away any query string for public route detection
  const pathOnly = location.split('?')[0];
  // Check if we're on a public form route
  const isPublicFormRoute = /^\/forms\/\d+$/.test(pathOnly);
  // Public document viewer route (string id like doc_123...)
  const isPublicDocumentRoute = /^\/documents\/[A-Za-z0-9_-]+$/.test(pathOnly);
  // Always treat reset/forgot as standalone public pages (no MainLayout/header)
  const isResetPasswordRoute = location.startsWith('/reset-password');
  const isForgotPasswordRoute = location.startsWith('/forgot-password');
  const isForgotPasswordSmsRoute = location.startsWith('/forgot-password-sms');
  // Treat only /booking as minimal page (no MainLayout/header). Do not include /booking-test
  const isBookingRoute = pathOnly === '/booking';

  if (isResetPasswordRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoading />}>
            <ResetPassword />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (isForgotPasswordRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoading />}>
            <ForgotPassword />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (isForgotPasswordSmsRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoading />}>
            <ForgotPasswordSMS />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Minimal render for booking (no MainLayout/sidebar/header), but with AuthProvider
  if (isBookingRoute) {
    return (
      <GlobalErrorBoundary>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <BusinessSettingsProvider>
                <LocationProvider>
                  <Suspense fallback={<PageLoading />}>
                    <ClientBooking />
                  </Suspense>
                </LocationProvider>
              </BusinessSettingsProvider>
              <Toaster />
            </TooltipProvider>
          </QueryClientProvider>
        </AuthProvider>
      </GlobalErrorBoundary>
    );
  }

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

  // For public document routes, render without AuthProvider
  if (isPublicDocumentRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<PageLoading />}>
            <DocumentDisplay />
          </Suspense>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <BusinessSettingsProvider>
              <LocationProvider>
                <SidebarProvider>
                  <MainLayout>
                    <Router />
                    <Toaster />
                  </MainLayout>
                </SidebarProvider>
              </LocationProvider>
            </BusinessSettingsProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </GlobalErrorBoundary>
  );
}