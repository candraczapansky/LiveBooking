import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronLeft, ChevronRight, Minus } from 'lucide-react';

export default function AppointmentsPage() {
  // Utility functions
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatDateForComparison = (date: Date) => {
    return date.getFullYear() + '-' + 
      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
      String(date.getDate()).padStart(2, '0');
  };

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [zoomLevel, setZoomLevel] = useState(1);

  const queryClient = useQueryClient();

  // Queries
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['/api/appointments'],
  });

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['/api/staff'],
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/services'],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  // Type-safe arrays
  const appointmentsArray = Array.isArray(appointments) ? appointments : [];
  const staffArray = Array.isArray(staff) ? staff : [];
  const servicesArray = Array.isArray(services) ? services : [];
  const usersArray = Array.isArray(users) ? users : [];

  // Helper functions
  const getTimeSlots = useCallback(() => {
    const slots = [];
    for (let hour = 8; hour < 22; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        slots.push(time.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        }));
      }
    }
    return slots;
  }, []);

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const handleAddAppointment = (timeSlot?: string) => {
    // TODO: Implement appointment creation
    console.log('Adding appointment for time:', timeSlot);
  };

  const getAppointmentPosition = useCallback((appointment: any) => {
    // Convert UTC to Central Time (UTC-5)
    const utcTime = new Date(appointment.startTime);
    const centralTime = new Date(utcTime.getTime() - (5 * 60 * 60 * 1000));
    
    const hour = centralTime.getHours();
    const minute = centralTime.getMinutes();
    
    // Hide appointments outside business hours
    if (hour < 8 || hour >= 22) {
      return { top: '0px', height: '0px', display: 'none' };
    }
    
    // Calculate position: 30px per 15-minute slot * zoom
    const minutesFromStart = (hour - 8) * 60 + minute;
    const slotHeight = 30 * zoomLevel;
    const topPosition = Math.round((minutesFromStart / 15) * slotHeight);
    
    // Get service duration for height
    const service = servicesArray.find((s: any) => s.id === appointment.serviceId);
    const duration = service?.duration || 60;
    const height = Math.round((duration / 15) * slotHeight);
    
    return {
      top: `${topPosition}px`,
      height: `${height}px`
    };
  }, [servicesArray, zoomLevel]);

  const renderDayView = () => {
    const timeSlots = getTimeSlots();
    const staffColumns = staffArray;
    
    // Filter appointments for current day
    const dayAppointments = appointmentsArray.filter((appointment: any) => {
      const utcTime = new Date(appointment.startTime);
      const centralTime = new Date(utcTime.getTime() - (5 * 60 * 60 * 1000));
      const currentDateStr = formatDateForComparison(currentDate);
      const appointmentDateStr = formatDateForComparison(centralTime);
      return currentDateStr === appointmentDateStr;
    });

    return (
      <div className="relative overflow-auto" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Header with staff columns */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b z-20 flex">
          <div className="w-20 flex-shrink-0 p-2 border-r">
            <div className="text-xs font-medium">Time</div>
          </div>
          {staffColumns.map((staffMember: any, index: number) => (
            <div 
              key={staffMember.id} 
              className="flex-1 p-2 border-r text-center"
              style={{ minWidth: '200px' }}
            >
              <div className="text-xs font-medium truncate">
                {staffMember.user?.firstName} {staffMember.user?.lastName}
              </div>
            </div>
          ))}
        </div>

        {/* Time slots and appointments */}
        <div className="relative">
          {/* Time grid */}
          <div className="flex">
            <div className="w-20 flex-shrink-0">
              {timeSlots.map((time: string, index: number) => (
                <div 
                  key={time} 
                  className="border-b text-xs p-1 text-right"
                  style={{ height: `${30 * zoomLevel}px` }}
                >
                  {index % 4 === 0 ? time : ''}
                </div>
              ))}
            </div>
            
            {/* Staff columns */}
            {staffColumns.map((staffMember: any, columnIndex: number) => (
              <div 
                key={staffMember.id} 
                className="flex-1 border-r relative"
                style={{ minWidth: '200px' }}
              >
                {timeSlots.map((time: string) => (
                  <div 
                    key={time}
                    className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    style={{ height: `${30 * zoomLevel}px` }}
                    onClick={() => handleAddAppointment(time)}
                  />
                ))}
                
                {/* Appointments for this staff member */}
                {dayAppointments
                  .filter((appointment: any) => appointment.staffId === staffMember.id)
                  .map((appointment: any) => {
                    const position = getAppointmentPosition(appointment);
                    const service = servicesArray.find((s: any) => s.id === appointment.serviceId);
                    const client = usersArray.find((u: any) => u.id === appointment.clientId);
                    const centralTime = new Date(new Date(appointment.startTime).getTime() - (5 * 60 * 60 * 1000));
                    
                    return (
                      <div
                        key={appointment.id}
                        className="absolute left-1 right-1 rounded border-l-4 p-1 shadow-sm hover:shadow-md cursor-pointer"
                        style={{
                          ...position,
                          backgroundColor: service?.color || '#e2e8f0',
                          borderLeftColor: service?.color || '#64748b',
                          zIndex: 10
                        }}
                        onClick={() => {
                          console.log('Clicked appointment:', appointment.id);
                        }}
                      >
                        <div className="text-xs font-medium truncate">
                          {service?.name || 'Unknown Service'}
                        </div>
                        <div className="text-xs opacity-90 truncate">
                          {client?.firstName} {client?.lastName}
                        </div>
                        <div className="text-xs opacity-75">
                          {centralTime.toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit', 
                            hour12: true 
                          })}
                        </div>
                        {appointment.paymentStatus === 'paid' && (
                          <Badge className="absolute top-0 right-0 text-xs bg-green-500">
                            PAID
                          </Badge>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    return (
      <div className="p-4">
        <div className="text-center text-gray-500">
          Week view - Coming soon
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    return (
      <div className="p-4">
        <div className="text-center text-gray-500">
          Month view - Coming soon
        </div>
      </div>
    );
  };

  if (appointmentsLoading || staffLoading || servicesLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Appointments</h1>
          <Button onClick={() => handleAddAppointment()}>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[150px] text-center">
              {formatDate(currentDate)}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* View Mode Selector */}
          <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setZoomLevel(Math.max(0.25, zoomLevel - 0.25))}
              disabled={zoomLevel <= 0.25}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-sm min-w-[50px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setZoomLevel(Math.min(4, zoomLevel + 0.25))}
              disabled={zoomLevel >= 4}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
      </div>


    </div>
  );
}