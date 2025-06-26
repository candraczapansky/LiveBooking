import React, { useState, useEffect } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DollarSign, 
  Users, 
  Scissors, 
  Calendar, 
  TrendingUp, 
  BarChart2,
  PieChart,
  Clock,
  ArrowLeft,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import PayrollReport from "./payroll-report";
import { formatPrice } from "@/lib/utils";
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

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

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

// Landing Page Component
const ReportsLandingPage = ({ onSelectReport }: { onSelectReport: (reportId: string) => void }) => {
  return (
    <div className="space-y-6">
      {/* Report Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportCategories.map((category) => (
          <Card 
            key={category.id}
            className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
            onClick={() => onSelectReport(category.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className={`inline-flex p-3 rounded-lg ${category.bgColor} mb-4`}>
                    <category.icon className={`h-6 w-6 ${category.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {category.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {category.description}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              </div>
              <div className="flex items-center text-sm text-primary group-hover:text-primary/80 transition-colors">
                View Report
                <ChevronRight className="h-4 w-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Specific Report View Component
const SpecificReportView = ({ reportType, timePeriod }: { reportType: string; timePeriod: string }) => {
  // Generate reports based on type
  switch (reportType) {
    case "sales":
      return <SalesReport timePeriod={timePeriod} />;
    case "clients": 
      return <ClientsReport timePeriod={timePeriod} />;
    case "services":
      return <ServicesReport timePeriod={timePeriod} />;
    case "staff":
      return <StaffReport timePeriod={timePeriod} />;
    case "payroll":
      return <PayrollReport />;
    case "timeclock":
      return <TimeClockReport timePeriod={timePeriod} />;
    default:
      return <div>Report not found</div>;
  }
};

// Individual Report Components
const SalesReport = ({ timePeriod }: { timePeriod: string }) => {
  const { data: payments = [] } = useQuery({ queryKey: ["/api/payments"] });
  const completedPayments = (payments as any[]).filter((payment: any) => payment.status === "completed");
  const totalRevenue = completedPayments.reduce((sum: number, payment: any) => sum + payment.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Revenue
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-gray-100">
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
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Transactions
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {completedPayments.length}
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
                    Avg Transaction
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {formatPrice(completedPayments.length > 0 ? totalRevenue / completedPayments.length : 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ClientsReport = ({ timePeriod }: { timePeriod: string }) => {
  const { data: users = [] } = useQuery({ queryKey: ["/api/users"] });
  const clients = (users as any[]).filter((user: any) => user.role === "client");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Client Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{clients.length}</div>
          <p className="text-gray-600 dark:text-gray-400">Total Clients</p>
        </CardContent>
      </Card>
    </div>
  );
};

const ServicesReport = ({ timePeriod }: { timePeriod: string }) => {
  const { data: services = [] } = useQuery({ queryKey: ["/api/services"] });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Service Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{(services as any[]).length}</div>
          <p className="text-gray-600 dark:text-gray-400">Total Services</p>
        </CardContent>
      </Card>
    </div>
  );
};

const StaffReport = ({ timePeriod }: { timePeriod: string }) => {
  const { data: staff = [] } = useQuery({ queryKey: ["/api/staff"] });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Staff Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{(staff as any[]).length}</div>
          <p className="text-gray-600 dark:text-gray-400">Total Staff Members</p>
        </CardContent>
      </Card>
    </div>
  );
};

const TimeClockReport = ({ timePeriod }: { timePeriod: string }) => {
  const { data: timeEntries = [], isLoading, refetch } = useQuery({ 
    queryKey: ["/api/time-clock-entries"] 
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
    
    const weeklyEntries = timeEntries.filter((entry: any) => {
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
    
    const currentlyClocked = timeEntries.filter((entry: any) => entry.status === 'clocked_in').length;
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
                      ) : timeEntries.length === 0 ? (
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
                        timeEntries.map((entry: any) => {
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
  useDocumentTitle("Reports | BeautyBook");
  const [timePeriod, setTimePeriod] = useState("month");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  useEffect(() => {
    const checkSidebarState = () => {
      const globalSidebarState = (window as any).sidebarIsOpen;
      if (globalSidebarState !== undefined) {
        setSidebarOpen(globalSidebarState);
      }
    };

    const interval = setInterval(checkSidebarState, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarOpen ? "ml-64" : "ml-0"
      }`}>
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-6 py-8">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {selectedReport && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedReport(null)}
                      className="mr-3"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                  )}
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {selectedReport ? getReportTitle(selectedReport) : "Reports Dashboard"}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {selectedReport ? getReportDescription(selectedReport) : "Comprehensive analytics and insights for your salon business"}
                    </p>
                  </div>
                </div>
                {selectedReport && (
                  <div className="flex items-center space-x-4">
                    <Select value={timePeriod} onValueChange={setTimePeriod}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="quarter">This Quarter</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline">
                      Export Report
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            {selectedReport ? (
              <SpecificReportView reportType={selectedReport} timePeriod={timePeriod} />
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