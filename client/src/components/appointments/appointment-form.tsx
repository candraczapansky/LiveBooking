import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMinutes } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AppointmentCheckout from "./appointment-checkout";
import { getAvailableStaff, generateAppointmentTimes, getAvailableTimeSlots, validateBookingTime } from "@/services/availabilityService";

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
import { Loader2, Calendar as CalendarIcon, Clock, CreditCard, DollarSign } from "lucide-react";
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

const AppointmentForm = ({ open, onOpenChange, appointmentId, selectedDate }: AppointmentFormProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
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

  // Fetch schedules for availability checking
  const { data: schedules = [] } = useQuery({
    queryKey: ['/api/schedules'],
    enabled: open
  });

  // Fetch existing appointments for conflict checking
  const { data: appointments = [] } = useQuery({
    queryKey: ['/api/appointments'],
    enabled: open
  });

  // Fetch staff services for capability checking
  const { data: staffServices = [] } = useQuery({
    queryKey: ['/api/staff-services'],
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

  // Computed values
  const selectedServiceId = form.watch("serviceId");
  const selectedStaffId = form.watch("staffId");
  const selectedFormDate = form.watch("date");
  const startTimeString = form.watch("time");
  
  const selectedService = services?.find((s: any) => s.id.toString() === selectedServiceId);
  
  const endTime = selectedService && startTimeString ? (() => {
    const [hours, minutes] = startTimeString.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = addMinutes(startDate, selectedService.duration);
    return format(endDate, 'h:mm a');
  })() : null;

  // Update available staff when service or date changes
  useEffect(() => {
    if (selectedServiceId && selectedFormDate && services && staff && schedules && appointments && staffServices) {
      const serviceId = parseInt(selectedServiceId);
      const availableStaffMembers = getAvailableStaff(
        selectedFormDate,
        "09:00", // Default time for initial filtering
        selectedService ? addMinutes(new Date().setHours(9, 0, 0, 0), selectedService.duration).toTimeString().slice(0, 5) : "10:00",
        serviceId,
        staff,
        schedules,
        appointments,
        staffServices
      );
      setAvailableStaff(availableStaffMembers);
      
      // Reset staff selection if current staff is not available
      if (selectedStaffId && !availableStaffMembers.find((s: any) => s.id === parseInt(selectedStaffId))) {
        form.setValue("staffId", "");
        form.setValue("time", "");
        setAvailableTimes([]);
      }
    } else {
      setAvailableStaff([]);
    }
  }, [selectedServiceId, selectedFormDate, services, staff, schedules, appointments, staffServices, selectedService?.duration]);

  // Update available times when staff or date changes
  useEffect(() => {
    if (selectedStaffId && selectedFormDate && selectedService && schedules && appointments) {
      const staffId = parseInt(selectedStaffId);
      const serviceDuration = selectedService.duration || 60;
      
      const timeSlots = getAvailableTimeSlots(
        staffId,
        selectedFormDate,
        serviceDuration,
        schedules,
        appointments
      );

      const times: string[] = [];
      timeSlots.forEach(slot => {
        const slotTimes = generateAppointmentTimes(slot, serviceDuration);
        times.push(...slotTimes);
      });

      setAvailableTimes(times);
      
      // Reset time selection if current time is not available
      if (startTimeString && !times.includes(startTimeString)) {
        form.setValue("time", "");
      }
    } else {
      setAvailableTimes([]);
    }
  }, [selectedStaffId, selectedFormDate, selectedService?.duration, schedules, appointments]);
  
  // Load appointment data when editing
  useEffect(() => {
    if (appointment && appointmentId && appointmentId > 0) {
      const appointmentDate = new Date(appointment.startTime);
      const appointmentTime = format(appointmentDate, 'HH:mm');
      
      form.reset({
        serviceId: appointment.serviceId?.toString() || "",
        staffId: appointment.staffId?.toString() || "",
        clientId: appointment.clientId?.toString() || "",
        date: appointmentDate,
        time: appointmentTime,
        notes: appointment.notes || "",
      });
    }
  }, [appointment, appointmentId, form]);

  // Reset form when closing
  useEffect(() => {
    if (!open) {
      form.reset({
        serviceId: "",
        staffId: "",
        clientId: "",
        date: selectedDate || new Date(),
        time: "10:00",
        notes: "",
        sendReminder: true,
      });
      setAvailableStaff([]);
      setAvailableTimes([]);
    }
  }, [open, selectedDate, form]);

  const createMutation = useMutation({
    mutationFn: async (values: AppointmentFormValues) => {
      const [hours, minutes] = values.time.split(':').map(Number);
      const startTime = new Date(values.date);
      startTime.setHours(hours, minutes, 0, 0);

      const selectedServiceData = services?.find((s: any) => s.id.toString() === values.serviceId);
      const endTime = addMinutes(startTime, selectedServiceData?.duration || 60);

      const appointmentData = {
        serviceId: parseInt(values.serviceId),
        staffId: parseInt(values.staffId),
        clientId: parseInt(values.clientId),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: "confirmed",
        notes: values.notes || null,
      };

      return apiRequest("POST", "/api/appointments", appointmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Appointment created successfully.",
      });
    },
    onError: (error: any) => {
      const isConflict = error.response?.status === 409;
      const errorMessage = error.response?.data?.message || error.message || "Failed to create appointment.";
      
      toast({
        title: isConflict ? "⚠️ Scheduling Conflict" : "Error",
        description: errorMessage,
        variant: "destructive",
        duration: isConflict ? 8000 : 5000, // Show conflict messages longer
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: AppointmentFormValues) => {
      if (!appointmentId || appointmentId <= 0) {
        throw new Error("No appointment ID provided");
      }

      const [hours, minutes] = values.time.split(':').map(Number);
      const startTime = new Date(values.date);
      startTime.setHours(hours, minutes, 0, 0);

      const selectedServiceData = services?.find((s: any) => s.id.toString() === values.serviceId);
      const endTime = addMinutes(startTime, selectedServiceData?.duration || 60);

      const appointmentData = {
        serviceId: parseInt(values.serviceId),
        staffId: parseInt(values.staffId),
        clientId: parseInt(values.clientId),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: "confirmed",
        notes: values.notes || null,
      };

      return apiRequest("PUT", `/api/appointments/${appointmentId}`, appointmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments', appointmentId] });
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Appointment updated successfully.",
      });
    },
    onError: (error: any) => {
      const isConflict = error.response?.status === 409;
      const errorMessage = error.response?.data?.message || error.message || "Failed to update appointment.";
      
      toast({
        title: isConflict ? "⚠️ Scheduling Conflict" : "Error", 
        description: errorMessage,
        variant: "destructive",
        duration: isConflict ? 8000 : 5000, // Show conflict messages longer
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
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Appointment deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete appointment.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: AppointmentFormValues) => {
    // Additional validation before submission for new appointments
    if (!appointmentId || appointmentId <= 0) {
      if (!availableTimes.includes(values.time)) {
        toast({
          title: "Error",
          description: "Selected time is no longer available. Please choose a different time.",
          variant: "destructive",
        });
        return;
      }
    }

    if (appointmentId && appointmentId > 0) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const handleCashPayment = async () => {
    if (!appointmentId || appointmentId <= 0 || !appointment) return;
    
    try {
      // Create a payment record for cash payment
      await apiRequest("POST", "/api/payments", {
        clientId: appointment.clientId,
        appointmentId: appointmentId,
        amount: selectedService?.price || 0,
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
              
              {/* Service Selection */}
              <FormField
                control={form.control}
                name="serviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service</FormLabel>
                    <FormControl>
                      <Select 
                        disabled={isLoading || isLoadingServices} 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a service" />
                        </SelectTrigger>
                        <SelectContent>
                          {services?.map((service: any) => (
                            <SelectItem key={service.id} value={service.id.toString()}>
                              {service.name} - {formatPrice(service.price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
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
                    <FormControl>
                      <Select 
                        disabled={isLoading || isLoadingStaff || availableStaff.length === 0} 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a staff member" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStaff.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              {selectedServiceId 
                                ? "No staff available for selected service and date" 
                                : "Please select a service and date first"
                              }
                            </div>
                          ) : (
                            availableStaff.map((staffMember: any) => {
                            const staffName = staffMember.user ? `${staffMember.user.firstName} ${staffMember.user.lastName}` : 'Unknown Staff';
                            return (
                              <SelectItem key={staffMember.id} value={staffMember.id.toString()}>
                                {staffName} - {staffMember.title}
                              </SelectItem>
                            );
                          })
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
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
                      <Select 
                        disabled={isLoading || isLoadingClients} 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients?.map((client: any) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.firstName} {client.lastName} - {client.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
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
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
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
                    <FormControl>
                      <Select 
                        disabled={isLoading || availableTimes.length === 0} 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a time" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTimes.length === 0 ? (
                            <SelectItem value="no-times-available" disabled>
                              {selectedStaffId 
                                ? "No available times for selected staff and date" 
                                : "Please select a staff member first"
                              }
                            </SelectItem>
                          ) : (
                            availableTimes.map((timeString) => {
                              const [hours, minutes] = timeString.split(':').map(Number);
                              const displayTime = format(new Date().setHours(hours, minutes, 0, 0), 'h:mm a');
                              return (
                                <SelectItem key={timeString} value={timeString}>
                                  {displayTime}
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
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
                        <span className="text-sm text-muted-foreground">Amount: {formatPrice(selectedService?.price || 0)}</span>
                        <Button
                          type="button"
                          onClick={() => {
                            setShowCheckout(true);
                            onOpenChange(false); // Close the appointment dialog
                          }}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          Process Payment
                        </Button>
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
                  disabled={isLoading || ((!appointmentId || appointmentId <= 0) && (availableStaff.length === 0 || availableTimes.length === 0))}
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
            amount: (() => {
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
    </>
  );
};

export default AppointmentForm;