import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";
import HelcimPayJsModal from "@/components/payment/helcim-payjs-modal";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, User, Calendar } from "lucide-react";

type Membership = {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number;
  benefits: string;
};

type Client = {
  id: number;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  phone?: string;
};

interface MembershipSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: Membership | null;
}

export default function MembershipSubscriptionDialog({ 
  open, 
  onOpenChange, 
  membership 
}: MembershipSubscriptionDialogProps) {
  console.log("[SUBSCRIPTION DIALOG] Component rendered. Props:", { open, membership: membership?.name });
  
  const [step, setStep] = useState<"client" | "billing">("client");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRenew, setAutoRenew] = useState(false);
  const [renewalDay, setRenewalDay] = useState<string>("1");
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset dialog when it opens with a new membership
  useEffect(() => {
    if (open && membership) {
      console.log("[SUBSCRIPTION DIALOG] Dialog opened with membership:", membership.name);
      // Reset to initial state when dialog opens
      setStep("client");
      setSelectedClientId("");
      setSearchQuery("");
      setAutoRenew(false);
      setRenewalDay("1");
      setSelectedClient(null);
      setIsPaymentOpen(false);
    }
  }, [open, membership]);

  // Debug logging for dialog state
  useEffect(() => {
      console.log("[SUBSCRIPTION DIALOG] State changed:", {
      open,
      membership: membership?.name,
      step,
      selectedClientId,
      selectedClient: selectedClient ? `${selectedClient.firstName || ''} ${selectedClient.lastName || ''}`.trim() : null,
      autoRenew
    });
  }, [open, membership, step, selectedClientId, selectedClient, autoRenew]);

  // Fetch clients with search (limit results for performance)
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['/api/users', searchQuery],
    queryFn: async () => {
      console.log("[DEBUG] Fetching users, search query:", searchQuery);
      
      // Use the search parameter if there's a query
      const endpoint = searchQuery 
        ? `/api/users?role=client&search=${encodeURIComponent(searchQuery)}`
        : '/api/users?role=client';
        
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch users');
      const users = await response.json();
      
      console.log("[DEBUG] Total clients fetched:", users.length);
      return users.slice(0, 100); // Limit to 100 results for performance
    },
    enabled: open && step === "client",
    staleTime: 30000 // Cache for 30 seconds
  });

  // Use the fetched clients directly (already filtered)
  const filteredClients = clients;

  // Create membership subscription - SIMPLIFIED VERSION
  const createSubscriptionMutation = useMutation({
    mutationFn: async (paymentData?: any) => {
      console.log("[MUTATION] ============ MUTATION FUNCTION CALLED ============");
      console.log("[MUTATION] Input paymentData:", paymentData);
      console.log("[MUTATION] Current state at mutation time:", {
        selectedClient: selectedClient ? {
          id: selectedClient.id,
          name: `${selectedClient.firstName} ${selectedClient.lastName}`,
          email: selectedClient.email
        } : null,
        membership: membership ? {
          id: membership.id,
          name: membership.name,
          price: membership.price
        } : null,
        autoRenew
      });

      // Basic validation
      if (!selectedClient || !membership) {
        const error = "Missing client or membership information";
        console.error("[DEBUG] Validation failed:", error);
        throw new Error(error);
      }

      // Calculate dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + membership.duration);

      try {
        // 1. Create membership subscription
        console.log("[DEBUG] Step 1: Creating membership subscription...");
        const subscriptionData = {
          clientId: selectedClient.id,
          membershipId: membership.id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          active: true,
          autoRenew: autoRenew,
          renewalDate: autoRenew ? parseInt(renewalDay) : null,
          paymentMethodId: null
        };
        
        console.log("[DEBUG] Subscription payload:", JSON.stringify(subscriptionData));
        
        const membershipResponse = await fetch("/api/client-memberships", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(subscriptionData)
        });
        
        console.log("[DEBUG] Subscription response status:", membershipResponse.status);
        
        if (!membershipResponse.ok) {
          const errorText = await membershipResponse.text();
          console.error("[DEBUG] Failed to create subscription:", errorText);
          throw new Error(`Failed to create subscription: ${membershipResponse.status}`);
        }
        
        const membershipSubscription = await membershipResponse.json();
        console.log("[DEBUG] Subscription created successfully:", membershipSubscription);

      // No cash payment option - removed

        console.log("[DEBUG] ✅ SUCCESS! Subscription process complete");
        return { membershipSubscription };
        
      } catch (error: any) {
        console.error("[DEBUG] ❌ ERROR in subscription creation:", error.message);
        console.error("[DEBUG] Full error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("[SUBSCRIPTION DIALOG] ✅ SUCCESS! Subscription created:", data);
      console.log("[SUBSCRIPTION DIALOG] Invalidating queries and showing toast...");
      
      queryClient.invalidateQueries({ queryKey: ['/api/client-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/memberships'] });
      
      toast({
        title: "Success! 🎉",
          description: `${selectedClient ? (`${selectedClient.firstName || ''} ${selectedClient.lastName || ''}`.trim() || selectedClient.email.split('@')[0]) : 'Client'} has been successfully subscribed to ${membership?.name}`,
      });
      
      console.log("[SUBSCRIPTION DIALOG] Closing dialog...");
      handleClose();
    },
    onError: (error: any) => {
      console.error("[DEBUG] Subscription creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create membership subscription",
        variant: "destructive",
      });
    }
  });

  const handleClose = () => {
    console.log("[SUBSCRIPTION DIALOG] handleClose called - resetting dialog");
    setStep("client");
    setSelectedClientId("");
    setSearchQuery("");
    setAutoRenew(false);
    setRenewalDay("1");
    setSelectedClient(null);
    setIsPaymentOpen(false);
    onOpenChange(false);
  };

  const handleClientSelect = () => {
    console.log("[DEBUG] handleClientSelect called with:", {
      selectedClientId,
      filteredClients: filteredClients.length,
      firstFewClients: filteredClients.slice(0, 3)
    });
    
    const client = filteredClients.find((c: Client) => c.id === parseInt(selectedClientId));
    console.log("[DEBUG] Found client:", client);
    
    if (client) {
      setSelectedClient(client);
      setStep("billing");
      console.log("[DEBUG] Moving to billing step");
    } else {
      console.error("[DEBUG] No client found with ID:", selectedClientId);
    }
  };

  const handleCreateSubscription = () => {
    console.log("[CRITICAL] handleCreateSubscription called!");
    console.log("[CRITICAL] Current data:", {
      selectedClient: selectedClient ? {
        id: selectedClient.id,
        name: `${selectedClient.firstName} ${selectedClient.lastName}`
      } : null,
      membership: membership ? {
        id: membership.id,
        name: membership.name,
        price: membership.price
      } : null,
      autoRenew,
      renewalDay,
      mutationIsPending: createSubscriptionMutation.isPending
    });
    
    if (!selectedClient || !membership) {
      console.error("[CRITICAL] Cannot create subscription - missing data!");
      console.error("  selectedClient:", selectedClient);
      console.error("  membership:", membership);
      toast({
        title: "Error",
        description: "Please select a client and ensure membership is selected",
        variant: "destructive"
      });
      return;
    }
    
    // Open payment modal for card payment
    console.log("[CRITICAL] Opening payment modal for CARD payment");
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    console.log("[MembershipSubscription] Payment successful:", paymentData);
    
    // If auto-renewal is enabled, save the card
    let savedCardData = null;
    if (autoRenew && paymentData.customerCode) {
      try {
        const saveCardResponse = await apiRequest("POST", "/api/saved-payment-methods", {
          userId: selectedClient?.id,
          type: "card",
          cardBrand: paymentData.cardBrand || paymentData.cardType,
          cardLast4: paymentData.cardLast4 || paymentData.cardNumber?.slice(-4),
          cardExpMonth: paymentData.cardExpMonth,
          cardExpYear: paymentData.cardExpYear,
          helcimCustomerId: paymentData.customerCode,
          helcimCardId: paymentData.cardToken,
          isDefault: true
        });

        if (saveCardResponse.ok) {
          savedCardData = await saveCardResponse.json();
          console.log("[MembershipSubscription] Card saved for auto-renewal:", savedCardData);
        }
      } catch (error) {
        console.error("[MembershipSubscription] Error saving card:", error);
      }
    }
    
    // Create the subscription with payment info
    createSubscriptionMutation.mutate({
      paymentId: paymentData.transactionId || paymentData.approvalNumber,
      savedCardId: savedCardData?.id,
      paymentMethodId: savedCardData ? `${paymentData.customerCode}:${paymentData.cardToken}` : null
    });
  };

  const handlePaymentError = (error: any) => {
    console.error("[MembershipSubscription] Payment error:", error);
    toast({
      title: "Payment Failed",
      description: error.message || "Payment processing failed",
      variant: "destructive",
    });
    setIsPaymentOpen(false);
  };

  // Early return with logging
  if (!membership) {
    console.log("[SUBSCRIPTION DIALOG] No membership provided, not rendering");
    return null;
  }

  console.log("[SUBSCRIPTION DIALOG] Rendering dialog with:", {
    open,
    membershipName: membership.name,
    currentStep: step
  });

  return (
    <>
      <Dialog open={open} onOpenChange={(newOpen) => {
        console.log("[SUBSCRIPTION DIALOG] Dialog open state changing to:", newOpen);
        onOpenChange(newOpen);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subscribe to {membership.name}</DialogTitle>
            <DialogDescription>
              Add a new client to this membership plan
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Select Client */}
          {step === "client" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Search Client</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {!searchQuery && (
                  <p className="text-xs text-gray-500">
                    Start typing to search for a client
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Select Client</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder={searchQuery ? "Choose a client" : "Search for a client above"} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingClients ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : filteredClients.length === 0 ? (
                      <SelectItem value="no-results" disabled>
                        {searchQuery ? "No clients found matching your search" : "Type in the search box above to find clients"}
                      </SelectItem>
                    ) : (
                      <>
                        {filteredClients.map((client: Client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span className="font-medium">{`${client.firstName || ''} ${client.lastName || ''}`.trim() || client.email.split('@')[0]}</span>
                              </div>
                              <div className="pl-6 text-sm text-gray-500">
                                {client.email}
                                {client.phone && <span className="ml-2">• {client.phone}</span>}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                        {filteredClients.length === 100 && (
                          <div className="px-2 py-1 text-xs text-gray-500 border-t">
                            Showing first 100 results. Refine your search for more specific results.
                          </div>
                        )}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Card className="bg-gray-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Membership Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-medium">{formatPrice(membership.price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{membership.duration} days</span>
                  </div>
                  {membership.benefits && (
                    <div className="text-sm">
                      <span className="text-gray-600">Benefits:</span>
                      <p className="mt-1">{membership.benefits}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    console.log("[SUBSCRIPTION DIALOG] Next button clicked from client step");
                    console.log("[SUBSCRIPTION DIALOG] Selected client ID:", selectedClientId);
                    handleClientSelect();
                  }}
                  disabled={!selectedClientId}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Payment step has been removed */}

          {/* Step 3: Billing Options */}
          {step === "billing" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Billing Options</CardTitle>
                  <CardDescription>
                    Configure automatic renewal settings for this membership
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-renew">Auto-Renewal</Label>
                      <p className="text-sm text-gray-500">
                        Automatically charge the client when membership expires
                      </p>
                    </div>
                    <Switch
                      id="auto-renew"
                      checked={autoRenew}
                      onCheckedChange={setAutoRenew}
                    />
                  </div>

                  {autoRenew && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label htmlFor="renewal-day">
                        <Calendar className="inline h-4 w-4 mr-1" />
                        Monthly Billing Day
                      </Label>
                      <Select value={renewalDay} onValueChange={setRenewalDay}>
                        <SelectTrigger id="renewal-day">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[...Array(28)].map((_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {i + 1}{i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"} of each month
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        The client will be charged on this day each month
                      </p>
                    </div>
                  )}

                </CardContent>
              </Card>

              <Card className="bg-gray-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Subscription Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Client:</span>
                    <span className="font-medium">{selectedClient ? `${selectedClient.firstName || ''} ${selectedClient.lastName || ''}`.trim() || selectedClient.email.split('@')[0] : ""}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Membership:</span>
                    <span className="font-medium">{membership.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">{formatPrice(membership.price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment Method:</span>
                    <span className="font-medium">Credit/Debit Card</span>
                  </div>
                  {autoRenew && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Auto-Renewal:</span>
                      <span className="font-medium">Day {renewalDay} of each month</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("client")}>
                  Back
                </Button>
                <Button 
                  onClick={() => {
                    console.log("[DEBUG] Button clicked! Current state:", {
                      selectedClient,
                      membership,
                      autoRenew,
                      renewalDay,
                      isPending: createSubscriptionMutation.isPending
                    });
                    handleCreateSubscription();
                  }}
                  disabled={createSubscriptionMutation.isPending}
                >
                  {createSubscriptionMutation.isPending 
                    ? "Processing..." 
                    : "Proceed to Payment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Membership Payment Modal */}
      {membership && selectedClient && (
        <HelcimPayJsModal
          open={isPaymentOpen}
          onOpenChange={setIsPaymentOpen}
          amount={membership.price}
          description={`Membership: ${membership.name}`}
          customerEmail={selectedClient.email}
          customerName={`${selectedClient.firstName || ''} ${selectedClient.lastName || ''}`.trim() || selectedClient.email.split('@')[0]}
          clientId={selectedClient.id}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      )}
    </>
  );
}
