import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface HelcimPayJsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
  description?: string;
  customerEmail?: string;
  customerName?: string;
}

export default function HelcimPayJsModal({
  open,
  onOpenChange,
  amount,
  onSuccess,
  onError,
  description = "Payment",
  customerEmail,
  customerName,
}: HelcimPayJsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentToken, setPaymentToken] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && !paymentToken) {
      // Initialize Helcim payment when modal opens
      initializePayment();
    }
  }, [open]);

  const initializePayment = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('POST', '/api/payments/helcim/initialize', {
        amount,
        description,
        customerEmail,
        customerName,
      });
      const data = await response.json();
      setPaymentToken(data.token);
      
      // Initialize Helcim.js
      if (window.Helcim && data.token) {
        window.Helcim.initialize({
          token: data.token,
          environment: process.env.NODE_ENV === 'production' ? 'production' : 'test',
          onSuccess: handlePaymentSuccess,
          onError: handlePaymentError,
          onCancel: handlePaymentCancel,
        });
      }
    } catch (error) {
      console.error('Failed to initialize payment:', error);
      handlePaymentError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (response: any) => {
    try {
      // Verify payment with backend
      const verifyResponse = await apiRequest('POST', '/api/payments/helcim/verify', {
        token: paymentToken,
        transactionId: response.transactionId,
      });
      const verifyData = await verifyResponse.json();
      
      if (verifyData.success) {
        toast({
          title: "Payment Successful",
          description: "Your payment has been processed successfully.",
        });
        onSuccess?.(verifyData);
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification failed:', error);
      handlePaymentError(error);
    } finally {
      onOpenChange(false);
      setPaymentToken(null);
    }
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment failed:', error);
    toast({
      title: "Payment Failed",
      description: "There was an error processing your payment. Please try again.",
      variant: "destructive",
    });
    onError?.(error);
    onOpenChange(false);
    setPaymentToken(null);
  };

  const handlePaymentCancel = () => {
    toast({
      title: "Payment Cancelled",
      description: "The payment process was cancelled.",
    });
    onOpenChange(false);
    setPaymentToken(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
          <DialogDescription>
            Complete your payment securely with Helcim
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div id="helcim-payment-container" className="min-h-[300px]">
              {/* Helcim.js will inject the payment form here */}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setPaymentToken(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
