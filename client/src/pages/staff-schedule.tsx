import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Plus, User, ChevronRight } from "lucide-react";
import { Link } from "wouter";

export default function StaffSchedulePage() {
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

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Staff Schedule</h1>
          <p className="text-muted-foreground">Manage staff availability for appointments and services.</p>
        </div>
        <Link href="/staff-schedule/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Schedule
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading staff...</div>
      ) : staff.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No staff members found</h3>
            <p className="text-muted-foreground mb-4">
              Add staff members first to create schedules.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {staff.map((staffMember: any) => {
            const scheduleCount = getScheduleCount(staffMember.id);
            return (
              <Link key={staffMember.id} href={`/staff-schedule/${staffMember.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {getStaffName(staffMember)}
                          </CardTitle>
                          <CardDescription>{staffMember.title}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">
                          {scheduleCount} {scheduleCount === 1 ? 'schedule' : 'schedules'}
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {scheduleCount > 0 ? `${scheduleCount} active schedules` : 'No schedules set'}
                      </div>
                      {staffMember.user?.email && (
                        <div className="flex items-center gap-1">
                          <span>•</span>
                          <span>{staffMember.user.email}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}