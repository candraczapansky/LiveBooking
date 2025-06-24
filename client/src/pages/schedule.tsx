import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useDocumentTitle } from "@/hooks/use-document-title";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users, Plus, Edit, Trash2, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Schedule form schema
const scheduleFormSchema = z.object({
  staffId: z.number().min(1, "Staff member is required"),
  dayOfWeek: z.enum(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().min(1, "Location is required"),
  serviceCategories: z.array(z.number()).optional().default([]),
  dateRange: z.object({
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
  }),
  isBlocked: z.boolean().optional().default(false),
});

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

type Schedule = {
  id: number;
  staffId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  location: string;
  serviceCategories: number[];
  startDate: string;
  endDate?: string;
  isBlocked: boolean;
  staff?: {
    id: number;
    title: string;
    user: {
      firstName?: string;
      lastName?: string;
    };
  };
};

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SchedulePage = () => {
  useDocumentTitle("Staff Schedule | BeautyBook");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [viewFilter, setViewFilter] = useState("current");

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      staffId: 1, // Default to first staff member
      dayOfWeek: "Monday",
      startTime: "09:00",
      endTime: "17:00",
      location: "All Locations",
      serviceCategories: [],
      dateRange: {
        startDate: new Date().toISOString().split('T')[0],
        endDate: "",
      },
      isBlocked: false,
    },
  });

  // Fetch schedules
  const { data: schedules = [], isLoading: isSchedulesLoading } = useQuery<any[]>({
    queryKey: ['/api/schedules'],
  });

  // Fetch staff
  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ['/api/staff'],
  });

  // Fetch rooms
  const { data: rooms = [] } = useQuery<any[]>({
    queryKey: ['/api/rooms'],
  });

  // Fetch service categories
  const { data: serviceCategories = [] } = useQuery<any[]>({
    queryKey: ['/api/service-categories'],
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormValues) => {
      console.log("Creating schedule with data:", data);
      const scheduleData = {
        staffId: data.staffId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        serviceCategories: data.serviceCategories || [],
        startDate: data.dateRange.startDate,
        endDate: data.dateRange.endDate || null,
        isBlocked: data.isBlocked || false,
      };
      console.log("Sending schedule data to API:", scheduleData);
      return await apiRequest('POST', '/api/schedules', scheduleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      toast({
        title: "Success",
        description: "Schedule created successfully!"
      });
      setIsFormOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create schedule: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormValues) => {
      const scheduleData = {
        staffId: data.staffId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        serviceCategories: data.serviceCategories || [],
        startDate: data.dateRange.startDate,
        endDate: data.dateRange.endDate || null,
        isBlocked: data.isBlocked || false,
      };
      return await apiRequest("PUT", `/api/schedules/${selectedScheduleId}`, scheduleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      toast({
        title: "Success", 
        description: "Schedule updated successfully!"
      });
      setIsFormOpen(false);
      setSelectedScheduleId(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update schedule: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/schedules/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      toast({
        title: "Success",
        description: "Schedule deleted successfully!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete schedule: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleAddSchedule = () => {
    setSelectedScheduleId(null);
    form.reset({
      staffId: 1,
      dayOfWeek: "Monday",
      startTime: "09:00",
      endTime: "17:00",
      location: "All Locations",
      serviceCategories: [],
      dateRange: {
        startDate: new Date().toISOString().split('T')[0],
        endDate: "",
      },
      isBlocked: false,
    });
    setIsFormOpen(true);
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setSelectedScheduleId(schedule.id);
    form.reset({
      staffId: schedule.staffId,
      dayOfWeek: schedule.dayOfWeek as any,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      location: schedule.location,
      serviceCategories: schedule.serviceCategories,
      dateRange: {
        startDate: schedule.startDate,
        endDate: schedule.endDate || "",
      },
      isBlocked: schedule.isBlocked,
    });
    setIsFormOpen(true);
  };

  const handleDeleteSchedule = (id: number) => {
    if (confirm("Are you sure you want to delete this schedule?")) {
      deleteScheduleMutation.mutate(id);
    }
  };

  const onSubmit = (data: ScheduleFormValues) => {
    console.log("Form submitted with data:", data);
    console.log("Form errors:", form.formState.errors);
    
    // Validate the form manually
    const validationResult = scheduleFormSchema.safeParse(data);
    if (!validationResult.success) {
      console.error("Validation failed:", validationResult.error);
      toast({
        title: "Validation Error",
        description: "Please check all required fields",
        variant: "destructive"
      });
      return;
    }
    
    if (selectedScheduleId) {
      updateScheduleMutation.mutate(data);
    } else {
      createScheduleMutation.mutate(data);
    }
  };

  const getServiceCategoriesText = (categoryIds: number[]) => {
    if (!categoryIds || categoryIds.length === 0) return "block";
    
    const categories = serviceCategories?.filter((cat: any) => categoryIds.includes(cat.id));
    if (!categories || categories.length === 0) return "block";
    
    return `${categories.length} service${categories.length > 1 ? 's' : ''}`;
  };

  const formatDateRange = (startDate: string, endDate?: string) => {
    const start = new Date(startDate).toLocaleDateString();
    if (endDate) {
      const end = new Date(endDate).toLocaleDateString();
      return `${start} - ${end}`;
    }
    return start;
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Staff Schedule</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage staff availability and appointment scheduling
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          <Select value={viewFilter} onValueChange={setViewFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current and future</SelectItem>
              <SelectItem value="past">Past schedules</SelectItem>
              <SelectItem value="all">All schedules</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAddSchedule}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Schedule
          </Button>
        </div>
      </div>

      {/* Schedules Table */}
      {isSchedulesLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : schedules && schedules.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Day Of Week
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Staff Member
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Start Time
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      End Time
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Service Categories
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Date Range
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Location
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {schedules.map((schedule: any) => (
                  <tr key={schedule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {schedule.dayOfWeek}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {schedule.staff?.user?.firstName} {schedule.staff?.user?.lastName}
                      <div className="text-xs text-gray-500 dark:text-gray-400">{schedule.staff?.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {schedule.startTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {schedule.endTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <Badge variant={schedule.isBlocked ? "destructive" : "default"}>
                        {getServiceCategoriesText(schedule.serviceCategories)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatDateRange(schedule.startDate, schedule.endDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {schedule.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditSchedule(schedule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No schedules found.</p>
        </div>
      )}

      {/* Schedule Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedScheduleId ? "Edit Schedule" : "Add New Schedule"}
            </DialogTitle>
            <DialogDescription>
              Set up staff availability for appointments and services.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Staff Selection */}
              <FormField
                control={form.control}
                name="staffId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Member</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staff?.map((staffMember: any) => (
                          <SelectItem key={staffMember.id} value={staffMember.id.toString()}>
                            {staffMember.user?.firstName} {staffMember.user?.lastName} - {staffMember.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Day of Week */}
              <FormField
                control={form.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of Week</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Location */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="All Locations">All Locations</SelectItem>
                        {rooms?.map((room: any) => (
                          <SelectItem key={room.id} value={room.name}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dateRange.startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateRange.endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                >
                  {createScheduleMutation.isPending || updateScheduleMutation.isPending ? "Saving..." : "Save Schedule"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SchedulePage;