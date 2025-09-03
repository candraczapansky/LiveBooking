import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SaveCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  customerEmail?: string;
  customerName?: string;
  onSaved?: (paymentMethod: any) => void;
}

export function SaveCardModal({
  open,
  onOpenChange,
  clientId,
  customerEmail,
  customerName,
  onSaved,
}: SaveCardModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [checkoutToken, setCheckoutToken] = useState<string | null>(null);
  const [helcimIframeOpen, setHelcimIframeOpen] = useState(false);
  const { toast } = useToast();

  const initializeForm = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      setIsLoading(true);
      console.log("[SaveCardModal] Requesting Helcim checkout token...");
      
      // Get a checkout token from the backend
      const initRes = await apiRequest("POST", "/api/payments/helcim/initialize", {
        amount: 0,  // Use 0 for card verification without charge
        description: "Save Card",
        customerEmail,
        customerName,
      });
      const initData = await initRes.json();
      console.log("[SaveCardModal] Helcim init response:", { 
        success: initData.success,
        hasToken: !!initData.token,
        hasSecretToken: !!initData.secretToken
      });
      
      if (!initRes.ok || !initData?.success || !initData?.token) {
        throw new Error(initData?.message || "Failed to initialize Helcim session");
      }
      
      // Store the checkout token
      setCheckoutToken(initData.token);
      setIsInitialized(true);
      console.log("[SaveCardModal] Checkout token received, ready to open Helcim modal");
      
    } catch (err: any) {
      console.error("[SaveCardModal] Helcim init failed:", err);
      toast({ 
        title: "Unable to initialize payment", 
        description: err?.message || String(err), 
        variant: "destructive" 
      });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, customerEmail, customerName, onOpenChange, toast]);

  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setIsInitialized(false);
      setCheckoutToken(null);
      setHelcimIframeOpen(false);
      
      // Clean up Helcim iframe if it exists when modal closes
      // @ts-ignore
      if (typeof window.removeHelcimPayIframe === 'function') {
        try {
          // @ts-ignore
          window.removeHelcimPayIframe();
          console.log("[SaveCardModal] Removed Helcim iframe on close");
        } catch (err) {
          console.error("[SaveCardModal] Error removing iframe:", err);
        }
      }
      return;
    }
    
    let mounted = true;
    
    console.log("[SaveCardModal] Modal opened, checking for Helcim functions...");
    
    // Check for appendHelcimPayIframe availability
    let attempts = 0;
    const maxAttempts = 10; // 1.5 seconds total
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      // @ts-ignore
      const hasAppendFunction = typeof window.appendHelcimPayIframe === 'function';
      // @ts-ignore
      const hasRemoveFunction = typeof window.removeHelcimPayIframe === 'function';
      
      console.log(`[SaveCardModal] Checking Helcim functions (attempt ${attempts}):`, { 
        hasAppendFunction,
        hasRemoveFunction
      });
      
      if (hasAppendFunction && hasRemoveFunction) {
        console.log("[SaveCardModal] Helcim iframe functions available!");
        clearInterval(checkInterval);
        if (!isInitialized && mounted) {
          initializeForm();
        }
      } else if (attempts >= maxAttempts) {
        console.error("[SaveCardModal] Helcim functions not available after timeout");
        clearInterval(checkInterval);
        
        // Try to load the script manually one more time
        const existingScript = document.querySelector('script[src*="helcim-pay/services/start.js"]');
        if (!existingScript) {
          console.log("[SaveCardModal] Adding Helcim script manually...");
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.src = 'https://secure.helcim.app/helcim-pay/services/start.js';
          script.async = true;
          script.onload = () => {
            console.log("[SaveCardModal] Script loaded, checking again...");
            // @ts-ignore
            if (typeof window.appendHelcimPayIframe === 'function' && mounted) {
              initializeForm();
            }
          };
          script.onerror = () => {
            console.error("[SaveCardModal] Failed to load Helcim script");
            toast({ 
              title: "Payment form unavailable", 
              description: "Unable to load payment form. Please refresh and try again.", 
              variant: "destructive" 
            });
          };
          document.head.appendChild(script);
        } else {
          toast({ 
            title: "Payment form unavailable", 
            description: "Unable to load payment form. Please refresh and try again.", 
            variant: "destructive" 
          });
        }
      }
    }, 150);
    
    return () => {
      mounted = false;
      clearInterval(checkInterval);
    };
  }, [open, isInitialized, initializeForm, toast]);

  // Monitor for Helcim iframe closure
  useEffect(() => {
    if (!helcimIframeOpen) return;
    
    console.log("[SaveCardModal] Monitoring Helcim iframe...");
    const checkInterval = setInterval(() => {
      const iframe = document.querySelector('iframe[src*="helcim"]');
      if (!iframe) {
        console.log("[SaveCardModal] Helcim iframe was closed");
        clearInterval(checkInterval);
        setHelcimIframeOpen(false);
        
        // Show a message that the payment window was closed
        toast({ 
          title: "Payment window closed", 
          description: "If you completed the payment, your card has been saved. You can close this window." 
        });
      }
    }, 500);
    
    // Clear the interval after 5 minutes to prevent memory leaks
    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      setHelcimIframeOpen(false);
    }, 300000);
    
    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, [helcimIframeOpen, toast]);

  const handleOpenHelcimModal = () => {
    if (!checkoutToken) {
      toast({ 
        title: "Not ready", 
        description: "Please wait for initialization to complete", 
        variant: "destructive" 
      });
      return;
    }
    
    try {
      console.log("[SaveCardModal] Opening Helcim iframe with token:", checkoutToken.substring(0, 20) + "...");
      
      // Store client info for after the payment completes
      if (typeof window !== 'undefined') {
        // @ts-ignore
        window.helcimSaveCardCallback = {
          clientId,
          customerEmail,
          customerName,
          onSaved
        };
      }
      
      // Close our modal to avoid z-index conflicts
      onOpenChange(false);
      setHelcimIframeOpen(true);
      
      // Small delay to ensure our modal closes before opening Helcim
      setTimeout(() => {
        // Open the Helcim iframe modal
        // @ts-ignore
        if (typeof window.appendHelcimPayIframe === 'function') {
          try {
            // @ts-ignore
            const result = window.appendHelcimPayIframe(checkoutToken);
            console.log("[SaveCardModal] appendHelcimPayIframe result:", result);
            
            // Check if the iframe was actually added and make sure it's visible
            setTimeout(() => {
              const iframe = document.querySelector('iframe#helcimPayIframe') as HTMLIFrameElement;
              if (iframe) {
                console.log("[SaveCardModal] Helcim iframe confirmed in DOM");
                // Ensure the iframe is visible by setting a high z-index
                iframe.style.zIndex = '999999';
                console.log("[SaveCardModal] Updated iframe z-index to 999999");
              } else {
                console.error("[SaveCardModal] Helcim iframe not found in DOM after append");
              }
            }, 500);
            
          } catch (appendErr) {
            console.error("[SaveCardModal] Error calling appendHelcimPayIframe:", appendErr);
            setHelcimIframeOpen(false);
            toast({ 
              title: "Error", 
              description: "Failed to open payment window. Please try again.", 
              variant: "destructive" 
            });
          }
        } else {
          throw new Error("Helcim payment function not available");
        }
      }, 100);
      
    } catch (err: any) {
      console.error("[SaveCardModal] Failed to open Helcim modal:", err);
      setHelcimIframeOpen(false);
      toast({ 
        title: "Error", 
        description: err?.message || "Failed to open payment window", 
        variant: "destructive" 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add a Card</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Initializing secure payment...</p>
            </div>
          ) : helcimIframeOpen ? (
            <div className="space-y-4">
              <div className="flex justify-center py-4">
                <CreditCard className="h-12 w-12 text-primary animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium">Payment window is open</p>
                <p className="text-sm text-muted-foreground">
                  Please complete your card details in the Helcim secure payment window.
                </p>
                <p className="text-xs text-muted-foreground">
                  This window will update automatically when you're done.
                </p>
              </div>
            </div>
          ) : isInitialized ? (
            <div className="space-y-4">
              <div className="flex justify-center py-4">
                <CreditCard className="h-12 w-12 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium">Ready to add your card</p>
                <p className="text-sm text-muted-foreground">
                  Click the button below to open Helcim's secure payment window.
                </p>
                <p className="text-xs text-muted-foreground">
                  Your card information is encrypted and securely processed by Helcim. 
                  We never store your full card number.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Preparing payment form...</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isLoading}
          >
            {helcimIframeOpen ? "Close" : "Cancel"}
          </Button>
          {!helcimIframeOpen && (
            <Button 
              onClick={handleOpenHelcimModal} 
              disabled={isLoading || !isInitialized}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Open Secure Payment
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}