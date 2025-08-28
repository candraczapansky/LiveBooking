import React, { useState } from "react";
// import Header from "@/components/layout/header"; // Provided by MainLayout
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  DollarSign, 
  Users, 
  Scissors, 
  Calendar, 
  BarChart2,
  Clock,
  ArrowLeft,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import PayrollReport from "./payroll-report";
import { formatPrice } from "@/lib/utils";
import SalesCategoryChart from "@/components/reports/sales-category-chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsCircleChart,
  Pie,
  Cell
} from "recharts";

// Report configuration
const reportCategories = [
  {
    id: "sales",
    title: "Sales Reports",
    description: "Revenue, transactions, and sales performance analytics",
    icon: BarChart2,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    id: "clients",
    title: "Client Reports", 
    description: "Client demographics, retention, and engagement metrics",
    icon: Users,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    id: "appointments",
    title: "Appointment Reports",
    description: "No-shows, cancellations, and appointment performance analytics",
    icon: Calendar,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    id: "services",
    title: "Service Reports",
    description: "Service popularity, pricing, and performance insights",
    icon: Scissors,
    color: "text-primary", 
    bgColor: "bg-primary/10",
  },
  {
    id: "staff",
    title: "Staff Reports",
    description: "Staff performance, productivity, and utilization metrics",
    icon: Users,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    id: "payroll",
    title: "Payroll Reports",
    description: "Staff earnings, commissions, and payroll summaries",
    icon: DollarSign,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    id: "timeclock",
    title: "Time Clock Reports",
    description: "Staff attendance, hours worked, and time tracking",
    icon: Clock,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

// Helper functions
const getReportTitle = (reportId: string) => {
  const report = reportCategories.find(r => r.id === reportId);
  return report?.title || "Report";
};

const getReportDescription = (reportId: string) => {
  const report = reportCategories.find(r => r.id === reportId);
  return report?.description || "View detailed analytics and insights";
};

// Helper function to calculate date range
const getDateRange = (timePeriod: string, customStartDate?: string, customEndDate?: string) => {
  if (timePeriod === "custom" && customStartDate && customEndDate) {
    // Parse YYYY-MM-DD as local dates to avoid UTC shifting the day back
    const [sy, sm, sd] = customStartDate.split('-').map(Number);
    const [ey, em, ed] = customEndDate.split('-').map(Number);
    const startDate = new Date(sy, (sm || 1) - 1, sd || 1, 0, 0, 0, 0);
    const endDate = new Date(ey, (em || 1) - 1, ed || 1, 23, 59, 59, 999);
    return { startDate, endDate };
  }
  
  const now = new Date();
  const startDate = new Date();
  let endDateOverride: Date | null = null;
  
  switch (timePeriod) {
    case "day":
      // Today: start at the beginning of the current day
      startDate.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
      startDate.setHours(0, 0, 0, 0);
      break;
    case "yesterday": {
      // Yesterday: full previous calendar day
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      startDate.setFullYear(y.getFullYear(), y.getMonth(), y.getDate());
      startDate.setHours(0, 0, 0, 0);
      endDateOverride = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
      break;
    }
    case "week":
      // This Week: last 7 full days ending today
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      now.setHours(23, 59, 59, 999);
      break;
    case "month":
      // This Month: start at the first day of the current month
      startDate.setFullYear(now.getFullYear(), now.getMonth(), 1);
      break;
    case "quarter":
      startDate.setMonth(now.getMonth() - 3);
      break;
    case "year":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setMonth(now.getMonth() - 1);
  }
  
  return { startDate, endDate: endDateOverride ?? now };
};

// Landing Page Component
const ReportsLandingPage = ({ onSelectReport }: { onSelectReport: (reportId: string) => void }) => {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Report Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {reportCategories.map((category) => (
          <Card 
            key={category.id}
            className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group min-h-[120px] md:min-h-[160px]"
            onClick={() => onSelectReport(category.id)}
          >
            <CardContent className="p-4 md:p-6">
              <div className="flex items-start justify-between h-full">
                <div className="flex-1">
                  <div className={`inline-flex p-2 md:p-3 rounded-lg ${category.bgColor} mb-3 md:mb-4`}>
                    <category.icon className={`h-5 w-5 md:h-6 md:w-6 ${category.color}`} />
                  </div>
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1 md:mb-2 leading-tight">
                    {category.title}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-3 md:mb-4 line-clamp-2">
                    {category.description}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors flex-shrink-0 ml-2" />
              </div>
              <div className="flex items-center text-xs md:text-sm text-primary group-hover:text-primary/80 transition-colors mt-auto">
                View Report
                <ChevronRight className="h-3 w-3 md:h-4 md:w-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Appointments Report Component
const AppointmentsReport = ({ timePeriod, customStartDate, customEndDate }: { 
  timePeriod: string; 
  customStartDate?: string; 
  customEndDate?: string; 
}) => {
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({ 
    queryKey: ["/api/appointments"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
  const { data: cancelledAppointments = [], isLoading: cancelledLoading } = useQuery({ 
    queryKey: ["/api/cancelled-appointments"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
  const { data: users = [], isLoading: usersLoading } = useQuery({ 
    queryKey: ["/api/users"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
  const { data: staff = [], isLoading: staffLoading } = useQuery({ 
    queryKey: ["/api/staff"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  const { startDate, endDate } = getDateRange(timePeriod, customStartDate, customEndDate);
  const normalizedStart = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0));
  const normalizedEnd = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999));
  
  // Filter appointments by date range
  const periodAppointments = (appointments as any[]).filter((apt: any) => {
    const aptDate = new Date(apt.startTime);
    return aptDate >= normalizedStart && aptDate <= normalizedEnd;
  });

  const periodCancelled = (cancelledAppointments as any[]).filter((apt: any) => {
    const aptDate = new Date(apt.startTime);
    return aptDate >= normalizedStart && aptDate <= normalizedEnd;
  });

  // Calculate metrics
  const totalAppointments = periodAppointments.length;
  const completedAppointments = periodAppointments.filter((apt: any) => apt.status === 'completed').length;
  const noShows = periodAppointments.filter((apt: any) => apt.status === 'no_show').length;
  const cancelledCount = periodCancelled.length;
  const totalRevenue = periodAppointments
    .filter((apt: any) => apt.status === 'completed')
    .reduce((sum: number, apt: any) => sum + (apt.totalAmount || 0), 0);

  const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;
  const noShowRate = totalAppointments > 0 ? (noShows / totalAppointments) * 100 : 0;
  const cancellationRate = totalAppointments > 0 ? (cancelledCount / totalAppointments) * 100 : 0;

  // Get client and staff names
  const getClientName = (clientId: number) => {
    const client = (users as any[]).find((u: any) => u.id === clientId && u.role === 'client');
    return client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.username : 'Unknown';
  };

  const getStaffName = (staffId: number) => {
    const staffMember = (staff as any[]).find((s: any) => s.id === staffId);
    return staffMember ? `${staffMember.user?.firstName || ''} ${staffMember.user?.lastName || ''}`.trim() || staffMember.user?.username : 'Unknown';
  };

  // No-show analysis by client
  const noShowByClient = periodAppointments
    .filter((apt: any) => apt.status === 'no_show')
    .reduce((acc: any, apt: any) => {
      const clientName = getClientName(apt.clientId);
      acc[clientName] = (acc[clientName] || 0) + 1;
      return acc;
    }, {});

  const topNoShowClients = Object.entries(noShowByClient)
    .map(([name, count]) => ({ name, count: Number(count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // No-show analysis by staff
  const noShowByStaff = periodAppointments
    .filter((apt: any) => apt.status === 'no_show')
    .reduce((acc: any, apt: any) => {
      const staffName = getStaffName(apt.staffId);
      acc[staffName] = (acc[staffName] || 0) + 1;
      return acc;
    }, {});

  const topNoShowStaff = Object.entries(noShowByStaff)
    .map(([name, count]) => ({ name, count: Number(count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const isLoading = appointmentsLoading || cancelledLoading || usersLoading || staffLoading;

  return (
    <div className="space-y-6">
      {isLoading && (
        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Refreshing appointment data... This page updates automatically every 30 seconds.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary/10 rounded-md p-2 md:p-3">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Appointments
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {totalAppointments}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-2 md:p-3">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Completed
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {completedAppointments}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-md p-2 md:p-3">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    No-Shows
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {noShows}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-md p-2 md:p-3">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-yellow-600" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Cancelled
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {cancelledCount}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-2 md:p-3">
                <BarChart2 className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Completion Rate
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {Math.round(completionRate)}%
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-md p-2 md:p-3">
                <BarChart2 className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    No-Show Rate
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {Math.round(noShowRate)}%
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-md p-2 md:p-3">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-yellow-600" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Revenue Generated
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {formatPrice(totalRevenue)}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>No-Shows by Client</CardTitle>
            <CardDescription>Clients with highest no-show rates</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {topNoShowClients.length > 0 ? (
                <BarChart data={topNoShowClients} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" name="No-Shows" />
                </BarChart>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  No no-show data available for the selected time period
                </div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>No-Shows by Staff</CardTitle>
            <CardDescription>Staff members with highest no-show rates</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {topNoShowStaff.length > 0 ? (
                <BarChart data={topNoShowStaff} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f59e0b" name="No-Shows" />
                </BarChart>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  No no-show data available for the selected time period
                </div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment Status Distribution</CardTitle>
          <CardDescription>Breakdown of appointment outcomes</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsCircleChart>
              <Pie
                data={[
                  { name: 'Completed', value: completedAppointments, color: '#10b981' },
                  { name: 'No-Show', value: noShows, color: '#ef4444' },
                  { name: 'Cancelled', value: cancelledCount, color: '#f59e0b' },
                  { name: 'Other', value: totalAppointments - completedAppointments - noShows - cancelledCount, color: '#6b7280' }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill="#10b981" />
                <Cell fill="#ef4444" />
                <Cell fill="#f59e0b" />
                <Cell fill="#6b7280" />
              </Pie>
              <Tooltip />
            </RechartsCircleChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Appointments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Appointments</CardTitle>
          <CardDescription>Latest appointments with status and revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Staff
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {periodAppointments.slice(0, 20).map((apt: any, index: number) => (
                  <tr key={apt.id} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {new Date(apt.startTime).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {getClientName(apt.clientId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {getStaffName(apt.staffId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        apt.status === 'completed' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : apt.status === 'no_show'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          : apt.status === 'cancelled'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                      }`}>
                        {apt.status === 'completed' ? 'Completed' : 
                         apt.status === 'no_show' ? 'No-Show' : 
                         apt.status === 'cancelled' ? 'Cancelled' : apt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {apt.status === 'completed' ? formatPrice(apt.totalAmount || 0) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {periodAppointments.length > 20 && (
              <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Showing first 20 of {periodAppointments.length} appointments
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Specific Report View Component
const SpecificReportView = ({ 
  reportType, 
  timePeriod, 
  customStartDate, 
  customEndDate,
  selectedLocation
}: { 
  reportType: string; 
  timePeriod: string; 
  customStartDate: string; 
  customEndDate: string; 
  selectedLocation: string; 
}) => {
  // Generate reports based on type
  switch (reportType) {
    case "sales":
      return <SalesReport timePeriod={timePeriod} customStartDate={customStartDate} customEndDate={customEndDate} selectedLocation={selectedLocation} />;
    case "clients": 
      return <ClientsReport timePeriod={timePeriod} customStartDate={customStartDate} customEndDate={customEndDate} />;
    case "appointments":
      return <AppointmentsReport timePeriod={timePeriod} customStartDate={customStartDate} customEndDate={customEndDate} />;
    case "services":
      return <ServicesReport timePeriod={timePeriod} customStartDate={customStartDate} customEndDate={customEndDate} />;
    case "staff":
      return <StaffReport timePeriod={timePeriod} customStartDate={customStartDate} customEndDate={customEndDate} />;
    case "payroll":
      return <PayrollReport timePeriod={timePeriod} customStartDate={customStartDate} customEndDate={customEndDate} />;
    case "timeclock":
      return <TimeClockReport timePeriod={timePeriod} customStartDate={customStartDate} customEndDate={customEndDate} />;
    default:
      return <div>Report not found</div>;
  }
};

// Individual Report Components

const SalesReport = ({ timePeriod, customStartDate, customEndDate, selectedLocation }: { 
  timePeriod: string; 
  customStartDate?: string; 
  customEndDate?: string; 
  selectedLocation?: string; 
}) => {
  const { data: salesHistory = [], isLoading, refetch } = useQuery({ 
    queryKey: ["/api/sales-history"],
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Always consider data stale for real-time updates
  });
  const { data: services = [], isLoading: servicesLoading } = useQuery({ 
    queryKey: ["/api/services"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
  const { data: products = [], isLoading: productsLoading } = useQuery({ 
    queryKey: ["/api/products"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
  // Payments fallback for very recent transactions (in case sales_history has not been written yet)
  const { data: payments = [] } = useQuery({
    queryKey: ["/api/payments"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
  // Fetch appointments (optionally filtered by location) to support location-based sales filtering
  const appointmentsUrl = selectedLocation && selectedLocation !== 'all'
    ? `/api/appointments?locationId=${selectedLocation}`
    : '/api/appointments';
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: [appointmentsUrl],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
  
  const { startDate, endDate } = getDateRange(timePeriod, customStartDate, customEndDate);
  const normalizedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
  const normalizedEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
  const isSingleDay = timePeriod === 'day' || timePeriod === 'yesterday';
  const targetUtcDay = new Date(Date.UTC(normalizedStart.getFullYear(), normalizedStart.getMonth(), normalizedStart.getDate())).toISOString().slice(0, 10);
  
  // Filter sales by date range, completed status, and location
  const filteredSales = (salesHistory as any[]).filter((sale: any) => {
    const saleDate = new Date(sale.transactionDate || sale.transaction_date);
    const dateFilterPrimary = saleDate >= normalizedStart && saleDate <= normalizedEnd;
    // Fallback for single-day views using businessDate (stored as UTC date)
    let dateFilterFallback = true;
    if (isSingleDay) {
      const businessDateRaw = sale.businessDate || sale.business_date;
      const businessDateStr = businessDateRaw instanceof Date
        ? businessDateRaw.toISOString().slice(0, 10)
        : typeof businessDateRaw === 'string'
          ? businessDateRaw.slice(0, 10)
          : '';
      dateFilterFallback = businessDateStr === targetUtcDay;
    }
    const dateFilter = dateFilterPrimary || dateFilterFallback;
    const statusFilter = (sale.paymentStatus === "completed" || sale.payment_status === "completed");
    
    // Location filtering - for appointment sales, check the appointment's location
    let locationFilter = true;
    if (selectedLocation && selectedLocation !== 'all') {
      if (sale.transactionType === 'appointment' && sale.appointmentId) {
        const apt = (appointments as any[]).find((a: any) => a.id === sale.appointmentId);
        locationFilter = !!apt && String(apt.locationId) === String(selectedLocation);
      } else if (sale.transactionType === 'pos_sale') {
        // Exclude POS sales when a specific location is selected (no location mapping available)
        locationFilter = false;
      } else {
        // Exclude any other non-appointment sales (e.g., memberships) when filtering by location
        locationFilter = false;
      }
    }
    
    return dateFilter && statusFilter && locationFilter;
  });
  
  // Build fallback sales-like records from payments to capture very recent activity
  const paymentFallbackRecords = (() => {
    try {
      const byPaymentId = new Set(
        (salesHistory as any[])
          .map((s: any) => s.paymentId || s.payment_id)
          .filter(Boolean)
      );

      return (payments as any[])
        .filter((p: any) => {
          const statusOk = (p.status || '').toLowerCase() === 'completed';
          const d = new Date(p.paymentDate || p.createdAt || p.processedAt || Date.now());
          const inRange = d >= normalizedStart && d <= normalizedEnd;
          if (!statusOk || !inRange) return false;
          if (selectedLocation && selectedLocation !== 'all') {
            const apt = (appointments as any[]).find((a: any) => a.id === p.appointmentId);
            if (!apt || String(apt.locationId) !== String(selectedLocation)) return false;
          }
          // Avoid duplicates when a sales_history already exists for this payment
          const pid = p.id || p.paymentId;
          if (pid && byPaymentId.has(pid)) return false;
          return true;
        })
        .map((p: any) => ({
          transactionType: 'appointment',
          transactionDate: new Date(p.paymentDate || p.createdAt || p.processedAt || Date.now()),
          paymentId: p.id || p.paymentId,
          totalAmount: p.totalAmount ?? p.amount ?? 0,
          taxAmount: p.taxAmount ?? 0,
          tipAmount: p.tipAmount ?? 0,
          discountAmount: p.discountAmount ?? 0,
          paymentMethod: p.method || 'card',
          paymentStatus: p.status || 'completed',
          appointmentId: p.appointmentId || null,
          // Minimal fields for table rendering
          clientName: '',
          staffName: '',
        }));
    } catch {
      return [] as any[];
    }
  })();

  const combinedSales = [...filteredSales, ...paymentFallbackRecords];

  const totalRevenue = combinedSales.reduce((sum: number, sale: any) => sum + (sale.totalAmount || sale.total_amount || 0), 0);
  const totalTransactions = combinedSales.length;
  const totalTax = combinedSales.reduce((sum: number, sale: any) => sum + (sale.taxAmount || sale.tax_amount || 0), 0);
  const totalTips = combinedSales.reduce((sum: number, sale: any) => sum + (sale.tipAmount || sale.tip_amount || 0), 0);
  const totalDiscounts = combinedSales.reduce((sum: number, sale: any) => sum + (sale.discountAmount || sale.discount_amount || 0), 0);

  // Calculate sales by category
  const salesByCategory = () => {
    const categoryMap = new Map();
    
    filteredSales.forEach((sale: any) => {
      if (sale.transactionType === 'appointment' && sale.serviceNames) {
        try {
          const serviceNames = JSON.parse(sale.serviceNames);
          serviceNames.forEach((serviceName: string) => {
            const service = (services as any[]).find(s => s.name === serviceName);
            const category = service?.category || 'Other';
            const amount = (sale.serviceTotalAmount || sale.totalAmount || 0) / serviceNames.length;
            
            if (categoryMap.has(category)) {
              categoryMap.set(category, categoryMap.get(category) + amount);
            } else {
              categoryMap.set(category, amount);
            }
          });
        } catch (e) {
          // Handle non-JSON service names
          const category = 'Other';
          const amount = sale.serviceTotalAmount || sale.totalAmount || 0;
          if (categoryMap.has(category)) {
            categoryMap.set(category, categoryMap.get(category) + amount);
          } else {
            categoryMap.set(category, amount);
          }
        }
      } else if (sale.transactionType === 'pos_sale' && sale.productNames) {
        try {
          const productNames = JSON.parse(sale.productNames);
          productNames.forEach((productName: string) => {
            const product = (products as any[]).find(p => p.name === productName);
            const category = product?.category || 'Retail';
            const amount = (sale.productTotalAmount || sale.totalAmount || 0) / productNames.length;
            
            if (categoryMap.has(category)) {
              categoryMap.set(category, categoryMap.get(category) + amount);
            } else {
              categoryMap.set(category, amount);
            }
          });
        } catch (e) {
          const category = 'Retail';
          const amount = sale.productTotalAmount || sale.totalAmount || 0;
          if (categoryMap.has(category)) {
            categoryMap.set(category, categoryMap.get(category) + amount);
          } else {
            categoryMap.set(category, amount);
          }
        }
      }
    });
    
    const total = Number(totalRevenue) || 0;
    return Array.from(categoryMap.entries()).map(([category, amount]) => {
      const amt = Number(amount) || 0;
      const pct = total > 0 ? (amt / total) * 100 : 0;
      return {
        category,
        amount: amt,
        percentage: pct,
      };
    }).sort((a, b) => b.amount - a.amount);
  };

  // Calculate daily sales trend
  const dailySalesTrend = () => {
    const dailyMap = new Map();
    
    filteredSales.forEach((sale: any) => {
      const date = new Date(sale.transactionDate || sale.transaction_date);
      const dateKey = date.toISOString().split('T')[0];
      const amount = sale.totalAmount || sale.total_amount || 0;
      
      if (dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, dailyMap.get(dateKey) + amount);
      } else {
        dailyMap.set(dateKey, amount);
      }
    });
    
    return Array.from(dailyMap.entries())
      .map(([date, amount]) => ({
        date,
        amount: Number(amount),
        dayOfWeek: new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const categoryData = salesByCategory();
  const trendData = dailySalesTrend();

  return (
    <div className="space-y-4 md:space-y-6">
      {isLoading && (
        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Refreshing sales data... This page updates automatically every 30 seconds.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary/10 rounded-md p-2 md:p-3">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Revenue
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {formatPrice(totalRevenue)}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary/10 rounded-md p-2 md:p-3">
                <BarChart2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Transactions
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {totalTransactions}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary/10 rounded-md p-2 md:p-3">
                <BarChart2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Avg Transaction
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {formatPrice(totalTransactions > 0 ? totalRevenue / totalTransactions : 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary/10 rounded-md p-2 md:p-3">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Tax Collected
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {formatPrice(totalTax)}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-2 md:p-3">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Tips
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {formatPrice(totalTips)}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-md p-2 md:p-3">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-yellow-600" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Discounts
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {formatPrice(totalDiscounts)}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-2 md:p-3">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Net Revenue
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {formatPrice(totalRevenue - totalDiscounts)}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
            <CardDescription>Revenue breakdown by service and product categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {categoryData.length > 0 ? (
                <RechartsCircleChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percentage }) => {
                      const pct = Number.isFinite(percentage) ? percentage : 0;
                      return `${category}: ${pct.toFixed(1)}%`;
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatPrice(Number(value))} />
                </RechartsCircleChart>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  No category data available for the selected time period
                </div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Sales Trend</CardTitle>
            <CardDescription>Revenue trend over the selected time period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {trendData.length > 0 ? (
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dayOfWeek" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatPrice(Number(value))} />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Revenue"
                  />
                </LineChart>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  No trend data available for the selected time period
                </div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sales by Category Chart */}
      <SalesCategoryChart 
        timePeriod={timePeriod}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        selectedLocation={selectedLocation}
      />

      {/* Detailed Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Breakdown</CardTitle>
          <CardDescription>Detailed view of all transactions in the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Staff
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tax
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tips
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Method
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {combinedSales.slice(0, 20).map((sale: any, index: number) => (
                  <tr key={sale.id} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {new Date(sale.transactionDate || sale.transaction_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        sale.transactionType === 'appointment' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                          : sale.transactionType === 'pos_sale'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                      }`}>
                        {sale.transactionType === 'appointment' ? 'Service' : 
                         sale.transactionType === 'pos_sale' ? 'Retail' : sale.transactionType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {sale.clientName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {sale.staffName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatPrice(sale.totalAmount || sale.total_amount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatPrice(sale.taxAmount || sale.tax_amount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatPrice(sale.tipAmount || sale.tip_amount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {sale.paymentMethod || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredSales.length > 20 && (
              <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Showing first 20 of {filteredSales.length} transactions
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ClientsReport = ({ timePeriod, customStartDate, customEndDate }: { 
  timePeriod: string; 
  customStartDate?: string; 
  customEndDate?: string; 
}) => {
  const { data: users = [], isLoading: usersLoading } = useQuery({ 
    queryKey: ["/api/users"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({ 
    queryKey: ["/api/appointments"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
  const { data: salesHistory = [], isLoading: salesLoading } = useQuery({ 
    queryKey: ["/api/sales-history"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  const { startDate, endDate } = getDateRange(timePeriod, customStartDate, customEndDate);
  const normalizedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
  const normalizedEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
  
  const clients = (users as any[]).filter((user: any) => user.role === "client");
  
  // Calculate client analytics
  const calculateClientAnalytics = () => {
    const clientMap = new Map();
    
    // Initialize client data
    clients.forEach((client: any) => {
      clientMap.set(client.id, {
        id: client.id,
        name: `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.username,
        email: client.email,
        phone: client.phone,
        firstVisit: null,
        lastVisit: null,
        totalVisits: 0,
        totalSpent: 0,
        averageTicket: 0,
        isNew: false,
        isReturning: false,
        retentionStatus: 'unknown'
      });
    });

    // Analyze appointments
    const periodAppointments = (appointments as any[]).filter((apt: any) => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= startDate && aptDate <= endDate && apt.status === 'completed';
    });

    periodAppointments.forEach((apt: any) => {
      const clientData = clientMap.get(apt.clientId);
      if (clientData) {
        clientData.totalVisits++;
        const visitDate = new Date(apt.startTime);
        
        if (!clientData.firstVisit || visitDate < new Date(clientData.firstVisit)) {
          clientData.firstVisit = visitDate;
        }
        if (!clientData.lastVisit || visitDate > new Date(clientData.lastVisit)) {
          clientData.lastVisit = visitDate;
        }
      }
    });

    // Analyze sales history
    const periodSales = (salesHistory as any[]).filter((sale: any) => {
      const saleDate = new Date(sale.transactionDate || sale.transaction_date);
      return saleDate >= startDate && saleDate <= endDate && 
             sale.paymentStatus === 'completed' && sale.clientId;
    });

    periodSales.forEach((sale: any) => {
      const clientData = clientMap.get(sale.clientId);
      if (clientData) {
        clientData.totalSpent += sale.totalAmount || sale.total_amount || 0;
      }
    });

    // Calculate averages and classify clients
    const clientAnalytics = Array.from(clientMap.values()).map((client: any) => {
      client.averageTicket = client.totalVisits > 0 ? client.totalSpent / client.totalVisits : 0;
      
      // Classify as new vs returning
      const isNewInPeriod = client.firstVisit && new Date(client.firstVisit) >= startDate;
      client.isNew = isNewInPeriod;
      client.isReturning = !isNewInPeriod && client.totalVisits > 0;
      
      // Calculate retention status
      if (client.totalVisits === 0) {
        client.retentionStatus = 'no_visits';
      } else if (client.totalVisits === 1) {
        client.retentionStatus = 'one_time';
      } else if (client.totalVisits >= 2 && client.totalVisits <= 5) {
        client.retentionStatus = 'regular';
      } else {
        client.retentionStatus = 'loyal';
      }
      
      return client;
    });

    return clientAnalytics;
  };

  const clientAnalytics = calculateClientAnalytics();
  
  // Calculate summary metrics
  const totalClients = clientAnalytics.length;
  const newClients = clientAnalytics.filter((c: any) => c.isNew).length;
  const returningClients = clientAnalytics.filter((c: any) => c.isReturning).length;
  const totalRevenue = clientAnalytics.reduce((sum: number, c: any) => sum + c.totalSpent, 0);
  const averageSpend = totalClients > 0 ? totalRevenue / totalClients : 0;
  
  // Retention rate calculation
  const clientsWithVisits = clientAnalytics.filter((c: any) => c.totalVisits > 0);
  const retentionRate = clientsWithVisits.length > 0 ? 
    (returningClients / clientsWithVisits.length) * 100 : 0;

  // Big spenders (top 20% by total spent)
  const sortedBySpend = [...clientAnalytics].sort((a: any, b: any) => b.totalSpent - a.totalSpent);
  const bigSpendersCount = Math.ceil(totalClients * 0.2);
  const bigSpenders = sortedBySpend.slice(0, bigSpendersCount);

  // Client lifetime value distribution
  const ltvDistribution = [
    { range: '$0-50', count: 0, percentage: 0 },
    { range: '$51-100', count: 0, percentage: 0 },
    { range: '$101-250', count: 0, percentage: 0 },
    { range: '$251-500', count: 0, percentage: 0 },
    { range: '$501+', count: 0, percentage: 0 }
  ];

  clientAnalytics.forEach((client: any) => {
    if (client.totalSpent <= 50) ltvDistribution[0].count++;
    else if (client.totalSpent <= 100) ltvDistribution[1].count++;
    else if (client.totalSpent <= 250) ltvDistribution[2].count++;
    else if (client.totalSpent <= 500) ltvDistribution[3].count++;
    else ltvDistribution[4].count++;
  });

  ltvDistribution.forEach(range => {
    range.percentage = totalClients > 0 ? (range.count / totalClients) * 100 : 0;
  });

  const isLoading = usersLoading || appointmentsLoading || salesLoading;

  return (
    <div className="space-y-6">
      {isLoading && (
        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Refreshing client data... This page updates automatically every 30 seconds.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary/10 rounded-md p-2 md:p-3">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Clients
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {totalClients}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-2 md:p-3">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    New Clients
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {newClients}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-2 md:p-3">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Returning Clients
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {returningClients}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-2 md:p-3">
                <BarChart2 className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Retention Rate
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {Math.round(retentionRate)}%
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-md p-2 md:p-3">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-yellow-600" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Revenue
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {formatPrice(totalRevenue)}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-md p-2 md:p-3">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-indigo-600" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Avg Client Spend
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {formatPrice(averageSpend)}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-md p-2 md:p-3">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
              </div>
              <div className="ml-3 md:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Big Spenders
                  </dt>
                  <dd className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {bigSpendersCount}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Lifetime Value Distribution</CardTitle>
            <CardDescription>Distribution of client spending in the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {ltvDistribution.some(range => range.count > 0) ? (
                <BarChart data={ltvDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [value, name === 'count' ? 'Clients' : 'Percentage']} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" name="Clients" />
                </BarChart>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  No client spending data available for the selected time period
                </div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Retention Analysis</CardTitle>
            <CardDescription>Breakdown of client retention status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {clientAnalytics.length > 0 ? (
                <RechartsCircleChart>
                  <Pie
                    data={[
                      { name: 'No Visits', value: clientAnalytics.filter((c: any) => c.retentionStatus === 'no_visits').length },
                      { name: 'One Time', value: clientAnalytics.filter((c: any) => c.retentionStatus === 'one_time').length },
                      { name: 'Regular', value: clientAnalytics.filter((c: any) => c.retentionStatus === 'regular').length },
                      { name: 'Loyal', value: clientAnalytics.filter((c: any) => c.retentionStatus === 'loyal').length }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#ef4444" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#3b82f6" />
                    <Cell fill="#10b981" />
                  </Pie>
                  <Tooltip />
                </RechartsCircleChart>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  No client data available for the selected time period
                </div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Big Spenders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Big Spenders (Top 20%)</CardTitle>
          <CardDescription>Clients with highest lifetime value in the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Client Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Visits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Avg Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {bigSpenders.map((client: any, index: number) => (
                  <tr key={client.id} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {client.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {client.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {client.totalVisits}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatPrice(client.totalSpent)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatPrice(client.averageTicket)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        client.isNew 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : client.isReturning
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                      }`}>
                        {client.isNew ? 'New' : client.isReturning ? 'Returning' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* All Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>Complete client list with analytics for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Client Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Visits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Avg Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    First Visit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Visit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {clientAnalytics.slice(0, 50).map((client: any, index: number) => (
                  <tr key={client.id} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {client.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {client.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {client.totalVisits}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatPrice(client.totalSpent)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatPrice(client.averageTicket)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {client.firstVisit ? new Date(client.firstVisit).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {client.lastVisit ? new Date(client.lastVisit).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        client.isNew 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : client.isReturning
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                      }`}>
                        {client.isNew ? 'New' : client.isReturning ? 'Returning' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clientAnalytics.length > 50 && (
              <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Showing first 50 of {clientAnalytics.length} clients
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ServicesReport = ({ timePeriod, customStartDate, customEndDate }: { 
  timePeriod: string; 
  customStartDate?: string; 
  customEndDate?: string; 
}) => {
  const { data: services = [], isLoading: servicesLoading } = useQuery({ 
    queryKey: ["/api/services"],
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({ 
    queryKey: ["/api/appointments"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({ 
    queryKey: ["/api/payments"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
  const { data: salesHistory = [], isLoading: salesLoading } = useQuery({ 
    queryKey: ["/api/sales-history"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  const { startDate, endDate } = getDateRange(timePeriod, customStartDate, customEndDate);
  const normalizedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
  const normalizedEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);

  // Filter appointments and payments by date range
  const filteredAppointments = (appointments as any[]).filter((apt: any) => {
    const aptDate = new Date(apt.createdAt || apt.date);
    return aptDate >= startDate && aptDate <= endDate && 
           (apt.status === 'completed' || apt.paymentStatus === 'paid');
  });

  const filteredPayments = (payments as any[]).filter((payment: any) => {
    const paymentDate = new Date(payment.createdAt || payment.paymentDate);
    return paymentDate >= startDate && paymentDate <= endDate && 
           payment.status === 'completed' && payment.type === 'appointment_payment';
  });

  const filteredSalesHistory = (salesHistory as any[]).filter((sale: any) => {
    const saleDate = new Date(sale.transactionDate);
    return saleDate >= startDate && saleDate <= endDate && 
           sale.transactionType === 'appointment';
  });

  // Calculate service performance metrics
  const calculateServiceMetrics = () => {
    const serviceMetrics = (services as any[]).map((service: any) => {
      const serviceAppointments = filteredAppointments.filter(
        (apt: any) => apt.serviceId === service.id
      );

      const serviceSales = filteredSalesHistory.filter(
        (sale: any) => sale.serviceId === service.id
      );

      const servicePayments = filteredPayments.filter(
        (payment: any) => {
          const matchingApt = serviceAppointments.find(apt => apt.id === payment.appointmentId);
          return matchingApt !== undefined;
        }
      );

      const totalRevenue = serviceSales.reduce((sum: number, sale: any) => {
        const amount = Number(sale.totalAmount) || 0;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      const totalBookings = serviceAppointments.length;
      const totalCashedOut = servicePayments.length;
      const averagePrice = totalCashedOut > 0 ? totalRevenue / totalCashedOut : Number(service.price) || 0;
      const conversionRate = totalBookings > 0 ? (totalCashedOut / totalBookings) * 100 : 0;



      // Ensure all calculated values are valid numbers with strict validation
      const safeTotalRevenue = Number.isFinite(totalRevenue) && totalRevenue >= 0 ? totalRevenue : 0;
      const safeAveragePrice = Number.isFinite(averagePrice) && averagePrice >= 0 ? averagePrice : 0;
      const safeConversionRate = Number.isFinite(conversionRate) && conversionRate >= 0 ? Math.min(conversionRate, 100) : 0;

      return {
        id: service.id,
        name: service.name,
        category: service.category,
        price: Number(service.price) || 0,
        duration: Number(service.duration) || 0,
        totalBookings,
        totalCashedOut,
        totalRevenue: safeTotalRevenue,
        averagePrice: safeAveragePrice,
        conversionRate: safeConversionRate
      };
    });

    return serviceMetrics.sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  const serviceMetrics = calculateServiceMetrics();

  // Calculate totals
  const totalServices = (services as any[]).length;
  const totalBookings = serviceMetrics.reduce((sum, service) => sum + service.totalBookings, 0);
  const totalCashedOut = serviceMetrics.reduce((sum, service) => sum + service.totalCashedOut, 0);
  const totalRevenue = serviceMetrics.reduce((sum, service) => sum + service.totalRevenue, 0);
  const overallConversionRate = totalBookings > 0 ? (totalCashedOut / totalBookings) * 100 : 0;

  // Prepare chart data with comprehensive validation
  const topServicesData = serviceMetrics.slice(0, 8).map(service => {
    // Extra safety: ensure all values are valid numbers before processing
    const revenue = Number(service.totalRevenue) || 0;
    const bookings = Number(service.totalBookings) || 0;
    const cashedOut = Number(service.totalCashedOut) || 0;
    
    const chartItem = {
      name: (service.name || 'Unknown Service').toString(),
      revenue: Math.max(0, Math.round(revenue * 100) / 100), // Round to 2 decimal places, ensure positive
      bookings: Math.max(0, Math.floor(bookings)), // Ensure positive integer
      cashedOut: Math.max(0, Math.floor(cashedOut)) // Ensure positive integer
    };
    

    
    return chartItem;
  }).filter(item => {
    // Strict filtering to ensure no NaN, Infinity, or negative values
    return Number.isFinite(item.revenue) && 
           Number.isFinite(item.bookings) && 
           Number.isFinite(item.cashedOut) &&
           item.revenue >= 0 &&
           item.bookings >= 0 &&
           item.cashedOut >= 0;
  });

  const conversionData = serviceMetrics.filter(s => s.totalBookings > 0).slice(0, 10).map(service => {
    // Extra safety: ensure all values are valid numbers before processing
    const conversionRate = Number(service.conversionRate) || 0;
    const bookings = Number(service.totalBookings) || 0;
    const cashedOut = Number(service.totalCashedOut) || 0;
    
    // Sanitize conversion rate calculation to prevent NaN
    let safeConversionRate = 0;
    if (Number.isFinite(conversionRate) && conversionRate >= 0 && conversionRate <= 100) {
      safeConversionRate = Math.round(conversionRate * 100) / 100; // Round to 2 decimal places
    }
    
    const chartItem = {
      name: (service.name || 'Unknown Service').toString(),
      conversionRate: safeConversionRate,
      bookings: Math.max(0, Math.floor(bookings)), // Ensure positive integer
      cashedOut: Math.max(0, Math.floor(cashedOut)) // Ensure positive integer
    };
    

    
    return chartItem;
  }).filter(item => {
    // Strict filtering to ensure no NaN, Infinity, or negative values
    return Number.isFinite(item.conversionRate) && 
           Number.isFinite(item.bookings) && 
           Number.isFinite(item.cashedOut) &&
           item.conversionRate >= 0 &&
           item.bookings >= 0 &&
           item.cashedOut >= 0;
  });



  return (
    <div className="space-y-6">
      {/* Loading indicator */}
      {(servicesLoading || appointmentsLoading || paymentsLoading || salesLoading) && (
        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Refreshing service data... This page updates automatically every 30 seconds.
          </AlertDescription>
        </Alert>
      )}
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                <Scissors className="h-5 w-5 text-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Services
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {totalServices}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Bookings
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {totalBookings}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Revenue Generated
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {formatPrice(totalRevenue)}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                <BarChart2 className="h-5 w-5 text-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Conversion Rate
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {Math.round(overallConversionRate)}%
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Services</CardTitle>
            <CardDescription>Revenue and bookings by service</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {topServicesData.length > 0 ? (
                <BarChart data={topServicesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis yAxisId="revenue" orientation="left" />
                  <YAxis yAxisId="bookings" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    yAxisId="revenue" 
                    dataKey="revenue" 
                    fill="hsl(var(--primary))" 
                    name="Revenue ($)"
                  />
                  <Bar 
                    yAxisId="bookings" 
                    dataKey="bookings" 
                    fill="hsl(var(--primary)/0.6)" 
                    name="Bookings"
                  />
                </BarChart>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  No service data available for the selected time period
                </div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Conversion Rates</CardTitle>
            <CardDescription>Booking to payment conversion by service</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {conversionData.length > 0 ? (
                <BarChart data={conversionData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'conversionRate' ? `${value}%` : value,
                      name === 'conversionRate' ? 'Conversion Rate' : name
                    ]}
                  />
                  <Bar 
                    dataKey="conversionRate" 
                    fill="hsl(var(--primary))" 
                    name="Conversion %"
                  />
                </BarChart>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  No conversion data available for the selected time period
                </div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Service Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Service Performance</CardTitle>
          <CardDescription>Detailed breakdown of all services with booking and revenue metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Bookings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cashed Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Avg Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Conversion Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {serviceMetrics.map((service, index) => (
                  <tr key={service.id} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {service.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {service.category} • {service.duration}min • {formatPrice(service.price)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {service.totalBookings}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {service.totalCashedOut}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatPrice(service.totalRevenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatPrice(service.averagePrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${Math.min(service.conversionRate, 100)}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                          {Math.round(service.conversionRate)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// === StaffReport (RECREATED) ===
const StaffReport = ({ timePeriod, customStartDate, customEndDate }: { 
  timePeriod: string; 
  customStartDate?: string; 
  customEndDate?: string; 
}) => {
  // Data fetching with real-time updates
  const { data: staff = [], isLoading: staffLoading, error: staffError } = useQuery({ 
    queryKey: ["/api/staff"],
    queryFn: async () => {
      const response = await fetch('/api/staff');
      if (!response.ok) throw new Error('Failed to fetch staff');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({ 
    queryKey: ["/api/appointments"],
    queryFn: async () => {
      const response = await fetch('/api/appointments');
      if (!response.ok) throw new Error('Failed to fetch appointments');
      return response.json();
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
  const { data: salesHistory = [], isLoading: salesLoading } = useQuery({ 
    queryKey: ["/api/sales-history"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
  const { data: services = [], isLoading: servicesLoading } = useQuery({ 
    queryKey: ["/api/services"],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  // Loading/Error states
  if (staffLoading || appointmentsLoading) {
    return <div className="p-8 text-center text-gray-500">Loading staff report data...</div>;
  }
  if (staffError) {
    return <div className="p-8 text-center text-red-500">Failed to load staff data. Please refresh.</div>;
  }
  if (!staff || staff.length === 0) {
    return <div className="p-8 text-center text-gray-500">No staff data available.</div>;
  }

  // Date range
  const { startDate, endDate } = getDateRange(timePeriod, customStartDate, customEndDate);
  const normalizedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
  const normalizedEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);

  // --- Metrics Calculation ---
  const staffMetrics = staff.map((staffMember: any) => {
    // Robust staff ID
    const staffId = staffMember.userId || staffMember.user?.id || staffMember.id;
    
    // Appointments for this staff within date range
    const staffAppointments = (appointments as any[]).filter(
      (apt: any) => {
        const aptDate = new Date(apt.startTime);
        return apt.staffId === staffId && aptDate >= startDate && aptDate <= endDate;
      }
    );
    
    // Completed appointments (services that have been checked out/paid)
    const completedAppointments = staffAppointments.filter(
      (apt: any) => apt.paymentStatus === 'paid'
    );
    
    // Sales for this staff within date range
    const staffSales = (salesHistory as any[]).filter(
      (sale: any) => {
        const saleDate = new Date(sale.transactionDate || sale.transaction_date);
        return sale.staffId === staffId && saleDate >= startDate && saleDate <= endDate;
      }
    );
    
    // Revenue from sales
    const totalRevenue = staffSales.reduce((sum: number, sale: any) => {
      const amount = Number(sale.totalAmount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    // Revenue from completed appointments (fallback)
    const appointmentRevenue = completedAppointments.reduce((sum: number, apt: any) => {
      const service = (services as any[]).find((s: any) => s.id === apt.serviceId);
      const price = Number(service?.price);
      return sum + (isNaN(price) ? 0 : price);
    }, 0);
    
    // Use the higher of the two
    const finalRevenue = Math.max(totalRevenue, appointmentRevenue);
    // Average ticket
    const avgTicket = completedAppointments.length > 0 ? finalRevenue / completedAppointments.length : 0;
    // Service hours
    const serviceHours = completedAppointments.reduce((sum: number, apt: any) => {
      const service = (services as any[]).find((s: any) => s.id === apt.serviceId);
      const duration = Number(service?.duration);
      const hours = isNaN(duration) ? 1 : duration / 60;
      return sum + (isNaN(hours) ? 1 : hours);
    }, 0);
    // Utilization (assume 160h/month, 40h/week, etc)
    const totalWorkingHours = timePeriod === "week" ? 40 : timePeriod === "month" ? 160 : timePeriod === "quarter" ? 480 : 640;
    const utilization = totalWorkingHours > 0 ? Math.min((serviceHours / totalWorkingHours) * 100, 100) : 0;
    // Commission calculation based on commission type
    let commissionEarnings = 0;
    
    switch (staffMember.commissionType) {
      case 'commission': {
        // Commission rate is already stored as decimal (e.g., 0.3 for 30%)
        const commissionRate = Number(staffMember.commissionRate) || 0;
        commissionEarnings = finalRevenue * commissionRate;
        break;
      }
      case 'hourly': {
        // Calculate hourly earnings based on service duration
        const hourlyRate = Number(staffMember.hourlyRate) || 0;
        const totalHours = completedAppointments.reduce((sum: number, apt: any) => {
          const service = (services as any[]).find((s: any) => s.id === apt.serviceId);
          const duration = Number(service?.duration) || 60; // Duration in minutes
          return sum + (duration / 60); // Convert to hours
        }, 0);
        commissionEarnings = hourlyRate * totalHours;
        break;
      }
      case 'fixed': {
        // Fixed rate per appointment
        const fixedRate = Number(staffMember.fixedRate) || 0;
        commissionEarnings = fixedRate * completedAppointments.length;
        break;
      }
      case 'hourly_plus_commission': {
        // Calculate both hourly and commission
        const hourlyRate = Number(staffMember.hourlyRate) || 0;
        const commissionRate = Number(staffMember.commissionRate) || 0;
        
        const totalHours = completedAppointments.reduce((sum: number, apt: any) => {
          const service = (services as any[]).find((s: any) => s.id === apt.serviceId);
          const duration = Number(service?.duration) || 60; // Duration in minutes
          return sum + (duration / 60); // Convert to hours
        }, 0);
        
        const hourlyPortion = hourlyRate * totalHours;
        const commissionPortion = finalRevenue * commissionRate;
        commissionEarnings = hourlyPortion + commissionPortion;
        break;
      }
      default:
        commissionEarnings = 0;
    }
    // Name/role
    const name = `${staffMember.user?.firstName || ''} ${staffMember.user?.lastName || ''}`.trim() || staffMember.user?.username || 'Unknown';
    const role = staffMember.title || 'Staff';
    // Robust output
    return {
      id: staffId,
      name,
      role,
      totalRevenue: isNaN(finalRevenue) ? 0 : finalRevenue,
      completedAppointments: completedAppointments.length,
      avgTicket: isNaN(avgTicket) ? 0 : avgTicket,
      commissionEarnings: isNaN(commissionEarnings) ? 0 : commissionEarnings,
      utilization: isNaN(utilization) ? 0 : utilization,
      serviceHours: isNaN(serviceHours) ? 0 : serviceHours
    };
  });

  // --- Chart Data ---
  const chartData = staffMetrics.map((s: any) => ({
    name: s.name,
    revenue: s.totalRevenue,
    utilization: Math.round(s.utilization)
  }));
  const hasChartData = chartData.some((s: any) => s.revenue > 0 || s.utilization > 0);

  // --- Render ---
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold mb-2">Staff Performance Report</h2>
      {hasChartData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Sales by Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-30} textAnchor="end" height={60} interval={0} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#3aaad9" name="Total Sales" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Utilization by Staff (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip formatter={v => `${v}%`} />
                  <Bar dataKey="utilization" fill="#566acd" name="Utilization %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">No chart data available for this period.</div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Staff Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Role</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold">Total Sales</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold">Completed</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold">Avg Ticket</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold">Earnings</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold">Utilization</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold">Service Hours</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {staffMetrics.map((s: any) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 text-sm">{s.name}</td>
                    <td className="px-4 py-2 text-sm">{s.role}</td>
                    <td className="px-4 py-2 text-sm text-right">${s.totalRevenue.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-right">{s.completedAppointments}</td>
                    <td className="px-4 py-2 text-sm text-right">${s.avgTicket.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-right">${s.commissionEarnings.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-right">{Math.round(s.utilization)}%</td>
                    <td className="px-4 py-2 text-sm text-right">{s.serviceHours.toFixed(1)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const TimeClockReport = ({ }: { 
  timePeriod: string; 
  customStartDate?: string; 
  customEndDate?: string; 
}) => {
  const { data: timeEntries = [], isLoading, refetch } = useQuery({ 
    queryKey: ["/api/time-clock-entries"],
    refetchInterval: 15000, // Refetch every 15 seconds for time clock data
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });
  
  const [syncing, setSyncing] = useState(false);
  
  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/time-clock-sync', { method: 'POST' });
      const result = await response.json();
      console.log('Sync result:', result);
      refetch(); // Refresh the data
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const calculateStats = () => {
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    
    const weeklyEntries = (timeEntries as any[]).filter((entry: any) => {
      const entryDate = new Date(entry.clockInTime);
      return entryDate >= weekStart;
    });
    
    const totalHours = weeklyEntries.reduce((sum: number, entry: any) => {
      if (entry.clockOutTime) {
        const clockIn = new Date(entry.clockInTime);
        const clockOut = new Date(entry.clockOutTime);
        const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }
      return sum;
    }, 0);
    
    const currentlyClocked = (timeEntries as any[]).filter((entry: any) => entry.status === 'clocked_in').length;
    const avgDaily = weeklyEntries.length > 0 ? totalHours / 7 : 0;
    
    return { totalHours, currentlyClocked, avgDaily };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Time Clock Overview</CardTitle>
              <CardDescription>
                Staff clock-in/out records and hours worked
              </CardDescription>
            </div>
            <Button 
              onClick={handleSync} 
              disabled={syncing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Data'}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-primary mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Hours This Week</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalHours.toFixed(1)}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-primary/10 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-primary mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Staff Currently Clocked In</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.currentlyClocked}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-primary/10 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Calendar className="h-8 w-8 text-primary mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Avg Daily Hours</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.avgDaily.toFixed(1)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Entries Table */}
              <div className="border rounded-lg">
                <div className="px-4 py-3 border-b bg-gray-50 dark:bg-gray-800">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Recent Time Entries</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Staff Member</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clock In</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clock Out</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Hours</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {isLoading ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            <div className="flex justify-center items-center">
                              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                              Loading time clock entries...
                            </div>
                          </td>
                        </tr>
                      ) : (timeEntries as any[]).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            <div className="flex flex-col items-center">
                              <Clock className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                              <p className="text-lg font-medium mb-1">No time clock entries yet</p>
                              <p className="text-sm mb-3">Click "Sync Data" to pull time clock entries from external source</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        (timeEntries as any[]).map((entry: any) => {
                          const clockIn = new Date(entry.clockInTime);
                          const clockOut = entry.clockOutTime ? new Date(entry.clockOutTime) : null;
                          const hours = clockOut ? ((clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)).toFixed(1) : 'N/A';
                          
                          return (
                            <tr key={entry.id}>
                              <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                                Staff #{entry.staffId}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                                {clockIn.toLocaleDateString()}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                                {clockIn.toLocaleTimeString()}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                                {clockOut ? clockOut.toLocaleTimeString() : '-'}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100">
                                {hours} hrs
                              </td>
                              <td className="px-4 py-4 text-sm">
                                <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                  entry.status === 'clocked_in' 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                                }`}>
                                  {entry.status === 'clocked_in' ? 'Clocked In' : 'Clocked Out'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ReportsPage = () => {
  useDocumentTitle("Reports | Glo Head Spa");
  const [timePeriod, setTimePeriod] = useState("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  // Apply filters only when user clicks "Load Report"
  const [appliedLocation, setAppliedLocation] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const queryClient = useQueryClient();

  // Fetch locations for the dropdown
  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ["/api/locations"],
    queryFn: async () => {
      const response = await fetch("/api/locations");
      if (!response.ok) {
        throw new Error("Failed to fetch locations");
      }
      return response.json();
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  // Auto-update the last update time every 30 seconds to show live status
  React.useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdateTime(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Real-time data refresh effect
  React.useEffect(() => {
    const refreshInterval = setInterval(() => {
      // Invalidate all report-related queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ["/api/sales-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-clock-entries"] });
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [queryClient]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
            {/* Header Section */}
            <div className="mb-6 md:mb-8">
              <div className="space-y-4 md:space-y-0">
                <div className="flex items-start">
                  {selectedReport && (
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => setSelectedReport(null)}
                      className="mr-3 min-h-[44px] flex-shrink-0"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                  )}
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                      {selectedReport ? getReportTitle(selectedReport) : "Reports Dashboard"}
                    </h1>
                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {selectedReport ? getReportDescription(selectedReport) : "Comprehensive analytics and insights for your salon business"}
                    </p>
                    {selectedReport && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span>Real-time updates enabled</span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {(() => {
                            try {
                              const { startDate, endDate } = getDateRange(timePeriod, customStartDate, customEndDate);
                              return `Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
                            } catch {
                              return null;
                            }
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {selectedReport && (
                  <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3 md:gap-4">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                      <Select 
                        value={timePeriod} 
                        onValueChange={(value) => {
                          setTimePeriod(value);
                          if (value === "custom") {
                            setDatePopoverOpen(true);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-[180px] min-h-[44px] text-left">
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">Today</SelectItem>
                          <SelectItem value="yesterday">Yesterday</SelectItem>
                          <SelectItem value="week">This Week</SelectItem>
                          <SelectItem value="month">This Month</SelectItem>
                          <SelectItem value="quarter">This Quarter</SelectItem>
                          <SelectItem value="year">This Year</SelectItem>
                          <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {timePeriod === "custom" && (
                        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full sm:w-auto min-h-[44px] justify-start text-left font-normal px-3">
                              <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
                              <span className="truncate">
                                {customStartDate && customEndDate 
                                  ? `${customStartDate} to ${customEndDate}`
                                  : "Select date range"}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80" align="start">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <Input
                                  id="startDate"
                                  type="date"
                                  value={customStartDate}
                                  onChange={(e) => setCustomStartDate(e.target.value)}
                                  className="min-h-[44px]"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="endDate">End Date</Label>
                                <Input
                                  id="endDate"
                                  type="date"
                                  value={customEndDate}
                                  onChange={(e) => setCustomEndDate(e.target.value)}
                                  className="min-h-[44px]"
                                />
                              </div>
                              <div className="flex justify-between gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setCustomStartDate("");
                                    setCustomEndDate("");
                                    setDatePopoverOpen(false);
                                  }}
                                  className="min-h-[40px] flex-1"
                                >
                                  Clear
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => {
                                    setDatePopoverOpen(false);
                                  }}
                                  className="min-h-[40px] flex-1"
                                  disabled={!customStartDate || !customEndDate}
                                >
                                  Apply
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                      
                      {/* Location Filter */}
                      <Select 
                        value={selectedLocation} 
                        onValueChange={setSelectedLocation}
                      >
                        <SelectTrigger className="w-full sm:w-[200px] min-h-[44px] text-left">
                          <SelectValue placeholder="All Locations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Locations</SelectItem>
                          {locations.map((location: any) => (
                            <SelectItem key={location.id} value={location.id.toString()}>
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Live</span>
                        <span>•</span>
                        <span>Updated {lastUpdateTime.toLocaleTimeString()}</span>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => {
                          setAppliedLocation(selectedLocation);
                          queryClient.invalidateQueries();
                          setLastUpdateTime(new Date());
                        }}
                        className="min-h-[44px]"
                      >
                        Load Report
                      </Button>
                      <Button variant="outline" className="w-full sm:w-auto min-h-[44px]">Export Report</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            {selectedReport ? (
              <div className="space-y-4">
                {/* Real-time data status */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-green-700 dark:text-green-300">Live Data</span>
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Auto-refreshing every 30 seconds • Last updated: {lastUpdateTime.toLocaleTimeString()}
                        </span>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>📊 Live Reports</span>
                          <span>🔄 Auto-refresh</span>
                          <span>⚡ Real-time</span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          queryClient.invalidateQueries();
                          setLastUpdateTime(new Date());
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Refresh Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <SpecificReportView 
                  reportType={selectedReport} 
                  timePeriod={timePeriod}
                  customStartDate={customStartDate}
                  customEndDate={customEndDate}
                  selectedLocation={appliedLocation}
                />
              </div>
            ) : (
              <ReportsLandingPage onSelectReport={setSelectedReport} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReportsPage;