import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/use-document-title";
// import Header from "@/components/layout/header"; // Provided by MainLayout
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, ChevronRight, User, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthProvider";
import { useUserPermissions } from "@/hooks/use-user-permissions";

type StaffMember = {
  id: number;
  title: string;
  userId?: number;
  user?: {
    firstName?: string;
    lastName?: string;
  };
};

const SchedulePage = () => {
  useDocumentTitle("Staff Working Hours | Glo Head Spa");
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { hasPermission } = useUserPermissions();

  // Check if user can only view their own schedule
  const canViewOwnScheduleOnly = hasPermission('view_own_schedule') && !hasPermission('view_schedules');
  const canViewAllSchedules = hasPermission('view_schedules');

  // Debug logging (can be removed in production)
  // console.log('Schedule Page Debug:', {
  //   user: user,
  //   userKeys: user ? Object.keys(user) : [],
  //   canViewOwnScheduleOnly,
  //   canViewAllSchedules,
  //   hasViewOwnSchedule: hasPermission('view_own_schedule'),
  //   hasViewSchedules: hasPermission('view_schedules'),
  //   userStaffId: user?.staffId,
  //   userId: user?.id
  // });

  // Fetch staff for display
  const { data: allStaff = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ['/api/staff'],
  });

  // Filter staff based on permissions
  // For users who can only view their own schedule, find their staff record by userId
  const staff = canViewOwnScheduleOnly && user?.id 
    ? allStaff.filter(staffMember => {
        // Add error handling and type conversion
        const staffUserId = typeof staffMember.userId === 'string' 
          ? parseInt(staffMember.userId) 
          : staffMember.userId;
        const currentUserId = typeof user.id === 'string' 
          ? parseInt(user.id) 
          : user.id;
        return staffUserId === currentUserId;
      })
    : allStaff;

  // Debug logging (can be removed in production)
  // console.log('Schedule Page Staff Filter:', {
  //   allStaffCount: allStaff.length,
  //   filteredStaffCount: staff.length,
  //   userId: user?.id,
  //   canViewOwnScheduleOnly,
  //   sampleStaff: allStaff.slice(0, 2), // Show first 2 staff members to see structure
  //   filteredStaff: staff, // Show the filtered staff members
  //   // Debug the filtering logic
  //   staffWithUserId: allStaff.filter(s => s.userId === user?.id),
  //   allStaffUserIds: allStaff.map(s => ({ id: s.id, userId: s.userId, title: s.title }))
  // });

  // Fetch schedules to show count per staff member
  const { data: schedules = [] } = useQuery<any[]>({
    queryKey: ['/api/schedules'],
  });

  // Fetch locations for display
  const { data: locations = [] } = useQuery<any[]>({
    queryKey: ['/api/locations'],
  });

  const getScheduleCount = (staffId: number) => {
    return schedules.filter((schedule: any) => schedule.staffId === staffId).length;
  };

  const getStaffLocations = (staffId: number) => {
    const staffSchedules = schedules.filter((schedule: any) => schedule.staffId === staffId);
    const uniqueLocationIds = [...new Set(staffSchedules.map((schedule: any) => schedule.locationId))];
    return uniqueLocationIds.map((locationId: any) => {
      const location = locations.find((loc: any) => loc.id === locationId);
      return location?.name || 'Unknown Location';
    });
  };

  const getStaffName = (staffMember: StaffMember) => {
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

  const getInitials = (staffMember: StaffMember) => {
    try {
      if (staffMember?.user) {
        const firstName = staffMember.user.firstName || '';
        const lastName = staffMember.user.lastName || '';
        return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'US';
      }
      return 'US';
    } catch (error) {
      console.error('Error getting staff initials:', error);
      return 'US';
    }
  };

  // Filter staff based on search (only if user can view multiple staff)
  const filteredStaff = canViewAllSchedules 
    ? staff.filter((staffMember: StaffMember) => {
        const name = getStaffName(staffMember).toLowerCase();
        const title = staffMember.title.toLowerCase();
        return name.includes(searchQuery.toLowerCase()) || title.includes(searchQuery.toLowerCase());
      })
    : staff; // For own schedule only, no need to filter by search

  const handleStaffClick = (staffId: number) => {
    setLocation(`/staff-schedule/${staffId}`);
  };

  // Add error boundary to prevent crashes
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Loading...</h3>
          <p className="text-muted-foreground">Please wait while we load your data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="">
        <main className="p-3 lg:p-6">
          <div className="w-full max-w-screen-2xl mx-auto space-y-4 lg:space-y-6">
            {/* Page Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 lg:p-6 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h1 className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {canViewOwnScheduleOnly ? 'My Working Hours' : 'Staff Working Hours'}
                    </h1>
                    <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                      {canViewOwnScheduleOnly 
                        ? 'View and manage your working days and hours'
                        : 'Click on a staff member to set their working days and hours'
                      }
                    </p>
                  </div>
                  {canViewAllSchedules && (
                    <Button 
                      onClick={() => setLocation('/staff-schedule')}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">Manage All</span>
                    </Button>
                  )}
                </div>
                
                {canViewAllSchedules && (
                  <div className="w-full">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <Input
                        type="search"
                        placeholder="Search staff by name..."
                        className="pl-10 w-full min-h-[44px]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Staff List */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : filteredStaff?.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {canViewOwnScheduleOnly ? 'No schedule found' : 'No staff members found'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {canViewOwnScheduleOnly 
                    ? "You don't have a schedule set up yet. Contact your manager to set up your working hours."
                    : staff.length === 0 
                      ? "Add staff members to manage their schedules." 
                      : "No staff members match your search criteria."
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStaff?.map((staffMember: StaffMember) => {
                  try {
                    const scheduleCount = getScheduleCount(staffMember?.id || 0);
                    const staffLocations = getStaffLocations(staffMember?.id || 0);
                    return (
                    <Card 
                      key={staffMember.id} 
                      className="p-4 w-full shadow-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer"
                      onClick={() => handleStaffClick(staffMember.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12 flex-shrink-0">
                            <AvatarFallback className="text-sm font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                              {getInitials(staffMember)}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                              {getStaffName(staffMember)}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {staffMember.title}
                            </p>
                            {staffLocations.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {staffLocations.map((location: string, index: number) => (
                                  <Badge 
                                    key={index} 
                                    variant="secondary" 
                                    className="text-xs font-medium text-gray-700 dark:text-gray-200"
                                  >
                                    {location}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">
                            {scheduleCount} {scheduleCount === 1 ? 'schedule' : 'schedules'}
                          </Badge>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </Card>
                    );
                  } catch (error) {
                    console.error('Error rendering staff member:', error, staffMember);
                    return (
                      <Card key={staffMember?.id || 'error'} className="p-4 w-full shadow-sm border border-red-200 rounded-xl">
                        <div className="text-center text-red-600">
                          <p>Error loading staff member data</p>
                        </div>
                      </Card>
                    );
                  }
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SchedulePage;