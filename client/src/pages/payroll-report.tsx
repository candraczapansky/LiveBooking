import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, DollarSignIcon, TrendingUpIcon, UsersIcon, RefreshCw } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns";

interface PayrollData {
  staffId: number;
  staffName: string;
  title: string;
  commissionType: string;
  baseCommissionRate: number;
  totalServices: number;
  totalRevenue: number;
  totalCommission: number;
  totalHours?: number;
  hourlyWage?: number;
  totalHourlyPay?: number;
  totalEarnings: number;
  appointments: any[];
}

export default function PayrollReport() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [syncing, setSyncing] = useState<number | null>(null); // Track which staff member is being synced

  // Fetch staff data
  const { data: staff } = useQuery({
    queryKey: ['/api/staff'],
  });

  // Fetch appointments for the selected period
  const { data: appointments } = useQuery({
    queryKey: ['/api/appointments'],
  });

  // Fetch services data
  const { data: services } = useQuery({
    queryKey: ['/api/services'],
  });

  // Fetch users to get staff member names
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
  });

  // Fetch staff services (to get custom rates)
  const { data: staffServices } = useQuery({
    queryKey: ['/api/staff-services'],
  });

  // Fetch staff earnings from database
  const { data: staffEarnings } = useQuery({
    queryKey: ['/api/staff-earnings'],
  });

  // Calculate payroll data
  const payrollData = useMemo(() => {
    if (!staff || !appointments || !services || !users || !staffServices) return [];
    
    // If we have staff earnings data from database, use that instead of calculated values
    if (staffEarnings && staffEarnings.length > 0) {
      return calculatePayrollFromEarnings();
    }

    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);

    // Filter appointments for the selected month and completed/paid status
    const monthlyAppointments = (appointments as any[]).filter((apt: any) => {
      const aptDate = new Date(apt.startTime);
      return isWithinInterval(aptDate, { start: monthStart, end: monthEnd }) && 
             (apt.status === 'completed' || apt.paymentStatus === 'paid');
    });

    return (staff as any[]).map((staffMember: any) => {
      const user = (users as any[]).find((u: any) => u.id === staffMember.userId);
      const staffName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';

      // Get appointments for this staff member
      const staffAppointments = monthlyAppointments.filter((apt: any) => apt.staffId === staffMember.id);

      let totalRevenue = 0;
      let totalCommission = 0;
      let totalServices = staffAppointments.length;

      // Calculate earnings for each appointment using custom rates with fallbacks
      let totalHourlyPay = 0;
      let totalHours = 0;

      staffAppointments.forEach((apt: any) => {
        const service = (services as any[]).find((s: any) => s.id === apt.serviceId);
        if (service) {
          const serviceRevenue = service.price;
          totalRevenue += serviceRevenue;

          // Find staff service assignment for custom rates
          const staffService = (staffServices as any[]).find((ss: any) => 
            ss.staffId === staffMember.id && ss.serviceId === service.id
          );

          let appointmentEarnings = 0;

          if (staffMember.commissionType === 'commission') {
            // Use custom commission rate if available, otherwise use default
            let commissionRate = staffService?.customCommissionRate ?? staffMember.commissionRate ?? 0;
            
            // Custom commission rates are stored as percentages (e.g., 4 = 4%), 
            // but default staff rates are stored as decimals (e.g., 0.45 = 45%)
            if (staffService?.customCommissionRate !== undefined && staffService?.customCommissionRate !== null) {
              commissionRate = commissionRate / 100; // Convert percentage to decimal
            }
            
            appointmentEarnings = serviceRevenue * commissionRate;
          } else if (staffMember.commissionType === 'hourly') {
            // Use custom hourly rate if available, otherwise use default
            const hourlyRate = staffService?.customRate ?? staffMember.hourlyRate ?? 0;
            const serviceDuration = service.duration || 60; // Duration in minutes
            const hours = serviceDuration / 60;
            appointmentEarnings = hourlyRate * hours;
            totalHours += hours;
          } else if (staffMember.commissionType === 'fixed') {
            // Use custom fixed rate if available, otherwise use default
            appointmentEarnings = staffService?.customRate ?? staffMember.fixedRate ?? 0;
          }

          totalCommission += appointmentEarnings;
        }
      });

      // For hourly staff, calculate total hourly pay separately for display
      if (staffMember.commissionType === 'hourly') {
        totalHourlyPay = totalCommission; // Already calculated above
      }

      // Calculate total earnings based on commission type
      let totalEarnings = 0;
      switch (staffMember.commissionType) {
        case 'commission':
          totalEarnings = totalCommission;
          break;
        case 'hourly':
          totalEarnings = totalHourlyPay;
          break;
        case 'hourly_plus_commission':
          totalEarnings = totalHourlyPay + totalCommission;
          break;
        case 'fixed':
          totalEarnings = totalServices * (staffMember.fixedRate || 0);
          break;
        default:
          totalEarnings = totalCommission;
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
        totalHours: totalHours > 0 ? totalHours : undefined,
        hourlyWage: staffMember.hourlyRate,
        totalHourlyPay: totalHourlyPay > 0 ? totalHourlyPay : undefined,
        totalEarnings,
        appointments: staffAppointments,
      };
    });
  }, [staff, appointments, services, users, staffServices, staffEarnings, selectedMonth]);

  // Calculate payroll from staff earnings database records
  const calculatePayrollFromEarnings = () => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);

    return (staff as any[]).map((staffMember: any) => {
      const user = (users as any[]).find((u: any) => u.id === staffMember.userId);
      const staffName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';

      // Get earnings for this staff member in the selected month
      const monthlyEarnings = (staffEarnings as any[]).filter((earning: any) => {
        const earningDate = new Date(earning.earningsDate);
        return earning.staffId === staffMember.id &&
               isWithinInterval(earningDate, { start: monthStart, end: monthEnd });
      });

      const totalEarnings = monthlyEarnings.reduce((sum: number, earning: any) => sum + earning.earningsAmount, 0);
      const totalServices = monthlyEarnings.length;
      const totalRevenue = monthlyEarnings.reduce((sum: number, earning: any) => sum + earning.servicePrice, 0);

      return {
        staffId: staffMember.id,
        staffName,
        title: staffMember.title,
        commissionType: staffMember.commissionType,
        baseCommissionRate: staffMember.commissionRate || 0,
        totalServices,
        totalRevenue,
        totalCommission: totalEarnings,
        totalEarnings,
        appointments: monthlyEarnings,
      };
    });
  };

  // Filter by selected staff member
  const filteredPayrollData = selectedStaff === "all" 
    ? payrollData 
    : payrollData.filter((data: any) => data.staffId.toString() === selectedStaff);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalStaff = filteredPayrollData.length;
    const totalRevenue = filteredPayrollData.reduce((sum: number, data: any) => sum + data.totalRevenue, 0);
    const totalPayroll = filteredPayrollData.reduce((sum: number, data: any) => sum + data.totalEarnings, 0);
    const totalServices = filteredPayrollData.reduce((sum: number, data: any) => sum + data.totalServices, 0);

    return {
      totalStaff,
      totalRevenue,
      totalPayroll,
      totalServices,
      averageEarnings: totalStaff > 0 ? totalPayroll / totalStaff : 0,
    };
  }, [filteredPayrollData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  const getCommissionTypeBadge = (type: string) => {
    const variants: Record<string, any> = {
      commission: "default",
      hourly: "secondary",
      hourly_plus_commission: "outline",
      fixed: "destructive",
    };
    
    const labels: Record<string, string> = {
      commission: "Commission",
      hourly: "Hourly",
      hourly_plus_commission: "Hourly + Commission",
      fixed: "Fixed Rate",
    };

    return (
      <Badge variant={variants[type] || "default"}>
        {labels[type] || type}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Input
                id="month"
                type="month"
                value={format(selectedMonth, 'yyyy-MM')}
                onChange={(e) => setSelectedMonth(new Date(e.target.value + '-01'))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff">Staff Member</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staff && Array.isArray(staff) && staff.map((staffMember: any) => {
                    const user = users && Array.isArray(users) && users.find((u: any) => u.id === staffMember.userId);
                    const name = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
                    return (
                      <SelectItem key={staffMember.id} value={staffMember.id.toString()}>
                        {name} - {staffMember.title}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedMonth(subMonths(new Date(), 1))}
            >
              Last Month
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedMonth(new Date())}
            >
              Current Month
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(summaryStats.totalRevenue)}</p>
              </div>
              <DollarSignIcon className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Payroll</p>
                <p className="text-2xl font-bold">{formatCurrency(summaryStats.totalPayroll)}</p>
              </div>
              <TrendingUpIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Services</p>
                <p className="text-2xl font-bold">{summaryStats.totalServices}</p>
              </div>
              <UsersIcon className="h-8 w-8 text-pink-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Earnings</p>
                <p className="text-2xl font-bold">{formatCurrency(summaryStats.averageEarnings)}</p>
              </div>
              <TrendingUpIcon className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Payroll Details - {format(selectedMonth, 'MMMM yyyy')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Pay Type</TableHead>
                  <TableHead className="text-right">Services</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Commission Rate</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Hourly Pay</TableHead>
                  <TableHead className="text-right">Total Earnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayrollData.map((data) => (
                  <TableRow key={data.staffId}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{data.staffName}</p>
                        <p className="text-sm text-gray-500">{data.title}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getCommissionTypeBadge(data.commissionType)}
                    </TableCell>
                    <TableCell className="text-right">{data.totalServices}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.totalRevenue)}</TableCell>
                    <TableCell className="text-right">
                      {formatPercentage(data.baseCommissionRate)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(data.totalCommission)}</TableCell>
                    <TableCell className="text-right">
                      {data.totalHours ? formatHours(data.totalHours) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {data.totalHourlyPay ? formatCurrency(data.totalHourlyPay) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(data.totalEarnings)}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPayrollData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No payroll data found for the selected period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {filteredPayrollData.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="flex justify-end">
                <div className="space-y-2">
                  <div className="flex justify-between gap-8">
                    <span className="font-medium">Total Revenue:</span>
                    <span>{formatCurrency(summaryStats.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between gap-8">
                    <span className="font-medium">Total Payroll:</span>
                    <span className="font-bold text-lg">{formatCurrency(summaryStats.totalPayroll)}</span>
                  </div>
                  <div className="flex justify-between gap-8 text-sm text-gray-600 dark:text-gray-400">
                    <span>Payroll % of Revenue:</span>
                    <span>
                      {summaryStats.totalRevenue > 0 
                        ? formatPercentage(summaryStats.totalPayroll / summaryStats.totalRevenue)
                        : '0%'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}