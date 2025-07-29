import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

// Square payment configuration
const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APPLICATION_ID || 'sq0idp-TrqOMQPUkNYGCL2Q6h-NKA';
const SQUARE_LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID || 'L51V0YQ8H6P10';

// Declare Square global types
declare global {
  interface Window {
    Square?: any;
  }
}

interface SquarePaymentFormProps {
  amount: number;
  appointmentId: number;
  clientId: number;
  onSuccess: () => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export default function SquarePaymentForm({ 
  amount, 
  appointmentId, 
  clientId,
  onSuccess, 
  onError, 
  onCancel 
}: SquarePaymentFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardElement, setCardElement] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeSquarePaymentForm();
    
    return () => {
      // Cleanup Square elements when component unmounts
      if (cardElement) {
        cardElement.destroy();
      }
    };
  }, []);

  const initializeSquarePaymentForm = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Square Application ID is now configured with fallback

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

      // Initialize Square payments
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
      
      // Attach to element
      await card.attach('#appointment-square-card-element');
      
      setCardElement(card);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Square payment form initialization error:', err);
      setError('Failed to load payment form. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
        const response = await fetch('/api/create-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amount,
            sourceId: nonce,
            type: "appointment_payment",
            appointmentId: appointmentId,
            clientId: clientId,
            description: `Card payment for appointment #${appointmentId}`
          })
        });

        const paymentData = await response.json();
        
        if (paymentData.payment || paymentData.paymentId) {
          // Update appointment payment status
          await fetch(`/api/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paymentStatus: "paid"
            })
          });

          onSuccess();
        } else {
          throw new Error('Payment processing failed');
        }
      } else {
        const errorMessages = result.errors?.map((error: any) => error.message).join(', ') || 'Payment failed';
        onError(errorMessages);
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
      <div className="space-y-4">
        <div className="text-center py-4">
          <p className="text-red-600 mb-4">{error}</p>
          <Button 
            variant="outline" 
            onClick={initializeSquarePaymentForm}
            className="text-sm"
          >
            Retry
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Card Payment</h3>
        <p className="text-sm text-muted-foreground">
          Enter your card information to complete the payment.
        </p>
      </div>

      <div 
        id="appointment-square-card-element" 
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
      
      <div className="flex gap-2">
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
              <CreditCard className="h-4 w-4" />
              Pay ${amount.toFixed(2)}
            </div>
          )}
        </Button>
      </div>
    </form>
  );
} 