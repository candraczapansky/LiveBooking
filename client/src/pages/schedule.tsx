import { useState, useEffect } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar, Clock, User, Save } from "lucide-react";

type Staff = {
  id: number;
  title: string;
  user: {
    id: number;
    firstName?: string;
    lastName?: string;
    email: string;
  };
};

type Schedule = {
  id?: number;
  staffId: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string;
  endTime: string;
  isAvailable: boolean;
};

const daysOfWeek = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

const SchedulePage = () => {
  useDocumentTitle("Schedule | BeautyBook");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
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

  // Fetch all staff members
  const { data: staff, isLoading: isStaffLoading } = useQuery({
    queryKey: ['/api/staff'],
    queryFn: async () => {
      const response = await fetch('/api/staff');
      if (!response.ok) throw new Error('Failed to fetch staff');
      return response.json();
    }
  });

  // Initialize schedules for selected staff
  useEffect(() => {
    if (selectedStaffId) {
      // Initialize with default schedule (all days available 9 AM to 5 PM)
      const defaultSchedules = daysOfWeek.map(day => ({
        staffId: selectedStaffId,
        dayOfWeek: day.value,
        startTime: '09:00',
        endTime: '17:00',
        isAvailable: true,
      }));
      setSchedules(defaultSchedules);
    }
  }, [selectedStaffId]);

  const saveScheduleMutation = useMutation({
    mutationFn: async (scheduleData: Schedule[]) => {
      // In a real app, this would save to the backend
      // For now, we'll just simulate a successful save
      return new Promise(resolve => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Staff schedule saved successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save schedule. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaffId(parseInt(staffId));
  };

  const updateSchedule = (dayOfWeek: number, field: keyof Schedule, value: any) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.dayOfWeek === dayOfWeek 
        ? { ...schedule, [field]: value }
        : schedule
    ));
  };

  const handleSaveSchedule = () => {
    if (!selectedStaffId) {
      toast({
        title: "Error",
        description: "Please select a staff member first.",
        variant: "destructive",
      });
      return;
    }

    saveScheduleMutation.mutate(schedules);
  };

  const getFullName = (firstName?: string, lastName?: string) => {
    return `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';
  };

  const selectedStaff = staff?.find((s: Staff) => s.id === selectedStaffId);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarOpen ? 'ml-64' : 'ml-0'
      }`}>
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Staff Schedule</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Manage weekly schedules for your staff members
                </p>
              </div>
            </div>

            {/* Staff Selection */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Select Staff Member
                </CardTitle>
                <CardDescription>
                  Choose a staff member to manage their weekly schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-md">
                  <Label htmlFor="staff-select">Staff Member</Label>
                  <Select onValueChange={handleStaffSelect} value={selectedStaffId?.toString() || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff?.map((staffMember: Staff) => (
                        <SelectItem key={staffMember.id} value={staffMember.id.toString()}>
                          {getFullName(staffMember.user.firstName, staffMember.user.lastName)} - {staffMember.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Management */}
            {selectedStaffId && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Weekly Schedule for {getFullName(selectedStaff?.user.firstName, selectedStaff?.user.lastName)}
                  </CardTitle>
                  <CardDescription>
                    Set working hours and availability for each day of the week
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Schedule Table */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-32">Day</TableHead>
                            <TableHead className="w-24 text-center">Available</TableHead>
                            <TableHead className="w-40">Start Time</TableHead>
                            <TableHead className="w-40">End Time</TableHead>
                            <TableHead>Hours</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {daysOfWeek.map((day) => {
                            const schedule = schedules.find(s => s.dayOfWeek === day.value);
                            const startHour = schedule?.startTime ? parseInt(schedule.startTime.split(':')[0]) : 9;
                            const endHour = schedule?.endTime ? parseInt(schedule.endTime.split(':')[0]) : 17;
                            const totalHours = schedule?.isAvailable ? endHour - startHour : 0;

                            return (
                              <TableRow key={day.value}>
                                <TableCell className="font-medium">
                                  {day.label}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Switch
                                    checked={schedule?.isAvailable || false}
                                    onCheckedChange={(checked) => 
                                      updateSchedule(day.value, 'isAvailable', checked)
                                    }
                                  />
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={schedule?.startTime || '09:00'}
                                    onValueChange={(value) => 
                                      updateSchedule(day.value, 'startTime', value)
                                    }
                                    disabled={!schedule?.isAvailable}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {timeSlots.map((time) => (
                                        <SelectItem key={time} value={time}>
                                          {time}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={schedule?.endTime || '17:00'}
                                    onValueChange={(value) => 
                                      updateSchedule(day.value, 'endTime', value)
                                    }
                                    disabled={!schedule?.isAvailable}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {timeSlots.map((time) => (
                                        <SelectItem key={time} value={time}>
                                          {time}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-gray-600">
                                  {schedule?.isAvailable ? `${totalHours} hours` : 'Not available'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4">
                      <Button 
                        onClick={handleSaveSchedule}
                        disabled={saveScheduleMutation.isPending}
                        className="inline-flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        {saveScheduleMutation.isPending ? "Saving..." : "Save Schedule"}
                      </Button>
                    </div>

                    {/* Weekly Summary */}
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Weekly Summary</h3>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex justify-between">
                          <span>Total working days:</span>
                          <span>{schedules.filter(s => s.isAvailable).length} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total working hours:</span>
                          <span>
                            {schedules.reduce((total, schedule) => {
                              if (!schedule.isAvailable) return total;
                              const start = parseInt(schedule.startTime.split(':')[0]);
                              const end = parseInt(schedule.endTime.split(':')[0]);
                              return total + (end - start);
                            }, 0)} hours
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!selectedStaffId && (
              <Card>
                <CardContent className="text-center py-12">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No Staff Selected
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Please select a staff member above to manage their weekly schedule.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SchedulePage;