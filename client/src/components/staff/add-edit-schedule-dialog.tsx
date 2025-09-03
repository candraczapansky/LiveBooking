import { useState, useMemo, useEffect } from "react";
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
  locationId: z.string().min(1, "Location is required"),
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
  initialValues?: Partial<z.infer<typeof formSchema> & { dayOfWeek?: string }>;
}

export function AddEditScheduleDialog({ open, onOpenChange, schedule, defaultStaffId, onSuccess, initialValues }: AddEditScheduleDialogProps) {
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

  // Fetch locations for location options
  const { data: locations = [] } = useQuery<any[]>({
    queryKey: ['/api/locations'],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(() => {
      const iv: any = initialValues || {};
      const ivStaffId = iv.staffId != null ? String(iv.staffId) : "";
      const ivLocationId = iv.locationId != null ? String(iv.locationId) : "";
      const daysFromSchedule = schedule?.dayOfWeek ? [schedule.dayOfWeek] : undefined;
      const daysFromIv = Array.isArray(iv.daysOfWeek) ? iv.daysOfWeek : undefined;
      return {
        staffId: schedule?.staffId?.toString() || ivStaffId || defaultStaffId?.toString() || "",
        daysOfWeek: daysFromSchedule || daysFromIv || [],
        startTime: schedule?.startTime || iv.startTime || "09:00",
        endTime: schedule?.endTime || iv.endTime || "17:00",
        locationId: schedule?.locationId?.toString() || ivLocationId || "",
        serviceCategories: schedule?.serviceCategories || iv.serviceCategories || [],
        startDate: schedule?.startDate || iv.startDate || format(new Date(), 'yyyy-MM-dd'),
        endDate: schedule?.endDate || iv.endDate || "",
        isBlocked: (schedule?.isBlocked ?? (iv.isBlocked ?? false)) as boolean,
      };
    }, [schedule, defaultStaffId, initialValues]),
  });

  // Watch selected staff and location to filter available categories by location and staff capabilities
  const watchLocationId = form.watch('locationId');
  const watchStaffId = form.watch('staffId');

  // Show all service categories (no location/staff filtering)
  const visibleCategories = useMemo(() => {
    return (serviceCategories as any[]) || [];
  }, [serviceCategories]);

  // Prune selected categories if the location or available set changes
  useEffect(() => {
    const selected: string[] = (form.getValues('serviceCategories') || []) as any;
    const allowed = new Set<string>((visibleCategories as any[]).map((c: any) => String(c.id)));
    const filtered = selected.filter((id) => allowed.has(String(id)));
    if (filtered.length !== selected.length) {
      form.setValue('serviceCategories', filtered);
    }
  }, [visibleCategories, form]);

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
      
      // Invalidate all location-specific schedule queries
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === '/api/schedules'
      });
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('schedule-updated'));
      
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
      const effectiveDay = (data.daysOfWeek && data.daysOfWeek[0]) || schedule.dayOfWeek;
      const scheduleData = {
        ...data,
        dayOfWeek: effectiveDay,
        staffId: parseInt(data.staffId),
        locationId: parseInt(data.locationId),
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
          locationId: parseInt(data.locationId),
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
        // Also invalidate location-specific schedule queries
        queryClient.invalidateQueries({ 
          predicate: (query) => query.queryKey[0] === '/api/schedules'
        });
        
        // Force immediate refetch to update UI
        queryClient.refetchQueries({ queryKey: ['/api/schedules'] });
        
        // Additional cache clearing for any potential related queries
        queryClient.removeQueries({ queryKey: ['/api/schedules'] });
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('schedule-updated'));
        
        // Call the onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
        
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
          locationId: locations.length > 0 ? locations[0].id.toString() : "",
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
                  <div className="grid grid-cols-2 gap-2">
                    {daysOfWeek.map((day) => (
                      <FormField
                        key={day}
                        control={form.control}
                        name="daysOfWeek"
                        render={({ field }) => {
                          const isChecked = (field.value || []).includes(day);
                          return (
                            <FormItem
                              key={day}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    const current: string[] = field.value || [];
                                    if (checked) {
                                      // When editing an existing schedule, allow only one day selection
                                      if (schedule) {
                                        field.onChange([day]);
                                      } else {
                                        field.onChange([...current.filter((d) => d !== day), day]);
                                      }
                                    } else {
                                      field.onChange(current.filter((d) => d !== day));
                                    }
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
                  {schedule && (
                    <p className="text-xs text-muted-foreground mt-1">Select a single day to update this schedule.</p>
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
              name="locationId"
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
                      {(locations as any[]).map((location: any) => (
                        <SelectItem key={location.id} value={location.id.toString()}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service Categories (show all) */}
            <FormField
              control={form.control}
              name="serviceCategories"
              render={() => (
                <FormItem>
                  <FormLabel>Service categories</FormLabel>
                  {visibleCategories.length === 0 ? (
                    <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                      No categories available for the selected location.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                          const ids = (visibleCategories as any[]).map((c: any) => String(c.id));
                          form.setValue('serviceCategories', ids);
                        }}>Select all</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => form.setValue('serviceCategories', [])}>Clear</Button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                        {(visibleCategories as any[]).map((cat: any) => (
                          <FormField
                            key={cat.id}
                            control={form.control}
                            name="serviceCategories"
                            render={({ field }) => {
                              const value: string[] = field.value || [];
                              const id = String(cat.id);
                              const checked = value.includes(id);
                              return (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(isChecked) => {
                                        const next = isChecked
                                          ? [...value, id]
                                          : value.filter((v) => v !== id);
                                        field.onChange(next);
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">{cat.name}</FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
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