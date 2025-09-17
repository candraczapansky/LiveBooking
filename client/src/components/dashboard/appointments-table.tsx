import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatTime, getInitials, toCentralWallTime } from "@/lib/utils";
import { PermissionGuard } from "@/components/permissions/PermissionGuard";

const getStatusBadgeStyle = (status: string) => {
  switch(status) {
    case 'confirmed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const AppointmentsTable = () => {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const { data: allAppointments = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/appointments'],
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  const { data: services = [] } = useQuery<any[]>({
    queryKey: ['/api/services'],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  // Filter today's appointments
  const today = new Date();
  const centralToday = toCentralWallTime(today);
  const todayStart = new Date(centralToday.getFullYear(), centralToday.getMonth(), centralToday.getDate());
  const todayEnd = new Date(centralToday.getFullYear(), centralToday.getMonth(), centralToday.getDate() + 1);

  const todayAppointments = (allAppointments as any[])?.filter((apt: any) => {
    const aptDate = toCentralWallTime(apt.startTime);
    return aptDate >= todayStart && aptDate < todayEnd;
  }) || [];

  // Sort appointments by start time
  const sortedAppointments = todayAppointments.sort((a: any, b: any) => {
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading appointments...</div>;
  }

  const appointments = sortedAppointments;
  const totalAppointments = appointments?.length || 0;
  const totalPages = Math.ceil(totalAppointments / pageSize);
  const paginatedAppointments = appointments?.slice((page - 1) * pageSize, page * pageSize);

  const handlePrevPage = () => {
    setPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="px-3 py-4 border-b border-gray-200 dark:border-gray-700 sm:px-6 sm:py-5">
        <h3 className="text-base sm:text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">Today's Client Appointments</h3>
      </div>
      
      {/* Mobile Card Layout - Hidden on desktop */}
      <div className="block lg:hidden">
        {paginatedAppointments?.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            No appointments scheduled for today
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedAppointments?.map((appointment: any) => {
              const service = (services as any[])?.find((s: any) => s.id === appointment.serviceId);
              const client = (users as any[])?.find((u: any) => u.id === appointment.clientId);
              const staff = (users as any[])?.find((u: any) => u.id === appointment.staffId);
              
              return (
                <div key={appointment.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src="" alt={client?.firstName || ''} />
                          <AvatarFallback className="text-xs">
                            {getInitials(client?.firstName, client?.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {client?.firstName} {client?.lastName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {service?.name || 'Unknown Service'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatTime(appointment.startTime)}
                          </span>
                          <Badge className={getStatusBadgeStyle(appointment.status)}>
                            {appointment.status}
                          </Badge>
                          {appointment.bookingMethod && appointment.bookingMethod !== 'staff' && (
                            <Badge variant="outline" className="text-xs">
                              {appointment.bookingMethod === 'online' && '🌐 Online'}
                              {appointment.bookingMethod === 'sms' && '💬 SMS'}
                              {appointment.bookingMethod === 'external' && '🔗 External'}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {staff?.firstName} {staff?.lastName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Table Layout - Hidden on mobile */}
      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Booking</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedAppointments?.map((appointment: any) => {
              const service = (services as any[])?.find((s: any) => s.id === appointment.serviceId);
              const client = (users as any[])?.find((u: any) => u.id === appointment.clientId);
              const staff = (users as any[])?.find((u: any) => u.id === appointment.staffId);
              
              return (
                <TableRow key={appointment.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatTime(appointment.startTime)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-3">
                        <AvatarImage src="" alt="" />
                        <AvatarFallback className="text-xs">
                          {getInitials(client?.firstName, client?.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {client?.firstName} {client?.lastName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          <PermissionGuard permission="view_client_contact_info" fallback={<span className="italic text-gray-400">Hidden</span>}>
                            {client?.email}
                          </PermissionGuard>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900 dark:text-gray-100">{service?.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{service?.duration} min</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {staff?.firstName} {staff?.lastName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      {appointment.bookingMethod === 'online' && (
                        <Badge variant="outline" className="text-xs">🌐 Online</Badge>
                      )}
                      {appointment.bookingMethod === 'sms' && (
                        <Badge variant="outline" className="text-xs">💬 SMS</Badge>
                      )}
                      {appointment.bookingMethod === 'external' && (
                        <Badge variant="outline" className="text-xs">🔗 External</Badge>
                      )}
                      {(!appointment.bookingMethod || appointment.bookingMethod === 'staff') && (
                        <span className="text-gray-500 dark:text-gray-400">Staff</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge className={getStatusBadgeStyle(appointment.paymentStatus || 'pending')}>
                        {appointment.paymentStatus || 'pending'}
                      </Badge>
                      {appointment.status === 'completed' && appointment.paymentStatus === 'paid' && appointment.paymentDetails && (
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {appointment.paymentDetails.method === 'cash' && 'Cash'}
                          {appointment.paymentDetails.method === 'card' && appointment.paymentDetails.cardLast4 && `Card ****${appointment.paymentDetails.cardLast4}`}
                          {appointment.paymentDetails.method === 'card' && !appointment.paymentDetails.cardLast4 && 'Card (Unverified)'}
                          {appointment.paymentDetails.method === 'terminal' && appointment.paymentDetails.cardLast4 && `Terminal ****${appointment.paymentDetails.cardLast4}`}
                          {appointment.paymentDetails.method === 'terminal' && !appointment.paymentDetails.cardLast4 && 'Terminal (Unverified)'}
                          {appointment.paymentDetails.method === 'gift_card' && 'Gift Card'}
                          {!appointment.paymentDetails && appointment.paymentStatus === 'paid' && (
                            <span className="text-orange-600 dark:text-orange-400 font-medium">⚠️ Unverified</span>
                          )}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        {totalAppointments === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No appointments scheduled for today
          </div>
        )}
      </div>
      
      {totalPages > 1 && (
        <div className="px-3 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 hidden sm:block">
              Showing {Math.min((page - 1) * pageSize + 1, totalAppointments)} to {Math.min(page * pageSize, totalAppointments)} of {totalAppointments}
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-300 sm:hidden">
              {page} of {totalPages}
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={page === 1}
                className="h-8 px-2 sm:px-3"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline ml-1">Previous</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={page === totalPages}
                className="h-8 px-2 sm:px-3"
              >
                <span className="hidden sm:inline mr-1">Next</span>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsTable;