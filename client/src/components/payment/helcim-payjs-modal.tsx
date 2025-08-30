import { useState, useEffect, useCallback, useRef } from 'react';
// Using a custom lightweight modal here to avoid transform/focus issues with cross-origin iframes
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
  appointmentId?: number;
  clientId?: number;
  tipAmount?: number;
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
  appointmentId,
  clientId,
  tipAmount,
}: HelcimPayJsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [paymentToken, setPaymentToken] = useState<string | null>(null);
  const { toast } = useToast();
  const mountedRef = useRef(false);

  // Provide loose typings for global objects
  declare global {
    interface Window {
      Helcim?: any;
      helcimPay?: any;
      appendHelcimPayIframe?: (checkoutToken: string, options?: any) => void;
    }
  }

  const waitFor = async <T,>(fn: () => T | undefined, timeoutMs = 3000, intervalMs = 100): Promise<T> => {
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

  // Ensure Helcim scripts are present; inject if missing
  const ensureHelcimScripts = async () => {
    // start.js exposes window.helcimPay; helcim.js may add helpers
    const hasStartScript = Array.from(document.scripts).some(s => s.src.includes('helcim-pay/services/start.js'));
    if (!hasStartScript) {
      const s = document.createElement('script');
      s.type = 'text/javascript';
      s.src = 'https://secure.helcim.app/helcim-pay/services/start.js';
      await new Promise<void>((resolve, reject) => {
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed loading Helcim start.js'));
        document.body.appendChild(s);
      });
    }
    const hasLegacyScript = Array.from(document.scripts).some(s => s.src.includes('js/helcim.js'));
    if (!hasLegacyScript) {
      const s2 = document.createElement('script');
      s2.type = 'text/javascript';
      s2.src = 'https://secure.helcim.app/js/helcim.js';
      await new Promise<void>((resolve, reject) => {
        s2.onload = () => resolve();
        s2.onerror = () => reject(new Error('Failed loading Helcim helcim.js'));
        document.body.appendChild(s2);
      });
    }
  };

  // Initialize Helcim Pay.js and mount form when dialog opens
  useEffect(() => {
    if (!open) return;
    if (mountedRef.current) return;
    mountedRef.current = true;
    (async () => {
      try {
        setIsLoading(true);
        await ensureHelcimScripts();

        // First create a session token on the backend
        const initResponse = await apiRequest('POST', '/api/payments/helcim/initialize', {
          amount,
          description,
          customerEmail,
          customerName,
        });
        const initData = await initResponse.json();
        if (!initResponse.ok || !initData?.success || !initData?.token) {
          throw new Error(initData?.message || 'Failed to initialize payment session');
        }
        setPaymentToken(initData.token);

        // Use inline helcimPay mount only to avoid overlay conflicts
        await waitFor(() => window.helcimPay, 20000, 100);
        try {
          // @ts-ignore - helcimPay injected by script
          await window.helcimPay.initialize({
            accountId: (import.meta as any).env?.VITE_HELCIM_ACCOUNT_ID,
            terminalId: (import.meta as any).env?.VITE_HELCIM_TERMINAL_ID,
            token: initData.token,
            test: process.env.NODE_ENV !== 'production',
          });
          const container = document.getElementById('helcim-payment-container');
          const alreadyMounted = container?.querySelector('iframe');
          if (!alreadyMounted) {
            // @ts-ignore
            window.helcimPay.mount('helcim-payment-container');
          }
        } catch (err) {
          console.error('helcimPay.initialize/mount failed:', err);
          throw err;
        }

        // Listen for Pay.js postMessage events
        const key = `helcim-pay-js-${initData.token}`;
        const handleMessage = async (event: MessageEvent<any>) => {
          try {
            if (!event?.data || event.data.eventName !== key) return;
            if (event.data.eventStatus === 'SUCCESS') {
              toast({ title: 'Payment Successful', description: 'Payment processed successfully.' });
              try {
                // Create a completed payment record for Pay.js and update appointment
                const paymentRes = await apiRequest('POST', '/api/payments', {
                  clientId: clientId,
                  appointmentId: appointmentId,
                  amount: amount,
                  tipAmount: tipAmount || 0,
                  totalAmount: amount,
                  method: 'card',
                  status: 'completed',
                  type: 'appointment_payment',
                  description: description,
                  helcimPaymentId: event?.data?.transactionId || event?.data?.paymentId,
                  paymentDate: new Date(),
                });
                const payment = await paymentRes.json();
                if (appointmentId) {
                  await apiRequest('POST', '/api/confirm-payment', {
                    paymentId: payment.id,
                    appointmentId,
                  });
                }
              } catch {}
              onSuccess?.(event.data);
              onOpenChange(false);
              window.removeEventListener('message', handleMessage);
            } else if (event.data.eventStatus === 'ABORTED') {
              const errMsg = event.data.eventMessage || 'Payment was cancelled.';
              console.error('Helcim Pay.js aborted:', errMsg);
              onError?.(new Error(errMsg));
              onOpenChange(false);
              window.removeEventListener('message', handleMessage);
            }
          } catch {}
        };
        window.addEventListener('message', handleMessage);

        setIsInitialized(true);
      } catch (err: any) {
        console.error('Failed to initialize Helcim Pay.js:', err);
        toast({
          title: 'Payment Unavailable',
          description: err?.message || 'Could not load the payment form.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, [open, isInitialized, amount, description, customerEmail, customerName]);

  // Cleanup on close/unmount: unmount helcimPay if present
  useEffect(() => {
    if (!open) return;
    return () => {
      try {
        // @ts-ignore
        if (window.helcimPay) {
          // @ts-ignore
          window.helcimPay.unmount?.();
        }
      } catch {}
      mountedRef.current = false;
    };
  }, [open]);

  // Pay.js handles submission inside iframe; we only display and listen for result.

  const handlePaymentSuccess = async (_response: any) => {
    // Not used in Pay.js path; kept for compatibility
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
  };

  const handlePaymentCancel = () => {
    toast({
      title: "Payment Cancelled",
      description: "The payment process was cancelled.",
    });
    onOpenChange(false);
    setPaymentToken(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/80 z-[0] pointer-events-none" />
      <div className="absolute inset-0 grid place-items-center z-[1] pointer-events-auto">
        <div
          className={"pointer-events-auto bg-background w-[95vw] sm:max-w-[900px] max-h-[95vh] p-6 rounded-lg shadow-lg z-[2] isolate"}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="space-y-1">
            <h2 className="text-lg font-semibold leading-none tracking-tight">Process Payment</h2>
            <p className="text-sm text-muted-foreground">Complete your payment securely with Helcim</p>
          </div>

          <div className="grid gap-4 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <div id="helcim-payment-container" className="min-h-[400px] w-full overflow-x-hidden relative z-[2] touch-manipulation pointer-events-auto" style={{ WebkitOverflowScrolling: 'auto', overscrollBehavior: 'contain' }}>
                {/* Helcim.js will inject the payment form here */}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
