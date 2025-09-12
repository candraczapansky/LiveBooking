import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Clock, Calendar, User, MapPin } from "lucide-react";

interface EditAvailabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: number;
  date: Date;
  locationId?: number;
  existingSchedule?: any;
  isRecurring?: boolean;
}

export function EditAvailabilityDialog({ 
  open, 
  onOpenChange, 
  staffId, 
  date, 
  locationId,
  existingSchedule,
  isRecurring = false
}: EditAvailabilityDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Form state
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>(locationId?.toString() || "");
  const [createOverride, setCreateOverride] = useState(true); // Default to creating an override for the specific date
  
  // Fetch staff member info
  const { data: staff = [] } = useQuery({
    queryKey: ['/api/staff'],
  });
  
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });
  
  const { data: locations = [] } = useQuery({
    queryKey: ['/api/locations'],
  });

  const staffMember = staff.find((s: any) => s.id === staffId);
  const user = users.find((u: any) => u.id === staffMember?.userId || u.id === staffMember?.user_id);
  const staffName = user ? 
    `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 
    staffMember?.title || `Staff #${staffId}`;

  // Fetch all schedules to check for existing one-time overrides
  const { data: allSchedules = [] } = useQuery({
    queryKey: ['/api/schedules'],
    enabled: open,
  });
  
  // Check if there's already a one-time schedule for this specific date
  const existingOverride = useMemo(() => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return allSchedules.find((s: any) => 
      s.staffId === staffId &&
      s.locationId === locationId &&
      s.startDate === dateStr &&
      s.endDate === dateStr
    );
  }, [allSchedules, staffId, locationId, date]);

  // Initialize form with existing schedule data or override
  useEffect(() => {
    const scheduleToUse = existingOverride || existingSchedule;
    if (scheduleToUse) {
      setStartTime(scheduleToUse.startTime || "09:00");
      setEndTime(scheduleToUse.endTime || "17:00");
      setIsBlocked(scheduleToUse.isBlocked || false);
      setBlockReason(scheduleToUse.blockReason || "");
      setSelectedLocationId(scheduleToUse.locationId?.toString() || locationId?.toString() || "");
    } else {
      // Reset to defaults when no existing schedule
      setStartTime("09:00");
      setEndTime("17:00");
      setIsBlocked(false);
      setBlockReason("");
      setSelectedLocationId(locationId?.toString() || "");
    }
  }, [existingSchedule, existingOverride, locationId]);
  
  // Create or update schedule mutation
  const saveScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      if (existingOverride) {
        // Update existing one-time override
        const response = await apiRequest("PUT", `/api/schedules/${existingOverride.id}`, data);
        if (!response.ok) throw new Error("Failed to update schedule");
        return response.json();
      } else {
        // Create new one-time schedule for this specific date
        const response = await apiRequest("POST", "/api/schedules", data);
        if (!response.ok) throw new Error("Failed to create schedule");
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      queryClient.refetchQueries({ queryKey: ['/api/schedules'] });
      
      // Dispatch custom event to notify calendar
      try {
        window.dispatchEvent(new CustomEvent('schedule-updated'));
      } catch {}
      
      toast({
        title: "Success",
        description: existingOverride 
          ? "Schedule override updated successfully for this date"
          : "Schedule override created successfully for this date",
      });
      
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Failed to save schedule:", error);
      toast({
        title: "Error",
        description: "Failed to save schedule. Please try again.",
        variant: "destructive",
      });
    },
  });


  const handleSave = () => {
    // Validate times
    if (!startTime || !endTime) {
      toast({
        title: "Error",
        description: "Please select both start and end times",
        variant: "destructive",
      });
      return;
    }

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes >= endMinutes) {
      toast({
        title: "Error",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    const dayOfWeek = format(date, 'EEEE');
    
    if (existingOverride) {
      // When updating an existing override, only send changed fields
      const updateData: any = {};
      
      if (startTime !== existingOverride.startTime) {
        updateData.startTime = startTime;
      }
      if (endTime !== existingOverride.endTime) {
        updateData.endTime = endTime;
      }
      if (selectedLocationId && parseInt(selectedLocationId) !== existingOverride.locationId) {
        updateData.locationId = parseInt(selectedLocationId);
      }
      if (isBlocked !== existingOverride.isBlocked) {
        updateData.isBlocked = isBlocked;
      }
      if (isBlocked && blockReason !== existingOverride.blockReason) {
        updateData.blockReason = blockReason;
      }
      
      // Only update if there are actual changes
      if (Object.keys(updateData).length > 0) {
        saveScheduleMutation.mutate(updateData);
      } else {
        toast({
          title: "No Changes",
          description: "No changes were made to the schedule",
        });
        onOpenChange(false);
      }
    } else {
      // Create a new one-time schedule for this specific date
      const scheduleData = {
        staffId,
        locationId: selectedLocationId ? parseInt(selectedLocationId) : null,
        dayOfWeek,
        startTime,
        endTime,
        isBlocked,
        blockReason: isBlocked ? blockReason : null,
        // For one-time schedules, include the specific date
        startDate: format(date, 'yyyy-MM-dd'),
        endDate: format(date, 'yyyy-MM-dd'),
        isOneTime: true,
      };
      
      saveScheduleMutation.mutate(scheduleData);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Set Availability Override
          </DialogTitle>
          <DialogDescription>
            {existingOverride 
              ? `Update the schedule override for ${staffName} on ${format(date, 'EEEE, MMMM d, yyyy')}.`
              : `Create a one-time schedule override for ${staffName} on ${format(date, 'EEEE, MMMM d, yyyy')}. This will override any existing recurring schedule for this date only.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Staff Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{staffName}</span>
          </div>

          {/* Location */}
          <div className="grid gap-2">
            <Label htmlFor="location">
              <MapPin className="inline h-4 w-4 mr-1" />
              Location
            </Label>
            <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
              <SelectTrigger id="location">
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {(locations as any[]).map((loc: any) => (
                  <SelectItem key={loc.id} value={loc.id.toString()}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start-time">
                <Clock className="inline h-4 w-4 mr-1" />
                Start Time
              </Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end-time">
                <Clock className="inline h-4 w-4 mr-1" />
                End Time
              </Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Block Schedule Option */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-blocked"
                checked={isBlocked}
                onCheckedChange={(checked) => setIsBlocked(checked as boolean)}
              />
              <Label htmlFor="is-blocked" className="font-normal">
                Block this time slot (make unavailable for bookings)
              </Label>
            </div>
            
            {isBlocked && (
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg space-y-3">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Blocking this time will make it unavailable for client bookings during the specified hours.
                </p>
                <div className="grid gap-2">
                  <Label htmlFor="block-reason">Reason (optional)</Label>
                  <Input
                    id="block-reason"
                    placeholder="e.g., Lunch break, Meeting, Personal time, etc."
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          {existingOverride && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (window.confirm("Remove this schedule override and revert to the regular schedule?")) {
                  // Delete the override
                  apiRequest("DELETE", `/api/schedules/${existingOverride.id}`)
                    .then(() => {
                      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
                      queryClient.refetchQueries({ queryKey: ['/api/schedules'] });
                      window.dispatchEvent(new CustomEvent('schedule-updated'));
                      toast({
                        title: "Success",
                        description: "Schedule override removed successfully",
                      });
                      onOpenChange(false);
                    })
                    .catch((error) => {
                      console.error("Failed to delete override:", error);
                      toast({
                        title: "Error",
                        description: "Failed to remove override. Please try again.",
                        variant: "destructive",
                      });
                    });
                }
              }}
            >
              Remove Override
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saveScheduleMutation.isPending}
          >
            {saveScheduleMutation.isPending 
              ? (existingOverride ? "Updating..." : "Creating...")
              : (existingOverride ? "Update Override" : "Create Override")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
