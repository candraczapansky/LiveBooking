import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, TrendingUpIcon, UsersIcon, DollarSignIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TipAnalytics {
  staffTipSummary: Array<{
    staff_id: number;
    staff_name: string;
    tip_transactions: number;
    total_tips: number;
    average_tip: number;
    min_tip: number;
    max_tip: number;
    total_revenue: number;
    tip_percentage: number;
  }>;
  overallStats: {
    total_tip_transactions: number;
    grand_total_tips: number;
    overall_average_tip: number;
    total_revenue_with_tips: number;
    overall_tip_percentage: number;
  };
  dailyTipTrend: Array<{
    date: string;
    daily_tips: number;
    daily_tip_transactions: number;
    daily_average_tip: number;
  }>;
  tipDistribution: Array<{
    tip_range: string;
    transaction_count: number;
    total_amount: number;
  }>;
}

interface TipTransaction {
  id: number;
  transaction_date: string;
  tip_amount: number;
  total_amount: number;
  transaction_type: string;
  payment_method: string;
  client_id: number;
  client_name: string;
  appointment_id?: number;
  service_name?: string;
  tip_percentage: number;
}

interface TipSummary {
  totalTips: number;
  totalRevenue: number;
  averageTip: number;
  tipPercentage: number;
  transactionCount: number;
}

export function TipTrackingDashboard() {
  const [analytics, setAnalytics] = useState<TipAnalytics | null>(null);
  const [transactions, setTransactions] = useState<TipTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Date range state
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  // Filter state
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'analytics' | 'transactions'>('analytics');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(20);

  useEffect(() => {
    fetchTipAnalytics();
  }, [startDate, endDate, selectedStaff, selectedLocation]);

  const fetchTipAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      if (selectedStaff !== 'all') {
        params.append('staff_id', selectedStaff);
      }

      if (selectedLocation !== 'all') {
        params.append('location_id', selectedLocation);
      }

      const response = await fetch(`/api/tips/analytics?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tip analytics');
      }

      const data = await response.json();
      setAnalytics(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchTipTransactions = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        page: page.toString(),
        limit: pageSize.toString(),
      });

      if (selectedStaff !== 'all') {
        params.append('staff_id', selectedStaff);
      }

      const response = await fetch(`/api/tips/transactions?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tip transactions');
      }

      const data = await response.json();
      setTransactions(data.transactions);
      setTotalPages(data.totalPages);
      setCurrentPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (range: { from: Date; to: Date }) => {
    setDateRange(range);
    if (range.from && range.to) {
      setStartDate(range.from);
      setEndDate(range.to);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading tip analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchTipAnalytics}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tip Tracking Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor tip performance, staff earnings, and payment trends
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'analytics' ? 'default' : 'outline'}
            onClick={() => setViewMode('analytics')}
          >
            Analytics
          </Button>
          <Button
            variant={viewMode === 'transactions' ? 'default' : 'outline'}
            onClick={() => setViewMode('transactions')}
          >
            Transactions
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Customize your tip tracking view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range) => range && handleDateRangeChange(range)}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Staff Filter */}
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {analytics?.staffTipSummary.map((staff) => (
                    <SelectItem key={staff.staff_id} value={staff.staff_id.toString()}>
                      {staff.staff_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location Filter */}
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="1">Main Location</SelectItem>
                  <SelectItem value="2">Secondary Location</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Refresh Button */}
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button onClick={fetchTipAnalytics} className="w-full">
                Refresh Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewMode === 'analytics' ? (
        /* Analytics View */
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tips</CardTitle>
                <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics ? formatCurrency(analytics.overallStats.grand_total_tips) : '$0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.overallStats.total_tip_transactions || 0} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Tip</CardTitle>
                <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics ? formatCurrency(analytics.overallStats.overall_average_tip) : '$0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics ? formatPercentage(analytics.overallStats.overall_tip_percentage) : '0%'} of revenue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics ? formatCurrency(analytics.overallStats.total_revenue_with_tips) : '$0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Including tips
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics?.staffTipSummary.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  With tip earnings
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Staff Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Staff Tip Performance</CardTitle>
              <CardDescription>
                Individual staff member tip earnings and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.staffTipSummary.map((staff) => (
                  <div key={staff.staff_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-semibold">{staff.staff_name}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{staff.tip_transactions} transactions</span>
                        <span>•</span>
                        <span>Avg: {formatCurrency(staff.average_tip)}</span>
                        <span>•</span>
                        <span>Range: {formatCurrency(staff.min_tip)} - {formatCurrency(staff.max_tip)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(staff.total_tips)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatPercentage(staff.tip_percentage)} of revenue
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tip Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tip Distribution</CardTitle>
                <CardDescription>
                  Distribution of tip amounts across different ranges
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.tipDistribution.map((range) => (
                    <div key={range.tip_range} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{range.tip_range}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {range.transaction_count} transactions
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatCurrency(range.total_amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Tip Trend</CardTitle>
                <CardDescription>
                  Tip earnings trend over the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.dailyTipTrend.slice(-7).map((day) => (
                    <div key={day.date} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {format(new Date(day.date), 'MMM dd')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {day.daily_tip_transactions} transactions
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatCurrency(day.daily_tips)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Avg: {formatCurrency(day.daily_average_tip)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Transactions View */
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tip Transactions</CardTitle>
              <CardDescription>
                Detailed view of all tip transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{transaction.client_name}</h4>
                        <Badge variant="outline">{transaction.transaction_type}</Badge>
                        <Badge variant="secondary">{transaction.payment_method}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {transaction.service_name && (
                          <span>Service: {transaction.service_name}</span>
                        )}
                        {transaction.appointment_id && (
                          <span> • Appointment #{transaction.appointment_id}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(transaction.transaction_date), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(transaction.tip_amount)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatPercentage(transaction.tip_percentage)} of {formatCurrency(transaction.total_amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchTipTransactions(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchTipTransactions(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
