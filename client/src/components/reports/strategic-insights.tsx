import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Info, 
  CheckCircle, 
  RefreshCw,
  Calendar,
  Lightbulb,
  Target,
  BarChart3
} from "lucide-react";

interface StrategicInsight {
  type: 'warning' | 'alert' | 'success' | 'info';
  category: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
}

interface StrategicInsightsProps {
  timePeriod: string;
  customStartDate?: string;
  customEndDate?: string;
}

const StrategicInsights: React.FC<StrategicInsightsProps> = ({
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

  // Fetch strategic insights data
  const { data: insightsData, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/reports/strategic-insights", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const response = await fetch(
        `/api/reports/strategic-insights?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch strategic insights');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  const insights = insightsData?.data?.insights || [];
  const summary = insightsData?.data?.summary;

  // Get icon and color based on insight type
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'alert':
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      case 'success':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'client_retention':
        return <Target className="h-4 w-4" />;
      case 'no_shows':
        return <AlertTriangle className="h-4 w-4" />;
      case 'revenue':
        return <TrendingUp className="h-4 w-4" />;
      case 'service_performance':
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle>Strategic Insights</CardTitle>
              <CardDescription>
                AI-powered business intelligence and actionable recommendations
              </CardDescription>
            </div>
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
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <Alert className="mb-4">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Analyzing business data and generating insights...
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <AlertDescription>
              Error loading strategic insights: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {insights.length > 0 ? (
          <div className="space-y-6">
            {/* Summary Statistics */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-2xl font-bold text-blue-600">
                    {summary.total_insights}
                  </div>
                  <div className="text-sm text-blue-600 font-medium">
                    Total Insights
                  </div>
                </div>
                
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="text-2xl font-bold text-red-600">
                    {summary.high_priority}
                  </div>
                  <div className="text-sm text-red-600 font-medium">
                    High Priority
                  </div>
                </div>
                
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="text-2xl font-bold text-yellow-600">
                    {summary.medium_priority}
                  </div>
                  <div className="text-sm text-yellow-600 font-medium">
                    Medium Priority
                  </div>
                </div>
                
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-2xl font-bold text-green-600">
                    {summary.low_priority}
                  </div>
                  <div className="text-sm text-green-600 font-medium">
                    Low Priority
                  </div>
                </div>
              </div>
            )}

            {/* Insights List */}
            <div className="space-y-4">
              {insights.map((insight: StrategicInsight, index: number) => (
                <div 
                  key={index}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getInsightIcon(insight.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {insight.title}
                        </h3>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getPriorityColor(insight.priority)}`}
                        >
                          {insight.priority} priority
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <div className="flex items-center gap-1">
                            {getCategoryIcon(insight.category)}
                            {insight.category.replace('_', ' ')}
                          </div>
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {insight.message}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Recommended Action: {insight.action}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Period Information */}
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Period: {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <div className="text-lg font-medium mb-2">All Systems Optimal</div>
              <div className="text-sm">
                No critical insights for the selected time period. Your business is performing well!
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StrategicInsights; 