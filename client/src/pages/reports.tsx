import React, { useState } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useSidebar } from "@/contexts/SidebarContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    const startDate = new Date(customStartDate);
    const endDate = new Date(customEndDate);
    // Set end date to end of day (23:59:59.999) to include all transactions from that day
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }
  
  const now = new Date();
  const startDate = new Date();
  
  switch (timePeriod) {
    case "week":
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(now.getMonth() - 1);
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
  
  return { startDate, endDate: now };
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

// Specific Report View Component
const SpecificReportView = ({ 
  reportType, 
  timePeriod, 
  customStartDate, 
  customEndDate 
}: { 
  reportType: string; 
  timePeriod: string; 
  customStartDate: string; 
  customEndDate: string; 
}) => {
  // Generate reports based on type
  switch (reportType) {
    case "sales":
      return <SalesReport timePeriod={timePeriod} customStartDate={customStartDate} customEndDate={customEndDate} />;
    case "clients": 
      return <ClientsReport timePeriod={timePeriod} customStartDate={customStartDate} customEndDate={customEndDate} />;
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

const SalesReport = ({ timePeriod, customStartDate, customEndDate }: { 
  timePeriod: string; 
  customStartDate?: string; 
  customEndDate?: string; 
}) => {
  const { data: salesHistory = [] } = useQuery({ queryKey: ["/api/sales-history"] });
  const { startDate, endDate } = getDateRange(timePeriod, customStartDate, customEndDate);
  
  // Filter sales by date range and completed status
  const filteredSales = (salesHistory as any[]).filter((sale: any) => {
    const saleDate = new Date(sale.transactionDate || sale.transaction_date);
    return saleDate >= startDate && saleDate <= endDate && 
           (sale.paymentStatus === "completed" || sale.payment_status === "completed");
  });
  
  const totalRevenue = filteredSales.reduce((sum: number, sale: any) => sum + (sale.totalAmount || sale.total_amount || 0), 0);
  const totalTransactions = filteredSales.length;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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
      </div>
    </div>
  );
};

const ClientsReport = ({ timePeriod, customStartDate, customEndDate }: { 
  timePeriod: string; 
  customStartDate?: string; 
  customEndDate?: string; 
}) => {
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

const ServicesReport = ({ timePeriod, customStartDate, customEndDate }: { 
  timePeriod: string; 
  customStartDate?: string; 
  customEndDate?: string; 
}) => {
  const { data: services = [] } = useQuery({ queryKey: ["/api/services"] });
  const { data: appointments = [] } = useQuery({ queryKey: ["/api/appointments"] });
  const { data: payments = [] } = useQuery({ queryKey: ["/api/payments"] });
  const { data: salesHistory = [] } = useQuery({ queryKey: ["/api/sales-history"] });

  const { startDate, endDate } = getDateRange(timePeriod, customStartDate, customEndDate);

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

const StaffReport = ({ timePeriod, customStartDate, customEndDate }: { 
  timePeriod: string; 
  customStartDate?: string; 
  customEndDate?: string; 
}) => {
  const { data: staff = [] } = useQuery({ queryKey: ["/api/staff"] });
  const { data: appointments = [] } = useQuery({ queryKey: ["/api/appointments"] });
  const { data: services = [] } = useQuery({ queryKey: ["/api/services"] });
  const { data: payments = [] } = useQuery({ queryKey: ["/api/payments"] });
  const { data: salesHistory = [] } = useQuery({ queryKey: ["/api/sales-history"] });

  const { startDate, endDate } = getDateRange(timePeriod, customStartDate, customEndDate);

  // Filter data by date range
  const filteredAppointments = (appointments as any[]).filter((apt: any) => {
    const aptDate = new Date(apt.date);
    return aptDate >= startDate && aptDate <= endDate;
  });

  const filteredPayments = (payments as any[]).filter((payment: any) => {
    const paymentDate = new Date(payment.createdAt || payment.paymentDate);
    return paymentDate >= startDate && paymentDate <= endDate && payment.status === 'completed';
  });

  const filteredSalesHistory = (salesHistory as any[]).filter((sale: any) => {
    const saleDate = new Date(sale.transactionDate);
    return saleDate >= startDate && saleDate <= endDate;
  });

  // Calculate staff performance metrics
  const calculateStaffMetrics = () => {
    const staffMetrics = (staff as any[]).map((staffMember: any) => {
      const staffAppointments = filteredAppointments.filter(
        (apt: any) => apt.staffId === staffMember.id
      );
      
      const staffSales = filteredSalesHistory.filter(
        (sale: any) => sale.staffId === staffMember.id && sale.transactionType === 'appointment'
      );

      const completedAppointments = staffAppointments.filter(
        (apt: any) => apt.status === 'completed' || apt.paymentStatus === 'paid'
      );

      const totalRevenue = staffSales.reduce((sum: number, sale: any) => {
        const amount = Number(sale.totalAmount) || 0;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      const totalServices = completedAppointments.length;
      const averageTicket = totalServices > 0 && totalRevenue > 0 ? totalRevenue / totalServices : 0;

      // Calculate utilization (assuming 8-hour workday, 5 days a week)
      const totalWorkingHours = timePeriod === "week" ? 40 : 
                               timePeriod === "month" ? 160 : 
                               timePeriod === "quarter" ? 480 : 640;
      
      const serviceHours = completedAppointments.reduce((sum: number, apt: any) => {
        const service = (services as any[]).find((s: any) => s.id === apt.serviceId);
        const duration = Number(service?.duration) || 60;
        const hours = isNaN(duration) ? 1 : duration / 60; // Convert minutes to hours
        return sum + hours;
      }, 0);

      const utilization = totalWorkingHours > 0 && serviceHours >= 0 ? 
        Math.min((serviceHours / totalWorkingHours) * 100, 100) : 0;

      // Ensure all calculated values are valid numbers
      const safeUtilization = isNaN(utilization) || utilization < 0 ? 0 : Math.min(utilization, 100);
      const safeAverageTicket = isNaN(averageTicket) || averageTicket < 0 ? 0 : averageTicket;
      const safeTotalRevenue = isNaN(totalRevenue) || totalRevenue < 0 ? 0 : totalRevenue;
      const safeServiceHours = isNaN(serviceHours) || serviceHours < 0 ? 0 : serviceHours;
      const safeCommissionRate = Number(staffMember.commissionRate) || 0;
      const safeCommissionEarnings = isNaN(safeTotalRevenue * safeCommissionRate) ? 0 : safeTotalRevenue * safeCommissionRate;

      return {
        id: staffMember.id,
        name: `${staffMember.user?.firstName || ''} ${staffMember.user?.lastName || ''}`.trim() || 'Unknown',
        title: staffMember.title,
        totalAppointments: staffAppointments.length,
        completedAppointments: completedAppointments.length,
        totalRevenue: safeTotalRevenue,
        averageTicket: safeAverageTicket,
        utilization: safeUtilization,
        serviceHours: safeServiceHours,
        commissionRate: safeCommissionRate,
        commissionEarnings: safeCommissionEarnings
      };
    });

    return staffMetrics.sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  const staffMetrics = calculateStaffMetrics();

  // Calculate overall stats
  const totalStaff = (staff as any[]).length;
  const totalRevenue = staffMetrics.reduce((sum, staff) => sum + staff.totalRevenue, 0);
  const totalAppointments = staffMetrics.reduce((sum, staff) => sum + staff.completedAppointments, 0);
  const averageUtilization = staffMetrics.length > 0 ? 
    staffMetrics.reduce((sum, staff) => sum + staff.utilization, 0) / staffMetrics.length : 0;

  // Prepare chart data with safe number conversion
  const performanceChartData = staffMetrics.slice(0, 10).map(staff => ({
    name: staff.name,
    revenue: Number(staff.totalRevenue) || 0,
    appointments: Number(staff.completedAppointments) || 0,
    utilization: Math.round(Number(staff.utilization) || 0)
  }));

  const utilizationData = staffMetrics.map(staff => ({
    name: staff.name,
    utilization: Math.round(Number(staff.utilization) || 0),
    hours: Math.round((Number(staff.serviceHours) || 0) * 10) / 10
  }));

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary/10 rounded-md p-3">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Staff
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {totalStaff}
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
                    Total Revenue
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
                <Scissors className="h-5 w-5 text-primary" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Services
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {totalAppointments}
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
                    Avg Utilization
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {Math.round(averageUtilization)}%
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Staff Performance Overview</CardTitle>
            <CardDescription>Revenue and appointments by staff member</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis yAxisId="revenue" orientation="left" />
                <YAxis yAxisId="appointments" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar 
                  yAxisId="revenue" 
                  dataKey="revenue" 
                  fill="hsl(var(--primary))" 
                  name="Revenue ($)"
                />
                <Bar 
                  yAxisId="appointments" 
                  dataKey="appointments" 
                  fill="hsl(var(--primary)/0.6)" 
                  name="Appointments"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff Utilization</CardTitle>
            <CardDescription>Utilization percentage by staff member</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={utilizationData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'utilization' ? `${value}%` : `${value}h`,
                    name === 'utilization' ? 'Utilization' : 'Service Hours'
                  ]}
                />
                <Bar 
                  dataKey="utilization" 
                  fill="hsl(var(--primary))" 
                  name="Utilization %"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Staff Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Staff Metrics</CardTitle>
          <CardDescription>Detailed performance and productivity metrics for each staff member</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Staff Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Appointments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Avg Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Utilization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Commission
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {staffMetrics.map((staff, index) => (
                  <tr key={staff.id} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {staff.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {staff.title}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {staff.completedAppointments}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round(staff.serviceHours * 10) / 10}h
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatPrice(staff.totalRevenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatPrice(staff.averageTicket)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${Math.min(staff.utilization, 100)}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                          {Math.round(staff.utilization)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {formatPrice(staff.commissionEarnings)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {(staff.commissionRate * 100).toFixed(1)}% rate
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

const TimeClockReport = ({ timePeriod, customStartDate, customEndDate }: { 
  timePeriod: string; 
  customStartDate?: string; 
  customEndDate?: string; 
}) => {
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
  const { isOpen: sidebarOpen } = useSidebar();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarOpen ? "ml-64" : "ml-16"
      }`}>
        <Header />
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
                    </div>
                    
                    <Button variant="outline" className="w-full sm:w-auto min-h-[44px]">
                      Export Report
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            {selectedReport ? (
              <SpecificReportView 
                reportType={selectedReport} 
                timePeriod={timePeriod}
                customStartDate={customStartDate}
                customEndDate={customEndDate}
              />
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