import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMinutes } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "@/contexts/LocationContext";
import AppointmentCheckout from "./appointment-checkout";
import { ClientCreationDialog } from "./client-creation-dialog";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
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

import {
  Calendar,
  Clock,
  CreditCard,
  DollarSign,
  Loader2,
  Search,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import CheckoutWithTerminal from "@/components/payment/checkout-with-terminal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { NoteInput } from "@/components/ui/note-input";
import { cn, formatPrice } from "@/lib/utils";

// Define the form schema
const appointmentFormSchema = z.object({
  staffId: z.string().min(1, "Staff member is required"),
  serviceId: z.string().min(1, "Service is required"),
  clientId: z.string().min(1, "Client is required"),
  date: z.date({
    required_error: "Date is required",
  }),
  time: z.string().min(1, "Time is required"),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

interface AppointmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: number | null;
  onAppointmentCreated?: (appointment: any) => void;
  appointments: any[];
  selectedDate?: Date;
  selectedTime?: string;
}

const generateTimeSlots = () => {
  const slots = [];
  // Generate time slots from 8 AM to 10 PM
  for (let hour = 8; hour <= 22; hour++) {
    const hourFormatted = hour % 12 === 0 ? 12 : hour % 12;
    const period = hour < 12 ? "AM" : "PM";
    
    // Add slots every 30 minutes
    for (let minute of [0, 30]) {
      const minuteFormatted = minute === 0 ? "00" : minute.toString();
      const label = `${hourFormatted}:${minuteFormatted} ${period}`;
      const value = `${hour.toString().padStart(2, '0')}:${minuteFormatted}`;
      
      slots.push({ label, value });
    }
  }
  
  return slots;
};

const allTimeSlots = generateTimeSlots();

// Helper functions for schedule filtering
const getDayName = (date: Date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

const formatDateForComparison = (date: Date) => {
  return date.toISOString().split('T')[0];
};

const isTimeInRange = (timeSlot: string, startTime: string, endTime: string) => {
  // Convert time strings to minutes for comparison
  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const slotMinutes = timeToMinutes(timeSlot);
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  return slotMinutes >= startMinutes && slotMinutes < endMinutes;
};



const AppointmentForm = ({ open, onOpenChange, appointmentId, selectedDate, selectedTime, onAppointmentCreated, appointments }: AppointmentFormProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [clientSearchValue, setClientSearchValue] = useState("");
  const [showClientCreationDialog, setShowClientCreationDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedLocation } = useLocation();
  const [debouncedClientSearch, setDebouncedClientSearch] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedClientSearch(clientSearchValue.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [clientSearchValue]);
  
  // Form setup
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      staffId: "",
      serviceId: "",
      clientId: "",
      date: selectedDate || new Date(),
      time: "10:00",
      notes: "",
    },
  });
  
  // Watch selected staff to filter services and time slots
  const selectedStaffId = form.watch("staffId");
  const selectedFormDate = form.watch("date");
  
  // Get services for selected staff (staff-centric workflow)
  const { data: services = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ['/api/staff', selectedStaffId, 'services'],
    queryFn: async () => {
      if (!selectedStaffId) return [];
      const response = await apiRequest("GET", `/api/staff/${selectedStaffId}/services`);
      const data = await response.json();
      console.log('Loaded services for staff', selectedStaffId, ':', data);
      // The backend returns service data directly, no need to extract
      return data;
    },
    enabled: open && !!selectedStaffId,
  });

  // Fetch staff schedules for time slot filtering
  const { data: schedules = [] } = useQuery({
    queryKey: ['/api/schedules', selectedLocation?.id],
    queryFn: async () => {
      const url = selectedLocation?.id ? `/api/schedules?locationId=${selectedLocation.id}` : "/api/schedules";
      const response = await apiRequest("GET", url);
      return response.json();
    },
    enabled: open,
  });

  // Get staff
  const { data: staff, isLoading: isLoadingStaff } = useQuery({
    queryKey: ['/api/staff', selectedLocation?.id],
    queryFn: async () => {
      const url = selectedLocation?.id ? `/api/staff?locationId=${selectedLocation.id}` : "/api/staff";
      const response = await apiRequest("GET", url);
      return response.json();
    },
    enabled: open
  });
  
  // Get clients
  const { data: clients, isLoading: isLoadingClients, refetch: refetchClients } = useQuery({
    queryKey: ['/api/users?role=client', debouncedClientSearch],
    queryFn: async () => {
      const searchParam = debouncedClientSearch ? `&search=${encodeURIComponent(debouncedClientSearch)}` : '';
      const response = await apiRequest("GET", `/api/users?role=client${searchParam}`);
      const data = await response.json();
      console.log('📋 Fetched clients:', {
        count: data?.length,
        searchTerm: debouncedClientSearch,
        firstClient: data?.[0],
        sampleClients: data?.slice(0, 3)
      });
      return data;
    },
    enabled: open && (debouncedClientSearch.length >= 2 || !!appointmentId),
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true // Refetch when window gains focus
  });
  
  // Get single appointment if editing
  const { data: appointment, isLoading: isLoadingAppointment } = useQuery({
    queryKey: ['/api/appointments', appointmentId],
    queryFn: async () => {
      if (!appointmentId || appointmentId < 0) return null;
      const response = await apiRequest("GET", `/api/appointments/${appointmentId}`);
      return response.json();
    },
    enabled: open && !!appointmentId && appointmentId > 0
  });

  // Computed values
  const selectedServiceId = form.watch("serviceId");
  const startTimeString = form.watch("time");
  
  const selectedService = services?.find((s: any) => s.id.toString() === selectedServiceId);



  // Filter available time slots based on staff schedule and existing appointments
  // getAvailableTimeSlots: Returns only time slots that are within the staff member's working hours and do not conflict with existing appointments (including buffer times). Shows no slots if staff is not available that day.
  const getAvailableTimeSlots = () => {
    if (!selectedStaffId || !selectedFormDate) {
      return allTimeSlots;
    }

    // Debug: Log the appointments prop, selectedStaffId, and selectedFormDate


    const dayName = getDayName(selectedFormDate);
    const currentDate = formatDateForComparison(selectedFormDate);

    const staffSchedules = (schedules as any[]).filter((schedule: any) => {
      // Fix date comparison logic
      const currentDateString = formatDateForComparison(selectedFormDate);
      const startDateString = typeof schedule.startDate === 'string' 
        ? schedule.startDate 
        : new Date(schedule.startDate).toISOString().slice(0, 10);
      const endDateString = schedule.endDate 
        ? (typeof schedule.endDate === 'string' 
          ? schedule.endDate 
          : new Date(schedule.endDate).toISOString().slice(0, 10))
        : null;
      
      return schedule.staffId === parseInt(selectedStaffId) && 
        schedule.dayOfWeek === dayName &&
        startDateString <= currentDateString &&
        (!endDateString || endDateString >= currentDateString) &&
        !schedule.isBlocked;
    });

    if (staffSchedules.length === 0) {
      return [];
    }

    // Only show slots that are within schedule and do not overlap with any existing appointment
    // Pre-compute staff appointments for selected day to reduce per-slot work
    const staffAppointments = (appointments as any[] || [])
      .filter((appointment: any) => appointment.staffId === parseInt(selectedStaffId))
      .filter((appointment: any) => {
        const aptDate = new Date(appointment.startTime);
        return aptDate.toDateString() === selectedFormDate.toDateString();
      })
      .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const filteredSlots = allTimeSlots.filter(slot => {
      // Check if time is within staff schedule
      const isWithinSchedule = staffSchedules.some((schedule: any) => 
        isTimeInRange(slot.value, schedule.startTime, schedule.endTime)
      );
      if (!isWithinSchedule) return false;

      if (!selectedService) return true; // If no service selected, allow the slot

      // Calculate the start and end time for this slot
      const [hours, minutes] = slot.value.split(':').map(Number);
      const appointmentStart = new Date(selectedFormDate);
      appointmentStart.setHours(hours, minutes, 0, 0);
      const totalDuration = selectedService.duration + 
                           (selectedService.bufferTimeBefore || 0) + 
                           (selectedService.bufferTimeAfter || 0);
      const appointmentEnd = new Date(appointmentStart.getTime() + totalDuration * 60000);

      /* staffAppointments precomputed above */

      // Check if this slot fits between existing appointments
      for (let i = 0; i < staffAppointments.length; i++) {
        const apt = staffAppointments[i];
        if (appointmentId && apt.id === appointmentId) continue; // skip self when editing
        const existingStart = new Date(apt.startTime);
        const existingEnd = new Date(apt.endTime);
        // If the new appointment overlaps with any existing one, exclude it
        if (appointmentStart < existingEnd && appointmentEnd > existingStart) {
          return false;
        }
      }
      return true;
    });
    return filteredSlots;
  };

  const availableTimeSlots = useMemo(getAvailableTimeSlots, [selectedStaffId, selectedFormDate, selectedServiceId, schedules, appointments, appointmentId]);
  
  const endTime = selectedService && startTimeString ? (() => {
    const [hours, minutes] = startTimeString.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    // Calculate total duration including buffer times
    const totalDuration = selectedService.duration + 
                         (selectedService.bufferTimeBefore || 0) + 
                         (selectedService.bufferTimeAfter || 0);
    
    const endDate = addMinutes(startDate, totalDuration);
    return format(endDate, 'h:mm a');
  })() : null;
  
  // Load appointment data when editing
  useEffect(() => {
    if (appointment && appointmentId && appointmentId > 0) {
      // Parse the ISO string to get the correct time
      const isoString = appointment.startTime;
      
      // Extract the time directly from the ISO string (ignoring timezone conversion)
      // Example: "2025-07-05T14:30:00.000Z" -> extract "14:30"
      const timeMatch = isoString.match(/T(\d{2}):(\d{2})/);
      const appointmentTime = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '10:00';
      
      // Create date object for the date part
      const utcDate = new Date(isoString);
      const appointmentDate = new Date(utcDate.getFullYear(), utcDate.getMonth(), utcDate.getDate());
      

      
      console.log('Resetting form with appointment data:', {
        staffId: appointment.staffId?.toString(),
        serviceId: appointment.serviceId?.toString(), 
        clientId: appointment.clientId?.toString(),
        originalAppointment: appointment
      });

      form.reset({
        staffId: appointment.staffId?.toString() || "",
        serviceId: appointment.serviceId?.toString() || "",
        clientId: appointment.clientId?.toString() || "",
        date: appointmentDate,
        time: appointmentTime,
        notes: appointment.notes || "",
      });
      
      // Set client search value to the selected client's name for editing
      const selectedClient = clients?.find((client: any) => client.id.toString() === appointment.clientId?.toString());
      if (selectedClient) {
        setClientSearchValue(`${selectedClient.firstName} ${selectedClient.lastName}`);
      } else {
        setClientSearchValue("");
      }
      

    }
  }, [appointment, appointmentId]);

  // Force refresh client data when dialog opens
  useEffect(() => {
    if (open && (debouncedClientSearch.length >= 2 || !!appointmentId)) {
      console.log("Appointment form opened - fetching client data for current context");
      refetchClients();
    }
  }, [open, debouncedClientSearch, appointmentId, refetchClients]);

  // Debug clients data whenever it changes
  useEffect(() => {
    if (clients) {
      console.log("Clients data updated in appointment form:", clients.length, "clients");
    }
  }, [clients]);

  // Reset form when closing and invalidate cache when opening
  useEffect(() => {
    if (!open) {
      form.reset({
        staffId: "",
        serviceId: "",
        clientId: "",
        date: selectedDate || new Date(),
        time: "10:00",
        notes: "",
      });
      // Reset client search value when closing
      setClientSearchValue("");
    } else if (!appointmentId) {
      // Only reset with defaults for new appointments, not when editing existing ones
      const resetDate = selectedDate || new Date();
      console.log('Resetting form with date:', resetDate);
      form.reset({
        staffId: "",
        serviceId: "",
        clientId: "",
        date: resetDate,
        time: "10:00",
        notes: "",
      });
      // Reset client search value for new appointments
      setClientSearchValue("");
      // Force the date field to update and clear any validation errors
      form.setValue('date', resetDate);
      form.clearErrors('date');
      form.trigger('date');
      // Invalidate services cache when opening to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
    } else {
      // Just invalidate cache for existing appointments (form will be populated by appointment data)
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
    }
  }, [open, selectedDate, queryClient, appointmentId]);

  // Update time when selectedTime prop changes
  useEffect(() => {
    if (open && selectedTime && !appointmentId) {
      // Only update time for new appointments, not when editing existing ones
      form.setValue('time', selectedTime);
    }
  }, [selectedTime, open, appointmentId]);

  // Update date when selectedDate prop changes
  useEffect(() => {
    if (open && selectedDate && !appointmentId) {
      console.log('Setting date from selectedDate prop:', selectedDate);
      form.setValue('date', selectedDate);
      // Clear any existing date validation errors
      form.clearErrors('date');
      // Trigger validation for the date field specifically
      form.trigger('date');
    }
  }, [selectedDate, open, appointmentId]);

  // Clear time when staff changes or when no slots are available (for new appointments only)
  useEffect(() => {
    // Don't clear time when editing existing appointments - let the user edit the time freely
    if (!appointmentId) {
      const currentTime = form.getValues('time');
      const availableSlots = getAvailableTimeSlots();
      
      // If the current time is not in available slots, clear it
      if (currentTime && !availableSlots.some(slot => slot.value === currentTime)) {
        form.setValue('time', '');
      }
    }
  }, [selectedStaffId, selectedFormDate, appointmentId]);

  const createMutation = useMutation({
    mutationFn: async (values: AppointmentFormValues) => {
      // Validate that time is selected
      if (!values.time || values.time.trim() === '') {
        throw new Error('Please select a time for the appointment');
      }
      
      const [hours, minutes] = values.time.split(':').map(Number);
      
      // Create the date in local timezone
      const year = values.date.getFullYear();
      const month = values.date.getMonth();
      const day = values.date.getDate();
      
      // Create appointment time in local time
      const localDate = new Date(year, month, day, hours, minutes, 0, 0);
      
      // Format as local time string for database storage (YYYY-MM-DD HH:MM:SS)
      // This avoids timezone conversion issues by sending local time directly
      const formatLocalDateTime = (date: Date) => {
        return date.getFullYear() + '-' + 
               String(date.getMonth() + 1).padStart(2, '0') + '-' + 
               String(date.getDate()).padStart(2, '0') + ' ' +
               String(date.getHours()).padStart(2, '0') + ':' +
               String(date.getMinutes()).padStart(2, '0') + ':' +
               String(date.getSeconds()).padStart(2, '0');
      };

      const selectedServiceData = services?.find((s: any) => s.id.toString() === values.serviceId);
      
      // Calculate total duration including buffer times
      const totalDuration = (selectedServiceData?.duration || 60) + 
                           (selectedServiceData?.bufferTimeBefore || 0) + 
                           (selectedServiceData?.bufferTimeAfter || 0);
      
      const endTime = addMinutes(localDate, totalDuration);

      console.log('Creating appointment with local timezone:', {
        selectedTime: values.time,
        localDate: localDate,
        localDateString: formatLocalDateTime(localDate),
        endTimeString: formatLocalDateTime(endTime),
        locationId: selectedLocation?.id
      });

      const appointmentData = {
        serviceId: parseInt(values.serviceId),
        staffId: parseInt(values.staffId),
        clientId: parseInt(values.clientId),
        locationId: selectedLocation?.id || null,
        startTime: localDate.toISOString(),
        endTime: endTime.toISOString(),
        status: "confirmed",
        notes: values.notes || null,
      };

      return apiRequest("POST", "/api/appointments", appointmentData);
    },
    onSuccess: (data: any) => {
      // Force refresh of appointments data with multiple cache invalidation strategies
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/active'] });
      
      // Invalidate location-specific queries
      if (selectedLocation?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/appointments', selectedLocation.id] });
      }
      
      // Force refetch to ensure latest data is loaded
      queryClient.refetchQueries({ queryKey: ['/api/appointments'] });
      
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Appointment created successfully.",
      });
      // Call the callback with appointment data if provided
      console.log("[APPOINTMENT FORM] Success callback - appointment data:", data);
      if (onAppointmentCreated) {
        console.log("[APPOINTMENT FORM] Calling onAppointmentCreated with:", data);
        onAppointmentCreated(data);
      } else {
        console.log("[APPOINTMENT FORM] No onAppointmentCreated callback provided");
      }
    },
    onError: (error: any) => {
      const isConflict = error.response?.status === 409;
      const errorData = error.response?.data;
      
      // Try different possible error message fields
      const errorMessage = errorData?.message || errorData?.error || error.message || "Failed to create appointment.";
      
      console.log('Appointment creation error:', { error, errorData, errorMessage, isConflict });
      
      // Force show toast - testing visibility
      toast({
        title: isConflict ? "⚠️ Scheduling Conflict" : "❌ Error",
        description: errorMessage,
        variant: "destructive",
        duration: isConflict ? 10000 : 5000, // Show conflict messages even longer
      });
      
      // Also try alert as backup to confirm the error is being triggered
      if (isConflict) {
        setTimeout(() => {
          alert(`CONFLICT DETECTED: ${errorMessage}`);
        }, 100);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: AppointmentFormValues) => {
      console.log('Update mutation function called with:', values);
      console.log('Current appointmentId:', appointmentId);
      
      if (!appointmentId || appointmentId <= 0) {
        throw new Error("No appointment ID provided");
      }

      // Validate that time is selected
      if (!values.time || values.time.trim() === '') {
        throw new Error('Please select a time for the appointment');
      }

      const [hours, minutes] = values.time.split(':').map(Number);
      
      // Create appointment time in local time
      const year = values.date.getFullYear();
      const month = values.date.getMonth();
      const day = values.date.getDate();
      
      const localDate = new Date(year, month, day, hours, minutes, 0, 0);
      
      // Format as local time string for database storage (YYYY-MM-DD HH:MM:SS)
      const formatLocalDateTime = (date: Date) => {
        return date.getFullYear() + '-' + 
               String(date.getMonth() + 1).padStart(2, '0') + '-' + 
               String(date.getDate()).padStart(2, '0') + ' ' +
               String(date.getHours()).padStart(2, '0') + ':' +
               String(date.getMinutes()).padStart(2, '0') + ':' +
               String(date.getSeconds()).padStart(2, '0');
      };

      const selectedServiceData = services?.find((s: any) => s.id.toString() === values.serviceId);
      
      // Calculate total duration including buffer times
      const totalDuration = (selectedServiceData?.duration || 60) + 
                           (selectedServiceData?.bufferTimeBefore || 0) + 
                           (selectedServiceData?.bufferTimeAfter || 0);
      
      const endTime = addMinutes(localDate, totalDuration);

      console.log('Updating appointment with local timezone:', {
        selectedTime: values.time,
        localDate: localDate,
        localDateString: formatLocalDateTime(localDate),
        endTimeString: formatLocalDateTime(endTime),
        locationId: selectedLocation?.id
      });

      const appointmentData = {
        serviceId: parseInt(values.serviceId),
        staffId: parseInt(values.staffId),
        clientId: parseInt(values.clientId),
        locationId: selectedLocation?.id || null,
        startTime: localDate.toISOString(),
        endTime: endTime.toISOString(),
        status: "confirmed",
        notes: values.notes || null,
      };

      return apiRequest("PUT", `/api/appointments/${appointmentId}`, appointmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments', appointmentId] });
      
      // Invalidate location-specific queries
      if (selectedLocation?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/appointments', selectedLocation.id] });
      }
      
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Appointment updated successfully.",
      });
    },
    onError: (error: any) => {
      const isConflict = error.response?.status === 409;
      const errorData = error.response?.data;
      
      // Try different possible error message fields
      const errorMessage = errorData?.message || errorData?.error || error.message || "Failed to update appointment.";
      
      console.log('Appointment update error:', { error, errorData, errorMessage, isConflict });
      
      toast({
        title: isConflict ? "⚠️ Scheduling Conflict" : "❌ Error", 
        description: errorMessage,
        variant: "destructive",
        duration: isConflict ? 10000 : 5000, // Show conflict messages even longer
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!appointmentId || appointmentId <= 0) {
        throw new Error("No appointment ID provided");
      }
      return apiRequest("DELETE", `/api/appointments/${appointmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      
      // Invalidate location-specific queries
      if (selectedLocation?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/appointments', selectedLocation.id] });
      }
      
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Appointment deleted successfully.",
      });
    },
    onError: (error: any) => {
      // Don't show error if appointment was already deleted (404)
      if (!error.message?.includes("not found") && !error.message?.includes("404")) {
        toast({
          title: "Error",
          description: error.message || "Failed to delete appointment.",
          variant: "destructive",
        });
      }
    },
  });

  // Debug appointmentId changes
  useEffect(() => {
    console.log('AppointmentForm appointmentId changed:', appointmentId);
  }, [appointmentId]);

  const handleFormSubmit = (values: AppointmentFormValues) => {
    console.log('Form submitted with values:', values);
    console.log('Form validation errors:', form.formState.errors);
    console.log('ClientId in form values:', values.clientId);
    console.log('ClientId type:', typeof values.clientId);
    
    // Always use selectedDate if no date in form values
    const finalDate = values.date || selectedDate || new Date();
    console.log('Using final date:', finalDate);
    
    // Create corrected values object with guaranteed date
    const correctedValues = {
      ...values,
      date: finalDate
    };
    
    console.log('Corrected values for submission:', correctedValues);
    console.log('ClientId in corrected values:', correctedValues.clientId);
    
    if (appointmentId && appointmentId > 0) {
      console.log('Calling updateMutation.mutate');
      updateMutation.mutate(correctedValues);
    } else {
      console.log('Calling createMutation.mutate');
      createMutation.mutate(correctedValues);
    }
  };

  const onSubmit = handleFormSubmit;

  const handleCashPayment = async () => {
    if (!appointmentId || appointmentId <= 0 || !appointment) return;
    
    try {
      // Create a payment record for cash payment
      await apiRequest("POST", "/api/payments", {
        clientId: appointment.clientId,
        appointmentId: appointmentId,
        amount: selectedService?.price || 0,
        totalAmount: selectedService?.price || 0,
        method: "cash",
        status: "completed"
      });

      // Update appointment payment status
      await apiRequest("PUT", `/api/appointments/${appointmentId}`, {
        ...appointment,
        paymentStatus: "paid"
      });

      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments', appointmentId] });
      
      toast({
        title: "Cash Payment Recorded",
        description: "Appointment marked as paid with cash.",
      });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record cash payment.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!appointmentId || appointmentId <= 0) return;
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync();
    } finally {
      setIsDeleting(false);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || isLoadingAppointment;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {appointmentId && appointmentId > 0 ? "Edit Appointment" : "Create Appointment"}
            </DialogTitle>
            <DialogDescription>
              {appointmentId && appointmentId > 0 
                ? "Update the appointment details below." 
                : "Fill in the details to create a new appointment."
              }
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Staff Selection - Must be first in staff-centric workflow */}
              <FormField
                control={form.control}
                name="staffId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Member</FormLabel>
                    <FormControl>
                      <Select 
                        disabled={isLoading || isLoadingStaff} 
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Clear service selection when staff changes
                          form.setValue("serviceId", "");
                        }} 
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a staff member first" />
                        </SelectTrigger>
                        <SelectContent>
                          {staff?.map((staffMember: any, index: number) => {
                            const staffName = staffMember.user ? `${staffMember.user.firstName} ${staffMember.user.lastName}` : 'Unknown Staff';
                            return (
                              <SelectItem key={`${staffMember.id}-${index}`} value={staffMember.id.toString()}>
                                {staffName} - {staffMember.title}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Service Selection - Only shows services assigned to selected staff */}
              <FormField
                control={form.control}
                name="serviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service</FormLabel>
                    <FormControl>
                      <Select 
                        disabled={isLoading || isLoadingServices || !selectedStaffId} 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue 
                            placeholder={
                              !selectedStaffId 
                                ? "Select a staff member first" 
                                : services?.length === 0 
                                  ? "No services assigned to this staff member"
                                  : "Select a service"
                            } 
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {services?.filter((service: any, index: number, self: any[]) => 
                            // Remove duplicates based on service ID
                            index === self.findIndex((s: any) => s.id === service.id)
                          ).map((service: any, index: number) => {
                            console.log('Rendering service in dropdown:', service, 'index:', index);
                            return (
                              <SelectItem key={`${service.id}-${index}`} value={service.id.toString()}>
                                {service.name} - {formatPrice(service.price)}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    {!selectedStaffId && (
                      <FormDescription className="text-muted-foreground">
                        Please select a staff member first to see available services
                      </FormDescription>
                    )}
                    {selectedStaffId && services?.length === 0 && (
                      <FormDescription className="text-muted-foreground">
                        This staff member has no services assigned. Please assign services in the Services page.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Client Selection */}
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {/* Client Search Input */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Search by name, email, or phone number..."
                            value={clientSearchValue}
                            onChange={(e) => {
                              console.log('🔍 Search input changed:', {
                                oldValue: clientSearchValue,
                                newValue: e.target.value,
                                length: e.target.value.length
                              });
                              setClientSearchValue(e.target.value);
                              // Clear selected client when typing
                              if (field.value) {
                                field.onChange("");
                              }
                            }}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowClientCreationDialog(true);
                            }}
                          >
                            <User className="h-4 w-4 mr-1" />
                            Add New
                          </Button>
                        </div>
                        
                        {/* Search Instructions */}
                        {!clientSearchValue && !field.value && (
                          <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                            💡 Type to search for clients by name, email, or phone number
                          </div>
                        )}
                        
                        {/* Search Results */}
                        <div className="border rounded-md max-h-48 overflow-y-auto">
                          {(() => {
                            if (!clients || clients.length === 0) {
                              return (
                                <div className="p-3 text-sm text-muted-foreground text-center">
                                  {clientSearchValue.trim() ? 'No clients found. Try a different search term or add a new client.' : 'Type to search for clients...'}
                                </div>
                              );
                            }
                            
                            console.log('🔍 Search results:', {
                              searchTerm: clientSearchValue,
                              totalClients: clients?.length,
                              searchValue: clientSearchValue.toLowerCase().trim()
                            });
                            
                            return clients.map((client: any) => (
                              <div
                                key={client.id}
                                className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                                onClick={() => {
                                  console.log('Client selected:', client);
                                  console.log('Setting clientId to:', client.id.toString());
                                  field.onChange(client.id.toString());
                                  setClientSearchValue(`${client.firstName} ${client.lastName}`);
                                  console.log('Form clientId after selection:', form.getValues('clientId'));
                                }}
                              >
                                <div className="font-medium">
                                  {client.firstName} {client.lastName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {client.email}
                                  {client.phone && ` • ${client.phone}`}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                        
                        {/* Hidden input to ensure clientId is captured */}
                        <input 
                          type="hidden" 
                          value={field.value || ""} 
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                        
                        {/* Selected Client Display */}
                        {field.value && (
                          <div className="p-3 bg-accent rounded-md">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">
                                  {clients?.find((client: any) => client.id.toString() === field.value)?.firstName} {clients?.find((client: any) => client.id.toString() === field.value)?.lastName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {clients?.find((client: any) => client.id.toString() === field.value)?.email}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  field.onChange("");
                                  setClientSearchValue("");
                                }}
                              >
                                Clear
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Date Selection */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="date"
                          value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                          onChange={(e) => {
                            if (e.target.value) {
                              // Parse the date string and create a date in local timezone
                              const [year, month, day] = e.target.value.split('-').map(Number);
                              const date = new Date(year, month - 1, day); // month is 0-indexed
                              console.log('Date input changed:', e.target.value, 'to local date:', date);
                              field.onChange(date);
                              // Force form validation after date selection
                              form.trigger('date');
                            } else {
                              field.onChange(null);
                            }
                          }}
                          min={format(new Date(), "yyyy-MM-dd")}
                          className="w-full"
                        />
                        {field.value && (
                          <div className="text-sm text-muted-foreground">
                            Selected: {format(field.value, "PPP")}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Time Selection */}
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => {
                  const staffSelected = !!selectedStaffId;
                  const serviceSelected = !!selectedServiceId;
                  const dateSelected = !!selectedFormDate;
                  const canSelectTime = staffSelected && serviceSelected && dateSelected && availableTimeSlots.length > 0;
                  let placeholder = "Select a time";
                  if (!staffSelected) placeholder = "Select a staff member first";
                  else if (!serviceSelected) placeholder = "Select a service first";
                  else if (!dateSelected) placeholder = "Select a date first";
                  else if (availableTimeSlots.length === 0) placeholder = "No available times";
                  return (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!canSelectTime}>
                        <SelectTrigger>
                          <SelectValue placeholder={placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {!staffSelected ? (
                            <div className="p-2 text-gray-500 text-sm">Please select a staff member first.</div>
                          ) : !serviceSelected ? (
                            <div className="p-2 text-gray-500 text-sm">Please select a service first.</div>
                          ) : !dateSelected ? (
                            <div className="p-2 text-gray-500 text-sm">Please select a date first.</div>
                          ) : availableTimeSlots.length === 0 ? (
                            <div className="p-2 text-gray-500 text-sm">No available times for this staff member on this day. Please choose another date or staff member.</div>
                          ) : (
                            availableTimeSlots.map((slot, index) => (
                              <SelectItem key={`${slot.value}-${index}`} value={slot.value}>
                                {slot.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              
              {/* Appointment Duration Summary */}
              {selectedService && startTimeString && (
                <div className="bg-muted p-3 rounded-md text-sm">
                  <div className="flex items-center mb-1">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="font-medium">Appointment Duration</span>
                  </div>
                  <div className="pl-6">
                    <p><strong>Service:</strong> {selectedService.name}</p>
                    <p><strong>Service Duration:</strong> {selectedService.duration} minutes</p>
                    {(selectedService.bufferTimeBefore > 0 || selectedService.bufferTimeAfter > 0) && (
                      <>
                        {selectedService.bufferTimeBefore > 0 && (
                          <p><strong>Buffer Before:</strong> {selectedService.bufferTimeBefore} minutes</p>
                        )}
                        {selectedService.bufferTimeAfter > 0 && (
                          <p><strong>Buffer After:</strong> {selectedService.bufferTimeAfter} minutes</p>
                        )}
                        <p><strong>Total Time:</strong> {selectedService.duration + (selectedService.bufferTimeBefore || 0) + (selectedService.bufferTimeAfter || 0)} minutes</p>
                      </>
                    )}
                    <p><strong>End Time:</strong> {endTime}</p>
                  </div>
                </div>
              )}
              
              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <NoteInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Any special instructions or notes for this appointment"
                        disabled={isLoading}
                        category="appointment"
                        showTemplateSelector={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              

              {/* Payment Section - Only show for existing appointments */}
              {appointmentId && appointmentId > 0 && appointment && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium">Payment</h3>
                    {appointment.paymentStatus === 'paid' ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-sm font-medium">Paid</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <span className="text-sm text-muted-foreground">Amount: {formatPrice(appointment.totalAmount || selectedService?.price || 0)}</span>
                        <div className="space-y-2">
                          <CheckoutWithTerminal
                            locationId={appointment.locationId || ''}
                            amount={appointment.totalAmount || selectedService?.price || 0}
                            reference={`appointment-${appointment.id}`}
                            description={`Payment for ${selectedService?.name || 'appointment'}`}
                            onPaymentComplete={async (result) => {
                              // Update appointment payment status
                              await apiRequest("PUT", `/api/appointments/${appointment.id}`, {
                                paymentStatus: 'paid',
                                paymentId: result.paymentId
                              });
                              toast({
                                title: "Payment Successful",
                                description: "Appointment has been paid for",
                              });
                              onOpenChange(false);
                            }}
                            onPaymentError={(error) => {
                              toast({
                                title: "Payment Failed",
                                description: error,
                                variant: "destructive",
                              });
                            }}
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              setShowCheckout(true);
                              onOpenChange(false); // Close the appointment dialog
                            }}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Other Payment Methods
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <DialogFooter className="flex justify-between">
                {appointmentId && appointmentId > 0 ? (
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting || isLoading}
                  >
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete Appointment
                  </Button>
                ) : (
                  <div /> 
                )}
                
                <Button 
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {appointmentId && appointmentId > 0 ? "Update Appointment" : "Create Appointment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Checkout Component */}
      {showCheckout && appointment && services && staff && clients && (
        <AppointmentCheckout
          appointment={{
            id: appointment.id,
            clientId: appointment.clientId,
            clientName: (() => {
              const client = clients.find((c: any) => c.id === appointment.clientId);
              return client ? `${client.firstName} ${client.lastName}` : 'Unknown Client';
            })(),
            serviceName: (() => {
              const service = services.find((s: any) => s.id === appointment.serviceId);
              return service?.name || 'Unknown Service';
            })(),
            staffName: (() => {
              const staffMember = staff.find((s: any) => s.id === appointment.staffId);
              if (staffMember) {
                const staffUser = clients.find((c: any) => c.id === staffMember.userId);
                return staffUser ? `${staffUser.firstName} ${staffUser.lastName}` : 'Unknown Staff';
              }
              return 'Unknown Staff';
            })(),
            startTime: new Date(appointment.startTime),
            endTime: new Date(appointment.endTime),
            amount: appointment.totalAmount || (() => {
              const service = services.find((s: any) => s.id === appointment.serviceId);
              return service?.price || 0;
            })(),
            totalAmount: appointment.totalAmount || (() => {
              const service = services.find((s: any) => s.id === appointment.serviceId);
              return service?.price || 0;
            })(),
            status: appointment.status,
            paymentStatus: appointment.paymentStatus || 'unpaid'
          }}
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
          onSuccess={() => {
            setShowCheckout(false);
            queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
            queryClient.invalidateQueries({ queryKey: ['/api/appointments', appointmentId] });
            toast({
              title: "Payment Successful",
              description: "The appointment has been paid for successfully.",
            });
          }}
        />
      )}
      
      {/* Client Creation Dialog */}
      <ClientCreationDialog
        open={showClientCreationDialog}
        onOpenChange={setShowClientCreationDialog}
        onClientCreated={(newClient) => {
          // Set the newly created client as selected
          form.setValue("clientId", newClient.id.toString());
          setClientSearchValue(`${newClient.firstName} ${newClient.lastName}`);
          
          // Refetch clients to include the new one
          refetchClients();
          
          toast({
            title: "Client Created",
            description: `${newClient.firstName} ${newClient.lastName} has been added and selected.`,
          });
        }}
      />
    </>
  );
};

export default AppointmentForm;