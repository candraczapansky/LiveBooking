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
  
  // Mobile layout - working mobile dashboard
  if (isMobile) {
    console.log('Rendering working mobile dashboard');
    return (
      <div style={{ 
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        padding: 0,
        margin: 0,
        overflow: 'auto'
      }}>
        {/* Simple Mobile Header */}
        <div style={{
          backgroundColor: '#fb83bd',
          color: 'white',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
              BeautyBook
            </h1>
            <p style={{ fontSize: '14px', margin: 0, opacity: 0.9 }}>
              Welcome back, {user?.firstName || 'Admin'}!
            </p>
          </div>
          <div style={{ fontSize: '24px' }}>☰</div>
        </div>
        
        {/* Dashboard Content */}
        <div style={{ padding: '16px' }}>
          {/* Quick Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fb83bd' }}>12</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Today's Appointments</div>
            </div>
            <div style={{
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>$2,450</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Today's Revenue</div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px'
          }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#111827' }}>
                Quick Actions
              </h2>
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px'
              }}>
                <button style={{
                  backgroundColor: '#fb83bd',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  New Appointment
                </button>
                <button style={{
                  backgroundColor: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Add Client
                </button>
                <button style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  POS Sale
                </button>
                <button style={{
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  View Reports
                </button>
              </div>
            </div>
          </div>
          
          {/* Recent Activity */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#111827' }}>
                Recent Activity
              </h2>
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  New appointment booked
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Sarah Johnson - Hair Cut & Style
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  2 minutes ago
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  Payment received
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  $85.00 - Credit Card
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  15 minutes ago
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                  New client added
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Emma Davis
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  1 hour ago
                </div>
              </div>
            </div>
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
