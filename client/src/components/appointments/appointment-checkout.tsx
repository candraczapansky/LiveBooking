import { useState, useEffect } from "react";
import { useStripe, useElements, PaymentElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Calendar, User, Clock, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";

// Initialize Stripe
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
if (!stripePublicKey) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(stripePublicKey);

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
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
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
        <PaymentElement />
      </div>
      
      <div className="flex gap-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || isProcessing}
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
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && appointment.paymentStatus === 'unpaid') {
      createPaymentIntent();
    }
  }, [isOpen, appointment.id]);

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
    onSuccess();
    onClose();
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
              </div>
            </div>
          </div>

          {/* Payment Form */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : clientSecret ? (
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: {
                  theme: 'stripe'
                }
              }}
            >
              <CheckoutForm 
                appointment={appointment}
                onSuccess={handleSuccess}
                onCancel={onClose}
              />
            </Elements>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Unable to load payment form</p>
              <Button onClick={onClose} variant="outline" className="mt-4">
                Close
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}