import { useState, useEffect } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";
import { useDocumentTitle } from "@/hooks/use-document-title";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  serviceCategories: z.array(z.number()).min(1, "At least one service category is required"),
  dateRange: z.object({
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
  }),
  isBlocked: z.boolean().default(false),
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
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [viewFilter, setViewFilter] = useState("current");

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
      staffId: 0,
      dayOfWeek: "Monday",
      startTime: "09:00",
      endTime: "17:00",
      location: "",
      serviceCategories: [],
      dateRange: {
        startDate: new Date().toISOString().split('T')[0],
        endDate: "",
      },
      isBlocked: false,
    },
  });

  // Fetch schedules
  const { data: schedules = [], isLoading: isSchedulesLoading } = useQuery({
    queryKey: ['/api/schedules'],
  });

  // Fetch staff members
  const { data: staff } = useQuery({
    queryKey: ['/api/staff'],
    queryFn: async () => {
      const response = await fetch('/api/staff');
      if (!response.ok) throw new Error('Failed to fetch staff');
      return response.json();
    }
  });

  // Fetch rooms for locations
  const { data: rooms } = useQuery({
    queryKey: ['/api/rooms'],
    queryFn: async () => {
      const response = await fetch('/api/rooms');
      if (!response.ok) throw new Error('Failed to fetch rooms');
      return response.json();
    }
  });

  // Fetch service categories
  const { data: serviceCategories } = useQuery({
    queryKey: ['/api/service-categories'],
    queryFn: async () => {
      const response = await fetch('/api/service-categories');
      if (!response.ok) throw new Error('Failed to fetch service categories');
      return response.json();
    }
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormValues) => {
      console.log("Creating schedule with data:", data);
      // Transform the data to match the backend schema
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
      return await apiRequest("POST", "/api/schedules", scheduleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      toast.success("Schedule created successfully!");
      setIsFormOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(`Failed to create schedule: ${error.message}`);
    }
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormValues) => {
      console.log("Updating schedule:", selectedScheduleId, data);
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
      toast.success("Schedule updated successfully!");
      setIsFormOpen(false);
      setSelectedScheduleId(null);
      form.reset();
    },
    onError: (error: any) => {
      toast.error(`Failed to update schedule: ${error.message}`);
    }
  });

  const handleAddSchedule = () => {
    setSelectedScheduleId(null);
    form.reset({
      staffId: 0,
      dayOfWeek: "Monday",
      startTime: "09:00",
      endTime: "17:00",
      location: "",
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

  const onSubmit = (data: ScheduleFormValues) => {
    console.log("Form submitted with data:", data);
    if (selectedScheduleId) {
      updateScheduleMutation.mutate(data);
    } else {
      createScheduleMutation.mutate(data);
    }
  };

  const getStaffName = (staffId: number) => {
    const staffMember = staff?.find((s: any) => s.id === staffId);
    if (!staffMember) return "Unknown Staff";
    return `${staffMember.user?.firstName || ""} ${staffMember.user?.lastName || ""}`.trim();
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
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarOpen ? 'ml-64' : 'ml-0'
      }`}>
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Appointment Availability
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isSchedulesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : schedules.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No schedules found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Get started by creating your first staff schedule.
                    </p>
                    <Button onClick={handleAddSchedule}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Schedule
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Day Of Week</TableHead>
                          <TableHead>Staff Member</TableHead>
                          <TableHead>Start Time</TableHead>
                          <TableHead>End Time</TableHead>
                          <TableHead>Service Categories</TableHead>
                          <TableHead>Date Range</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Privacy</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedules.map((schedule: any) => (
                          <TableRow key={schedule.id}>
                            <TableCell className="font-medium">
                              {schedule.dayOfWeek}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-2 text-gray-400" />
                                {getStaffName(schedule.staffId)}
                              </div>
                            </TableCell>
                            <TableCell>{schedule.startTime}</TableCell>
                            <TableCell>{schedule.endTime}</TableCell>
                            <TableCell>
                              <Badge variant={schedule.isBlocked ? "secondary" : "default"}>
                                {getServiceCategoriesText(schedule.serviceCategories)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDateRange(schedule.startDate, schedule.endDate)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                                {schedule.location}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                {schedule.isBlocked ? (
                                  <Badge variant="secondary">🔒 Blocked</Badge>
                                ) : (
                                  <Badge variant="outline">👥 Public</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
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
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

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

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                >
                  {createScheduleMutation.isPending || updateScheduleMutation.isPending
                    ? "Saving..."
                    : selectedScheduleId
                    ? "Update Schedule"
                    : "Create Schedule"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchedulePage;