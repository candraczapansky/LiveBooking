import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, Clock, Search, MapPin, Loader2 } from "lucide-react";
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
  email: z.string(),
  phone: z.string().min(1, "Phone number is required"),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

const steps = ["Location", "Service", "Staff", "Time", "Details"];

const BookingWidget = ({ open, onOpenChange, userId }: BookingWidgetProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

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
    enabled: open
  });

  const selectedLocationId = form.watch('locationId');

  // We no longer use the generic services list for rendering to avoid leaks
  useQuery({
    queryKey: ['/api/services', selectedCategoryId, selectedLocationId],
    queryFn: async () => {
      const params: string[] = [];
      if (selectedCategoryId) params.push(`categoryId=${selectedCategoryId}`);
      if (selectedLocationId) params.push(`locationId=${selectedLocationId}`);
      const endpoint = params.length > 0 ? `/api/services?${params.join('&')}` : '/api/services';
      const res = await apiRequest('GET', endpoint);
      // Fetch kept for potential price/description refresh, but UI renders from allowedServices
      return res.json();
    },
    enabled: open && !!selectedLocationId
  });

  const { data: staff, isLoading: isLoadingStaff } = useQuery({
    queryKey: ['/api/staff', selectedLocationId],
    queryFn: async () => {
      // Fetch all staff; we'll filter by schedules and service assignments client-side
      const res = await apiRequest('GET', '/api/staff');
      return res.json();
    },
    enabled: open && !!selectedLocationId
  });

  // Fetch schedules for the selected location to detect which staff actually work there
  const { data: schedules, isLoading: isLoadingSchedules } = useQuery({
    queryKey: ['/api/schedules', selectedLocationId],
    queryFn: async () => {
      const endpoint = selectedLocationId ? `/api/schedules?locationId=${selectedLocationId}` : '/api/schedules';
      const res = await apiRequest('GET', endpoint);
      return res.json();
    },
    enabled: open && !!selectedLocationId
  });

  // Fetch appointments for the selected location to prevent double-booking
  const { data: appointments = [] } = useQuery({
    queryKey: ['/api/appointments', selectedLocationId],
    queryFn: async () => {
      const endpoint = selectedLocationId ? `/api/appointments?locationId=${selectedLocationId}` : '/api/appointments';
      const res = await apiRequest('GET', endpoint);
      return res.json();
    },
    enabled: open && !!selectedLocationId
  });

  // Compute allowed services based on staff assignments at the selected location
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [allowedServices, setAllowedServices] = useState<any[]>([]);
  // Map of staffId -> set of serviceIds they are assigned (public)
  const [staffServiceIdsMap, setStaffServiceIdsMap] = useState<Map<number, Set<number>>>(new Map());
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
          ? Array.from(new Set((schedules as any[]).map((sch: any) => sch.staffId)))
          : [];

        const staffIdsToUse: number[] = staffIdsFromSchedules.length > 0
          ? staffIdsFromSchedules
          : (Array.isArray(staff) ? (staff as any[]).map((s: any) => s.id) : []);

        if (staffIdsToUse.length === 0) {
          setAllowedServices([]);
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
        staffIdsToUse.forEach((sid, idx) => {
          const svcList = lists[idx] || [];
          const serviceIds = new Set<number>();
          svcList.forEach((svc: any) => {
            if (svc && typeof svc.id === 'number') serviceIds.add(svc.id);
          });
          map.set(sid, serviceIds);
        });
        if (!cancelled) {
          setAllowedServices(Array.from(uniqById.values()));
          setStaffServiceIdsMap(map);
          setIsLoadingServices(false);
        }
      } catch {
        if (!cancelled) {
          setAllowedServices([]);
          setStaffServiceIdsMap(new Map());
          setIsLoadingServices(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, selectedLocationId, staff, schedules]);

  const isPreparingServices = isLoadingCategories || isLoadingStaff || isLoadingSchedules || isLoadingServices;

  const { data: locations } = useQuery({
    queryKey: ['/api/locations'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/locations');
      return res.json();
    },
    enabled: open
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

  // Filter services by search query and allowed set (from staff assignments)
  const filteredServices = allowedServices?.filter((service: any) => {
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
    Array.isArray(schedules) ? (schedules as any[]).map((sch: any) => sch.staffId) : []
  );
  const useScheduleFilter = staffIdsFromSchedulesSet.size > 0;
  const availableStaff = Array.isArray(staff) && selectedServiceId
    ? (staff as any[]).filter((s: any) => {
        const matchesSchedule = useScheduleFilter ? staffIdsFromSchedulesSet.has(s.id) : true;
        const svcSet = staffServiceIdsMap.get(s.id);
        const svcIdNum = parseInt(selectedServiceId);
        const matchesService = svcSet ? svcSet.has(svcIdNum) : false;
        return matchesSchedule && matchesService;
      })
    : [];

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

  // Helpers for schedule filtering
  const getDayName = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };
  const formatDateForComparison = (date: Date) => date.toISOString().split('T')[0];
  const isTimeInRange = (timeSlot: string, startTime: string, endTime: string) => {
    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const slot = toMinutes(timeSlot);
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    return slot >= start && slot < end;
  };

  // Compute available time slots based on staff schedule and existing appointments
  const getAvailableTimeSlots = () => {
    if (!selectedStaffId || !selectedFormDate) return timeSlots;

    const dayName = getDayName(selectedFormDate);
    const staffSchedules = (Array.isArray(schedules) ? (schedules as any[]) : []).filter((schedule: any) => {
      const currentDateString = formatDateForComparison(selectedFormDate);
      const startDateString = typeof schedule.startDate === 'string' ? schedule.startDate : new Date(schedule.startDate).toISOString().slice(0, 10);
      const endDateString = schedule.endDate ? (typeof schedule.endDate === 'string' ? schedule.endDate : new Date(schedule.endDate).toISOString().slice(0, 10)) : null;

      return schedule.staffId === parseInt(selectedStaffId) &&
        schedule.dayOfWeek === dayName &&
        startDateString <= currentDateString &&
        (!endDateString || endDateString >= currentDateString) &&
        !schedule.isBlocked;
    });

    if (staffSchedules.length === 0) return [];

    const staffAppointments = (Array.isArray(appointments) ? (appointments as any[]) : [])
      .filter((apt: any) => apt.staffId === parseInt(selectedStaffId))
      .filter((apt: any) => new Date(apt.startTime).toDateString() === selectedFormDate.toDateString())
      .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const filtered = timeSlots.filter(slot => {
      const withinSchedule = staffSchedules.some((schedule: any) => isTimeInRange(slot.value, schedule.startTime, schedule.endTime));
      if (!withinSchedule) return false;

      const svc: any = selectedService;
      if (!svc) return true;

      const [hours, minutes] = slot.value.split(':').map(Number);
      const appointmentStart = new Date(selectedFormDate);
      appointmentStart.setHours(hours, minutes, 0, 0);
      const totalDuration = (svc.duration || 0) + (svc.bufferTimeBefore || 0) + (svc.bufferTimeAfter || 0);
      const appointmentEnd = new Date(appointmentStart.getTime() + totalDuration * 60000);

      for (const apt of staffAppointments) {
        const existingStart = new Date(apt.startTime);
        const existingEnd = new Date(apt.endTime);
        if (appointmentStart < existingEnd && appointmentEnd > existingStart) {
          return false;
        }
      }
      return true;
    });

    return filtered;
  };

  const availableTimeSlots = useMemo(getAvailableTimeSlots, [selectedStaffId, selectedFormDate, selectedServiceId, schedules, appointments, timeSlots]);

  // Compute available days (next 30 days) based on staff schedules, service duration and existing appointments
  const availableDatesSet = useMemo(() => {
    const result = new Set<string>();
    try {
      if (!selectedStaffId || !selectedServiceId) return result;

      const staffIdNum = parseInt(selectedStaffId);
      const svc: any = selectedService;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const max = addDays(today, 30);

      const staffSchedules = (Array.isArray(schedules) ? (schedules as any[]) : [])
        .filter((schedule: any) => schedule.staffId === staffIdNum && !schedule.isBlocked);

      if (staffSchedules.length === 0) return result;

      const staffAppointments = (Array.isArray(appointments) ? (appointments as any[]) : [])
        .filter((apt: any) => apt.staffId === staffIdNum);

      for (let d = new Date(today); d <= max; d.setDate(d.getDate() + 1)) {
        const day = new Date(d);
        const dayName = getDayName(day);
        const currentDateString = formatDateForComparison(day);

        const schedulesForDay = staffSchedules.filter((schedule: any) => {
          const startDateString = typeof schedule.startDate === 'string' ? schedule.startDate : new Date(schedule.startDate).toISOString().slice(0, 10);
          const endDateString = schedule.endDate ? (typeof schedule.endDate === 'string' ? schedule.endDate : new Date(schedule.endDate).toISOString().slice(0, 10)) : null;
          return schedule.dayOfWeek === dayName &&
            startDateString <= currentDateString &&
            (!endDateString || endDateString >= currentDateString);
        });

        if (schedulesForDay.length === 0) continue;

        const appointmentsForDay = staffAppointments
          .filter((apt: any) => new Date(apt.startTime).toDateString() === day.toDateString())
          .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        let dayHasAvailability = false;
        for (const slot of timeSlots) {
          const withinSchedule = schedulesForDay.some((schedule: any) => isTimeInRange(slot.value, schedule.startTime, schedule.endTime));
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

          if (!overlaps) {
            result.add(currentDateString);
            dayHasAvailability = true;
            break;
          }
        }

        if (!dayHasAvailability) {
          // no-op; keep day without marker
        }
      }
    } catch {
      // swallow errors; show no markers on failure
    }
    return result;
  }, [selectedStaffId, selectedServiceId, schedules, appointments, timeSlots, selectedService]);

  // Clear time if it becomes invalid when dependencies change
  useEffect(() => {
    const current = form.getValues('time');
    if (current && !availableTimeSlots.some(slot => slot.value === current)) {
      form.setValue('time', '');
    }
  }, [availableTimeSlots]);

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
    ];

    const currentFields = fields[currentStep];
    
    // Validate just the fields for the current step
    form.trigger(currentFields as any[]).then((isValid) => {
      if (isValid) {
        setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
      }
    });
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (values: BookingFormValues) => {
    try {
      // In a real app, this would create a new appointment
      const date = new Date(values.date);
      const [hours, minutes] = values.time.split(':').map(Number);
      date.setHours(hours, minutes);
      
      const endTime = new Date(date);
      if (selectedService) {
        endTime.setMinutes(endTime.getMinutes() + selectedService.duration);
      }
      
      const appointmentData = {
        clientId: userId || 1, // Use the logged-in user or default to 1 for demo
        serviceId: parseInt(values.serviceId),
        staffId: parseInt(values.staffId),
        startTime: date.toISOString(),
        endTime: endTime.toISOString(),
        status: "pending",
        notes: values.notes
      };
      
      await apiRequest("POST", "/api/appointments", appointmentData);
      
      toast({
        title: "Booking Successful",
        description: "Your appointment has been booked. You will receive a confirmation shortly.",
      });
      
      // Reset and close
      form.reset();
      setCurrentStep(0);
      onOpenChange(false);
      
    } catch (error: any) {
      toast({
        title: "Booking Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-auto sm:max-w-[800px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Book an Appointment</DialogTitle>
        </DialogHeader>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div 
                className={`rounded-full h-8 w-8 flex items-center justify-center ${
                  currentStep >= index 
                    ? "bg-primary text-white" 
                    : "border-2 border-gray-300 text-gray-500"
                }`}
              >
                {index + 1}
              </div>
              <div className="ml-2">
                <div className={`text-sm font-medium ${
                  currentStep >= index 
                    ? "text-gray-900 dark:text-gray-100" 
                    : "text-gray-500 dark:text-gray-400"
                }`}>
                  {step}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden sm:block w-8 h-0.5 ml-2 mr-2 bg-gray-200 dark:bg-gray-700"></div>
              )}
            </div>
          ))}
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
            {/* Step 1: Location Selection */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Select a Location</h3>
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
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a location" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations?.map((loc: any) => (
                              <SelectItem key={loc.id} value={String(loc.id)}>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  <span>{loc.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 2: Service Selection */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Select a Service</h3>
                  {selectedCategoryId && (
                    <div className="relative">
                      <Input 
                        type="text" 
                        placeholder="Search services..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-4 py-2 text-sm"
                      />
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>

                {isPreparingServices && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading available services…</span>
                  </div>
                )}
                
                {/* Service Categories */}
                <div className="flex overflow-x-auto space-x-2 py-2">
                  {isPreparingServices ? (
                    <>
                      <Skeleton className="h-8 w-20 rounded-full" />
                      <Skeleton className="h-8 w-24 rounded-full" />
                      <Skeleton className="h-8 w-16 rounded-full" />
                      <Skeleton className="h-8 w-28 rounded-full" />
                    </>
                  ) : (
                    categories?.filter((category: Category) => {
                      if (!selectedLocationId) return true;
                      // Show category only if at least one allowed service belongs to it
                      if (!allowedServices || allowedServices.length === 0) return false;
                      return allowedServices.some((svc: any) => svc.categoryId === category.id);
                    }).map((category: Category) => (
                      <Button
                        key={category.id}
                        type="button"
                        variant={selectedCategoryId === category.id.toString() ? "default" : "outline"}
                        size="sm"
                        className="rounded-full whitespace-nowrap"
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
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">{service.name}</h4>
                                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{service.description}</p>
                                          <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                                            <Clock className="h-4 w-4 mr-1" /> {formatDuration(service.duration)}
                                          </div>
                                        </div>
                                        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
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
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Select Staff Member</h3>
                
                <FormField
                  control={form.control}
                  name="staffId"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormControl>
                        <div className="grid grid-cols-1 gap-4">
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
                                      {staffMember.user ? `${staffMember.user.firstName || ""} ${staffMember.user.lastName || ""}`.trim() : "Unknown Staff"}
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
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Select Date & Time</h3>
                
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
                                className="w-full pl-3 text-left font-normal min-h-[44px] justify-start"
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
                          <PopoverContent className="w-auto p-0 z-[90]" align="start">
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
                            <SelectTrigger className="min-h-[44px]">
                              <SelectValue placeholder={(!selectedStaffId || !selectedServiceId) ? "Select service and staff first" : (availableTimeSlots.length === 0 ? "No available times" : "Select a time")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Your Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
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
                          <Input placeholder="Doe" {...field} />
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
                          <Input placeholder="(123) 456-7890" {...field} />
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
          </form>
        </Form>
        
        <DialogFooter className="flex justify-between mt-4">
          {currentStep > 0 ? (
            <Button type="button" variant="outline" onClick={prevStep}>
              Back
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          
          {currentStep < steps.length - 1 ? (
            <Button type="button" onClick={nextStep}>
              Next
            </Button>
          ) : (
            <Button type="button" onClick={form.handleSubmit(handleSubmit)}>
              Book Appointment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingWidget;
