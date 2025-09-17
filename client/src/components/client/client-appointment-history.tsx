import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, DollarSign, User } from "lucide-react";


import { format } from "date-fns";

type Appointment = {
  id: number;
  startTime: string;
  endTime: string;
  paymentStatus: string;
  status: string;
  paymentMethod?: string;
  rescheduledFrom?: number | null;
  rescheduledTo?: number | null;
  paymentDetails?: {
    method?: string;
    cardLast4?: string;
    giftCardNumber?: string;
    processedAt?: string;
  };
  service: {
    id: number;
    name: string;
    price: number;
    color: string;
  };
  staff: {
    id: number;
    user: {
      firstName: string;
      lastName: string;
    };
  };
};

interface ClientAppointmentHistoryProps {
  clientId: number;
  currentAppointmentStartTime?: string | Date;
}

export default function ClientAppointmentHistory({ clientId, currentAppointmentStartTime }: ClientAppointmentHistoryProps) {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['/api/appointments/client', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/appointments/client/${clientId}`);
      if (!response.ok) throw new Error('Failed to fetch client appointments');
      return response.json();
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'no-show':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getPaymentStatusColor = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatPaymentMethod = (method?: string) => {
    if (!method) return '';
    switch (method) {
      case 'cash':
        return 'Cash';
      case 'card':
        return 'Card';
      case 'terminal':
        return 'Terminal';
      case 'gift_card':
        return 'Gift Card';
      case 'check':
        return 'Check';
      default:
        return method.charAt(0).toUpperCase() + method.slice(1);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Appointment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Appointment History
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {Array.isArray(appointments) && appointments.length > 0 && currentAppointmentStartTime && (() => {
          try {
            const currentStart = new Date(currentAppointmentStartTime);
            const previous = [...appointments]
              .filter((a: Appointment) => new Date(a.startTime).getTime() < currentStart.getTime())
              .sort((a: Appointment, b: Appointment) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];
            if (!previous) return null;
            const prevDate = new Date(previous.startTime);
            const prevStaff = `${previous.staff.user.firstName} ${previous.staff.user.lastName}`;
            return (
              <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Previous appointment:</span> {format(prevDate, 'MMM dd, yyyy')} — {previous.service.name} with {prevStaff}
              </div>
            );
          } catch {
            return null;
          }
        })()}
        {!appointments || appointments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No appointments found for this client.
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment: Appointment) => {
              const startDate = new Date(appointment.startTime);
              const endDate = new Date(appointment.endTime);
              const staffName = `${appointment.staff.user.firstName} ${appointment.staff.user.lastName}`;
              
              return (
                <div
                  key={appointment.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{appointment.service.name}</h4>
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                            {appointment.status}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(appointment.paymentStatus)}`}>
                            {appointment.paymentStatus}
                            {appointment.status === 'completed' && appointment.paymentStatus === 'paid' && appointment.paymentDetails && (
                              <span className="ml-1">
                                {appointment.paymentDetails.method === 'cash' && '(Cash)'}
                                {appointment.paymentDetails.method === 'card' && appointment.paymentDetails.cardLast4 && `(****${appointment.paymentDetails.cardLast4})`}
                                {appointment.paymentDetails.method === 'card' && !appointment.paymentDetails.cardLast4 && '(Card)'}
                                {appointment.paymentDetails.method === 'terminal' && appointment.paymentDetails.cardLast4 && `(****${appointment.paymentDetails.cardLast4})`}
                                {appointment.paymentDetails.method === 'terminal' && !appointment.paymentDetails.cardLast4 && '(Terminal)'}
                                {appointment.paymentDetails.method === 'gift_card' && appointment.paymentDetails.giftCardNumber && `(Gift Card)`}
                              </span>
                            )}
                            {appointment.status === 'completed' && appointment.paymentStatus === 'paid' && !appointment.paymentDetails && appointment.paymentMethod && (
                              <span className="ml-1">({formatPaymentMethod(appointment.paymentMethod)})</span>
                            )}
                            {appointment.status === 'completed' && appointment.paymentStatus === 'paid' && !appointment.paymentDetails && (
                              <span className="ml-1 text-orange-600">⚠️</span>
                            )}
                          </span>
                          {(appointment.rescheduledFrom || appointment.rescheduledTo) && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                              Rescheduled
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(startDate, 'MMM dd, yyyy')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {staffName}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {formatPrice(appointment.service.price)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}