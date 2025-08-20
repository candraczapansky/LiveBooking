import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface HelcimPayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  description?: string;
  customerEmail?: string;
  customerName?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export default function HelcimPay({
  open,
  onOpenChange,
  amount,
  description = "Payment",
  customerEmail,
  customerName,
  onSuccess,
  onError,
}: HelcimPayProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  const initializeHelcimPay = useCallback(async () => {
    if (!window.helcimPay || isInitialized) return;

    try {
      setIsLoading(true);

      // Initialize Helcim Pay.js
      await window.helcimPay.initialize({
        accountId: import.meta.env.VITE_HELCIM_ACCOUNT_ID,
        terminalId: import.meta.env.VITE_HELCIM_TERMINAL_ID,
        test: process.env.NODE_ENV !== 'production',
      });

      // Mount the payment form
      window.helcimPay.mount('helcim-payment-form');
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize Helcim Pay:', error);
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  useEffect(() => {
    if (open && !isInitialized) {
      initializeHelcimPay();
    }
  }, [open, isInitialized, initializeHelcimPay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (window.helcimPay && isInitialized) {
        window.helcimPay.unmount();
        setIsInitialized(false);
      }
    };
  }, [isInitialized]);

  const handlePayment = async () => {
    if (!window.helcimPay || !isInitialized) {
      handleError(new Error('Payment form not initialized'));
      return;
    }

    try {
      setIsLoading(true);

      // Get payment token from Helcim Pay.js
      const { token, error } = await window.helcimPay.createToken();
      
      if (error) {
        throw new Error(error);
      }

      if (!token) {
        throw new Error('No payment token received');
      }

      // Process payment with backend
      const response = await apiRequest('POST', '/api/payments/helcim/process', {
        token,
        amount,
        description,
        customerEmail,
        customerName,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Payment processing failed');
      }

      // Handle success
      toast({
        title: "Payment Successful",
        description: "Your payment has been processed successfully.",
      });

      onSuccess?.(data);
      onOpenChange(false);
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (error: any) => {
    console.error('Payment error:', error);
    toast({
      title: "Payment Failed",
      description: error.message || "There was an error processing your payment. Please try again.",
      variant: "destructive",
    });
    onError?.(error);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div id="helcim-payment-form" className="min-h-[150px]" />
          
          {isLoading && (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePayment}
            disabled={isLoading || !isInitialized}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(amount)}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


