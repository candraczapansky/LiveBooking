import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ClientMembership {
  id: number;
  clientId: number;
  membershipId: number;
  startDate: string;
  endDate: string;
  active: boolean;
  autoRenew: boolean;
  renewalDay?: number;
  paymentMethodId?: string;
  membership: {
    id: number;
    name: string;
    description: string;
    price: number;
    duration: number;
    benefits: string;
  };
}

interface MembershipEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: ClientMembership | null;
}

export default function MembershipEditDialog({
  open,
  onOpenChange,
  membership,
}: MembershipEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [active, setActive] = useState(false);
  const [autoRenew, setAutoRenew] = useState(false);
  const [renewalDay, setRenewalDay] = useState<string>("");

  // Initialize form values when membership changes
  useEffect(() => {
    if (membership) {
      setStartDate(new Date(membership.startDate));
      setEndDate(new Date(membership.endDate));
      setActive(membership.active);
      setAutoRenew(membership.autoRenew);
      setRenewalDay(membership.renewalDay?.toString() || "");
    }
  }, [membership]);

  // Update membership mutation
  const updateMembershipMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!membership) return;
      return apiRequest("PUT", `/api/client-memberships/${membership.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-memberships'] });
      toast({
        title: "Success",
        description: "Membership updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update membership",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!membership || !startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const updateData: any = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      active,
      autoRenew,
    };

    if (autoRenew && renewalDay) {
      const day = parseInt(renewalDay);
      if (day >= 1 && day <= 31) {
        updateData.renewalDay = day;
      }
    }

    updateMembershipMutation.mutate(updateData);
  };

  const calculateNewEndDate = () => {
    if (!startDate || !membership) return;
    
    const newEndDate = new Date(startDate);
    newEndDate.setDate(newEndDate.getDate() + membership.membership.duration);
    setEndDate(newEndDate);
    
    toast({
      title: "End Date Updated",
      description: `End date automatically calculated based on ${membership.membership.duration} day duration`,
    });
  };

  if (!membership) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Membership - {membership.membership.name}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Membership Plan</Label>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <p className="font-medium">{membership.membership.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {membership.membership.description}
              </p>
              <p className="text-sm mt-2">
                <span className="font-medium">Duration:</span> {membership.membership.duration} days
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="z-[9999] w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      // Automatically calculate new end date if start date changes
                      if (date) {
                        const newEnd = new Date(date);
                        newEnd.setDate(newEnd.getDate() + membership.membership.duration);
                        setEndDate(newEnd);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="end-date">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="z-[9999] w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={calculateNewEndDate}
            disabled={!startDate}
          >
            Auto-calculate End Date from Start Date
          </Button>

          <div className="flex items-center justify-between">
            <Label htmlFor="active" className="flex-1">
              Membership Status
              <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                {active ? "Active membership" : "Inactive membership"}
              </p>
            </Label>
            <Switch
              id="active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-renew" className="flex-1">
              Auto-Renewal
              <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                {autoRenew ? "Will renew automatically" : "Manual renewal required"}
              </p>
            </Label>
            <Switch
              id="auto-renew"
              checked={autoRenew}
              onCheckedChange={setAutoRenew}
            />
          </div>

          {autoRenew && (
            <div className="grid gap-2">
              <Label htmlFor="renewal-day">
                Renewal Day of Month (1-31)
              </Label>
              <Input
                id="renewal-day"
                type="number"
                min="1"
                max="31"
                value={renewalDay}
                onChange={(e) => setRenewalDay(e.target.value)}
                placeholder="e.g., 15 for the 15th of each month"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMembershipMutation.isPending}
          >
            {updateMembershipMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
