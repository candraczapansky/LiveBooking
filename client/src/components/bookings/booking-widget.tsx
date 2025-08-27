import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { formatDuration, formatPrice, formatTime } from "@/lib/utils";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, Clock, Search, MapPin } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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

  const { data: categories } = useQuery({
    queryKey: ['/api/service-categories'],
    queryFn: async () => {
      const response = await fetch('/api/service-categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
    enabled: open
  });

  const selectedLocationId = form.watch('locationId');

  const { data: services } = useQuery({
    queryKey: ['/api/services', selectedCategoryId, selectedLocationId],
    queryFn: async () => {
      const params: string[] = [];
      if (selectedCategoryId) params.push(`categoryId=${selectedCategoryId}`);
      if (selectedLocationId) params.push(`locationId=${selectedLocationId}`);
      const endpoint = params.length > 0 ? `/api/services?${params.join('&')}` : '/api/services';
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch services');
      return response.json();
    },
    enabled: open && !!selectedLocationId
  });

  const { data: staff } = useQuery({
    queryKey: ['/api/staff', selectedLocationId],
    queryFn: async () => {
      const endpoint = selectedLocationId ? `/api/staff?locationId=${selectedLocationId}` : '/api/staff';
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch staff');
      return response.json();
    },
    enabled: open && currentStep >= 2 && !!selectedLocationId
  });

  const { data: locations } = useQuery({
    queryKey: ['/api/locations'],
    queryFn: async () => {
      const response = await fetch('/api/locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      return response.json();
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

  // Filter services by search query
  const filteredServices = services?.filter((service: Service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get selected service details
  const selectedService = form.watch('serviceId') 
    ? services?.find((service: Service) => service.id.toString() === form.watch('serviceId')) 
    : null;

  // Generate time slots (10am to 6pm with 30 minute intervals)
  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 10; // 10 AM
    const endHour = 18; // 6 PM
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

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId === "all" ? null : categoryId);
    setSearchQuery("");
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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                </div>
                
                {/* Service Categories */}
                <div className="flex overflow-x-auto space-x-2 py-2">
                  <Button
                    type="button"
                    variant={selectedCategoryId === null ? "default" : "outline"}
                    size="sm"
                    className="rounded-full whitespace-nowrap"
                    onClick={() => handleCategoryChange("all")}
                  >
                    All Services
                  </Button>
                  {categories?.map((category: Category) => (
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
                  ))}
                </div>
                
                {/* Service List */}
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormControl>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filteredServices?.length === 0 ? (
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
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          {staff?.map((staffMember: Staff) => (
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
                                    {staffMember.user.firstName?.[0] || ""}{staffMember.user.lastName?.[0] || ""}
                                  </div>
                                  <div className="ml-4">
                                    <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">
                                      {staffMember.user.firstName} {staffMember.user.lastName}
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{staffMember.title}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
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
                                className="w-full pl-3 text-left font-normal"
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
                                date < new Date() || 
                                date > addDays(new Date(), 30)
                              }
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
