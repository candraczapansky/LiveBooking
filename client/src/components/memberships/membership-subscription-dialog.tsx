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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Users, UserPlus, CreditCard, Receipt, Check, X, Mail, Phone, DollarSign } from "lucide-react";

// Square payment configuration
const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APPLICATION_ID;
const SQUARE_LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID;

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
  phone?: string;
  role: string;
};

interface MembershipSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: Membership | null;
}

export default function MembershipSubscriptionDialog({
  open,
  onOpenChange,
  membership,
}: MembershipSubscriptionDialogProps) {
  const [step, setStep] = useState<'select' | 'payment' | 'receipt'>('select');
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cardElement, setCardElement] = useState<any>(null);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [receiptEmail, setReceiptEmail] = useState("");
  const [receiptPhone, setReceiptPhone] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all clients
  const { data: clients } = useQuery({
    queryKey: ['/api/users', { role: 'client' }],
    queryFn: async () => {
      const response = await fetch('/api/users?role=client');
      return response.json();
    },
    enabled: open
  });

  // Get existing subscribers
  const { data: subscribers } = useQuery({
    queryKey: ['/api/client-memberships', membership?.id],
    queryFn: async () => {
      if (!membership?.id) return [];
      const response = await fetch(`/api/client-memberships?membershipId=${membership.id}`);
      return response.json();
    },
    enabled: open && !!membership?.id
  });

  // Filter available clients
  const availableClients = clients?.filter((client: User) => {
    const matchesSearch = !searchQuery || 
      client.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isNotSubscribed = !subscribers?.some((sub: any) => sub.clientId === client.id);
    
    return matchesSearch && isNotSubscribed;
  }) || [];

  // Reset dialog state when opening/closing
  useEffect(() => {
    if (open) {
      setStep('select');
      setSelectedClientId("");
      setSelectedClient(null);
      setSearchQuery("");
      setPaymentResult(null);
      setReceiptEmail("");
      setReceiptPhone("");
      setCardElement(null);
    }
  }, [open]);

  // Initialize Square payment when payment step is shown
  useEffect(() => {
    if (step === 'payment' && !cardElement) {
      initializeSquarePayment();
    }
  }, [step]);

  const initializeSquarePayment = async () => {
    if (!window.Square) {
      console.error('Square Web SDK not loaded');
      return;
    }

    try {
      setIsPaymentLoading(true);
      const payments = window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
      const card = await payments.card({
        style: {
          input: {
            fontSize: '16px',
            fontFamily: '"Helvetica Neue", Arial, sans-serif'
          },
          '.input-container': {
            borderColor: '#E5E7EB',
            borderRadius: '6px'
          }
        }
      });
      await card.attach('#square-card-membership-new');
      setCardElement(card);
      setIsPaymentLoading(false);
    } catch (error: any) {
      console.error('Square payment form initialization error:', error);
      setIsPaymentLoading(false);
      toast({
        title: "Payment Error",
        description: "Failed to load payment form. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClientSelection = () => {
    const client = clients?.find((c: User) => c.id === parseInt(selectedClientId));
    if (!client) return;
    
    setSelectedClient(client);
    setReceiptEmail(client.email || "");
    setReceiptPhone(client.phone || "");
    setStep('payment');
  };

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
          method: "card",
          status: "completed",
          type: "membership",
          description: `Membership payment for ${membership.name}`,
          squarePaymentId: paymentData.payment.id,
          paymentDate: new Date()
        });
        const paymentRecord = await paymentRecordResponse.json();

        setPaymentResult({
          membership: membershipSubscription,
          payment: paymentRecord,
          squarePayment: paymentData.payment
        });

        setStep('receipt');
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
          transactionId: paymentResult.squarePayment.id,
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
          transactionId: paymentResult.squarePayment.id,
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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'payment' ? <CreditCard className="h-5 w-5" /> : 
             step === 'receipt' ? <Receipt className="h-5 w-5" /> :
             <Users className="h-5 w-5" />}
            {step === 'payment' ? "Process Payment" :
             step === 'receipt' ? "Send Receipt" :
             "Add Subscriber"}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-6">
            {/* Membership Info */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{membership?.name}</h3>
                <div className="flex items-center gap-1 text-lg font-bold">
                  <DollarSign className="h-4 w-4" />
                  {membership?.price?.toFixed(2)}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{membership?.description}</p>
            </div>

            {/* Client Selection */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Select Client</Label>
              
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search clients by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
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
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-6">
            {/* Client and Membership Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium mb-2">Client</h4>
                <p className="text-sm">{getFullName(selectedClient?.firstName, selectedClient?.lastName)}</p>
                <p className="text-xs text-muted-foreground">{selectedClient?.email}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium mb-2">Membership</h4>
                <p className="text-sm">{membership?.name}</p>
                <p className="text-lg font-bold">${membership?.price?.toFixed(2)}</p>
              </div>
            </div>

            {/* Payment Form */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Payment Information</Label>
              <div className="border rounded-lg p-4">
                {isPaymentLoading ? (
                  <div className="text-center py-8">
                    <p>Loading payment form...</p>
                  </div>
                ) : (
                  <div id="square-card-membership-new" className="min-h-[100px]"></div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'receipt' && (
          <div className="space-y-6">
            {/* Payment Success */}
            <div className="text-center py-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Payment Successful!</h3>
              <p className="text-sm text-muted-foreground">
                {selectedClient?.firstName} {selectedClient?.lastName} has been subscribed to {membership?.name}
              </p>
            </div>

            {/* Receipt Options */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Send Receipt</Label>
              
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Email address"
                    value={receiptEmail}
                    onChange={(e) => setReceiptEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => sendEmailReceiptMutation.mutate(receiptEmail)}
                    disabled={!receiptEmail || sendEmailReceiptMutation.isPending}
                    size="sm"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {sendEmailReceiptMutation.isPending ? "Sending..." : "Email"}
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Phone number"
                    value={receiptPhone}
                    onChange={(e) => setReceiptPhone(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => sendSMSReceiptMutation.mutate(receiptPhone)}
                    disabled={!receiptPhone || sendSMSReceiptMutation.isPending}
                    size="sm"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    {sendSMSReceiptMutation.isPending ? "Sending..." : "SMS"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'select' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleClientSelection}
                disabled={!selectedClientId}
              >
                Continue to Payment
              </Button>
            </>
          )}
          
          {step === 'payment' && (
            <>
              <Button variant="outline" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button 
                onClick={() => processPaymentMutation.mutate()}
                disabled={paymentProcessing || !cardElement}
              >
                {paymentProcessing ? "Processing..." : `Pay $${membership?.price?.toFixed(2)}`}
              </Button>
            </>
          )}
          
          {step === 'receipt' && (
            <Button onClick={handleCompleteTransaction}>
              Complete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}