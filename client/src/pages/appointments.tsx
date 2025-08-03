import { useState, useEffect } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useSidebar } from "@/contexts/SidebarContext";
import { useLocation } from "@/contexts/LocationContext";
import { apiRequest } from "@/lib/queryClient";
import AppointmentForm from "@/components/appointments/appointment-form";
import AppointmentCheckout from "@/components/appointments/appointment-checkout";
import AppointmentDetails from "@/components/appointments/appointment-details";
import { Plus, Calendar, List, Clock, User, DollarSign, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatTime, formatPrice } from "@/lib/utils";
import BigCalendar, { AppointmentEvent, CalendarResource } from "@/components/calendar/BigCalendar";
import { Calendar as MiniCalendar } from "@/components/ui/calendar";
import { addMinutes, startOfDay, endOfDay, isWithinInterval, setHours, setMinutes, getDay } from 'date-fns';

const AppointmentsPage = () => {
  useDocumentTitle("Client Appointments | Glo Head Spa");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOpen: sidebarOpen } = useSidebar();
  const { selectedLocation } = useLocation();
  
  // State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutAppointment, setCheckoutAppointment] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>("week");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsAppointmentId, setDetailsAppointmentId] = useState<number | null>(null);
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>("all");

  // Queries
  const { data: appointments = [], isLoading: appointmentsLoading, refetch } = useQuery({
    queryKey: ['/api/appointments', selectedLocation?.id],
    queryFn: async () => {
      const url = selectedLocation?.id 
        ? `/api/appointments?locationId=${selectedLocation.id}`
        : '/api/appointments';
      const response = await apiRequest("GET", url);
      return response.json();
    },
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['/api/staff', selectedLocation?.id],
    queryFn: async () => {
      const url = selectedLocation?.id 
        ? `/api/staff?locationId=${selectedLocation.id}`
        : '/api/staff';
      const response = await apiRequest("GET", url);
      return response.json();
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ['/api/services', selectedLocation?.id],
    queryFn: async () => {
      const url = selectedLocation?.id 
        ? `/api/services?locationId=${selectedLocation.id}`
        : '/api/services';
      const response = await apiRequest("GET", url);
      return response.json();
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest("GET", '/api/users');
      return response.json();
    },
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['/api/schedules', selectedLocation?.id],
    queryFn: async () => {
      const url = selectedLocation?.id 
        ? `/api/schedules?locationId=${selectedLocation.id}`
        : '/api/schedules';
      const response = await apiRequest("GET", url);
      return response.json();
    },
  });

  // Force refetch appointments when component mounts (after login)
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Filter appointments and resources based on selected staff filter
  const filteredAppointments = appointments.filter((apt: any) => {
    if (selectedStaffFilter === "all") return true;
    return apt.staffId === parseInt(selectedStaffFilter);
  });

  const filteredResources = staff.filter((s: any) => {
    if (selectedStaffFilter === "all") return true;
    return s.id === parseInt(selectedStaffFilter);
  });

  // Reset staff filter when switching to day view (show all staff)
  useEffect(() => {
    if (calendarView === 'day') {
      setSelectedStaffFilter("all");
    }
  }, [calendarView]);

  // Handlers
  const handleAddAppointment = () => {
    setSelectedAppointmentId(null);
    setIsFormOpen(true);
  };

  // New: handle slot selection from calendar
  const handleSelectSlot = (slotInfo: any) => {
    setSelectedAppointmentId(null);
    setIsFormOpen(true);
    if (slotInfo.start) {
      setSelectedDate(slotInfo.start);
    }
  };

  const handleAppointmentClick = (appointmentId: number) => {
    // Open appointment details instead of form
    setDetailsAppointmentId(appointmentId);
    setIsDetailsOpen(true);
  };

  const handleEditAppointment = (appointmentId: number) => {
    setSelectedAppointmentId(appointmentId);
    setIsFormOpen(true);
  };

  const handleDeleteAppointment = (appointmentId: number) => {
    // Refresh the appointments list after deletion
    refetch();
  };

  const handlePayment = (appointment: any) => {
    setCheckoutAppointment(appointment);
    setIsCheckoutOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsCheckoutOpen(false);
    setCheckoutAppointment(null);
    refetch();
    // toast notification removed (toast system is currently disabled)
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'unpaid': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'refunded': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  // Helper: Get unavailable (gray) times for each staff/resource for the current view and date
  function getBackgroundEvents() {
    if (!schedules || !staff) return [];
    const events: any[] = [];
    
    // Use filtered staff for background events
    const staffToShow = selectedStaffFilter === "all" ? staff : staff.filter((s: any) => s.id === parseInt(selectedStaffFilter));
    
    // For each staff member
    staffToShow.forEach((s: any) => {
      // For each day in the current view (for now, just use selectedDate or today)
      const baseDate = selectedDate || new Date();
      // For week view, show for all 7 days; for day view, just one day
      const days = calendarView === 'week'
        ? Array.from({ length: 7 }, (_, i) => {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() - d.getDay() + i); // start from Sunday
            return d;
          })
        : [baseDate];
      
      days.forEach((date) => {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        
        // Find all schedules for this staff on this day (including blocked ones)
        const allStaffSchedules = (schedules as any[]).filter((sch: any) =>
          sch.staffId === s.id &&
          sch.dayOfWeek === dayName &&
          sch.startDate <= date.toISOString().slice(0, 10) &&
          (!sch.endDate || sch.endDate >= date.toISOString().slice(0, 10))
        );
        
        // Separate blocked and non-blocked schedules
        const blockedSchedules = allStaffSchedules.filter((sch: any) => sch.isBlocked);
        const availableSchedules = allStaffSchedules.filter((sch: any) => !sch.isBlocked);
        
        // Get existing appointments for this staff on this day
        const staffAppointments = appointments.filter((apt: any) => {
          const aptDate = new Date(apt.startTime);
          return apt.staffId === s.id && 
                 aptDate.toDateString() === date.toDateString();
        });
        
        // If no schedule at all, gray out the whole day
        if (allStaffSchedules.length === 0) {
          events.push({
            start: startOfDay(date),
            end: endOfDay(date),
            resourceId: s.id,
            allDay: false,
            title: '',
            type: 'unavailable',
            style: { backgroundColor: '#e5e7eb', opacity: 0.5 },
          });
        } else {
          // Handle blocked schedules - show them as grayed out areas
          blockedSchedules.forEach((sch: any) => {
            const [startHour, startMinute] = sch.startTime.split(':').map(Number);
            const [endHour, endMinute] = sch.endTime.split(':').map(Number);
            const blockStart = setMinutes(setHours(startOfDay(date), startHour), startMinute);
            const blockEnd = setMinutes(setHours(startOfDay(date), endHour), endMinute);
            
            events.push({
              start: blockStart,
              end: blockEnd,
              resourceId: s.id,
              allDay: false,
              title: 'Blocked',
              type: 'unavailable',
              style: { backgroundColor: '#6b7280', opacity: 0.8 }, // Darker gray for blocked slots
            });
          });
          
          // Handle available schedules - gray out before/after working hours
          availableSchedules.forEach((sch: any) => {
            const [startHour, startMinute] = sch.startTime.split(':').map(Number);
            const [endHour, endMinute] = sch.endTime.split(':').map(Number);
            const workStart = setMinutes(setHours(startOfDay(date), startHour), startMinute);
            const workEnd = setMinutes(setHours(startOfDay(date), endHour), endMinute);
            
            // Before work
            if (startHour > 0 || startMinute > 0) {
              events.push({
                start: startOfDay(date),
                end: workStart,
                resourceId: s.id,
                allDay: false,
                title: '',
                type: 'unavailable',
                style: { backgroundColor: '#e5e7eb', opacity: 0.5 },
              });
            }
            
            // After work
            if (endHour < 23 || endMinute < 59) {
              events.push({
                start: workEnd,
                end: endOfDay(date),
                resourceId: s.id,
                allDay: false,
                title: '',
                type: 'unavailable',
                style: { backgroundColor: '#e5e7eb', opacity: 0.5 },
              });
            }
            
            // Gray out time slots that conflict with existing appointments
            staffAppointments.forEach((apt: any) => {
              const aptStart = new Date(apt.startTime);
              const aptEnd = new Date(apt.endTime || apt.startTime);
              
              // Only gray out if the appointment is within working hours
              if (aptStart >= workStart && aptEnd <= workEnd) {
                events.push({
                  start: aptStart,
                  end: aptEnd,
                  resourceId: s.id,
                  allDay: false,
                  title: 'Booked',
                  type: 'unavailable',
                  style: { backgroundColor: '#9ca3af', opacity: 0.7 }, // Darker gray for booked slots
                });
              }
            });
          });
        }
      });
    });
    return events;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <style>{`
        div[style*='position: fixed'][style*='bottom'][style*='white'],
        div[style*='position: absolute'][style*='bottom'][style*='white'],
        div[style*='background: white'],
        div[style*='background-color: white'],
        div[style*='background: #fff'],
        div[style*='background-color: #fff'],
        div[style*='background: #ffffff'],
        div[style*='background-color: #ffffff'] {
          display: none !important;
        }
      `}</style>
      <SidebarController />
      <div className={`flex flex-col transition-all duration-300 ${
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
      }`}>
        <Header />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto flex gap-6 min-h-0" style={{height: 'calc(100vh - 48px)'}}>
            {/* Left Sidebar: Mini Calendar */}
            <div className="hidden md:flex flex-col w-72 gap-6 flex-shrink-0">
              <MiniCalendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date as Date);
                  setCalendarView('day');
                }}
                className="rounded-lg border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm"
              />
            </div>
            {/* Main Content */}
            <div className="flex-1 flex flex-col gap-6 min-h-0 overflow-y-auto">
              {/* Header */}
              <div className="mb-0 flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    Client Appointments
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Manage and view all client appointments
                  </p>
                </div>
                <Button onClick={handleAddAppointment} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Appointment
                </Button>
              </div>

              {/* Appointments Calendar */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Appointments Calendar
                      </CardTitle>
                      <CardDescription>
                        View appointments by staff in day, week, or month view. Click an event to edit or view details.
                      </CardDescription>
                    </div>
                    {/* Staff Filter Dropdown - Only show for week and month views */}
                    {(calendarView === 'week' || calendarView === 'month') && (
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-500" />
                        <Select value={selectedStaffFilter} onValueChange={setSelectedStaffFilter}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Filter by staff" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Staff</SelectItem>
                            {staff?.map((s: any) => (
                              <SelectItem key={s.id} value={s.id.toString()}>
                                {s.user ? `${s.user.firstName} ${s.user.lastName}` : 'Unknown Staff'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className="overflow-x-auto w-full"
                    style={{ minWidth: `${(filteredResources?.length || 0) * 300}px` }}
                  >
                    <BigCalendar
                      events={filteredAppointments?.map((apt: any) => {
                        const client = users?.find((u: any) => u.id === apt.clientId);
                        const service = services?.find((s: any) => s.id === apt.serviceId);
                        
                        // Always convert to Date objects to avoid calendar errors
                        const startDate = apt.startTime ? new Date(apt.startTime) : new Date();
                        const endDate = apt.endTime ? new Date(apt.endTime) : startDate;
                        
                        return {
                          id: apt.id,
                          title: `${client ? client.firstName + ' ' + client.lastName : 'Unknown Client'} - ${service?.name || 'Unknown Service'}`,
                          start: startDate,
                          end: endDate,
                          resourceId: apt.staffId,
                          resource: {
                            ...apt,
                            serviceColor: service?.color || '#3B82F6', // Use service color or default blue
                          },
                        };
                      }) || []}
                      resources={filteredResources?.map((s: any) => ({
                        resourceId: s.id,
                        resourceTitle: s.user ? `${s.user.firstName} ${s.user.lastName}` : 'Unknown Staff',
                      })) || []}
                      backgroundEvents={getBackgroundEvents()}
                      onSelectEvent={(event) => handleAppointmentClick(event.id)}
                      onSelectSlot={handleSelectSlot}
                      view={calendarView}
                      date={selectedDate}
                      onView={(view) => {
                        if (view === 'day' || view === 'week' || view === 'month') {
                          setCalendarView(view);
                        }
                      }}
                      onNavigate={(date) => setSelectedDate(date)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Appointment Form */}
      <AppointmentForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        appointmentId={selectedAppointmentId}
        onAppointmentCreated={(appointment) => {
          console.log("[APPOINTMENTS PAGE] onAppointmentCreated called with:", appointment);
          refetch();
        }}
        appointments={appointments} // Pass appointments to form for consistent filtering
      />

      {/* Appointment Details */}
      <AppointmentDetails
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        appointmentId={detailsAppointmentId}
        onEdit={handleEditAppointment}
        onDelete={handleDeleteAppointment}
      />

      {/* Checkout Component */}
      {checkoutAppointment && (
        <AppointmentCheckout
          appointment={checkoutAppointment}
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default AppointmentsPage;