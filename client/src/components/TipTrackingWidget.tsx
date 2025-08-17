import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUpIcon, DollarSignIcon, UsersIcon, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface TipSummary {
  totalTips: number;
  totalRevenue: number;
  averageTip: number;
  tipPercentage: number;
  transactionCount: number;
}

interface TipTrend {
  period: string;
  totalTips: number;
  transactionCount: number;
  averageTip: number;
}

interface TipTrackingWidgetProps {
  period?: 'today' | 'week' | 'month' | 'year';
  showTrends?: boolean;
  compact?: boolean;
  className?: string;
}

export function TipTrackingWidget({ 
  period = 'week', 
  showTrends = true, 
  compact = false,
  className = ''
}: TipTrackingWidgetProps) {
  const [summary, setSummary] = useState<TipSummary | null>(null);
  const [trends, setTrends] = useState<TipTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTipSummary();
    if (showTrends) {
      fetchTipTrends();
    }
  }, [period, showTrends]);

  const fetchTipSummary = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/tips/summary?period=${period}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tip summary');
      }

      const data = await response.json();
      setSummary(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchTipTrends = async () => {
    try {
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case 'year':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      }

      const params = new URLSearchParams({
        start_date: startDate.toISOString(),
        end_date: now.toISOString(),
        group_by: period === 'today' ? 'day' : period === 'week' ? 'day' : 'week'
      });

      const response = await fetch(`/api/tips/trends?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tip trends');
      }

      const data = await response.json();
      setTrends(data);
    } catch (err) {
      console.error('Error fetching tip trends:', err);
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

  const getPeriodLabel = () => {
    switch (period) {
      case 'today':
        return 'Today';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      case 'year':
        return 'This Year';
      default:
        return 'This Week';
    }
  };

  const getPeriodIcon = () => {
    switch (period) {
      case 'today':
        return <CalendarIcon className="h-4 w-4" />;
      case 'week':
        return <CalendarIcon className="h-4 w-4" />;
      case 'month':
        return <CalendarIcon className="h-4 w-4" />;
      case 'year':
        return <CalendarIcon className="h-4 w-4" />;
      default:
        return <CalendarIcon className="h-4 w-4" />;
    }
  };

  if (loading && !summary) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <Button size="sm" onClick={fetchTipSummary}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {getPeriodIcon()}
              Tip Summary
            </CardTitle>
            <Badge variant="secondary">{getPeriodLabel()}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Tips</span>
            <span className="font-semibold text-green-600">
              {summary ? formatCurrency(summary.totalTips) : '$0.00'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Transactions</span>
            <span className="font-semibold">
              {summary?.transactionCount || 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Avg Tip</span>
            <span className="font-semibold">
              {summary ? formatCurrency(summary.averageTip) : '$0.00'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSignIcon className="h-5 w-5" />
              Tip Tracking
            </CardTitle>
            <CardDescription>
              {getPeriodLabel()} tip performance overview
            </CardDescription>
          </div>
          <Badge variant="secondary">{getPeriodLabel()}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {summary ? formatCurrency(summary.totalTips) : '$0.00'}
            </div>
            <div className="text-xs text-muted-foreground">Total Tips</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {summary?.transactionCount || 0}
            </div>
            <div className="text-xs text-muted-foreground">Transactions</div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUpIcon className="h-4 w-4" />
              Average Tip
            </span>
            <span className="font-semibold">
              {summary ? formatCurrency(summary.averageTip) : '$0.00'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <DollarSignIcon className="h-4 w-4" />
              Tip Percentage
            </span>
            <span className="font-semibold">
              {summary ? formatPercentage(summary.tipPercentage) : '0%'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <UsersIcon className="h-4 w-4" />
              Total Revenue
            </span>
            <span className="font-semibold">
              {summary ? formatCurrency(summary.totalRevenue) : '$0.00'}
            </span>
          </div>
        </div>

        {/* Trends Chart (if enabled) */}
        {showTrends && trends.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tip Trends</span>
              <span className="text-xs text-muted-foreground">
                {period === 'today' ? 'Hourly' : period === 'week' ? 'Daily' : 'Weekly'}
              </span>
            </div>
            <div className="space-y-2">
              {trends.slice(-5).map((trend, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {period === 'today' 
                      ? format(new Date(trend.period), 'HH:mm')
                      : period === 'week' 
                        ? format(new Date(trend.period), 'EEE')
                        : format(new Date(trend.period), 'MMM dd')
                    }
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {trend.transactionCount} txns
                    </span>
                    <span className="font-medium">
                      {formatCurrency(trend.totalTips)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              // Navigate to full tip tracking dashboard
              window.location.href = '/tip-tracking';
            }}
          >
            View Full Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
