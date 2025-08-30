import { useState, useEffect, useRef } from 'react';
import { createPortal } from "react-dom";
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
  const [secretToken, setSecretToken] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [fallbackLoaded, setFallbackLoaded] = useState(false);
  const { toast } = useToast();
  const mountedRef = useRef(false);
  const fallbackTimerRef = useRef<number | null>(null);

  // Provide loose typings for global objects
  declare global {
    interface Window {
      Helcim?: any;
      helcimPay?: any;
      appendHelcimPayIframe?: (checkoutToken: string, options?: any) => void;
    }
  }

  // Ensure Helcim scripts are present; inject if missing
  const ensureHelcimScripts = async () => {
    // Check if the Helcim script is already loaded
    const isScriptLoaded = () => {
      return document.querySelectorAll('script').some(script => 
        script.src && script.src.includes('helcim-pay/services/start.js')
      );
    };
    
    // Check if appendHelcimPayIframe function is already available
    if (typeof window.appendHelcimPayIframe === 'function') {
      console.log('[HelcimPayJs] Helcim Pay.js already loaded and ready');
      return;
    }
    
    // If script tag exists but function not ready, wait a bit
    if (isScriptLoaded()) {
      console.log('[HelcimPayJs] Script tag exists, waiting for it to initialize...');
      
      // Wait for the script to fully load and initialize
      let attempts = 0;
      const maxAttempts = 20;
      
      while (attempts < maxAttempts && typeof window.appendHelcimPayIframe !== 'function') {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (typeof window.appendHelcimPayIframe === 'function') {
        console.log('[HelcimPayJs] Helcim Pay.js initialized successfully');
        return;
      } else {
        console.warn('[HelcimPayJs] Script loaded but appendHelcimPayIframe not available after waiting');
      }
    }
    
    // Only load the script if it's not already present
    console.log('[HelcimPayJs] Script not found, loading Helcim Pay.js...');
    
    const loadScript = async (src: string, id: string): Promise<void> => {
      console.log(`[HelcimPayJs] Loading script: ${src}`);
      
      // Create new script element
      const script = document.createElement('script');
      script.id = id;
      script.type = 'text/javascript';
      script.src = src;
      script.async = true;
      
      // Wrap in promise to handle load/error
      return new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          console.error(`[HelcimPayJs] Script load timeout: ${src}`);
          reject(new Error(`Script load timeout: ${src}`));
        }, 10000);
        
        script.onload = () => {
          console.log(`[HelcimPayJs] Script loaded successfully: ${src}`);
          clearTimeout(timeoutId);
          resolve();
        };
        
        script.onerror = () => {
          console.error(`[HelcimPayJs] Failed to load script: ${src}`);
          clearTimeout(timeoutId);
          reject(new Error(`Failed loading script: ${src}`));
        };
        
        document.head.appendChild(script);
      });
    };
    
    // Load only the official Helcim Pay.js script as per documentation
    await loadScript('https://secure.helcim.app/helcim-pay/services/start.js', 'helcim-pay-sdk');
  };

  // Initialize Helcim Pay.js and mount form when dialog opens
  useEffect(() => {
    if (!open) return;
    if (mountedRef.current) return;
    
    mountedRef.current = true;
    console.log("[HelcimPayJs] Modal opened, initializing...");
    
    const initPayment = async () => {
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
        setSecretToken(initData.secretToken);
        
        // Check if appendHelcimPayIframe is available
        if (typeof window.appendHelcimPayIframe === 'function') {
          console.log('[HelcimPayJs] appendHelcimPayIframe function found, attempting to use it');
          
          try {
            // Clear any existing iframe with id 'helcimPayIframe'
            const existingFrame = document.getElementById('helcimPayIframe');
            if (existingFrame) {
              existingFrame.remove();
            }
            
            // Use the official method to render the iframe
            window.appendHelcimPayIframe(initData.token, {
              allowExit: true,
            });
            
            console.log('[HelcimPayJs] appendHelcimPayIframe called successfully');
          } catch (mountError) {
            console.error('[HelcimPayJs] Error calling appendHelcimPayIframe:', mountError);
            // If embedding fails, use fallback URL
            setFallbackUrl(`https://secure.helcim.com/pay/?checkoutToken=${initData.token}`);
            toast({
              title: "Using External Payment Form",
              description: "The embedded payment form couldn't load. Please use the external form.",
              variant: "destructive",
            });
          }
        } else {
          console.log('[HelcimPayJs] appendHelcimPayIframe function not available, using fallback');
          // If appendHelcimPayIframe isn't available, use fallback URL
          setFallbackUrl(`https://secure.helcim.com/pay/?checkoutToken=${initData.token}`);
          toast({
            title: "Using External Payment Form",
            description: "Please use the 'Open in New Window' button to complete your payment.",
          });
        }
        
        // Set up message listener
        const key = `helcim-pay-js-${initData.token}`;
        const handleMessage = async (event: MessageEvent<any>) => {
          try {
            if (!event?.data || event.data.eventName !== key) return;
            
            if (event.data.eventStatus === 'SUCCESS') {
              toast({ title: 'Payment Successful', description: 'Payment processed successfully.' });
              
              // Create a completed payment record and update appointment
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
                helcimPaymentId: event?.data?.eventMessage?.data?.transactionId || 
                                event?.data?.transactionId || 
                                event?.data?.paymentId,
                paymentDate: new Date(),
              });
              
              const payment = await paymentRes.json();
              
              if (appointmentId) {
                await apiRequest('POST', '/api/confirm-payment', {
                  paymentId: payment.id,
                  appointmentId,
                });
              }
              
              onSuccess?.(event.data);
              onOpenChange(false);
              window.removeEventListener('message', handleMessage);
            } else if (event.data.eventStatus === 'ABORTED') {
              const errMsg = event.data.eventMessage || 'Payment was cancelled.';
              onError?.(new Error(errMsg));
              onOpenChange(false);
              window.removeEventListener('message', handleMessage);
            }
          } catch (error) {
            console.error("[HelcimPayJs] Error handling postMessage event:", error);
          }
        };
        
        window.addEventListener('message', handleMessage);
        
        // Set up fallback timer in case the iframe doesn't load
        fallbackTimerRef.current = window.setTimeout(() => {
          const container = document.getElementById('helcim-payment-container');
          const hasIframe = !!container?.querySelector('iframe');
          
          if (!hasIframe && initData.token && !fallbackUrl) {
            const fallbackUrl = `https://pay.helcim.com/?checkoutToken=${initData.token}`;
            setFallbackUrl(fallbackUrl);
            toast({
              title: "Using Alternative Payment Form",
              description: "The payment form is taking longer than expected to load. Switching to an alternative form.",
            });
          }
        }, 5000);
        
        setIsInitialized(true);
      } catch (err: any) {
        console.error('[HelcimPayJs] Payment initialization error:', err);
        toast({
          title: 'Payment Unavailable',
          description: err?.message || 'Could not load the payment form.',
          variant: 'destructive',
        });
        
        // Try to use fallback URL if we have a token
        if (paymentToken && !fallbackUrl) {
          setFallbackUrl(`https://pay.helcim.com/?checkoutToken=${paymentToken}`);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    initPayment();
    
    // Cleanup function
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [open, isInitialized, amount, description, customerEmail, customerName, clientId, appointmentId, tipAmount]);

  // Cleanup on close/unmount
  useEffect(() => {
    if (!open) return;
    return () => {
      try {
        // Remove the Helcim iframe if it exists
        const helcimIframe = document.getElementById('helcimPayIframe');
        if (helcimIframe) {
          helcimIframe.remove();
        }
        
        // Legacy cleanup
        if (window.helcimPay && typeof window.helcimPay.unmount === 'function') {
          window.helcimPay.unmount();
        }
      } catch (error) {
        console.error('[HelcimPayJs] Error during cleanup:', error);
      }
      
      mountedRef.current = false;
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
      setFallbackUrl(null);
      setFallbackLoaded(false);
      setPaymentToken(null);
      setSecretToken(null);
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/80 z-[0] pointer-events-none" />
      <div className="absolute inset-0 grid place-items-center z-[1] pointer-events-auto">
        <div
          className="pointer-events-auto bg-background w-[95vw] sm:max-w-[900px] max-h-[95vh] p-6 rounded-lg shadow-lg z-[2] isolate"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold leading-none tracking-tight">Process Payment</h2>
                <p className="text-sm text-muted-foreground">Complete your payment securely with Helcim</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 py-4">
            <div className="relative" style={{ minHeight: "400px" }}>
              <div 
                id="helcim-payment-container" 
                className={`min-h-[400px] w-full overflow-x-hidden relative ${fallbackUrl ? 'hidden' : 'z-[2]'} touch-manipulation pointer-events-auto`} 
                style={{ 
                  height: "400px",
                  display: fallbackUrl ? 'none' : 'block' 
                }}
                data-helcim-container="true"
              >
                {/* Helcim.js will inject the payment form here */}
                <div className="py-4 text-center text-gray-500">Loading payment form...</div>
              </div>
              {fallbackUrl && (
                <div className="relative w-full h-[300px] border rounded flex items-center justify-center bg-gray-50">
                  <div className="text-center p-6">
                    <div className="mx-auto mb-4 text-5xl">🔒</div>
                    <h3 className="text-lg font-medium mb-2">Alternative Payment Method</h3>
                    <p className="mb-4">The embedded payment form is not available. Please use the external payment option.</p>
                    <p className="text-sm text-gray-500 mb-6">This will open Helcim's secure payment page in a new window.</p>
                    <Button 
                      onClick={() => {
                        try {
                          window.open(fallbackUrl, '_blank', 'noreferrer,noopener');
                          toast({
                            title: "Payment Window Opened",
                            description: "Please complete your payment in the new window.",
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to open secure checkout. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                      variant="default"
                      size="lg"
                      className="w-full"
                    >
                      Open Secure Payment Window
                    </Button>
                  </div>
                </div>
              )}
              {isLoading && !fallbackUrl && (
                <div className="absolute inset-0 grid place-items-center z-[3]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              )}
            </div>
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
  , document.body);
}