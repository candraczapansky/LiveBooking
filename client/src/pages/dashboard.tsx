import { useContext, useState, useEffect } from "react";
import { AuthContext } from "@/App";
import { SidebarController } from "@/components/layout/sidebar";
import { useSidebar } from "@/contexts/SidebarContext";
import Header from "@/components/layout/header";
import StatsOverview from "@/components/dashboard/stats-overview";
import AppointmentsTable from "@/components/dashboard/appointments-table";
import QuickActions from "@/components/dashboard/quick-actions";
import RecentNotifications from "@/components/dashboard/notifications";
import { useDocumentTitle } from "@/hooks/use-document-title";

const Dashboard = () => {
  useDocumentTitle("Dashboard | BeautyBook");
  const { user } = useContext(AuthContext);
  const { isOpen: sidebarOpen } = useSidebar();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      console.log('Dashboard mobile detection:', mobile, 'width:', window.innerWidth);
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  console.log('Dashboard render - isMobile:', isMobile, 'width:', window.innerWidth);
  
  // Mobile layout - simplified for debugging
  if (isMobile) {
    console.log('Rendering mobile layout');
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '0', margin: '0' }}>
        <Header />
        
        <div style={{ padding: '12px', backgroundColor: '#f9fafb' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
            Mobile Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!
          </p>
          
          <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
              Quick Stats
            </h2>
            <p style={{ color: '#6b7280' }}>Mobile dashboard content loading...</p>
          </div>
          
          <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
              Recent Activity
            </h2>
            <p style={{ color: '#6b7280' }}>Recent appointments and notifications...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Desktop layout
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="hidden lg:block">
        <SidebarController />
      </div>
      
      <div className={`min-h-screen flex flex-col transition-all duration-300 ${
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
      }`}>
        <Header />
        
        <main className="flex-1 bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 md:p-6 pb-4 sm:pb-6 overflow-x-hidden">
          <div className="w-full max-w-none sm:max-w-7xl mx-auto px-0 sm:px-4">
            {/* Page Heading */}
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Welcome back{user?.firstName ? `, ${user.firstName}` : ""}! Here's what's happening with your business today.
              </p>
            </div>
            
            {/* Stats Overview */}
            <div className="mb-6">
              <StatsOverview />
            </div>
            
            {/* Dashboard Content */}
            <div className="space-y-4 sm:space-y-6 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6">
              {/* Appointments Table */}
              <div className="lg:col-span-2 w-full min-w-0">
                <AppointmentsTable />
              </div>
              
              {/* Quick Actions & Notifications */}
              <div className="space-y-4 sm:space-y-6 w-full min-w-0">
                <QuickActions />
                <RecentNotifications />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
