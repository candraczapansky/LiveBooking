import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Users, UserPlus, CreditCard, Receipt, Check, X, Mail, Phone, DollarSign } from "lucide-react";

// Square payment configuration
const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APPLICATION_ID;
const SQUARE_LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID;

// Square Payment Form Component (based on working POS implementation)
interface PaymentFormProps {
  total: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const PaymentForm = ({ total, onSuccess, onError }: PaymentFormProps) => {
  const [cardElement, setCardElement] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeSquarePayment();
  }, []);

  const initializeSquarePayment = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!SQUARE_APP_ID) {
        throw new Error('Square Application ID not configured');
      }

      // Load Square Web SDK dynamically
      if (!window.Square) {
        const script = document.createElement('script');
        script.src = 'https://web.squarecdn.com/v1/square.js';
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load Square SDK'));
          document.head.appendChild(script);
        });
      }

      const payments = (window as any).Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
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
      await card.attach('#membership-square-card-element');
      
      setCardElement(card);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Square payment form initialization error:', err);
      setError('Failed to load payment form. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!cardElement) {
      onError('Payment form not ready. Please try again.');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await cardElement.tokenize();
      
      if (result.status === 'OK') {
        const nonce = result.token;
        
        // Process payment with Square
        const response = await apiRequest("POST", "/api/create-payment", {
          amount: total,
          sourceId: nonce,
          locationId: SQUARE_LOCATION_ID,
          type: "membership_payment",
          description: "Membership Subscription Payment"
        });

        const paymentData = await response.json();
        
        if (paymentData.payment && paymentData.payment.status === 'COMPLETED') {
          onSuccess();
        } else {
          throw new Error('Payment was not completed successfully');
        }
      } else {
        const errorMessage = result.errors?.[0]?.detail || 'Payment processing failed';
        onError(errorMessage);
      }
    } catch (err: any) {
      console.error('Payment processing error:', err);
      onError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-red-600 mb-4">{error}</p>
        <Button 
          variant="outline" 
          onClick={initializeSquarePayment}
          className="text-sm"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div 
        id="membership-square-card-element" 
        className="min-h-[60px] border rounded-lg p-3 bg-white"
        data-testid="card-element"
        role="textbox"
        aria-label="Credit card number"
      >
        {/* Square Card element will be mounted here */}
      </div>
      
      {isLoading && (
        <div className="flex items-center justify-center text-sm text-muted-foreground">
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
          Loading secure payment form...
        </div>
      )}
      
      <Button 
        type="submit" 
        disabled={!cardElement || isProcessing || isLoading}
        className="w-full"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
            Processing...
          </div>
        ) : (
          `Pay $${total.toFixed(2)}`
        )}
      </Button>
    </form>
  );
};

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
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [receiptEmail, setReceiptEmail] = useState("");
  const [receiptPhone, setReceiptPhone] = useState("");
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Receipt sending mutations
  const sendReceiptEmailMutation = useMutation({
    mutationFn: async ({ email, receiptData }: { email: string; receiptData: any }) => {
      return apiRequest("POST", "/api/send-receipt-email", {
        email,
        subject: 'Membership Subscription Receipt',
        receiptData
      });
    },
    onSuccess: () => {
      toast({
        title: "Email sent successfully",
        description: "Receipt has been sent via email"
      });
      setManualEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email",
        description: error.response?.data?.error || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const sendReceiptSMSMutation = useMutation({
    mutationFn: async ({ phone, receiptData }: { phone: string; receiptData: any }) => {
      return apiRequest("POST", "/api/send-receipt-sms", {
        phone,
        receiptData
      });
    },
    onSuccess: () => {
      toast({
        title: "SMS sent successfully",
        description: "Receipt has been sent via SMS"
      });
      setManualPhone("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send SMS",
        description: error.response?.data?.error || "An error occurred",
        variant: "destructive"
      });
    }
  });

  // Get all clients
  const { data: clients } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users?role=client');
      return response.json();
    },
    enabled: open
  });

  // Get current subscribers for this membership
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
    }
  }, [open]);

  const handlePaymentSuccess = async () => {
    try {
      // Create the membership subscription
      const membershipData = await apiRequest("POST", "/api/client-memberships", {
        clientId: selectedClient?.id,
        membershipId: membership?.id,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + (membership?.duration || 30) * 24 * 60 * 60 * 1000).toISOString(),
        active: true
      });

      // Create payment record
      const paymentRecord = await apiRequest("POST", "/api/payments", {
        clientId: selectedClient?.id,
        clientMembershipId: membershipData.id,
        amount: membership?.price,
        method: "card",
        status: "completed",
        type: "membership",
        description: `Membership payment for ${membership?.name}`,
        paymentDate: new Date().toISOString()
      });

      // Set up transaction data for receipt
      setLastTransaction({
        transactionId: paymentRecord.id || `TXN-${Date.now()}`,
        total: membership?.price,
        paymentMethod: 'card',
        membership: membership,
        client: selectedClient,
        items: [{
          name: membership?.name,
          price: membership?.price,
          quantity: 1
        }]
      });

      // Close main dialog and show receipt dialog
      onOpenChange(false);
      setShowReceiptDialog(true);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/client-memberships"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    } catch (error: any) {
      console.error('Subscription creation error:', error);
      toast({
        title: "Error",
        description: "Payment succeeded but failed to create membership. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment Failed", 
      description: error,
      variant: "destructive",
    });
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients?.find((c: User) => c.id === parseInt(clientId));
    setSelectedClient(client || null);
  };

  const handleNext = () => {
    if (selectedClient) {
      setStep('payment');
    }
  };

  const handleBack = () => {
    if (step === 'payment') {
      setStep('select');
    } else if (step === 'receipt') {
      setStep('payment');
    }
  };

  const sendEmailReceipt = async () => {
    if (!receiptEmail) return;
    
    try {
      const response = await apiRequest("POST", "/api/send-receipt-email", {
        email: receiptEmail,
        type: 'membership',
        membershipName: membership?.name,
        amount: membership?.price,
        clientName: `${selectedClient?.firstName || ''} ${selectedClient?.lastName || ''}`.trim()
      });
      
      toast({
        title: "Email Sent",
        description: "Receipt has been sent successfully",
      });
      setReceiptEmail("");
    } catch (error) {
      toast({
        title: "Email Failed",
        description: "Failed to send receipt email",
        variant: "destructive",
      });
    }
  };

  const sendSMSReceipt = async () => {
    if (!receiptPhone) return;
    
    try {
      const response = await apiRequest("POST", "/api/send-receipt-sms", {
        phone: receiptPhone,
        type: 'membership',
        membershipName: membership?.name,
        amount: membership?.price,
        clientName: `${selectedClient?.firstName || ''} ${selectedClient?.lastName || ''}`.trim()
      });
      
      toast({
        title: "SMS Sent",
        description: "Receipt has been sent successfully",
      });
      setReceiptPhone("");
    } catch (error) {
      toast({
        title: "SMS Failed",
        description: "Failed to send receipt SMS",
        variant: "destructive",
      });
    }
  };

  return (
    <React.Fragment>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Subscribe to {membership?.name}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            {/* Client Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Client</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search clients..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Available Clients List */}
            <div className="max-h-64 overflow-y-auto border rounded-lg">
              {availableClients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p>No available clients found</p>
                  <p className="text-sm text-gray-400">All clients may already be subscribed</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {availableClients.map((client: User) => (
                    <div
                      key={client.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedClientId === client.id.toString()
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-gray-50 border-transparent'
                      } border`}
                      onClick={() => handleClientSelect(client.id.toString())}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {client.firstName} {client.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{client.email}</p>
                          {client.phone && (
                            <p className="text-sm text-gray-400">{client.phone}</p>
                          )}
                        </div>
                        {selectedClientId === client.id.toString() && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Next Button */}
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleNext}
                disabled={!selectedClient}
                className="flex items-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Continue to Payment
              </Button>
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-4">
            {/* Selected Client Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <Label className="text-sm font-medium">Selected Client</Label>
              <div className="mt-1">
                <p className="font-medium">{selectedClient?.firstName} {selectedClient?.lastName}</p>
                <p className="text-sm text-gray-600">{selectedClient?.email}</p>
              </div>
            </div>

            {/* Membership Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <Label className="text-sm font-medium">Membership Details</Label>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between">
                  <span>{membership?.name}</span>
                  <span className="font-medium">${membership?.price?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Duration</span>
                  <span>{membership?.duration} days</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>${membership?.price?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Payment Information</Label>
              <PaymentForm
                total={membership?.price || 0}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </div>

            {/* Back Button */}
            <div className="flex justify-start pt-4">
              <Button variant="outline" onClick={handleBack}>
                Back to Client Selection
              </Button>
            </div>
          </div>
        )}

        {step === 'receipt' && (
          <div className="space-y-4">
            {/* Success Message */}
            <div className="text-center py-4">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-800">Payment Successful!</h3>
              <p className="text-gray-600">Membership subscription has been created.</p>
            </div>

            {/* Transaction Details */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Client:</span>
                <span className="font-medium">{selectedClient?.firstName} {selectedClient?.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Membership:</span>
                <span className="font-medium">{membership?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">${membership?.price?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="text-green-600 font-medium">Completed</span>
              </div>
            </div>

            {/* Receipt Options */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Send Receipt</Label>
              
              {/* Email Receipt */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Enter email address"
                    type="email"
                    value={receiptEmail}
                    onChange={(e) => setReceiptEmail(e.target.value)}
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={sendEmailReceipt}
                  disabled={!receiptEmail}
                  className="flex items-center gap-1"
                >
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
              </div>

              {/* SMS Receipt */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Enter phone number"
                    type="tel"
                    value={receiptPhone}
                    onChange={(e) => setReceiptPhone(e.target.value)}
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={sendSMSReceipt}
                  disabled={!receiptPhone}
                  className="flex items-center gap-1"
                >
                  <Phone className="h-4 w-4" />
                  SMS
                </Button>
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-4">
              <Button onClick={() => onOpenChange(false)}>
                <Receipt className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Receipt Confirmation Dialog */}
    <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Payment Successful
          </DialogTitle>
          <DialogDescription>
            Would you like to send a receipt to the customer?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Summary */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-600">Client:</span>
              <span className="font-medium">{lastTransaction?.client?.firstName} {lastTransaction?.client?.lastName}</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-600">Membership:</span>
              <span className="font-medium">{lastTransaction?.membership?.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="font-bold">${lastTransaction?.total?.toFixed(2)}</span>
            </div>
          </div>

          {/* Receipt Options */}
          <div className="space-y-4">
            <p className="text-sm font-medium">Send receipt via:</p>
            
            {/* Existing Customer Contact Info */}
            {lastTransaction?.client?.email && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  sendReceiptEmailMutation.mutate({
                    email: lastTransaction.client.email,
                    receiptData: lastTransaction
                  });
                }}
                disabled={sendReceiptEmailMutation.isPending}
              >
                <Mail className="h-4 w-4 mr-2" />
                {sendReceiptEmailMutation.isPending ? "Sending..." : `Email to ${lastTransaction.client.email}`}
              </Button>
            )}

            {lastTransaction?.client?.phone && (
              <Button
                variant="outline" 
                className="w-full justify-start"
                onClick={() => {
                  sendReceiptSMSMutation.mutate({
                    phone: lastTransaction.client.phone,
                    receiptData: lastTransaction
                  });
                }}
                disabled={sendReceiptSMSMutation.isPending}
              >
                <Phone className="h-4 w-4 mr-2" />
                {sendReceiptSMSMutation.isPending ? "Sending..." : `SMS to ${lastTransaction.client.phone}`}
              </Button>
            )}

            {/* Manual Entry Options */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs text-gray-500">Or enter manually:</p>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Enter email address"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (manualEmail) {
                      sendReceiptEmailMutation.mutate({
                        email: manualEmail,
                        receiptData: lastTransaction
                      });
                    }
                  }}
                  disabled={!manualEmail || sendReceiptEmailMutation.isPending}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Enter phone number"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (manualPhone) {
                      sendReceiptSMSMutation.mutate({
                        phone: manualPhone,
                        receiptData: lastTransaction
                      });
                    }
                  }}
                  disabled={!manualPhone || sendReceiptSMSMutation.isPending}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  SMS
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowReceiptDialog(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Skip Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </React.Fragment>
  );
}