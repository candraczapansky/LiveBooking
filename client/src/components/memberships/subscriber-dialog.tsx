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
const HELCIM_ENABLED = true;

export default function SubscriberDialog({
  open,
  onOpenChange,
  membership,
}: SubscriberDialogProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [cardElement, setCardElement] = useState<any>(null);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [showReceiptOptions, setShowReceiptOptions] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [receiptEmail, setReceiptEmail] = useState("");
  const [receiptPhone, setReceiptPhone] = useState("");
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



  // Reset dialog state when opening/closing
  useEffect(() => {
    if (open) {
      setShowPaymentStep(false);
      setSelectedClient(null);
      setPaymentCompleted(false);
      setShowReceiptOptions(false);
      setPaymentResult(null);
      setReceiptEmail("");
      setReceiptPhone("");
    }
  }, [open]);



  // Add subscriber mutation - now initiates payment flow
  const addSubscriberMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const client = clients?.find((c: User) => c.id === clientId);
      if (!client) throw new Error("Client not found");
      
      setSelectedClient(client);
      setReceiptEmail(client.email || "");
      setReceiptPhone(client.phone || "");
      setShowPaymentStep(true);
      
      return { client };
    },
    onSuccess: () => {
      // Don't close dialog yet - show payment step instead
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

  // Process payment and create membership subscription
  const processPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!cardElement || !selectedClient || !membership) {
        throw new Error("Missing payment information");
      }

      setPaymentProcessing(true);

      try {
        // Tokenize payment method
        const tokenResult = await cardElement.tokenize();
        if (tokenResult.status !== 'OK') {
          throw new Error(tokenResult.errors?.[0]?.detail || 'Failed to process payment method');
        }

        const paymentToken = tokenResult.token;

        // Process Square payment
        const paymentResponse = await apiRequest("POST", "/api/create-payment", {
          amount: membership.price,
          sourceId: paymentToken,
          type: "membership_payment",
          description: `Membership: ${membership.name} - ${selectedClient.firstName} ${selectedClient.lastName}`
        });
        const paymentData = await paymentResponse.json();

        if (!paymentData.payment || paymentData.payment.status !== 'COMPLETED') {
          throw new Error('Payment processing failed');
        }

        // Create membership subscription
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + membership.duration);

        const membershipResponse = await apiRequest("POST", "/api/client-memberships", {
          clientId: selectedClient.id,
          membershipId: membership.id,
          startDate,
          endDate,
          active: true
        });
        const membershipSubscription = await membershipResponse.json();

        // Create payment record
        const paymentRecordResponse = await apiRequest("POST", "/api/payments", {
          clientId: selectedClient.id,
          clientMembershipId: membershipSubscription.id,
          amount: membership.price,
          totalAmount: membership.price,
          method: "card",
          status: "completed",
          type: "membership",
          description: `Membership payment for ${membership.name}`,

          paymentDate: new Date()
        });
        const paymentRecord = await paymentRecordResponse.json();

        setPaymentResult({
          membership: membershipSubscription,
          payment: paymentRecord,
          payment: paymentData.payment
        });

        setPaymentCompleted(true);
        setShowReceiptOptions(true);

        return { membershipSubscription, paymentRecord };
      } catch (error: any) {
        setPaymentProcessing(false);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      setPaymentProcessing(false);
      toast({
        title: "Payment Successful",
        description: `${selectedClient?.firstName} ${selectedClient?.lastName} successfully subscribed to ${membership?.name}`,
      });
    },
    onError: (error: any) => {
      setPaymentProcessing(false);
      toast({
        title: "Payment Failed",
        description: error.message || "Payment processing failed. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Send receipt via email
  const sendEmailReceiptMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!paymentResult || !selectedClient || !membership) {
        throw new Error("Missing receipt information");
      }

      await apiRequest("POST", "/api/send-receipt-email", {
        recipientEmail: email,
        receiptData: {
          transactionId: paymentResult.payment.id,
          amount: membership.price,
          items: [{
            name: membership.name,
            description: membership.description,
            price: membership.price,
            quantity: 1
          }],
          customerName: `${selectedClient.firstName} ${selectedClient.lastName}`,
          customerEmail: selectedClient.email,
          paymentMethod: "Credit Card",
          transactionDate: new Date().toISOString()
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "Receipt sent successfully via email",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send email receipt",
        variant: "destructive",
      });
    }
  });

  // Send receipt via SMS
  const sendSMSReceiptMutation = useMutation({
    mutationFn: async (phone: string) => {
      if (!paymentResult || !selectedClient || !membership) {
        throw new Error("Missing receipt information");
      }

      await apiRequest("POST", "/api/send-receipt-sms", {
        recipientPhone: phone,
        receiptData: {
          transactionId: paymentResult.payment.id,
          amount: membership.price,
          items: [{
            name: membership.name,
            description: membership.description,
            price: membership.price,
            quantity: 1
          }],
          customerName: `${selectedClient.firstName} ${selectedClient.lastName}`,
          paymentMethod: "Credit Card",
          transactionDate: new Date().toISOString()
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "SMS Sent",
        description: "Receipt sent successfully via SMS",
      });
    },
    onError: (error: any) => {
      toast({
        title: "SMS Failed",
        description: error.message || "Failed to send SMS receipt",
        variant: "destructive",
      });
    }
  });

  const handleCompleteTransaction = () => {
    setShowPaymentStep(false);
    setShowReceiptOptions(false);
    setPaymentCompleted(false);
    setSelectedClient(null);
    setPaymentResult(null);
    setCardElement(null);
    onOpenChange(false);
  };

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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {membership?.name} Subscribers
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 overflow-y-auto flex-1 min-h-0">
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
          <div className="flex flex-col min-h-0">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2 flex-shrink-0">
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
              <div className="border rounded-lg overflow-hidden flex-1 min-h-0">
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white dark:bg-gray-800 z-10">
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
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}