import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Plus, Search, Filter, MoreHorizontal } from "lucide-react";
import { Link, useLocation } from "wouter";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function StaffSchedulePage() {
  useDocumentTitle("Staff Working Hours | Glo Head Spa");
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Fetch staff for display
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['/api/staff'],
  });

  // Fetch schedules to show count per staff member
  const { data: schedules = [] } = useQuery({
    queryKey: ['/api/schedules'],
  });

  const getScheduleCount = (staffId: number) => {
    return (schedules as any[]).filter((schedule: any) => schedule.staffId === staffId).length;
  };

  const getStaffName = (staffMember: any) => {
    if (staffMember.user) {
      return `${staffMember.user.firstName} ${staffMember.user.lastName}`;
    }
    return 'Unknown Staff';
  };

  const getInitials = (staffMember: any) => {
    if (staffMember.user) {
      const firstName = staffMember.user.firstName || '';
      const lastName = staffMember.user.lastName || '';
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }
    return 'US';
  };

  // Filter staff based on search and role
  const filteredStaff = (staff as any[]).filter((staffMember: any) => {
    const name = getStaffName(staffMember).toLowerCase();
    const email = staffMember.user?.email?.toLowerCase() || '';
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || staffMember.title.toLowerCase().includes(roleFilter.toLowerCase());
    return matchesSearch && matchesRole;
  });

  // Get unique roles for filter
  const uniqueRoles = Array.from(new Set((staff as any[]).map((s: any) => s.title)));

  const handleRowClick = (staffId: number) => {
    setLocation(`/staff-schedule/${staffId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="hidden lg:block">
        <SidebarController />
      </div>
      
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 md:p-6 pb-4 sm:pb-6 overflow-x-hidden">
          <div className="w-full max-w-none sm:max-w-7xl mx-auto px-0 sm:px-4">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold">Staff Working Hours</h1>
                <p className="text-muted-foreground">Set staff availability, working days, and time slots</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                    💡 Need to manage client appointments? Go to "Client Appointments" in the sidebar
                  </div>
                </div>
              </div>
              <Button 
                className="flex items-center gap-2"
                onClick={() => setLocation('/staff')}
              >
                <Plus className="h-4 w-4" />
                Add New Staff
              </Button>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by staff name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {uniqueRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">Loading staff...</div>
            ) : filteredStaff.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No staff members found</h3>
                <p className="text-muted-foreground mb-4">
                  {(staff as any[]).length === 0 
                    ? "Add staff members to manage their schedules." 
                    : "No staff members match your search criteria."
                  }
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NAME</TableHead>
                      <TableHead>ROLE</TableHead>
                      <TableHead>PHONE NUMBER</TableHead>
                      <TableHead>EMAIL</TableHead>
                      <TableHead>SCHEDULES</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.map((staffMember: any) => {
                      const scheduleCount = getScheduleCount(staffMember.id);
                      return (
                        <TableRow 
                          key={staffMember.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(staffMember.id)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {getInitials(staffMember)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{getStaffName(staffMember)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-normal">
                              {staffMember.title}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-primary">
                            {staffMember.user?.phone || '-'}
                          </TableCell>
                          <TableCell className="text-primary">
                            {staffMember.user?.email || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {scheduleCount} {scheduleCount === 1 ? 'schedule' : 'schedules'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination placeholder */}
            {filteredStaff.length > 0 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Rows per page: 10
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <span className="text-sm">1</span>
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}