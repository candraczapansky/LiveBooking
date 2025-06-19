import React, { useState, useEffect } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useDocumentTitle } from "@/hooks/use-document-title";
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
  PieChart
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

// Sample data for sales report
const salesData = [
  { name: 'Jan', revenue: 12000, expenses: 8000 },
  { name: 'Feb', revenue: 15000, expenses: 8200 },
  { name: 'Mar', revenue: 18000, expenses: 9000 },
  { name: 'Apr', revenue: 16500, expenses: 8500 },
  { name: 'May', revenue: 19000, expenses: 9200 },
  { name: 'Jun', revenue: 22000, expenses: 10000 },
];

// Sample data for client report
const clientData = [
  { name: 'Jan', new: 25, returning: 120 },
  { name: 'Feb', new: 30, returning: 125 },
  { name: 'Mar', new: 35, returning: 130 },
  { name: 'Apr', new: 28, returning: 135 },
  { name: 'May', new: 32, returning: 140 },
  { name: 'Jun', new: 40, returning: 145 },
];

// Sample data for services report
const serviceData = [
  { name: 'Haircut & Style', value: 35 },
  { name: 'Color Services', value: 25 },
  { name: 'Treatments', value: 15 },
  { name: 'Massage', value: 15 },
  { name: 'Facials', value: 10 },
];

// Sample data for staff performance
const staffData = [
  { name: 'Jessica', appointments: 85, revenue: 4500 },
  { name: 'David', appointments: 72, revenue: 3800 },
  { name: 'Amanda', appointments: 68, revenue: 3600 },
  { name: 'Michael', appointments: 55, revenue: 2900 },
  { name: 'Sarah', appointments: 45, revenue: 2400 },
];

const ReportsPage = () => {
  useDocumentTitle("Reports | BeautyBook");
  const [timePeriod, setTimePeriod] = useState("month");
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  // This would be calculated from real data in a production app
  const totalRevenue = 98500;
  const totalExpenses = 53000;
  const totalProfit = totalRevenue - totalExpenses;
  
  const totalClients = 450;
  const newClients = 62;
  const clientRetentionRate = 85;
  
  const totalAppointments = 1250;
  const appointmentCompletionRate = 94;

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
                    <div className="flex-shrink-0 bg-purple-100 dark:bg-purple-900 rounded-md p-3">
                      <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Total Appointments
                        </dt>
                        <dd className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {totalAppointments}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Report Tabs */}
            <Tabs defaultValue="sales">
              <TabsList className="mb-6">
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
                            <tr className="border-b">
                              <td className="py-3">Haircut & Style</td>
                              <td className="text-right py-3">420</td>
                              <td className="text-right py-3">45 min</td>
                              <td className="text-right py-3">{formatPrice(27300)}</td>
                              <td className="text-right py-3 text-green-600">+12%</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-3">Color Services</td>
                              <td className="text-right py-3">310</td>
                              <td className="text-right py-3">120 min</td>
                              <td className="text-right py-3">{formatPrice(46500)}</td>
                              <td className="text-right py-3 text-green-600">+8%</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-3">Treatments</td>
                              <td className="text-right py-3">185</td>
                              <td className="text-right py-3">60 min</td>
                              <td className="text-right py-3">{formatPrice(13875)}</td>
                              <td className="text-right py-3 text-green-600">+15%</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-3">Massage</td>
                              <td className="text-right py-3">175</td>
                              <td className="text-right py-3">60 min</td>
                              <td className="text-right py-3">{formatPrice(12250)}</td>
                              <td className="text-right py-3 text-red-600">-2%</td>
                            </tr>
                            <tr>
                              <td className="py-3">Facials</td>
                              <td className="text-right py-3">160</td>
                              <td className="text-right py-3">45 min</td>
                              <td className="text-right py-3">{formatPrice(9600)}</td>
                              <td className="text-right py-3 text-green-600">+5%</td>
                            </tr>
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
                            <tr className="border-b">
                              <td className="py-3">Jessica Taylor</td>
                              <td className="text-right py-3">4.3</td>
                              <td className="text-right py-3">92%</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-3">David Miller</td>
                              <td className="text-right py-3">3.6</td>
                              <td className="text-right py-3">85%</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-3">Amanda Lee</td>
                              <td className="text-right py-3">3.4</td>
                              <td className="text-right py-3">78%</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-3">Michael Johnson</td>
                              <td className="text-right py-3">2.8</td>
                              <td className="text-right py-3">65%</td>
                            </tr>
                            <tr>
                              <td className="py-3">Sarah Williams</td>
                              <td className="text-right py-3">2.3</td>
                              <td className="text-right py-3">54%</td>
                            </tr>
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
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Jessica Taylor</span>
                            <span className="text-sm font-medium">Color Services (65%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div className="bg-primary h-2.5 rounded-full" style={{ width: "65%" }}></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">David Miller</span>
                            <span className="text-sm font-medium">Men's Cuts (78%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div className="bg-primary h-2.5 rounded-full" style={{ width: "78%" }}></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Amanda Lee</span>
                            <span className="text-sm font-medium">Facials (82%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div className="bg-primary h-2.5 rounded-full" style={{ width: "82%" }}></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Michael Johnson</span>
                            <span className="text-sm font-medium">Massage (90%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div className="bg-primary h-2.5 rounded-full" style={{ width: "90%" }}></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              {/* Payroll Report */}
              <TabsContent value="payroll">
                <PayrollReport />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReportsPage;
