import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { formatDuration, formatPrice } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SaveCardModal } from "@/components/payment/save-card-modal";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, Clock, Search, MapPin, Loader2, CreditCard } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

type Service = {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
  categoryId: number;
};

type Category = {
  id: number;
  name: string;
};

type Staff = {
  id: number;
  user: {
    id: number;
    firstName?: string;
    lastName?: string;
  };
  title: string;
};

type BookingWidgetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: number;
  overlayColor?: string;
  variant?: 'default' | 'mobile';
};

const bookingSchema = z.object({
  locationId: z.string().min(1, "Please select a location"),
  serviceId: z.string().min(1, "Please select a service"),
  staffId: z.string().min(1, "Please select a staff member"),
  date: z.date({
    required_error: "Please select a date",
  }),
  time: z.string().min(1, "Please select a time"),
  notes: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address").min(1, "Email is required"),
  phone: z.string().min(1, "Phone number is required"),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

const steps = ["Location", "Service", "Staff", "Time", "Details", "Save Card"];
const saveCardStepIndex = steps.indexOf("Save Card");

// Special sentinel value representing "Any available staff"
const ANY_STAFF_ID = "any";

const BookingWidget = ({ open, onOpenChange, userId, overlayColor, variant = 'default' }: BookingWidgetProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Note: AuthContext removed since we're implementing guest booking
  const [showSaveCardModal, setShowSaveCardModal] = useState(false);
  const [isProcessingBooking, setIsProcessingBooking] = useState(false);
  const [bookingData, setBookingData] = useState<BookingFormValues | null>(null);
  const [savedCardInfo, setSavedCardInfo] = useState<any | null>(null);
  const [createdClientId, setCreatedClientId] = useState<number | null>(null);
  const [createdAppointmentId, setCreatedAppointmentId] = useState<number | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState<boolean>(false);
  const [existingClient, setExistingClient] = useState<any | null>(null);
  const [clientAppointmentHistory, setClientAppointmentHistory] = useState<any[]>([]);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);
  // Detect narrow screens in the widget itself as a fallback to ensure mobile view
  const [isNarrow, setIsNarrow] = useState(false);
  
  
  useEffect(() => {
    try {
      const mq = window.matchMedia('(max-width: 640px)');
      const update = () => setIsNarrow(!!mq.matches);
      if (mq.addEventListener) mq.addEventListener('change', update); else // @ts-ignore
        mq.addListener(update);
      update();
      return () => { if (mq.removeEventListener) mq.removeEventListener('change', update); else // @ts-ignore
        mq.removeListener(update); };
    } catch {}
  }, []);
  const isMobileView = variant === 'mobile' || isNarrow;

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      locationId: "",
      serviceId: "",
      staffId: "",
      date: new Date(),
      time: "",
      notes: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['/api/service-categories'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/service-categories');
      return res.json();
    },
    enabled: open,
    retry: 2,
    retryDelay: 1000
  });

  const selectedLocationId = form.watch('locationId');

  // Fetch services available at the selected location (for precise location scoping)
  const { data: servicesAtLocation = [], isLoading: isLoadingLocationServices } = useQuery({
    queryKey: ['/api/services', selectedCategoryId, selectedLocationId],
    queryFn: async () => {
      const params: string[] = [];
      if (selectedCategoryId) params.push(`categoryId=${selectedCategoryId}`);
      if (selectedLocationId) params.push(`locationId=${selectedLocationId}`);
      const endpoint = params.length > 0 ? `/api/services?${params.join('&')}` : '/api/services';
      const res = await apiRequest('GET', endpoint);
      return res.json();
    },
    enabled: open && !!selectedLocationId
  });

  const { data: staff, isLoading: isLoadingStaff, refetch: refetchStaff } = useQuery({
    queryKey: ['/api/staff', selectedLocationId],
    queryFn: async () => {
      // Fetch all staff; filter by location on the client to avoid server-side zero results
      const res = await apiRequest('GET', '/api/staff');
      return res.json();
    },
    enabled: open,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: 2,
    retryDelay: 1000
  });

  // Fetch schedules for the selected location to detect which staff actually work there
  const { data: schedules, isLoading: isLoadingSchedules, refetch: refetchSchedules } = useQuery({
    queryKey: ['/api/schedules', selectedLocationId, currentStep],
    queryFn: async () => {
      // Fetch schedules for the selected location only to avoid cross-location availability
      const endpoint = selectedLocationId ? `/api/schedules?locationId=${selectedLocationId}` : '/api/schedules';
      const res = await apiRequest('GET', endpoint);
      return res.json();
    },
    enabled: open,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: 2,
    retryDelay: 1000
  });

  // Fetch appointments for the selected location to prevent double-booking
  const { data: appointments = [], refetch: refetchAppointments } = useQuery({
    queryKey: ['/api/appointments', selectedLocationId],
    queryFn: async () => {
      const endpoint = selectedLocationId ? `/api/appointments?locationId=${selectedLocationId}` : '/api/appointments';
      const res = await apiRequest('GET', endpoint);
      return res.json();
    },
    enabled: open,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: 2,
    retryDelay: 1000
  });

  // Force-refresh staff/schedules/appointments when entering Staff (2) or Time (3) steps
  useEffect(() => {
    try {
      if (!open || !selectedLocationId) return;
      if (currentStep === 2 || currentStep === 3) {
        refetchStaff();
        refetchSchedules();
        refetchAppointments();
      }
    } catch {}
  }, [currentStep, open, selectedLocationId]);

  // Compute allowed services based on staff assignments at the selected location
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [allowedServices, setAllowedServices] = useState<any[]>([]);
  // Map of staffId -> set of serviceIds they are assigned (public)
  const [staffServiceIdsMap, setStaffServiceIdsMap] = useState<Map<number, Set<number>>>(new Map());
  // Map of serviceId -> set of staffIds that can perform it (built from the same staffIdsToUse)
  const [serviceToStaffIdsMap, setServiceToStaffIdsMap] = useState<Map<number, Set<number>>>(new Map());
  // Persist the exact staff IDs used to compute allowed services so Step 3 matches Step 2
  const [eligibleStaffIds, setEligibleStaffIds] = useState<number[]>([]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoadingServices(true);
        if (!open || !selectedLocationId) {
          setAllowedServices([]);
          if (!cancelled) setIsLoadingServices(false);
          return;
        }
        // Build list of staff IDs that actually have a schedule at this location (fallback to staff list if schedules are empty)
        const staffIdsFromSchedules = Array.isArray(schedules)
          ? Array.from(new Set((schedules as any[])
              .filter((sch: any) => !sch.isBlocked && (sch.locationId == null || String(sch.locationId) === String(selectedLocationId)))
              .map((sch: any) => Number(sch.staffId))))
          : [];

        // Only include staff who actually have a schedule at this location
        const staffIdsToUseSet = new Set<number>([...staffIdsFromSchedules]);
        const staffIdsToUse: number[] = Array.from(staffIdsToUseSet);

        if (staffIdsToUse.length === 0) {
          setAllowedServices([]);
          setEligibleStaffIds([]);
          if (!cancelled) setIsLoadingServices(false);
          return;
        }

        const lists = await Promise.all(
          staffIdsToUse.map(async (staffId: number) => {
            try {
              const res = await apiRequest('GET', `/api/staff/${staffId}/services?public=true`);
              const data = await res.json();
              return (data || []) as any[]; // full service objects
            } catch {
              return [] as any[];
            }
          })
        );
        const flat = lists.flat();
        const uniqById = new Map<number, any>();
        flat.forEach((svc: any) => {
          if (!svc || typeof svc.id !== 'number') return;
          // Rely on staff schedules at the selected location and their assigned services.
          // Do not filter by service.locationId here to avoid excluding valid staff-assigned services.
          if (!uniqById.has(svc.id)) uniqById.set(svc.id, svc);
        });
        // Build staff -> serviceIds map from lists aligned with staffIdsToUse
        const map = new Map<number, Set<number>>();
        const reverseMap = new Map<number, Set<number>>();
        staffIdsToUse.forEach((sid, idx) => {
          const svcList = lists[idx] || [];
          const serviceIds = new Set<number>();
          svcList.forEach((svc: any) => {
            if (svc && typeof svc.id === 'number') serviceIds.add(svc.id);
            if (svc && typeof svc.id === 'number') {
              if (!reverseMap.has(svc.id)) reverseMap.set(svc.id, new Set<number>());
              reverseMap.get(svc.id)!.add(Number(sid));
            }
          });
          map.set(sid, serviceIds);
        });
        if (!cancelled) {
          setAllowedServices(Array.from(uniqById.values()));
          setStaffServiceIdsMap(map);
          setServiceToStaffIdsMap(reverseMap);
          setEligibleStaffIds(staffIdsToUse);
          setIsLoadingServices(false);
        }
      } catch {
        if (!cancelled) {
          setAllowedServices([]);
          setStaffServiceIdsMap(new Map());
          setServiceToStaffIdsMap(new Map());
          setEligibleStaffIds([]);
          setIsLoadingServices(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, selectedLocationId, staff, schedules]);

  const isPreparingServices = isLoadingCategories || isLoadingStaff || isLoadingSchedules || isLoadingServices || isLoadingLocationServices;

  const { data: locations, isLoading: isLoadingLocations } = useQuery({
    queryKey: ['/api/locations'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/locations');
      return res.json();
    },
    enabled: open,
    retry: 2,
    retryDelay: 1000
  });

  // Get user details if logged in
  const { data: userData } = useQuery({
    queryKey: ['/api/users', userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user data');
      return response.json();
    },
    enabled: !!userId && open && currentStep === 4
  });

  // Pre-fill user data if available
  useEffect(() => {
    if (userData && currentStep === 3) {
      form.setValue('firstName', userData.firstName || "");
      form.setValue('lastName', userData.lastName || "");
      form.setValue('email', userData.email || "");
      form.setValue('phone', userData.phone || "");
    }
  }, [userData, currentStep, form]);

  // Intersect staff-assigned services with services explicitly available at the selected location
  const allowedServicesAtLocation = useMemo(() => {
    if (!selectedLocationId) return allowedServices;
    const list = Array.isArray(servicesAtLocation) ? servicesAtLocation : [];
    // If the location-scoped services are empty, fall back to allowedServices derived from staff assignments
    if (list.length === 0) return allowedServices;
    const locIds = new Set(list.map((s: any) => s?.id).filter((id: any) => typeof id === 'number'));
    return (allowedServices || []).filter((svc: any) => locIds.has(svc?.id));
  }, [allowedServices, servicesAtLocation, selectedLocationId]);

  // Filter services by search query and allowed set (scoped to location)
  const filteredServices = allowedServicesAtLocation?.filter((service: any) => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedCategoryId && String(service.categoryId) !== String(selectedCategoryId)) return false;
    return true;
  });

  // Selected service and details
  const selectedServiceId = form.watch('serviceId');
  const selectedService = selectedServiceId 
    ? allowedServices?.find((service: any) => service.id.toString() === selectedServiceId) 
    : null;
  const selectedStaffId = form.watch('staffId');
  const selectedFormDate = form.watch('date');

  // Reset selected staff when service changes
  useEffect(() => {
    if (open) {
      form.setValue('staffId', "");
    }
  }, [selectedServiceId]);

  // Compute staff available for the selected service at this location
  const staffIdsFromSchedulesSet = new Set<number>(
    Array.isArray(schedules)
      ? (schedules as any[])
          .filter((sch: any) => !sch.isBlocked)
          .map((sch: any) => Number(sch.staffId))
      : []
  );
  const useScheduleFilter = staffIdsFromSchedulesSet.size > 0;
  const availableStaff = useMemo(() => {
    if (!Array.isArray(staff) || !selectedServiceId) return [] as any[];
    const svcIdNum = parseInt(selectedServiceId);
    // Start strictly from staff with schedules at this location
    const baseIds = Array.from(new Set<number>([...staffIdsFromSchedulesSet]));
    const finalIds = baseIds.filter((id) => {
      const svcSet = staffServiceIdsMap.get(Number(id));
      const canDoService = !!svcSet && svcSet.has(svcIdNum);
      const hasSched = staffIdsFromSchedulesSet.has(Number(id));
      return canDoService && hasSched;
    });
    const staffById = new Map<number, any>((Array.isArray(staff) ? staff : []).map((s: any) => [Number(s.id), s]));
    return finalIds.map((id) => staffById.get(Number(id))).filter(Boolean) as any[];
  }, [staff, selectedServiceId, eligibleStaffIds, staffServiceIdsMap, useScheduleFilter, selectedLocationId, schedules]);

  // Generate time slots (8am to 10pm with 30 minute intervals)
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 8; // 8 AM
    const endHour = 22; // 10 PM
    const interval = 30; // 30 minutes
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const formattedHour = hour % 12 || 12;
        const period = hour < 12 ? 'AM' : 'PM';
        const formattedMinute = minute === 0 ? '00' : minute;
        
        slots.push({
          value: `${hour}:${formattedMinute}`,
          label: `${formattedHour}:${formattedMinute} ${period}`
        });
      }
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Restrict appointments to the selected location to avoid cross-location blocking
  const appointmentsForAvailability = useMemo(() => {
    try {
      const list: any[] = Array.isArray(appointments) ? (appointments as any[]) : [];
      if (!selectedLocationId) return list;
      return list.filter((apt: any) => String(apt.locationId) === String(selectedLocationId));
    } catch {
      return [] as any[];
    }
  }, [appointments, selectedLocationId]);

  // Helpers for schedule filtering
  const getDayName = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };
  const formatDateForComparison = (date: Date) => format(date, 'yyyy-MM-dd');
  const isTimeInRange = (timeSlot: string, startTime: string, endTime: string) => {
    const toMinutes = (t: string) => {
      const parts = String(t).trim().split(':');
      const hours = Number(parts[0] || 0);
      const minutes = Number(parts[1] || 0);
      return hours * 60 + minutes;
    };
    const slot = toMinutes(timeSlot);
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    return slot >= start && slot < end;
  };

  // Compute available time slots based on staff schedule and existing appointments
  const getAvailableTimeSlots = () => {
    if (!selectedFormDate) return timeSlots;

    const dayName = getDayName(selectedFormDate);
    const svc: any = selectedService;

    const isStaffAvailableForSlot = (staffIdNum: number, slotValue: string) => {
      const staffSchedules = (Array.isArray(schedules) ? (schedules as any[]) : []).filter((schedule: any) => {
        const currentDateString = formatDateForComparison(selectedFormDate);
        const startDateString = typeof schedule.startDate === 'string'
          ? String(schedule.startDate).slice(0, 10)
          : format(new Date(schedule.startDate), 'yyyy-MM-dd');
        const endDateString = schedule.endDate
          ? (typeof schedule.endDate === 'string'
              ? String(schedule.endDate).slice(0, 10)
              : format(new Date(schedule.endDate), 'yyyy-MM-dd'))
          : null;

        const scheduleDay = String(schedule.dayOfWeek || '').trim().toLowerCase();
        const targetDay = String(dayName).trim().toLowerCase();

        // Schedules here are already filtered by location via the query above
        return Number(schedule.staffId) === Number(staffIdNum) &&
          scheduleDay === targetDay &&
          startDateString <= currentDateString &&
          (!endDateString || endDateString >= currentDateString) &&
          !schedule.isBlocked;
      });

      if (staffSchedules.length === 0) return false;
      const withinSchedule = staffSchedules.some((schedule: any) => isTimeInRange(slotValue, schedule.startTime, schedule.endTime));
      if (!withinSchedule) return false;

      if (!svc) return true;

      const [hours, minutes] = String(slotValue).split(':').map(Number);
      const appointmentStart = new Date(selectedFormDate);
      appointmentStart.setHours(hours, minutes, 0, 0);
      const totalDuration = (svc.duration || 0) + (svc.bufferTimeBefore || 0) + (svc.bufferTimeAfter || 0);
      const appointmentEnd = new Date(appointmentStart.getTime() + totalDuration * 60000);

      const staffAppointments = (Array.isArray(appointmentsForAvailability) ? (appointmentsForAvailability as any[]) : [])
        .filter((apt: any) => apt.staffId === staffIdNum)
        .filter((apt: any) => new Date(apt.startTime).toDateString() === selectedFormDate.toDateString())
        .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      for (const apt of staffAppointments) {
        const existingStart = new Date(apt.startTime);
        const existingEnd = new Date(apt.endTime);
        if (appointmentStart < existingEnd && appointmentEnd > existingStart) {
          return false;
        }
      }
      return true;
    };

    if (selectedStaffId && selectedStaffId !== ANY_STAFF_ID) {
      const staffIdNum = parseInt(selectedStaffId);
      return timeSlots.filter(slot => isStaffAvailableForSlot(staffIdNum, slot.value));
    }

    if (selectedStaffId === ANY_STAFF_ID) {
      const staffList: any[] = Array.isArray(availableStaff) ? (availableStaff as any[]) : [];
      if (!selectedServiceId || staffList.length === 0) return [];
      return timeSlots.filter(slot => staffList.some(s => isStaffAvailableForSlot(Number(s.id), slot.value)));
    }

    return timeSlots;
  };

  const availableTimeSlots = useMemo(getAvailableTimeSlots, [selectedStaffId, selectedFormDate, selectedServiceId, schedules, appointmentsForAvailability, timeSlots]);

  // Compute available days (next 30 days) based on staff schedules, service duration and existing appointments
  const availableDatesSet = useMemo(() => {
    const result = new Set<string>();
    try {
      if (!selectedServiceId) return result;

      const svc: any = selectedService;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const max = addDays(today, 30);

      const staffHasAvailabilityOnDay = (staffIdNum: number, day: Date) => {
        const dayName = getDayName(day);
        const currentDateString = formatDateForComparison(day);
        const staffSchedules = (Array.isArray(schedules) ? (schedules as any[]) : [])
          .filter((schedule: any) => {
            if (Number(schedule.staffId) !== Number(staffIdNum)) return false;
            if (schedule.isBlocked) return false;
            // Treat null locationId as global
            if (selectedLocationId && schedule.locationId != null && String(schedule.locationId) !== String(selectedLocationId)) return false;
            return true;
          })
          .filter((schedule: any) => {
            const startDateString = typeof schedule.startDate === 'string'
              ? String(schedule.startDate).slice(0, 10)
              : format(new Date(schedule.startDate), 'yyyy-MM-dd');
            const endDateString = schedule.endDate
              ? (typeof schedule.endDate === 'string'
                  ? String(schedule.endDate).slice(0, 10)
                  : format(new Date(schedule.endDate), 'yyyy-MM-dd'))
              : null;
            const scheduleDay = String(schedule.dayOfWeek || '').trim().toLowerCase();
            const targetDay = String(dayName).trim().toLowerCase();
            return scheduleDay === targetDay && startDateString <= currentDateString && (!endDateString || endDateString >= currentDateString);
          });
        if (staffSchedules.length === 0) return false;

        const appointmentsForDay = (Array.isArray(appointmentsForAvailability) ? (appointmentsForAvailability as any[]) : [])
          .filter((apt: any) => apt.staffId === staffIdNum)
          .filter((apt: any) => new Date(apt.startTime).toDateString() === day.toDateString())
          .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        for (const slot of timeSlots) {
          const withinSchedule = staffSchedules.some((schedule: any) => isTimeInRange(slot.value, schedule.startTime, schedule.endTime));
          if (!withinSchedule) continue;
          const [hours, minutes] = String(slot.value).split(':').map(Number);
          const appointmentStart = new Date(day);
          appointmentStart.setHours(hours, minutes, 0, 0);
          const totalDuration = (svc?.duration || 0) + (svc?.bufferTimeBefore || 0) + (svc?.bufferTimeAfter || 0);
          const appointmentEnd = new Date(appointmentStart.getTime() + totalDuration * 60000);
          let overlaps = false;
          for (const apt of appointmentsForDay) {
            const existingStart = new Date(apt.startTime);
            const existingEnd = new Date(apt.endTime);
            if (appointmentStart < existingEnd && appointmentEnd > existingStart) {
              overlaps = true;
              break;
            }
          }
          if (!overlaps) return true;
        }
        return false;
      };

      if (selectedStaffId && selectedStaffId !== ANY_STAFF_ID) {
        const staffIdNum = parseInt(selectedStaffId);
        for (let d = new Date(today); d <= max; d.setDate(d.getDate() + 1)) {
          const day = new Date(d);
          if (staffHasAvailabilityOnDay(staffIdNum, day)) {
            result.add(formatDateForComparison(day));
          }
        }
      } else if (selectedStaffId === ANY_STAFF_ID) {
        const staffList: any[] = Array.isArray(availableStaff) ? (availableStaff as any[]) : [];
        if (staffList.length === 0) return result;
        for (let d = new Date(today); d <= max; d.setDate(d.getDate() + 1)) {
          const day = new Date(d);
          const anyHas = staffList.some(s => staffHasAvailabilityOnDay(Number(s.id), day));
          if (anyHas) result.add(formatDateForComparison(day));
        }
      }
    } catch {
      // swallow errors; show no markers on failure
    }
    return result;
  }, [selectedStaffId, selectedServiceId, schedules, appointmentsForAvailability, timeSlots, selectedService]);

  // Clear time if it becomes invalid when dependencies change
  // BUT only if we're on the time selection step (step 3)
  useEffect(() => {
    if (currentStep === 3) {
      const current = form.getValues('time');
      if (current && availableTimeSlots.length > 0 && !availableTimeSlots.some(slot => slot.value === current)) {
        console.log("[BookingWidget] Clearing invalid time selection:", current);
        form.setValue('time', '');
      }
    }
  }, [availableTimeSlots, currentStep]);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId((prev) => (prev === categoryId ? null : categoryId));
    // Reset search and selected service when switching categories
    setSearchQuery("");
    form.setValue('serviceId', "");
  };

  const nextStep = () => {
    const fields = [
      ['locationId'],
      ['serviceId'],
      ['staffId'],
      ['date', 'time'],
      ['firstName', 'lastName', 'email', 'phone'],
      [], // Save Card step - validation handled by processor
    ];

    const currentFields = fields[currentStep];
    
    // Log current form values before validation
    console.log(`[BookingWidget] Moving from step ${currentStep} to next. Current form values:`, form.getValues());
    
    // Validate just the fields for the current step
    form.trigger(currentFields as any[]).then((isValid) => {
      if (isValid) {
        const next = Math.min(currentStep + 1, steps.length - 1);
        console.log(`[BookingWidget] Validation passed, moving to step ${next}`);
        setCurrentStep(next);
        if (next === saveCardStepIndex) {
          // On entering Save Card step, prepare booking data
          const values = form.getValues();
          console.log("[BookingWidget] Preparing booking data for save card step:", values);
          
          // Store the current time value to prevent it from being cleared
          const currentTime = values.time;
          
          // Ensure all required fields are present
          if (!values.date) {
            console.error("[BookingWidget] Missing date field!");
            toast({
              title: "Date Required",
              description: "Please select a date for your appointment",
              variant: "destructive"
            });
            return;
          }
          
          if (!currentTime || currentTime === '') {
            console.error("[BookingWidget] Missing time field! Time value:", currentTime);
            console.log("[BookingWidget] Form state:", form.getValues());
            console.log("[BookingWidget] Available time slots:", availableTimeSlots);
            toast({
              title: "Time Required",
              description: availableTimeSlots.length === 0 
                ? "No available time slots for the selected date. Please choose a different date."
                : "Please select a time for your appointment",
              variant: "destructive"
            });
            return;
          }
          
          // Ensure time is preserved in booking data
          const bookingValues = { ...values, time: currentTime };
          console.log("[BookingWidget] Final booking values with preserved time:", bookingValues);
          setBookingData(bookingValues);
        }
      }
    });
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const createAppointmentAfterPayment = useCallback(async (values: BookingFormValues) => {
    try {
      console.log("[BookingWidget] createAppointmentAfterPayment called with values:", values);
      
      // Validate date and time
      if (!values.date) {
        console.error("[BookingWidget] No date provided!");
        throw new Error("Appointment date is required");
      }
      if (!values.time) {
        console.error("[BookingWidget] No time provided!");
        throw new Error("Appointment time is required");
      }
      
      const date = new Date(values.date);
      if (isNaN(date.getTime())) {
        console.error("[BookingWidget] Invalid date:", values.date);
        throw new Error("Invalid appointment date");
      }
      
      const [hours, minutes] = values.time.split(':').map(Number);
      date.setHours(hours, minutes);
      
      const endTime = new Date(date);
      if (selectedService) {
        endTime.setMinutes(endTime.getMinutes() + selectedService.duration);
      }
      
      console.log("[BookingWidget] Appointment date:", date.toISOString());
      console.log("[BookingWidget] Appointment end time:", endTime.toISOString());
      
      // Resolve actual staff if "Any" selection was made
      let staffIdToUse: number | null = null;
      if (values.staffId === ANY_STAFF_ID) {
        const svc: any = selectedService;
        if (!svc) throw new Error('Service not selected');
        const staffList: any[] = Array.isArray(availableStaff) ? (availableStaff as any[]) : [];
        const dayName = getDayName(date);
        for (const s of staffList) {
          const staffIdNum = Number(s.id);
          const staffSchedules = (Array.isArray(schedules) ? (schedules as any[]) : []).filter((schedule: any) => {
            const currentDateString = formatDateForComparison(date);
            const startDateString = typeof schedule.startDate === 'string' ? schedule.startDate : new Date(schedule.startDate).toISOString().slice(0, 10);
            const endDateString = schedule.endDate ? (typeof schedule.endDate === 'string' ? schedule.endDate : new Date(schedule.endDate).toISOString().slice(0, 10)) : null;
            return schedule.staffId === staffIdNum &&
              schedule.dayOfWeek === dayName &&
              startDateString <= currentDateString &&
              (!endDateString || endDateString >= currentDateString) &&
              !schedule.isBlocked;
          });
          if (staffSchedules.length === 0) continue;
          const withinSchedule = staffSchedules.some((schedule: any) => isTimeInRange(values.time, schedule.startTime, schedule.endTime));
          if (!withinSchedule) continue;
          const totalDuration = (svc.duration || 0) + (svc.bufferTimeBefore || 0) + (svc.bufferTimeAfter || 0);
          const appointmentEnd = new Date(date.getTime() + totalDuration * 60000);
          const staffAppointments = (Array.isArray(appointmentsForAvailability) ? (appointmentsForAvailability as any[]) : [])
            .filter((apt: any) => apt.staffId === staffIdNum)
            .filter((apt: any) => new Date(apt.startTime).toDateString() === date.toDateString())
            .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
          let overlaps = false;
          for (const apt of staffAppointments) {
            const existingStart = new Date(apt.startTime);
            const existingEnd = new Date(apt.endTime);
            if (date < existingEnd && appointmentEnd > existingStart) {
              overlaps = true;
              break;
            }
          }
          if (!overlaps) {
            staffIdToUse = staffIdNum;
            break;
          }
        }
        if (!staffIdToUse) {
          throw new Error('Selected time is no longer available. Please choose another time.');
        }
      } else {
        staffIdToUse = parseInt(values.staffId);
      }

      // Use existing userId, createdClientId, or find/create client
      let clientId = userId || createdClientId;
      if (!clientId) {
        // This shouldn't happen as we create client before showing save card modal
        // But just in case, try to find existing client by email
        const clientsRes = await apiRequest("GET", `/api/clients?email=${encodeURIComponent(values.email)}`);
        const clients = await clientsRes.json();
        
        if (clients && clients.length > 0) {
          clientId = clients[0].id;
        } else {
          // Create new client
          const newClientRes = await apiRequest("POST", "/api/clients", {
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.phone,
            role: 'client'
          });
          const newClient = await newClientRes.json();
          clientId = newClient.id;
        }
      }

      const appointmentData = {
        clientId: clientId,
        serviceId: parseInt(values.serviceId),
        staffId: Number(staffIdToUse),
        startTime: date.toISOString(),
        endTime: endTime.toISOString(),
        status: "confirmed",
        paymentStatus: "unpaid",  // Not paid yet, just card on file
        notes: values.notes,
        locationId: parseInt(values.locationId),
        totalAmount: selectedService?.price || 0
      };
      
      console.log("[BookingWidget] Creating appointment with data:", appointmentData);
      const appointmentRes = await apiRequest("POST", "/api/appointments", appointmentData);
      const appointment = await appointmentRes.json();
      console.log("[BookingWidget] Appointment created:", appointment);
      
      return appointment;
    } catch (error: any) {
      throw error;
    }
  }, [toast, queryClient]);

  // Listen for Helcim payment success events from the persistent listener
  useEffect(() => {
    const handleHelcimSuccess = async (event: CustomEvent) => {
      console.log("[BookingWidget] 🎉 Received Helcim payment success event:", event.detail);
      
      // Update saved card info with the card details from the payment
      if (event.detail.cardLast4 && event.detail.cardBrand) {
        setSavedCardInfo({
          last4: event.detail.cardLast4,
          brand: event.detail.cardBrand,
          saved: true,
          token: event.detail.cardToken
        });
        console.log("[BookingWidget] 💳 Updated saved card info:", {
          last4: event.detail.cardLast4,
          brand: event.detail.cardBrand
        });
      }
      
      // Check if we have booking data to create an appointment
      if (bookingData) {
        console.log("[BookingWidget] 🚀 Creating appointment after payment success...");
        
        // Save confirmation data first
        const confirmData = {
          service: selectedService,
          date: bookingData.date,
          time: bookingData.time,
          timeLabel: timeSlots.find(slot => slot.value === bookingData.time)?.label || bookingData.time
        };
        setConfirmationData(confirmData);
        
        try {
          const appointment = await createAppointmentAfterPayment(bookingData);
          console.log("[BookingWidget] Appointment created:", appointment);
          setBookingConfirmed(true);
          
          // Close main dialog and show confirmation
          onOpenChange(false);
          
          setTimeout(() => {
            setShowConfirmation(true);
            toast({
              title: "Success! 🎉",
              description: "Your appointment has been booked successfully!",
            });
          }, 500);
        } catch (error) {
          console.error("[BookingWidget] Error creating appointment:", error);
          toast({
            title: "Error",
            description: "Failed to create appointment. Please contact support.",
            variant: "destructive",
          });
        }
      } else {
        console.log("[BookingWidget] ⚠️ No booking data available for appointment creation");
      }
    };

    window.addEventListener('helcim-payment-success', handleHelcimSuccess as any);
    
    return () => {
      window.removeEventListener('helcim-payment-success', handleHelcimSuccess as any);
    };
  }, [bookingData, createAppointmentAfterPayment, selectedService, timeSlots, onOpenChange, toast]);

  const handleSubmit = async () => {
    // Get the latest form values
    const latestValues = form.getValues();
    
    // Update bookingData with latest values
    if (latestValues) {
      setBookingData(latestValues);
    }
    
    // Handle Save Card step submission
    if (currentStep === saveCardStepIndex && latestValues) {
      if (!savedCardInfo) {
        // Need to create client first if not logged in
        if (!userId && !createdClientId) {
          try {
            setIsProcessingBooking(true);
            
            // Try to find existing client by email
            const clientsRes = await apiRequest("GET", `/api/clients?email=${encodeURIComponent(latestValues.email)}`);
            const clients = await clientsRes.json();
            
            let clientId: number;
            if (clients && clients.length > 0) {
              // Found existing client
              const existingClientData = clients[0];
              clientId = existingClientData.id;
              setExistingClient(existingClientData);
              
              // Fetch appointment history for existing client
              try {
                const appointmentsRes = await apiRequest("GET", `/api/appointments?clientId=${clientId}`);
                const appointments = await appointmentsRes.json();
                setClientAppointmentHistory(appointments || []);
                console.log("[BookingWidget] Found existing client with appointment history:", appointments.length, "appointments");
              } catch (error) {
                console.error("[BookingWidget] Error fetching appointment history:", error);
                setClientAppointmentHistory([]);
              }
            } else {
              // Create new client
              const newClientRes = await apiRequest("POST", "/api/clients", {
                firstName: latestValues.firstName,
                lastName: latestValues.lastName,
                email: latestValues.email,
                phone: latestValues.phone,
                role: 'client'
              });
              const newClient = await newClientRes.json();
              clientId = newClient.id;
              setExistingClient(null);
              setClientAppointmentHistory([]);
            }
            
            setCreatedClientId(clientId);
            
            // Show save card modal FIRST (appointment will be created after card is saved)
            setShowSaveCardModal(true);
            setIsProcessingBooking(false);
          } catch (error: any) {
            setIsProcessingBooking(false);
            toast({
              title: "Error",
              description: "Failed to create client profile. Please try again.",
              variant: "destructive",
            });
          }
        } else {
          // Client exists, show save card modal FIRST (appointment will be created after card is saved)
          setShowSaveCardModal(true);
          setIsProcessingBooking(false);
        }
      } else {
        // Card already saved, check if appointment is already created
        if (bookingConfirmed && createdAppointmentId) {
          // Appointment already created, show confirmation
          setShowConfirmation(true);
          return;
        }
        
        // Card saved but appointment not created yet (shouldn't happen but handle it)
        if (!bookingData) {
          toast({
            title: "Error",
            description: "Booking information is missing. Please try again.",
            variant: "destructive",
          });
          return;
        }
        
        try {
          setIsProcessingBooking(true);
          const appointment = await createAppointmentAfterPayment(bookingData);
          
          // Force refresh of appointments data with comprehensive cache invalidation
          console.log("[BookingWidget] 🔄 Starting cache invalidation (card already saved)...");
          // Invalidate all appointment-related queries using predicate
          queryClient.invalidateQueries({ 
            predicate: (query) => {
              const queryKey = query.queryKey;
              const shouldInvalidate = Array.isArray(queryKey) && 
                     queryKey.length > 0 && 
                     typeof queryKey[0] === 'string' && 
                     queryKey[0].includes('/api/appointments');
              if (shouldInvalidate) {
                console.log("[BookingWidget] Invalidating query:", queryKey);
              }
              return shouldInvalidate;
            }
          });
          console.log("[BookingWidget] ✅ Cache invalidation completed (card already saved)");
          
          // Also invalidate specific known query keys as backup
          queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
          queryClient.invalidateQueries({ queryKey: ['/api/appointments/active'] });
          queryClient.invalidateQueries({ queryKey: ['/api/appointments/client'] });
          
          // Force refetch all appointment queries
          queryClient.refetchQueries({ 
            predicate: (query) => {
              const queryKey = query.queryKey;
              return Array.isArray(queryKey) && 
                     queryKey.length > 0 && 
                     typeof queryKey[0] === 'string' && 
                     queryKey[0].includes('/api/appointments');
            }
          });
          
          // Debug: Log the created appointment
          console.log("[BookingWidget] Appointment created successfully:", appointment);
          
          // Booking complete
          setBookingConfirmed(true);
          
          // Save confirmation data before closing dialog
          const formData = form.getValues();
          const confirmData = {
            service: selectedService,
            date: formData.date,
            time: formData.time,
            timeLabel: timeSlots.find(slot => slot.value === formData.time)?.label || formData.time
          };
          setConfirmationData(confirmData);
          
          // Show confirmation popup immediately
          setShowConfirmation(true);
          
          // Add toast to confirm
          toast({
            title: "Success! 🎉",
            description: "Your appointment has been booked successfully!",
          });
          
          // Close main dialog after showing confirmation
          setTimeout(() => {
            onOpenChange(false);
          }, 500);

        } catch (error: any) {
          toast({
            title: "Booking Failed",
            description: error.message || "Failed to create appointment. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsProcessingBooking(false);
        }
      }
    }
  };

  // Close dialog and reset form
  const closeAndReset = () => {
    // Reset all state
    form.reset();
    setCurrentStep(0);
    setSearchQuery("");
    setSelectedCategoryId(null);
    setIsProcessingBooking(false);
    setBookingData(null);
    setSavedCardInfo(null);
    setCreatedClientId(null);
    setCreatedAppointmentId(null);
    setBookingConfirmed(false);
    setExistingClient(null);
    setClientAppointmentHistory([]);
    setShowConfirmation(false);
    setConfirmationData(null);
    
    // Reopen the booking widget at step 1
    setTimeout(() => {
      onOpenChange(true);
    }, 100);
  };



  return (
    <>
    <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} className={
        isMobileView
          ? "booking-mobile-overlay fixed left-2 right-2 top-24 z-[90] translate-x-0 translate-y-0 w-auto max-w-[440px] mx-auto max-h-[85vh] overflow-y-auto overflow-x-hidden border border-white/20 dark:border-white/10 rounded-lg p-4 box-border"
          : "w-[95vw] sm:w-auto sm:max-w-[800px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto overflow-x-hidden backdrop-blur-sm border border-white/20 dark:border-white/10"
      } style={isMobileView ? { backgroundColor: overlayColor || 'rgba(255,255,255,0.90)' } : { backgroundColor: overlayColor || 'rgba(255,255,255,0.90)' }}>
        <DialogHeader className={isMobileView ? "p-0" : ""}>
          <DialogTitle className={isMobileView ? "text-lg" : "text-xl"}>Book an Appointment</DialogTitle>
        </DialogHeader>
        {/* Mobile width constraint wrapper start */}
        <div className={isMobileView ? "w-full mx-auto" : ""} style={isMobileView ? {
            maxWidth: 'min(420px, calc(100vw - 1rem - env(safe-area-inset-left) - env(safe-area-inset-right)))'
          } : undefined}>

        {/* Progress Steps */}
        {isMobileView ? (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full h-8 w-8 flex items-center justify-center bg-primary text-white">
                {currentStep + 1}
              </div>
              <div className="text-sm font-medium text-foreground">{steps[currentStep]}</div>
            </div>
            <div className="text-xs text-foreground/70">{currentStep + 1} / {steps.length}</div>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-6">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div 
                  className={`rounded-full h-8 w-8 flex items-center justify-center ${
                    currentStep >= index 
                      ? "bg-primary text-white" 
                      : "border-2 border-foreground/60 text-foreground/70"
                  }`}
                >
                  {index + 1}
                </div>
                <div className="ml-2">
                  <div className={`text-sm font-medium ${
                    currentStep >= index 
                      ? "text-foreground" 
                      : "text-foreground/70"
                  }`}>
                    {step}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden sm:block w-8 h-0.5 ml-2 mr-2 bg-foreground/40"></div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
            {/* Step 1: Location Selection */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <h3 className={isMobileView ? "text-base font-medium text-foreground" : "text-lg font-medium text-foreground"}>Select a Location</h3>
                {isLoadingLocations ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                    <span className="ml-2 text-gray-500">Loading locations...</span>
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Select onValueChange={(v) => {
                            // Reset downstream selections when location changes
                            field.onChange(v);
                            form.setValue('serviceId', "");
                            form.setValue('staffId', "");
                          }} value={field.value}>
                            <SelectTrigger className={isMobileView ? 'min-h-[40px] h-10 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600' : 'min-h-[44px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'}>
                              <SelectValue placeholder="Choose a location" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                              {!locations || locations.length === 0 ? (
                                <SelectItem value="no-locations" disabled>
                                  No locations available
                                </SelectItem>
                              ) : (
                                locations.map((loc: any) => (
                                <SelectItem key={loc.id} value={String(loc.id)}>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>{loc.name}</span>
                                  </div>
                                </SelectItem>
                              ))
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {/* Step 2: Service Selection */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className={`flex items-center ${isMobileView ? 'gap-2 justify-start flex-wrap' : 'justify-between'}`}>
                  <h3 className={isMobileView ? "text-base font-medium text-foreground" : "text-lg font-medium text-foreground"}>Select a Service</h3>
                  {selectedCategoryId && (
                    <div className="relative w-full sm:w-auto sm:max-w-none">
                      <Input 
                        type="text" 
                        placeholder="Search services..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`${isMobileView ? 'pl-8 pr-4 h-10 text-base w-full' : 'pl-8 pr-4 py-2 text-sm'}`}
                      />
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Loading indicator for services at location */}
                {selectedLocationId && isPreparingServices && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading available services…</span>
                  </div>
                )}
                
                {/* Service Categories */}
                <div className={isMobileView ? 'flex flex-wrap gap-2 py-2' : 'flex overflow-x-auto space-x-2 py-2'}>
                  {isLoadingCategories ? (
                    <>
                      <Skeleton className="h-8 w-20 rounded-full" />
                      <Skeleton className="h-8 w-24 rounded-full" />
                      <Skeleton className="h-8 w-16 rounded-full" />
                      <Skeleton className="h-8 w-28 rounded-full" />
                    </>
                  ) : (
                    categories?.filter((category: Category) => {
                      if (!selectedLocationId) return true;
                      // Show category only if at least one allowed service at this location belongs to it
                      if (!allowedServicesAtLocation || allowedServicesAtLocation.length === 0) return false;
                      return allowedServicesAtLocation.some((svc: any) => svc.categoryId === category.id);
                    }).map((category: Category) => (
                      <Button
                        key={category.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full whitespace-nowrap bg-transparent border-none text-foreground hover:bg-foreground/10"
                        onClick={() => handleCategoryChange(category.id.toString())}
                      >
                        {category.name}
                      </Button>
                    ))
                  )}
                </div>
                
                {/* Service List - shown only after selecting a category */}
                {selectedCategoryId && (
                  <FormField
                    control={form.control}
                    name="serviceId"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <div className="grid grid-cols-1 gap-4">
                            {isPreparingServices ? (
                              <>
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                              </>
                            ) : (
                              filteredServices?.length === 0 ? (
                                <div className="col-span-2 text-center py-4 text-gray-500 dark:text-gray-400">
                                  No services found. Please try a different search term.
                                </div>
                              ) : (
                                filteredServices?.map((service: Service) => (
                                  <Card
                                    key={service.id}
                                    className={`cursor-pointer transition-all hover:shadow-md ${
                                      field.value === service.id.toString()
                                        ? "border-primary ring-2 ring-primary ring-opacity-50"
                                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                                    }`}
                                    onClick={() => field.onChange(service.id.toString())}
                                  >
                                    <CardContent className="p-4">
                                      <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                        <div>
                                          <h4 className="text-base font-medium text-gray-900 dark:text-gray-100 break-words">{service.name}</h4>
                                          <p className={`text-sm text-gray-500 dark:text-gray-400 mt-1 ${isMobileView ? 'break-words' : ''}`}>{service.description}</p>
                                          <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                                            <Clock className="h-4 w-4 mr-1" /> {formatDuration(service.duration)}
                                          </div>
                                        </div>
                                        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 sm:text-right">
                                          {formatPrice(service.price)}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))
                              )
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}
            
            {/* Step 3: Staff Selection */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Select Staff Member</h3>
                
                <FormField
                  control={form.control}
                  name="staffId"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormControl>
                        <div className="grid grid-cols-1 gap-4">
                          {selectedServiceId && (availableStaff as any[]).length > 0 && (
                            <Card
                              key="any-staff"
                              className={`cursor-pointer transition-all hover:shadow-md ${
                                field.value === ANY_STAFF_ID
                                  ? "border-primary ring-2 ring-primary ring-opacity-50"
                                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                              }`}
                              onClick={() => field.onChange(ANY_STAFF_ID)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center">
                                  <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-medium text-lg">
                                    *
                                  </div>
                                  <div className="ml-4">
                                    <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">Any available staff</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">We'll assign a qualified staff member for this service.</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          {(availableStaff as any[]).map((staffMember: Staff) => (
                            <Card
                              key={staffMember.id}
                              className={`cursor-pointer transition-all hover:shadow-md ${
                                field.value === staffMember.id.toString()
                                  ? "border-primary ring-2 ring-primary ring-opacity-50"
                                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                              }`}
                              onClick={() => field.onChange(staffMember.id.toString())}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center">
                                  <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-medium text-lg">
                                    {`${staffMember.user?.firstName?.[0] || ""}${staffMember.user?.lastName?.[0] || ""}`}
                                  </div>
                                  <div className="ml-4">
                                    <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">
                                      {(() => {
                                        const u = (staffMember as any)?.user || {};
                                        const first = (u.firstName || '').trim();
                                        const last = (u.lastName || '').trim();
                                        const full = `${first} ${last}`.trim();
                                        return full || u.username || 'Unknown Staff';
                                      })()}
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{staffMember.title}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          {selectedServiceId && (availableStaff as any[]).length === 0 && (
                            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                              No staff available for this service at the selected location.
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            {/* Step 4: Date and Time Selection */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className={isMobileView ? "text-base font-medium text-foreground" : "text-lg font-medium text-foreground"}>Select Date & Time</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={`w-full pl-3 text-left font-normal justify-start border-foreground text-foreground bg-transparent hover:bg-transparent ${isMobileView ? 'min-h-[40px] h-10 text-base' : 'min-h-[44px]'}`}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className={`w-auto p-0 z-[90] ${isMobileView ? 'max-w-[92vw] w-[92vw] mr-2' : ''}`} align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(d) => d && field.onChange(d)}
                              modifiers={{
                                available: (date) => availableDatesSet.has(formatDateForComparison(date))
                              }}
                              modifiersClassNames={{
                                available: "relative after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-[2px] after:h-1.5 after:w-1.5 after:rounded-full after:bg-primary"
                              }}
                              classNames={{
                                day_selected:
                                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                              }}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const max = addDays(today, 30);
                                return date < today || date > max;
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={availableTimeSlots.length === 0 || !selectedStaffId || !selectedServiceId}>
                          <FormControl>
                            <SelectTrigger className={isMobileView ? 'min-h-[36px] h-9 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600' : 'min-h-[44px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'}>
                              <SelectValue placeholder={(!selectedStaffId || !selectedServiceId) ? "Select service and staff first" : (availableTimeSlots.length === 0 ? "No available times" : "Select a time")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                            {availableTimeSlots.map((slot) => (
                              <SelectItem key={slot.value} value={slot.value}>
                                {slot.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Service summary */}
                {selectedService && (
                  <Card className="mt-4">
                    <CardContent className="pt-6">
                      <h4 className="font-medium mb-2">Booking Summary</h4>
                      <p className="text-sm"><strong>Service:</strong> {selectedService.name}</p>
                      <p className="text-sm"><strong>Duration:</strong> {formatDuration(selectedService.duration)}</p>
                      <p className="text-sm"><strong>Price:</strong> {formatPrice(selectedService.price)}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            
            {/* Step 5: Customer Details */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Your Details</h3>
                
                {/* Show appointment history if existing client found */}
                {existingClient && clientAppointmentHistory.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Welcome back, {existingClient.firstName}! 
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                      We found your account with {clientAppointmentHistory.length} previous appointment{clientAppointmentHistory.length !== 1 ? 's' : ''}.
                    </p>
                    <div className="space-y-2">
                      {clientAppointmentHistory.slice(0, 3).map((appointment) => (
                        <div key={appointment.id} className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/50 p-2 rounded">
                          <span className="font-medium">
                            {new Date(appointment.startTime).toLocaleDateString()} at {new Date(appointment.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          {appointment.service && (
                            <span className="ml-2">- {appointment.service.name}</span>
                          )}
                        </div>
                      ))}
                      {clientAppointmentHistory.length > 3 && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 italic">
                          ...and {clientAppointmentHistory.length - 3} more appointment{clientAppointmentHistory.length - 3 !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input className="text-foreground placeholder:text-muted-foreground" placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input className="text-foreground placeholder:text-muted-foreground" placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            className="text-foreground placeholder:text-muted-foreground"
                            type="text" 
                            placeholder="Enter email address" 
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            data-lpignore="true"
                            data-form-type="other"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input className="text-foreground placeholder:text-muted-foreground" placeholder="(123) 456-7890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          className="text-foreground placeholder:text-muted-foreground"
                          placeholder="Any special requests or information for your appointment..."
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Booking summary */}
                {selectedService && (
                  <Card className="mt-4">
                    <CardContent className="pt-6">
                      <h4 className="font-medium mb-2">Booking Summary</h4>
                      <p className="text-sm"><strong>Service:</strong> {selectedService.name}</p>
                      <p className="text-sm"><strong>Date:</strong> {format(form.watch('date'), "PPP")}</p>
                      <p className="text-sm"><strong>Time:</strong> {
                        timeSlots.find(slot => slot.value === form.watch('time'))?.label || form.watch('time')
                      }</p>
                      <p className="text-sm"><strong>Price:</strong> {formatPrice(selectedService.price)}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            
            {/* Step 6: Save Card */}
            {currentStep === saveCardStepIndex && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Save Payment Method</h3>
                
                {/* Booking summary */}
                {selectedService && (
                  <Card>
                    <CardContent className="pt-6">
                      <h4 className="font-medium mb-3">Booking Summary</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Service:</span>
                          <span className="font-medium">{selectedService.name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Date:</span>
                          <span className="font-medium">{format(form.watch('date'), "PPP")}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Time:</span>
                          <span className="font-medium">
                            {timeSlots.find(slot => slot.value === form.watch('time'))?.label || form.watch('time')}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                          <span className="font-medium">{formatDuration(selectedService.duration)}</span>
                        </div>
                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="font-medium">Service Price:</span>
                            <span className="font-bold text-lg">{formatPrice(selectedService.price)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>No payment required now!</strong> We'll securely save your card on file for easy checkout after your appointment. You will only be charged after your service is completed.
                  </p>
                </div>
                
                {savedCardInfo ? (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Card saved: {savedCardInfo.brand || savedCardInfo.cardBrand || 'Card'} ending in {savedCardInfo.last4 || savedCardInfo.cardLast4 || '****'}
                    </p>
                  </div>
                ) : (
                  <Card className="border-2 border-primary/50 shadow-lg">
                    <CardContent className="pt-6">
                      <div className="text-center space-y-4">
                        <CreditCard className="h-16 w-16 text-primary mx-auto" />
                        <div className="space-y-2">
                          <p className="text-lg font-medium text-foreground">
                            Final Step: Add Your Payment Method
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Your card will be saved securely and charged after your service
                          </p>
                        </div>
                        <Button
                          onClick={handleSubmit}
                          disabled={isProcessingBooking}
                          size="lg"
                          className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
                        >
                          {isProcessingBooking ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CreditCard className="mr-2 h-5 w-5" />
                              Add Payment Method & Complete Booking
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {bookingConfirmed && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">Booking Confirmed</h4>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Your appointment has been booked and your card has been saved securely.
                    </p>
                    {selectedService && (
                      <div className="mt-2 text-sm text-green-800 dark:text-green-200">
                        <div><strong>Service:</strong> {selectedService.name}</div>
                        <div><strong>Date:</strong> {format(form.watch('date'), "PPP")}</div>
                        <div><strong>Time:</strong> {timeSlots.find(slot => slot.value === form.watch('time'))?.label || form.watch('time')}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </form>
        </Form>
        
        <DialogFooter className={`flex justify-between mt-4 ${isMobileView ? 'flex-wrap gap-2' : ''}`}>
          {/* Hide buttons on step 6 (Save Card step) */}
          {currentStep !== saveCardStepIndex && (
            <>
              {currentStep > 0 ? (
                <Button type="button" variant="outline" className={`${isMobileView ? 'h-10 px-4 text-base w-auto' : ''} border-foreground text-foreground bg-transparent hover:bg-transparent`} onClick={prevStep}>
                  Back
                </Button>
              ) : (
                <Button type="button" variant="outline" className={`${isMobileView ? 'h-10 px-4 text-base w-auto' : ''} border-foreground text-foreground bg-transparent hover:bg-transparent`} onClick={closeAndReset}>
                  Cancel
                </Button>
              )}
              
              {currentStep < saveCardStepIndex && (
                <Button type="button" variant="outline" className={`${isMobileView ? 'h-10 px-4 text-base w-auto' : ''} border-foreground text-foreground bg-transparent hover:bg-transparent`} onClick={nextStep}>
                  Next
                </Button>
              )}
            </>
          )}
        </DialogFooter>
        {/* Mobile width constraint wrapper end */}
        </div>
      </DialogContent>
      
      {/* Save Card Modal */}
      {showSaveCardModal && (
        <SaveCardModal
          open={showSaveCardModal}
          onOpenChange={setShowSaveCardModal}
          clientId={userId || createdClientId || 0}
          appointmentId={null}  // Don't pass appointment ID since we haven't created it yet
          customerEmail={bookingData?.email}
          customerName={bookingData ? `${bookingData.firstName} ${bookingData.lastName}` : ''}
          onSaved={async (paymentMethod) => {
            setSavedCardInfo(paymentMethod);
            setShowSaveCardModal(false);
            
            // Save confirmation data first
            const confirmData = {
              service: selectedService,
              date: bookingData?.date,
              time: bookingData?.time,
              timeLabel: timeSlots.find(slot => slot.value === bookingData?.time)?.label || bookingData?.time
            };
            setConfirmationData(confirmData);
            
            // NOW create the appointment after card is successfully saved
            try {
              if (bookingData) {
                const appointment = await createAppointmentAfterPayment(bookingData);
                setCreatedAppointmentId(appointment.id);
                setBookingConfirmed(true);
              }
            } catch (appointmentError: any) {
              toast({
                title: "Partial Success",
                description: "Card saved but appointment creation failed. Please contact support.",
                variant: "destructive",
              });
            } finally {
              // Always show confirmation popup regardless of appointment creation success
              setIsProcessingBooking(false);
              onOpenChange(false);
              
              // Show confirmation popup after a delay
              setTimeout(() => {
                setShowConfirmation(true);
                
                // Show appropriate toast
                if (bookingConfirmed || createdAppointmentId) {
                  toast({
                    title: "Success! 🎉",
                    description: "Your appointment has been booked successfully!",
                  });
                }
              }, 500);
            }
          }}
        />
      )}
    </Dialog>
    
    {/* Appointment Confirmed Popup - Outside main dialog */}
    {showConfirmation ? (
      <div 
        style={{ 
          position: 'fixed', 
          top: '0px', 
          left: '0px', 
          right: '0px', 
          bottom: '0px', 
          zIndex: 999999, 
          backgroundColor: 'rgba(0, 0, 0, 0.8)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          pointerEvents: 'auto'
        }}
      >
        <div 
          style={{ 
            backgroundColor: 'white', 
            padding: '40px', 
            borderRadius: '12px', 
            maxWidth: '500px', 
            width: '90%', 
            color: 'black',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
            Appointment Confirmed! 🎉
          </h2>
          <p style={{ marginBottom: '20px', textAlign: 'center' }}>
            Your appointment has been successfully booked!
          </p>
          {confirmationData && confirmationData.service && (
            <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ marginBottom: '10px' }}><strong>Service:</strong> {confirmationData.service.name}</div>
              <div style={{ marginBottom: '10px' }}><strong>Date:</strong> {confirmationData.date ? format(confirmationData.date, "PPP") : ""}</div>
              <div style={{ marginBottom: '10px' }}><strong>Time:</strong> {confirmationData.timeLabel}</div>
              <div style={{ marginBottom: '10px' }}><strong>Duration:</strong> {formatDuration(confirmationData.service.duration)}</div>
              <div><strong>Price:</strong> {formatPrice(confirmationData.service.price)}</div>
            </div>
          )}
          <p style={{ marginBottom: '20px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
            You will receive a confirmation email with your appointment details.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <button
              onClick={() => {
                closeAndReset();
              }}
              style={{ 
                width: '100%', 
                padding: '12px', 
                backgroundColor: '#000', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                fontSize: '16px', 
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Book Another Appointment
            </button>
            <button
              onClick={() => {
                // Reset everything and close completely
                form.reset();
                setCurrentStep(0);
                setSearchQuery("");
                setSelectedCategoryId(null);
                setIsProcessingBooking(false);
                setBookingData(null);
                setSavedCardInfo(null);
                setCreatedClientId(null);
                setCreatedAppointmentId(null);
                setBookingConfirmed(false);
                setExistingClient(null);
                setClientAppointmentHistory([]);
                setShowConfirmation(false);
                setConfirmationData(null);
                onOpenChange(false);
              }}
              style={{ 
                width: '100%', 
                padding: '12px', 
                backgroundColor: 'transparent', 
                color: '#000', 
                border: '1px solid #ccc', 
                borderRadius: '6px', 
                fontSize: '16px', 
                cursor: 'pointer' 
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
};

export default BookingWidget;
