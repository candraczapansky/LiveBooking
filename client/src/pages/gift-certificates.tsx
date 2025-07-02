import { useState, useEffect } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useSidebar } from "@/contexts/SidebarContext";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Gift, CreditCard, DollarSign, Mail, User, Search, CheckCircle, XCircle, Clock, Receipt, MessageSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Square configuration
const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APPLICATION_ID || 'sq0idp-TrqOMQPUkNYGCL2Q6h-NKA';
const SQUARE_LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID || 'L51V0YQ8H6P10';

const giftCertificateSchema = z.object({
  amount: z.number().min(10, "Minimum amount is $10").max(1000, "Maximum amount is $1000"),
  recipientName: z.string().min(1, "Recipient name is required"),
  recipientEmail: z.string().email("Please enter a valid email address"),
  purchaserName: z.string().min(1, "Your name is required"),
  purchaserEmail: z.string().email("Please enter a valid email address"),
  message: z.string().optional(),
});

type GiftCertificateForm = z.infer<typeof giftCertificateSchema>;

const PRESET_AMOUNTS = [25, 50, 75, 100, 150, 200];

// Payment form component
const PaymentForm = ({ total, onSuccess, onError }: { 
  total: number; 
  onSuccess: () => void; 
  onError: (error: string) => void; 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardElement, setCardElement] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeSquarePaymentForm();
    
    return () => {
      if (cardElement) {
        cardElement.destroy();
      }
    };
  }, []);

  const initializeSquarePaymentForm = async () => {
    try {
      if (!(window as any).Square) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://web.squarecdn.com/v1/square.js';
          script.onload = resolve;
          script.onerror = reject;
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
      await card.attach('#gift-certificate-square-card-element');
      
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
        
        const response = await apiRequest("POST", "/api/create-payment", {
          amount: total,
          sourceId: nonce,
          type: "gift_certificate_payment",
          description: "Gift Certificate Purchase"
        });

        const paymentData = await response.json();
        console.log('Gift Certificate Payment response:', paymentData);
        
        if (paymentData.payment || paymentData.paymentId) {
          onSuccess();
        } else {
          console.error('Unexpected payment response:', paymentData);
          throw new Error('Payment processing failed');
        }
      } else {
        const errorMessages = result.errors?.map((error: any) => error.message).join(', ') || 'Payment failed';
        onError(errorMessages);
      }
    } catch (error: any) {
      console.error('Gift Certificate Payment processing error:', error);
      
      let errorMessage = 'Payment failed';
      if (error.response?.data?.error) {
        const serverError = error.response.data.error;
        if (serverError.includes('GENERIC_DECLINE')) {
          errorMessage = 'Card declined by bank. Please check card details or try a different payment method.';
        } else if (serverError.includes('INSUFFICIENT_FUNDS')) {
          errorMessage = 'Insufficient funds on card. Please try a different payment method.';
        } else if (serverError.includes('CVV_FAILURE')) {
          errorMessage = 'CVV verification failed. Please check your security code.';
        } else if (serverError.includes('INVALID_CARD')) {
          errorMessage = 'Invalid card information. Please check your card details.';
        } else {
          errorMessage = 'Payment processing failed. Please try again or use a different payment method.';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
            Payment Form Error
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
        <Button onClick={initializeSquarePaymentForm} className="w-full">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div 
        id="gift-certificate-square-card-element" 
        className="min-h-[60px] border rounded-lg p-3 bg-white"
        data-testid="card-element"
        role="textbox"
        aria-label="Credit card number"
      >
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

export default function GiftCertificatesPage() {
  useDocumentTitle("Gift Certificates | Glo Head Spa");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isOpen } = useSidebar();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [balanceCheckCode, setBalanceCheckCode] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [giftCertificateData, setGiftCertificateData] = useState<GiftCertificateForm | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [purchaseData, setPurchaseData] = useState<any>(null);

  const form = useForm<GiftCertificateForm>({
    resolver: zodResolver(giftCertificateSchema),
    defaultValues: {
      amount: 0,
      recipientName: "",
      recipientEmail: "",
      purchaserName: "",
      purchaserEmail: "",
      message: "",
    },
  });

  const purchaseGiftCertificateMutation = useMutation({
    mutationFn: async (data: GiftCertificateForm) => {
      const response = await apiRequest("POST", "/api/gift-certificates/purchase", data);
      return await response.json();
    },
    onSuccess: (data) => {
      setPurchaseData(data);
      setShowPaymentDialog(false);
      setShowReceiptDialog(true);
      queryClient.invalidateQueries({ queryKey: ['/api/gift-cards'] });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to purchase gift certificate",
        variant: "destructive",
      });
    },
  });

  const balanceQuery = useQuery({
    queryKey: ['/api/gift-card-balance', balanceCheckCode],
    queryFn: () => apiRequest(`/api/gift-card-balance/${balanceCheckCode}`),
    enabled: !!balanceCheckCode && balanceCheckCode.length >= 8,
    retry: false,
  });

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    form.setValue("amount", amount);
  };

  const handleCustomAmount = (value: string) => {
    const amount = parseFloat(value);
    if (!isNaN(amount)) {
      setSelectedAmount(amount);
      form.setValue("amount", amount);
    }
  };

  const onSubmit = async (data: GiftCertificateForm) => {
    setGiftCertificateData(data);
    setShowPaymentDialog(true);
  };

  const handlePaymentSuccess = async () => {
    if (!giftCertificateData) return;

    setIsProcessing(true);
    try {
      await purchaseGiftCertificateMutation.mutateAsync(giftCertificateData);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
  };

  const handleBalanceCheck = (code: string) => {
    setBalanceCheckCode(code.toUpperCase());
  };

  const handleReceiptEmailSend = async (email: string) => {
    if (!purchaseData || !email) return;

    try {
      await apiRequest("POST", "/api/send-receipt", {
        type: "gift_certificate",
        email: email,
        data: {
          giftCardCode: purchaseData.giftCard.code,
          amount: purchaseData.giftCard.initialAmount,
          recipientName: purchaseData.giftCard.issuedToName,
          recipientEmail: purchaseData.giftCard.issuedToEmail,
          purchaserName: giftCertificateData?.purchaserName,
          message: giftCertificateData?.message || ""
        }
      });

      toast({
        title: "Receipt Sent!",
        description: `Receipt sent to ${email}`,
      });
    } catch (error) {
      toast({
        title: "Failed to Send Receipt",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    }
  };

  const handleReceiptSMSSend = async (phone: string) => {
    if (!purchaseData || !phone) return;

    try {
      await apiRequest("POST", "/api/send-sms-receipt", {
        type: "gift_certificate",
        phone: phone,
        data: {
          giftCardCode: purchaseData.giftCard.code,
          amount: purchaseData.giftCard.initialAmount,
          recipientName: purchaseData.giftCard.issuedToName
        }
      });

      toast({
        title: "SMS Receipt Sent!",
        description: `Receipt sent to ${phone}`,
      });
    } catch (error) {
      toast({
        title: "Failed to Send SMS",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    }
  };

  const handleCloseReceipt = () => {
    setShowReceiptDialog(false);
    setPurchaseData(null);
    setGiftCertificateData(null);
    form.reset();
    setSelectedAmount(null);
    
    toast({
      title: "Gift Certificate Purchased!",
      description: `Gift certificate code ${purchaseData?.giftCard?.code} has been sent to ${purchaseData?.giftCard?.issuedToEmail}`,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'inactive':
      case 'used':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'expired':
        return 'Expired';
      case 'inactive':
        return 'Inactive';
      case 'used':
        return 'Fully Used';
      default:
        return status;
    }
  };

  return (
    <>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="hidden lg:block">
          <SidebarController />
        </div>
        
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
          <Header />
          
          <main className="flex-1 bg-gray-50 dark:bg-gray-900 p-6">
            <div className="w-full max-w-6xl mx-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Gift Certificates</h1>
                <p className="text-gray-600 dark:text-gray-400">Purchase and manage gift certificates</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      Check Gift Certificate Balance
                    </CardTitle>
                    <CardDescription>
                      Enter your gift certificate code to check the current balance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Gift Certificate Code
                      </label>
                      <div className="relative">
                        <Input
                          placeholder="Enter your gift certificate code"
                          value={balanceCheckCode}
                          onChange={(e) => handleBalanceCheck(e.target.value)}
                          className="uppercase"
                        />
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                      </div>
                    </div>

                    {balanceQuery.data && (
                      <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-900 dark:text-green-100">Certificate Found</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Current Balance:</span>
                            <span className="font-medium text-green-900 dark:text-green-100">
                              ${balanceQuery.data.currentBalance?.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Original Amount:</span>
                            <span className="text-gray-900 dark:text-gray-100">
                              ${balanceQuery.data.initialAmount?.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Status:</span>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(balanceQuery.data.status)}
                              <span className="text-gray-900 dark:text-gray-100">
                                {getStatusText(balanceQuery.data.status)}
                              </span>
                            </div>
                          </div>
                          {balanceQuery.data.expiryDate && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Expires:</span>
                              <span className="text-gray-900 dark:text-gray-100">
                                {new Date(balanceQuery.data.expiryDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Recipient:</span>
                            <span className="text-gray-900 dark:text-gray-100">
                              {balanceQuery.data.issuedToName}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {balanceQuery.error && (
                      <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-red-600" />
                          <span className="text-sm text-red-700 dark:text-red-300">
                            Gift certificate not found or invalid code
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="h-5 w-5" />
                      Purchase Gift Certificate
                    </CardTitle>
                    <CardDescription>
                      Buy a gift certificate for someone special
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-3">
                          <label className="text-sm font-medium leading-none">
                            Select Amount
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {PRESET_AMOUNTS.map((amount) => (
                              <Button
                                key={amount}
                                type="button"
                                variant={selectedAmount === amount ? "default" : "outline"}
                                className="h-12"
                                onClick={() => handleAmountSelect(amount)}
                              >
                                ${amount}
                              </Button>
                            ))}
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">
                              Or enter custom amount
                            </label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                              <Input
                                type="number"
                                placeholder="0.00"
                                className="pl-10"
                                min="10"
                                max="1000"
                                step="0.01"
                                onChange={(e) => handleCustomAmount(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="recipientName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Recipient Name</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <Input
                                      placeholder="Recipient's full name"
                                      className="pl-10"
                                      {...field}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="recipientEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Recipient Email</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <Input
                                      type="email"
                                      placeholder="recipient@example.com"
                                      className="pl-10"
                                      {...field}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="purchaserName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Your Name</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <Input
                                      placeholder="Your full name"
                                      className="pl-10"
                                      {...field}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="purchaserEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Your Email</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <Input
                                      type="email"
                                      placeholder="your@example.com"
                                      className="pl-10"
                                      {...field}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Personal Message (Optional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Add a personal message for the recipient..."
                                  rows={3}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isProcessing || !selectedAmount || selectedAmount < 10}
                        >
                          {isProcessing ? "Processing..." : `Purchase Gift Certificate ${selectedAmount ? `($${selectedAmount})` : ""}`}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
      
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Complete Your Gift Certificate Purchase</DialogTitle>
            <DialogDescription>
              {giftCertificateData && (
                <>
                  Complete payment for a ${giftCertificateData.amount} gift certificate for {giftCertificateData.recipientName}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {giftCertificateData && (
            <PaymentForm 
              total={giftCertificateData.amount} 
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Confirmation Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Gift Certificate Purchase Complete!
            </DialogTitle>
            <DialogDescription>
              Your gift certificate has been successfully purchased and emailed to the recipient.
            </DialogDescription>
          </DialogHeader>
          
          {purchaseData && (
            <div className="space-y-6">
              {/* Purchase Summary */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="font-medium text-green-900 dark:text-green-100 mb-3">Purchase Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Gift Certificate Code:</span>
                    <span className="font-mono font-medium text-green-900 dark:text-green-100">
                      {purchaseData.giftCard.code}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                    <span className="font-medium text-green-900 dark:text-green-100">
                      ${purchaseData.giftCard.initialAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Recipient:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {purchaseData.giftCard.issuedToName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Sent to:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {purchaseData.giftCard.issuedToEmail}
                    </span>
                  </div>
                </div>
              </div>

              {/* Receipt Options */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Send Receipt Copy</h3>
                
                {/* Email Receipt */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Receipt
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      id="receipt-email"
                      className="flex-1"
                    />
                    <Button
                      onClick={() => {
                        const email = (document.getElementById('receipt-email') as HTMLInputElement)?.value;
                        if (email) {
                          handleReceiptEmailSend(email);
                          (document.getElementById('receipt-email') as HTMLInputElement).value = '';
                        }
                      }}
                      variant="outline"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>

                {/* SMS Receipt */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    SMS Receipt
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      placeholder="Enter phone number"
                      id="receipt-phone"
                      className="flex-1"
                    />
                    <Button
                      onClick={() => {
                        const phone = (document.getElementById('receipt-phone') as HTMLInputElement)?.value;
                        if (phone) {
                          handleReceiptSMSSend(phone);
                          (document.getElementById('receipt-phone') as HTMLInputElement).value = '';
                        }
                      }}
                      variant="outline"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={handleCloseReceipt} className="w-full">
              <Receipt className="h-4 w-4 mr-2" />
              Complete Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}