import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, User, Plus, Trash2, Edit3 } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useAuth } from "@/contexts/AuthProvider";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { useLocation } from "@/contexts/LocationContext";
import { toast } from "sonner";

export default function StaffScheduleDetailSimplePage() {
  console.log('StaffScheduleDetailSimplePage: Starting component');
  
  // All hooks must be called at the top level, before any conditional logic
  const { id } = useParams<{ id: string }>();
  const staffId = parseInt(id || '0');
  const { user } = useAuth();
  const { hasPermission } = useUserPermissions();
  const { selectedLocation } = useLocation();
  const queryClient = useQueryClient();

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    dayOfWeek: '',
    startTime: '',
    endTime: '',
    locationId: selectedLocation?.id || ''
  });
  
  // Set document title
  useDocumentTitle("Staff Schedule | Glo Head Spa");

  // Check permissions
  const canViewAllSchedules = hasPermission('view_schedules');
  const canViewOwnSchedule = hasPermission('view_own_schedule');
  const canEditAllSchedules = hasPermission('edit_schedules');
  const canEditOwnSchedule = hasPermission('edit_own_schedule');

  // Fetch staff member details
  const { data: staff = [], isLoading: staffLoading, error: staffError } = useQuery<any[]>({
    queryKey: ['/api/staff'],
    retry: 1,
    onError: (error) => {
      console.error('Error fetching staff:', error);
    }
  });

  // Fetch all schedules and filter client-side (same as original)
  const { data: allSchedules = [], isLoading: schedulesLoading, error: schedulesError } = useQuery<any[]>({
    queryKey: ['/api/schedules'],
    staleTime: 0, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    retry: 1,
    onError: (error) => {
      console.error('Error fetching schedules:', error);
    }
  });

  // Filter schedules for this specific staff member
  const schedules = allSchedules.filter((schedule: any) => schedule.staffId === staffId);

  // Fetch locations for the form
  const { data: locations = [], isLoading: locationsLoading } = useQuery<any[]>({
    queryKey: ['/api/locations'],
    retry: 1,
    onError: (error) => {
      console.error('Error fetching locations:', error);
    }
  });

  // Schedule deletion mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Schedule deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
    },
    onError: (error) => {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete schedule');
    },
  });

  // Schedule creation mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staffId,
          dayOfWeek: data.dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
          locationId: parseInt(data.locationId)
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to create schedule');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Schedule created successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Error creating schedule:', error);
      toast.error('Failed to create schedule');
    },
  });

  // Schedule update mutation
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/schedules/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dayOfWeek: data.dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
          locationId: parseInt(data.locationId)
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to update schedule');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Schedule updated successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Error updating schedule:', error);
      toast.error('Failed to update schedule');
    },
  });

  // Helper function to format time (same as original formatCentralTime)
  const formatTime = (timeStr?: string) => {
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

  // Helper function to format day
  const formatDay = (day: string | undefined | null) => {
    if (!day) return 'Unknown Day';
    
    try {
      const days = {
        'monday': 'Monday',
        'tuesday': 'Tuesday', 
        'wednesday': 'Wednesday',
        'thursday': 'Thursday',
        'friday': 'Friday',
        'saturday': 'Saturday',
        'sunday': 'Sunday'
      };
      return days[day.toLowerCase() as keyof typeof days] || day;
    } catch (error) {
      console.error('Error formatting day:', error, 'day:', day);
      return day || 'Unknown Day';
    }
  };

  // Get staff name safely
  const getStaffName = () => {
    try {
      const staffMember = staff.find((s: any) => s.id === staffId);
      if (staffMember?.user) {
        return `${staffMember.user.firstName || ''} ${staffMember.user.lastName || ''}`.trim() || 'Unknown Staff';
      }
      return 'Unknown Staff';
    } catch (error) {
      console.error('Error getting staff name:', error);
      return 'Unknown Staff';
    }
  };

  // Form helper functions
  const resetForm = () => {
    setFormData({
      dayOfWeek: '',
      startTime: '',
      endTime: '',
      locationId: selectedLocation?.id || ''
    });
    setEditingSchedule(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (schedule: any) => {
    setFormData({
      dayOfWeek: schedule.dayOfWeek || '',
      startTime: schedule.startTime || '',
      endTime: schedule.endTime || '',
      locationId: schedule.locationId || selectedLocation?.id || ''
    });
    setEditingSchedule(schedule);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.dayOfWeek || !formData.startTime || !formData.endTime || !formData.locationId) {
      toast.error('Please fill in all fields');
      return;
    }

    if (editingSchedule) {
      updateScheduleMutation.mutate({ id: editingSchedule.id, data: formData });
    } else {
      createScheduleMutation.mutate(formData);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  try {
    console.log('StaffScheduleDetailSimplePage: Basic data loaded', {
      id,
      staffId,
      user: user ? { id: user.id, username: user.username, role: user.role } : null
    });

    console.log('StaffScheduleDetailSimplePage: Permissions checked', {
      canViewAllSchedules,
      canViewOwnSchedule,
      canEditAllSchedules,
      canEditOwnSchedule
    });

    console.log('StaffScheduleDetailSimplePage: Staff data loaded', {
      staffCount: staff.length,
      staffError: staffError?.message
    });

    const staffMember = staff.find((s: any) => s.id === staffId);

    console.log('StaffScheduleDetailSimplePage: Schedules data loaded', {
      allSchedulesCount: allSchedules.length,
      filteredSchedulesCount: schedules.length,
      staffId,
      schedulesError: schedulesError?.message,
      sampleSchedule: schedules[0],
      allSchedules: allSchedules,
      filteredSchedules: schedules
    });

    console.log('StaffScheduleDetailSimplePage: Staff member found', {
      staffMember: staffMember ? {
        id: staffMember.id,
        userId: staffMember.userId,
        title: staffMember.title,
        hasUser: !!staffMember.user
      } : null
    });

    // Check if user can access this schedule
    const canAccessSchedule = canViewAllSchedules || (canViewOwnSchedule && user?.id && staffMember?.userId === user.id);
    const canEditSchedule = canEditAllSchedules || (canEditOwnSchedule && user?.id && staffMember?.userId === user.id);

    console.log('StaffScheduleDetailSimplePage: Access check', {
      canAccessSchedule,
      canEditSchedule,
      userStaffMatch: user?.id && staffMember?.userId === user.id
    });

    // Loading state
    if (staffLoading || schedulesLoading || locationsLoading) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Loading...</h3>
            <p className="text-muted-foreground">Please wait while we load the data.</p>
          </div>
        </div>
      );
    }

    // Error state
    if (staffError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-red-600">Error Loading Data</CardTitle>
              <CardDescription className="text-center">
                Failed to load staff data.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Error: {staffError.message}
              </p>
              <Link href="/schedule">
                <Button variant="outline">Back to Schedules</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Staff member not found
    if (!staffMember && staff.length > 0) {
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

    // Access denied
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



    console.log('StaffScheduleDetailSimplePage: Rendering main content');

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/schedule">
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
              <Button>
                Edit Schedule
              </Button>
            )}
          </div>

          <div className="grid gap-6">
            {/* Current Schedule */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Current Schedule</CardTitle>
                    <CardDescription>
                      Weekly schedule for {getStaffName()}
                    </CardDescription>
                  </div>
                  {canEditSchedule && (
                    <Button onClick={openCreateDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Schedule
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {schedules.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Schedule Found</h3>
                    <p className="text-muted-foreground mb-4">
                      {getStaffName()} doesn't have any scheduled hours yet.
                    </p>
                    {canEditSchedule && (
                      <Button onClick={openCreateDialog}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Schedule
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {schedules.map((schedule: any) => {
                      // Add safety checks for schedule data
                      if (!schedule || !schedule.id) {
                        console.warn('Invalid schedule data:', schedule);
                        return null;
                      }
                      
                      return (
                        <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-4">
                              <div className="w-20 text-sm font-medium">
                                {formatDay(schedule.dayOfWeek)}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm">
                                  {formatTime(schedule.startTime || '')} - {formatTime(schedule.endTime || '')}
                                </div>
                                {schedule.location && (
                                  <div className="text-xs text-muted-foreground">
                                    Location: {schedule.location.name || 'Unknown Location'}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {canEditSchedule && (
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openEditDialog(schedule)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this schedule?')) {
                                    deleteScheduleMutation.mutate(schedule.id);
                                  }
                                }}
                                disabled={deleteScheduleMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    }).filter(Boolean)}
                  </div>
                )}
              </CardContent>
            </Card>


          </div>

          {/* Schedule Create/Edit Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
                </DialogTitle>
                <DialogDescription>
                  {editingSchedule 
                    ? 'Update the schedule details below.' 
                    : 'Add a new schedule entry for this staff member.'
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="dayOfWeek">Day of Week</Label>
                    <Select 
                      value={formData.dayOfWeek} 
                      onValueChange={(value) => handleInputChange('dayOfWeek', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">Monday</SelectItem>
                        <SelectItem value="tuesday">Tuesday</SelectItem>
                        <SelectItem value="wednesday">Wednesday</SelectItem>
                        <SelectItem value="thursday">Thursday</SelectItem>
                        <SelectItem value="friday">Friday</SelectItem>
                        <SelectItem value="saturday">Saturday</SelectItem>
                        <SelectItem value="sunday">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => handleInputChange('endTime', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="locationId">Location</Label>
                    <Select 
                      value={formData.locationId} 
                      onValueChange={(value) => handleInputChange('locationId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location: any) => (
                          <SelectItem key={location.id} value={location.id.toString()}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                  >
                    {createScheduleMutation.isPending || updateScheduleMutation.isPending 
                      ? 'Saving...' 
                      : editingSchedule ? 'Update Schedule' : 'Create Schedule'
                    }
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );

  } catch (error) {
    console.error('StaffScheduleDetailSimplePage: Component crashed', error);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Error Loading Schedule</CardTitle>
            <CardDescription className="text-center">
              Something went wrong while loading the schedule.
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
