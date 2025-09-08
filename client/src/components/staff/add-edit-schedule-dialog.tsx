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
  const [isSingleDate, setIsSingleDate] = useState<boolean>(false);
  const [isIndefinite, setIsIndefinite] = useState<boolean>(false);
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

  // Helper function to convert HH:mm:ss to HH:mm format
  const formatTimeForInput = (time: string | undefined): string => {
    if (!time) return "09:00";
    // If time is in HH:mm:ss format, convert to HH:mm
    if (time.includes(':')) {
      const parts = time.split(':');
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      }
    }
    return time;
  };

  // Reset form when schedule prop changes (when editing an existing schedule)
  useEffect(() => {
    if (schedule && open) {
      const formValues = {
        staffId: schedule.staffId?.toString() || defaultStaffId?.toString() || "",
        daysOfWeek: schedule.dayOfWeek ? [schedule.dayOfWeek] : [],
        startTime: formatTimeForInput(schedule.startTime),
        endTime: formatTimeForInput(schedule.endTime),
        locationId: schedule.locationId?.toString() || "",
        serviceCategories: schedule.serviceCategories || [],
        startDate: schedule.startDate || format(new Date(), 'yyyy-MM-dd'),
        endDate: schedule.endDate || "",
        isBlocked: schedule.isBlocked || false,
      };
      form.reset(formValues);
      setSelectedDays(formValues.daysOfWeek);
      setIsSingleDate(!schedule.endDate);
      setIsIndefinite(false);
    } else if (!schedule && open) {
      // Reset to default values when adding a new schedule
      const iv: any = initialValues || {};
      const formValues = {
        staffId: iv.staffId != null ? String(iv.staffId) : defaultStaffId?.toString() || "",
        daysOfWeek: Array.isArray(iv.daysOfWeek) ? iv.daysOfWeek : [],
        startTime: iv.startTime || "09:00",
        endTime: iv.endTime || "17:00",
        locationId: iv.locationId != null ? String(iv.locationId) : "",
        serviceCategories: iv.serviceCategories || [],
        startDate: iv.startDate || format(new Date(), 'yyyy-MM-dd'),
        endDate: iv.endDate || "",
        isBlocked: iv.isBlocked || false,
      };
      form.reset(formValues);
      setSelectedDays(formValues.daysOfWeek);
      setIsSingleDate(false);
      setIsIndefinite(false);
    }
  }, [schedule, open, form, defaultStaffId, initialValues]);

  // Watch selected staff and location to filter available categories by location and staff capabilities
  const watchLocationId = form.watch('locationId');
  const watchStaffId = form.watch('staffId');
  const watchStartDate = form.watch('startDate');

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

  // Initialize flags based on existing schedule when editing
  useEffect(() => {
    try {
      if (!schedule) {
        setIsSingleDate(false);
        setIsIndefinite(false);
        return;
      }
      const hasEndDate = !!schedule.endDate;
      setIsIndefinite(!hasEndDate);
      // Single date if startDate === endDate (same calendar day) and not indefinite
      if (schedule.startDate && schedule.endDate) {
        const sd = String(schedule.startDate).slice(0, 10);
        const ed = String(schedule.endDate).slice(0, 10);
        setIsSingleDate(sd === ed);
      } else {
        setIsSingleDate(false);
      }
    } catch {}
  }, [schedule]);

  // Helper to compute day name from YYYY-MM-DD
  const getDayNameFromDate = (dateString?: string) => {
    try {
      if (!dateString) return undefined;
      const [y, m, d] = String(dateString).split('-').map((p) => parseInt(p));
      if (!y || !m || !d) return undefined;
      const dt = new Date(y, m - 1, d);
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return days[dt.getDay()];
    } catch {
      return undefined;
    }
  };

  // Keep daysOfWeek and endDate in sync with single-date / indefinite toggles
  useEffect(() => {
    try {
      if (isSingleDate) {
        const dayName = getDayNameFromDate(watchStartDate);
        if (dayName) {
          form.setValue('daysOfWeek', [dayName]);
        }
        // For single date, endDate mirrors startDate
        if (watchStartDate) {
          form.setValue('endDate', watchStartDate);
        }
        // Turning on single-date should turn off indefinite
        if (isIndefinite) setIsIndefinite(false);
      }
    } catch {}
  }, [isSingleDate, watchStartDate, form]);

  useEffect(() => {
    try {
      if (isIndefinite) {
        // Clear endDate when indefinite
        form.setValue('endDate', "");
        // Turning on indefinite should turn off single-date
        if (isSingleDate) setIsSingleDate(false);
      }
    } catch {}
  }, [isIndefinite, form]);

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
      
      // Dispatch custom event with details to notify other components
      try {
        const detail = {
          staffId: parseInt(String(form.getValues('staffId')) || String(schedule?.staffId || '0')),
          locationId: parseInt(String(form.getValues('locationId')) || String(schedule?.locationId || '0')),
          daysOfWeek: (Array.isArray(form.getValues('daysOfWeek')) && form.getValues('daysOfWeek').length > 0)
            ? form.getValues('daysOfWeek')
            : (schedule?.dayOfWeek ? [schedule.dayOfWeek] : []),
          startDate: String(form.getValues('startDate') || schedule?.startDate || ''),
        } as any;
        window.dispatchEvent(new CustomEvent('schedule-updated', { detail } as any));
      } catch {
        window.dispatchEvent(new CustomEvent('schedule-updated'));
      }
      
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
      const computedDayFromDate = isSingleDate ? getDayNameFromDate(data.startDate) : undefined;
      const effectiveDay = computedDayFromDate || (data.daysOfWeek && data.daysOfWeek[0]) || schedule.dayOfWeek;
      const scheduleData = {
        ...data,
        dayOfWeek: effectiveDay,
        staffId: parseInt(data.staffId),
        locationId: parseInt(data.locationId),
        serviceCategories: data.serviceCategories || [],
        endDate: isIndefinite ? null : (isSingleDate ? data.startDate : (data.endDate || null)),
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
          isBlocked: data.isBlocked || false,
        } as any;

        if (isSingleDate) {
          const singleDay = getDayNameFromDate(data.startDate);
          if (!singleDay) throw new Error("Invalid start date for single-date schedule");
          const payload = {
            ...baseScheduleData,
            dayOfWeek: singleDay,
            endDate: data.startDate,
          };
          await createScheduleMutation.mutateAsync(payload);
        } else {
          const endDateToUse = isIndefinite ? null : (data.endDate || null);
          // Create schedules sequentially for each selected day
          for (const day of data.daysOfWeek) {
            const scheduleData = {
              ...baseScheduleData,
              dayOfWeek: day,
              endDate: endDateToUse,
            };
            await createScheduleMutation.mutateAsync(scheduleData);
          }
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
        
        // Dispatch custom event with details to notify other components
        try {
          const detail = {
            staffId: parseInt(String(data.staffId)),
            locationId: parseInt(String(data.locationId)),
            daysOfWeek: Array.isArray(data.daysOfWeek) ? data.daysOfWeek : [],
            startDate: String(data.startDate || ''),
          } as any;
          window.dispatchEvent(new CustomEvent('schedule-updated', { detail } as any));
        } catch {
          window.dispatchEvent(new CustomEvent('schedule-updated'));
        }
        
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
    try {
      const u = staffMember?.user || {};
      const first = (u.firstName || '').trim();
      const last = (u.lastName || '').trim();
      const full = `${first} ${last}`.trim();
      if (full) return full;
      if (u.username) return u.username;
      return 'Unknown Staff';
    } catch {
      return 'Unknown Staff';
    }
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
            {/* Scheduling scope options */}
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={isSingleDate}
                  onCheckedChange={(checked) => setIsSingleDate(Boolean(checked))}
                />
                <div className="space-y-1 leading-none">
                  <FormLabel>Single date only</FormLabel>
                  <p className="text-sm text-muted-foreground">Apply this schedule only on the selected start date.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={isIndefinite}
                  onCheckedChange={(checked) => setIsIndefinite(Boolean(checked))}
                />
                <div className="space-y-1 leading-none">
                  <FormLabel>Indefinite</FormLabel>
                  <p className="text-sm text-muted-foreground">No end date. This schedule continues until changed.</p>
                </div>
              </div>
            </div>

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
                  {isSingleDate && (
                    <p className="text-xs text-muted-foreground mb-1">Single date selected. Day is derived from the Start Date.</p>
                  )}
                  <div className="grid grid-cols-2 gap-2 opacity-100">
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
                                  disabled={isSingleDate}
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
                      <Input type="date" disabled={isIndefinite || isSingleDate} {...field} />
                    </FormControl>
                    {(isIndefinite || isSingleDate) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {isIndefinite ? 'Indefinite is on; end date not required.' : 'Single date is on; end date equals start date.'}
                      </p>
                    )}
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