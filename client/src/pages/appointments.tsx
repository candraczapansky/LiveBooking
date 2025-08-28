import { useState, useEffect, Suspense, lazy } from "react";
import { SidebarController } from "@/components/layout/sidebar";
// import Header from "@/components/layout/header"; // Provided by MainLayout
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/use-document-title";

import { useLocation } from "@/contexts/LocationContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { apiRequest } from "@/lib/queryClient";
const AppointmentForm = lazy(() => import("@/components/appointments/appointment-form"));
const AppointmentCheckout = lazy(() => import("@/components/appointments/appointment-checkout"));
const AppointmentDetails = lazy(() => import("@/components/appointments/appointment-details"));
import { Plus, Calendar, Filter, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BigCalendar from "@/components/calendar/BigCalendar";
import { Calendar as MiniCalendar } from "@/components/ui/calendar";
import { startOfDay, endOfDay, setHours, setMinutes } from 'date-fns';

const AppointmentsPage = () => {
  useDocumentTitle("Client Appointments | Glo Head Spa");
  const queryClient = useQueryClient();

  const { selectedLocation } = useLocation();
  const { isOpen: isSidebarOpen, isMobile: isSidebarMobile } = useSidebar();
  
  // State
  // Note: Calendar starts on daily view by default, showing all staff per location
  // Users can filter to specific staff if needed, but daily view is optimized for seeing all staff schedules
  // Staff are filtered by both date (for daily view) and location (for all views) - only staff with schedules at the selected location appear
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutAppointment, setCheckoutAppointment] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>("day");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsAppointmentId, setDetailsAppointmentId] = useState<number | null>(null);
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>("all");

  // Queries
  const { data: appointments = [], refetch } = useQuery({
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
      // Fetch all staff to ensure resources include anyone with appointments at the selected location
      const url = '/api/staff';
      console.log('🔄 Fetching staff from:', url);
      const response = await apiRequest("GET", url);
      const data = await response.json();
      console.log('👥 Staff API response:', data.length, 'staff members');
      return data;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale
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
      console.log('🔄 Fetching schedules from:', url);
      const response = await apiRequest("GET", url);
      const data = await response.json();
      console.log('📅 Schedules API response:', data.length, 'schedules');
      return data;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale
  });

  // Debug: Log schedules when they change
  useEffect(() => {
    console.log('📅 Schedules updated:', schedules.length, 'schedules for location:', selectedLocation?.id);
    if (schedules.length > 0) {
      console.log('Sample schedule:', schedules[0]);
      console.log('All schedules:', schedules);
    }
  }, [schedules, selectedLocation?.id]);

  // Force calendar refresh when schedules change
  useEffect(() => {
    console.log('🔄 Schedules changed, forcing calendar refresh');
    // This will trigger a re-render of the calendar component
  }, [schedules]);

  // Debug: Log staff when they change
  useEffect(() => {
    console.log('👥 Staff updated:', staff.length, 'staff members for location:', selectedLocation?.id);
    if (staff.length > 0) {
      console.log('Sample staff member:', staff[0]);
      console.log('All staff:', staff);
    }
  }, [staff, selectedLocation?.id]);

  // Force cache invalidation when location changes
  useEffect(() => {
    if (selectedLocation?.id) {
      console.log('🔄 Location changed to:', selectedLocation.id);
      // Invalidate all location-dependent queries
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
    }
  }, [selectedLocation?.id, queryClient]);

  // Recalculate filtered resources when date changes (for day view staff filtering)
  useEffect(() => {
    if (calendarView === 'day' && selectedDate) {
      console.log('📅 Date changed to:', selectedDate.toISOString().slice(0, 10));
      // This will trigger a re-render with updated filteredResources
    }
  }, [selectedDate, calendarView]);

  // Force refetch appointments when component mounts (after login)
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Listen for schedule updates from other components
  useEffect(() => {
    const handleScheduleUpdate = () => {
      console.log('🔄 Received schedule update event, refreshing calendar');
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      queryClient.refetchQueries({ queryKey: ['/api/schedules'] });
    };

    window.addEventListener('schedule-updated', handleScheduleUpdate);
    
    return () => {
      window.removeEventListener('schedule-updated', handleScheduleUpdate);
    };
  }, [queryClient]);

  // Helper: Check if a staff member is scheduled for a specific date and location
  const isStaffScheduledForDate = (staffId: number, date: Date, locationId?: number) => {
    if (!schedules || schedules.length === 0) return false;
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dateString = date.toISOString().slice(0, 10);
    
    // Find schedules for this staff on this day
    const staffSchedules = schedules.filter((schedule: any) => {
      const matchesStaff = schedule.staffId === staffId;
      const matchesDay = schedule.dayOfWeek === dayName;
      
      // Check if the schedule is at the selected location (if location filtering is enabled)
      const matchesLocation = !locationId || schedule.locationId === locationId;
      
      // Check if the schedule is active for this date
      const startDateString = typeof schedule.startDate === 'string' 
        ? schedule.startDate 
        : new Date(schedule.startDate).toISOString().slice(0, 10);
      const endDateString = schedule.endDate 
        ? (typeof schedule.endDate === 'string' 
          ? schedule.endDate 
          : new Date(schedule.endDate).toISOString().slice(0, 10))
        : null;
      
      const matchesStartDate = startDateString <= dateString;
      const matchesEndDate = !endDateString || endDateString >= dateString;
      
      return matchesStaff && matchesDay && matchesLocation && matchesStartDate && matchesEndDate;
    });
    
    return staffSchedules.length > 0;
  };

  const filteredAppointments = appointments.filter((apt: any) => {
    // Filter by selected location if set
    if (selectedLocation?.id && apt.locationId !== selectedLocation.id) {
      return false;
    }
    // Then apply staff filter
    if (selectedStaffFilter !== "all" && apt.staffId !== parseInt(selectedStaffFilter)) {
      return false;
    }
    return true;
  });

  // Helper: Determine if a staff member has an appointment in the current calendar view
  const hasAppointmentInCurrentView = (staffId: number) => {
    try {
      const baseDate = selectedDate || new Date();
      return filteredAppointments.some((apt: any) => {
        if (!apt || apt.staffId !== staffId || !apt.startTime) return false;
        const aptStart = new Date(apt.startTime);
        if (isNaN(aptStart.getTime())) return false;
        if (calendarView === 'day') {
          return aptStart.toDateString() === baseDate.toDateString();
        }
        if (calendarView === 'week') {
          const d = new Date(baseDate);
          const day = d.getDay();
          const weekStart = new Date(d);
          weekStart.setDate(d.getDate() - day);
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);
          return aptStart >= weekStart && aptStart <= weekEnd;
        }
        // month view
        return aptStart.getFullYear() === baseDate.getFullYear() && aptStart.getMonth() === baseDate.getMonth();
      });
    } catch {
      return false;
    }
  };

  const filteredResources = staff.filter((s: any) => {
    // First apply staff filter
    if (selectedStaffFilter !== "all" && s.id !== parseInt(selectedStaffFilter)) {
      return false;
    }
    
    // For day view, only show staff who are scheduled for the selected date AND location
    if (calendarView === 'day') {
      const dateToCheck = selectedDate || new Date();
      const isScheduled = isStaffScheduledForDate(s.id, dateToCheck, selectedLocation?.id);

      if (!isScheduled) {
        // Fallback: include staff if they have at least one appointment visible in the current view
        if (hasAppointmentInCurrentView(s.id)) {
          console.log(`✅ Including staff ${s.user?.firstName} ${s.user?.lastName} (ID: ${s.id}) due to visible appointment(s)`);
          return true;
        }
        const reason = selectedLocation?.id
          ? `not scheduled for ${dateToCheck.toLocaleDateString()} at ${selectedLocation.name}`
          : `not scheduled for ${dateToCheck.toLocaleDateString()}`;
        console.log(`🚫 Staff ${s.user?.firstName} ${s.user?.lastName} (ID: ${s.id}) ${reason}, filtering out`);
        return false;
      }
      
      return true;
    }
    
    // For week and month views, only show staff who have schedules at the selected location
    if (selectedLocation?.id) {
      const hasLocationSchedule = schedules.some((schedule: any) => 
        schedule.staffId === s.id && schedule.locationId === selectedLocation.id
      );

      if (!hasLocationSchedule) {
        // Fallback: include staff if they have at least one appointment visible in the current view
        if (hasAppointmentInCurrentView(s.id)) {
          console.log(`✅ Including staff ${s.user?.firstName} ${s.user?.lastName} (ID: ${s.id}) due to visible appointment(s) at this location view`);
          return true;
        }
        console.log(`🚫 Staff ${s.user?.firstName} ${s.user?.lastName} (ID: ${s.id}) has no schedules at ${selectedLocation.name}, filtering out`);
        return false;
      }
      
      return true;
    }
    
    // If no location selected, show all staff (existing behavior)
    return true;
  });

  // Log filtering results for debugging
  useEffect(() => {
    if (calendarView === 'day' && selectedDate) {
      const totalStaff = staff.length;
      const scheduledStaff = filteredResources.length;
      const filteredOut = totalStaff - scheduledStaff;
      
      console.log(`📊 Staff Filtering Summary for ${selectedDate.toLocaleDateString()}:`);
      console.log(`   Location: ${selectedLocation?.name || 'All locations'}`);
      console.log(`   Total staff: ${totalStaff}`);
      console.log(`   Scheduled staff: ${scheduledStaff}`);
      console.log(`   Filtered out: ${filteredOut}`);
      
      if (filteredOut > 0) {
        console.log(`   Only showing staff with active schedules for this date and location`);
      }
    }
  }, [filteredResources, calendarView, selectedDate, staff.length, selectedLocation]);

  // Log detailed staff filtering information for debugging
  useEffect(() => {
    if (selectedLocation?.id && (calendarView === 'day' || calendarView === 'week' || calendarView === 'month')) {
      console.log(`🔍 Location-based Staff Filtering for ${selectedLocation.name}:`);
      
      const staffWithLocationSchedules = staff.filter((s: any) => {
        return schedules.some((schedule: any) => 
          schedule.staffId === s.id && schedule.locationId === selectedLocation.id
        );
      });
      
      const staffWithoutLocationSchedules = staff.filter((s: any) => {
        return !schedules.some((schedule: any) => 
          schedule.staffId === s.id && schedule.locationId === selectedLocation.id
        );
      });
      
      console.log(`   Staff with schedules at ${selectedLocation.name}: ${staffWithLocationSchedules.length}`);
      staffWithLocationSchedules.forEach((s: any) => {
        console.log(`     ✅ ${s.user?.firstName} ${s.user?.lastName} (ID: ${s.id})`);
      });
      
      if (staffWithoutLocationSchedules.length > 0) {
        console.log(`   Staff without schedules at ${selectedLocation.name}: ${staffWithoutLocationSchedules.length}`);
        staffWithoutLocationSchedules.forEach((s: any) => {
          console.log(`     ❌ ${s.user?.firstName} ${s.user?.lastName} (ID: ${s.id}) - filtered out`);
        });
      }
    }
  }, [selectedLocation, calendarView, staff, schedules]);

  // Reset staff filter when switching to day view (show all staff)
  useEffect(() => {
    if (calendarView === 'day') {
      // Only reset if user had a specific staff selected and we're switching to day view
      if (selectedStaffFilter !== "all") {
        setSelectedStaffFilter("all");
      }
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

  const handleDeleteAppointment = () => {
    // Refresh the appointments list after deletion
    refetch();
  };

  const handlePaymentSuccess = () => {
    setIsCheckoutOpen(false);
    setCheckoutAppointment(null);
    refetch();
    // toast notification removed (toast system is currently disabled)
  };



  // Helper: Get unavailable (gray) times for each staff/resource for the current view and date
  function getBackgroundEvents() {
    try {
      if (!schedules || !staff) return [];
      const events: any[] = [];
      
      // Debug: Log schedules and staff data
      console.log('🔍 getBackgroundEvents Debug:');
      console.log('Schedules count:', schedules.length);
      console.log('Staff count:', staff.length);
      console.log('Selected staff filter:', selectedStaffFilter);
      console.log('Calendar view:', calendarView);
      console.log('Selected date:', selectedDate);
      
      // Use filtered staff for background events - same logic as filteredResources
      const staffToShow = (() => {
        try {
          if (selectedStaffFilter !== "all") {
            return staff.filter((s: any) => s.id === parseInt(selectedStaffFilter));
          }
          
          // For day view, only show staff who are scheduled for the selected date AND location
          if (calendarView === 'day') {
            const dateToCheck = selectedDate || new Date();
            return staff.filter((s: any) => isStaffScheduledForDate(s.id, dateToCheck, selectedLocation?.id));
          }
          
          // For week and month views, only show staff who have schedules at the selected location
          if (selectedLocation?.id) {
            return staff.filter((s: any) => {
              const hasLocationSchedule = schedules.some((schedule: any) => 
                schedule.staffId === s.id && schedule.locationId === selectedLocation.id
              );
              return hasLocationSchedule;
            });
          }
          
          // If no location selected, show all staff
          return staff;
        } catch (error) {
          console.error('Error filtering staff:', error);
          return [];
        }
      })();
      
      // Ensure we also include any staff who have visible appointments in the current view,
      // even if they don't have an active schedule entry (so their events render)
      const staffIdsWithAppointmentsInView = new Set<number>();
      try {
        const baseDate = selectedDate || new Date();
        filteredAppointments.forEach((apt: any) => {
          if (!apt || !apt.staffId || !apt.startTime) return;
          const aptStart = new Date(apt.startTime);
          if (isNaN(aptStart.getTime())) return;
          let inView = false;
          if (calendarView === 'day') {
            inView = aptStart.toDateString() === baseDate.toDateString();
          } else if (calendarView === 'week') {
            const d = new Date(baseDate);
            const day = d.getDay();
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - day);
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            inView = aptStart >= weekStart && aptStart <= weekEnd;
          } else {
            inView = aptStart.getFullYear() === baseDate.getFullYear() && aptStart.getMonth() === baseDate.getMonth();
          }
          if (inView) {
            staffIdsWithAppointmentsInView.add(apt.staffId);
          }
        });
      } catch {}

      const appointmentStaffToInclude = staff.filter((s: any) => staffIdsWithAppointmentsInView.has(s.id));
      const staffToProcess = [
        ...staffToShow,
        ...appointmentStaffToInclude.filter((s: any) => !staffToShow.some((ex: any) => ex.id === s.id))
      ];

      console.log('Staff to show:', staffToProcess.length);
      
      // For each staff member
      staffToProcess.forEach((s: any) => {
        try {
          if (!s || !s.id) {
            console.warn('Invalid staff member:', s);
            return;
          }
          
          console.log(`Processing staff ${s.id}: ${s.user?.firstName} ${s.user?.lastName}`);
          
          // For each day in the current view (for now, just use selectedDate or today)
          const baseDate = selectedDate || new Date();
          if (isNaN(baseDate.getTime())) {
            console.warn('Invalid base date:', baseDate);
            return;
          }
          
          // For week view, show for all 7 days; for day view, just one day
          const days = calendarView === 'week'
            ? Array.from({ length: 7 }, (_, i) => {
                try {
                  const d = new Date(baseDate);
                  d.setDate(baseDate.getDate() - d.getDay() + i); // start from Sunday
                  return isNaN(d.getTime()) ? null : d;
                } catch (e) {
                  console.warn('Error creating week day:', e);
                  return null;
                }
              }).filter((d): d is Date => d !== null)
            : [baseDate];
          
          console.log(`Calendar view: ${calendarView}, Base date: ${baseDate.toISOString().slice(0, 10)}`);
          console.log(`Days to check: ${days.length} days`);
          
          days.forEach((date) => {
            try {
              if (isNaN(date.getTime())) {
                console.warn('Invalid date:', date);
                return;
              }
              
              const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
              console.log(`Checking ${dayName} for staff ${s.id}`);
              
              // Find all schedules for this staff on this day (including blocked ones)
              const allStaffSchedules = (schedules as any[]).filter((sch: any) => {
                try {
                  if (!sch || !sch.startDate) {
                    console.warn('Invalid schedule:', sch);
                    return false;
                  }
                  
                  const matchesStaff = sch.staffId === s.id;
                  const matchesDay = sch.dayOfWeek === dayName;
                  
                  // Fix date comparison logic
                  const todayString = date.toISOString().slice(0, 10);
                  let startDateString: string;
                  let endDateString: string | null;
                  
                  try {
                    startDateString = typeof sch.startDate === 'string' 
                      ? sch.startDate 
                      : new Date(sch.startDate).toISOString().slice(0, 10);
                  } catch (e) {
                    console.warn('Error parsing schedule start date:', e);
                    return false;
                  }
                  
                  try {
                    endDateString = sch.endDate 
                      ? (typeof sch.endDate === 'string' 
                        ? sch.endDate 
                        : new Date(sch.endDate).toISOString().slice(0, 10))
                      : null;
                  } catch (e) {
                    console.warn('Error parsing schedule end date:', e);
                    endDateString = null;
                  }
                  
                  const matchesStartDate = startDateString <= todayString;
                  const matchesEndDate = !endDateString || endDateString >= todayString;
                  
                  return matchesStaff && matchesDay && matchesStartDate && matchesEndDate;
                } catch (error) {
                  console.warn('Error filtering schedule:', error);
                  return false;
                }
              });
              
              // Separate blocked and non-blocked schedules
              const blockedSchedules = allStaffSchedules.filter((sch: any) => sch.isBlocked);
              const availableSchedules = allStaffSchedules.filter((sch: any) => !sch.isBlocked);
              
              // Get existing appointments for this staff on this day (location-filtered)
              const staffAppointments = filteredAppointments.filter((apt: any) => {
                try {
                  if (!apt || !apt.startTime) return false;
                  const aptDate = new Date(apt.startTime);
                  return !isNaN(aptDate.getTime()) && 
                         apt.staffId === s.id && 
                         aptDate.toDateString() === date.toDateString();
                } catch (e) {
                  console.warn('Error filtering appointment:', e);
                  return false;
                }
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
                  isBackground: true,
                });
              } else {
                // Handle blocked schedules
                blockedSchedules.forEach((sch: any) => {
                  try {
                    if (!sch.startTime || !sch.endTime) return;
                    
                    const [startHour, startMinute] = sch.startTime.split(':').map(Number);
                    const [endHour, endMinute] = sch.endTime.split(':').map(Number);
                    
                    if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
                      console.warn('Invalid schedule times:', sch.startTime, sch.endTime);
                      return;
                    }
                    
                    const blockStart = setMinutes(setHours(startOfDay(date), startHour), startMinute);
                    const blockEnd = setMinutes(setHours(startOfDay(date), endHour), endMinute);
                    
                    if (isNaN(blockStart.getTime()) || isNaN(blockEnd.getTime())) {
                      console.warn('Invalid block times:', blockStart, blockEnd);
                      return;
                    }
                    
                    events.push({
                      start: blockStart,
                      end: blockEnd,
                      resourceId: s.id,
                      allDay: false,
                      title: 'Blocked',
                      type: 'unavailable',
                      style: { backgroundColor: '#6b7280', opacity: 0.8 },
                      isBackground: true,
                    });
                  } catch (error) {
                    console.warn('Error processing blocked schedule:', error);
                  }
                });
                
                // Handle available schedules
                availableSchedules.forEach((sch: any) => {
                  try {
                    if (!sch.startTime || !sch.endTime) return;
                    
                    const [startHour, startMinute] = sch.startTime.split(':').map(Number);
                    const [endHour, endMinute] = sch.endTime.split(':').map(Number);
                    
                    if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
                      console.warn('Invalid schedule times:', sch.startTime, sch.endTime);
                      return;
                    }
                    
                    const workStart = setMinutes(setHours(startOfDay(date), startHour), startMinute);
                    const workEnd = setMinutes(setHours(startOfDay(date), endHour), endMinute);
                    
                    if (isNaN(workStart.getTime()) || isNaN(workEnd.getTime())) {
                      console.warn('Invalid work times:', workStart, workEnd);
                      return;
                    }
                    
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
                        isBackground: true,
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
                        isBackground: true,
                      });
                    }
                    
                    // Gray out booked appointments
                    staffAppointments.forEach((apt: any) => {
                      try {
                        if (!apt.startTime) return;
                        
                        const aptStart = new Date(apt.startTime);
                        const aptEnd = apt.endTime ? new Date(apt.endTime) : new Date(aptStart.getTime() + 3600000);
                        
                        if (isNaN(aptStart.getTime()) || isNaN(aptEnd.getTime())) {
                          console.warn('Invalid appointment times:', aptStart, aptEnd);
                          return;
                        }
                        
                        // Only gray out if the appointment is within working hours
                        if (aptStart >= workStart && aptEnd <= workEnd) {
                          events.push({
                            start: aptStart,
                            end: aptEnd,
                            resourceId: s.id,
                            allDay: false,
                            title: 'Booked',
                            type: 'unavailable',
                            style: { backgroundColor: '#9ca3af', opacity: 0.7 },
                            isBackground: true,
                          });
                        }
                      } catch (error) {
                        console.warn('Error processing appointment:', error);
                      }
                    });
                  } catch (error) {
                    console.warn('Error processing available schedule:', error);
                  }
                });
              }
            } catch (error) {
              console.warn('Error processing day:', error);
            }
          });
        } catch (error) {
          console.warn('Error processing staff member:', error);
        }
      });
      
      console.log(`Total background events created: ${events.length}`);
      return events;
    } catch (error) {
      console.error('Error generating background events:', error);
      return [];
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <style>{`
        /* Hide unwanted calendar elements */
        .rbc-calendar div[style*='background: white'],
        .rbc-calendar div[style*='background-color: white'],
        .rbc-calendar div[style*='background: #fff'],
        .rbc-calendar div[style*='background-color: #fff'],
        .rbc-calendar div[style*='background: #ffffff'],
        .rbc-calendar div[style*='background-color: #ffffff'] {
          display: none !important;
        }
        
        /* Mobile calendar optimizations */
        @media (max-width: 768px) {
          .rbc-calendar {
            min-height: 400px !important;
            font-size: 14px !important;
          }
          
          .rbc-toolbar {
            flex-direction: column !important;
            gap: 0.5rem !important;
            margin-bottom: 1rem !important;
          }
          
          .rbc-toolbar-label {
            font-size: 1.1rem !important;
            margin: 0.5rem 0 !important;
          }
          
          .rbc-btn-group {
            margin: 0 !important;
          }
          
          .rbc-btn-group button {
            padding: 0.5rem 0.75rem !important;
            font-size: 0.875rem !important;
            min-height: 44px !important;
          }
          
          .rbc-header {
            padding: 0.5rem 0.25rem !important;
            font-size: 0.75rem !important;
          }
          
          .rbc-time-view .rbc-header {
            font-size: 0.75rem !important;
          }
          
          .rbc-time-slot {
            min-height: 30px !important;
          }
          
          .rbc-event {
            font-size: 0.75rem !important;
            padding: 2px 4px !important;
          }
          
          .rbc-event-content {
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
          }
          
          .rbc-time-header-content {
            min-width: 80px !important;
          }
          
          .rbc-time-content {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
        }
        
        /* Reduce internal calendar scrolling; let page scroll instead */
        .rbc-calendar { overflow: visible !important; }
        .rbc-time-view { overflow: visible !important; }
        .rbc-time-content { overflow: visible !important; -webkit-overflow-scrolling: auto !important; }
        .rbc-time-content > * { overflow: visible !important; }
        /* Keep time gutter and content aligned when page scrolls */
        .rbc-time-gutter, .rbc-time-content, .rbc-time-header, .rbc-time-header-content {
          position: static !important;
        }
        
        .rbc-month-view {
          overflow: visible !important;
        }
        
        .rbc-day-view {
          overflow: visible !important;
        }
        
        /* Fix calendar container scrolling */
        .rbc-calendar-container {
          overflow: visible !important;
          height: auto !important;
        }
        
        /* Ensure proper scrolling for all calendar views - let page scroll instead */
        .rbc-time-view .rbc-time-content,
        .rbc-month-view .rbc-month-content,
        .rbc-day-view .rbc-day-content {
          overflow: visible !important;
          overflow-y: visible !important;
          max-height: none !important;
          height: auto !important;
        }
        
        /* Fix scrolling for calendar events and slots */
        .rbc-time-slot,
        .rbc-day-slot {
          overflow: visible !important;
        }
        
        /* Let calendar toolbar scroll with content to avoid overlap with times gutter */
        .rbc-toolbar {
          position: static !important;
          top: auto !important;
          background: transparent !important;
          z-index: auto !important;
        }
        .dark .rbc-toolbar { background: transparent !important; }
        
        /* Remove fixed viewport heights so gutter and grid scroll together with page */
        @media (max-width: 1024px) { .rbc-calendar { height: auto !important; } }
        @media (max-width: 768px) { .rbc-calendar { height: auto !important; } }
        
        /* Ensure calendar events are properly scrollable */
        .rbc-event {
          cursor: pointer !important;
          overflow: visible !important;
        }
        
        /* Fix calendar grid scrolling */
        .rbc-time-grid,
        .rbc-month-grid {
          overflow: visible !important;
          height: auto !important;
        }
        
        /* Ensure proper touch scrolling on mobile */
        .rbc-calendar * {
          -webkit-overflow-scrolling: touch !important;
        }

        /* Let page control height; remove forced calendar heights */
        .appointments-calendar-container { height: auto !important; }

        /* Fix month view date alignment - override the default right-align */
        .rbc-month-view .rbc-date-cell {
          flex: 1 1 0 !important;
          min-width: 0 !important;
          padding: 5px !important;
          text-align: center !important;
          padding-right: 5px !important; /* Override the default right padding */
        }
        
        /* Ensure all cells in a row are equal width */
        .rbc-month-view .rbc-row-content {
          display: flex !important;
        }
        
        /* Make day backgrounds match the date cell layout */
        .rbc-month-view .rbc-day-bg {
          flex: 1 1 0 !important;
          min-width: 0 !important;
        }
        
        /* Keep rows properly structured */
        .rbc-month-view .rbc-row-bg {
          display: flex !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
        }
        
        /* Ensure the date numbers themselves are centered */
        .rbc-month-view .rbc-date-cell > a,
        .rbc-month-view .rbc-date-cell > span {
          display: block !important;
          text-align: center !important;
        }
        
        /* Fix selected cell and today highlights to align with centered dates */
        .rbc-month-view .rbc-selected-cell {
          background-color: rgba(0, 0, 0, 0.05) !important;
        }
        
        .rbc-month-view .rbc-today {
          background-color: #eaf6ff !important;
        }
        
        /* Force all month cells to have consistent sizing */
        .rbc-month-view .rbc-row {
          display: flex !important;
          position: relative !important;
        }
        
        .rbc-month-view .rbc-row-segment {
          flex: 1 1 0 !important;
          padding: 0 !important;
        }

        /* Compact mini calendar styles (left sidebar) */
        .appointments-mini-calendar .rdp { width: 100% !important; }
        .appointments-mini-calendar .rdp-months,
        .appointments-mini-calendar .rdp-month { display: block !important; }
        .appointments-mini-calendar .rdp-table { width: 100% !important; }
        .appointments-mini-calendar .rdp-head_row,
        .appointments-mini-calendar .rdp-row {
          display: grid !important;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 0 !important;
        }
        .appointments-mini-calendar .rdp-head_cell,
        .appointments-mini-calendar .rdp-cell {
          padding: 0 !important;
          text-align: center !important;
          vertical-align: middle !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .appointments-mini-calendar .rdp-day {
          width: 36px !important;
          height: 36px !important;
          padding: 0 !important;
          margin: 0 auto !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 0.375rem !important;
          box-sizing: border-box !important;
        }

        /* Force exact centering of mini-calendar day buttons (and their borders) */
        .appointments-mini-calendar .rdp-cell { position: relative !important; }
        .appointments-mini-calendar .rdp-day {
          position: absolute !important;
          inset: 0 !important;
          margin: auto !important;
        }

        /* Mini calendar: highlight the selected date when in day view */
        .appointments-mini-calendar[data-mini-mode='day'] .rdp-day[aria-selected='true'] {
          border: 2px solid hsl(var(--primary)) !important;
          color: hsl(var(--primary)) !important;
          background: transparent !important;
          border-radius: 0.375rem !important;
          box-sizing: border-box !important;
          width: 36px !important;
          height: 36px !important;
        }

        /* Fallback for DayPicker's selected class */
        .appointments-mini-calendar[data-mini-mode='day'] .rdp-day_selected {
          border: 2px solid hsl(var(--primary)) !important;
          color: hsl(var(--primary)) !important;
          background: transparent !important;
          border-radius: 0.375rem !important;
          box-sizing: border-box !important;
          width: 36px !important;
          height: 36px !important;
        }

        /* Force highlight if library uses button[aria-pressed] internally */
        .appointments-mini-calendar[data-mini-mode='day'] .rdp-day[aria-pressed='true'] {
          border: 2px solid hsl(var(--primary)) !important;
          color: hsl(var(--primary)) !important;
          background: transparent !important;
          border-radius: 0.375rem !important;
          box-sizing: border-box !important;
          width: 36px !important;
          height: 36px !important;
        }
      `}</style>
      <style>{`
        /* Mini calendar: strong selected-day border via custom modifier */
        .appointments-mini-calendar .mini-selected {
          border: 2px solid hsl(var(--primary)) !important;
          color: hsl(var(--primary)) !important;
          background: transparent !important;
          border-radius: 0.375rem !important;
          box-sizing: border-box !important;
          width: 36px !important;
          height: 36px !important;
        }
      `}</style>
      <SidebarController isOpen={isSidebarOpen} isMobile={isSidebarMobile} />
      <div className="min-h-screen flex flex-col transition-all duration-300">
        <main className="flex-1 p-3 sm:p-4 md:p-6">
          <div className="max-w-7xl mx-auto flex flex-row gap-3 sm:gap-4 lg:gap-6">
            {/* Left Sidebar: Mini Calendar */}
            <div className="appointments-mini-calendar flex flex-col gap-6 flex-shrink-0 self-start w-auto min-w-[260px]" data-mini-mode={calendarView}>
              <Card className={`p-2 sm:p-3 w-[260px] sm:w-[280px] ${calendarView === 'month' ? 'border-2 border-primary ring-2 ring-primary ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900' : ''}`}>
                <MiniCalendar
                  key={`mini-${calendarView}-${selectedDate ? selectedDate.toISOString().slice(0,10) : 'no-date'}`}
                  mode="single"
                  selected={calendarView === 'day' && selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()) : undefined}
                  month={selectedDate || new Date()}
                  modifiers={calendarView === 'day' && selectedDate ? { miniSelected: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()) } : undefined}
                  modifiersClassNames={calendarView === 'day' ? { miniSelected: 'mini-selected' } : undefined}
                  onSelect={(date) => {
                    setSelectedDate(date as Date);
                    setCalendarView('day');
                  }}
                  className={`w-full rounded-lg ${calendarView === 'month' ? 'border-2 border-primary' : 'border dark:border-gray-800'} bg-white dark:bg-gray-900 shadow-sm ${calendarView === 'day' ? 'rdp-day-selected-enhanced' : ''}`}
                  classNames={{
                    months: "space-y-2",
                    month: "space-y-2",
                    table: "w-full border-collapse",
                    head_row: "grid grid-cols-7",
                    row: "grid grid-cols-7 mt-2",
                    head_cell: "text-muted-foreground w-9 text-center",
                    cell: "h-9 w-9 text-center p-0",
                    day: "h-9 w-9 p-0 font-normal",
                    ...(calendarView === 'day'
                      ? {
                          day_selected:
                            "border-2 border-primary bg-primary/10 text-primary ring-2 ring-primary",
                        }
                      : {}),
                  }}
                  numberOfMonths={1}
                  fixedWeeks
                />
              </Card>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col gap-3 sm:gap-4 lg:gap-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">
                    Client Appointments
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
                    Manage and view all client appointments
                  </p>
                </div>
                <Button onClick={handleAddAppointment} className="flex items-center gap-2 w-full sm:w-auto min-h-[44px]">
                  <Plus className="h-4 w-4" />
                  New Appointment
                </Button>
              </div>

              {/* Appointments Calendar */}
              <Card className="flex-1 min-h-0 overflow-hidden">
                <CardHeader className="pb-3 sm:pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                        Appointments Calendar
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm mt-1">
                        {calendarView === 'day' 
                          ? `Daily view showing ${filteredResources?.length || 0} scheduled staff members and their schedules for ${selectedDate ? selectedDate.toLocaleDateString() : 'today'}. Only staff with active schedules are displayed.`
                          : `View appointments by staff in ${calendarView} view. ${selectedLocation ? `Only staff with schedules at ${selectedLocation.name} are shown.` : 'All staff are shown.'} Click an event to edit or view details.`
                        }
                      </CardDescription>
                    </div>
                    {/* Staff Filter Dropdown - Show for all views, but with different behavior for day view */}
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-500" />
                      <Select value={selectedStaffFilter} onValueChange={setSelectedStaffFilter}>
                        <SelectTrigger className="w-full sm:w-48 min-h-[44px]">
                          <SelectValue placeholder="Filter by staff" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            {calendarView === 'day' ? 'All Staff (Daily View)' : 'All Staff'}
                          </SelectItem>
                          {staff?.map((s: any) => (
                            <SelectItem key={s.id} value={s.id.toString()}>
                              {s.user ? `${s.user.firstName} ${s.user.lastName}` : 'Unknown Staff'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 lg:p-6 flex-1 min-h-0 overflow-hidden">
                  {/* Daily View Info Banner */}
                  {calendarView === 'day' && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm">
                        <Calendar className="h-4 w-4" />
                        <span>
                          <strong>Daily View:</strong> Showing {filteredResources?.length || 0} scheduled staff members for {selectedLocation?.name || 'all locations'}
                          {selectedStaffFilter !== "all" && (
                            <span className="ml-2 text-blue-600 dark:text-blue-400">
                              (Filtered to specific staff)
                            </span>
                          )}
                          {selectedStaffFilter === "all" && (
                            <span className="ml-2 text-blue-600 dark:text-blue-400">
                              (Only staff scheduled for {selectedDate ? selectedDate.toLocaleDateString() : 'today'} at {selectedLocation?.name || 'any location'} are shown)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Location-based Info Banner for Week/Month Views */}
                  {(calendarView === 'week' || calendarView === 'month') && selectedLocation && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm">
                        <Building2 className="h-4 w-4" />
                        <span>
                          <strong>{calendarView === 'week' ? 'Weekly' : 'Monthly'} View:</strong> Showing {filteredResources?.length || 0} staff members with schedules at {selectedLocation.name}
                          {selectedStaffFilter !== "all" && (
                            <span className="ml-2 text-green-600 dark:text-green-400">
                              (Filtered to specific staff)
                            </span>
                          )}
                          {selectedStaffFilter === "all" && (
                            <span className="ml-2 text-green-600 dark:text-green-400">
                              (Only staff with schedules at this location are shown)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="w-full">
                    <div
                      className="appointments-calendar-container overflow-x-auto w-full touch-manipulation rounded-lg border-2 border-primary"
                      style={{ 
                        minWidth: `${Math.max((filteredResources?.length || 0) * 220, 360)}px`
                      }}
                    >
                      <BigCalendar
                        key={`calendar-${schedules.length}-${selectedLocation?.id}-${filteredResources?.length}-${selectedDate ? selectedDate.toISOString().slice(0, 10) : 'no-date'}`}
                        events={(() => {
                          try {
                            const appointmentEvents = filteredAppointments?.map((apt: any) => {
                              if (!apt || !apt.startTime) {
                                console.warn('Invalid appointment data:', apt);
                                return null;
                              }

                              try {
                                const client = users?.find((u: any) => u.id === apt.clientId);
                                const service = services?.find((s: any) => s.id === apt.serviceId);
                                
                                // Validate and parse dates
                                let startDate: Date;
                                let endDate: Date;
                                
                                try {
                                  startDate = new Date(apt.startTime);
                                  // Ensure it's a valid date
                                  if (isNaN(startDate.getTime())) {
                                    console.warn('Invalid start date:', apt.startTime);
                                    return null;
                                  }
                                } catch (e) {
                                  console.warn('Error parsing start date:', e);
                                  return null;
                                }
                                
                                try {
                                  endDate = apt.endTime ? new Date(apt.endTime) : new Date(startDate.getTime() + 3600000); // Default to 1 hour if no end time
                                  // Ensure it's a valid date
                                  if (isNaN(endDate.getTime())) {
                                    console.warn('Invalid end date:', apt.endTime);
                                    endDate = new Date(startDate.getTime() + 3600000); // Fallback to 1 hour duration
                                  }
                                } catch (e) {
                                  console.warn('Error parsing end date:', e);
                                  endDate = new Date(startDate.getTime() + 3600000); // Fallback to 1 hour duration
                                }
                                
                                // Ensure end date is after start date
                                if (endDate <= startDate) {
                                  endDate = new Date(startDate.getTime() + 3600000); // Set to 1 hour duration
                                }
                                
                                return {
                                  id: apt.id,
                                  title: `${client ? client.firstName + ' ' + client.lastName : 'Unknown Client'} - ${service?.name || 'Unknown Service'}`,
                                  start: startDate,
                                  end: endDate,
                                  resourceId: apt.staffId,
                                  type: 'appointment',
                                  resource: {
                                    ...apt,
                                    serviceColor: service?.color || '#3B82F6', // Use service color or default blue
                                  },
                                };
                              } catch (error) {
                                console.error('Error processing appointment:', error);
                                return null;
                              }
                            }).filter(Boolean) || [];
                            
                            console.log('📅 Valid appointment events created:', appointmentEvents.length);
                            
                            return appointmentEvents;
                          } catch (error) {
                            console.error('Error creating appointment events:', error);
                            return [];
                          }
                        })()}
                        backgroundEvents={(() => {
                          const backgroundEvents = getBackgroundEvents();
                          console.log('🎨 Background events created:', backgroundEvents.length);
                          if (backgroundEvents.length > 0) {
                            console.log('Sample background event:', backgroundEvents[0]);
                          }
                          
                          return backgroundEvents;
                        })()}
                        resources={filteredResources?.map((s: any) => ({
                          resourceId: s.id,
                          resourceTitle: s.user ? `${s.user.firstName} ${s.user.lastName}` : 'Unknown Staff',
                        })) || []}
                        onSelectEvent={(event) => {
                          // Only handle appointment events, not background events
                          if (event.type === 'appointment') {
                            handleAppointmentClick(event.id);
                          }
                        }}
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
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Appointment Form */}
      <Suspense fallback={null}>
        <AppointmentForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          appointmentId={selectedAppointmentId}
          onAppointmentCreated={(appointment) => {
            console.log("[APPOINTMENTS PAGE] onAppointmentCreated called with:", appointment);
            refetch();
          }}
          appointments={appointments}
        />
      </Suspense>

      {/* Appointment Details */}
      <Suspense fallback={null}>
        <AppointmentDetails
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          appointmentId={detailsAppointmentId}
          onEdit={handleEditAppointment}
          onDelete={handleDeleteAppointment}
        />
      </Suspense>

      {/* Checkout Component */}
      <Suspense fallback={null}>
        {checkoutAppointment && (
          <AppointmentCheckout
            appointment={checkoutAppointment}
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            onSuccess={handlePaymentSuccess}
          />
        )}
      </Suspense>
    </div>
  );
};

export default AppointmentsPage;