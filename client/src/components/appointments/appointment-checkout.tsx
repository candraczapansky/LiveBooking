import { useState, useEffect } from "react";
// Square payment configuration
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Calendar, User, Clock, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";

const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APPLICATION_ID;

interface AppointmentDetails {
  id: number;
  clientName: string;
  serviceName: string;
  staffName: string;
  startTime: Date;
  endTime: Date;
  amount: number;
  status: string;
  paymentStatus: string;
}

interface CheckoutFormProps {
  appointment: AppointmentDetails;
  onSuccess: () => void;
  onCancel: () => void;
}

const CheckoutForm = ({ appointment, onSuccess, onCancel }: CheckoutFormProps) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNonce, setCardNonce] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardNonce) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/appointments",
        },
        redirect: "if_required"
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        
        // Show more helpful error messages for common test scenarios
        let errorMessage = error.message;
        if (error.code === 'card_declined') {
          if (error.decline_code === 'test_mode_live_card') {
            errorMessage = "You entered a real card number. For testing, you MUST use the test card number 4242424242424242 (not your real card).";
          } else {
            errorMessage = "For testing, use card number 4242424242424242 with any future expiry date and any 3-digit CVC.";
          }
        }
        
        toast({
          title: "Payment Failed",
          description: errorMessage,
          variant: "destructive",
        });
      } else if (paymentIntent?.status === 'succeeded') {
        // Confirm payment on backend
        try {
          await apiRequest("POST", "/api/confirm-payment", {
            paymentIntentId: paymentIntent.id,
            appointmentId: appointment.id
          });
          
          toast({
            title: "Payment Successful",
            description: "Your appointment has been confirmed!",
          });
          onSuccess();
        } catch (confirmError) {
          console.error('Backend confirmation error:', confirmError);
          toast({
            title: "Payment Processed",
            description: "Payment successful, but there was an issue updating the appointment. Please contact support.",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };



  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Payment Information</h3>
        <div id="square-card-element" className="min-h-[40px] p-3 border rounded-md">
          {/* Square Card element will be mounted here */}
        </div>
      </div>
      
      <div className="flex gap-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Back
        </Button>
        <Button 
          type="submit" 
          disabled={!cardNonce || isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
              Processing...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Pay {formatPrice(appointment.amount)}
            </div>
          )}
        </Button>
      </div>
    </form>
  );
};

interface AppointmentCheckoutProps {
  appointment: AppointmentDetails;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AppointmentCheckout({ 
  appointment, 
  isOpen, 
  onClose, 
  onSuccess 
}: AppointmentCheckoutProps) {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'gift_card' | null>(null);
  const [isCashProcessing, setIsCashProcessing] = useState(false);
  const [isGiftCardProcessing, setIsGiftCardProcessing] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState('');
  const [savedGiftCards, setSavedGiftCards] = useState<any[]>([]);
  const [selectedSavedCard, setSelectedSavedCard] = useState<any>(null);
  const [showAddNew, setShowAddNew] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && appointment.paymentStatus === 'unpaid' && paymentMethod === 'card') {
      createPaymentIntent();
    }
    if (isOpen && paymentMethod === 'gift_card') {
      fetchSavedGiftCards();
    }
  }, [isOpen, appointment.id, paymentMethod]);

  const fetchSavedGiftCards = async () => {
    try {
      const response = await apiRequest("GET", "/api/saved-gift-cards");
      const data = await response.json();
      setSavedGiftCards(data);
    } catch (error) {
      console.error('Error fetching saved gift cards:', error);
      setSavedGiftCards([]);
    }
  };

  const createPaymentIntent = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest("POST", "/api/create-payment-intent", {
        amount: appointment.amount,
        appointmentId: appointment.id,
        description: `Payment for ${appointment.serviceName} appointment`
      });
      
      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = async () => {
    // Trigger checkout completion automation
    try {
      await apiRequest("POST", "/api/automation-rules/trigger", {
        appointmentId: appointment.id,
        customTriggerName: "checkout_completed"
      });
    } catch (error) {
      console.log('Automation trigger failed, continuing with checkout completion');
    }
    
    onSuccess();
    onClose();
  };

  const handleCashPayment = async () => {
    setIsCashProcessing(true);
    
    try {
      await apiRequest("POST", "/api/confirm-cash-payment", {
        appointmentId: appointment.id
      });
      
      toast({
        title: "Cash Payment Confirmed",
        description: "Payment marked as cash paid successfully!",
      });
      handleSuccess();
    } catch (error: any) {
      console.error('Cash payment error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark payment as cash paid",
        variant: "destructive",
      });
    } finally {
      setIsCashProcessing(false);
    }
  };

  const handleGiftCardPayment = async () => {
    const codeToUse = selectedSavedCard ? selectedSavedCard.giftCard.code : giftCardCode.trim();
    
    if (!codeToUse) {
      toast({
        title: "Error",
        description: "Please select a gift card or enter a gift card code",
        variant: "destructive",
      });
      return;
    }

    setIsGiftCardProcessing(true);
    
    try {
      await apiRequest("POST", "/api/confirm-gift-card-payment", {
        appointmentId: appointment.id,
        giftCardCode: codeToUse
      });
      
      toast({
        title: "Gift Card Payment Successful",
        description: "Payment processed with gift card successfully!",
      });
      handleSuccess();
    } catch (error: any) {
      console.error('Gift card payment error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process gift card payment",
        variant: "destructive",
      });
    } finally {
      setIsGiftCardProcessing(false);
    }
  };

  const handleAddNewGiftCard = async () => {
    if (!giftCardCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a gift card code",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", "/api/add-gift-card", {
        giftCardCode: giftCardCode.trim()
      });
      
      toast({
        title: "Gift Card Added",
        description: "Gift card has been saved to your account",
      });
      
      // Refresh saved cards and reset form
      await fetchSavedGiftCards();
      setGiftCardCode('');
      setShowAddNew(false);
    } catch (error: any) {
      console.error('Add gift card error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add gift card",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  // If already paid, show confirmation
  if (appointment.paymentStatus === 'paid') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Payment Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This appointment has already been paid for.
            </p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Checkout - Appointment Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Appointment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Appointment Details</h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Client: {appointment.clientName}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {format(appointment.startTime, "PPP")}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {format(appointment.startTime, "p")} - {format(appointment.endTime, "p")}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm">Service: {appointment.serviceName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm">Staff: {appointment.staffName}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Payment Summary</h3>
            <div className="flex justify-between items-center">
              <span>Service Total:</span>
              <span className="font-semibold">{formatPrice(appointment.amount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total Amount:</span>
              <span>{formatPrice(appointment.amount)}</span>
            </div>
          </div>

          <Separator />

          {/* Test Card Information */}
          <div className="bg-red-50 dark:bg-red-950 border-2 border-red-300 dark:border-red-700 rounded-lg p-4">
            <h3 className="text-sm font-bold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
              ⚠️ IMPORTANT: Test Mode Only
            </h3>
            <div className="text-sm text-red-800 dark:text-red-200 space-y-2">
              <p className="font-semibold">DO NOT use your real credit card!</p>
              <p>This system is in test mode. Use these test details only:</p>
              <div className="bg-white dark:bg-gray-800 p-3 rounded border font-mono text-xs">
                <p><strong>Card Number:</strong> 4242 4242 4242 4242</p>
                <p><strong>Expiry:</strong> 12/25 (any future date)</p>
                <p><strong>CVC:</strong> 123 (any 3 digits)</p>
                <p><strong>Name:</strong> Test User</p>
                <p><strong>ZIP Code:</strong> 12345 (any valid ZIP)</p>
              </div>
            </div>
          </div>

          {/* Payment Method Selection or Payment Form */}
          {!paymentMethod ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Choose Payment Method</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card Payment Option */}
                  <Card 
                    className="cursor-pointer border-2 hover:border-primary/50 transition-colors"
                    onClick={() => setPaymentMethod('card')}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <CreditCard className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Pay with Card</h4>
                          <p className="text-sm text-muted-foreground">Credit or Debit Card</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Gift Card Payment Option */}
                  <Card 
                    className="cursor-pointer border-2 hover:border-purple-500/50 transition-colors"
                    onClick={() => setPaymentMethod('gift_card')}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 16h6" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold">Gift Card</h4>
                          <p className="text-sm text-muted-foreground">Use gift card code</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cash Payment Option */}
                  <Card 
                    className="cursor-pointer border-2 hover:border-green-500/50 transition-colors"
                    onClick={() => setPaymentMethod('cash')}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                          <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Cash Payment</h4>
                          <p className="text-sm text-muted-foreground">Mark as cash paid</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              <div className="flex justify-center">
                <Button onClick={onClose} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          ) : paymentMethod === 'gift_card' ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 16h6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Pay with Gift Card</h3>
                  <p className="text-muted-foreground">Amount: {formatPrice(appointment.amount)}</p>
                </div>
              </div>

              {/* Saved Gift Cards */}
              {savedGiftCards.length > 0 && !showAddNew && (
                <div className="space-y-4">
                  <h4 className="font-medium">Your Saved Gift Cards</h4>
                  <div className="space-y-2">
                    {savedGiftCards.map((saved) => (
                      <Card
                        key={saved.id}
                        className={`cursor-pointer border-2 transition-colors ${
                          selectedSavedCard?.id === saved.id 
                            ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20' 
                            : 'border-gray-200 hover:border-pink-300'
                        }`}
                        onClick={() => setSelectedSavedCard(saved)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">
                                {saved.nickname || `Gift Card ${saved.giftCard.code.slice(-4)}`}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Balance: {formatPrice(saved.giftCard.currentBalance)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Code: ****{saved.giftCard.code.slice(-4)}
                              </div>
                            </div>
                            <div className="text-right">
                              {saved.giftCard.currentBalance >= appointment.amount ? (
                                <div className="text-green-600 text-sm font-medium">✓ Sufficient</div>
                              ) : (
                                <div className="text-red-600 text-sm">Insufficient</div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Gift Card or Enter Code */}
              {(savedGiftCards.length === 0 || showAddNew) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">
                      {savedGiftCards.length > 0 ? 'Add New Gift Card' : 'Enter Gift Card Code'}
                    </h4>
                    {savedGiftCards.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddNew(false)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Enter gift card code (e.g., GIFT2025)"
                      value={giftCardCode}
                      onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      disabled={isGiftCardProcessing}
                    />
                    <div className="text-xs text-muted-foreground">
                      Test codes: GIFT2025 ($100), HOLIDAY50 ($25)
                    </div>
                    {savedGiftCards.length === 0 && (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddNewGiftCard}
                          disabled={!giftCardCode.trim()}
                          className="flex-1"
                        >
                          Save & Use Card
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={() => setPaymentMethod(null)} 
                  variant="outline"
                  disabled={isGiftCardProcessing}
                >
                  Back
                </Button>
                
                {savedGiftCards.length > 0 && !showAddNew && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddNew(true)}
                    disabled={isGiftCardProcessing}
                  >
                    Use Different Card
                  </Button>
                )}

                <Button 
                  onClick={handleGiftCardPayment}
                  disabled={
                    isGiftCardProcessing || 
                    (!selectedSavedCard && !giftCardCode.trim()) ||
                    (selectedSavedCard && selectedSavedCard.giftCard.currentBalance < appointment.amount)
                  }
                  className="bg-pink-600 hover:bg-pink-700"
                >
                  {isGiftCardProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                      Processing...
                    </div>
                  ) : (
                    'Pay with Gift Card'
                  )}
                </Button>
              </div>
            </div>
          ) : paymentMethod === 'cash' ? (
            <div className="space-y-6 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Confirm Cash Payment</h3>
                  <p className="text-muted-foreground">Mark this appointment as paid with cash</p>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-lg font-semibold">Amount: {formatPrice(appointment.amount)}</p>
              </div>
              
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={() => setPaymentMethod(null)} 
                  variant="outline"
                  disabled={isCashProcessing}
                >
                  Back
                </Button>
                <Button 
                  onClick={handleCashPayment}
                  disabled={isCashProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isCashProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                      Processing...
                    </div>
                  ) : (
                    'Confirm Cash Payment'
                  )}
                </Button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <CheckoutForm 
              appointment={appointment}
              onSuccess={handleSuccess}
              onCancel={() => setPaymentMethod(null)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}