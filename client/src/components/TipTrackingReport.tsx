import React, { useState, useEffect, useRef } from 'react';
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
import { CalendarIcon, DownloadIcon, PrinterIcon, FileTextIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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

interface TipTrackingReportProps {
  className?: string;
}

export function TipTrackingReport({ className = '' }: TipTrackingReportProps) {
  const [analytics, setAnalytics] = useState<TipAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Report configuration
  const [reportTitle, setReportTitle] = useState('Tip Tracking Report');
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'staff'>('summary');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeTransactions, setIncludeTransactions] = useState(false);
  
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

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (startDate && endDate) {
      fetchTipAnalytics();
    }
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

  const generatePDF = async () => {
    if (!reportRef.current) return;
    
    try {
      // This would integrate with a PDF generation library like jsPDF or html2pdf
      // For now, we'll just print the report
      window.print();
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const printReport = () => {
    window.print();
  };

  const exportToCSV = () => {
    if (!analytics) return;
    
    try {
      // Generate CSV data
      let csvContent = 'data:text/csv;charset=utf-8,';
      
      if (reportType === 'summary') {
        csvContent += 'Metric,Value\n';
        csvContent += `Total Tips,${analytics.overallStats.grand_total_tips}\n`;
        csvContent += `Total Transactions,${analytics.overallStats.total_tip_transactions}\n`;
        csvContent += `Average Tip,${analytics.overallStats.overall_average_tip}\n`;
        csvContent += `Tip Percentage,${analytics.overallStats.overall_tip_percentage}%\n`;
        csvContent += `Total Revenue,${analytics.overallStats.total_revenue_with_tips}\n`;
      } else if (reportType === 'staff') {
        csvContent += 'Staff Name,Total Tips,Transactions,Average Tip,Tip Percentage\n';
        analytics.staffTipSummary.forEach(staff => {
          csvContent += `${staff.staff_name},${staff.total_tips},${staff.tip_transactions},${staff.average_tip},${staff.tip_percentage}%\n`;
        });
      } else if (reportType === 'detailed') {
        csvContent += 'Date,Daily Tips,Transactions,Average Tip\n';
        analytics.dailyTipTrend.forEach(day => {
          csvContent += `${day.date},${day.daily_tips},${day.daily_tip_transactions},${day.daily_average_tip}\n`;
        });
      }
      
      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `tip-tracking-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  if (loading && !analytics) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading tip analytics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchTipAnalytics}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>Customize your tip tracking report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Report Title */}
            <div className="space-y-2">
              <Label>Report Title</Label>
              <Input
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Enter report title"
              />
            </div>

            {/* Report Type */}
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary Report</SelectItem>
                  <SelectItem value="detailed">Detailed Report</SelectItem>
                  <SelectItem value="staff">Staff Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
          </div>

          {/* Report Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeCharts"
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="includeCharts">Include Charts</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeTransactions"
                checked={includeTransactions}
                onChange={(e) => setIncludeTransactions(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="includeTransactions">Include Transactions</Label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-6">
            <Button onClick={fetchTipAnalytics} variant="outline">
              Refresh Data
            </Button>
            <Button onClick={generatePDF} className="flex items-center gap-2">
              <DownloadIcon className="h-4 w-4" />
              Generate PDF
            </Button>
            <Button onClick={printReport} className="flex items-center gap-2">
              <PrinterIcon className="h-4 w-4" />
              Print Report
            </Button>
            <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
              <FileTextIcon className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      <div ref={reportRef} className="space-y-6 print:space-y-4">
        {/* Report Header */}
        <Card className="print:shadow-none print:border-0">
          <CardContent className="pt-6 text-center">
            <h1 className="text-3xl font-bold mb-2">{reportTitle}</h1>
            <p className="text-lg text-muted-foreground mb-4">
              {format(startDate, 'MMMM dd, yyyy')} - {format(endDate, 'MMMM dd, yyyy')}
            </p>
            <p className="text-sm text-muted-foreground">
              Generated on {format(new Date(), 'MMMM dd, yyyy at HH:mm')}
            </p>
          </CardContent>
        </Card>

        {/* Executive Summary */}
        <Card className="print:shadow-none print:border-0">
          <CardHeader>
            <CardTitle>Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {analytics ? formatCurrency(analytics.overallStats.grand_total_tips) : '$0.00'}
                </div>
                <div className="text-sm text-muted-foreground">Total Tips Collected</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {analytics?.overallStats.total_tip_transactions || 0}
                </div>
                <div className="text-sm text-muted-foreground">Tip Transactions</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">
                  {analytics ? formatCurrency(analytics.overallStats.overall_average_tip) : '$0.00'}
                </div>
                <div className="text-sm text-muted-foreground">Average Tip Amount</div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Key Insights</h3>
              <ul className="space-y-1 text-sm">
                <li>• Tips represent {analytics ? formatPercentage(analytics.overallStats.overall_tip_percentage) : '0%'} of total revenue</li>
                <li>• {analytics?.staffTipSummary.length || 0} staff members received tips during this period</li>
                <li>• Average tip per transaction: {analytics ? formatCurrency(analytics.overallStats.overall_average_tip) : '$0.00'}</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Staff Performance */}
        {reportType === 'staff' || reportType === 'detailed' ? (
          <Card className="print:shadow-none print:border-0">
            <CardHeader>
              <CardTitle>Staff Tip Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left">Staff Member</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Total Tips</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Transactions</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Average Tip</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Tip Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics?.staffTipSummary.map((staff) => (
                      <tr key={staff.staff_id}>
                        <td className="border border-gray-300 px-4 py-2 font-medium">
                          {staff.staff_name}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          {formatCurrency(staff.total_tips)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          {staff.tip_transactions}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          {formatCurrency(staff.average_tip)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          {formatPercentage(staff.tip_percentage)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Tip Distribution */}
        {includeCharts && (
          <Card className="print:shadow-none print:border-0">
            <CardHeader>
              <CardTitle>Tip Distribution Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.tipDistribution.map((range) => (
                  <div key={range.tip_range} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{range.tip_range}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {range.transaction_count} transactions
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(range.total_amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {analytics ? formatPercentage((range.total_amount / analytics.overallStats.grand_total_tips) * 100) : '0%'} of total tips
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily Trends */}
        {reportType === 'detailed' && (
          <Card className="print:shadow-none print:border-0">
            <CardHeader>
              <CardTitle>Daily Tip Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Daily Tips</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Transactions</th>
                      <th className="border border-gray-300 px-4 py-2 text-right">Average Tip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics?.dailyTipTrend.map((day) => (
                      <tr key={day.date}>
                        <td className="border border-gray-300 px-4 py-2">
                          {format(new Date(day.date), 'MMM dd, yyyy')}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          {formatCurrency(day.daily_tips)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          {day.daily_tip_transactions}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-right">
                          {formatCurrency(day.daily_average_tip)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report Footer */}
        <Card className="print:shadow-none print:border-0">
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            <p>This report was generated automatically by the Tip Tracking System</p>
            <p className="mt-1">For questions or support, please contact your system administrator</p>
          </CardContent>
        </Card>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-0 {
            border: none !important;
          }
          .print\\:space-y-4 > * + * {
            margin-top: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}
