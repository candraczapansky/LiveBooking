import React, { useState, useMemo, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from "@/contexts/AuthProvider";
import { SidebarController } from "@/components/layout/sidebar";
import { useSidebar } from "@/contexts/SidebarContext";
import Header from "@/components/layout/header";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Clock, 
  FileText, 
  Download, 
  Plus, 
  Eye, 
  Edit,
  CreditCard,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  CalendarDays,
  Scissors
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

interface Staff {
  id: number;
  userId: number;
  title: string;
  commissionType: 'commission' | 'hourly' | 'fixed' | 'hourly_plus_commission';
  commissionRate?: number;
  hourlyRate?: number;
  fixedRate?: number;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface PayrollHistory {
  id: number;
  staffId: number;
  periodStart: string;
  periodEnd: string;
  periodType: string;
  totalHours: number;
  totalServices: number;
  totalRevenue: number;
  totalCommission: number;
  totalHourlyPay: number;
  totalFixedPay: number;
  totalEarnings: number;
  commissionType: string;
  baseCommissionRate?: number;
  hourlyRate?: number;
  fixedRate?: number;
  payrollStatus: string;
  paidDate?: string;
  notes?: string;
  createdAt: string;
}

interface PayrollCheck {
  id: number;
  payrollHistoryId?: number;
  staffId: number;
  checkNumber?: string;
  checkAmount: number;
  checkDate: string;
  providerId?: number;
  providerCheckId?: string;
  status: string;
  issueDate?: string;
  clearDate?: string;
  voidDate?: string;
  voidReason?: string;
  checkImageUrl?: string;
  notes?: string;
  createdAt: string;
}

interface StaffEarnings {
  id: number;
  staffId: number;
  appointmentId: number;
  serviceId: number;
  paymentId?: number;
  earningsAmount: number;
  rateType: string;
  rateUsed: number;
  isCustomRate: boolean;
  servicePrice: number;
  calculationDetails: string;
  earningsDate: string;
}

const PayrollPage: React.FC = () => {
  useDocumentTitle("Payroll | Glo Head Spa");
  const { user } = useContext(AuthContext);
  const { isOpen: sidebarOpen } = useSidebar();
  
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<number | 'all'>('all');
  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);
  const [selectedPayrollId, setSelectedPayrollId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get current date for period calculations
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    switch (selectedPeriod) {
      case 'current':
        return { start: currentMonthStart, end: currentMonthEnd };
      case 'previous':
        return { start: previousMonthStart, end: previousMonthEnd };
      case 'custom':
        return {
          start: customStartDate ? new Date(customStartDate) : currentMonthStart,
          end: customEndDate ? new Date(customEndDate) : currentMonthEnd
        };
      default:
        return { start: currentMonthStart, end: currentMonthEnd };
    }
  }, [selectedPeriod, customStartDate, customEndDate]);

  // Fetch staff members
  const { data: staff = [], isLoading: staffLoading, error: staffError } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/staff');
        if (!response.ok) throw new Error('Failed to fetch staff');
        return response.json();
      } catch (error) {
        console.error('Error fetching staff:', error);
        return [];
      }
    }
  });

  // Fetch payroll history
  const { data: payrollHistory = [], isLoading: payrollLoading, error: payrollError } = useQuery({
    queryKey: ['payroll-history', dateRange.start, dateRange.end, selectedStaff],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
          ...(selectedStaff !== 'all' && { staffId: selectedStaff.toString() })
        });
        const response = await fetch(`/api/payroll-history?${params}`);
        if (!response.ok) throw new Error('Failed to fetch payroll history');
        return response.json();
      } catch (error) {
        console.error('Error fetching payroll history:', error);
        return [];
      }
    }
  });

  // Fetch payroll checks
  const { data: payrollChecks = [] } = useQuery({
    queryKey: ['payroll-checks'],
    queryFn: async () => {
      const response = await fetch('/api/check-software/checks');
      if (!response.ok) throw new Error('Failed to fetch payroll checks');
      return response.json();
    }
  });

  // Fetch staff earnings for the period
  const { data: staffEarnings = [] } = useQuery({
    queryKey: ['staff-earnings', dateRange.start, dateRange.end],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      });
      const response = await fetch(`/api/staff-earnings?${params}`);
      if (!response.ok) throw new Error('Failed to fetch staff earnings');
      return response.json();
    }
  });

  // Process payroll mutation
  const processPayrollMutation = useMutation({
    mutationFn: async (staffId: number) => {
      const response = await fetch('/api/payroll/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId,
          periodStart: dateRange.start.toISOString(),
          periodEnd: dateRange.end.toISOString(),
          periodType: 'monthly'
        })
      });
      if (!response.ok) throw new Error('Failed to process payroll');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-history'] });
      queryClient.invalidateQueries({ queryKey: ['staff-earnings'] });
      toast({
        title: "Payroll Processed",
        description: "Payroll has been processed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Payroll Processing Failed",
        description: "Failed to process payroll. Please try again.",
        variant: "destructive",
      });
      console.error('Payroll processing error:', error);
    }
  });

  // Issue check mutation
  const issueCheckMutation = useMutation({
    mutationFn: async (payrollHistoryId: number) => {
      const payroll = payrollHistory.find((p: PayrollHistory) => p.id === payrollHistoryId);
      if (!payroll) throw new Error('Payroll not found');

      const staffMember = staff.find((s: Staff) => s.id === payroll.staffId);
      if (!staffMember) throw new Error('Staff member not found');

      const response = await fetch('/api/check-software/issue-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payrollHistoryId,
          checkData: {
            staffId: payroll.staffId,
            staffName: `${staffMember.user.firstName} ${staffMember.user.lastName}`,
            checkAmount: payroll.totalEarnings,
            checkDate: new Date().toISOString().split('T')[0],
            payrollPeriod: {
              startDate: payroll.periodStart,
              endDate: payroll.periodEnd
            },
            earningsBreakdown: {
              totalHours: payroll.totalHours,
              totalServices: payroll.totalServices,
              totalCommission: payroll.totalCommission,
              totalHourlyPay: payroll.totalHourlyPay,
              totalFixedPay: payroll.totalFixedPay
            }
          }
        })
      });
      if (!response.ok) throw new Error('Failed to issue check');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-checks'] });
      toast({
        title: "Check Issued",
        description: "Payroll check has been issued successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Check Issue Failed",
        description: "Failed to issue payroll check. Please try again.",
        variant: "destructive",
      });
      console.error('Check issue error:', error);
    }
  });

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalEarnings = payrollHistory.reduce((sum: number, p: PayrollHistory) => sum + p.totalEarnings, 0);
    const totalHours = payrollHistory.reduce((sum: number, p: PayrollHistory) => sum + p.totalHours, 0);
    const totalServices = payrollHistory.reduce((sum: number, p: PayrollHistory) => sum + p.totalServices, 0);
    const totalRevenue = payrollHistory.reduce((sum: number, p: PayrollHistory) => sum + p.totalRevenue, 0);
    const pendingPayrolls = payrollHistory.filter((p: PayrollHistory) => p.payrollStatus === 'generated').length;
    const paidPayrolls = payrollHistory.filter((p: PayrollHistory) => p.payrollStatus === 'paid').length;

    return {
      totalEarnings,
      totalHours,
      totalServices,
      totalRevenue,
      pendingPayrolls,
      paidPayrolls
    };
  }, [payrollHistory]);

  const handleProcessPayroll = async (staffId: number) => {
    setIsProcessingPayroll(true);
    try {
      await processPayrollMutation.mutateAsync(staffId);
    } finally {
      setIsProcessingPayroll(false);
    }
  };

  const handleIssueCheck = async (payrollHistoryId: number) => {
    try {
      await issueCheckMutation.mutateAsync(payrollHistoryId);
    } catch (error) {
      console.error('Error issuing check:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generated': return 'bg-yellow-100 text-yellow-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCheckStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'issued': return 'bg-green-100 text-green-800';
      case 'cleared': return 'bg-blue-100 text-blue-800';
      case 'voided': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Desktop layout
  return (
    <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="hidden lg:block">
        <SidebarController />
      </div>
      
      <div className={`h-screen flex flex-col transition-all duration-300 ${
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
      }`}>
        <Header />
        
        <main className="flex-1 bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 md:p-6 pb-4 sm:pb-6 overflow-auto">
          <div className="w-full max-w-none sm:max-w-7xl mx-auto px-0 sm:px-4">
            {/* Page Heading */}
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Payroll Management</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Process payroll, issue checks, and track staff earnings
              </p>
            </div>
            
            <div className="space-y-6">
              {/* Error Display */}
              {(staffError || payrollError) && (
                <Alert>
                  <AlertDescription>
                    {staffError ? 'Failed to load staff data. Please refresh the page.' : 
                     payrollError ? 'Failed to load payroll data. Please refresh the page.' : 
                     'An error occurred while loading data.'}
                  </AlertDescription>
                </Alert>
              )}

              {/* No Data Message */}
              {!staffLoading && !payrollLoading && staff.length === 0 && (
                <Alert>
                  <AlertDescription>
                    No staff members found. Please add staff members to use the payroll system.
                  </AlertDescription>
                </Alert>
              )}

              {/* Loading State */}
              {staffLoading && (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2">Loading payroll data...</span>
                </div>
              )}

              {/* Header Actions */}
              <div className="flex items-center justify-between">
                <div></div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => window.print()}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </div>

      {/* Main Content - Only show when not loading */}
      {!staffLoading && (
        <>
          {/* Period Selection */}
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Payroll Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="period">Period</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Month</SelectItem>
                  <SelectItem value="previous">Previous Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {selectedPeriod === 'custom' && (
              <>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
            
            <div>
              <Label htmlFor="staff">Staff Member</Label>
              <Select value={selectedStaff.toString()} onValueChange={(value) => setSelectedStaff(value === 'all' ? 'all' : parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staff.map((s: Staff) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.user.firstName} {s.user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            Period: {format(dateRange.start, 'MMM dd, yyyy')} - {format(dateRange.end, 'MMM dd, yyyy')}
          </div>
        </CardContent>
      </Card>





      {/* Main Content Tabs */}
      <Tabs defaultValue="payroll" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payroll">Payroll History</TabsTrigger>
          <TabsTrigger value="checks">Payroll Checks</TabsTrigger>
          <TabsTrigger value="earnings">Staff Earnings</TabsTrigger>
        </TabsList>

        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payroll History</CardTitle>
            </CardHeader>
            <CardContent>
              {payrollLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : payrollHistory.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No payroll records found for the selected period.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {payrollHistory.map((payroll: PayrollHistory) => {
                    const staffMember = staff.find((s: Staff) => s.id === payroll.staffId);
                    const hasCheck = payrollChecks.some((check: PayrollCheck) => 
                      check.payrollHistoryId === payroll.id
                    );
                    
                    return (
                      <div key={payroll.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-gray-900">
                                {staffMember ? `${staffMember.user.firstName} ${staffMember.user.lastName}` : `Staff ${payroll.staffId}`}
                              </h4>
                              <Badge className={getStatusColor(payroll.payrollStatus)}>
                                {payroll.payrollStatus}
                              </Badge>
                              <span className="text-lg font-semibold">
                                ${payroll.totalEarnings.toFixed(2)}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Period:</span> {format(new Date(payroll.periodStart), 'MMM dd')} - {format(new Date(payroll.periodEnd), 'MMM dd, yyyy')}
                              </div>
                              <div>
                                <span className="font-medium">Hours:</span> {payroll.totalHours.toFixed(1)}
                              </div>
                              <div>
                                <span className="font-medium">Services:</span> {payroll.totalServices}
                              </div>
                              <div>
                                <span className="font-medium">Revenue:</span> ${payroll.totalRevenue.toFixed(2)}
                              </div>
                            </div>
                            
                            <div className="mt-2 text-xs text-gray-500">
                              Created: {format(new Date(payroll.createdAt), 'MMM dd, yyyy HH:mm')}
                              {payroll.paidDate && ` | Paid: ${format(new Date(payroll.paidDate), 'MMM dd, yyyy')}`}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            {payroll.payrollStatus === 'generated' && (
                              <Button
                                size="sm"
                                onClick={() => handleIssueCheck(payroll.id)}
                                disabled={issueCheckMutation.isPending}
                              >
                                <CreditCard className="h-3 w-3 mr-1" />
                                Issue Check
                              </Button>
                            )}
                            
                            {hasCheck && (
                              <Badge variant="outline" className="text-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Check Issued
                              </Badge>
                            )}
                            
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Checks</CardTitle>
            </CardHeader>
            <CardContent>
              {payrollChecks.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No payroll checks found.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {payrollChecks.map((check: PayrollCheck) => {
                    const staffMember = staff.find((s: Staff) => s.id === check.staffId);
                    
                    return (
                      <div key={check.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-gray-900">
                                Check #{check.checkNumber || check.id}
                              </h4>
                              <Badge className={getCheckStatusColor(check.status)}>
                                {check.status}
                              </Badge>
                              <span className="text-lg font-semibold">
                                ${check.checkAmount.toFixed(2)}
                              </span>
                            </div>
                            
                            <p className="text-gray-600 text-sm">
                              {staffMember ? `${staffMember.user.firstName} ${staffMember.user.lastName}` : `Staff ${check.staffId}`} | 
                              Date: {format(new Date(check.checkDate), 'MMM dd, yyyy')}
                            </p>
                            
                            {check.issueDate && (
                              <p className="text-xs text-gray-500 mt-1">
                                Issued: {format(new Date(check.issueDate), 'MMM dd, yyyy HH:mm')}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            {check.checkImageUrl && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={check.checkImageUrl} target="_blank" rel="noopener noreferrer">
                                  View Check
                                </a>
                              </Button>
                            )}
                            
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              {staffEarnings.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No earnings records found for the selected period.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {staffEarnings.map((earning: StaffEarnings) => {
                    const staffMember = staff.find((s: Staff) => s.id === earning.staffId);
                    
                    return (
                      <div key={earning.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-gray-900">
                                {staffMember ? `${staffMember.user.firstName} ${staffMember.user.lastName}` : `Staff ${earning.staffId}`}
                              </h4>
                              <Badge variant="outline">{earning.rateType}</Badge>
                              <span className="text-lg font-semibold">
                                ${earning.earningsAmount.toFixed(2)}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Service Price:</span> ${earning.servicePrice.toFixed(2)}
                              </div>
                              <div>
                                <span className="font-medium">Rate Used:</span> {earning.rateUsed}%
                              </div>
                              <div>
                                <span className="font-medium">Custom Rate:</span> {earning.isCustomRate ? 'Yes' : 'No'}
                              </div>
                              <div>
                                <span className="font-medium">Date:</span> {format(new Date(earning.earningsDate), 'MMM dd, yyyy')}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => {
                if (selectedStaff === 'all') {
                  toast({
                    title: "Select Staff Member",
                    description: "Please select a specific staff member to process payroll.",
                    variant: "destructive",
                  });
                } else {
                  handleProcessPayroll(selectedStaff as number);
                }
              }}
              disabled={isProcessingPayroll}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isProcessingPayroll ? 'Processing...' : 'Process Payroll'}
            </Button>
            
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>
        </>
      )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PayrollPage; 