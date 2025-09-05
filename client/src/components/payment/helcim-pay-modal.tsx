import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";

interface HelcimPayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  customerId?: string;
  cardId?: string;
  description?: string;
  onSuccess?: (paymentData: any) => void;
  onError?: (error: any) => void;
}

export function HelcimPayModal({
  open,
  onOpenChange,
  amount,
  customerId,
  cardId,
  description,
  onSuccess,
  onError
}: HelcimPayModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize Helcim payment session or process saved card payment
  const initializePayment = async () => {
    if (!open || isInitialized) return;

    setIsProcessing(true);
    try {
      // Check if this is a saved card payment
      if (customerId && cardId) {
        console.log("[HelcimPayModal] Processing saved card payment...", {
          amount,
          customerId,
          cardId,
          description
        });
        
        // Process payment directly with saved card
        const response = await apiRequest("POST", "/api/helcim-pay/process-saved-card", {
          amount,
          customerId,
          cardId,
          description: description || "Payment"
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to process saved card payment");
        }
        
        const paymentData = await response.json();
        console.log("[HelcimPayModal] Saved card payment successful:", paymentData);
        
        // Trigger success immediately for saved card
        toast({
          title: "Payment Successful",
          description: `Payment of ${formatPrice(amount)} has been processed using your saved card.`,
        });
        
        if (onSuccess) {
          onSuccess(paymentData);
        }
        
        onOpenChange(false);
        return; // Exit early for saved card payment
      }
      
      // Regular payment flow (new card)
      console.log("[HelcimPayModal] Initializing new payment session...", {
        amount,
        description
      });

      // Initialize Helcim Pay session for new card
      const response = await apiRequest("POST", "/api/helcim-pay/initialize", {
        amount,
        description: description || "Payment"
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to initialize payment");
      }

      const { checkoutToken } = await response.json();
      console.log("[HelcimPayModal] Received checkout token:", checkoutToken);
      
      setSessionToken(checkoutToken);
      setIsInitialized(true);

      // Wait for Helcim script and then append iframe
      setTimeout(() => {
        try {
          // @ts-ignore
          if (typeof window.appendHelcimPayIframe === 'function') {
            console.log("[HelcimPayModal] Appending Helcim iframe...");
            // @ts-ignore
            window.appendHelcimPayIframe(checkoutToken);
          } else {
            console.error("[HelcimPayModal] Helcim Pay script not loaded");
            throw new Error("Payment system not available");
          }
        } catch (err) {
          console.error("[HelcimPayModal] Error appending iframe:", err);
          throw err;
        }
      }, 100);

    } catch (error: any) {
      console.error("[HelcimPayModal] Error initializing payment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to initialize payment",
        variant: "destructive"
      });
      if (onError) {
        onError(error);
      }
      onOpenChange(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Listen for Helcim payment events
  useEffect(() => {
    if (!open || !sessionToken) return;

    const handleSuccess = (event: CustomEvent) => {
      console.log("[HelcimPayModal] Payment success:", event.detail);
      
      if (event.detail.checkoutToken === sessionToken) {
        toast({
          title: "Payment Successful",
          description: `Payment of ${formatPrice(amount)} has been processed.`,
        });
        
        if (onSuccess) {
          onSuccess(event.detail);
        }
        
        onOpenChange(false);
      }
    };

    const handleError = (event: CustomEvent) => {
      console.error("[HelcimPayModal] Payment error:", event.detail);
      
      if (event.detail.checkoutToken === sessionToken) {
        const errorMessage = event.detail.message || "Payment failed";
        
        toast({
          title: "Payment Failed",
          description: errorMessage,
          variant: "destructive"
        });
        
        if (onError) {
          onError(event.detail);
        }
        
        onOpenChange(false);
      }
    };

    window.addEventListener('helcim-payment-success', handleSuccess as EventListener);
    window.addEventListener('helcim-payment-error', handleError as EventListener);

    return () => {
      window.removeEventListener('helcim-payment-success', handleSuccess as EventListener);
      window.removeEventListener('helcim-payment-error', handleError as EventListener);
    };
  }, [open, sessionToken, amount, onSuccess, onError, onOpenChange, toast]);

  // Initialize when modal opens
  useEffect(() => {
    if (open && !isInitialized) {
      initializePayment();
    }

    // Clean up when modal closes
    if (!open) {
      try {
        // @ts-ignore
        if (typeof window.removeHelcimPayIframe === 'function') {
          // @ts-ignore
          window.removeHelcimPayIframe();
        }
      } catch (err) {
        console.error("[HelcimPayModal] Error removing iframe:", err);
      }
      setIsInitialized(false);
      setSessionToken(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center py-4">
            <p className="text-lg font-semibold mb-2">Amount Due</p>
            <p className="text-2xl font-bold text-primary">{formatPrice(amount)}</p>
            {description && (
              <p className="text-sm text-gray-500 mt-2">{description}</p>
            )}
          </div>

          {isProcessing && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">
                {customerId && cardId 
                  ? "Processing payment with saved card..." 
                  : "Initializing payment..."}
              </span>
            </div>
          )}

          {isInitialized && !isProcessing && !customerId && !cardId && (
            <>
              <div id="helcim-pay-iframe-container" className="min-h-[400px]">
                {/* Helcim iframe will be inserted here */}
              </div>
              
              <div className="text-xs text-gray-500 text-center">
                Your payment information is securely processed by Helcim
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
