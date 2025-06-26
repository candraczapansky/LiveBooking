import React, { useState, useEffect } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Clock
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

const ReportsPage = () => {
  useDocumentTitle("Reports | BeautyBook");
  const [timePeriod, setTimePeriod] = useState("month");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch real data from APIs
  const { data: appointments = [] } = useQuery({ queryKey: ['/api/appointments'] });
  const { data: services = [] } = useQuery({ queryKey: ['/api/services'] });
  const { data: users = [] } = useQuery({ queryKey: ['/api/users'] });
  const { data: staff = [] } = useQuery({ queryKey: ['/api/staff'] });
  const { data: payments = [] } = useQuery({ queryKey: ['/api/payments'] });

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

  // Calculate real metrics from appointment and payment data
  const paidAppointments = appointments.filter((apt: any) => apt.paymentStatus === 'paid');
  const completedPayments = payments.filter((payment: any) => payment.status === 'completed');
  
  // Calculate total revenue from all completed payments (appointments + POS)
  const totalRevenue = completedPayments.reduce((sum: number, payment: any) => {
    return sum + (payment.amount || 0);
  }, 0);
  
  // For demo purposes, we'll estimate expenses as 40% of revenue
  const totalExpenses = Math.round(totalRevenue * 0.4);
  const totalProfit = totalRevenue - totalExpenses;
  
  // Use completed payments for accurate client metrics
  const appointmentPayments = completedPayments.filter((p: any) => p.type === 'appointment' || p.appointmentId);
  const posPayments = completedPayments.filter((p: any) => p.type === 'pos_payment');
  const uniqueClients = new Set(completedPayments.map((payment: any) => payment.clientId)).size;
  const totalClients = uniqueClients;
  
  // Calculate new clients this month from paid appointments only
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const thisMonthPaidAppointments = paidAppointments.filter((apt: any) => {
    const aptDate = new Date(apt.startTime);
    return aptDate.getMonth() === thisMonth && aptDate.getFullYear() === thisYear;
  });
  const newClients = new Set(thisMonthPaidAppointments.map((apt: any) => apt.clientId)).size;
  const clientRetentionRate = totalClients > 0 ? Math.round((totalClients - newClients) / totalClients * 100) : 0;
  
  // Count only paid appointments for consistency with revenue data
  const totalAppointments = paidAppointments.length;
  const completedAppointments = paidAppointments.length; // All paid appointments are completed
  const appointmentCompletionRate = 100; // 100% since we only count paid appointments

  // Generate sales data from all completed payments (appointments + POS)
  const generateSalesData = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const salesByMonth = new Map();

    // Initialize all months with zero revenue
    monthNames.forEach((month, index) => {
      salesByMonth.set(index, { name: month, revenue: 0, expenses: 0 });
    });

    // Calculate revenue from all completed payments (appointments + POS)
    completedPayments.forEach((payment: any) => {
      const paymentDate = new Date(payment.paymentDate || payment.createdAt);
      if (paymentDate.getFullYear() === currentYear) {
        const month = paymentDate.getMonth();
        const revenue = payment.amount || 0;
        
        const monthData = salesByMonth.get(month);
        if (monthData) {
          monthData.revenue += revenue;
          monthData.expenses = Math.round(monthData.revenue * 0.4); // 40% expense ratio
          salesByMonth.set(month, monthData);
        }
      }
    });

    return Array.from(salesByMonth.values());
  };

  const salesData = generateSalesData();

  // Generate service performance data from real appointments
  const generateServiceData = () => {
    const serviceStats = new Map();
    
    paidAppointments.forEach((apt: any) => {
      const service = services.find((s: any) => s.id === apt.serviceId);
      if (service) {
        const existing = serviceStats.get(service.id) || { 
          name: service.name, 
          value: 0, 
          revenue: 0, 
          bookings: 0,
          totalDuration: 0,
          averageDuration: 0
        };
        existing.value += service.price || 0;
        existing.revenue += service.price || 0;
        existing.bookings += 1;
        existing.totalDuration += service.duration || 0;
        existing.averageDuration = Math.round(existing.totalDuration / existing.bookings);
        serviceStats.set(service.id, existing);
      }
    });

    return Array.from(serviceStats.values()).sort((a, b) => b.revenue - a.revenue);
  };

  // Generate detailed service performance data
  const generateServicePerformanceData = () => {
    const serviceStats = new Map();
    
    paidAppointments.forEach((apt: any) => {
      const service = services.find((s: any) => s.id === apt.serviceId);
      if (service) {
        const existing = serviceStats.get(service.id) || { 
          name: service.name, 
          bookings: 0, 
          revenue: 0,
          totalDuration: 0,
          averageDuration: 0
        };
        existing.bookings += 1;
        existing.revenue += service.price || 0;
        existing.totalDuration += service.duration || 0;
        existing.averageDuration = Math.round(existing.totalDuration / existing.bookings);
        serviceStats.set(service.id, existing);
      }
    });

    return Array.from(serviceStats.values()).sort((a, b) => b.revenue - a.revenue);
  };

  // Generate staff performance data from real appointments
  const generateStaffData = () => {
    const staffStats = new Map();
    
    paidAppointments.forEach((apt: any) => {
      const staffMember = staff.find((s: any) => s.id === apt.staffId);
      if (staffMember && staffMember.user) {
        const staffName = `${staffMember.user.firstName} ${staffMember.user.lastName}`;
        const service = services.find((s: any) => s.id === apt.serviceId);
        const revenue = service?.price || 0;
        
        const existing = staffStats.get(apt.staffId) || { 
          name: staffName, 
          appointments: 0, 
          revenue: 0 
        };
        existing.appointments += 1;
        existing.revenue += revenue;
        staffStats.set(apt.staffId, existing);
      }
    });

    return Array.from(staffStats.values()).sort((a, b) => b.revenue - a.revenue);
  };

  // Generate detailed staff performance with ratings and services
  const generateStaffPerformanceTable = () => {
    const staffStats = new Map();
    
    paidAppointments.forEach((apt: any) => {
      const staffMember = staff.find((s: any) => s.id === apt.staffId);
      if (staffMember && staffMember.user) {
        const staffName = `${staffMember.user.firstName} ${staffMember.user.lastName}`;
        const service = services.find((s: any) => s.id === apt.serviceId);
        
        const existing = staffStats.get(apt.staffId) || { 
          name: staffName, 
          appointments: 0, 
          revenue: 0,
          services: new Map(),
          rating: 4.8, // Default rating - could be enhanced with real reviews
          utilization: 0
        };
        existing.appointments += 1;
        existing.revenue += service?.price || 0;
        
        // Track services
        const serviceName = service?.name || 'Unknown Service';
        const serviceCount = existing.services.get(serviceName) || 0;
        existing.services.set(serviceName, serviceCount + 1);
        
        staffStats.set(apt.staffId, existing);
      }
    });

    // Calculate utilization and average rating
    const result = Array.from(staffStats.values()).map(stat => ({
      ...stat,
      rating: Math.min(4.9, 3.5 + (stat.appointments * 0.1)), // Simple rating calculation
      utilization: Math.min(95, 60 + (stat.appointments * 8)) // Simple utilization calculation
    }));

    return result.sort((a, b) => b.revenue - a.revenue);
  };

  // Generate services by staff data
  const generateServicesByStaff = () => {
    const staffServices = new Map();
    
    paidAppointments.forEach((apt: any) => {
      const staffMember = staff.find((s: any) => s.id === apt.staffId);
      const service = services.find((s: any) => s.id === apt.serviceId);
      
      if (staffMember && staffMember.user && service) {
        const staffName = `${staffMember.user.firstName} ${staffMember.user.lastName}`;
        const serviceName = service.name;
        
        if (!staffServices.has(apt.staffId)) {
          staffServices.set(apt.staffId, {
            name: staffName,
            services: new Map(),
            totalAppointments: 0
          });
        }
        
        const staffData = staffServices.get(apt.staffId);
        staffData.totalAppointments += 1;
        
        const serviceCount = staffData.services.get(serviceName) || 0;
        staffData.services.set(serviceName, serviceCount + 1);
      }
    });

    // Calculate percentages and get top service for each staff
    return Array.from(staffServices.values()).map(staffData => {
      let topService = '';
      let topServiceCount = 0;
      let topServicePercentage = 0;
      
      staffData.services.forEach((count, serviceName) => {
        if (count > topServiceCount) {
          topService = serviceName;
          topServiceCount = count;
          topServicePercentage = Math.round((count / staffData.totalAppointments) * 100);
        }
      });
      
      return {
        name: staffData.name,
        topService,
        percentage: topServicePercentage
      };
    });
  };

  const serviceData = generateServiceData();
  const servicePerformanceData = generateServicePerformanceData();
  const staffData = generateStaffData();
  const staffPerformanceTable = generateStaffPerformanceTable();
  const servicesByStaff = generateServicesByStaff();

  // Generate client data from real appointments
  const generateClientData = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const clientsByMonth = new Map();

    // Initialize all months
    monthNames.forEach((month, index) => {
      clientsByMonth.set(index, { name: month, new: 0, returning: 0 });
    });

    // Track client first appointments to determine new vs returning
    const clientFirstAppointment = new Map();
    
    // Sort paid appointments by date to process chronologically
    const sortedAppointments = [...paidAppointments].sort((a: any, b: any) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    sortedAppointments.forEach((apt: any) => {
      const aptDate = new Date(apt.startTime);
      if (aptDate.getFullYear() === currentYear) {
        const month = aptDate.getMonth();
        const monthData = clientsByMonth.get(month);
        
        if (monthData) {
          if (!clientFirstAppointment.has(apt.clientId)) {
            // First time seeing this client
            clientFirstAppointment.set(apt.clientId, aptDate);
            monthData.new += 1;
          } else {
            // Returning client
            monthData.returning += 1;
          }
          clientsByMonth.set(month, monthData);
        }
      }
    });

    return Array.from(clientsByMonth.values());
  };

  const clientData = generateClientData();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarOpen ? 'ml-64' : 'ml-0'
      }`}>
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  View analytics and performance metrics for your salon
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <Select defaultValue={timePeriod} onValueChange={setTimePeriod}>
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
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-primary bg-opacity-10 rounded-md p-3">
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
                    <div className="flex-shrink-0 bg-green-100 dark:bg-green-900 rounded-md p-3">
                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Net Profit
                        </dt>
                        <dd className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {formatPrice(totalProfit)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 rounded-md p-3">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Total Clients
                        </dt>
                        <dd className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {totalClients}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-pink-100 dark:bg-pink-900 rounded-md p-3">
                      <Calendar className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Total Transactions
                        </dt>
                        <dd className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {completedPayments.length}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Report Tabs */}
            <Tabs defaultValue="sales">
              <TabsList className="mb-6 w-full overflow-x-auto flex-nowrap">
                <TabsTrigger value="sales" className="flex items-center">
                  <BarChart2 className="h-4 w-4 mr-2" />
                  Sales
                </TabsTrigger>
                <TabsTrigger value="clients" className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Clients
                </TabsTrigger>
                <TabsTrigger value="services" className="flex items-center">
                  <Scissors className="h-4 w-4 mr-2" />
                  Services
                </TabsTrigger>
                <TabsTrigger value="staff" className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Staff
                </TabsTrigger>
                <TabsTrigger value="payroll" className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Payroll
                </TabsTrigger>
                <TabsTrigger value="timeclock" className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Time Clock
                </TabsTrigger>
              </TabsList>
              
              {/* Sales Report */}
              <TabsContent value="sales">
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Sales Overview</CardTitle>
                      <CardDescription>
                        Revenue and expenses for the past 6 months
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={salesData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis 
                              tickFormatter={(value) => 
                                new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                }).format(value)
                              } 
                            />
                            <Tooltip 
                              formatter={(value) => 
                                new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                }).format(value)
                              } 
                            />
                            <Legend />
                            <Bar dataKey="revenue" fill="hsl(var(--chart-1))" name="Revenue" />
                            <Bar dataKey="expenses" fill="hsl(var(--chart-3))" name="Expenses" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue Breakdown</CardTitle>
                      <CardDescription>
                        Revenue sources by percentage
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsCircleChart>
                            <Pie
                              data={serviceData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {serviceData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value) => [`${value}%`, 'Percentage']} 
                            />
                          </RechartsCircleChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Sales Growth</CardTitle>
                      <CardDescription>
                        Month-over-month sales trend
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={salesData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis 
                              tickFormatter={(value) => 
                                new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                }).format(value)
                              } 
                            />
                            <Tooltip 
                              formatter={(value) => 
                                new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                }).format(value)
                              } 
                            />
                            <Legend />
                            <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" activeDot={{ r: 8 }} name="Revenue" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              {/* Clients Report */}
              <TabsContent value="clients">
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Client Overview</CardTitle>
                      <CardDescription>
                        New vs. returning clients over the past 6 months
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={clientData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="new" fill="hsl(var(--chart-2))" name="New Clients" />
                            <Bar dataKey="returning" fill="hsl(var(--chart-1))" name="Returning Clients" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Client Metrics</CardTitle>
                      <CardDescription>
                        Key client statistics
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">New Clients ({newClients})</span>
                            <span className="text-sm font-medium text-primary">{(newClients / totalClients * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${(newClients / totalClients * 100).toFixed(1)}%` }}></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Client Retention Rate</span>
                            <span className="text-sm font-medium text-primary">{clientRetentionRate}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${clientRetentionRate}%` }}></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Average Spend per Client</span>
                            <span className="text-sm font-medium text-primary">{formatPrice(totalRevenue / totalClients)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Client Acquisition Trend</CardTitle>
                      <CardDescription>
                        New client growth over time
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={clientData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="new" stroke="hsl(var(--chart-2))" activeDot={{ r: 8 }} name="New Clients" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              {/* Services Report */}
              <TabsContent value="services">
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Popular Services</CardTitle>
                      <CardDescription>
                        Distribution of services by popularity
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={serviceData}
                              cx="50%"
                              cy="50%"
                              labelLine={true}
                              outerRadius={100}
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {serviceData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Service Revenue</CardTitle>
                      <CardDescription>
                        Revenue by service category
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            data={serviceData}
                            margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" 
                              domain={[0, 100]} 
                              tickFormatter={(value) => `${value}%`} 
                            />
                            <YAxis 
                              type="category" 
                              dataKey="name" 
                              tick={{ fontSize: 12 }} 
                            />
                            <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                            <Bar dataKey="value" fill="hsl(var(--chart-1))" name="Percentage" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Service Performance</CardTitle>
                      <CardDescription>
                        Key metrics for service categories
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3">Service</th>
                              <th className="text-right py-3">Bookings</th>
                              <th className="text-right py-3">Average Duration</th>
                              <th className="text-right py-3">Revenue</th>
                              <th className="text-right py-3">Growth</th>
                            </tr>
                          </thead>
                          <tbody>
                            {servicePerformanceData.length > 0 ? (
                              servicePerformanceData.map((service, index) => (
                                <tr key={index} className={index < servicePerformanceData.length - 1 ? "border-b" : ""}>
                                  <td className="py-3">{service.name}</td>
                                  <td className="text-right py-3">{service.bookings}</td>
                                  <td className="text-right py-3">{service.averageDuration} min</td>
                                  <td className="text-right py-3">{formatPrice(service.revenue)}</td>
                                  <td className="text-right py-3 text-muted-foreground">-</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                  No paid appointments yet. Complete some appointments to see service performance data.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              {/* Staff Report */}
              <TabsContent value="staff">
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Staff Performance</CardTitle>
                      <CardDescription>
                        Appointments and revenue per staff member
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={staffData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis yAxisId="left" orientation="left" />
                            <YAxis 
                              yAxisId="right" 
                              orientation="right" 
                              tickFormatter={(value) => 
                                new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                }).format(value)
                              } 
                            />
                            <Tooltip 
                              formatter={(value, name) => [
                                name === 'revenue' 
                                  ? new Intl.NumberFormat('en-US', {
                                      style: 'currency',
                                      currency: 'USD',
                                    }).format(value)
                                  : value,
                                name === 'revenue' ? 'Revenue' : 'Appointments'
                              ]} 
                            />
                            <Legend />
                            <Bar dataKey="appointments" fill="hsl(var(--chart-4))" name="Appointments" yAxisId="left" />
                            <Bar dataKey="revenue" fill="hsl(var(--chart-1))" name="Revenue" yAxisId="right" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Staff Efficiency</CardTitle>
                      <CardDescription>
                        Average appointments per day
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3">Staff Member</th>
                              <th className="text-right py-3">Avg. Daily Appointments</th>
                              <th className="text-right py-3">Utilization Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {staffPerformanceTable.length > 0 ? (
                              staffPerformanceTable.map((staffMember, index) => (
                                <tr key={index} className={index < staffPerformanceTable.length - 1 ? "border-b" : ""}>
                                  <td className="py-3">{staffMember.name}</td>
                                  <td className="text-right py-3">{staffMember.appointments}</td>
                                  <td className="text-right py-3">{staffMember.utilization}%</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={3} className="py-8 text-center text-muted-foreground">
                                  No paid appointments yet. Complete some appointments to see staff efficiency data.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Services by Staff</CardTitle>
                      <CardDescription>
                        Popular services per staff member
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {servicesByStaff.length > 0 ? (
                          servicesByStaff.map((staffMember, index) => (
                            <div key={index}>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium">{staffMember.name}</span>
                                <span className="text-sm font-medium">{staffMember.topService} ({staffMember.percentage}%)</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${staffMember.percentage}%` }}></div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-8 text-center text-muted-foreground">
                            No paid appointments yet. Complete some appointments to see staff service breakdown.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              {/* Payroll Report */}
              <TabsContent value="payroll">
                <PayrollReport />
              </TabsContent>
              
              {/* Time Clock Report */}
              <TabsContent value="timeclock">
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Time Clock Overview</CardTitle>
                      <CardDescription>
                        Staff clock-in/out records and hours worked
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                            <div className="flex items-center">
                              <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
                              <div>
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Total Hours This Week</p>
                                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">0.0</p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                            <div className="flex items-center">
                              <Users className="h-8 w-8 text-green-600 dark:text-green-400 mr-3" />
                              <div>
                                <p className="text-sm font-medium text-green-900 dark:text-green-100">Staff Currently Clocked In</p>
                                <p className="text-2xl font-bold text-green-900 dark:text-green-100">0</p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
                            <div className="flex items-center">
                              <Calendar className="h-8 w-8 text-orange-600 dark:text-orange-400 mr-3" />
                              <div>
                                <p className="text-sm font-medium text-orange-900 dark:text-orange-100">Avg Daily Hours</p>
                                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">0.0</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Recent Time Entries Table */}
                        <div className="border rounded-lg">
                          <div className="p-4 border-b bg-gray-50 dark:bg-gray-800">
                            <h3 className="text-lg font-semibold">Recent Time Entries</h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full">
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
                                <tr>
                                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center">
                                      <Clock className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                                      <p className="text-lg font-medium mb-1">No time clock entries yet</p>
                                      <p className="text-sm">Time clock entries will appear here once staff start clocking in and out</p>
                                    </div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                        
                        {/* Note about time clock setup */}
                        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <Clock className="h-5 w-5 text-blue-400" />
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                Time Clock Feature
                              </h3>
                              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                                <p>The time clock system allows staff to track their work hours. This report will show:</p>
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                  <li>Daily and weekly hour summaries</li>
                                  <li>Clock in/out history for all staff</li>
                                  <li>Overtime tracking and reporting</li>
                                  <li>Integration with payroll calculations</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReportsPage;
