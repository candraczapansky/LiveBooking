import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Calendar, User, Clock, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";

// Square payment configuration
const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APPLICATION_ID;

// Declare Square global types
declare global {
  interface Window {
    Square?: any;
  }
}

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
  const [isLoading, setIsLoading] = useState(true);
  const [cardElement, setCardElement] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeSquarePaymentForm();
  }, []);

  const initializeSquarePaymentForm = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!SQUARE_APP_ID) {
        throw new Error('Square Application ID not configured');
      }

      // Load Square Web SDK
      if (!window.Square) {
        const script = document.createElement('script');
        const isSandbox = SQUARE_APP_ID.includes('sandbox');
        script.src = isSandbox 
          ? 'https://sandbox.web.squarecdn.com/v1/square.js' 
          : 'https://web.squarecdn.com/v1/square.js';
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load Square SDK'));
          document.head.appendChild(script);
        });
      }

      // Initialize Square payments
      const payments = window.Square.payments(SQUARE_APP_ID);
      const card = await payments.card();
      
      // Attach to element
      await card.attach('#square-card-element');
      
      setCardElement(card);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Error initializing Square payment form:', error);
      setError(error.message || 'Failed to load payment form');
      setIsLoading(false);
    }
  };

  const handleCashPayment = async () => {
    setIsProcessing(true);
    try {
      const paymentData = await apiRequest("POST", "/api/create-payment", {
        amount: appointment.amount,
        sourceId: "cash",
        type: "appointment_payment",
        appointmentId: appointment.id,
        description: `Cash payment for ${appointment.serviceName} appointment`
      });

      toast({
        title: "Payment Successful",
        description: "Cash payment recorded successfully",
      });

      await apiRequest("POST", "/api/confirm-payment", {
        paymentId: "cash",
        appointmentId: appointment.id
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.response?.data?.error || "Failed to process cash payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardElement) {
      toast({
        title: "Payment Error",
        description: "Payment form not ready. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const result = await cardElement.tokenize();
      
      if (result.status === 'OK') {
        const nonce = result.token;
        
        // Process payment with Square
        const paymentData = await apiRequest("POST", "/api/create-payment", {
          amount: appointment.amount,
          sourceId: nonce,
          type: "appointment_payment",
          appointmentId: appointment.id,
          description: `Payment for ${appointment.serviceName} appointment`
        });

        if (paymentData.payment) {
          // Confirm the payment in the database
          await apiRequest("POST", "/api/confirm-payment", {
            paymentId: paymentData.paymentId,
            appointmentId: appointment.id
          });

          toast({
            title: "Payment Successful",
            description: `Credit card payment of $${appointment.amount} processed successfully`,
          });
          onSuccess();
        } else {
          throw new Error('Payment processing failed');
        }
      } else {
        const errorMessages = result.errors?.map((error: any) => error.message).join(', ') || 'Payment failed';
        toast({
          title: "Payment Failed",
          description: errorMessages,
          variant: "destructive",
        });
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

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
            Payment Form Error
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Back
          </Button>
          <Button onClick={initializeSquarePaymentForm} className="flex-1">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Payment Information</h3>
        
        <div id="square-card-element" className="min-h-[60px] border rounded-lg p-3 bg-white">
          {/* Square Card element will be mounted here */}
        </div>
        
        {isLoading && (
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
            Loading secure payment form...
          </div>
        )}
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
          disabled={!cardElement || isProcessing || isLoading}
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
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | null>(null);
  const [isCashProcessing, setIsCashProcessing] = useState(false);
  const { toast } = useToast();

  const handleCashPayment = async () => {
    setIsCashProcessing(true);
    try {
      const paymentData = await apiRequest("POST", "/api/create-payment", {
        amount: appointment.amount,
        sourceId: "cash",
        type: "appointment_payment",
        appointmentId: appointment.id,
        description: `Cash payment for ${appointment.serviceName} appointment`
      });

      await apiRequest("POST", "/api/confirm-payment", {
        paymentId: paymentData.paymentId,
        appointmentId: appointment.id
      });
      
      toast({
        title: "Cash Payment Recorded",
        description: `Cash payment of $${appointment.amount} recorded successfully`,
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Cash Payment Error",
        description: error.response?.data?.error || "Failed to record cash payment",
        variant: "destructive",
      });
    } finally {
      setIsCashProcessing(false);
    }
  };

  // Show test mode notice
  const showTestModeNotice = () => {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <CreditCard className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Test Mode Only
            </h3>
            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
              <p>DO NOT use your real credit card!</p>
              <p className="font-mono mt-1">
                <strong>Card Number:</strong> 4242 4242 4242 4242<br />
                <strong>Expiry:</strong> 12/25 (any future date)<br />
                <strong>CVC:</strong> 123<br />
                <strong>ZIP Code:</strong> 12345
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Appointment Checkout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Appointment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Appointment Details</h3>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Client:</span>
                <span>{appointment.clientName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Date:</span>
                <span>{format(appointment.startTime, "PPP")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Time:</span>
                <span>{format(appointment.startTime, "p")} - {format(appointment.endTime, "p")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Service:</span>
                <span>{appointment.serviceName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Staff:</span>
                <span>{appointment.staffName}</span>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Payment Summary</h3>
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Service Total:</span>
                <span>{formatPrice(appointment.amount)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total Amount:</span>
                <span>{formatPrice(appointment.amount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          {!paymentMethod && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Payment Method</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2"
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard className="w-6 h-6" />
                  <span>Credit Card</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2"
                  onClick={() => setPaymentMethod('cash')}
                >
                  <DollarSign className="w-6 h-6" />
                  <span>Cash</span>
                </Button>
              </div>
            </div>
          )}

          {/* Credit Card Payment */}
          {paymentMethod === 'card' && (
            <div className="space-y-4">
              {showTestModeNotice()}
              <CheckoutForm
                appointment={appointment}
                onSuccess={() => {
                  onSuccess();
                  onClose();
                }}
                onCancel={() => setPaymentMethod(null)}
              />
            </div>
          )}

          {/* Cash Payment */}
          {paymentMethod === 'cash' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Cash Payment</h3>
              <p className="text-muted-foreground">
                Record this appointment as paid with cash.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setPaymentMethod(null)}
                  disabled={isCashProcessing}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCashPayment}
                  disabled={isCashProcessing}
                  className="flex-1"
                >
                  {isCashProcessing ? "Processing..." : "Record Cash Payment"}
                </Button>
              </div>
            </div>
          )}

          {/* Cancel Button */}
          {!paymentMethod && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}