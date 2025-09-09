import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
    if (isInitialized) return;

    try {
      setIsLoading(true);

      // Ensure Helcim scripts are present
      const ensureScripts = () => {
        const hasStart = Array.from(document.scripts).some(s => s.src.includes('helcim-pay/services/start.js'));
        if (!hasStart) {
          const s = document.createElement('script');
          s.type = 'text/javascript';
          s.src = 'https://secure.helcim.app/helcim-pay/services/start.js';
          document.body.appendChild(s);
        }
        const hasLegacy = Array.from(document.scripts).some(s => s.src.includes('js/helcim.js'));
        if (!hasLegacy) {
          const s2 = document.createElement('script');
          s2.type = 'text/javascript';
          s2.src = 'https://secure.helcim.app/js/helcim.js';
          document.body.appendChild(s2);
        }
      };
      ensureScripts();

      // Wait for helcimPay to be injected
      const waitFor = async <T,>(fn: () => T | undefined, timeoutMs = 20000, intervalMs = 100): Promise<T> => {
        const start = Date.now();
        return await new Promise<T>((resolve, reject) => {
          const id = setInterval(() => {
            try {
              const value = fn();
              if (value) {
                clearInterval(id);
                resolve(value);
              } else if (Date.now() - start >= timeoutMs) {
                clearInterval(id);
                reject(new Error('Helcim script not loaded'));
              }
            } catch (err) {
              clearInterval(id);
              reject(err as Error);
            }
          }, intervalMs);
        });
      };
      // @ts-ignore
      await waitFor(() => window.helcimPay, 20000, 100);

      // Fetch session token from backend first
      const initResponse = await apiRequest('POST', '/api/payments/helcim/initialize', {
        amount,
        description,
        customerEmail,
        customerName,
      });
      const initData = await initResponse.json();
      if (!initResponse.ok || !initData?.success || !initData?.token) {
        throw new Error(initData?.message || 'Failed to initialize Helcim Pay session');
      }

      // Initialize Helcim Pay.js with session token
      // @ts-ignore
      await window.helcimPay.initialize({
        // @ts-ignore
        accountId: import.meta.env.VITE_HELCIM_ACCOUNT_ID,
        // @ts-ignore
        terminalId: import.meta.env.VITE_HELCIM_TERMINAL_ID,
        token: initData.token,
        test: false,  // Always use production mode to save real cards
      });

      // Mount the payment form
      // @ts-ignore
      window.helcimPay.mount('helcim-payment-form');
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize Helcim Pay:', error);
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, amount, description, customerEmail, customerName]);

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/80 z-[0]" />
      <div className="absolute inset-0 grid place-items-center z-[1] pointer-events-none">
        <div className="pointer-events-auto bg-background w-[95vw] sm:max-w-[425px] max-h-[95vh] p-6 rounded-lg shadow-lg z-[2] isolate">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold leading-none tracking-tight">Payment Details</h2>
          </div>

          <div className="grid gap-4 py-4">
            <div id="helcim-payment-form" className="min-h-[150px] pointer-events-auto" />
            {isLoading && (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
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
          </div>
        </div>
      </div>
    </div>
  );
}


