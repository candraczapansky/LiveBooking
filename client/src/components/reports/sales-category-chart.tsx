import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  PieChart as RechartsCircleChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";
import { Calendar, RefreshCw, Download } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface SalesCategoryData {
  category_name: string;
  total_revenue: number;
  transaction_count: number;
  percentage: number;
}

interface SalesCategoryChartProps {
  timePeriod: string;
  customStartDate?: string;
  customEndDate?: string;
  selectedLocation?: string;
}

const SalesCategoryChart: React.FC<SalesCategoryChartProps> = ({
  timePeriod,
  customStartDate,
  customEndDate,
  selectedLocation
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
      case "day":
        // Today: start at the beginning of the current day
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case "yesterday": {
        const y = new Date(now);
        y.setDate(now.getDate() - 1);
        startDate = new Date(y.getFullYear(), y.getMonth(), y.getDate());
        endDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
        break;
      }
      case "week":
        // Last 7 full days ending today
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case "month":
        // This Month: start at the first day of the current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
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

  // Fetch sales by category data
  const { data: salesData, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/reports/sales/category", startDate.toISOString(), endDate.toISOString(), selectedLocation],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });
      
      if (selectedLocation && selectedLocation !== 'all') {
        params.append('location_id', selectedLocation);
      }
      
      const response = await fetch(
        `/api/reports/sales/category?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch sales category data');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  // Prepare chart data
  const chartData = salesData?.data?.map((item: SalesCategoryData) => ({
    name: item.category_name,
    value: Number(item.total_revenue || 0),
    revenue: Number(item.total_revenue || 0),
    transactions: Number(item.transaction_count || 0),
    percentage: Number(item.percentage || 0)
  })) || [];

  // Generate colors for pie chart
  const COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];

  // Custom tooltip for the pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {data.name}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Revenue: {formatPrice(data.revenue)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Transactions: {data.transactions}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Percentage: {Number(data.percentage).toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Export data as CSV
  const exportToCSV = () => {
    if (!salesData?.data) return;

    const csvContent = [
      ['Category', 'Revenue', 'Transactions', 'Percentage'],
      ...salesData.data.map((item: SalesCategoryData) => [
        item.category_name,
        formatPrice(item.total_revenue),
        item.transaction_count,
        `${item.percentage.toFixed(1)}%`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-by-category-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv`;
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
            <CardTitle>Sales by Category</CardTitle>
            <CardDescription>
              Revenue breakdown by service and product categories
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
              disabled={!salesData?.data}
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
              Loading sales category data...
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <AlertDescription>
              Error loading sales category data: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {chartData.length > 0 ? (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <RechartsCircleChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry: any, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </RechartsCircleChart>
            </ResponsiveContainer>

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatPrice(chartData.reduce((sum: number, item: any) => sum + item.revenue, 0))}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Revenue
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {chartData.reduce((sum: number, item: any) => sum + item.transactions, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Transactions
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {chartData.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Categories
                </div>
              </div>
            </div>

            {/* Period Information */}
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Period: {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="text-lg font-medium mb-2">No Data Available</div>
              <div className="text-sm">
                No sales data found for the selected time period
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SalesCategoryChart; 