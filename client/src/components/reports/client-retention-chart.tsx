import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  PieChart as RechartsCircleChart,
  Pie,
  Cell
} from "recharts";
import { Calendar, RefreshCw, Download, TrendingUp, Users } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface RetentionData {
  retained_clients: number;
  total_previous_clients: number;
  total_current_clients: number;
  retention_rate: number;
}

interface RetentionChartProps {
  timePeriod: string;
  customStartDate?: string;
  customEndDate?: string;
}

const ClientRetentionChart: React.FC<RetentionChartProps> = ({
  timePeriod,
  customStartDate,
  customEndDate
}) => {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [localStartDate, setLocalStartDate] = useState(customStartDate || "");
  const [localEndDate, setLocalEndDate] = useState(customEndDate || "");

  // Calculate date range based on time period
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    switch (timePeriod) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case "quarter":
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case "year":
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case "custom":
        if (localStartDate && localEndDate) {
          startDate = new Date(localStartDate);
          endDate = new Date(localEndDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        }
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  // Fetch client retention data
  const { data: retentionData, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/reports/clients/retention", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const response = await fetch(
        `/api/reports/clients/retention?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch client retention data');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  // Prepare chart data
  const retentionInfo = retentionData?.data as RetentionData;
  
  const barChartData = retentionInfo ? [
    {
      name: 'Previous Period',
      clients: retentionInfo.total_previous_clients,
      retained: retentionInfo.retained_clients,
      lost: retentionInfo.total_previous_clients - retentionInfo.retained_clients
    },
    {
      name: 'Current Period',
      clients: retentionInfo.total_current_clients,
      retained: retentionInfo.retained_clients,
      new: retentionInfo.total_current_clients - retentionInfo.retained_clients
    }
  ] : [];

  const pieChartData = retentionInfo ? [
    {
      name: 'Retained Clients',
      value: retentionInfo.retained_clients,
      color: '#10B981'
    },
    {
      name: 'Lost Clients',
      value: retentionInfo.total_previous_clients - retentionInfo.retained_clients,
      color: '#EF4444'
    },
    {
      name: 'New Clients',
      value: retentionInfo.total_current_clients - retentionInfo.retained_clients,
      color: '#3B82F6'
    }
  ] : [];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Export data as CSV
  const exportToCSV = () => {
    if (!retentionInfo) return;

    const csvContent = [
      ['Metric', 'Value'],
      ['Retention Rate', `${retentionInfo.retention_rate.toFixed(2)}%`],
      ['Retained Clients', retentionInfo.retained_clients],
      ['Total Previous Clients', retentionInfo.total_previous_clients],
      ['Total Current Clients', retentionInfo.total_current_clients],
      ['Lost Clients', retentionInfo.total_previous_clients - retentionInfo.retained_clients],
      ['New Clients', retentionInfo.total_current_clients - retentionInfo.retained_clients]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client-retention-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Client Retention Rate</CardTitle>
            <CardDescription>
              Analysis of client retention between periods
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {timePeriod === "custom" && (
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Calendar className="h-4 w-4 mr-2" />
                    Custom Range
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={localStartDate}
                        onChange={(e) => setLocalStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={localEndDate}
                        onChange={(e) => setLocalEndDate(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-between gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setLocalStartDate("");
                          setLocalEndDate("");
                          setDatePopoverOpen(false);
                        }}
                      >
                        Clear
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => setDatePopoverOpen(false)}
                        disabled={!localStartDate || !localEndDate}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isLoading}
              className="h-8"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToCSV}
              disabled={!retentionInfo}
              className="h-8"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <Alert className="mb-4">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Loading client retention data...
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <AlertDescription>
              Error loading client retention data: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {retentionInfo ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">
                  {retentionInfo.retention_rate.toFixed(1)}%
                </div>
                <div className="text-sm text-green-600 font-medium">
                  Retention Rate
                </div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">
                  {retentionInfo.retained_clients}
                </div>
                <div className="text-sm text-blue-600 font-medium">
                  Retained Clients
                </div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <Users className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-600">
                  {retentionInfo.total_previous_clients}
                </div>
                <div className="text-sm text-yellow-600 font-medium">
                  Previous Clients
                </div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-600">
                  {retentionInfo.total_current_clients}
                </div>
                <div className="text-sm text-purple-600 font-medium">
                  Current Clients
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Client Comparison</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="clients" fill="#6B7280" name="Total Clients" />
                    <Bar dataKey="retained" fill="#10B981" name="Retained" />
                    <Bar dataKey="lost" fill="#EF4444" name="Lost" />
                    <Bar dataKey="new" fill="#3B82F6" name="New" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Client Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsCircleChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percentage }) => `${name}: ${value} (${percentage.toFixed(1)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsCircleChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Additional Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Client Loss Analysis
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>Lost Clients: {retentionInfo.total_previous_clients - retentionInfo.retained_clients}</p>
                  <p>Loss Rate: {retentionInfo.total_previous_clients > 0 ? 
                    (((retentionInfo.total_previous_clients - retentionInfo.retained_clients) / retentionInfo.total_previous_clients) * 100).toFixed(1) : 0}%</p>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Growth Analysis
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>New Clients: {retentionInfo.total_current_clients - retentionInfo.retained_clients}</p>
                  <p>Growth Rate: {retentionInfo.total_previous_clients > 0 ? 
                    (((retentionInfo.total_current_clients - retentionInfo.total_previous_clients) / retentionInfo.total_previous_clients) * 100).toFixed(1) : 0}%</p>
                </div>
              </div>
            </div>

            {/* Period Information */}
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <p>Previous Period: {new Date(startDate.getTime() - (30 * 24 * 60 * 60 * 1000)).toLocaleDateString()} - {startDate.toLocaleDateString()}</p>
              <p>Current Period: {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-lg font-medium mb-2">No Data Available</div>
              <div className="text-sm">
                No retention data found for the selected time period
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientRetentionChart; 