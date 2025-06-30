import { useState } from "react";
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
import { PlusCircle, Users, Calendar, Search } from "lucide-react";

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
  squareSubscriptionId?: string;
  client: User;
  membership: Membership;
};

interface SubscriberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: Membership | null;
}

export default function SubscriberDialog({
  open,
  onOpenChange,
  membership,
}: SubscriberDialogProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
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

  // Add subscriber mutation
  const addSubscriberMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (membership?.duration || 30));

      return apiRequest("POST", "/api/client-memberships", {
        clientId,
        membershipId: membership?.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-memberships'] });
      toast({
        title: "Success",
        description: "Subscriber added successfully",
      });
      setSelectedClientId("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add subscriber: ${error.message}`,
        variant: "destructive",
      });
    }
  });

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

  const handleAddSubscriber = () => {
    if (!selectedClientId) return;
    addSubscriberMutation.mutate(parseInt(selectedClientId));
  };

  const handleRemoveSubscriber = (membershipId: number) => {
    removeSubscriberMutation.mutate(membershipId);
  };

  // Reset form when dialog closes
  const handleDialogClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setSelectedClientId("");
      setSearchQuery("");
    }
  };

  // Filter out clients who are already subscribers and apply search
  const availableClients = clients?.filter((client: User) => {
    const isClient = client.role === 'client';
    const isNotSubscribed = !subscribers?.some((sub: ClientMembership) => sub.clientId === client.id);
    const matchesSearch = searchQuery === '' || 
      getFullName(client.firstName, client.lastName).toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    return isClient && isNotSubscribed && matchesSearch;
  }) || [];

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {membership?.name} Subscribers
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 overflow-y-auto">
          {/* Add New Subscriber Section */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Add New Subscriber
              <Badge variant="secondary" className="ml-auto">
                {availableClients.length} available
              </Badge>
            </h3>
            
            {/* Search Input */}
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search clients by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={availableClients.length === 0 ? "No clients available" : "Select a client"} />
                </SelectTrigger>
                <SelectContent>
                  {availableClients.length === 0 ? (
                    <SelectItem value="no-clients" disabled>
                      {searchQuery ? "No clients match your search" : "All clients are already subscribed"}
                    </SelectItem>
                  ) : (
                    availableClients.map((client: User) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {getFullName(client.firstName, client.lastName)} ({client.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAddSubscriber}
                disabled={!selectedClientId || addSubscriberMutation.isPending}
                className="flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                {addSubscriberMutation.isPending ? "Adding..." : "Add"}
              </Button>
            </div>
            {availableClients.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                All clients are already subscribed to this membership.
              </p>
            )}
          </div>

          {/* Current Subscribers Table */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Current Subscribers ({subscribers?.length || 0})
            </h3>
            
            {isLoadingSubscribers ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : subscribers?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                No subscribers yet. Add your first subscriber above.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscribers?.map((subscription: ClientMembership) => (
                      <TableRow key={subscription.id}>
                        <TableCell>
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
                        <TableCell className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(new Date(subscription.startDate))}
                        </TableCell>
                        <TableCell className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(new Date(subscription.endDate))}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSubscriber(subscription.id)}
                            disabled={removeSubscriberMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {removeSubscriberMutation.isPending ? "Removing..." : "Remove"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}