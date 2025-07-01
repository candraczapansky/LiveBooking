import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useSidebar } from "@/contexts/SidebarContext";
import { apiRequest } from "@/lib/queryClient";
import AppointmentForm from "@/components/appointments/appointment-form";
import AppointmentCheckout from "@/components/appointments/appointment-checkout";
import { PlusCircle, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, CreditCard, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { memo } from "react";

// Force re-render when theme changes
const forceDropdownRerender = () => {
  const selectElements = document.querySelectorAll('[data-radix-select-content]');
  selectElements.forEach(el => {
    if (el instanceof HTMLElement) {
      el.style.display = 'none';
      requestAnimationFrame(() => {
        el.style.display = '';
      });
    }
  });
};
import { useLocation } from "wouter";

const timeSlots = [
  "8:00 AM", "8:15 AM", "8:30 AM", "8:45 AM",
  "9:00 AM", "9:15 AM", "9:30 AM", "9:45 AM",
  "10:00 AM", "10:15 AM", "10:30 AM", "10:45 AM",
  "11:00 AM", "11:15 AM", "11:30 AM", "11:45 AM",
  "12:00 PM", "12:15 PM", "12:30 PM", "12:45 PM",
  "1:00 PM", "1:15 PM", "1:30 PM", "1:45 PM",
  "2:00 PM", "2:15 PM", "2:30 PM", "2:45 PM",
  "3:00 PM", "3:15 PM", "3:30 PM", "3:45 PM",
  "4:00 PM", "4:15 PM", "4:30 PM", "4:45 PM",
  "5:00 PM", "5:15 PM", "5:30 PM", "5:45 PM",
  "6:00 PM", "6:15 PM", "6:30 PM", "6:45 PM",
  "7:00 PM", "7:15 PM", "7:30 PM", "7:45 PM",
  "8:00 PM", "8:15 PM", "8:30 PM", "8:45 PM",
  "9:00 PM", "9:15 PM", "9:30 PM", "9:45 PM",
  "10:00 PM"
];

// Memoized appointment component to prevent unnecessary re-renders
const AppointmentBlock = memo(({ 
  appointment, 
  appointmentStyle, 
  columnIndex, 
  columnWidth, 
  service, 
  client, 
  staff,
  onAppointmentClick,
  draggedAppointment,
  onDragStart,
  onDragEnd 
}: any) => {
  const startTime = new Date(appointment.startTime);
  const timeString = startTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true
  });

  const isPaid = appointment.paymentStatus === 'paid';
  const serviceColor = appointment.service?.color || service?.color || '#6b7280';
  const backgroundColor = serviceColor;
  const borderColor = serviceColor;
  
  const isServiceColorLight = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return brightness > 155;
  };

  const serviceName = service?.name || 'Service';
  const clientName = client ? `${client.firstName} ${client.lastName}` : `Client ${appointment.clientId}`;
  const duration = service?.duration || 60;

  return (
    <div
      key={appointment.id}
      draggable
      onDragStart={(e) => onDragStart(e, appointment)}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onAppointmentClick(appointment.id);
      }}
      className="absolute pointer-events-auto rounded-lg border-l-4 p-2 shadow-sm hover:shadow-lg transition-all duration-150 cursor-pointer hover:scale-[1.02] group relative"
      style={{
        left: `${80 + (columnIndex * columnWidth) + 4}px`,
        width: `${columnWidth - 8}px`,
        ...appointmentStyle,
        backgroundColor: backgroundColor,
        borderLeftColor: borderColor,
        color: isServiceColorLight(serviceColor) ? '#000000' : '#ffffff',
        opacity: draggedAppointment?.id === appointment.id ? 0.5 : 1
      }}
    >
      {isPaid && (
        <div className="absolute top-1 right-1 bg-white/20 text-white px-1 py-0.5 rounded text-xs font-medium">
          PAID
        </div>
      )}
      <div className="text-xs font-medium leading-tight mb-1" title={serviceName}>
        {serviceName}
      </div>
      <div className="text-xs opacity-90 leading-tight mb-1" title={clientName}>
        {clientName}
      </div>
      <div className="text-xs opacity-75 leading-tight" title={`${timeString} • ${duration} min`}>
        {timeString} • {duration} min
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the appointment data actually changed
  return (
    prevProps.appointment.id === nextProps.appointment.id &&
    prevProps.appointment.startTime === nextProps.appointment.startTime &&
    prevProps.appointment.paymentStatus === nextProps.appointment.paymentStatus &&
    prevProps.appointmentStyle.top === nextProps.appointmentStyle.top &&
    prevProps.appointmentStyle.height === nextProps.appointmentStyle.height &&
    prevProps.columnIndex === nextProps.columnIndex &&
    prevProps.columnWidth === nextProps.columnWidth
  );
});

const AppointmentsPage = () => {
  useDocumentTitle("Appointments | Glo Head Spa");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutAppointment, setCheckoutAppointment] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date('2025-07-06')); // Set to July 6, 2025 to show the week with appointments
  const { isOpen: sidebarOpen } = useSidebar();
  const [viewMode, setViewMode] = useState("day");
  const [selectedStaff, setSelectedStaff] = useState("all");
  const [selectedService, setSelectedService] = useState("all");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [draggedAppointment, setDraggedAppointment] = useState<any>(null);
  const [dragOverTimeSlot, setDragOverTimeSlot] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState({ visible: false, time: '', x: 0, y: 0 });
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);

  // Calculate time from position in calendar
  const calculateTimeFromPosition = (y: number, timeSlotHeight: number) => {
    const startHour = 8; // 8:00 AM
    const minutesPerPixel = 15 / (timeSlotHeight / 4); // 15 minutes per quarter slot
    const totalMinutes = y * minutesPerPixel;
    
    const hours = Math.floor(totalMinutes / 60) + startHour;
    const minutes = Math.floor(totalMinutes % 60);
    
    // Round to nearest 15 minutes
    const roundedMinutes = Math.round(minutes / 15) * 15;
    
    // Format time
    const displayHours = hours > 12 ? hours - 12 : hours;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = displayHours === 0 ? 12 : displayHours;
    
    return `${formattedHours}:${roundedMinutes.toString().padStart(2, '0')} ${ampm}`;
  };

  // Handle mouse move over calendar time slots
  const handleCalendarMouseMove = (e: React.MouseEvent, timeSlotIndex: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const time = calculateTimeFromPosition(timeSlotIndex * 60 + y, 60);
    
    setHoverInfo({
      visible: true,
      time: time,
      x: e.clientX,
      y: e.clientY
    });
  };

  // Handle mouse leave calendar
  const handleCalendarMouseLeave = () => {
    setHoverInfo({ visible: false, time: '', x: 0, y: 0 });
  };

  // Handle quick action navigation
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split('?')[1] || '');
    if (searchParams.get('new') === 'true') {
      setSelectedAppointmentId(null);
      setIsFormOpen(true);
      // Clean up URL without triggering navigation
      window.history.replaceState({}, '', '/appointments');
    }
  }, [location]);

  // Fetch appointments from API
  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['/api/appointments'],
  });

  // Fetch staff from API
  const { data: staff, isLoading: staffLoading } = useQuery({
    queryKey: ['/api/staff'],
  });

  // Fetch services from API
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/services'],
  });

  // Fetch users to get client information
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  // Fetch staff schedules
  const { data: schedules = [] } = useQuery({
    queryKey: ['/api/schedules'],
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Helper function to get day name from date
  const getDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  // Helper function to format date as YYYY-MM-DD
  const formatDateForComparison = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Convert 12-hour time format to 24-hour
  const convertTo24Hour = (time12h: string) => {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    if (hours === '12') {
      hours = '00';
    }
    if (modifier === 'PM') {
      hours = (parseInt(hours, 10) + 12).toString();
    }
    return `${hours.padStart(2, '0')}:${minutes}`;
  };

  // Check if a staff member is available at a specific time
  const isStaffAvailable = (staffId: number, timeSlot: string, date: Date) => {
    const dayName = getDayName(date);
    const currentDate = formatDateForComparison(date);
    
    // Find schedules for this staff member on this day
    const staffSchedules = schedules.filter((schedule: any) => 
      schedule.staffId === staffId && 
      schedule.dayOfWeek === dayName &&
      schedule.startDate <= currentDate &&
      (!schedule.endDate || schedule.endDate >= currentDate)
    );

    if (staffSchedules.length === 0) {
      return false; // No schedule = not available
    }

    // Convert time slot to 24-hour format for comparison
    const timeSlot24 = convertTo24Hour(timeSlot);
    
    // Check if the time slot falls within any of the scheduled periods
    return staffSchedules.some((schedule: any) => {
      const startTime = schedule.startTime.substring(0, 5); // Remove seconds
      const endTime = schedule.endTime.substring(0, 5);
      return timeSlot24 >= startTime && timeSlot24 < endTime && !schedule.isBlocked;
    });
  };

  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    if (viewMode === 'day') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    
    setCurrentDate(newDate);
  };

  const zoomIn = () => {
    if (zoomLevel < 3) {
      setZoomLevel(prev => Math.min(prev + 0.5, 3));
    }
  };

  const zoomOut = () => {
    if (zoomLevel > 0.5) {
      setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
    }
  };

  const handlePayment = (appointment: any) => {
    // Get service details and calculate amount
    const service = services?.find((s: any) => s.id === appointment.serviceId);
    const staffMember = staff?.find((s: any) => s.id === appointment.staffId);
    const client = users?.find((u: any) => u.id === appointment.clientId);
    
    // Use totalAmount from appointment if available, otherwise fallback to service price
    const paymentAmount = appointment.totalAmount || service?.price || 0;
    
    const checkoutData = {
      id: appointment.id,
      clientName: client ? `${client.firstName} ${client.lastName}` : 'Unknown Client',
      serviceName: service?.name || 'Unknown Service',
      staffName: staffMember?.user ? `${staffMember.user.firstName} ${staffMember.user.lastName}` : 'Unknown Staff',
      startTime: new Date(appointment.startTime),
      endTime: new Date(appointment.endTime),
      amount: paymentAmount,
      status: appointment.status,
      paymentStatus: appointment.paymentStatus || 'unpaid'
    };
    
    setCheckoutAppointment(checkoutData);
    setIsCheckoutOpen(true);
  };

  const handlePaymentSuccess = () => {
    toast({
      title: "Payment Successful",
      description: "The appointment payment has been processed successfully.",
    });
    // Refresh appointments data without page reload
    queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    setIsCheckoutOpen(false);
    setCheckoutAppointment(null);
  };

  // Drag and drop mutation
  const dragMutation = useMutation({
    mutationFn: async ({ appointmentId, newStartTime }: { appointmentId: number; newStartTime: Date }) => {
      const appointment = appointments?.find((apt: any) => apt.id === appointmentId);
      if (!appointment) throw new Error('Appointment not found');

      const service = services?.find((s: any) => s.id === appointment.serviceId);
      const duration = service?.duration || 60;
      const newEndTime = new Date(newStartTime.getTime() + duration * 60 * 1000);

      const updatedAppointment = {
        serviceId: appointment.serviceId,
        staffId: appointment.staffId,
        clientId: appointment.clientId,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
        status: appointment.status,
        notes: appointment.notes,
      };

      return apiRequest("PUT", `/api/appointments/${appointmentId}`, updatedAppointment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: "Appointment Moved",
        description: "The appointment has been successfully rescheduled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to move appointment.",
        variant: "destructive",
      });
    },
  });

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, appointment: any) => {
    setDraggedAppointment(appointment);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', appointment.id.toString());
  };

  const handleDragEnd = () => {
    setDraggedAppointment(null);
    setDragOverTimeSlot(null);
  };

  const handleDragOver = (e: React.DragEvent, timeSlot: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTimeSlot(timeSlot);
  };

  const handleDragLeave = () => {
    setDragOverTimeSlot(null);
  };

  const handleDrop = (e: React.DragEvent, timeSlot: string) => {
    e.preventDefault();
    
    if (!draggedAppointment) return;

    // Check if the staff member is available at this time slot
    const staffMember = staff?.find((s: any) => s.id === draggedAppointment.staffId);
    if (!staffMember || !isStaffAvailable(staffMember.id, timeSlot, currentDate)) {
      toast({
        title: "Cannot Move Appointment",
        description: "This staff member is not available at the selected time.",
        variant: "destructive",
      });
      setDraggedAppointment(null);
      setDragOverTimeSlot(null);
      return;
    }

    // Parse the time slot (e.g., "10:00 AM")
    const [time, period] = timeSlot.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let adjustedHours = hours;
    
    if (period === 'PM' && hours !== 12) {
      adjustedHours += 12;
    } else if (period === 'AM' && hours === 12) {
      adjustedHours = 0;
    }

    const newStartTime = new Date(currentDate);
    newStartTime.setHours(adjustedHours, minutes, 0, 0);

    dragMutation.mutate({
      appointmentId: draggedAppointment.id,
      newStartTime
    });

    setDraggedAppointment(null);
    setDragOverTimeSlot(null);
  };

  // Create stable staff column mapping that doesn't change on re-renders
  const getStaffColumn = useMemo(() => {
    return (staffName: string) => {
      if (!staff) return -1;
      
      // Sort staff by ID to ensure consistent ordering
      const sortedStaff = [...staff].sort((a: any, b: any) => a.id - b.id);
      
      return sortedStaff.findIndex((staffMember: any) => {
        const fullName = staffMember.user ? `${staffMember.user.firstName} ${staffMember.user.lastName}` : 'Unknown Staff';
        return fullName === staffName;
      });
    };
  }, [staff]);

  // Use a ref to maintain stable positioning across re-renders
  const appointmentPositionsRef = useRef(new Map());
  
  // Memoized appointment positioning that preserves existing positions
  const appointmentPositions = useMemo(() => {
    if (!appointments || !services || !staff) return appointmentPositionsRef.current;
    
    // Get existing positions to preserve them
    const existingPositions = appointmentPositionsRef.current;
    const newPositionMap = new Map();
    
    // Sort appointments by ID to ensure consistent processing order
    const sortedAppointments = [...appointments].sort((a, b) => a.id - b.id);
    
    sortedAppointments.forEach((appointment: any) => {
      // Debug time conversion issue
      const appointmentTime = new Date(appointment.startTime);
      
      if (appointment.id >= 100) {
        console.log(`[TIME DEBUG] Appointment ${appointment.id} time conversion:`, {
          stored: appointment.startTime,
          parsed: appointmentTime,
          localString: appointmentTime.toLocaleString(),
          hours: appointmentTime.getHours(),
          minutes: appointmentTime.getMinutes(),
          timezoneOffset: appointmentTime.getTimezoneOffset(),
          utcHours: appointmentTime.getUTCHours(),
          utcMinutes: appointmentTime.getUTCMinutes()
        });
      }
      
      // Get local time components for positioning calculation 
      const startHour = appointmentTime.getHours();
      const startMinute = appointmentTime.getMinutes();
      
      // Debug positioning calculation for the new appointment
      if (appointment.id >= 76) { // Debug recent appointments
        console.log(`[DEBUG] Positioning appointment ${appointment.id}:`, {
          appointmentStartTime: appointment.startTime,
          appointmentTimeObject: appointmentTime,
          startHour,
          startMinute,
          timeString: appointmentTime.toLocaleTimeString()
        });
      }
      
      // Ensure appointment is within business hours (8 AM to 10 PM)
      if (startHour < 8 || startHour >= 22) {
        newPositionMap.set(appointment.id, { top: '0px', height: '0px', display: 'none' });
        return;
      }
      
      // Calculate position based on time slots starting from 8:00 AM
      // Each time slot is 30px * zoomLevel high (regardless of 15-minute intervals)
      const totalMinutesFromStart = (startHour - 8) * 60 + startMinute;
      const slotHeight = Math.round(30 * zoomLevel); // Match the time slot rendering exactly
      
      // Calculate position based on 15-minute intervals matching timeSlots array
      // Find the slot index in the timeSlots array
      const slotIndex = Math.floor(totalMinutesFromStart / 15);
      const topPosition = slotIndex * slotHeight;
      
      // Debug positioning calculation for the new appointment
      if (appointment.id >= 110) {
        const slotIndex = Math.floor(totalMinutesFromStart / 15);
        const timeSlot = timeSlots[slotIndex];
        console.log(`[POSITION DEBUG] Appointment ${appointment.id} calculation:`, {
          startHour,
          startMinute,
          totalMinutesFromStart,
          slotHeight,
          slotIndex,
          timeSlot,
          topPosition,
          finalTopPosition: `${topPosition}px`,
          zoomLevel,
          shouldAppearAt: `${timeSlot} (${startHour}:${String(startMinute).padStart(2, '0')})`
        });
      }
      
      // Use service duration for height calculation
      const service = services.find((s: any) => s.id === appointment.serviceId);
      const serviceDuration = service?.duration || 60;
      const slotsNeeded = Math.ceil(serviceDuration / 15);
      const calculatedHeight = slotsNeeded * slotHeight;
      
      // Calculate new position for this appointment
      const newPosition = {
        top: `${topPosition}px`,
        height: `${calculatedHeight}px`
      };
      
      // Check if position has changed, if not preserve existing
      const existingPosition = existingPositions.get(appointment.id);
      if (existingPosition && 
          existingPosition.top === newPosition.top && 
          existingPosition.height === newPosition.height) {
        newPositionMap.set(appointment.id, existingPosition);
      } else {
        newPositionMap.set(appointment.id, newPosition);
      }
    });
    
    // Update the ref with the new positions
    appointmentPositionsRef.current = newPositionMap;
    return newPositionMap;
  }, [appointments, services, staff, zoomLevel]);

  const getAppointmentStyle = (appointment: any) => {
    return appointmentPositions.get(appointment.id) || { top: '0px', height: '0px', display: 'none' };
  };



  const handleAddAppointment = (timeSlot?: string) => {
    setSelectedAppointmentId(null);
    
    // Convert time slot format to match appointment form format
    if (timeSlot) {
      const [timeStr, period] = timeSlot.split(' ');
      const [hours, minutes] = timeStr.split(':');
      let hour = parseInt(hours);
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      
      const formattedTime = `${hour.toString().padStart(2, '0')}:${minutes}`;
      setSelectedTime(formattedTime);
    } else {
      setSelectedTime(undefined);
    }
    
    setIsFormOpen(true);
  };

  const handleAppointmentClick = (appointmentId: number) => {
    setSelectedAppointmentId(appointmentId);
    setIsFormOpen(true);
  };

  const getStatusColor = (appointment: any) => {
    if (appointment.paymentStatus === 'paid') {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
    }
    switch (appointment.status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'completed':
        return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  const renderDayView = () => {
    const staffCount = staff?.length || 1;
    const isMobileView = window.innerWidth < 768;
    
    // For mobile, use a simpler card-based layout
    if (isMobileView) {
      return (
        <div className="space-y-4 p-4">
          {staff?.map((staffMember: any) => {
            const staffName = staffMember.user ? `${staffMember.user.firstName} ${staffMember.user.lastName}` : 'Unknown Staff';
            const staffAppointments = appointments?.filter((appointment: any) => {
              const appointmentDate = new Date(appointment.startTime);
              const currentDateOnly = new Date(currentDate);
              
              const appointmentDateStr = appointmentDate.getFullYear() + '-' + 
                String(appointmentDate.getMonth() + 1).padStart(2, '0') + '-' + 
                String(appointmentDate.getDate()).padStart(2, '0');
              const currentDateStr = currentDateOnly.getFullYear() + '-' + 
                String(currentDateOnly.getMonth() + 1).padStart(2, '0') + '-' + 
                String(currentDateOnly.getDate()).padStart(2, '0');
              
              return appointmentDateStr === currentDateStr && 
                     appointment.staff?.id === staffMember.id;
            }) || [];

            return (
              <div key={staffMember.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-gray-100">{staffName}</h3>
                <div className="space-y-2">
                  {staffAppointments.length > 0 ? (
                    staffAppointments.map((appointment: any) => {
                      const startTime = new Date(appointment.startTime);
                      const endTime = new Date(appointment.endTime);
                      const timeString = `${startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
                      const client = users?.find((u: any) => u.id === appointment.clientId);
                      const clientName = client ? `${client.firstName} ${client.lastName}` : `Client ${appointment.clientId}`;
                      const serviceName = appointment.service?.name || 'Unknown Service';
                      const serviceColor = appointment.service?.color || '#6b7280';

                      // Check if appointment is paid
                      const isPaid = appointment.paymentStatus === 'paid';
                      const cardBackgroundClass = isPaid 
                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
                        : "bg-white dark:bg-gray-800";

                      return (
                        <div
                          key={appointment.id}
                          className={`${cardBackgroundClass} rounded-lg p-3 border-l-4 shadow-sm relative`}
                          style={{ borderLeftColor: isPaid ? '#10b981' : serviceColor }}
                          onClick={() => {
                            setSelectedAppointmentId(appointment.id);
                            setIsFormOpen(true);
                          }}
                        >
                          {isPaid && (
                            <div className="absolute top-2 right-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-2 py-1 rounded-full text-xs font-medium">
                              Paid
                            </div>
                          )}
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{serviceName}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{clientName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-500">{timeString}</div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400 text-sm italic">No appointments scheduled</div>
                  )}
                  <Button
                    onClick={() => handleAddAppointment()}
                    variant="default"
                    className="w-full"
                  >
                    + Add appointment for {staffName}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Desktop grid view
    const availableWidth = window.innerWidth - 280 - 100; // Sidebar + padding
    const columnWidth = Math.max(280, Math.floor(availableWidth / staffCount));
    
    return (
      <div className="relative overflow-x-auto">
        {/* Header with staff names */}
        <div className="flex border-b bg-white dark:bg-gray-800 sticky top-0 z-10 min-w-max">
          <div className="w-20 flex-shrink-0 border-r p-4 text-sm font-medium text-gray-600 dark:text-gray-300">
            Time
          </div>
          {staff?.map((staffMember: any) => {
            const staffName = staffMember.user ? `${staffMember.user.firstName} ${staffMember.user.lastName}` : 'Unknown Staff';
            return (
              <div 
                key={staffMember.id}
                className="border-r p-4 text-sm font-medium text-gray-900 dark:text-gray-100 flex-shrink-0" 
                style={{ width: columnWidth, minWidth: '280px' }}
              >
                <span className="truncate block">{staffName}</span>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="relative min-w-max">
          {/* Time labels and grid lines */}
          <div className="flex">
            <div className="w-20 flex-shrink-0">
              {timeSlots.map((time, index) => (
                <div 
                  key={time} 
                  className="border-r border-b px-2 py-1 text-xs text-gray-500 dark:text-gray-400 flex items-center"
                  style={{ height: Math.round(30 * zoomLevel) }}
                >
                  <span className="text-xs">{time}</span>
                </div>
              ))}
            </div>
            
            {/* Staff columns */}
            {staff?.map((staffMember: any) => (
              <div key={staffMember.id} className="flex-shrink-0 border-r relative" style={{ width: columnWidth, minWidth: '280px' }}>
                {timeSlots.map((time, index) => {
                  const isAvailable = isStaffAvailable(staffMember.id, time, currentDate);
                  
                  return (
                    <div 
                      key={time} 
                      className={`border-b transition-colors ${
                        isAvailable
                          ? `hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                              dragOverTimeSlot === time ? 'bg-blue-100 dark:bg-blue-900' : ''
                            }`
                          : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed opacity-50'
                      }`}
                      style={{ height: Math.round(30 * zoomLevel) }}
                      onDragOver={isAvailable ? (e) => handleDragOver(e, time) : undefined}
                      onDragLeave={isAvailable ? handleDragLeave : undefined}
                      onDrop={isAvailable ? (e) => handleDrop(e, time) : undefined}
                      onMouseMove={(e) => {
                        if (isAvailable) {
                          setHoverInfo({
                            visible: true,
                            time: time,
                            x: e.clientX,
                            y: e.clientY
                          });
                        }
                      }}
                      onMouseLeave={handleCalendarMouseLeave}
                      onClick={isAvailable ? () => {
                        handleAddAppointment(time);
                      } : undefined}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Appointment Blocks */}
          <div className="absolute inset-0 pointer-events-none">
            {appointments?.filter((appointment: any) => {
              // Only show appointments for the current date
              const appointmentDate = new Date(appointment.startTime);
              const currentDateOnly = new Date(currentDate);
              
              // Normalize dates to compare just year, month, and day
              const appointmentDateStr = appointmentDate.getFullYear() + '-' + 
                String(appointmentDate.getMonth() + 1).padStart(2, '0') + '-' + 
                String(appointmentDate.getDate()).padStart(2, '0');
              const currentDateStr = currentDateOnly.getFullYear() + '-' + 
                String(currentDateOnly.getMonth() + 1).padStart(2, '0') + '-' + 
                String(currentDateOnly.getDate()).padStart(2, '0');
              
              return appointmentDateStr === currentDateStr;
            })
            .sort((a: any, b: any) => {
              // Sort by start time first, then by ID for stable positioning
              const timeA = new Date(a.startTime).getTime();
              const timeB = new Date(b.startTime).getTime();
              if (timeA !== timeB) return timeA - timeB;
              return a.id - b.id;
            })
            .map((appointment: any, index: number) => {
              const startTime = new Date(appointment.startTime);
              
              // Find staff member and get column
              const staffMember = staff?.find((s: any) => s.id === appointment.staffId);
              const staffName = staffMember?.user ? `${staffMember.user.firstName} ${staffMember.user.lastName}` : 'Unknown Staff';
              const columnIndex = staff?.findIndex((s: any) => s.id === appointment.staffId) || 0;
              
              if (columnIndex === -1) return null;

              const appointmentStyle = getAppointmentStyle(appointment);
              
              // Find service and client information
              const service = services?.find((s: any) => s.id === appointment.serviceId);
              const client = users?.find((u: any) => u.id === appointment.clientId);

              // Create a stable key based on appointment's immutable properties
              const stableKey = `apt-${appointment.id}-${appointment.staffId}-${new Date(appointment.startTime).getTime()}`;
              
              // Debug the actual style being applied for recent appointments
              if (appointment.id >= 110) {
                console.log(`[STYLE DEBUG] Appointment ${appointment.id} style:`, {
                  appointmentStyle,
                  finalStyle: {
                    left: `${80 + (columnIndex * columnWidth) + 4}px`,
                    width: `${columnWidth - 8}px`,
                    ...appointmentStyle,
                    zIndex: 10
                  }
                });
              }
              
              return (
                <div
                  key={stableKey}
                  className="absolute pointer-events-auto"
                  style={{
                    left: `${20 + (columnIndex * columnWidth) + 4}px`, // Time column width + staff column offset + padding
                    width: `${columnWidth - 8}px`,
                    ...appointmentStyle,
                    zIndex: 10
                  }}
                >
                  <AppointmentBlock
                    appointment={appointment}
                    appointmentStyle={appointmentStyle}
                    columnIndex={columnIndex}
                    columnWidth={columnWidth}
                    service={service}
                    client={client}
                    staff={staffMember}
                    onAppointmentClick={(id: number) => {
                      setSelectedAppointmentId(id);
                      setIsFormOpen(true);
                    }}
                    draggedAppointment={draggedAppointment}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    const isMobile = window.innerWidth < 768;
    
    // Mobile: Show simplified card-based week view
    if (isMobile) {
      return (
        <div className="p-4 space-y-4">
          {weekDays.map((day, dayIndex) => {
            const dayAppointments = appointments?.filter((appointment: any) => {
              const appointmentDate = new Date(appointment.startTime);
              const dayStr = day.getFullYear() + '-' + 
                String(day.getMonth() + 1).padStart(2, '0') + '-' + 
                String(day.getDate()).padStart(2, '0');
              const appointmentDateStr = appointmentDate.getFullYear() + '-' + 
                String(appointmentDate.getMonth() + 1).padStart(2, '0') + '-' + 
                String(appointmentDate.getDate()).padStart(2, '0');
              
              return appointmentDateStr === dayStr;
            }) || [];

            return (
              <div key={dayIndex} className="border rounded-lg p-4 bg-white dark:bg-gray-800">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {day.toLocaleDateString('en-US', { weekday: 'long' })}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {dayAppointments.length} appointment{dayAppointments.length !== 1 ? 's' : ''}
                  </div>
                </div>
                
                {dayAppointments.length === 0 ? (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    No appointments
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayAppointments.map((appointment: any, index: number) => {
                      const startTime = new Date(appointment.startTime);
                      const timeString = startTime.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true
                      });
                      const staffName = appointment.staff?.user ? 
                        `${appointment.staff.user.firstName} ${appointment.staff.user.lastName}` : 
                        'Unknown Staff';

                      return (
                        <div 
                          key={index}
                          className="p-2 rounded border-l-4 border-primary bg-primary/5 cursor-pointer hover:bg-primary/10"
                          onClick={() => handleAppointmentClick(appointment.id)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {timeString} - {appointment.service?.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {appointment.client?.firstName} {appointment.client?.lastName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {staffName}
                              </div>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs ${getStatusColor(appointment)}`}>
                              {appointment.paymentStatus === 'paid' ? 'Paid' : appointment.status}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // Desktop: Full calendar grid view
    return (
      <div className="min-h-[600px]">
        {/* Week Header */}
        <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
          <div className="p-3 border-r border-gray-200 dark:border-gray-700"></div>
          {weekDays.map((day, index) => (
            <div key={index} className="p-3 text-center border-r border-gray-200 dark:border-gray-700 last:border-r-0">
              <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {day.getDate()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {day.toLocaleDateString('en-US', { month: 'short' })}
              </div>
            </div>
          ))}
        </div>

        {/* Time Grid */}
        <div className="relative">
          {/* Appointment overlay container - positioned absolutely to float over time slots */}
          <div className="absolute inset-0 pointer-events-none z-10">
            {weekDays.map((day, dayIndex) => (
              <div 
                key={dayIndex} 
                className="absolute pointer-events-auto"
                style={{
                  left: `${((dayIndex + 1) / 8) * 100}%`,
                  width: `${(1/8) * 100}%`,
                  height: '100%'
                }}
              >
                {appointments?.filter((appointment: any) => {
                  const appointmentDate = new Date(appointment.startTime);
                  
                  // Use toDateString() for reliable date comparison
                  const dayDateString = day.toDateString();
                  const appointmentDateString = appointmentDate.toDateString();
                  

                  
                  return dayDateString === appointmentDateString;
                })
                .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .map((appointment: any) => {
                  const appointmentDate = new Date(appointment.startTime);
                  
                  // Use service duration only (not including buffer times) for visual display
                  const appointmentService = services?.find((s: any) => s.id === appointment.serviceId);
                  const duration = appointmentService?.duration || 60; // Only the actual service time
                  
                  // Calculate position relative to 8:00 AM start
                  const appointmentHour = appointmentDate.getHours();
                  const appointmentMinute = appointmentDate.getMinutes();
                  
                  // Skip appointments outside business hours (8 AM to 10 PM)
                  if (appointmentHour < 8 || appointmentHour >= 22) {
                    return null;
                  }
                  
                  // Calculate exact top position based on minutes from 8:00 AM (fixed calculation)
                  const totalMinutesFromStart = (appointmentHour - 8) * 60 + appointmentMinute;
                  const topPosition = (totalMinutesFromStart / 30) * 60; // 60px per 30-minute slot
                  
                  // Calculate height based on duration (minimum 30px to be visible)
                  const heightInPixels = Math.max(30, (duration / 30) * 60);
                  
                  const staffName = appointment.staff?.user ? 
                    `${appointment.staff.user.firstName} ${appointment.staff.user.lastName}` : 
                    'Unknown Staff';

                  return (
                    <div
                      key={`appointment-${appointment.id}`}
                      className="absolute text-white rounded p-1 text-xs cursor-pointer"
                      style={{
                        backgroundColor: appointment.service?.color || '#6b7280',
                        color: '#ffffff',
                        height: `${heightInPixels - 4}px`,
                        top: `${topPosition + 2}px`,
                        left: '4px',
                        right: '4px',
                        zIndex: 20
                      }}
                      onClick={() => handleAppointmentClick(appointment.id)}
                    >
                      <div className="font-medium truncate">
                        {appointment.service?.name}
                      </div>
                      <div className="truncate opacity-90">
                        {appointment.client?.firstName} {appointment.client?.lastName}
                      </div>
                      <div className="truncate opacity-75 text-xs">
                        {staffName}
                      </div>
                      {appointment.paymentStatus === 'paid' && (
                        <div className="text-xs opacity-90">✓ Paid</div>
                      )}
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            ))}
          </div>
          
          {/* Time slot grid - this provides the visual structure and time labels */}
          {timeSlots.map((timeSlot, timeIndex) => (
            <div key={timeIndex} className="grid grid-cols-8 min-h-[60px] border-b border-gray-100 dark:border-gray-800">
              {/* Time Label */}
              <div className="p-2 text-right text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                {timeSlot}
              </div>
              
              {/* Day Columns - empty but provide grid structure */}
              {weekDays.map((day, dayIndex) => (
                <div 
                  key={dayIndex} 
                  className="relative border-r border-gray-100 dark:border-gray-800 last:border-r-0 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" 
                  style={{ height: '60px' }}
                  onMouseMove={(e) => handleCalendarMouseMove(e, timeIndex)}
                  onMouseLeave={handleCalendarMouseLeave}
                >
                  {/* Empty - appointments are handled by the overlay above */}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthDays = getDaysInMonth(currentDate);
    const isMobile = window.innerWidth < 768;
    
    // Mobile: Use a more spacious card-based layout
    if (isMobile) {
      return (
        <div className="p-3 space-y-4">
          {/* Month header with navigation */}
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('prev')}
              className="h-9 w-9 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('next')}
              className="h-9 w-9 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Simplified day headers */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <div key={index} className="text-center text-sm font-medium text-gray-600 dark:text-gray-300 py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid with better spacing */}
          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((day, index) => {
              if (!day) {
                return <div key={index} className="h-20"></div>;
              }
              
              const isToday = day.toDateString() === new Date().toDateString();
              const dayAppointments = appointments?.filter((appointment: any) => {
                const appointmentDate = new Date(appointment.startTime);
                const dayStr = day.getFullYear() + '-' + 
                  String(day.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(day.getDate()).padStart(2, '0');
                const appointmentDateStr = appointmentDate.getFullYear() + '-' + 
                  String(appointmentDate.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(appointmentDate.getDate()).padStart(2, '0');
                
                return appointmentDateStr === dayStr;
              }) || [];
              
              return (
                <div 
                  key={index} 
                  className={`h-20 border-2 rounded-lg p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all ${
                    isToday 
                      ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-600' 
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                  } active:scale-95`}
                  onClick={() => {
                    setCurrentDate(day);
                    setViewMode('day');
                  }}
                >
                  {/* Date number */}
                  <div className={`text-sm font-semibold mb-1 ${
                    isToday 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {day.getDate()}
                  </div>
                  
                  {/* Appointment indicators */}
                  {dayAppointments.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {dayAppointments.slice(0, 2).map((appointment: any, i: number) => (
                        <div 
                          key={i}
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: appointment.service?.color || '#6b7280'
                          }}
                        />
                      ))}
                      {dayAppointments.length > 2 && (
                        <div className="text-xs text-gray-500 font-medium">
                          +{dayAppointments.length - 2}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Desktop: Use original compact layout
    return (
      <div className="p-4">
        {/* Compact day headers for desktop */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-xs font-medium text-gray-600 dark:text-gray-300">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid - compact for desktop */}
        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((day, index) => {
            if (!day) {
              return <div key={index} className="h-24"></div>;
            }
            
            const isToday = day.toDateString() === new Date().toDateString();
            const dayAppointments = appointments?.filter((appointment: any) => {
              const appointmentDate = new Date(appointment.startTime);
              const dayStr = day.getFullYear() + '-' + 
                String(day.getMonth() + 1).padStart(2, '0') + '-' + 
                String(day.getDate()).padStart(2, '0');
              const appointmentDateStr = appointmentDate.getFullYear() + '-' + 
                String(appointmentDate.getMonth() + 1).padStart(2, '0') + '-' + 
                String(appointmentDate.getDate()).padStart(2, '0');
              
              return appointmentDateStr === dayStr;
            }) || [];
            
            return (
              <div 
                key={index} 
                className={`h-24 border rounded-lg p-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  isToday ? 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700' : 'bg-white dark:bg-gray-800'
                } transition-colors`}
                onClick={() => {
                  setCurrentDate(day);
                  setViewMode('day');
                }}
                onMouseMove={(e) => {
                  const dateStr = day.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  });
                  setHoverInfo({
                    visible: true,
                    time: dateStr,
                    x: e.clientX,
                    y: e.clientY
                  });
                }}
                onMouseLeave={handleCalendarMouseLeave}
              >
                {/* Date number */}
                <div className={`text-sm ${isToday ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {day.getDate()}
                </div>
                
                {/* Desktop appointment indicators */}
                {dayAppointments.length > 0 && (
                  <div className="space-y-1 mt-1">
                    {dayAppointments.slice(0, 2).map((appointment: any, i: number) => {
                      const startTime = new Date(appointment.startTime);
                      const timeString = startTime.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true
                      });
                      
                      return (
                        <div 
                          key={i}
                          className="text-xs p-1 rounded truncate"
                          style={{
                            backgroundColor: appointment.service?.color + '20' || '#6b728020',
                            color: appointment.service?.color || '#6b7280'
                          }}
                        >
                          {timeString} {appointment.service?.name}
                        </div>
                      );
                    })}
                    {dayAppointments.length > 2 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        +{dayAppointments.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (appointmentsLoading || staffLoading || servicesLoading || usersLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
        <div className="hidden lg:block">
          <SidebarController />
        </div>
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
        }`}>
          <Header />
          <main className="flex-1 overflow-auto p-4">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="hidden lg:block">
        <SidebarController />
      </div>
      
      <div className={`h-screen flex flex-col transition-all duration-300 ${
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
      }`}>
        <Header />
        
        <main className="flex-1 bg-gray-50 dark:bg-gray-900 p-4 md:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {/* Top Controls */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
              {/* Header with Title and New Button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">Appointments</h1>
                <Button
                  onClick={() => handleAddAppointment()}
                  className="min-h-[44px] justify-center"
                  size="default"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">New Appointment</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </div>
              
              {/* Controls organized in cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Date Navigation Card */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateDate('prev')}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="text-center flex-1 mx-3">
                      <span className="text-lg font-semibold block">
                        {formatDate(currentDate)}
                      </span>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateDate('next')}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* View and Zoom Controls Card */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-center space-x-3">
                    <Select value={viewMode} onValueChange={setViewMode}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Zoom Controls */}
                    <div className="hidden lg:flex border rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={zoomOut}
                        className="h-8 w-8 p-0 rounded-none border-r"
                        disabled={zoomLevel <= 0.5}
                      >
                        <ZoomOut className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={zoomIn}
                        className="h-8 w-8 p-0 rounded-none"
                        disabled={zoomLevel >= 3}
                      >
                        <ZoomIn className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Filters Card */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                      <SelectTrigger>
                        <SelectValue placeholder="All stylists" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All stylists</SelectItem>
                        {staff?.map((staffMember: any) => {
                          const staffName = staffMember.user ? `${staffMember.user.firstName} ${staffMember.user.lastName}` : 'Unknown Staff';
                          return (
                            <SelectItem key={staffMember.id} value={staffName}>
                              {staffName}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    
                    <Select value={selectedService} onValueChange={setSelectedService}>
                      <SelectTrigger>
                        <SelectValue placeholder="All services" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All services</SelectItem>
                        {services?.map((service: any) => (
                          <SelectItem key={service.id} value={service.name}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            {/* Calendar Views */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                {viewMode === 'day' && renderDayView()}
                {viewMode === 'week' && renderWeekView()}
                {viewMode === 'month' && renderMonthView()}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Appointment Form */}
      <AppointmentForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        appointmentId={selectedAppointmentId}
        selectedDate={currentDate}
        selectedTime={selectedTime}
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

      {/* Time Hover Tooltip */}
      {hoverInfo.visible && (
        <div
          className="fixed z-50 text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none"
          style={{
            left: hoverInfo.x + 10,
            top: hoverInfo.y - 40,
            backgroundColor: 'var(--primary)',
            color: 'var(--primary-foreground)',
          }}
        >
          {hoverInfo.time}
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;