import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { staffService, type StaffSchedule } from "@/services/staffService";

export function useScheduleManagement(staffId?: number) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<StaffSchedule | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch schedules
  const {
    data: allSchedules = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['/api/schedules'],
    queryFn: staffService.getAllSchedules,
  });

  // Filter schedules for specific staff if staffId provided
  const schedules = staffId 
    ? allSchedules.filter(schedule => schedule.staffId === staffId)
    : allSchedules;

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: (data: StaffSchedule) => staffService.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      toast({
        title: "Success",
        description: "Schedule created successfully.",
      });
      setIsDialogOpen(false);
      setEditingSchedule(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create schedule: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<StaffSchedule> }) => 
      staffService.updateSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      toast({
        title: "Success",
        description: "Schedule updated successfully.",
      });
      setIsDialogOpen(false);
      setEditingSchedule(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update schedule: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: (scheduleId: number) => staffService.deleteSchedule(scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      toast({
        title: "Success",
        description: "Schedule deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete schedule: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Action handlers
  const handleAddSchedule = (defaultStaffId?: number) => {
    setEditingSchedule(null);
    setIsDialogOpen(true);
  };

  const handleEditSchedule = (schedule: StaffSchedule) => {
    setEditingSchedule(schedule);
    setIsDialogOpen(true);
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (window.confirm("Are you sure you want to delete this schedule?")) {
      deleteScheduleMutation.mutate(scheduleId);
    }
  };

  const handleSubmitSchedule = (data: StaffSchedule) => {
    if (editingSchedule?.id) {
      updateScheduleMutation.mutate({ 
        id: editingSchedule.id, 
        data 
      });
    } else {
      createScheduleMutation.mutate(data);
    }
  };

  const getScheduleCount = (staffId: number) => {
    return allSchedules.filter(schedule => schedule.staffId === staffId).length;
  };

  return {
    // Data
    schedules,
    allSchedules,
    isLoading,
    error,
    
    // Dialog state
    isDialogOpen,
    editingSchedule,
    
    // Mutations
    createScheduleMutation,
    updateScheduleMutation,
    deleteScheduleMutation,
    
    // Actions
    handleAddSchedule,
    handleEditSchedule,
    handleDeleteSchedule,
    handleSubmitSchedule,
    getScheduleCount,
    setIsDialogOpen,
    setEditingSchedule,
  };
}