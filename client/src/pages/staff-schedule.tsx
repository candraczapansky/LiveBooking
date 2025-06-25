import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
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
import { Calendar, Plus, Search } from "lucide-react";
import { useLocation } from "wouter";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function StaffSchedulePage() {
  useDocumentTitle("Staff Schedule | BeautyBook");
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
    return schedules.filter((schedule: any) => schedule.staffId === staffId).length;
  };

  const getStaffName = (staffMember: any) => {
    if (staffMember.user) {
      return `${staffMember.user.firstName} ${staffMember.user.lastName}`;
    }
    return 'Unknown Staff';
  };

  // Filter staff based on search and role
  const filteredStaff = staff.filter((staffMember: any) => {
    const name = getStaffName(staffMember).toLowerCase();
    const email = staffMember.user?.email?.toLowerCase() || '';
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || staffMember.title.toLowerCase().includes(roleFilter.toLowerCase());
    return matchesSearch && matchesRole;
  });

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
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-gray-100">Staff Schedule</h1>
                  <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">Manage staff availability and schedules</p>
                </div>
                <Button 
                  onClick={() => setLocation('/staff')}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Add New Staff</span>
                </Button>
              </div>

              {/* Search and Filter Controls */}
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by staff name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="stylist">Hair Stylist</SelectItem>
                    <SelectItem value="esthetician">Esthetician</SelectItem>
                    <SelectItem value="nail">Nail Technician</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Staff Schedule Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NAME</TableHead>
                      <TableHead>ROLE</TableHead>
                      <TableHead>PHONE NUMBER</TableHead>
                      <TableHead>EMAIL</TableHead>
                      <TableHead className="text-right">SCHEDULES</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.map((staffMember: any) => (
                      <TableRow 
                        key={staffMember.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setLocation(`/staff-schedule/${staffMember.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {getStaffName(staffMember).split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{getStaffName(staffMember)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{staffMember.title}</Badge>
                        </TableCell>
                        <TableCell>{staffMember.user?.phone || '-'}</TableCell>
                        <TableCell>{staffMember.user?.email}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">
                            {getScheduleCount(staffMember.id)} schedule{getScheduleCount(staffMember.id) !== 1 ? 's' : ''}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}