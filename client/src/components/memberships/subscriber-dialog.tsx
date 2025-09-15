import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDate, getInitials, getFullName } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { PlusCircle, Users, Calendar, Search, CreditCard, Receipt, Check, X, Mail, Phone, DollarSign } from "lucide-react";

type Membership = {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number;
  benefits: string;
};

type User = {
  id: number;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
};

type ClientMembership = {
  id: number;
  clientId: number;
  membershipId: number;
  startDate: string;
  endDate: string;
  active: boolean;

  client: User;
  membership: Membership;
};

interface SubscriberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: Membership | null;
}

// Helcim payment configuration
const HELCIM_ENABLED = false;

export default function SubscriberDialog({
  open,
  onOpenChange,
  membership,
}: SubscriberDialogProps) {
  // Removed add subscriber functionality states
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get subscribers for this membership
  const { data: subscribers, isLoading: isLoadingSubscribers } = useQuery({
    queryKey: ['/api/client-memberships', membership?.id],
    queryFn: async () => {
      if (!membership?.id) return [];
      const response = await fetch(`/api/client-memberships?membershipId=${membership.id}`);
      if (!response.ok) throw new Error('Failed to fetch subscribers');
      return response.json();
    },
    enabled: open && !!membership?.id
  });

  // Get all clients for the dropdown
  const { data: clients } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users?role=client');
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },
    enabled: open
  });



  // No effect needed anymore
  /*useEffect(() => {
  }, [open]);*/



  // Removed add subscriber functionality

  // Remove subscriber mutation
  const removeSubscriberMutation = useMutation({
    mutationFn: async (membershipId: number) => {
      return apiRequest("DELETE", `/api/client-memberships/${membershipId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-memberships'] });
      toast({
        title: "Success",
        description: "Subscriber removed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to remove subscriber: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Removed payment processing - not needed in this dialog anymore

  // Removed email receipt functionality - not needed in this dialog anymore

  // Removed SMS receipt functionality - not needed in this dialog anymore

  // Removed transaction completion handler - not needed in this dialog anymore

  // Removed add subscriber handler

  const handleRemoveSubscriber = (membershipId: number) => {
    removeSubscriberMutation.mutate(membershipId);
  };

  // Simple dialog close handler
  const handleDialogClose = (open: boolean) => {
    onOpenChange(open);
  };

  // Removed client filtering logic - not needed anymore

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[90vw] lg:max-w-[1200px]" style={{ 
        height: "90vh", 
        maxHeight: "90vh", 
        width: "95vw",
        padding: "24px" 
      }}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {membership?.name} Subscribers
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col flex-1 h-full pt-6 pb-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-medium">
              Subscribers ({subscribers?.length || 0})
            </h3>
          </div>
          
          {isLoadingSubscribers ? (
            <div className="flex justify-center items-center py-24">
              <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : subscribers?.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground border rounded-lg text-lg">
              No subscribers yet. Use the "Add Client" button on the membership card to add subscribers.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden shadow-sm flex-1" style={{ height: "calc(90vh - 200px)" }}>
              <div className="h-full overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead className="text-base font-semibold py-4 w-[250px]">Client</TableHead>
                      <TableHead className="text-base font-semibold py-4">Status</TableHead>
                      <TableHead className="text-base font-semibold py-4">Start Date</TableHead>
                      <TableHead className="text-base font-semibold py-4">End Date</TableHead>
                      <TableHead className="text-base font-semibold py-4 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscribers?.map((subscription: ClientMembership) => (
                      <TableRow key={subscription.id} className="border-b hover:bg-slate-50">
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarFallback>
                                {getInitials(
                                  subscription.client?.firstName,
                                  subscription.client?.lastName
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="font-medium">
                                  {getFullName(
                                    subscription.client?.firstName,
                                    subscription.client?.lastName
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {subscription.client?.email}
                                </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={subscription.active ? "default" : "secondary"}>
                            {subscription.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDate(new Date(subscription.startDate))}
                        </TableCell>
                        <TableCell>
                          {formatDate(new Date(subscription.endDate))}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            onClick={() => handleRemoveSubscriber(subscription.id)}
                            disabled={removeSubscriberMutation.isPending}
                            className="text-red-600 hover:text-white hover:bg-red-600"
                          >
                            {removeSubscriberMutation.isPending ? "Removing..." : "Remove"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}