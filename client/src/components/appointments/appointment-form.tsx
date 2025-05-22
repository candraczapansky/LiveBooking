import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMinutes } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";

// Define the form schema
const appointmentFormSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  staffId: z.string().min(1, "Staff member is required"),
  clientId: z.string().min(1, "Client is required"),
  date: z.date({
    required_error: "Date is required",
  }),
  time: z.string().min(1, "Time is required"),
  notes: z.string().optional(),
  sendReminder: z.boolean().default(true),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

interface AppointmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: number | null;
  selectedDate?: Date;
}

const generateTimeSlots = () => {
  const slots = [];
  // Generate time slots from 9 AM to 8 PM
  for (let hour = 9; hour <= 20; hour++) {
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

const timeSlots = generateTimeSlots();

const AppointmentForm = ({ open, onOpenChange, appointmentId, selectedDate }: AppointmentFormProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form setup
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      serviceId: "",
      staffId: "",
      clientId: "",
      date: selectedDate || new Date(),
      time: "10:00",
      notes: "",
      sendReminder: true,
    },
  });
  
  // Get services
  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const response = await fetch('/api/services');
      if (!response.ok) throw new Error('Failed to fetch services');
      return response.json();
    },
    enabled: open
  });
  
  // Get staff
  const { data: staff, isLoading: isLoadingStaff } = useQuery({
    queryKey: ['/api/staff'],
    queryFn: async () => {
      const response = await fetch('/api/staff');
      if (!response.ok) throw new Error('Failed to fetch staff');
      return response.json();
    },
    enabled: open
  });
  
  // Get clients
  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ['/api/users?role=client'],
    queryFn: async () => {
      const response = await fetch('/api/users?role=client');
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },
    enabled: open
  });
  
  // Get single appointment if editing
  const { data: appointment, isLoading: isLoadingAppointment } = useQuery({
    queryKey: ['/api/appointments', appointmentId],
    queryFn: async () => {
      if (!appointmentId || appointmentId < 0) return null;
      const response = await fetch(`/api/appointments/${appointmentId}`);
      if (!response.ok) throw new Error('Failed to fetch appointment');
      return response.json();
    },
    enabled: open && !!appointmentId && appointmentId > 0
  });
  
  // Create or update appointment
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (appointmentId && appointmentId > 0) {
        return apiRequest('PATCH', `/api/appointments/${appointmentId}`, data);
      } else {
        return apiRequest('POST', '/api/appointments', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: appointmentId ? "Appointment Updated" : "Appointment Created",
        description: appointmentId 
          ? "The appointment has been updated successfully." 
          : "New appointment has been created successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Delete appointment
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!appointmentId) return;
      return apiRequest('DELETE', `/api/appointments/${appointmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: "Appointment Deleted",
        description: "The appointment has been deleted successfully.",
      });
      onOpenChange(false);
      setIsDeleting(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Could not delete the appointment. Please try again.",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  });
  
  // If editing an appointment, populate the form
  useEffect(() => {
    if (appointment && open) {
      const date = new Date(appointment.startTime);
      const timeString = format(date, "HH:mm");
      
      form.reset({
        serviceId: appointment.service.id.toString(),
        staffId: appointment.staff.id.toString(),
        clientId: appointment.client.id.toString(),
        date: date,
        time: timeString,
        notes: appointment.notes || "",
        sendReminder: true, // Assuming default is true
      });
    } else if (open && !appointmentId) {
      // Reset form for a new appointment
      form.reset({
        serviceId: "",
        staffId: "",
        clientId: "",
        date: selectedDate || new Date(),
        time: "10:00",
        notes: "",
        sendReminder: true,
      });
    }
  }, [appointment, appointmentId, open, form, selectedDate]);
  
  // When user selects a service, find staff who can provide it
  const serviceId = form.watch("serviceId");
  
  // Calculate end time based on service duration
  const selectedService = services?.find(s => s.id.toString() === serviceId);
  const startTimeString = form.watch("time");
  const formDate = form.watch("date");
  
  let endTime = "";
  if (selectedService && startTimeString && formDate) {
    const [hours, minutes] = startTimeString.split(":").map(Number);
    const startTime = new Date(formDate);
    startTime.setHours(hours, minutes);
    
    const end = addMinutes(startTime, selectedService.duration);
    endTime = format(end, "h:mm a");
  }
  
  const onSubmit = (values: AppointmentFormValues) => {
    // Calculate start and end times
    const { date, time, serviceId, staffId, clientId, notes, sendReminder } = values;
    const [hours, minutes] = time.split(":").map(Number);
    
    const startTime = new Date(date);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = addMinutes(startTime, selectedService?.duration || 60);
    
    const appointmentData = {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      serviceId: parseInt(serviceId),
      staffId: parseInt(staffId),
      clientId: parseInt(clientId),
      status: "confirmed",
      notes: notes || null,
    };
    
    mutation.mutate(appointmentData);
  };
  
  const handleDelete = () => {
    setIsDeleting(true);
    deleteMutation.mutate();
  };
  
  const isLoading = isLoadingServices || isLoadingStaff || isLoadingClients || isLoadingAppointment || mutation.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appointmentId && appointmentId > 0 ? "Edit Appointment" : "Create New Appointment"}
          </DialogTitle>
          <DialogDescription>
            {appointmentId && appointmentId > 0 
              ? "Update the appointment details below." 
              : "Fill in the information below to schedule a new appointment."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Service Selection */}
            <FormField
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service</FormLabel>
                  <Select
                    disabled={isLoading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services?.map((service) => (
                        <SelectItem key={service.id} value={service.id.toString()}>
                          {service.name} ({service.duration} min) - {formatPrice(service.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Staff Selection */}
            <FormField
              control={form.control}
              name="staffId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Member</FormLabel>
                  <Select
                    disabled={isLoading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a staff member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staff?.map((staffMember) => (
                        <SelectItem key={staffMember.id} value={staffMember.id.toString()}>
                          {staffMember.user.firstName} {staffMember.user.lastName} - {staffMember.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Select
                    disabled={isLoading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.firstName} {client.lastName} ({client.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isLoading}
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
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Time Selection */}
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time</FormLabel>
                  <Select
                    disabled={isLoading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeSlots.map((slot) => (
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
            
            {/* Appointment Duration Summary */}
            {selectedService && startTimeString && (
              <div className="bg-muted p-3 rounded-md text-sm">
                <div className="flex items-center mb-1">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">Appointment Duration</span>
                </div>
                <div className="pl-6">
                  <p><strong>Service:</strong> {selectedService.name}</p>
                  <p><strong>Duration:</strong> {selectedService.duration} minutes</p>
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
                    <Textarea
                      placeholder="Any special instructions or notes for this appointment"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Send Reminder Option */}
            <FormField
              control={form.control}
              name="sendReminder"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Send Reminder</FormLabel>
                    <FormDescription>
                      Send an email reminder to the client 24 hours before the appointment
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
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
                <div /> // Empty div to maintain spacing
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
  );
};

export default AppointmentForm;