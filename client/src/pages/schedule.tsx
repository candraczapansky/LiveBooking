import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, ChevronRight, User, Plus } from "lucide-react";
import { useLocation } from "wouter";

type StaffMember = {
  id: number;
  title: string;
  user?: {
    firstName?: string;
    lastName?: string;
  };
};

const SchedulePage = () => {
  useDocumentTitle("Staff Schedule | BeautyBook");
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  // Fetch staff for display
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['/api/staff'],
  });

  // Fetch schedules to show count per staff member
  const { data: schedules = [] } = useQuery({
    queryKey: ['/api/schedules'],
  });

  const getScheduleCount = (staffId: number) => {
    return schedules.filter((schedule: any) => schedule.staffId === staffId).length;
  };

  const getStaffName = (staffMember: StaffMember) => {
    if (staffMember.user) {
      return `${staffMember.user.firstName || ''} ${staffMember.user.lastName || ''}`.trim() || 'Unknown Staff';
    }
    return 'Unknown Staff';
  };

  const getInitials = (staffMember: StaffMember) => {
    if (staffMember.user) {
      const firstName = staffMember.user.firstName || '';
      const lastName = staffMember.user.lastName || '';
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'US';
    }
    return 'US';
  };

  // Filter staff based on search
  const filteredStaff = staff.filter((staffMember: StaffMember) => {
    const name = getStaffName(staffMember).toLowerCase();
    const title = staffMember.title.toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || title.includes(searchQuery.toLowerCase());
  });

  const handleStaffClick = (staffId: number) => {
    setLocation(`/staff-schedule/${staffId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="hidden lg:block fixed inset-y-0 left-0 z-50 w-64">
        <SidebarController />
      </div>
      
      <div className="lg:pl-64">
        <Header />
        
        <main className="p-3 lg:p-6">
          <div className="w-full space-y-4 lg:space-y-6">
            {/* Page Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 lg:p-6 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h1 className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-gray-100">
                      Staff Schedules
                    </h1>
                    <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                      Click on a staff member to view and manage their schedule
                    </p>
                  </div>
                  <Button 
                    onClick={() => setLocation('/staff-schedule')}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">Manage All</span>
                  </Button>
                </div>
                
                <div className="w-full">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <Input
                      type="search"
                      placeholder="Search staff by name..."
                      className="pl-8 w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
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
                <h3 className="text-lg font-medium mb-2">No staff members found</h3>
                <p className="text-muted-foreground mb-4">
                  {staff.length === 0 
                    ? "Add staff members to manage their schedules." 
                    : "No staff members match your search criteria."
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStaff?.map((staffMember: StaffMember) => {
                  const scheduleCount = getScheduleCount(staffMember.id);
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