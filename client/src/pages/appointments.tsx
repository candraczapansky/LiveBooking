import { useState, useEffect, Suspense, lazy, useMemo, useContext } from "react";
import { SidebarController } from "@/components/layout/sidebar";
// import Header from "@/components/layout/header"; // Provided by MainLayout
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/use-document-title";

import { useLocation } from "@/contexts/LocationContext";
import { useLocation as useWouterLocation } from "wouter";
import { useSidebar } from "@/contexts/SidebarContext";
import { apiRequest } from "@/lib/queryClient";
const AppointmentForm = lazy(() => import("@/components/appointments/appointment-form"));
const AppointmentCheckout = lazy(() => import("@/components/appointments/appointment-checkout"));
const AppointmentDetails = lazy(() => import("@/components/appointments/appointment-details"));
const AddEditScheduleDialog = lazy(() => import("@/components/staff/add-edit-schedule-dialog").then(m => ({ default: m.AddEditScheduleDialog })));
import { Plus, Calendar, Filter, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BigCalendar from "@/components/calendar/BigCalendar";
import { Calendar as MiniCalendar } from "@/components/ui/calendar";
import { startOfDay, endOfDay, setHours, setMinutes } from 'date-fns';
import { toCentralWallTime } from "@/lib/utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AuthContext } from "@/contexts/AuthProvider";

const AppointmentsPage = () => {
  useDocumentTitle("Client Appointments | Glo Head Spa");
  const queryClient = useQueryClient();

  const { selectedLocation } = useLocation();
  const { isOpen: isSidebarOpen, isMobile: isSidebarMobile } = useSidebar();
  const [pathname] = useWouterLocation();

  // Redirect when accessing the internal Client Booking page (/booking-test)
  useEffect(() => {
    if (pathname === "/booking-test") {
      const externalBookingUrl = "https://a18c597c-e649-4788-842b-cc4c1c0f11dc-00-31r6my1r6s9ka.picard.replit.dev/booking";
      try {
        window.location.replace(externalBookingUrl);
      } catch {
        window.location.href = externalBookingUrl;
      }
    }
  }, [pathname]);
  
  // State
  // Note: Calendar starts on daily view by default, showing all staff per location
  // Users can filter to specific staff if needed, but daily view is optimized for seeing all staff schedules
  // Staff are filtered by both date (for daily view) and location (for all views) - only staff with schedules at the selected location appear
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutAppointment, setCheckoutAppointment] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('appointments.selectedDate');
        if (stored) {
          const ts = Number(stored);
          if (!Number.isNaN(ts)) {
            const d = new Date(ts);
            if (!isNaN(d.getTime())) return d;
          }
        }
      }
    } catch {}
    return new Date();
  });
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const v = localStorage.getItem('appointments.calendarView');
        if (v === 'day' || v === 'week' || v === 'month') return v;
      }
    } catch {}
    return 'day';
  });
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsAppointmentId, setDetailsAppointmentId] = useState<number | null>(null);
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>("all");
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);
  const [preSelectedResourceId, setPreSelectedResourceId] = useState<number | null>(null);
  const [isQuickBlockedOpen, setIsQuickBlockedOpen] = useState(false);
  const [quickSchedule, setQuickSchedule] = useState<any | null>(null);
  const [quickStartTime, setQuickStartTime] = useState<string>("");
  const [quickEndTime, setQuickEndTime] = useState<string>("");
  
  // Store availability info when clicking on availability blocks
  const [editAvailabilityStaffId, setEditAvailabilityStaffId] = useState<number | null>(null);
  const [editAvailabilityDate, setEditAvailabilityDate] = useState<Date>(new Date());
  const [editAvailabilitySchedule, setEditAvailabilitySchedule] = useState<any | null>(null);
  const [quickDate, setQuickDate] = useState<string | null>(null);
  const [repeatWeekly, setRepeatWeekly] = useState<boolean>(false);
  const [repeatEndDate, setRepeatEndDate] = useState<string>("");
  // Right-click context menu state for appointments
  const [ctxMenuOpen, setCtxMenuOpen] = useState(false);
  const [ctxMenuPos, setCtxMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [ctxAppointment, setCtxAppointment] = useState<any | null>(null);

  // Close context menu on outside click, escape, or scroll (capture disabled so inner UI works)
  useEffect(() => {
    if (!ctxMenuOpen) return;
    const handleClick = () => setCtxMenuOpen(false);
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setCtxMenuOpen(false); };
    const handleScroll = () => setCtxMenuOpen(false);
    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [ctxMenuOpen]);
  // Add Block flow prefill values
  const [blockInitialValues, setBlockInitialValues] = useState<any | null>(null);
  const [defaultBlockStaffId, setDefaultBlockStaffId] = useState<number | undefined>(undefined);
  // Simple Add Block dialog state
  const [isSimpleBlockOpen, setIsSimpleBlockOpen] = useState(false);
  const [sbStaffId, setSbStaffId] = useState<string>("");
  const [sbDate, setSbDate] = useState<string>("");
  const [sbStartTime, setSbStartTime] = useState<string>("09:00");
  const [sbEndTime, setSbEndTime] = useState<string>("10:00");
  const [sbError, setSbError] = useState<string>("");
  // Calendar color controls
  const [availableColor, setAvailableColor] = useState<string>((typeof window !== 'undefined' && localStorage.getItem('availableColor')) || '#dbeafe');
  const [unavailableColor, setUnavailableColor] = useState<string>((typeof window !== 'undefined' && localStorage.getItem('unavailableColor')) || '#e5e7eb');
  const [blockedColor, setBlockedColor] = useState<string>((typeof window !== 'undefined' && localStorage.getItem('blockedColor')) || '#fca5a5');
  const [confirmedColor, setConfirmedColor] = useState<string>((typeof window !== 'undefined' && localStorage.getItem('confirmedColor')) || '#fde68a');
  const [arrivedColor, setArrivedColor] = useState<string>((typeof window !== 'undefined' && localStorage.getItem('arrivedColor')) || '#a5b4fc');
  const [serviceIdMap, setServiceIdMap] = useState<Record<number, any>>({});
  const [calendarRefreshToken, setCalendarRefreshToken] = useState<number>(0);

  // Helpers to track locally which appointments have been marked "arrived"
  const addArrivedLocal = (id: number) => {
    try {
      const raw = localStorage.getItem('arrivedAppointments') || '[]';
      const ids: number[] = JSON.parse(raw);
      if (!ids.includes(id)) {
        ids.push(id);
        localStorage.setItem('arrivedAppointments', JSON.stringify(ids));
      }
    } catch {}
  };
  const removeArrivedLocal = (id: number) => {
    try {
      const raw = localStorage.getItem('arrivedAppointments') || '[]';
      const ids: number[] = JSON.parse(raw);
      const next = ids.filter((x) => Number(x) !== Number(id));
      localStorage.setItem('arrivedAppointments', JSON.stringify(next));
    } catch {}
  };
  const { user } = useContext(AuthContext);

  // Note: Do not clear local overrides; persist selections across refresh

  // Persist selected date and view locally so the page sticks when returning
  useEffect(() => {
    try {
      if (selectedDate) {
        localStorage.setItem('appointments.selectedDate', String(selectedDate.getTime()));
      }
    } catch {}
  }, [selectedDate]);

  useEffect(() => {
    try {
      localStorage.setItem('appointments.calendarView', calendarView);
    } catch {}
  }, [calendarView]);

  // Queries
  const { data: appointments = [], refetch } = useQuery({
    queryKey: ['/api/appointments', selectedLocation?.id],
    queryFn: async () => {
      const url = selectedLocation?.id 
        ? `/api/appointments?locationId=${selectedLocation.id}`
        : '/api/appointments';
      console.log("[AppointmentsPage] 🔄 Fetching appointments from:", url);
      const response = await apiRequest("GET", url);
      const data = await response.json();
      console.log("[AppointmentsPage] ✅ Received appointments:", data.length, "appointments");
      console.log("[AppointmentsPage] Latest appointment:", data[0] ? {id: data[0].id, startTime: data[0].startTime, notes: data[0].notes} : "No appointments");
      console.log("[AppointmentsPage] Sample appointments:", data.slice(0, 3));
      return data;
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

  // Build a quick lookup map for services by ID from the loaded services list
  useEffect(() => {
    try {
      const nextMap: Record<number, any> = {};
      if (Array.isArray(services)) {
        (services as any[]).forEach((svc: any) => {
          if (svc && svc.id != null) {
            nextMap[Number(svc.id)] = svc;
          }
        });
      }
      if (Object.keys(nextMap).length > 0) {
        setServiceIdMap((prev) => ({ ...prev, ...nextMap }));
      }
    } catch {}
  }, [services]);

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

  // Staff eligible for current location (must have at least one schedule at this location)
  const locationStaffOptions = useMemo(() => {
    try {
      if (!Array.isArray(staff) || !Array.isArray(schedules)) return [] as any[];
      if (!selectedLocation?.id) return staff as any[];
      const locId = selectedLocation.id;
      const staffIdsWithSchedules = new Set<number>((schedules as any[])
        .filter((sch: any) => sch && sch.locationId === locId)
        .map((sch: any) => Number(sch.staffId))
        .filter((id: number) => Number.isFinite(id))
      );
      return (staff as any[]).filter((s: any) => staffIdsWithSchedules.has(Number(s.id)));
    } catch {
      return staff as any[];
    }
  }, [staff, schedules, selectedLocation?.id]);

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
    // Load saved calendar colors for the current user (best-effort)
    try {
      const uid = (user as any)?.id || JSON.parse(localStorage.getItem('user') || '{}')?.id;
      if (uid) {
        fetch(`/api/users/${uid}/color-preferences`).then(async (res) => {
          if (!res.ok) return;
          const prefs = await res.json();
          if (prefs?.availableColor) {
            localStorage.setItem('availableColor', prefs.availableColor);
            setAvailableColor(prefs.availableColor);
          }
          if (prefs?.unavailableColor) {
            localStorage.setItem('unavailableColor', prefs.unavailableColor);
            setUnavailableColor(prefs.unavailableColor);
          }
          if (prefs?.blockedColor) {
            localStorage.setItem('blockedColor', prefs.blockedColor);
            setBlockedColor(prefs.blockedColor);
          }
          if (prefs?.confirmedColor) {
            localStorage.setItem('confirmedColor', prefs.confirmedColor);
            setConfirmedColor(prefs.confirmedColor);
          }
          if (prefs?.arrivedColor) {
            localStorage.setItem('arrivedColor', prefs.arrivedColor);
            setArrivedColor(prefs.arrivedColor);
          }
        }).catch(()=>{});
      }
    } catch {}
  }, [refetch, selectedLocation?.id]);

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

    const toLocalYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${da}`;
    };

    const dateString = toLocalYMD(date);

    // Find schedules for this staff on this day
    const staffSchedules = schedules.filter((schedule: any) => {
      const matchesStaff = schedule.staffId === staffId;
      const matchesDay = String(schedule.dayOfWeek || '').toLowerCase() === String(dayName || '').toLowerCase();

      // Check if the schedule is at the selected location (if location filtering is enabled)
      const matchesLocation = !locationId || schedule.locationId == null || schedule.locationId === locationId;

      // Check if the schedule is active for this date (compare in local time)
      const startDateString = typeof schedule.startDate === 'string'
        ? schedule.startDate
        : toLocalYMD(new Date(schedule.startDate));

      const endDateString = schedule.endDate
        ? (typeof schedule.endDate === 'string'
          ? schedule.endDate
          : toLocalYMD(new Date(schedule.endDate)))
        : null;

      const matchesStartDate = startDateString <= dateString;
      const matchesEndDate = !endDateString || endDateString >= dateString;

      return matchesStaff && matchesDay && matchesLocation && matchesStartDate && matchesEndDate;
    });

    return staffSchedules.length > 0;
  };

  const filteredAppointments = appointments.filter((apt: any) => {
    // Filter by selected location if set
    if (selectedLocation?.id) {
      // If appointment has explicit locationId, require match; otherwise infer by staff's location if available
      if (apt.locationId != null && apt.locationId !== selectedLocation.id) return false;
      if (apt.locationId == null) {
        try {
          const staffRow = staff.find((s: any) => s.id === apt.staffId);
          if (staffRow && staffRow.locationId != null && staffRow.locationId !== selectedLocation.id) return false;
        } catch {}
      }
    }
    // Then apply staff filter
    if (selectedStaffFilter !== "all" && apt.staffId !== parseInt(selectedStaffFilter)) {
      return false;
    }
    return true;
  });
  
  console.log("[AppointmentsPage] Filtered appointments:", filteredAppointments.length, "out of", appointments.length, "total appointments");
  
  // Ensure any services referenced by currently visible appointments are present in the map
  useEffect(() => {
    try {
      if (!Array.isArray(filteredAppointments)) return;
      const missingIds: number[] = [];
      const seen = new Set<number>();
      filteredAppointments.forEach((apt: any) => {
        const sid = Number(apt?.serviceId);
        if (Number.isFinite(sid) && !seen.has(sid)) {
          seen.add(sid);
          if (!serviceIdMap[sid]) {
            missingIds.push(sid);
          }
        }
      });
      if (missingIds.length === 0) return;
      Promise.all(
        missingIds.map(async (id) => {
          try {
            const res = await apiRequest('GET', `/api/services/${id}`);
            if (!res.ok) return null;
            const svc = await res.json();
            return svc && svc.id != null ? [Number(svc.id), svc] : null;
          } catch {
            return null;
          }
        })
      ).then((pairs) => {
        const updates: Record<number, any> = {};
        pairs.forEach((p) => { if (p) updates[p[0]] = p[1]; });
        if (Object.keys(updates).length > 0) {
          setServiceIdMap((prev) => ({ ...prev, ...updates }));
        }
      }).catch(()=>{});
    } catch {}
  }, [filteredAppointments, serviceIdMap]);

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

  const staffList = Array.isArray(staff) ? (staff as any[]) : [];
  const filteredResources = staffList.filter((s: any) => {
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
        schedule.staffId === s.id && (schedule.locationId == null || schedule.locationId === selectedLocation.id)
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

  // Fallback: ensure calendar shows at least the current staff column if no scheduled resources match
  const calendarResources = useMemo(() => {
    try {
      if (Array.isArray(filteredResources) && filteredResources.length > 0) return filteredResources;
      const currentStaffId = (user as any)?.staffId;
      if (currentStaffId != null) {
        const self = (staff as any[]).find((s: any) => Number(s.id) === Number(currentStaffId));
        if (self) return [self];
        // Synthesize a minimal resource from the logged-in user so their column renders
        const firstName = (user as any)?.firstName || (user as any)?.username || 'Staff';
        const lastName = (user as any)?.lastName || '';
        return [{ id: currentStaffId, user: { firstName, lastName } } as any];
      }
      return filteredResources;
    } catch {
      return filteredResources;
    }
  }, [filteredResources, staff, user]);

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
  // Helper: find a schedule for the clicked slot (returns the most specific match or null)
  const findScheduleForSlot = (slotInfo: any) => {
    try {
      const resourceFromSlot = slotInfo?.resourceId ? Number(slotInfo.resourceId) : null;
      const resourceId = resourceFromSlot || preSelectedResourceId || null;
      const clickStart: Date | null = slotInfo?.start ? new Date(slotInfo.start) : null;
      if (!clickStart || isNaN(clickStart.getTime())) return null;
      const baseDate = clickStart;
      const dayName = baseDate.toLocaleDateString('en-US', { weekday: 'long' });
      const dateString = baseDate.toISOString().slice(0, 10);

      // Determine candidate staff: prefer the clicked resource; otherwise use currently visible resources
      const candidateStaffIds: number[] = resourceId
        ? [resourceId]
        : ((filteredResources || []) as any[]).map((s: any) => Number(s.id)).filter((id) => !isNaN(id));

      if (!candidateStaffIds || candidateStaffIds.length === 0) return null;

      // Gather schedules for candidate staff on this day and active on this date
      const daySchedules = (schedules as any[]).filter((sch: any) => {
        try {
          if (!sch || !candidateStaffIds.includes(Number(sch.staffId)) || sch.dayOfWeek !== dayName) return false;
          if (selectedLocation?.id && sch.locationId !== selectedLocation.id) return false;

          const startDateString = typeof sch.startDate === 'string' ? sch.startDate : new Date(sch.startDate).toISOString().slice(0, 10);
          const endDateString = sch.endDate
            ? (typeof sch.endDate === 'string' ? sch.endDate : new Date(sch.endDate).toISOString().slice(0, 10))
            : null;
          const activeOnDate = startDateString <= dateString && (!endDateString || endDateString >= dateString);
          if (!activeOnDate) return false;

          return true;
        } catch {
          return false;
        }
      });

      if (daySchedules.length === 0) return null;

      // First try: match a blocked schedule whose time window includes the click
      const blockedMatch = daySchedules.find((sch: any) => {
        try {
          if (!sch.isBlocked || !sch.startTime || !sch.endTime) return false;
          const [sh, sm] = String(sch.startTime).split(':').map(Number);
          const [eh, em] = String(sch.endTime).split(':').map(Number);
          if ([sh, sm, eh, em].some((n) => isNaN(n))) return false;
          const scheduleStart = setMinutes(setHours(startOfDay(baseDate), sh), sm);
          const scheduleEnd = setMinutes(setHours(startOfDay(baseDate), eh), em);
          return clickStart >= scheduleStart && clickStart < scheduleEnd;
        } catch {
          return false;
        }
      });
      if (blockedMatch) return blockedMatch;

      // No blocked schedule match. If exactly one working schedule exists for that staff/day, allow editing it directly.
      const workingSchedules = daySchedules.filter((sch: any) => !sch.isBlocked);
      if (workingSchedules.length === 1) return workingSchedules[0];

      return null;
    } catch {
      return null;
    }
  };

  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      const response = await apiRequest("DELETE", `/api/schedules/${scheduleId}`);
      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }
    },
    onSuccess: () => {
      try {
        queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
        queryClient.refetchQueries({ queryKey: ['/api/schedules'] });
      } catch {}
      try {
        window.dispatchEvent(new CustomEvent('schedule-updated'));
      } catch {}
    },
    onError: (error) => {
      console.error('Failed to delete schedule:', error);
    }
  });

  const updateBlockedScheduleMutation = useMutation({
    mutationFn: async (payload: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/schedules/${payload.id}`, payload.data);
      if (!response.ok) {
        throw new Error('Failed to update schedule');
      }
      return response.json();
    },
    onSuccess: () => {
      try {
        queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
        queryClient.refetchQueries({ queryKey: ['/api/schedules'] });
      } catch {}
      try {
        window.dispatchEvent(new CustomEvent('schedule-updated'));
      } catch {}
      setIsQuickBlockedOpen(false);
      setQuickSchedule(null);
    },
    onError: (error) => {
      console.error('Failed to update schedule:', error);
    }
  });
  const handleAddAppointment = () => {
    setSelectedAppointmentId(null);
    setIsFormOpen(true);
  };

  const handleAddBlock = () => {
    try {
      const base = selectedDate || new Date();
      const start = new Date(base);
      start.setSeconds(0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      setSbStartTime(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
      setSbEndTime(`${pad(end.getHours())}:${pad(end.getMinutes())}`);
      setSbDate(start.toISOString().slice(0, 10));
      if (selectedStaffFilter !== 'all') {
        // Only prefill if the selected staff is eligible for this location
        const n = Number(selectedStaffFilter);
        const eligible = locationStaffOptions.some((s: any) => Number(s.id) === n);
        setSbStaffId(eligible ? String(n) : "");
      } else {
        setSbStaffId("");
      }
      setSbError("");
      setIsSimpleBlockOpen(true);
    } catch (e) {
      console.warn('Error preparing Add Block dialog:', e);
    }
  };

  const createSimpleBlockMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await apiRequest("POST", "/api/schedules", payload);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to create block');
      }
      return response.json();
    },
    onSuccess: () => {
      try {
        queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
        queryClient.refetchQueries({ queryKey: ['/api/schedules'] });
      } catch {}
      try {
        window.dispatchEvent(new CustomEvent('schedule-updated'));
      } catch {}
      setIsSimpleBlockOpen(false);
    },
    onError: (error) => {
      try {
        setSbError(error instanceof Error ? error.message : 'Failed to create block');
      } catch {}
    }
  });

  // New: handle slot selection from calendar
  const handleSelectSlot = (slotInfo: any) => {
    try {
      if (slotInfo?.start) {
        setSelectedDate(slotInfo.start);
      }
      // If inside a blocked schedule, open quick edit pre-filled with block day/time
      const schedule = findScheduleForSlot(slotInfo);
      if (schedule && schedule.isBlocked) {
        const start: Date | null = slotInfo?.start ? new Date(slotInfo.start) : null;
        if (start && !isNaN(start.getTime())) {
          const dayOfWeek = start.toLocaleDateString('en-US', { weekday: 'long' });
          const dateStr = start.toISOString().slice(0, 10);
          setQuickSchedule({ ...schedule, dayOfWeek });
          setQuickDate(dateStr);
          setQuickStartTime(String(schedule.startTime || ''));
          setQuickEndTime(String(schedule.endTime || ''));
          const startDateStr = typeof schedule.startDate === 'string' ? schedule.startDate : new Date(schedule.startDate).toISOString().slice(0, 10);
          const endDateStr = schedule.endDate ? (typeof schedule.endDate === 'string' ? schedule.endDate : new Date(schedule.endDate).toISOString().slice(0, 10)) : '';
          setRepeatWeekly(!!endDateStr && endDateStr !== startDateStr);
          setRepeatEndDate(endDateStr || '');
          setIsQuickBlockedOpen(true);
          return;
        }
      }
    } catch (e) {
      console.warn('Error handling slot selection:', e);
    }

    // Fallback: create a new appointment (existing behavior)
    setSelectedAppointmentId(null);
    setIsFormOpen(true);
  };

  const handleAppointmentClick = async (appointmentId: number) => {
    // Fetch latest appointment details (to include add-ons) then open details
    try {
      const res = await apiRequest("GET", `/api/appointments/${appointmentId}`);
      const full = await res.json();
      // If addOns present, pass to details by setting the same id (details fetches again itself)
      // We still show details; backend now returns addOns so details will render them.
    } catch {}
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
    // Leave the checkout overlay open so the success confirmation stays visible
    // Only refresh appointments data
    refetch();
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
            return staffList.filter((s: any) => s.id === parseInt(selectedStaffFilter));
          }
          
          // For day view, only show staff who are scheduled for the selected date AND location
          if (calendarView === 'day') {
            const dateToCheck = selectedDate || new Date();
            return staffList.filter((s: any) => isStaffScheduledForDate(s.id, dateToCheck, selectedLocation?.id));
          }
          
          // For week and month views, only show staff who have schedules at the selected location
          if (selectedLocation?.id) {
            return staffList.filter((s: any) => {
              const hasLocationSchedule = schedules.some((schedule: any) => 
                schedule.staffId === s.id && schedule.locationId === selectedLocation.id
              );
              return hasLocationSchedule;
            });
          }
          
          // If no location selected, show all staff
          return staffList;
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

      const appointmentStaffToInclude = staffList.filter((s: any) => staffIdsWithAppointmentsInView.has(s.id));
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
                  const matchesLocation = !selectedLocation?.id || sch.locationId == null || sch.locationId === selectedLocation.id;
                  
                  // Fix date comparison logic: use local YYYY-MM-DD to avoid UTC off-by-one
                  const toLocalYMD = (d: Date) => {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const da = String(d.getDate()).padStart(2, '0');
                    return `${y}-${m}-${da}`;
                  };
                  const todayString = toLocalYMD(date);
                  let startDateString: string;
                  let endDateString: string | null;
                  
                  try {
                    startDateString = typeof sch.startDate === 'string' 
                      ? sch.startDate 
                      : toLocalYMD(new Date(sch.startDate));
                  } catch (e) {
                    console.warn('Error parsing schedule start date:', e);
                    return false;
                  }
                  
                  try {
                    endDateString = sch.endDate 
                      ? (typeof sch.endDate === 'string' 
                        ? sch.endDate 
                        : toLocalYMD(new Date(sch.endDate)))
                      : null;
                  } catch (e) {
                    console.warn('Error parsing schedule end date:', e);
                    endDateString = null;
                  }
                  
                  const matchesStartDate = startDateString <= todayString;
                  const matchesEndDate = !endDateString || endDateString >= todayString;
                  
                  return matchesStaff && matchesDay && matchesLocation && matchesStartDate && matchesEndDate;
                } catch (error) {
                  console.warn('Error filtering schedule:', error);
                  return false;
                }
              });
              
              // Separate blocked and non-blocked schedules
              const blockedSchedules = allStaffSchedules.filter((sch: any) => sch.isBlocked);
              const availableSchedules = allStaffSchedules.filter((sch: any) => !sch.isBlocked);

              // Highlight available schedule region (customizable): draw a background strip for the working window
              try {
                const availableColorLocal = availableColor as string;
                availableSchedules.forEach((avail: any) => {
                  if (!avail.startTime || !avail.endTime) return;
                  const [ah, am] = String(avail.startTime).split(':').map(Number);
                  const [zh, zm] = String(avail.endTime).split(':').map(Number);
                  if ([ah, am, zh, zm].some((n) => isNaN(n))) return;
                  const availStart = setMinutes(setHours(startOfDay(date), ah), am);
                  const availEnd = setMinutes(setHours(startOfDay(date), zh), zm);
                  // Use rbc-day-slot background segment by adding a background event
                  events.push({
                    start: availStart,
                    end: availEnd,
                    resourceId: s.id,
                    allDay: false,
                    title: '',
                    type: 'available',
                    style: { backgroundColor: availableColorLocal, opacity: 1 },
                    isBackground: true,
                    resource: avail, // Include the full schedule data for editing
                  });
                });
              } catch {}
              
              // Note: appointments are rendered separately as interactive events; we also render a visible blocked event for interaction
              
              // Only render masks that strictly match staff schedules; do not gray out whole day when no schedule
              if (allStaffSchedules.length > 0) {
                // Handle blocked schedules (render only background mask, no extra clickable block event)
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
                    
                    // Non-interactive gray background mask (customizable)
                    events.push({
                      start: blockStart,
                      end: blockEnd,
                      resourceId: s.id,
                      allDay: false,
                      title: '',
                      type: 'unavailable',
                      style: { backgroundColor: unavailableColor as string, opacity: 0.35 },
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
                        style: { backgroundColor: unavailableColor as string, opacity: 0.5 },
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
                        style: { backgroundColor: unavailableColor as string, opacity: 0.5 },
                        isBackground: true,
                      });
                    }
                    
                    // Do not overlay booked appointment times as unavailable; let appointment events render and handle clicks/colors
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

  // Helper: Create clickable events for blocked schedules so clicks are captured reliably
  function getClickableBlockedEvents() {
    try {
      if (!schedules || !staff) return [] as any[];
      const events: any[] = [];

      const baseDate = selectedDate || new Date();
      const days = calendarView === 'week'
        ? Array.from({ length: 7 }, (_, i) => {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() - d.getDay() + i);
            d.setHours(0, 0, 0, 0);
            return d;
          })
        : [new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())];

      const staffToInclude = (selectedStaffFilter !== "all")
        ? staffList.filter((s: any) => s.id === parseInt(selectedStaffFilter))
        : filteredResources;

      staffToInclude.forEach((s: any) => {
        days.forEach((date) => {
          try {
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
            const todayString = date.toISOString().slice(0, 10);

            const todaysBlocked = (schedules as any[]).filter((sch: any) => {
              if (!sch || !sch.isBlocked) return false;
              if (sch.staffId !== s.id || sch.dayOfWeek !== dayName) return false;
              if (selectedLocation?.id && sch.locationId != null && sch.locationId !== selectedLocation.id) return false;
              const startDateString = typeof sch.startDate === 'string' ? sch.startDate : new Date(sch.startDate).toISOString().slice(0, 10);
              const endDateString = sch.endDate ? (typeof sch.endDate === 'string' ? sch.endDate : new Date(sch.endDate).toISOString().slice(0, 10)) : null;
              return startDateString <= todayString && (!endDateString || endDateString >= todayString);
            });

            todaysBlocked.forEach((sch: any) => {
              try {
                if (!sch.startTime || !sch.endTime) return;
                const [startHour, startMinute] = String(sch.startTime).split(':').map(Number);
                const [endHour, endMinute] = String(sch.endTime).split(':').map(Number);
                if ([startHour, startMinute, endHour, endMinute].some((n) => isNaN(n))) return;
                const start = setMinutes(setHours(startOfDay(date), startHour), startMinute);
                const end = setMinutes(setHours(startOfDay(date), endHour), endMinute);
                if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

                // Clickable overlay event
                events.push({
                  id: `blocked-${sch.id}-${todayString}`,
                  title: 'Blocked',
                  start,
                  end,
                  resourceId: s.id,
                  allDay: false,
                  type: 'blocked',
                  resource: sch,
                });
              } catch (e) {
                console.warn('Error creating blocked event:', e);
              }
            });
          } catch (e) {
            console.warn('Error processing blocked events for staff/day:', e);
          }
        });
      });

      return events;
    } catch (e) {
      console.warn('Error generating clickable blocked events:', e);
      return [] as any[];
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
        
        /* Trim event content so it doesn't visually overlap neighboring events */
        .rbc-event-content {
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
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
        
        /* Ensure calendar events do not visually overlap neighboring events */
        .rbc-event {
          cursor: pointer !important;
          overflow: hidden !important; /* clip content to event bounds to prevent bleed-over */
          width: 100% !important; /* Force events to take full width of their container */
          left: 0 !important; /* Start at the left edge */
        }
        
        /* Ensure events in resource columns take full width */
        .rbc-day-slot .rbc-events-container .rbc-event {
          width: calc(100% - 2px) !important; /* Full width minus small margin for borders */
          left: 0 !important;
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

        /* Fix month view date alignment - ensure date numbers are perfectly centered */
        .rbc-month-view .rbc-date-cell {
          flex: 1 1 0 !important;
          min-width: 0 !important;
          padding: 6px 0 !important; /* remove asymmetric right padding */
          text-align: center !important;
          display: flex !important;
          align-items: flex-start !important;
          justify-content: center !important;
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
        .rbc-month-view .rbc-date-cell > span,
        .rbc-month-view .rbc-date-cell > button,
        .rbc-month-view .rbc-date-cell .rbc-button-link {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          margin: 0 auto !important; /* center inside the cell */
          float: none !important; /* override library float */
          position: relative !important;
          left: 12px !important; /* nudge numbers more to the right */
          font-variant-numeric: tabular-nums !important; /* consistent centering for 1-digit days */
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
          justify-items: center !important;
          align-items: center !important;
        }
        .appointments-mini-calendar .rdp-head_cell,
        .appointments-mini-calendar .rdp-cell {
          padding: 0 !important;
          text-align: center !important;
          vertical-align: middle !important;
          display: grid !important;
          place-items: center !important;
        }

        /* Nudge weekday labels and the selected-day border slightly left to align visually */
        .appointments-mini-calendar .rdp-head_cell {
          transform: translateX(-2px) !important;
        }
        .appointments-mini-calendar .rdp-day {
          width: 36px !important;
          height: 36px !important;
          padding: 0 !important;
          margin: 0 !important;
          margin-left: 16px !important; /* push the entire day button right */
          display: block !important; /* block to enable padding control */
          line-height: 36px !important; /* keep number vertically centered */
          text-align: left !important; /* allow horizontal nudge via padding */
          padding-left: 26px !important; /* push numeral further to the right */
          border-radius: 0.375rem !important;
          box-sizing: border-box !important;
          font-variant-numeric: tabular-nums !important;
          text-indent: 0 !important; /* use padding-left for reliable shift */
        }

        /* Ensure day buttons are centered within grid cells without offsets */
        .appointments-mini-calendar .rdp-cell { position: relative !important; }
        .appointments-mini-calendar .rdp-day {
          position: relative !important;
          left: 12px !important; /* shift entire day button right */
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
          transform: none !important; /* keep highlight centered; only the number shifts */
        }
      `}</style>
      <SidebarController isOpen={isSidebarOpen} isMobile={isSidebarMobile} />
      <div className="min-h-screen flex flex-col transition-all duration-300">
        <main className={`flex-1 p-3 sm:p-4 md:p-6 ${!isSidebarOpen && !isSidebarMobile ? '-ml-16 pl-0 sm:pl-0 md:pl-0' : ''}`}>
          <div className="w-full flex flex-row gap-3 sm:gap-4 lg:gap-6">
            {/* Left Sidebar: Mini Calendar */}
            <div className={`appointments-mini-calendar flex flex-col gap-6 flex-shrink-0 self-start w-auto min-w-[260px] ${!isSidebarOpen ? 'ml-0' : ''}`} data-mini-mode={calendarView}>
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
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button onClick={handleAddAppointment} className="flex items-center gap-2 min-h-[44px]">
                    <Plus className="h-4 w-4" />
                    New Appointment
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px]"
                    onClick={handleAddBlock}
                  >
                    Add Block
                  </Button>
                </div>
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
                    {/* Staff Filter + Colors */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-500" />
                        <Select value={selectedStaffFilter} onValueChange={setSelectedStaffFilter}>
                          <SelectTrigger className="w-48 min-h-[44px]">
                            <SelectValue placeholder="Filter by staff" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              {calendarView === 'day' ? 'All Staff (Daily View)' : 'All Staff'}
                            </SelectItem>
                            {locationStaffOptions?.map((s: any) => (
                              <SelectItem key={s.id} value={s.id.toString()}>
                                {(() => {
                                  const u = s?.user || {};
                                  const first = (u.firstName || '').trim();
                                  const last = (u.lastName || '').trim();
                                  const full = `${first} ${last}`.trim();
                                  return full || u.username || 'Unknown Staff';
                                })()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Colors:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Avail</span>
                          <input type="color" value={availableColor} onChange={(e)=>{try{const v=e.target.value;localStorage.setItem('availableColor',v);setAvailableColor(v);try{const uid=(user as any)?.id||JSON.parse(localStorage.getItem('user')||'{}')?.id;if(uid){fetch(`/api/users/${uid}/color-preferences`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({availableColor:v})}).catch(()=>{});}}catch{} setSelectedDate((d)=>d?new Date(d):new Date());}catch{}}} className="h-7 w-9 p-0 border rounded" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Unavail</span>
                          <input type="color" value={unavailableColor} onChange={(e)=>{try{const v=e.target.value;localStorage.setItem('unavailableColor',v);setUnavailableColor(v);try{const uid=(user as any)?.id||JSON.parse(localStorage.getItem('user')||'{}')?.id;if(uid){fetch(`/api/users/${uid}/color-preferences`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({unavailableColor:v})}).catch(()=>{});}}catch{} setSelectedDate((d)=>d?new Date(d):new Date());}catch{}}} className="h-7 w-9 p-0 border rounded" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Blocked</span>
                          <input type="color" value={blockedColor} onChange={(e)=>{try{const v=e.target.value;localStorage.setItem('blockedColor',v);setBlockedColor(v);try{const uid=(user as any)?.id||JSON.parse(localStorage.getItem('user')||'{}')?.id;if(uid){fetch(`/api/users/${uid}/color-preferences`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({blockedColor:v})}).catch(()=>{});}}catch{} setSelectedDate((d)=>d?new Date(d):new Date());}catch{}}} className="h-7 w-9 p-0 border rounded" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Confirmed</span>
                          <input type="color" value={confirmedColor} onChange={(e)=>{try{const v=e.target.value;localStorage.setItem('confirmedColor',v);setConfirmedColor(v);try{const uid=(user as any)?.id||JSON.parse(localStorage.getItem('user')||'{}')?.id;if(uid){fetch(`/api/users/${uid}/color-preferences`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmedColor:v})}).catch(()=>{});}}catch{} setSelectedDate((d)=>d?new Date(d):new Date());}catch{}}} className="h-7 w-9 p-0 border rounded" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Arrived</span>
                          <input type="color" value={arrivedColor} onChange={(e)=>{try{const v=e.target.value;localStorage.setItem('arrivedColor',v);setArrivedColor(v);try{const uid=(user as any)?.id||JSON.parse(localStorage.getItem('user')||'{}')?.id;if(uid){fetch(`/api/users/${uid}/color-preferences`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({arrivedColor:v})}).catch(()=>{});}}catch{} setSelectedDate((d)=>d?new Date(d):new Date());}catch{}}} className="h-7 w-9 p-0 border rounded" />
                        </div>
                      </div>
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
                        key={`calendar-${schedules.length}-${selectedLocation?.id}-${filteredResources?.length}-${selectedDate ? selectedDate.toISOString().slice(0, 10) : 'no-date'}-${calendarRefreshToken}`}
                        blockedColor={blockedColor}
                        unavailableColor={unavailableColor}
                        availableColor={availableColor}
                        confirmedColor={confirmedColor}
                        arrivedColor={arrivedColor}
                        events={(() => {
                          try {
                            // Read locally-marked overrides
                            let arrivedIds: number[] = [];
                            let confirmedIds: number[] = [];
                            try {
                              const raw = typeof window !== 'undefined' ? (localStorage.getItem('arrivedAppointments') || '[]') : '[]';
                              const parsed = JSON.parse(raw);
                              if (Array.isArray(parsed)) {
                                arrivedIds = parsed.map((n: any) => Number(n)).filter((n: any) => Number.isFinite(n));
                              }
                            } catch {}
                            try {
                              const rawC = typeof window !== 'undefined' ? (localStorage.getItem('confirmedAppointments') || '[]') : '[]';
                              const parsedC = JSON.parse(rawC);
                              if (Array.isArray(parsedC)) {
                                confirmedIds = parsedC.map((n: any) => Number(n)).filter((n: any) => Number.isFinite(n));
                              }
                            } catch {}

                            const appointmentEvents = filteredAppointments?.map((apt: any) => {
                              if (!apt || !apt.startTime) {
                                console.warn('Invalid appointment data:', apt);
                                return null;
                              }

                              try {
                                const client = users?.find((u: any) => u.id === apt.clientId);
                                const service = serviceIdMap?.[Number(apt.serviceId)] ?? services?.find((s: any) => Number(s.id) === Number(apt.serviceId));
                                const isArrivedLocal = arrivedIds.includes(Number(apt.id));
                                const isConfirmedLocal = confirmedIds.includes(Number(apt.id));
                                
                                // Validate and parse dates
                                let startDate: Date;
                                let endDate: Date;
                                
                                try {
                                  // Use raw timestamps; calendar will render in local wall-clock
                                  startDate = new Date(apt.startTime);
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
                                  title: `${client ? client.firstName + ' ' + client.lastName : 'Unknown Client'} - ${service?.name || (typeof (apt as any)?.service?.name === 'string' ? (apt as any).service.name : 'Unknown Service')}`,
                                  start: startDate,
                                  end: endDate,
                                  resourceId: apt.staffId,
                                  type: 'appointment',
                                  resource: {
                                    ...apt,
                                    arrivedOverride: isArrivedLocal === true,
                                    confirmedOverride: isConfirmedLocal === true,
                                    service: service || (apt as any)?.service || null,
                                    serviceColor: (service?.color || (apt as any)?.service?.color || '#3B82F6'),
                                  },
                                };
                              } catch (error) {
                                console.error('Error processing appointment:', error);
                                return null;
                              }
                            }).filter(Boolean) || [];
                            
                            const blockedEvents = getClickableBlockedEvents();
                            // Fallback: also render background availability as regular events so they always show
                            const backgroundAsEvents = getBackgroundEvents();
                            console.log('📅 Valid appointment events created:', appointmentEvents.length);
                            console.log('⛔ Clickable blocked events created:', blockedEvents.length);
                            console.log('🎨 Background-as-events created:', Array.isArray(backgroundAsEvents) ? backgroundAsEvents.length : 0);
                            
                            // Draw background availability first, then appointments, then clickable blocked overlays
                            return [
                              ...(Array.isArray(backgroundAsEvents) ? backgroundAsEvents : []),
                              ...appointmentEvents,
                              ...blockedEvents,
                            ];
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
                        resources={(calendarResources || filteredResources || [])?.map((s: any) => ({
                          resourceId: s.id,
                          resourceTitle: (() => {
                            const u = s?.user || {};
                            const first = (u.firstName || '').trim();
                            const last = (u.lastName || '').trim();
                            const full = `${first} ${last}`.trim();
                            return full || u.username || 'Unknown Staff';
                          })(),
                        })) || []}
                        onPreSelectResource={(rid) => {
                          try {
                            setPreSelectedResourceId(rid != null ? Number(rid) : null);
                          } catch {
                            setPreSelectedResourceId(null);
                          }
                        }}
                        onEventContextMenu={(event, position) => {
                          try {
                            // Only for appointments; BigCalendar already filters by type
                            const apt = (event as any)?.resource;
                            if (!apt) return;
                            // Only allow context menu for appointments that are not paid
                            if (apt.paymentStatus && String(apt.paymentStatus).toLowerCase() === 'paid') {
                              return;
                            }
                            setCtxAppointment(apt);
                            setCtxMenuPos(position);
                            setCtxMenuOpen(true);
                          } catch {}
                        }}
                        onInterceptSlotClick={({ date, resourceId }) => {
                          try {
                            if (!(date instanceof Date)) return false;
                            const clicked = new Date(date);
                            const blockedEvents = getClickableBlockedEvents();
                            const match = blockedEvents.find((ev: any) => {
                              if (resourceId != null && Number(ev.resourceId) !== Number(resourceId)) return false;
                              return clicked >= (ev.start as Date) && clicked < (ev.end as Date);
                            });
                            if (match && match.resource) {
                              const sch = match.resource;
                              const dayOfWeek = clicked.toLocaleDateString('en-US', { weekday: 'long' });
                              setQuickSchedule({ ...sch, dayOfWeek });
                              setQuickDate(clicked.toISOString().slice(0, 10));
                              setQuickStartTime(String(sch.startTime || ''));
                              setQuickEndTime(String(sch.endTime || ''));
                              const startDateStr = typeof sch.startDate === 'string' ? sch.startDate : new Date(sch.startDate).toISOString().slice(0, 10);
                              const endDateStr = sch.endDate ? (typeof sch.endDate === 'string' ? sch.endDate : new Date(sch.endDate).toISOString().slice(0, 10)) : '';
                              setRepeatWeekly(!!endDateStr && endDateStr !== startDateStr);
                              setRepeatEndDate(endDateStr || '');
                              setIsQuickBlockedOpen(true);
                              return true; // prevent create card
                            }
                          } catch {}
                          return false;
                        }}
                        onSelectEvent={(event) => {
                          // Handle availability block clicks - open appointment form
                          if ((event as any).type === 'available') {
                            const eventData = event as any;
                            const start: Date = eventData.start;
                            const resourceId = eventData.resourceId;
                            const schedule = eventData.resource;
                            
                            // Open appointment form with pre-selected staff and time
                            setSelectedAppointmentId(null);
                            // Store the schedule info for the appointment form
                            setEditAvailabilityStaffId(resourceId);
                            setEditAvailabilityDate(start);
                            setEditAvailabilitySchedule(schedule);
                            setIsFormOpen(true);
                            return;
                          }
                          
                          // Handle blocked schedule clicks (existing code)
                          if ((event as any).type === 'blocked') {
                            const sch = (event as any).resource;
                            if (sch) {
                              // Open quick edit for blocked time using the exact day/time clicked
                              const start: Date = (event as any).start;
                              const end: Date = (event as any).end;
                              const dayOfWeek = start.toLocaleDateString('en-US', { weekday: 'long' });
                              setQuickSchedule({ ...sch, dayOfWeek });
                              setQuickDate(start.toISOString().slice(0, 10));
                              // Pre-fill with existing block window
                              const pad = (n: number) => String(n).padStart(2, '0');
                              setQuickStartTime(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
                              setQuickEndTime(`${pad(end.getHours())}:${pad(end.getMinutes())}`);
                              const startDateStr = typeof sch.startDate === 'string' ? sch.startDate : new Date(sch.startDate).toISOString().slice(0, 10);
                              const endDateStr = sch.endDate ? (typeof sch.endDate === 'string' ? sch.endDate : new Date(sch.endDate).toISOString().slice(0, 10)) : '';
                              setRepeatWeekly(!!endDateStr && endDateStr !== startDateStr);
                              setRepeatEndDate(endDateStr || '');
                              setIsQuickBlockedOpen(true);
                            }
                            return;
                          }
                          if ((event as any).type === 'appointment') {
                            handleAppointmentClick((event as any).id);
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
                      {/* Absolute-positioned context menu near cursor for unpaid/Not-paid appointments */}
                      {ctxMenuOpen && (
                        <div
                          style={{ position: 'fixed', left: ctxMenuPos.x, top: ctxMenuPos.y, zIndex: 9999 }}
                          className="rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                          onMouseDown={(e) => { e.stopPropagation(); }}
                          onClick={(e) => { e.stopPropagation(); }}
                          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        >
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              aria-label="Close"
                              className="h-6 w-6 leading-none text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded"
                              onClick={(e) => { e.stopPropagation(); setCtxMenuOpen(false); }}
                            >
                              ×
                            </button>
                          </div>
                          {(() => {
                            let isConfirmedLocal = false;
                            let isArrivedMarked = false;
                            try {
                              const rawC = (typeof window !== 'undefined' && localStorage.getItem('confirmedAppointments')) || '[]';
                              const idsC = JSON.parse(rawC as string);
                              isConfirmedLocal = Array.isArray(idsC) && idsC.includes(Number(ctxAppointment?.id));
                            } catch {}
                            try {
                              const raw = (typeof window !== 'undefined' && localStorage.getItem('arrivedAppointments')) || '[]';
                              const ids = JSON.parse(raw as string);
                              isArrivedMarked = Array.isArray(ids) && ids.includes(Number(ctxAppointment?.id));
                            } catch {}
                            return (
                              <>
                                <label className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="mr-2"
                                    checked={isConfirmedLocal}
                                    onChange={async (e) => {
                                      try {
                                        if (!ctxAppointment?.id) return;
                                        const nextChecked = e.target.checked;
                                        const rawC = localStorage.getItem('confirmedAppointments') || '[]';
                                        const idsC: number[] = JSON.parse(rawC);
                                        const idNum = Number(ctxAppointment.id);
                                        const next = Array.isArray(idsC) ? idsC.filter((x) => Number(x) !== idNum) : [];
                                        if (nextChecked) next.push(idNum);
                                        localStorage.setItem('confirmedAppointments', JSON.stringify(next));
                                        setCalendarRefreshToken((v)=>v+1);
                                        refetch();
                                      } catch {}
                                    }}
                                  />
                                  Confirmed
                                </label>

                                <label className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="mr-2"
                                    checked={isArrivedMarked}
                                    onChange={async (e) => {
                                      try {
                                        if (!ctxAppointment?.id) return;
                                        const nextChecked = e.target.checked;
                                        const idNum = Number(ctxAppointment.id);
                                        if (nextChecked) {
                                          addArrivedLocal(idNum);
                                        } else {
                                          removeArrivedLocal(idNum);
                                        }
                                        setCalendarRefreshToken((v)=>v+1);
                                        refetch();
                                      } catch {}
                                    }}
                                  />
                                  Arrived
                                </label>
                              </>
                            );
                          })()}
                          <button
                            className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                            onClick={async () => {
                              try {
                                if (!ctxAppointment?.id) return;
                                const confirmCancel = window.confirm('Are you sure you want to cancel this appointment?');
                                if (!confirmCancel) { return; }
                                const res = await apiRequest("POST", `/api/appointments/${ctxAppointment.id}/cancel`, { reason: 'Cancelled from calendar menu' });
                                try { await res.json(); } catch {}
                                removeArrivedLocal(Number(ctxAppointment.id));
                                setCtxMenuOpen(false);
                                setCalendarRefreshToken((v)=>v+1);
                                refetch();
                              } catch {}
                            }}
                          >
                            Cancel appointment
                          </button>
                        </div>
                      )}
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
          selectedDate={editAvailabilityDate || selectedDate}
          selectedStaffId={editAvailabilityStaffId}
          selectedSchedule={editAvailabilitySchedule}
          onCloseCallback={() => {
            setEditAvailabilityStaffId(null);
            setEditAvailabilityDate(new Date());
            setEditAvailabilitySchedule(null);
          }}
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

      {/* Schedule Add/Edit Dialog */}
      <Suspense fallback={null}>
        <AddEditScheduleDialog
          open={isScheduleDialogOpen}
          onOpenChange={(open) => {
            setIsScheduleDialogOpen(open);
            if (!open) {
              setEditingSchedule(null);
              setBlockInitialValues(null);
              setDefaultBlockStaffId(undefined);
            }
          }}
          schedule={editingSchedule || undefined}
          defaultStaffId={defaultBlockStaffId}
          initialValues={blockInitialValues || undefined}
          onSuccess={() => {
            try {
              queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
              queryClient.refetchQueries({ queryKey: ['/api/schedules'] });
            } catch {}
            setBlockInitialValues(null);
            setDefaultBlockStaffId(undefined);
          }}
        />
      </Suspense>


      {/* Simple Add Block Dialog */}
      <Dialog open={isSimpleBlockOpen} onOpenChange={(open) => {
        setIsSimpleBlockOpen(open);
        if (!open) {
          setSbError("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Block</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Staff</label>
                <Select value={sbStaffId} onValueChange={setSbStaffId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {locationStaffOptions?.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {(() => {
                          const u = s?.user || {};
                          const first = (u.firstName || '').trim();
                          const last = (u.lastName || '').trim();
                          const full = `${first} ${last}`.trim();
                          return full || u.username || 'Unknown Staff';
                        })()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input type="date" value={sbDate} onChange={(e) => setSbDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Start Time</label>
                <Input type="time" value={sbStartTime} onChange={(e) => setSbStartTime(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">End Time</label>
                <Input type="time" value={sbEndTime} onChange={(e) => setSbEndTime(e.target.value)} />
              </div>
            </div>
            {sbError && (
              <div className="text-red-600 text-sm">{sbError}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSimpleBlockOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              setSbError("");
              const toMinutes = (t: string) => {
                const [h,m] = String(t).split(":").map((n) => parseInt(n, 10));
                return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
              };
              if (!sbStaffId) { setSbError('Please select a staff member.'); return; }
              if (!sbDate) { setSbError('Please select a date.'); return; }
              if (!sbStartTime || !sbEndTime) { setSbError('Please select start and end times.'); return; }
              if (toMinutes(sbEndTime) <= toMinutes(sbStartTime)) { setSbError('End time must be after start time.'); return; }

              try {
                const [yy, mm, dd] = sbDate.split('-').map((n) => parseInt(n, 10));
                const d = new Date(yy, (mm || 1) - 1, dd || 1);
                const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
                const payload = {
                  staffId: parseInt(sbStaffId, 10),
                  dayOfWeek,
                  startTime: sbStartTime,
                  endTime: sbEndTime,
                  locationId: selectedLocation?.id ?? null,
                  startDate: sbDate,
                  endDate: sbDate,
                  isBlocked: true,
                  serviceCategories: [],
                };
                createSimpleBlockMutation.mutate(payload);
              } catch (e) {
                setSbError('Failed to create block.');
              }
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Edit/Delete for Blocked Time */}
      <Dialog open={isQuickBlockedOpen} onOpenChange={(open) => {
        setIsQuickBlockedOpen(open);
        if (!open) {
          setQuickDate(null);
          setRepeatWeekly(false);
          setRepeatEndDate('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Blocked Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Time</label>
                <Input type="time" value={quickStartTime} onChange={(e) => setQuickStartTime(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">End Time</label>
                <Input type="time" value={quickEndTime} onChange={(e) => setQuickEndTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  id="repeatWeekly"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={repeatWeekly}
                  onChange={(e) => setRepeatWeekly(e.target.checked)}
                />
                <label htmlFor="repeatWeekly" className="text-sm font-medium">Repeat weekly</label>
              </div>
              {repeatWeekly && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Repeat until</label>
                    <Input
                      type="date"
                      value={repeatEndDate}
                      onChange={(e) => setRepeatEndDate(e.target.value)}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground self-end">
                    {quickDate ? `Starts ${quickDate}` : ''}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuickBlockedOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (quickSchedule?.id && window.confirm('Delete this blocked time?')) {
                  deleteScheduleMutation.mutate(quickSchedule.id);
                  setIsQuickBlockedOpen(false);
                }
              }}
            >
              Delete
            </Button>
            <Button
              onClick={() => {
                if (!quickSchedule?.id) return;
                const existingStartStr = typeof quickSchedule.startDate === 'string' ? quickSchedule.startDate : new Date(quickSchedule.startDate).toISOString().slice(0, 10);
                const baseStartDate = quickDate || existingStartStr;
                const computedEndDate = repeatWeekly
                  ? (repeatEndDate || null)
                  : (baseStartDate || null);
                const payload = {
                  id: quickSchedule.id,
                  data: {
                    staffId: Number(quickSchedule.staffId),
                    locationId: quickSchedule.locationId == null ? null : Number(quickSchedule.locationId),
                    dayOfWeek: quickSchedule.dayOfWeek,
                    startTime: quickStartTime,
                    endTime: quickEndTime,
                    startDate: baseStartDate,
                    endDate: computedEndDate,
                    isBlocked: true,
                    serviceCategories: quickSchedule.serviceCategories || [],
                  },
                };
                updateBlockedScheduleMutation.mutate(payload);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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