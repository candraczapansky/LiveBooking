import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Calendar, User, Clock, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import SquareSetup from "../square-setup";

// Square payment configuration
const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APPLICATION_ID || 
                     localStorage.getItem('VITE_SQUARE_APPLICATION_ID') || 
                     'sandbox-sq0idb-your-app-id';

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
  const [paymentForm, setPaymentForm] = useState<any>(null);
  const [cardElement, setCardElement] = useState<any>(null);

  useEffect(() => {
    initializeSquarePaymentForm();
    return () => {
      if (paymentForm) {
        paymentForm.destroy();
      }
    };
  }, []);

  const initializeSquarePaymentForm = async () => {
    try {
      // Load Square Web SDK if not already loaded
      if (!window.Square) {
        const script = document.createElement('script');
        script.src = 'https://sandbox.web.squarecdn.com/v1/square.js'; // Use sandbox for testing
        script.async = true;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const payments = window.Square.payments(SQUARE_APP_ID, 'main'); // Use 'main' for sandbox location
      const card = await payments.card({
        style: {
          input: {
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#000',
            backgroundColor: '#fff'
          },
          '.input-container': {
            borderColor: '#e5e7eb',
            borderRadius: '0.375rem'
          }
        }
      });
      await card.attach('#square-card-element');
      
      setPaymentForm(payments);
      setCardElement(card);
    } catch (error) {
      console.error('Error initializing Square payment form:', error);
      toast({
        title: "Payment Form Error",
        description: "Failed to load payment form. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardElement) {
      toast({
        title: "Payment Form Not Ready",
        description: "Please wait for the payment form to load.",
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
          toast({
            title: "Payment Successful",
            description: "Your appointment payment has been processed!",
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Payment Information</h3>
        <div id="square-card-element" className="min-h-[80px] p-3 border rounded-md bg-white">
          {/* Square Card element will be mounted here */}
          {!cardElement && (
            <div className="flex items-center justify-center h-16 text-muted-foreground">
              Loading payment form...
            </div>
          )}
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
          disabled={!cardElement || isProcessing}
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
  const [showSquareSetup, setShowSquareSetup] = useState(false);
  const { toast } = useToast();

  // Check if Square is configured
  const isSquareConfigured = () => {
    const appId = import.meta.env.VITE_SQUARE_APPLICATION_ID || localStorage.getItem('VITE_SQUARE_APPLICATION_ID');
    const locationId = localStorage.getItem('SQUARE_LOCATION_ID');
    return appId && locationId && appId !== 'sandbox-sq0idb-your-app-id';
  };

  const handleCashPayment = async () => {
    setIsCashProcessing(true);
    try {
      await apiRequest("POST", "/api/record-cash-payment", {
        appointmentId: appointment.id,
        amount: appointment.amount,
        type: "appointment_payment"
      });
      
      toast({
        title: "Cash Payment Recorded",
        description: "Cash payment has been recorded successfully.",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record cash payment.",
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
                <strong>CVC:</strong> 123 (any valid ZIP)<br />
                <strong>Name:</strong> Test User<br />
                <strong>ZIP Code:</strong> 12345 (any valid ZIP)
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  // Show Square setup if not configured
  if (showSquareSetup || !isSquareConfigured()) {
    return <SquareSetup onComplete={() => setShowSquareSetup(false)} />;
  }

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
                  onClick={() => {
                    if (!isSquareConfigured()) {
                      setShowSquareSetup(true);
                    } else {
                      setPaymentMethod('card');
                    }
                  }}
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