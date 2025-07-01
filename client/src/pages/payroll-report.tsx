import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, DollarSignIcon, TrendingUpIcon, UsersIcon, RefreshCw, Save, Loader2, ArrowLeft, Eye } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PayrollReportProps {
  timePeriod: string;
  customStartDate?: string;
  customEndDate?: string;
}

interface PayrollData {
  staffId: number;
  staffName: string;
  title: string;
  commissionType: string;
  baseCommissionRate: number;
  totalServices: number;
  totalRevenue: number;
  totalCommission: number;
  totalHours: number;
  hourlyWage: number;
  totalHourlyPay: number;
  totalEarnings: number;
  appointments: any[];
}

interface StaffMember {
  id: number;
  userId: number;
  title: string;
  commissionType: string;
  commissionRate: number;
  hourlyRate: number;
  fixedRate: number;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface Service {
  id: number;
  name: string;
  price: number;
  duration: number;
}

interface Appointment {
  id: number;
  staffId: number;
  serviceId: number;
  status: string;
  paymentStatus: string;
  startTime: string;
}

export default function PayrollReport({ timePeriod, customStartDate, customEndDate }: PayrollReportProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [syncing, setSyncing] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'detail'>('summary');
  const [detailStaffId, setDetailStaffId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all required data
  const { data: staff, isLoading: staffLoading } = useQuery<StaffMember[]>({
    queryKey: ['/api/staff'],
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ['/api/services'],
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments'],
  });

  const { data: staffServices } = useQuery({
    queryKey: ['/api/staff-services'],
  });

  const isLoading = staffLoading || usersLoading || servicesLoading || appointmentsLoading;

  // Refresh data function
  const refreshData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/users'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/services'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/staff-services'] })
    ]);
    toast({
      title: "Data Refreshed",
      description: "Payroll data has been refreshed successfully.",
    });
  };

  // Calculate payroll data
  const payrollData = useMemo((): PayrollData[] => {
    if (!staff || !users || !services || !appointments) return [];

    // Determine date range based on timePeriod and custom dates
    let rangeStart: Date;
    let rangeEnd: Date;

    if (timePeriod === 'custom' && customStartDate && customEndDate) {
      // Parse dates in local timezone to avoid UTC conversion issues
      const [startYear, startMonth, startDay] = customStartDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = customEndDate.split('-').map(Number);
      
      rangeStart = startOfDay(new Date(startYear, startMonth - 1, startDay));
      rangeEnd = endOfDay(new Date(endYear, endMonth - 1, endDay));
    } else {
      // Use month selection as fallback
      rangeStart = startOfMonth(selectedMonth);
      rangeEnd = endOfMonth(selectedMonth);
    }

    // Filter appointments for the selected date range and paid status only
    const filteredAppointments = appointments.filter((apt) => {
      const aptDate = new Date(apt.startTime);
      return isWithinInterval(aptDate, { start: rangeStart, end: rangeEnd }) && 
             apt.paymentStatus === 'paid';
    });

    return staff.map((staffMember) => {
      // Find the user for this staff member
      const user = users.find((u) => u.id === staffMember.userId);
      const staffName = user ? `${user.firstName} ${user.lastName}` : 'Unknown Staff';

      // Get appointments for this staff member
      const staffAppointments = filteredAppointments.filter((apt) => apt.staffId === staffMember.id);

      let totalRevenue = 0;
      let totalCommission = 0;
      let totalHours = 0;
      let totalHourlyPay = 0;
      const totalServices = staffAppointments.length;

      // Calculate earnings for each appointment
      staffAppointments.forEach((apt) => {
        const service = services.find((s) => s.id === apt.serviceId);
        if (!service) return;

        const serviceRevenue = service.price;
        totalRevenue += serviceRevenue;

        // Find staff service assignment for custom rates
        const staffService = staffServices?.find((ss: any) => 
          ss.staffId === staffMember.id && ss.serviceId === service.id
        );

        let appointmentEarnings = 0;

        switch (staffMember.commissionType) {
          case 'commission': {
            // Use custom commission rate if available, otherwise use default
            let commissionRate = staffService?.customCommissionRate ?? staffMember.commissionRate ?? 0;
            
            // Convert percentage to decimal if it's a custom rate
            if (staffService?.customCommissionRate !== undefined && staffService?.customCommissionRate !== null) {
              commissionRate = commissionRate / 100;
            }
            
            appointmentEarnings = serviceRevenue * commissionRate;
            break;
          }
          case 'hourly': {
            const hourlyRate = staffService?.customRate ?? staffMember.hourlyRate ?? 0;
            const serviceDuration = service.duration || 60; // Duration in minutes
            const hours = serviceDuration / 60;
            appointmentEarnings = hourlyRate * hours;
            totalHours += hours;
            totalHourlyPay += appointmentEarnings;
            break;
          }
          case 'fixed': {
            appointmentEarnings = staffService?.customRate ?? staffMember.fixedRate ?? 0;
            break;
          }
          case 'hourly_plus_commission': {
            // Calculate both hourly and commission
            const hourlyRate = staffService?.customRate ?? staffMember.hourlyRate ?? 0;
            const serviceDuration = service.duration || 60;
            const hours = serviceDuration / 60;
            const hourlyPortion = hourlyRate * hours;
            
            let commissionRate = staffMember.commissionRate ?? 0;
            const commissionPortion = serviceRevenue * commissionRate;
            
            appointmentEarnings = hourlyPortion + commissionPortion;
            totalHours += hours;
            totalHourlyPay += hourlyPortion;
            break;
          }
          default:
            appointmentEarnings = 0;
        }

        totalCommission += appointmentEarnings;
      });

      // Calculate total earnings
      let totalEarnings = totalCommission;
      if (staffMember.commissionType === 'hourly') {
        totalEarnings = totalHourlyPay;
      }

      return {
        staffId: staffMember.id,
        staffName,
        title: staffMember.title,
        commissionType: staffMember.commissionType,
        baseCommissionRate: staffMember.commissionRate || 0,
        totalServices,
        totalRevenue,
        totalCommission,
        totalHours,
        hourlyWage: staffMember.hourlyRate || 0,
        totalHourlyPay,
        totalEarnings,
        appointments: staffAppointments,
      };
    });
  }, [staff, users, services, appointments, staffServices, selectedMonth, timePeriod, customStartDate, customEndDate]);

  // Filter by selected staff member
  const filteredPayrollData = selectedStaff === "all" 
    ? payrollData 
    : payrollData.filter((data) => data.staffId.toString() === selectedStaff);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalStaff = filteredPayrollData.length;
    const totalRevenue = filteredPayrollData.reduce((sum, data) => sum + data.totalRevenue, 0);
    const totalPayroll = filteredPayrollData.reduce((sum, data) => sum + data.totalEarnings, 0);
    const totalServices = filteredPayrollData.reduce((sum, data) => sum + data.totalServices, 0);

    return {
      totalStaff,
      totalRevenue,
      totalPayroll,
      totalServices,
    };
  }, [filteredPayrollData]);

  // Sync payroll data to external system
  const handlePayrollSync = async (staffId: number) => {
    setSyncing(staffId);
    try {
      const response = await fetch('/api/payroll-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staffId,
          month: selectedMonth.toISOString()
        })
      });
      
      const result = await response.json();
      
      if (result.externalSyncStatus === 'success') {
        toast({
          title: "Payroll Sync Successful",
          description: `Successfully synced payroll data to external dashboard`,
        });
      } else {
        toast({
          title: "Sync Failed",
          description: `Could not sync payroll data. External dashboard not available.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Payroll sync failed:', error);
      toast({
        title: "Sync Error",
        description: "An error occurred while syncing payroll data.",
        variant: "destructive",
      });
    } finally {
      setSyncing(null);
    }
  };

  // Save payroll to history
  const handleSavePayroll = async (staffMember: PayrollData) => {
    setSaving(staffMember.staffId);
    
    try {
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);
      
      const payrollHistoryData = {
        staffId: staffMember.staffId,
        periodStart: monthStart.toISOString().split('T')[0],
        periodEnd: monthEnd.toISOString().split('T')[0],
        periodType: 'monthly',
        totalHours: staffMember.totalHours || 0,
        totalServices: staffMember.totalServices,
        totalRevenue: staffMember.totalRevenue,
        totalCommission: staffMember.totalCommission,
        totalHourlyPay: staffMember.totalHourlyPay || 0,
        totalFixedPay: 0,
        totalEarnings: staffMember.totalEarnings,
        commissionType: staffMember.commissionType,
        baseCommissionRate: staffMember.baseCommissionRate,
        hourlyRate: staffMember.hourlyWage || 0,
        fixedRate: 0,
        earningsBreakdown: JSON.stringify({
          totalCommission: staffMember.totalCommission,
          totalHourlyPay: staffMember.totalHourlyPay || 0,
          totalServices: staffMember.totalServices,
          totalRevenue: staffMember.totalRevenue
        }),
        timeEntriesData: JSON.stringify([]),
        appointmentsData: JSON.stringify(staffMember.appointments),
        payrollStatus: 'generated',
        notes: `Generated for ${format(selectedMonth, 'MMMM yyyy')}`
      };

      const response = await apiRequest('/api/payroll-history', {
        method: 'POST',
        body: JSON.stringify(payrollHistoryData),
      });

      if (response.ok) {
        toast({
          title: "Payroll Saved",
          description: `Payroll for ${staffMember.staffName} has been saved to history.`,
        });
      } else {
        throw new Error(`Failed to save payroll`);
      }
    } catch (error) {
      console.error('Payroll save failed:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save payroll to history. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  // Generate month options for the last 12 months
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: date.toISOString(),
      label: format(date, 'MMMM yyyy')
    };
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading payroll data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Detailed Payroll View - Moved to Top for Visibility */}
      {detailStaffId && (
        <DetailedPayrollView 
          staffId={detailStaffId}
          month={selectedMonth}
          onBack={() => {
            console.log('Going back to summary view');
            setViewMode('summary');
            setDetailStaffId(null);
          }}
        />
      )}

      {/* Header Controls */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payroll Report</h2>
          <p className="text-muted-foreground">
            {timePeriod === 'custom' && customStartDate && customEndDate ? (
              `Track staff earnings and commission from ${format(new Date(customStartDate), 'MMM dd, yyyy')} to ${format(new Date(customEndDate), 'MMM dd, yyyy')}`
            ) : (
              `Track staff earnings and commission for ${format(selectedMonth, 'MMMM yyyy')}`
            )}
          </p>
          {/* Debug info */}
          <div className="text-xs text-gray-500 mt-1">
            Debug: viewMode={viewMode}, detailStaffId={detailStaffId}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh Data</span>
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Month</label>
          <Select
            value={selectedMonth.toISOString()}
            onValueChange={(value) => setSelectedMonth(new Date(value))}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Filter Staff</label>
          <Select value={selectedStaff} onValueChange={setSelectedStaff}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {payrollData.map((data) => (
                <SelectItem key={data.staffId} value={data.staffId.toString()}>
                  {data.staffName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalStaff}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalRevenue)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalPayroll)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalServices}</div>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Payroll Details</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayrollData.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No payroll data found for the selected period.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Commission Type</TableHead>
                    <TableHead className="text-right">Services</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Total Earnings</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayrollData.map((data) => (
                    <TableRow key={data.staffId}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{data.staffName}</div>
                          <div className="text-sm text-muted-foreground">{data.title}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {data.commissionType.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{data.totalServices}</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.totalRevenue)}</TableCell>
                      <TableCell className="text-right">
                        {data.totalHours > 0 ? `${data.totalHours.toFixed(1)}h` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(data.totalEarnings)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              console.log('Setting detail view for staff:', data.staffId);
                              setDetailStaffId(data.staffId);
                              setViewMode('detail');
                              console.log('State should now be:', { viewMode: 'detail', detailStaffId: data.staffId });
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSavePayroll(data)}
                            disabled={saving === data.staffId}
                          >
                            {saving === data.staffId ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                Saving
                              </>
                            ) : (
                              <>
                                <Save className="h-3 w-3 mr-1" />
                                Save
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePayrollSync(data.staffId)}
                            disabled={syncing === data.staffId}
                          >
                            {syncing === data.staffId ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                Syncing
                              </>
                            ) : (
                              "Sync"
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
}

// Detailed Payroll View Component
interface DetailedPayrollViewProps {
  staffId: number;
  month: Date;
  onBack: () => void;
}

function DetailedPayrollView({ staffId, month, onBack }: DetailedPayrollViewProps) {
  console.log('DetailedPayrollView rendering for staffId:', staffId);
  
  const { data: detailData, isLoading } = useQuery({
    queryKey: [`/api/payroll/${staffId}/detailed`, month.toISOString()],
    queryFn: () => 
      fetch(`/api/payroll/${staffId}/detailed?month=${month.toISOString()}`)
        .then(res => res.json())
  });

  console.log('DetailedPayrollView data:', detailData, 'isLoading:', isLoading);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Simple test render first
  return (
    <Card className="mt-6 border-2 border-red-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Summary
          </Button>
          <div>
            <CardTitle>TEST: Detailed Payroll Report</CardTitle>
            <p className="text-sm text-muted-foreground">
              Staff ID: {staffId} - {format(month, 'MMMM yyyy')}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="p-4 bg-yellow-100">
          <p>Loading: {isLoading ? 'YES' : 'NO'}</p>
          <p>Data available: {detailData ? 'YES' : 'NO'}</p>
          <p>Staff Name: {detailData?.staffName || 'Loading...'}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Summary
          </Button>
          <div>
            <CardTitle>Detailed Payroll Report</CardTitle>
            <p className="text-sm text-muted-foreground">
              {detailData?.staffName} - {format(month, 'MMMM yyyy')}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {detailData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Services</p>
                      <p className="text-2xl font-bold">{detailData.summary.totalAppointments}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">{formatCurrency(detailData.summary.totalRevenue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Commission</p>
                      <p className="text-2xl font-bold">{formatCurrency(detailData.summary.totalCommission)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <UsersIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Per Service</p>
                      <p className="text-2xl font-bold">{formatCurrency(detailData.summary.averageCommissionPerService)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Staff Info */}
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold mb-2">Staff Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Title:</span>
                  <p className="font-medium">{detailData.title}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Commission Type:</span>
                  <p className="font-medium">{detailData.commissionType.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Base Commission Rate:</span>
                  <p className="font-medium">{(detailData.baseCommissionRate * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Hourly Rate:</span>
                  <p className="font-medium">{detailData.hourlyRate ? formatCurrency(detailData.hourlyRate) : 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Individual Appointments Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Service Price</TableHead>
                    <TableHead className="text-right">Commission Rate</TableHead>
                    <TableHead className="text-right">Commission Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailData.appointments.map((appointment: any) => (
                    <TableRow key={appointment.appointmentId}>
                      <TableCell>
                        {format(new Date(appointment.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>{appointment.clientName}</TableCell>
                      <TableCell>{appointment.serviceName}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(appointment.servicePrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(appointment.commissionRate * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(appointment.commissionAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={appointment.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                          {appointment.paymentStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {detailData.appointments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No paid appointments found for this period.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}