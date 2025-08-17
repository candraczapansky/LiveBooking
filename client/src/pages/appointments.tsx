import { useState, useEffect } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/use-document-title";

import { useLocation } from "@/contexts/LocationContext";
import { apiRequest } from "@/lib/queryClient";
import AppointmentForm from "@/components/appointments/appointment-form";
import AppointmentCheckout from "@/components/appointments/appointment-checkout";
import AppointmentDetails from "@/components/appointments/appointment-details";
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
  
  // State
  // Note: Calendar starts on daily view by default, showing all staff per location
  // Users can filter to specific staff if needed, but daily view is optimized for seeing all staff schedules
  // Staff are filtered by both date (for daily view) and location (for all views) - only staff with schedules at the selected location appear
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutAppointment, setCheckoutAppointment] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
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
      const url = selectedLocation?.id 
        ? `/api/staff?locationId=${selectedLocation.id}`
        : '/api/staff';
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
    if (selectedStaffFilter === "all") return true;
    return apt.staffId === parseInt(selectedStaffFilter);
  });

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
        const reason = selectedLocation?.id 
          ? `not scheduled for ${dateToCheck.toLocaleDateString()} at ${selectedLocation.name}`
          : `not scheduled for ${dateToCheck.toLocaleDateString()}`;
        console.log(`🚫 Staff ${s.user?.firstName} ${s.user?.lastName} (ID: ${s.id}) ${reason}, filtering out`);
      }
      
      return isScheduled;
    }
    
    // For week and month views, only show staff who have schedules at the selected location
    if (selectedLocation?.id) {
      const hasLocationSchedule = schedules.some((schedule: any) => 
        schedule.staffId === s.id && schedule.locationId === selectedLocation.id
      );
      
      if (!hasLocationSchedule) {
        console.log(`🚫 Staff ${s.user?.firstName} ${s.user?.lastName} (ID: ${s.id}) has no schedules at ${selectedLocation.name}, filtering out`);
      }
      
      return hasLocationSchedule;
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
    })();
    console.log('Staff to show:', staffToShow.length);
    staffToShow.forEach((s: any, index: number) => {
      console.log(`Staff ${index}: ${s.id} - ${s.user?.firstName} ${s.user?.lastName}`);
    });
    
    // For each staff member
    staffToShow.forEach((s: any) => {
      console.log(`Processing staff ${s.id}: ${s.user?.firstName} ${s.user?.lastName}`);
      
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
      
      console.log(`Calendar view: ${calendarView}, Base date: ${baseDate.toISOString().slice(0, 10)}`);
      console.log(`Days to check: ${days.length} days`);
      days.forEach((day, index) => {
        console.log(`Day ${index}: ${day.toISOString().slice(0, 10)} (${day.toLocaleDateString('en-US', { weekday: 'long' })})`);
      });
      
      days.forEach((date) => {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        console.log(`Checking ${dayName} for staff ${s.id}`);
        console.log(`Date being checked: ${date.toISOString().slice(0, 10)}`);
        
        // Find all schedules for this staff on this day (including blocked ones)
        const allStaffSchedules = (schedules as any[]).filter((sch: any) => {
          const matchesStaff = sch.staffId === s.id;
          const matchesDay = sch.dayOfWeek === dayName;
          
          // Fix date comparison logic
          const todayString = date.toISOString().slice(0, 10);
          const startDateString = typeof sch.startDate === 'string' 
            ? sch.startDate 
            : new Date(sch.startDate).toISOString().slice(0, 10);
          const endDateString = sch.endDate 
            ? (typeof sch.endDate === 'string' 
              ? sch.endDate 
              : new Date(sch.endDate).toISOString().slice(0, 10))
            : null;
          
          const matchesStartDate = startDateString <= todayString;
          const matchesEndDate = !endDateString || endDateString >= todayString;
          
          console.log(`Schedule ${sch.id}: staff=${matchesStaff}, day=${matchesDay}, startDate=${startDateString}<=${todayString}=${matchesStartDate}, endDate=${endDateString}>=${todayString}=${matchesEndDate}`);
          
          return matchesStaff && matchesDay && matchesStartDate && matchesEndDate;
        });
        
        console.log(`Found ${allStaffSchedules.length} schedules for ${dayName} for staff ${s.id}`);
        if (allStaffSchedules.length > 0) {
          console.log('Schedule details:', allStaffSchedules);
        }
        
        // Separate blocked and non-blocked schedules
        const blockedSchedules = allStaffSchedules.filter((sch: any) => sch.isBlocked);
        const availableSchedules = allStaffSchedules.filter((sch: any) => !sch.isBlocked);
        
        console.log(`Available schedules: ${availableSchedules.length}, Blocked schedules: ${blockedSchedules.length}`);
        
        // Get existing appointments for this staff on this day
        const staffAppointments = appointments.filter((apt: any) => {
          const aptDate = new Date(apt.startTime);
          return apt.staffId === s.id && 
                 aptDate.toDateString() === date.toDateString();
        });
        
        // If no schedule at all, gray out the whole day
        if (allStaffSchedules.length === 0) {
          console.log(`No schedules found for ${dayName}, graying out entire day`);
          events.push({
            start: startOfDay(date),
            end: endOfDay(date),
            resourceId: s.id,
            allDay: false,
            title: '',
            type: 'unavailable',
            style: { backgroundColor: '#e5e7eb', opacity: 0.5 },
            isBackground: true, // Mark as background event
          });
        } else {
          // Handle blocked schedules - show them as grayed out areas
          blockedSchedules.forEach((sch: any) => {
            const [startHour, startMinute] = sch.startTime.split(':').map(Number);
            const [endHour, endMinute] = sch.endTime.split(':').map(Number);
            const blockStart = setMinutes(setHours(startOfDay(date), startHour), startMinute);
            const blockEnd = setMinutes(setHours(startOfDay(date), endHour), endMinute);
            
            console.log(`Adding blocked schedule: ${sch.startTime} - ${sch.endTime}`);
            events.push({
              start: blockStart,
              end: blockEnd,
              resourceId: s.id,
              allDay: false,
              title: 'Blocked',
              type: 'unavailable',
              style: { backgroundColor: '#6b7280', opacity: 0.8 }, // Darker gray for blocked slots
              isBackground: true, // Mark as background event
            });
          });
          
          // Handle available schedules - gray out before/after working hours
          availableSchedules.forEach((sch: any) => {
            const [startHour, startMinute] = sch.startTime.split(':').map(Number);
            const [endHour, endMinute] = sch.endTime.split(':').map(Number);
            const workStart = setMinutes(setHours(startOfDay(date), startHour), startMinute);
            const workEnd = setMinutes(setHours(startOfDay(date), endHour), endMinute);
            
            console.log(`Adding available schedule: ${sch.startTime} - ${sch.endTime}`);
            
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
                isBackground: true, // Mark as background event
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
                isBackground: true, // Mark as background event
              });
            }
            
            // Gray out time slots that conflict with existing appointments
            staffAppointments.forEach((apt: any) => {
              const aptStart = new Date(apt.startTime);
              const aptEnd = new Date(apt.endTime || apt.startTime);
              
              // Only gray out if the appointment is within working hours
              if (aptStart >= workStart && aptEnd <= workEnd) {
                console.log(`Adding booked appointment: ${aptStart} - ${aptEnd}`);
                events.push({
                  start: aptStart,
                  end: aptEnd,
                  resourceId: s.id,
                  allDay: false,
                  title: 'Booked',
                  type: 'unavailable',
                  style: { backgroundColor: '#9ca3af', opacity: 0.7 }, // Darker gray for booked slots
                  isBackground: true, // Mark as background event
                });
              }
            });
          });
        }
      });
    });
    
    console.log(`Total background events created: ${events.length}`);
    return events;
  }

  return (
    <div className="min-h-screen lg:h-screen bg-gray-50 dark:bg-gray-900">
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
        
        /* Ensure calendar scrolling works properly */
        .rbc-calendar {
          overflow: visible !important;
        }
        
        .rbc-time-view {
          overflow: visible !important;
        }
        
        .rbc-time-content {
          overflow: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }
        
        .rbc-month-view {
          overflow: visible !important;
        }
        
        .rbc-day-view {
          overflow: visible !important;
        }
        
        /* Fix calendar container scrolling */
        .rbc-calendar-container {
          overflow: auto !important;
          height: 100% !important;
        }
        
        /* Ensure proper scrolling for all calendar views */
        .rbc-time-view .rbc-time-content,
        .rbc-month-view .rbc-month-content,
        .rbc-day-view .rbc-day-content {
          overflow: auto !important;
          max-height: none !important;
        }
        
        /* Fix scrolling for calendar events and slots */
        .rbc-time-slot,
        .rbc-day-slot {
          overflow: visible !important;
        }
        
        /* Ensure calendar toolbar doesn't interfere with scrolling */
        .rbc-toolbar {
          position: sticky !important;
          top: 0 !important;
          background: white !important;
          z-index: 10 !important;
        }
        
        /* Dark mode support for toolbar */
        .dark .rbc-toolbar {
          background: rgb(17 24 39) !important;
        }
        
        /* Responsive height adjustments */
        @media (max-width: 1024px) {
          .rbc-calendar {
            height: calc(100vh - 250px) !important;
          }
        }
        
        @media (max-width: 768px) {
          .rbc-calendar {
            height: calc(100vh - 200px) !important;
          }
        }
        
        /* Ensure calendar events are properly scrollable */
        .rbc-event {
          cursor: pointer !important;
          overflow: visible !important;
        }
        
        /* Fix calendar grid scrolling */
        .rbc-time-grid,
        .rbc-month-grid {
          overflow: auto !important;
        }
        
        /* Ensure proper touch scrolling on mobile */
        .rbc-calendar * {
          -webkit-overflow-scrolling: touch !important;
        }
      `}</style>
      <SidebarController />
      <div className="min-h-screen flex flex-col transition-all duration-300">
        <Header />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-6 min-h-0">
            {/* Mobile Mini Calendar - Shown on mobile at top */}
            <div className="block lg:hidden mb-4">
              <Card className="p-4">
                <MiniCalendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date as Date);
                    setCalendarView('day');
                  }}
                  className="w-full"
                />
              </Card>
            </div>

            {/* Desktop Left Sidebar: Mini Calendar */}
            <div className="hidden lg:flex flex-col w-72 gap-6 flex-shrink-0">
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
            <div className="flex-1 flex flex-col gap-3 sm:gap-4 lg:gap-6 min-h-0 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
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
                  
                  <div className="w-full h-full min-h-0 overflow-auto" style={{ height: 'calc(100vh - 300px)' }}>
                    <div
                      className="overflow-x-auto w-full touch-manipulation min-h-[400px] lg:min-h-0"
                      style={{ 
                        minWidth: `${Math.max((filteredResources?.length || 0) * 200, 320)}px`,
                        maxHeight: '100%',
                        height: calendarView === 'day' ? 'calc(100vh - 380px)' : 'calc(100vh - 300px)'
                      }}
                    >
                      <BigCalendar
                        key={`calendar-${schedules.length}-${selectedLocation?.id}-${filteredResources?.length}-${selectedDate?.toISOString().slice(0, 10)}`}
                        events={(() => {
                          const appointmentEvents = filteredAppointments?.map((apt: any) => {
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
                              type: 'appointment',
                              resource: {
                                ...apt,
                                serviceColor: service?.color || '#3B82F6', // Use service color or default blue
                              },
                            };
                          }) || [];
                          
                          console.log('📅 Appointment events created:', appointmentEvents.length);
                          
                          return appointmentEvents;
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