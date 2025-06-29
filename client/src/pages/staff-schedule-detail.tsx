import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Plus, Edit, Trash2, ArrowLeft, User } from "lucide-react";
import { AddEditScheduleDialog } from "@/components/staff/add-edit-schedule-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function StaffScheduleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const staffId = parseInt(id);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch staff member details
  const { data: staff = [] } = useQuery({
    queryKey: ['/api/staff'],
  });

  const staffMember = staff.find((s: any) => s.id === staffId);

  // Fetch schedules for this staff member
  const { data: allSchedules = [], isLoading } = useQuery({
    queryKey: ['/api/schedules'],
  });

  const staffSchedules = allSchedules.filter((schedule: any) => schedule.staffId === staffId);

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      const response = await apiRequest("DELETE", `/api/schedules/${scheduleId}`);
      if (!response.ok) {
        throw new Error("Failed to delete schedule");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
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
    if (staffMember?.user) {
      return `${staffMember.user.firstName} ${staffMember.user.lastName}`;
    }
    return 'Unknown Staff';
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
              <p className="text-muted-foreground">{staffMember.title}</p>
            </div>
          </div>
        </div>
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
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading schedules...</div>
      ) : staffSchedules.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No schedules found</h3>
            <p className="text-muted-foreground mb-4">
              Create the first schedule for {getStaffName()}.
            </p>
            <Button 
              onClick={() => {
                setEditingSchedule(null);
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
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
                      {schedule.startTime} - {schedule.endTime}
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
                    Duration: {schedule.startTime} - {schedule.endTime}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Location: {schedule.location}
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddEditScheduleDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        schedule={editingSchedule}
        defaultStaffId={staffId}
      />
    </div>
  );
}