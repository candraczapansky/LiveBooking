import React, { useContext } from "react";
import { AuthContext } from "@/contexts/AuthProvider";
import StatsOverview from "@/components/dashboard/stats-overview";
import AppointmentsTable from "@/components/dashboard/appointments-table";
import QuickActions from "@/components/dashboard/quick-actions";
import RecentNotifications from "@/components/dashboard/notifications";
import { useDocumentTitle } from "@/hooks/use-document-title";

const Dashboard = () => {
  useDocumentTitle("Dashboard | Glo Head Spa");
  const { user } = useContext(AuthContext);

  return (
    <div className="w-full">
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
  );
};

export default Dashboard;