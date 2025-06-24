import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, MapPin, Users, Plus, Edit, Trash2, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Schedule form schema
const scheduleFormSchema = z.object({
  staffId: z.number().min(1, "Staff member is required"),
  daysOfWeek: z.array(z.enum(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"])).min(1, "At least one day must be selected"),
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const checkSidebarState = () => {
      const globalSidebarState = (window as any).sidebarIsOpen;
      if (globalSidebarState !== undefined) {
        setSidebarOpen(globalSidebarState);
      }
    };

    const interval = setInterval(checkSidebarState, 100);
    return () => clearInterval(interval);
  }, []);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      staffId: 1,
      daysOfWeek: ["Monday"],
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

  // Update schedule mutation (for editing existing schedules)
  const updateScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/schedules/${selectedScheduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update schedule');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      setIsFormOpen(false);
    },
    onError: (error: any) => {
      console.error("Failed to update schedule:", error);
    }
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/schedules/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
    },
    onError: (error: any) => {
      console.error("Failed to delete schedule:", error);
    }
  });

  const handleAddSchedule = () => {
    setSelectedScheduleId(null);
    form.reset({
      staffId: 1,
      daysOfWeek: ["Monday"],
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
      daysOfWeek: [schedule.dayOfWeek as any],
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: ScheduleFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (selectedScheduleId) {
        // For editing, convert back to single day format
        const singleDayData = {
          staffId: data.staffId,
          dayOfWeek: data.daysOfWeek[0], // Take the first selected day for editing
          startTime: data.startTime,
          endTime: data.endTime,
          location: data.location,
          serviceCategories: data.serviceCategories || [],
          startDate: data.dateRange.startDate,
          endDate: data.dateRange.endDate || null,
          isBlocked: data.isBlocked || false,
        };
        
        const response = await fetch(`/api/schedules/${selectedScheduleId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(singleDayData),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update schedule');
        }
        
        queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
        setIsFormOpen(false);
        setSelectedScheduleId(null);
      } else {
        // For creating, submit multiple schedules for each selected day
        const promises = data.daysOfWeek.map(async (dayOfWeek) => {
          const singleDayData = {
            staffId: data.staffId,
            dayOfWeek,
            startTime: data.startTime,
            endTime: data.endTime,
            location: data.location,
            serviceCategories: data.serviceCategories || [],
            startDate: data.dateRange.startDate,
            endDate: data.dateRange.endDate || null,
            isBlocked: data.isBlocked || false,
          };
          
          const response = await fetch('/api/schedules', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(singleDayData),
          });
          
          if (!response.ok) {
            throw new Error(`Failed to create schedule for ${dayOfWeek}`);
          }
          
          return response.json();
        });
        
        await Promise.all(promises);
        queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
        setIsFormOpen(false);
      }
    } catch (error: any) {
      console.error("Failed to save schedules:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getServiceCategoriesText = (categoryIds: number[]) => {
    if (!categoryIds || categoryIds.length === 0) return "Available";
    
    const categories = serviceCategories?.filter((cat: any) => categoryIds.includes(cat.id));
    if (!categories || categories.length === 0) return "Available";
    
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="hidden lg:block">
        <SidebarController />
      </div>
      
      <div className={`transition-all duration-300 ${
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
      } min-h-screen flex flex-col`}>
        <Header />
        
        <main className="flex-1 bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 md:p-6 pb-4 sm:pb-6 overflow-x-hidden">
          <div className="w-full max-w-none sm:max-w-7xl mx-auto px-0 sm:px-4">
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

                    {/* Days of Week - Multiple Selection */}
                    <FormField
                      control={form.control}
                      name="daysOfWeek"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Days of Week</FormLabel>
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            {DAYS_OF_WEEK.map((day) => {
                              const isSelected = field.value?.includes(day as any);
                              return (
                                <div
                                  key={day}
                                  className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-primary/10 border-primary text-primary'
                                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                                  }`}
                                  onClick={() => {
                                    const currentValue = field.value || [];
                                    if (isSelected) {
                                      field.onChange(currentValue.filter((d: string) => d !== day));
                                    } else {
                                      field.onChange([...currentValue, day]);
                                    }
                                  }}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    className="pointer-events-none"
                                  />
                                  <span className="text-sm font-medium">{day}</span>
                                </div>
                              );
                            })}
                          </div>
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
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Saving..." : "Save Schedule"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SchedulePage;