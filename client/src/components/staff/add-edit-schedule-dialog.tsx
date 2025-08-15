import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const formSchema = z.object({
  staffId: z.string().min(1, "Staff member is required"),
  daysOfWeek: z.array(z.string()).min(1, "At least one day must be selected"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().min(1, "Location is required"),
  serviceCategories: z.array(z.string()).optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  isBlocked: z.boolean().optional(),
});

interface AddEditScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: any;
  defaultStaffId?: number;
  onSuccess?: () => void;
}

export function AddEditScheduleDialog({ open, onOpenChange, schedule, defaultStaffId, onSuccess }: AddEditScheduleDialogProps) {
  const queryClient = useQueryClient();
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const { toast } = useToast();

  // Fetch staff for dropdown
  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ['/api/staff'],
  });

  // Fetch service categories
  const { data: serviceCategories = [] } = useQuery<any[]>({
    queryKey: ['/api/service-categories'],
  });

  // Fetch business locations for location options
  const { data: locations = [] } = useQuery<any[]>({
    queryKey: ['/api/locations'],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(() => ({
      staffId: schedule?.staffId?.toString() || defaultStaffId?.toString() || "",
      daysOfWeek: schedule?.dayOfWeek ? [schedule.dayOfWeek] : [],
      startTime: schedule?.startTime || "09:00",
      endTime: schedule?.endTime || "17:00",
      location: schedule?.location || "All Locations",
      serviceCategories: schedule?.serviceCategories || [],
      startDate: schedule?.startDate || format(new Date(), 'yyyy-MM-dd'),
      endDate: schedule?.endDate || "",
      isBlocked: schedule?.isBlocked || false,
    }), [schedule, defaultStaffId]),
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/schedules", data);
      if (!response.ok) {
        throw new Error("Failed to create schedule");
      }
      return response.json();
    },
    onSuccess: () => {
      // Success handling is done manually in onSubmit for multiple schedules
    },
    onError: (error) => {
      console.error("Failed to save schedules:", error);
      toast({
        title: "Error",
        description: "Failed to create schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Frontend sending schedule update data:", data);
      const response = await apiRequest("PUT", `/api/schedules/${schedule.id}`, data);
      if (!response.ok) {
        throw new Error("Failed to update schedule");
      }
      const result = await response.json();
      console.log("Frontend received schedule update result:", result);
      return result;
    },
    onSuccess: () => {
      // Force refresh all schedule data with multiple strategies
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      
      // Force immediate refetch to update UI
      queryClient.refetchQueries({ queryKey: ['/api/schedules'] });
      
      // Additional cache clearing for any potential related queries
      queryClient.removeQueries({ queryKey: ['/api/schedules'] });
      
      // Call parent callback for additional refresh
      onSuccess?.();
      
      toast({
        title: "Success",
        description: "Schedule updated successfully.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Failed to update schedule:", error);
      toast({
        title: "Error",
        description: "Failed to update schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (schedule) {
      // For editing, keep the original day and update other fields
      const scheduleData = {
        ...data,
        dayOfWeek: schedule.dayOfWeek, // Keep the original day when editing
        staffId: parseInt(data.staffId),
        serviceCategories: data.serviceCategories || [],
        endDate: data.endDate || null,
        isBlocked: data.isBlocked || false,
      };
      console.log("Submitting schedule edit with data:", scheduleData);
      updateScheduleMutation.mutate(scheduleData);
    } else {
      // For creating, create a schedule for each selected day
      try {
        const baseScheduleData = {
          staffId: parseInt(data.staffId),
          startTime: data.startTime,
          endTime: data.endTime,
          location: data.location,
          serviceCategories: data.serviceCategories || [],
          startDate: data.startDate,
          endDate: data.endDate || null,
          isBlocked: data.isBlocked || false,
        };

        // Create schedules sequentially for each selected day
        for (const day of data.daysOfWeek) {
          const scheduleData = {
            ...baseScheduleData,
            dayOfWeek: day,
          };
          await createScheduleMutation.mutateAsync(scheduleData);
        }

        // Close dialog and show success message after all schedules are created
        queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
        toast({
          title: "Success",
          description: `${data.daysOfWeek.length} schedule(s) created successfully.`,
        });
        onOpenChange(false);
        form.reset({
          staffId: defaultStaffId?.toString() || "",
          daysOfWeek: [],
          startTime: "09:00",
          endTime: "17:00",
          location: "All Locations",
          serviceCategories: [],
          startDate: format(new Date(), 'yyyy-MM-dd'),
          endDate: "",
          isBlocked: false,
        });
      } catch (error) {
        console.error("Failed to create schedules:", error);
        toast({
          title: "Error",
          description: "Failed to create schedule(s). Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const daysOfWeek = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
  ];

  const getStaffName = (staffMember: any) => {
    if (staffMember.user) {
      return `${staffMember.user.firstName} ${staffMember.user.lastName}`;
    }
    return 'Unknown Staff';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {schedule ? "Edit Schedule" : "Add New Schedule"}
          </DialogTitle>
          <DialogDescription>
            {schedule ? "Update the schedule details." : "Create a new schedule for staff availability."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="staffId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Member</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(staff as any[]).map((staffMember: any) => (
                        <SelectItem key={staffMember.id} value={staffMember.id.toString()}>
                          {getStaffName(staffMember)} - {staffMember.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="daysOfWeek"
              render={() => (
                <FormItem>
                  <FormLabel>Days of Week</FormLabel>
                  {schedule ? (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm text-muted-foreground">
                        Editing schedule for: <strong>{schedule.dayOfWeek}</strong>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        To change the day, create a new schedule instead.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {daysOfWeek.map((day) => (
                        <FormField
                          key={day}
                          control={form.control}
                          name="daysOfWeek"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={day}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(day)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), day])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value: string) => value !== day
                                            )
                                        )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {day}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="All Locations">All Locations</SelectItem>
                      {(locations as any[])
                        .filter((loc: any) => loc.isActive)
                        .map((loc: any) => (
                          <SelectItem key={loc.id} value={loc.name}>
                            {loc.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isBlocked"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Block this time slot
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Mark this time as unavailable for appointments
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
              >
                {createScheduleMutation.isPending || updateScheduleMutation.isPending
                  ? "Saving..."
                  : schedule
                  ? "Update Schedule"
                  : "Create Schedule"
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}