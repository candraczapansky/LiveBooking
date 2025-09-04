import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Plus, Edit, Trash2, ArrowLeft, User, Building2, CalendarDays } from "lucide-react";
import { AddEditScheduleDialog } from "@/components/staff/add-edit-schedule-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthProvider";
import { useUserPermissions } from "@/hooks/use-user-permissions";

export default function StaffScheduleDetailPage() {
  try {
    const { id } = useParams<{ id: string }>();
    const staffId = parseInt(id);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<any>(null);
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth();
    const { hasPermission } = useUserPermissions();

    console.log('StaffScheduleDetailPage: Component initialized', {
      id,
      staffId,
      user: user ? { id: user.id, username: user.username, role: user.role } : null
    });

  // Set document title
  useDocumentTitle("Staff Working Hours | Glo Head Spa");

  // Check permissions
  const canEditAllSchedules = hasPermission('edit_schedules');
  const canEditOwnSchedule = hasPermission('edit_own_schedule');
  const canViewAllSchedules = hasPermission('view_schedules');
  const canViewOwnSchedule = hasPermission('view_own_schedule');

  // Check if user can access this schedule
  // For users with view_own_schedule, they can access their own schedule by matching user ID
  const canAccessSchedule = canViewAllSchedules || (canViewOwnSchedule && user?.id && staffMember?.userId === user.id);
  const canEditSchedule = canEditAllSchedules || (canEditOwnSchedule && user?.id && staffMember?.userId === user.id);

  // Debug logging
  console.log('Staff Schedule Detail Debug:', {
    staffId,
    user: user,
    staffMember: staffMember,
    canViewAllSchedules,
    canViewOwnSchedule,
    canEditAllSchedules,
    canEditOwnSchedule,
    canAccessSchedule,
    canEditSchedule,
    userStaffMatch: user?.id && staffMember?.userId === user.id
  });

  // Redirect if user doesn't have permission to view this schedule
  if (!canAccessSchedule) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
            <CardDescription className="text-center">
              You don't have permission to view this schedule.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/schedule">
              <Button variant="outline">Back to Schedules</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch staff member details
  const { data: staff = [], isLoading: staffLoading, error: staffError } = useQuery<any[]>({
    queryKey: ['/api/staff'],
    retry: 1,
    onError: (error) => {
      console.error('Error fetching staff:', error);
    }
  });

  // Fetch locations for display
  const { data: locations = [], isLoading: locationsLoading, error: locationsError } = useQuery<any[]>({
    queryKey: ['/api/locations'],
    retry: 1,
    onError: (error) => {
      console.error('Error fetching locations:', error);
    }
  });

  const staffMember = staff.find((s: any) => s.id === staffId);

  // Add error handling for missing staff member
  if (!staffMember && staff.length > 0) {
    console.error('Staff member not found:', { staffId, availableStaff: staff.map(s => ({ id: s.id, userId: s.userId, title: s.title })) });
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Staff Member Not Found</CardTitle>
            <CardDescription className="text-center">
              The requested staff member could not be found.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/schedule">
              <Button variant="outline">Back to Schedules</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch schedules for this staff member
  const { data: allSchedules = [], isLoading: schedulesLoading, error: schedulesError } = useQuery<any[]>({
    queryKey: ['/api/schedules'],
    staleTime: 0, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    retry: 1,
    onError: (error) => {
      console.error('Error fetching schedules:', error);
    }
  });

  const staffSchedules = allSchedules.filter((schedule: any) => schedule.staffId === staffId);

  // Group schedules by location for better organization
  const schedulesByLocation = staffSchedules.reduce((acc: any, schedule: any) => {
    const location = locations.find((loc: any) => loc.id === schedule.locationId);
    const locationName = location?.name || 'Unknown Location';
    
    if (!acc[locationName]) {
      acc[locationName] = [];
    }
    acc[locationName].push({ ...schedule, locationName });
    return acc;
  }, {});

  // Group schedules by day for weekly view
  const schedulesByDay = staffSchedules.reduce((acc: any, schedule: any) => {
    const dayName = schedule.dayOfWeek;
    if (!acc[dayName]) {
      acc[dayName] = [];
    }
    acc[dayName].push(schedule);
    return acc;
  }, {});

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      const response = await apiRequest("DELETE", `/api/schedules/${scheduleId}`);
      if (!response.ok) {
        throw new Error("Failed to delete schedule");
      }
    },
    onSuccess: () => {
      // Invalidate all schedules queries (including location-scoped keys)
      try {
        queryClient.invalidateQueries({ 
          predicate: (q) => Array.isArray((q as any).queryKey) && (q as any).queryKey[0] === '/api/schedules'
        });
        queryClient.refetchQueries({ 
          predicate: (q) => Array.isArray((q as any).queryKey) && (q as any).queryKey[0] === '/api/schedules'
        });
      } catch {}
      // Dispatch custom event to notify calendar
      try { window.dispatchEvent(new CustomEvent('schedule-updated')); } catch {}
      toast({
        title: "Success",
        description: "Schedule deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Failed to delete schedule:", error);
      toast({
        title: "Error",
        description: "Failed to delete schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (schedule: any) => {
    setEditingSchedule(schedule);
    setIsDialogOpen(true);
  };

  const handleDelete = async (scheduleId: number) => {
    if (window.confirm("Are you sure you want to delete this schedule?")) {
      deleteScheduleMutation.mutate(scheduleId);
    }
  };

  const getStaffName = () => {
    try {
      if (staffMember?.user) {
        return `${staffMember.user.firstName || ''} ${staffMember.user.lastName || ''}`.trim() || 'Unknown Staff';
      }
      return 'Unknown Staff';
    } catch (error) {
      console.error('Error getting staff name:', error);
      return 'Unknown Staff';
    }
  };

  const getLocationName = (locationId: number) => {
    try {
      const location = locations.find((loc: any) => loc.id === locationId);
      return location?.name || 'Unknown Location';
    } catch (error) {
      console.error('Error getting location name:', error);
      return 'Unknown Location';
    }
  };

  // Format HH:mm strings as h:mm AM/PM in Central Time (wall-clock)
  const formatCentralTime = (timeStr?: string) => {
    try {
      if (!timeStr) return '';
      const [hRaw, mRaw] = String(timeStr).split(":");
      const hours = Number(hRaw);
      const minutes = Number(mRaw);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return String(timeStr);
      const period = hours >= 12 ? 'PM' : 'AM';
      const hour12 = ((hours + 11) % 12) + 1;
      const mm = String(minutes).padStart(2, '0');
      return `${hour12}:${mm} ${period}`;
    } catch {
      return String(timeStr || '');
    }
  };

  if (!staffMember) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-4">Staff Member Not Found</h1>
          <Link href="/staff-schedule">
            <Button variant="default">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Staff Schedule
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Add loading state
  const isLoading = staffLoading || locationsLoading || schedulesLoading;
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-medium mb-2">Loading Schedule...</h3>
          <p className="text-muted-foreground">Please wait while we load the schedule data.</p>
        </div>
      </div>
    );
  }

  // Handle API errors
  if (staffError || locationsError || schedulesError) {
    console.error('API errors:', { staffError, locationsError, schedulesError });
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Error Loading Data</CardTitle>
            <CardDescription className="text-center">
              Failed to load schedule data. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {staffError && `Staff Error: ${staffError.message}`}
              {locationsError && `Locations Error: ${locationsError.message}`}
              {schedulesError && `Schedules Error: ${schedulesError.message}`}
            </p>
            <Link href="/schedule">
              <Button variant="outline">Back to Schedules</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/staff-schedule">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{getStaffName()}</h1>
              <p className="text-muted-foreground">{staffMember?.title || 'Unknown Title'}</p>
            </div>
          </div>
        </div>
        {canEditSchedule && (
          <Button 
            onClick={() => {
              setEditingSchedule(null);
              setIsDialogOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Schedule
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Schedules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffSchedules.length}</div>
            <p className="text-xs text-muted-foreground">Active schedules</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(schedulesByLocation).length}</div>
            <p className="text-xs text-muted-foreground">Different locations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Working Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(schedulesByDay).length}</div>
            <p className="text-xs text-muted-foreground">Days with schedules</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="locations" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            By Location
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Weekly View
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            All Schedules
          </TabsTrigger>
        </TabsList>

        {/* By Location View */}
        <TabsContent value="locations" className="mt-6">
          {Object.keys(schedulesByLocation).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No schedules by location</h3>
                <p className="text-muted-foreground">Add schedules to see them organized by location.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {Object.entries(schedulesByLocation).map(([locationName, schedules]) => (
                <Card key={locationName}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      {locationName}
                    </CardTitle>
                    <CardDescription>
                      {(schedules as any[]).length} schedule{(schedules as any[]).length !== 1 ? 's' : ''} at this location
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {(schedules as any[]).map((schedule: any) => (
                        <div key={schedule.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <Badge variant="outline">{schedule.dayOfWeek}</Badge>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {formatCentralTime(schedule.startTime)} - {formatCentralTime(schedule.endTime)}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(new Date(schedule.startDate), 'MMM dd, yyyy')}
                              {schedule.endDate && ` - ${format(new Date(schedule.endDate), 'MMM dd, yyyy')}`}
                            </div>
                            {schedule.isBlocked && (
                              <Badge variant="destructive">Blocked</Badge>
                            )}
                          </div>
                          {canEditSchedule && (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(schedule)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(schedule.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Weekly View */}
        <TabsContent value="weekly" className="mt-6">
          <div className="grid gap-4">
            {daysOfWeek.map((day) => {
              const daySchedules = schedulesByDay[day] || [];
              return (
                <Card key={day}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{day}</span>
                      <Badge variant={daySchedules.length > 0 ? "default" : "secondary"}>
                        {daySchedules.length} schedule{daySchedules.length !== 1 ? 's' : ''}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {daySchedules.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No schedules for this day</p>
                    ) : (
                      <div className="grid gap-3">
                        {daySchedules.map((schedule: any) => (
                          <div key={schedule.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                {formatCentralTime(schedule.startTime)} - {formatCentralTime(schedule.endTime)}
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                {getLocationName(schedule.locationId)}
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {format(new Date(schedule.startDate), 'MMM dd, yyyy')}
                                {schedule.endDate && ` - ${format(new Date(schedule.endDate), 'MMM dd, yyyy')}`}
                              </div>
                              {schedule.isBlocked && (
                                <Badge variant="destructive">Blocked</Badge>
                              )}
                            </div>
                            {canEditSchedule && (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(schedule)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(schedule.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* All Schedules View */}
        <TabsContent value="all" className="mt-6">
          {staffSchedules.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No schedules found</h3>
                <p className="text-muted-foreground">Add schedules to manage staff availability.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {staffSchedules.map((schedule: any) => (
                <Card key={schedule.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{schedule.dayOfWeek}</CardTitle>
                        <CardDescription>
                          {formatCentralTime(schedule.startTime)} - {formatCentralTime(schedule.endTime)}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(schedule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(schedule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Duration: {formatCentralTime(schedule.startTime)} - {formatCentralTime(schedule.endTime)}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Location: {getLocationName(schedule.locationId)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        From: {format(new Date(schedule.startDate), 'MMM dd, yyyy')}
                        {schedule.endDate && ` - ${format(new Date(schedule.endDate), 'MMM dd, yyyy')}`}
                      </div>
                    </div>
                    {schedule.serviceCategories && schedule.serviceCategories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {schedule.serviceCategories.map((category: string, index: number) => (
                          <Badge key={index} variant="secondary">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {schedule.isBlocked && (
                      <Badge variant="destructive" className="mt-2">Blocked</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddEditScheduleDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        schedule={editingSchedule}
        defaultStaffId={staffId}
        onSuccess={() => {
          console.log("Parent component forcing schedule refresh after edit");
          // Force immediate refresh of schedule data with small delay
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
            queryClient.refetchQueries({ queryKey: ['/api/schedules'] });
            // Dispatch custom event to notify calendar
            window.dispatchEvent(new CustomEvent('schedule-updated'));
            console.log("Schedule data refresh triggered from parent");
          }, 100);
        }}
      />
    </div>
  );
  } catch (error) {
    console.error('StaffScheduleDetailPage: Component crashed', error);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Error Loading Schedule</CardTitle>
            <CardDescription className="text-center">
              Something went wrong while loading the schedule. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Error: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <Link href="/schedule">
              <Button variant="outline">Back to Schedules</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
}