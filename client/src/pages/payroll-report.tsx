import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// import { Separator } from "@/components/ui/separator";
import { CalendarIcon, DollarSignIcon, TrendingUpIcon, UsersIcon, RefreshCw, Save, Loader2, ArrowLeft, Eye, Download } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useBusinessSettings } from "@/contexts/BusinessSettingsContext";

interface PayrollReportProps {
  timePeriod: string;
  customStartDate?: string;
  customEndDate?: string;
  selectedStaffId?: string; // comes from header filter
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
  totalTips: number;
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

interface Payment {
  id: number;
  appointmentId: number;
  amount: number;
  tipAmount: number;
  totalAmount: number;
  method: string;
  status: string;
  paymentDate: string;
}

export default function PayrollReport({ timePeriod, customStartDate, customEndDate, selectedStaffId }: PayrollReportProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState<string>(selectedStaffId || "all");
  const [syncing, setSyncing] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'detail'>('summary');
  const [detailStaffId, setDetailStaffId] = useState<number | null>(null);
  // UI display preference: keep existing summary/full view intact, but default to a simpler table
  const [displayMode, setDisplayMode] = useState<'simple' | 'full'>('simple');
  const { toast } = useToast();
  const detailContainerRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const { businessSettings } = useBusinessSettings();
  const businessTz = businessSettings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  // Keep selected staff in sync with header filter
  useEffect(() => {
    if (selectedStaffId && selectedStaffId !== selectedStaff) {
      setSelectedStaff(selectedStaffId);
    }
    if (!selectedStaffId && selectedStaff !== 'all') {
      setSelectedStaff('all');
    }
  }, [selectedStaffId]);

  const formatYmdInTimeZone = (date: Date) => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: businessTz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
    } catch {
      return format(date, 'yyyy-MM-dd');
    }
  };

  const parseLocalYmd = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  };

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

  const { data: payments, isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ['/api/payments'],
  });


  const { data: staffServices = [] } = useQuery<any[]>({
    queryKey: ['/api/staff-services'],
  });

  const isLoading = staffLoading || usersLoading || servicesLoading || appointmentsLoading || paymentsLoading;

  // Refresh data function
  const refreshData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/users'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/services'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/staff-services'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] })
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
      // Use business timezone to parse start/end so they align with what the user picked
      const parseYmdInTz = (ymd: string) => {
        const [y, m, d] = ymd.split('-').map(Number);
        // Build a date in the business timezone via toLocaleString round-trip
        const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
        // move to local Date at 00:00 and 23:59:59.999 for that tz day
        const start = new Date(dt.toLocaleString('en-US', { timeZone: businessTz }));
        start.setHours(0,0,0,0);
        const end = new Date(start);
        end.setHours(23,59,59,999);
        return { start, end };
      };
      const s = parseYmdInTz(customStartDate);
      const e = parseYmdInTz(customEndDate);
      rangeStart = s.start;
      rangeEnd = e.end;
    } else {
      // Respect selected time period from Reports page; keep month selector for 'month'
      const now = new Date();
      switch (timePeriod) {
        case 'day': {
          const tzNow = new Date(now.toLocaleString('en-US', { timeZone: businessTz }));
          tzNow.setHours(0,0,0,0);
          const tzEnd = new Date(tzNow);
          tzEnd.setHours(23,59,59,999);
          rangeStart = tzNow;
          rangeEnd = tzEnd;
          break;
        }
        case 'yesterday': {
          const y = new Date(now);
          y.setDate(now.getDate() - 1);
          const tzY = new Date(y.toLocaleString('en-US', { timeZone: businessTz }));
          tzY.setHours(0,0,0,0);
          const tzEnd = new Date(tzY);
          tzEnd.setHours(23,59,59,999);
          rangeStart = tzY;
          rangeEnd = tzEnd;
          break;
        }
        case 'week': {
          const tzStart = new Date(now.toLocaleString('en-US', { timeZone: businessTz }));
          tzStart.setHours(0,0,0,0);
          tzStart.setDate(tzStart.getDate() - 6);
          const tzEnd = new Date(now.toLocaleString('en-US', { timeZone: businessTz }));
          tzEnd.setHours(23,59,59,999);
          rangeStart = tzStart;
          rangeEnd = tzEnd;
          break;
        }
        case 'month': {
          // Use the page's month selector for monthly view
          rangeStart = startOfMonth(selectedMonth);
          rangeEnd = endOfMonth(selectedMonth);
          break;
        }
        case 'quarter': {
          const tzStart = new Date(now.toLocaleString('en-US', { timeZone: businessTz }));
          tzStart.setHours(0,0,0,0);
          tzStart.setMonth(tzStart.getMonth() - 3);
          const tzEnd = new Date(now.toLocaleString('en-US', { timeZone: businessTz }));
          tzEnd.setHours(23,59,59,999);
          rangeStart = tzStart;
          rangeEnd = tzEnd;
          break;
        }
        case 'year': {
          const tzStart = new Date(now.toLocaleString('en-US', { timeZone: businessTz }));
          tzStart.setHours(0,0,0,0);
          tzStart.setFullYear(tzStart.getFullYear() - 1);
          const tzEnd = new Date(now.toLocaleString('en-US', { timeZone: businessTz }));
          tzEnd.setHours(23,59,59,999);
          rangeStart = tzStart;
          rangeEnd = tzEnd;
          break;
        }
        default: {
          rangeStart = startOfMonth(selectedMonth);
          rangeEnd = endOfMonth(selectedMonth);
        }
      }
    }

    // Compare by ISO date strings (YYYY-MM-DD) to avoid any timezone off-by-one
    const startStr = formatYmdInTimeZone(rangeStart);
    const endStr = formatYmdInTimeZone(rangeEnd);

    // Normalize a payment's effective date (when it was actually processed)
    // Use only real payment timestamps; do not fall back to createdAt which can be misleading
    const getPaymentDate = (p: any) => {
      const raw = p.paymentDate || p.payment_date || p.processedAt || p.processed_at;
      return raw ? new Date(raw) : null;
    };

    // Include all real completed payments with positive amounts (do not filter by payment date)
    // The time period filter is applied to the appointment's date, not the payment's timestamp
    const completedAppointmentPayments = (payments || []).filter((p: any) => {
      const statusOk = (p.status === 'completed');
      const typeOk = !p.type || p.type === 'appointment' || p.type === 'appointment_payment';
      const amount = (p.totalAmount ?? p.amount ?? 0) as number;
      const positiveAmount = Number(amount) > 0;
      const hasValidAppointmentId = Boolean(p.appointmentId);
      return statusOk && typeOk && positiveAmount && hasValidAppointmentId;
    });

    // Map appointmentId -> completed payments in range with positive amounts
    const appointmentIdToPayments = new Map<number, any[]>();
    for (const p of completedAppointmentPayments) {
      const apptId = (p as any).appointmentId as number | undefined;
      if (!apptId) continue;
      
      // Calculate the actual amount (exclude tips)
      const amount = p.amount ?? Math.max((p.totalAmount || 0) - (p.tipAmount || 0), 0);
      
      // Only include payments with positive amounts
      if (amount <= 0) continue;
      
      const arr = appointmentIdToPayments.get(apptId) || [];
      arr.push(p);
      appointmentIdToPayments.set(apptId, arr);
    }

    const isPaidAppointment = (apt: any) => {
      // Appointment must not be cancelled and must be marked as paid
      const statusLower = String(apt.status || apt.appointment_status || '').toLowerCase();
      const paymentStatusLower = String(apt.paymentStatus || apt.payment_status || '').toLowerCase();
      const notCancelled = statusLower !== 'cancelled';
      const isPaid = paymentStatusLower === 'paid';
      if (!(notCancelled && isPaid)) return false;
      
      // Must have associated completed payments mapped to this appointment
      const apptPayments = appointmentIdToPayments.get(apt.id) || [];
      if (apptPayments.length === 0) return false;
      const totalPaid = apptPayments.reduce((sum, p) => {
        if (p.status !== 'completed') return sum;
        const base = p.amount ?? Math.max((p.totalAmount || 0) - (p.tipAmount || 0), 0);
        return sum + (base || 0);
      }, 0);
      return totalPaid > 0;
    };

    // Filter appointments for the selected date range AND actually paid
    const filteredAppointments = appointments.filter((apt: any) => {
      const startTime = apt.startTime || apt.start_time;
      const aptDateObj = typeof startTime === 'string' ? new Date(startTime) : new Date(startTime);
      const aptStr = formatYmdInTimeZone(aptDateObj);
      return (
        aptStr >= startStr &&
        aptStr <= endStr &&
        isPaidAppointment(apt)
      );
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
      let totalTips = 0;
      const totalServices = staffAppointments.length;

      // Calculate earnings for each paid appointment
      staffAppointments.forEach((apt: any) => {
        const serviceId = apt.serviceId || apt.service_id;
        const service = services.find((s) => s.id === serviceId);
        if (!service) return;

        // Only use verified completed payments for this appointment
        const appointmentPayments = appointmentIdToPayments.get(apt.id) || [];
        
        // If there are no actual payments, skip this appointment entirely
        if (appointmentPayments.length === 0) {
          return;
        }
        
        // Use ONLY the latest completed payment amount for this appointment
        const latestCompletedPayment = [...appointmentPayments]
          .filter((p: any) => p.status === 'completed')
          .sort((a: any, b: any) => {
            const ad = getPaymentDate(a) || new Date(0);
            const bd = getPaymentDate(b) || new Date(0);
            return ad.getTime() - bd.getTime();
          })
          .pop();
        const serviceRevenue = (() => {
          if (!latestCompletedPayment) return 0;
          const base = latestCompletedPayment.amount ?? Math.max((latestCompletedPayment.totalAmount || 0) - (latestCompletedPayment.tipAmount || 0), 0);
          return base || 0;
        })();
        
        // Skip this appointment if no actual revenue was collected
        if (serviceRevenue <= 0) {
          return;
        }
        
        totalRevenue += serviceRevenue;

        // Find staff service assignment for custom rates
        const staffService = staffServices?.find((ss: any) => 
          ss.staffId === staffMember.id && ss.serviceId === service.id
        );

        let appointmentEarnings = 0;

        switch (staffMember.commissionType) {
          case 'commission': {
            // Prefer custom commission rate for this staff+service if defined; otherwise use staff base rate
            let commissionRate = staffService?.customCommissionRate ?? staffMember.commissionRate ?? 0;
            // Convert custom percentage values (e.g., 40 => 0.40)
            if (staffService?.customCommissionRate !== undefined && staffService?.customCommissionRate !== null) {
              commissionRate = commissionRate > 1 ? commissionRate / 100 : commissionRate;
            }
            appointmentEarnings = serviceRevenue * (commissionRate || 0);
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
            // Calculate both hourly and commission (commission prefers custom per-service rate)
            const hourlyRate = staffService?.customRate ?? staffMember.hourlyRate ?? 0;
            const serviceDuration = service.duration || 60;
            const hours = serviceDuration / 60;
            const hourlyPortion = hourlyRate * hours;
            let commissionRate = staffService?.customCommissionRate ?? staffMember.commissionRate ?? 0;
            if (staffService?.customCommissionRate !== undefined && staffService?.customCommissionRate !== null) {
              commissionRate = commissionRate > 1 ? commissionRate / 100 : commissionRate;
            }
            const commissionPortion = serviceRevenue * (commissionRate || 0);
            appointmentEarnings = hourlyPortion + commissionPortion;
            totalHours += hours;
            totalHourlyPay += hourlyPortion;
            break;
          }
          default:
            appointmentEarnings = 0;
        }

        // Add tips from the latest completed payment only (avoid double-counting across retries)
        const tipFromLatest = Number(latestCompletedPayment?.tipAmount || 0);
        totalTips += tipFromLatest;

        totalCommission += appointmentEarnings;
      });

      // Calculate total earnings
      let totalEarnings = totalCommission + totalTips;
      if (staffMember.commissionType === 'hourly') {
        totalEarnings = totalHourlyPay + totalTips;
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
        totalTips,
        totalEarnings,
        // Attach payments used for transparency in detail view
        appointments: staffAppointments.map((apt: any) => ({
          ...apt,
          _paymentsUsed: appointmentIdToPayments.get(apt.id) || []
        })),
      };
    })
    // Exclude staff with zero qualifying payments/revenue to avoid showing empty staff (e.g., Jamie with none)
    .filter((row) => (row.totalRevenue || 0) > 0 || (row.totalTips || 0) > 0 || (row.totalCommission || 0) > 0);
  }, [staff, users, services, appointments, staffServices, selectedMonth, timePeriod, customStartDate, customEndDate, payments]);

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
    const totalTips = filteredPayrollData.reduce((sum, data) => sum + data.totalTips, 0);

    return {
      totalStaff,
      totalRevenue,
      totalPayroll,
      totalServices,
      totalTips,
    };
  }, [filteredPayrollData]);

  // Export payroll data to CSV
  const handleExportReport = () => {
    console.log('Export button clicked');
    console.log('Filtered payroll data:', filteredPayrollData);
    
    try {
      // Create CSV headers
      const headers = [
        'Staff Name',
        'Title',
        'Commission Type',
        'Base Rate',
        'Total Services',
        'Total Revenue',
        'Total Commission',
        'Total Tips',
        'Total Hours',
        'Hourly Wage',
        'Total Hourly Pay',
        'Total Earnings'
      ];
      
      // Create CSV rows
      const csvData = filteredPayrollData.map(data => [
        data.staffName,
        data.title,
        data.commissionType,
        data.baseCommissionRate,
        data.totalServices,
        data.totalRevenue.toFixed(2),
        data.totalCommission.toFixed(2),
        data.totalTips.toFixed(2),
        data.totalHours,
        data.hourlyWage.toFixed(2),
        data.totalHourlyPay.toFixed(2),
        data.totalEarnings.toFixed(2)
      ]);
      
      // Combine headers and data
      const csvContent = [headers, ...csvData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      const monthYear = format(selectedMonth, 'MMMM-yyyy');
      const staffFilter = selectedStaff === 'all' ? 'All-Staff' : 
        filteredPayrollData.find(d => d.staffId.toString() === selectedStaff)?.staffName?.replace(/\s+/g, '-') || 'Unknown';
      
      link.setAttribute('download', `Payroll-Report-${monthYear}-${staffFilter}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: `Payroll report exported as CSV file`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting the report.",
        variant: "destructive",
      });
    }
  };

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
          totalRevenue: staffMember.totalRevenue,
          totalTips: staffMember.totalTips
        }),
        timeEntriesData: JSON.stringify([]),
        appointmentsData: JSON.stringify(staffMember.appointments),
        payrollStatus: 'generated',
        notes: `Generated for ${format(selectedMonth, 'MMMM yyyy')}`
      };

      const response = await apiRequest("POST", '/api/payroll-history', payrollHistoryData);

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

  useEffect(() => {
    if (detailStaffId && detailContainerRef.current) {
      detailContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [detailStaffId]);

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
        <div ref={detailContainerRef}>
          <DetailedPayrollView 
            staffId={detailStaffId}
            month={selectedMonth}
            onBack={() => {
              console.log('Going back to summary view');
              setViewMode('summary');
              setDetailStaffId(null);
            }}
          />
        </div>
      )}

      {/* Header Controls */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payroll Report</h2>
          <p className="text-muted-foreground">
            {timePeriod === 'custom' && customStartDate && customEndDate ? (
              `Track staff earnings and commission from ${formatYmdInTimeZone(parseLocalYmd(customStartDate))} to ${formatYmdInTimeZone(parseLocalYmd(customEndDate))}`
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
          {/* Simple/Full toggle - minimal UI using existing Button */}
          <div className="flex items-center space-x-1 mr-2">
            <Button
              variant={displayMode === 'simple' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDisplayMode('simple')}
            >
              Simple
            </Button>
            <Button
              variant={displayMode === 'full' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDisplayMode('full')}
            >
              Full
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportReport}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </Button>
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

      {/* Filter Controls removed: unified filters live in the header. Keep month for 'month' period only if needed. */}

      {/* Summary Cards - show only in Full mode to simplify the page */}
      {displayMode === 'full' && (
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
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tips</CardTitle>
              <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalTips)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Information Alert */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-600 mr-2 mt-0.5">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-blue-800">
              <strong>Updated payroll calculation:</strong> This report has been improved to only include services with verified payments. 
              All amounts are based on actual completed payment records with positive amounts, not service prices or calendar statuses.
              Payment must be made to count towards payroll. This ensures accurate commission calculations based only on real revenue.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Tables */}
      {displayMode === 'simple' ? (
        <Card>
          <CardHeader>
            <CardTitle>Payroll (Simple)</CardTitle>
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
                      <TableHead>Staff</TableHead>
                      <TableHead className="text-right">Services</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Tips</TableHead>
                      <TableHead className="text-right">Earnings</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayrollData.map((data) => (
                      <TableRow key={data.staffId}>
                        <TableCell>
                          <div className="font-medium">{data.staffName}</div>
                          <div className="text-xs text-muted-foreground">{data.title}</div>
                        </TableCell>
                        <TableCell className="text-right">{data.totalServices}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.totalRevenue)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.totalTips)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(data.totalEarnings)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDetailStaffId(data.staffId);
                              setViewMode('detail');
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
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
                      <TableHead className="text-right">Tips</TableHead>
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
                        <TableCell className="text-right">{formatCurrency(data.totalTips)}</TableCell>
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
                            {/* Payment inspector popover (simple transparency aid) */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm">Payments</Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-96 p-3" align="end">
                                <div className="text-sm text-left space-y-2">
                                  <div className="font-medium">Payments used in period</div>
                                  {(data.appointments || []).flatMap((apt: any) => (apt._paymentsUsed || [])).length === 0 ? (
                                    <div className="text-muted-foreground">No payments in period</div>
                                  ) : (
                                    <div className="max-h-64 overflow-y-auto border rounded">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="text-left">Date</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead className="text-right">Tip</TableHead>
                                            <TableHead className="text-left">Method</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {(data.appointments || []).flatMap((apt: any) => (apt._paymentsUsed || [])).map((p: any, idx: number) => (
                                            <TableRow key={idx}>
                                              <TableCell className="text-left">{new Date(p.paymentDate || p.payment_date || p.processedAt || p.processed_at || p.createdAt || p.created_at).toLocaleDateString()}</TableCell>
                                              <TableCell className="text-right">{formatCurrency(Number(p.totalAmount ?? p.amount ?? 0))}</TableCell>
                                              <TableCell className="text-right">{formatCurrency(Number(p.tipAmount ?? 0))}</TableCell>
                                              <TableCell className="text-left">{String(p.method || '').toUpperCase()}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
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
      )}


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
    queryKey: ["/api/payroll/detailed-local", String(staffId), month.toISOString()],
    queryFn: async () => {
      // Compute locally from current APIs to ensure latest commission rate is used
      const [staffRes, userRes, svcRes, apptRes, payRes, staffSvcRes] = await Promise.all([
        fetch('/api/staff'),
        fetch('/api/users'),
        fetch('/api/services'),
        fetch('/api/appointments'),
        fetch('/api/payments'),
        fetch('/api/staff-services?staffId=' + encodeURIComponent(String(staffId))),
      ]);

      const [staffList, users, services, appointments, payments, staffServices] = await Promise.all([
        staffRes.json(),
        userRes.json(),
        svcRes.json(),
        apptRes.json(),
        payRes.json(),
        staffSvcRes.json(),
      ]);

      const start = new Date(month.getFullYear(), month.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);

      const staffMember: any = (staffList || []).find((s: any) => s.id === staffId) || {};
      // Normalize base commission rate; accept either 0.2 or 20 as input
      let baseRate = Number(staffMember.commissionRate ?? 0);
      if (baseRate > 1) baseRate = baseRate / 100;

      const user = (users || []).find((u: any) => u.id === staffMember.userId);
      const staffName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Unknown';

      // Only include appointments in month AND actually paid, using completed payments in range
      const appts = (appointments || []).filter((a: any) => {
        const aStaffId = a.staffId ?? a.staff_id;
        const aStart = new Date(a.startTime ?? a.start_time);
        const statusLower = String(a.status || a.appointment_status || '').toLowerCase();
        const paymentStatusLower = String(a.paymentStatus || a.payment_status || '').toLowerCase();
        const notCancelled = statusLower !== 'cancelled';
        const isPaid = paymentStatusLower === 'paid';
        const getPaymentDate = (p: any) => {
          const raw = p.paymentDate || p.payment_date || p.processedAt || p.processed_at;
          return raw ? new Date(raw) : null;
        };
        // Get all valid payments for this appointment (no date filter; appointment date governs period)
        const validPaymentsForAppt = (payments || []).filter((p: any) => {
          // Only consider 'completed' status
          const statusOk = (p.status === 'completed');
          
          // Must be for an appointment
          const typeOk = !p.type || p.type === 'appointment' || p.type === 'appointment_payment';
          
          // Must match this appointment
          const apptMatch = (p.appointmentId || p.appointment_id) === a.id;
          
          // Must have positive base amount (exclude tips)
          const base = p.amount ?? Math.max((p.totalAmount || 0) - (p.tipAmount || 0), 0);
          const positive = Number(base) > 0;
          
          // All criteria must be met for a payment to be considered valid
          return statusOk && typeOk && apptMatch && positive;
        });
        
        // Calculate the total payment amount (excluding tips)
        const totalPaid = validPaymentsForAppt.reduce((sum: number, p: any) => {
          const base = p.amount ?? Math.max((p.totalAmount || 0) - (p.tipAmount || 0), 0);
          return sum + (base || 0);
        }, 0);
        
        // We need at least one valid payment with positive amount
        const hasRealPayment = validPaymentsForAppt.length > 0 && totalPaid > 0;
        
        // Store valid payments for later use
        if (hasRealPayment) {
          a._validPayments = validPaymentsForAppt;
        }
        
        // All conditions must be met to include this appointment in payroll calculations
        return aStaffId === staffId && aStart >= start && aStart <= end && notCancelled && isPaid && hasRealPayment;
      });

      let totalRevenue = 0;
      let totalCommission = 0;
      const rows = appts.map((apt: any) => {
        const serviceId = apt.serviceId ?? apt.service_id;
        const service = (services || []).find((s: any) => s.id === serviceId);
        const clientId = apt.clientId ?? apt.client_id;
        const client = (users || []).find((u: any) => u.id === clientId);
        // Use the pre-filtered valid payments we stored earlier
        const appointmentPayments = apt._validPayments || [];
        // Use ONLY the latest completed payment amount for this appointment (exclude tips)
        const latestCompletedPayment = [...appointmentPayments]
          .filter((p: any) => p.status === 'completed')
          .sort((a: any, b: any) => {
            const ad = getPaymentDate(a) || new Date(0);
            const bd = getPaymentDate(b) || new Date(0);
            return ad.getTime() - bd.getTime();
          })
          .pop();
        const servicePrice = (() => {
          if (!latestCompletedPayment) return 0;
          const base = latestCompletedPayment.amount ?? Math.max((latestCompletedPayment.totalAmount || 0) - (latestCompletedPayment.tipAmount || 0), 0);
          return base || 0;
        })();
        
        // Skip this appointment if no revenue was collected
        if (servicePrice <= 0) {
          return null;  // Will be filtered out later
        }

        // Optional per-service custom commission rate; if present, use it (normalized), otherwise base rate
        let effectiveRate = baseRate;
        const assignment = (staffServices || []).find((ss: any) => (
          (ss.staffId === staffId || ss.staff_id === staffId) &&
          (ss.serviceId === serviceId || ss.service_id === serviceId)
        ));
        if (assignment) {
          const custom = assignment.customCommissionRate ?? assignment.custom_commission_rate;
          if (custom !== null && custom !== undefined) {
            let customNum = Number(custom);
            if (customNum > 1) customNum = customNum / 100;
            if (!Number.isNaN(customNum)) {
              effectiveRate = customNum;
            }
          }
        }

        let commissionAmount = 0;
        switch (staffMember.commissionType) {
          case 'commission':
            commissionAmount = servicePrice * effectiveRate;
            break;
          case 'fixed':
            commissionAmount = staffMember.fixedRate || 0;
            break;
          case 'hourly_plus_commission':
            commissionAmount = servicePrice * effectiveRate;
            break;
          default:
            commissionAmount = 0;
        }

        totalRevenue += servicePrice;
        totalCommission += commissionAmount;

        return {
          appointmentId: apt.id,
          date: apt.startTime ?? apt.start_time,
          clientName: client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() : 'Unknown',
          serviceName: service?.name || 'Service',
          duration: service?.duration || 60,
          servicePrice,
          commissionRate: effectiveRate,
          commissionAmount,
          paymentStatus: 'paid',
        };
      });

      // Filter out any null rows (those with no valid payments or zero amount)
      const validRows = rows.filter((row: any) => row !== null);
      
      return {
        staffName,
        title: staffMember.title,
        commissionType: staffMember.commissionType,
        baseCommissionRate: baseRate,
        hourlyRate: staffMember.hourlyRate ?? null,
        summary: {
          totalAppointments: validRows.length,
          totalRevenue,
          totalCommission,
          averageCommissionPerService: validRows.length > 0 ? (totalCommission / validRows.length) : 0,
        },
        appointments: validRows,
      };
    }
  });

  console.log('DetailedPayrollView data:', detailData, 'isLoading:', isLoading);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Summary
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!detailData) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Summary
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No payroll data found for this period.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
              {detailData.staffName} ({detailData.title}) - {format(month, 'MMMM yyyy')}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {detailData.summary.totalAppointments}
            </div>
            <div className="text-sm text-blue-600">Total Appointments</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(detailData.summary.totalRevenue)}
            </div>
            <div className="text-sm text-green-600">Total Revenue</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(detailData.summary.totalCommission)}
            </div>
            <div className="text-sm text-purple-600">Total Commission</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(detailData.summary.averageCommissionPerService)}
            </div>
            <div className="text-sm text-orange-600">Avg Commission/Service</div>
          </div>
        </div>

        {/* Appointments Table */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Individual Appointments</h3>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Service Price</TableHead>
                  <TableHead>Commission Rate</TableHead>
                  <TableHead>Commission Earned</TableHead>
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
                    <TableCell>{appointment.duration} min</TableCell>
                    <TableCell>{formatCurrency(appointment.servicePrice)}</TableCell>
                    <TableCell>{(appointment.commissionRate * 100).toFixed(1)}%</TableCell>
                    <TableCell className="font-semibold text-green-600">
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
          <div className="text-xs text-muted-foreground mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
            <strong>Important:</strong> This report only includes appointments with verified completed payments that have positive amounts. 
            The prices shown reflect the actual paid amounts from payment records, not the original service prices. 
            Any services marked as paid in the calendar but without corresponding payment records are excluded.
            This ensures payroll calculations are based only on real revenue.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}