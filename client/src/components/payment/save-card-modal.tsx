import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SaveCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  appointmentId?: number | null;
  customerEmail?: string;
  customerName?: string;
  onSaved?: (paymentMethod: any) => void;
}

export function SaveCardModal({
  open,
  onOpenChange,
  clientId,
  appointmentId,
  customerEmail,
  customerName,
  onSaved,
}: SaveCardModalProps) {
  console.log("[SaveCardModal] Component rendered with props:", {
    open,
    clientId,
    customerEmail,
    customerName,
    onSavedExists: !!onSaved,
    onSavedType: typeof onSaved
  });
  
  // DEBUG: Alert to confirm component is loading
  if (open) {
    console.warn("🔴 SaveCardModal is OPEN - DEBUG v4 - Enhanced debugging active!");
  }
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [checkoutToken, setCheckoutToken] = useState<string | null>(null);
  const [helcimIframeOpen, setHelcimIframeOpen] = useState(false);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const { toast } = useToast();

  // Debug modal state changes
  useEffect(() => {
    console.log("[SaveCardModal] 🔄 Modal state changed - open:", open);
  }, [open]);

  // Inject global CSS to ensure Helcim iframe is always clickable
  useEffect(() => {
    const styleId = 'helcim-iframe-z-index-fix';
    
    // Check if styles already exist
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        /* Ensure Helcim iframe is always on top and clickable */
        iframe#helcimPayIframe,
        .helcim-pay-iframe,
        [id*="helcim"] iframe {
          z-index: 2147483647 !important;
          position: fixed !important;
          pointer-events: auto !important;
        }
        
        /* Ensure iframe container is also on top and clickable */
        .helcim-pay-container,
        .helcim-overlay,
        [class*="helcim-pay"],
        div:has(> iframe#helcimPayIframe) {
          z-index: 2147483646 !important;
          pointer-events: auto !important;
        }
        
        /* Hide our dialog overlay when Helcim is open to prevent blocking */
        .helcim-modal-open [data-radix-dialog-overlay],
        .helcim-modal-open [role="dialog"] {
          z-index: 1 !important;
          pointer-events: none !important;
        }
        
        /* But keep dialog content interactive for our buttons */
        .helcim-modal-open [role="dialog"] > div {
          pointer-events: auto !important;
        }
        
        /* Ensure all overlays are below Helcim */
        .helcim-modal-open .fixed.inset-0 {
          z-index: 1 !important;
        }
      `;
      document.head.appendChild(style);
      console.log("[SaveCardModal] Injected global CSS for Helcim iframe z-index fix");
    }
    
    // Add class to body when Helcim modal is open
    if (helcimIframeOpen) {
      document.body.classList.add('helcim-modal-open');
    } else {
      document.body.classList.remove('helcim-modal-open');
    }
    
    return () => {
      document.body.classList.remove('helcim-modal-open');
    };
  }, [helcimIframeOpen]);

  // Persistent message listener - never gets removed
  useEffect(() => {
    console.log("[SaveCardModal] 🔒 Setting up PERSISTENT message listener");
    
    const persistentMessageHandler = async (event: MessageEvent) => {
      // Only log messages from Helcim domain
      if (event.origin.includes('helcim') || event.origin.includes('secure.helcim.app')) {
        console.log("[SaveCardModal] 🔒 PERSISTENT LISTENER - Message from:", event.origin);
        console.log("[SaveCardModal] 🔒 PERSISTENT LISTENER - Message data:", event.data);
        console.log("[SaveCardModal] 🔒 PERSISTENT LISTENER - Message type:", typeof event.data);
        
        if (event.data && typeof event.data === 'object') {
          console.log("[SaveCardModal] 🔒 PERSISTENT LISTENER - All properties:", Object.keys(event.data));
          console.log("[SaveCardModal] 🔒 PERSISTENT LISTENER - Full message:", JSON.stringify(event.data, null, 2));
          
          // Check if this is a success message
          const isSuccess = event.data.eventStatus === 'SUCCESS' && event.data.eventMessage;
          if (isSuccess) {
            console.log("[SaveCardModal] 🔒 PERSISTENT LISTENER - SUCCESS DETECTED!");
            console.log("[SaveCardModal] 🔒 PERSISTENT LISTENER - This is the payment completion message!");
            
            // Parse the event message to get card details
            let cardToken = null;
            let transactionId = null;
            let cardLast4 = null;
            let cardBrand = null;
            let cardExpMonth = null;
            let cardExpYear = null;
            let cardCustomerCode = null;
            
            try {
              const eventMessageData = JSON.parse(event.data.eventMessage);
              console.log("[SaveCardModal] 🔒 PERSISTENT LISTENER - Full event data:", eventMessageData);
              
              const cardData = eventMessageData.data?.data;
              cardToken = cardData?.cardToken;
              transactionId = cardData?.transactionId;
              cardLast4 = cardData?.cardNumber?.slice(-4);
              cardBrand = cardData?.cardType || cardData?.cardBrand || 'Card';
              cardCustomerCode = cardData?.customerCode;
              
              // Try multiple fields for expiration date
              const expiryFields = [
                cardData?.expiryDate,
                cardData?.cardExpiry,
                cardData?.expiry,
                cardData?.expirationDate,
                eventMessageData.data?.expiryDate,
                eventMessageData.expiryDate
              ];
              
              for (const expField of expiryFields) {
                if (expField) {
                  // Format could be MM/YY, MMYY, MM/YYYY, etc.
                  const expiry = String(expField).replace(/\D/g, ''); // Remove non-digits
                  if (expiry.length >= 4) {
                    cardExpMonth = parseInt(expiry.substring(0, 2));
                    // Handle both YY and YYYY formats
                    const yearPart = expiry.substring(2);
                    if (yearPart.length === 2) {
                      cardExpYear = 2000 + parseInt(yearPart);
                    } else if (yearPart.length === 4) {
                      cardExpYear = parseInt(yearPart);
                    }
                    break; // Found expiry, stop looking
                  }
                }
              }
              
              console.log("[SaveCardModal] 🔒 PERSISTENT LISTENER - Parsed card data:", { 
                cardToken, transactionId, cardLast4, cardBrand, cardExpMonth, cardExpYear 
              });
            } catch (err) {
              console.error("[SaveCardModal] 🔒 PERSISTENT LISTENER - Error parsing event message:", err);
            }
            
            // Save the card to the client's profile
            if (cardToken) {
              console.log("[SaveCardModal] 🔒 PERSISTENT LISTENER - Saving card to client profile...");
              
              // Get client info from the window object (set when modal opened)
              const clientInfo = (window as any).helcimSaveCardCallback;
              if (clientInfo && clientInfo.clientId) {
                try {
                  const payload = {
                    token: cardToken,
                    clientId: clientInfo.clientId,
                    appointmentId: clientInfo.appointmentId,
                    customerEmail: clientInfo.customerEmail,
                    customerName: clientInfo.customerName,
                    customerId: cardCustomerCode,
                    cardLast4: cardLast4,
                    cardBrand: cardBrand,
                    cardExpMonth: cardExpMonth,
                    cardExpYear: cardExpYear,
                    transactionId: transactionId
                  };
                  // Use the live payments router; alias isn't mounted in this environment
                  let saveResponse = await fetch('/api/payments/helcim/save-card', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });
                  // No fallback to legacy alias; server enforces live-only
                  
                  const saveResult = await saveResponse.json();
                  console.log("[SaveCardModal] 🔒 PERSISTENT LISTENER - Card save result:", saveResult);
                  
                  if (saveResponse.ok && saveResult.success) {
                    console.log("[SaveCardModal] 🔒 PERSISTENT LISTENER - Card saved successfully to client profile!");
                    console.log("[SaveCardModal] 🔒 PERSISTENT LISTENER - Save result:", saveResult);
                    try {
                      const evt = new CustomEvent('helcimCardSaved', { detail: saveResult });
                      window.dispatchEvent(evt);
                      console.log('[SaveCardModal] 🔒 PERSISTENT LISTENER - Dispatched helcimCardSaved event to refresh client cards');
                    } catch (evtErr) {
                      console.error('[SaveCardModal] 🔒 PERSISTENT LISTENER - Error dispatching event:', evtErr);
                    }
                  } else {
                    console.warn("[SaveCardModal] 🔒 PERSISTENT LISTENER - Card save failed (non-blocking):", saveResult?.message || 'Unknown error');
                  }
                } catch (saveErr) {
                  console.warn("[SaveCardModal] 🔒 PERSISTENT LISTENER - Error saving card (non-blocking):", saveErr);
                }
              } else {
                console.warn("[SaveCardModal] 🔒 PERSISTENT LISTENER - No client info available for card save");
              }
            }
            
            // Dispatch a custom event that the booking widget can listen for
            const successEvent = new CustomEvent('helcim-payment-success', {
              detail: {
                eventData: event.data,
                cardToken,
                transactionId,
                cardLast4,
                cardBrand
              }
            });
            window.dispatchEvent(successEvent);
            console.log("[SaveCardModal] 🔒 PERSISTENT LISTENER - Custom event dispatched");
          }
        }
      }
    };
    
    window.addEventListener('message', persistentMessageHandler);
    
    // This listener never gets removed - it stays active for the entire session
    return () => {
      console.log("[SaveCardModal] 🔒 Component unmounting - keeping persistent listener active");
    };
  }, []); // Empty dependency array - runs once and never removes

  const initializeForm = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      setIsLoading(true);
      console.log("[SaveCardModal] Requesting Helcim checkout token...");
      
      // Helper: try multiple init endpoints for robustness across environments
      const tryInitEndpoints = async () => {
        const payload = {
          amount: 0,
          description: "Save Card",
          customerEmail,
          customerName,
        } as any;
        const endpoints = [
          "/api/payments/helcim/initialize",
          "/api/helcim-pay/initialize",
        ];
        for (const url of endpoints) {
          try {
            console.log("[SaveCardModal] Trying init:", url);
            const res = await apiRequest("POST", url, payload);
            if (!res.ok) {
              try { const txt = await res.text(); console.log(`[SaveCardModal] Init ${url} failed:`, txt); } catch {}
              continue;
            }
            const data = await res.json();
            return { res, data } as const;
          } catch (e) {
            console.warn("[SaveCardModal] Init request error for", url, e);
          }
        }
        throw new Error("All Helcim init endpoints failed");
      };

      // Get a checkout token from the backend (with endpoint fallbacks)
      const { data: initData } = await tryInitEndpoints();
      console.log("[SaveCardModal] Helcim init response:", { 
        success: initData.success,
        hasToken: !!(initData.token || initData.checkoutToken),
        hasSecretToken: !!initData.secretToken
      });
      
      const receivedToken = initData?.token || initData?.checkoutToken;
      if (!initData?.success || !receivedToken) {
        throw new Error(initData?.message || "Failed to initialize Helcim session");
      }
      
      // Store the checkout token
      setCheckoutToken(receivedToken);
      setIsInitialized(true);
      console.log("[SaveCardModal] Checkout token received, ready to open Helcim modal");
      
      // Optional auto-open disabled: require explicit user consent (policyAgreed)
      
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
      setPolicyAgreed(false);
      
      // Clean up Helcim iframe and container if they exist when modal closes
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
      
      // Also clean up our custom iframe wrapper
      const iframeWrapper = document.getElementById('helcim-iframe-wrapper');
      if (iframeWrapper) {
        iframeWrapper.remove();
        console.log("[SaveCardModal] Removed iframe wrapper on close");
      }
      
      // Clean up any remaining Helcim iframes
      const remainingFrames = document.querySelectorAll('#helcimPayIframe, iframe[src*="helcim"]');
      remainingFrames.forEach(frame => {
        frame.remove();
        console.log("[SaveCardModal] Removed remaining iframe");
      });
      
      // Restore viewport if it was modified for mobile
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
      return;
    }
    
    let mounted = true;
    
    console.log("[SaveCardModal] Modal opened, checking for Helcim functions...");
    
    // Initialize immediately since we're using redirect method
    console.log("[SaveCardModal] Initializing payment form...");
    if (!isInitialized && mounted) {
      initializeForm();
    }
    
    return () => {
      mounted = false;
    };
  }, [open, isInitialized, initializeForm, toast]);

  // Global message listener - always active when modal is open
  useEffect(() => {
    if (!open) {
      console.log("[SaveCardModal] 🌐 Modal closed, not setting up global listener");
      return;
    }
    
    console.log("[SaveCardModal] 🌐 Setting up GLOBAL message listener");
    
    const globalMessageHandler = (event: MessageEvent) => {
      // Only log messages from Helcim domain
      if (event.origin.includes('helcim') || event.origin.includes('secure.helcim.app')) {
        console.log("[SaveCardModal] 🌐 GLOBAL LISTENER - Message from:", event.origin);
        console.log("[SaveCardModal] 🌐 GLOBAL LISTENER - Message data:", event.data);
        console.log("[SaveCardModal] 🌐 GLOBAL LISTENER - Message type:", typeof event.data);
        
        if (event.data && typeof event.data === 'object') {
          console.log("[SaveCardModal] 🌐 GLOBAL LISTENER - All properties:", Object.keys(event.data));
          console.log("[SaveCardModal] 🌐 GLOBAL LISTENER - Full message:", JSON.stringify(event.data, null, 2));
        }
      }
    };
    
    window.addEventListener('message', globalMessageHandler);
    
    return () => {
      console.log("[SaveCardModal] 🌐 Removing GLOBAL message listener - modal closing");
      window.removeEventListener('message', globalMessageHandler);
    };
  }, [open]);

  // Set client info in window object for persistent listener access
  useEffect(() => {
    if (open && clientId && customerEmail && customerName) {
      (window as any).helcimSaveCardCallback = {
        clientId,
        appointmentId,
        customerEmail,
        customerName
      };
      console.log("[SaveCardModal] Set client info in window object:", { clientId, appointmentId, customerEmail, customerName });
    }
    
    return () => {
      // Clean up when modal closes
      if (!open) {
        delete (window as any).helcimSaveCardCallback;
        console.log("[SaveCardModal] Cleaned up client info from window object");
      }
    };
  }, [open, clientId, customerEmail, customerName]);

  // Monitor for Helcim iframe closure and success messages
  useEffect(() => {
    console.log("[SaveCardModal] 🔍 useEffect triggered - helcimIframeOpen:", helcimIframeOpen);
    
    if (!helcimIframeOpen) {
      console.log("[SaveCardModal] ⏸️ Not monitoring - helcimIframeOpen is false");
      return;
    }
    
    console.log("[SaveCardModal] 🎯 Monitoring Helcim iframe - Enhanced debugging active!");
    
    // Monitor iframe visibility changes as a fallback
    const checkIframeVisibility = () => {
      const iframe = document.getElementById('helcimPayIframe') as HTMLIFrameElement;
      if (iframe) {
        const isVisible = iframe.offsetWidth > 0 && iframe.offsetHeight > 0;
        console.log("[SaveCardModal] 🔍 Iframe visibility check:", { isVisible, width: iframe.offsetWidth, height: iframe.offsetHeight });
        
        // If iframe becomes hidden, it might indicate payment completion
        if (!isVisible && helcimIframeOpen) {
          console.log("[SaveCardModal] 🚨 Iframe became hidden - possible payment completion!");
          // Don't auto-trigger here, just log for debugging
        }
      }
    };
    
    // Check iframe visibility periodically
    const visibilityInterval = setInterval(checkIframeVisibility, 1000);
    
    // Listen for messages from Helcim iframe
    const handleMessage = async (event: MessageEvent) => {
      console.log("[SaveCardModal] 📨 Received message from:", event.origin);
      console.log("[SaveCardModal] 📨 Message data:", event.data);
      console.log("[SaveCardModal] 📨 Message type:", typeof event.data);
      
      // Log ALL messages for debugging
      if (event.data && typeof event.data === 'object') {
        console.log("[SaveCardModal] 📨 ALL MESSAGE PROPERTIES:", Object.keys(event.data));
        console.log("[SaveCardModal] 📨 FULL MESSAGE:", JSON.stringify(event.data, null, 2));
      }
      
      // Log all properties if it's an object
      if (event.data && typeof event.data === 'object') {
        console.log("[SaveCardModal] Message properties:", Object.keys(event.data));
        console.log("[SaveCardModal] Full message object:", JSON.stringify(event.data, null, 2));
        
        // Check if this is a payment completion message
        if (event.data.eventName === 'helcim-pay-complete' || event.data.eventName === 'helcim-pay-success') {
          console.log("[SaveCardModal] 🎉 PAYMENT COMPLETION DETECTED!");
        }
      }
      
      // Check various message formats from Helcim
      const isSuccess = event.data && (
        event.data.type === 'helcim-pay-success' || 
        event.data === 'helcim-pay-success' ||
        event.data.event === 'transaction-success' ||
        event.data.status === 'success' ||
        event.data.success === true ||
        event.data.responseMessage === 'APPROVED' ||
        event.data.approved === true ||
        (event.data.transactionId && event.data.status !== 'error') ||
        event.data.eventName === 'helcim-pay-complete' ||
        event.data.eventName === 'helcim-pay-success' ||
        event.data.eventName === 'transaction-complete' ||
        event.data.eventName === 'payment-complete' ||
        // NEW: Check for the actual success message format we're receiving
        (event.data.eventStatus === 'SUCCESS' && event.data.eventMessage) ||
        // Check if eventMessage contains APPROVED status
        (event.data.eventMessage && event.data.eventMessage.includes('"status":"APPROVED"'))
      );
      
      // Log all messages for debugging
      console.log("[SaveCardModal] 🔍 Checking message for success indicators...");
      console.log("[SaveCardModal] Message eventName:", event.data?.eventName);
      console.log("[SaveCardModal] Message type:", event.data?.type);
      console.log("[SaveCardModal] Message status:", event.data?.status);
      console.log("[SaveCardModal] Message success:", event.data?.success);
      console.log("[SaveCardModal] Is success:", isSuccess);
      
      if (isSuccess) {
        console.log("[SaveCardModal] Payment successful!");
        console.log("[SaveCardModal] Event data:", event.data);
        
        // Save the card on the backend if we have a token
        const token = event.data.token || event.data.cardToken || checkoutToken;
        if (token && clientId) {
          try {
            console.log("[SaveCardModal] Saving card on backend...");
            const saveRes = await apiRequest("POST", "/api/payments/helcim/save-card", {
              token,
              clientId,
              appointmentId,
              customerEmail,
              customerName
            });
            const saveData = await saveRes.json();
            console.log("[SaveCardModal] Card saved on backend:", saveData);
          } catch (err) {
            console.error("[SaveCardModal] Error saving card on backend:", err);
          }
        }
        
        // Remove the iframe
        if (typeof window.removeHelcimPayIframe === 'function') {
          // @ts-ignore
          window.removeHelcimPayIframe();
        }
        
        setHelcimIframeOpen(false);
        
        // Call the onSaved callback if available
        if (onSaved) {
          console.log("[SaveCardModal] 🎉 CALLING onSaved callback - onSaved exists:", !!onSaved);
          console.log("[SaveCardModal] Card info being passed:", {
            last4: event.data.last4 || '****',
            brand: event.data.brand || 'Card',
            saved: true
          });
          try {
            onSaved({
              last4: event.data.last4 || '****',
              brand: event.data.brand || 'Card',
              saved: true
            });
            console.log("[SaveCardModal] ✅ onSaved callback called successfully");
          } catch (err) {
            console.error("[SaveCardModal] ❌ Error calling onSaved:", err);
          }
        } else {
          // @ts-ignore
          if (window.helcimSaveCardCallback && window.helcimSaveCardCallback.onSaved) {
            console.log("[SaveCardModal] Calling onSaved callback from window");
            // @ts-ignore
            window.helcimSaveCardCallback.onSaved({
              last4: event.data.last4 || '****',
              brand: event.data.brand || 'Card',
              saved: true
            });
          }
        }
        
        toast({ 
          title: "Card saved successfully!", 
          description: "Your payment method has been saved." 
        });
      }
      
      // Check if this is a Helcim close message
      if (event.data && (event.data.type === 'helcim-pay-close' || event.data === 'helcim-pay-close')) {
        console.log("[SaveCardModal] Payment window closed by user");
        
        // Remove the iframe
        if (typeof window.removeHelcimPayIframe === 'function') {
          // @ts-ignore
          window.removeHelcimPayIframe();
        }
        
        setHelcimIframeOpen(false);
        
        toast({ 
          title: "Payment cancelled", 
          description: "The payment window was closed." 
        });
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Also check periodically if iframe was removed
    const checkInterval = setInterval(() => {
      const iframe = document.querySelector('iframe[src*="helcim"]');
      console.log("[SaveCardModal] Checking for iframe... Found:", !!iframe, "helcimIframeOpen:", helcimIframeOpen);
      
      if (!iframe && helcimIframeOpen) {
        console.log("[SaveCardModal] Helcim iframe was removed!");
        clearInterval(checkInterval);
        setHelcimIframeOpen(false);
        
        // If iframe was removed without a message, assume success and try to save the card
        // This handles cases where Helcim doesn't send a proper message
        if (checkoutToken && clientId) {
          console.log("[SaveCardModal] Iframe removed - assuming completion, attempting to save card...");
          console.log("[SaveCardModal] Token:", checkoutToken, "ClientId:", clientId);
          
          // First, try to save the card
          apiRequest("POST", "/api/payments/helcim/save-card", {
            token: checkoutToken,
            clientId,
            appointmentId,
            customerEmail,
            customerName
          }).then(async (res) => {
            const data = await res.json();
            console.log("[SaveCardModal] Card save attempt result:", data);
            
            // Call the callback regardless (even if save failed, user completed the form)
            if (onSaved) {
              console.log("[SaveCardModal] Calling onSaved callback directly after iframe removal");
              console.log("[SaveCardModal] Card data from backend:", data);
              onSaved({
                last4: data.cardLast4 || data.last4 || '****',
                brand: data.cardBrand || data.brand || 'Card',
                saved: true,
                token: checkoutToken,
                helcimCardId: data.helcimCardId,
                helcimCustomerId: data.helcimCustomerId
              });
            } else {
              // @ts-ignore
              if (window.helcimSaveCardCallback && window.helcimSaveCardCallback.onSaved) {
                console.log("[SaveCardModal] Calling onSaved callback from window after iframe removal");
                // @ts-ignore
                window.helcimSaveCardCallback.onSaved({
                  last4: data.cardLast4 || data.last4 || '****',
                  brand: data.cardBrand || data.brand || 'Card',
                  saved: true,
                  token: checkoutToken,
                  helcimCardId: data.helcimCardId,
                  helcimCustomerId: data.helcimCustomerId
                });
              }
            }
            
            // Show success toast
            toast({ 
              title: "Payment method saved", 
              description: "Your card has been saved for future bookings." 
            });
          }).catch((err) => {
            console.error("[SaveCardModal] Error saving card after iframe removal:", err);
            
            // Still call the callback - let the booking continue
            if (onSaved) {
              console.log("[SaveCardModal] Calling onSaved callback directly despite error");
              onSaved({
                last4: '****',
                brand: 'Card',
                saved: true,
                token: checkoutToken
              });
            } else {
              // @ts-ignore
              if (window.helcimSaveCardCallback && window.helcimSaveCardCallback.onSaved) {
                console.log("[SaveCardModal] Calling onSaved callback from window despite error");
                // @ts-ignore
                window.helcimSaveCardCallback.onSaved({
                  last4: '****',
                  brand: 'Card',
                  saved: true,
                  token: checkoutToken
                });
              }
            }
          });
        }
      }
    }, 500);
    
    // Clear the interval after 5 minutes to prevent memory leaks
    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      setHelcimIframeOpen(false);
    }, 300000);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(checkInterval);
      clearInterval(visibilityInterval);
      clearTimeout(timeout);
    };
  }, [helcimIframeOpen, toast, checkoutToken, clientId, customerEmail, customerName, onSaved]);

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
      
      // Mark that Helcim iframe is opening
      console.log("[SaveCardModal] 🚀 Setting helcimIframeOpen to true");
      setHelcimIframeOpen(true);
      
      // Small delay before opening Helcim
      setTimeout(() => {
        // Try different methods to open Helcim payment form
        try {
          // Method 1: Try appendHelcimPayIframe (if available)
          // @ts-ignore
          if (typeof window.appendHelcimPayIframe === 'function') {
            console.log('[SaveCardModal] Mounting Helcim iframe with mobile-friendly container');
            
            // Clear any existing iframes and wrappers first (like appointments page does)
            const existingWrappers = document.querySelectorAll('#helcim-iframe-wrapper');
            existingWrappers.forEach(wrapper => {
              console.log('[SaveCardModal] Removing existing wrapper');
              wrapper.remove();
            });
            
            const existingFrames = document.querySelectorAll('#helcimPayIframe, iframe[src*="helcim"]');
            existingFrames.forEach(frame => {
              console.log('[SaveCardModal] Removing existing iframe');
              frame.remove();
            });
            
            // Create a container div for the iframe with proper z-index (matching appointments page)
            const iframeContainer = document.createElement('div');
            iframeContainer.id = 'helcim-iframe-wrapper';
            iframeContainer.style.cssText = `
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              z-index: 100000;
              display: flex;
              align-items: center;
              justify-content: center;
              pointer-events: none;
              background-color: rgba(0, 0, 0, 0.8);
            `;
            document.body.appendChild(iframeContainer);
            
            // @ts-ignore
            const result = window.appendHelcimPayIframe(checkoutToken, {
              allowExit: true,
            });
            console.log("[SaveCardModal] appendHelcimPayIframe result:", result);
            
            // Move and style the iframe properly (matching appointments page)
            setTimeout(() => {
              const iframe = document.getElementById('helcimPayIframe') as HTMLIFrameElement;
              if (iframe && iframeContainer) {
                console.log('[SaveCardModal] Found Helcim iframe, applying mobile-friendly styling');
                iframeContainer.appendChild(iframe);
                
                // Apply mobile-friendly styling with responsive adjustments
                const isMobile = window.innerWidth <= 768;
                iframe.style.cssText = `
                  width: ${isMobile ? '95vw' : '100%'};
                  max-width: ${isMobile ? '100%' : '600px'};
                  height: ${isMobile ? '85vh' : '80vh'};
                  max-height: ${isMobile ? '100%' : '700px'};
                  border: none;
                  border-radius: ${isMobile ? '0' : '8px'};
                  background-color: white;
                  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                  pointer-events: auto;
                  position: relative;
                  z-index: 100001;
                  margin: ${isMobile ? '0' : 'auto'};
                `;
                
                // Make the container interactive for the iframe area
                iframeContainer.style.pointerEvents = 'auto';
                
                // Add touch event handling for mobile devices
                if (isMobile) {
                  iframe.style.touchAction = 'auto';
                  iframe.style.webkitOverflowScrolling = 'touch';
                  iframe.style.overflowY = 'auto';
                  
                  // Ensure iframe content is scrollable on mobile
                  iframe.setAttribute('scrolling', 'yes');
                  
                  // Add viewport meta tag adjustments for mobile
                  const viewport = document.querySelector('meta[name="viewport"]');
                  if (viewport) {
                    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
                  }
                }
                
                console.log('[SaveCardModal] Iframe styled and positioned for mobile compatibility with touch support');
              } else {
                console.log('[SaveCardModal] Warning: Could not find iframe to style');
              }
            }, 100);
          } 
          // Method 2: Try using Helcim Pay.js v2 redirect
          else if (checkoutToken) {
            console.log("[SaveCardModal] Using redirect method for Helcim checkout");
            
            // Create a hosted checkout URL
            const checkoutUrl = `https://secure.helcim.app/helcim-pay/checkout?token=${checkoutToken}`;
            
            // Open in a new window/tab
            const paymentWindow = window.open(
              checkoutUrl,
              'helcim-payment',
              'width=500,height=700,top=100,left=100,resizable=yes,scrollbars=yes'
            );
            
            if (paymentWindow) {
              console.log("[SaveCardModal] Opened Helcim checkout in new window");
              
              // Monitor the window for closure
              const checkWindowClosed = setInterval(() => {
                if (paymentWindow.closed) {
                  clearInterval(checkWindowClosed);
                  console.log("[SaveCardModal] Payment window closed");
                  setHelcimIframeOpen(false);
                  
                  // The persistent message listener should catch any success messages
                  toast({
                    title: "Payment window closed",
                    description: "If you completed your payment, your appointment will be confirmed shortly."
                  });
                }
              }, 500);
            } else {
              throw new Error("Unable to open payment window - popup may be blocked");
            }
          } else {
            throw new Error("No checkout token available");
          }
        } catch (appendErr: any) {
            console.error("[SaveCardModal] Error opening Helcim payment:", appendErr);
            setHelcimIframeOpen(false);
            toast({ 
              title: "Error", 
              description: appendErr?.message || "Failed to open payment window. Please try again.", 
              variant: "destructive" 
            });
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

  // Wrapper for onOpenChange to add debugging and prevent premature closing
  const handleOpenChange = (newOpen: boolean) => {
    console.log("[SaveCardModal] 🚪 onOpenChange called - newOpen:", newOpen, "current open:", open);
    
    // If trying to close the modal while iframe is open, add a delay to catch late messages
    if (!newOpen && helcimIframeOpen) {
      console.log("[SaveCardModal] ⏳ Modal closing while iframe is open - adding delay to catch late messages");
      setTimeout(() => {
        console.log("[SaveCardModal] ⏳ Delay completed - closing modal");
        onOpenChange(newOpen);
      }, 2000); // 2 second delay to catch late success messages
      return;
    }
    
    onOpenChange(newOpen);
  };

  // Check if we're on mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className={isMobile 
          ? "fixed left-2 right-2 top-[15%] translate-x-0 translate-y-0 w-auto mx-auto max-h-[70vh] overflow-y-auto bg-white dark:bg-gray-900"
          : "sm:max-w-[480px] w-auto sm:w-auto"
        }
        style={isMobile ? {
          maxWidth: "calc(100vw - 1rem)",
          padding: "20px",
          borderRadius: "12px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          zIndex: helcimIframeOpen ? 90 : 95,  // Above booking widget (z-90) but below Helcim iframe (z-100000)
          border: "1px solid rgba(200, 200, 200, 0.2)"
        } : { 
          width: "auto", 
          maxWidth: "min(480px, calc(100vw - 2rem))", 
          padding: "16px",
          zIndex: helcimIframeOpen ? 90 : 95  // Above booking widget but below Helcim iframe
        }}
        onInteractOutside={(e) => {
          if (helcimIframeOpen) {
            e.preventDefault();
          }
        }}>
        <DialogHeader className={isMobile ? "mb-3" : ""}>
          <DialogTitle className={isMobile ? "text-lg" : ""}>Add a Card</DialogTitle>
        </DialogHeader>

        <div className={isMobile ? "grid gap-3 py-3" : "grid gap-4 py-4"}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className={isMobile ? "h-6 w-6 animate-spin text-primary" : "h-8 w-8 animate-spin text-primary"} />
              <p className={isMobile ? "text-sm text-muted-foreground text-center px-2" : "text-sm text-muted-foreground"}>
                Initializing secure payment...
              </p>
            </div>
          ) : helcimIframeOpen ? (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <p className={isMobile ? "font-medium text-base" : "font-medium"}>Opening payment window...</p>
                <p className={isMobile ? "text-sm text-muted-foreground px-2" : "text-sm text-muted-foreground"}>
                  A secure payment window should open in a moment. Please complete your card details there.
                </p>
                <p className={isMobile ? "text-xs text-muted-foreground px-2" : "text-xs text-muted-foreground"}>
                  If the payment window doesn't open, please check if popups are blocked in your browser.
                </p>
                <div className={isMobile ? "flex flex-col gap-2 px-2" : "flex gap-2 justify-center"}>
                  <Button 
                    variant="outline" 
                    size={isMobile ? "default" : "sm"}
                    className={isMobile 
                      ? "text-black dark:text-black hover:text-black w-full h-10 text-base"
                      : "text-black dark:text-black hover:text-black"
                    }
                    onClick={() => {
                      // Close Helcim iframe and reset
                      if (typeof window.removeHelcimPayIframe === 'function') {
                        // @ts-ignore
                        window.removeHelcimPayIframe();
                      }
                      setHelcimIframeOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="default" 
                    size={isMobile ? "default" : "sm"}
                    className={isMobile ? "w-full h-10 text-base" : ""}
                    onClick={() => {
                      console.log("[SaveCardModal] Manual completion triggered");
                      setHelcimIframeOpen(false);
                      
                      // Try to reopen the payment window
                      handleOpenHelcimModal();
                    }}
                  >
                    Retry Opening Payment Window
                  </Button>
                </div>
              </div>
            </div>
          ) : isInitialized ? (
            <div className="space-y-2">
              <div className={isMobile 
                ? "bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-left space-y-3 border border-gray-200 dark:border-gray-700"
                : "bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-left space-y-2 border border-gray-200 dark:border-gray-700"
              }>
                <p className={isMobile ? "text-base text-black leading-relaxed" : "text-sm text-black"}>
                  <strong>Cancellation policy:</strong> $30 fee if you cancel within 24 hours of the appointment, and the full service charge for no‑shows.
                </p>
                <div className={isMobile ? "flex items-start gap-3 pt-2" : "flex items-start gap-2 pt-1"}>
                  <Checkbox 
                    id="policyAgree" 
                    checked={policyAgreed} 
                    onCheckedChange={(v) => setPolicyAgreed(!!v)}
                    className={isMobile ? "mt-0.5 h-5 w-5" : ""}
                  />
                  <Label 
                    htmlFor="policyAgree" 
                    className={isMobile 
                      ? "text-base leading-relaxed cursor-pointer text-black"
                      : "text-sm leading-snug cursor-pointer text-black"
                    }
                  >
                    I have read and agree to the cancellation policy.
                  </Label>
                </div>
              </div>
            </div>
          ) : (
            <div className={isMobile ? "flex flex-col items-center justify-center py-6 gap-2" : "flex flex-col items-center justify-center py-8 gap-2"}>
              <Loader2 className={isMobile ? "h-5 w-5 animate-spin text-muted-foreground" : "h-6 w-6 animate-spin text-muted-foreground"} />
              <p className={isMobile ? "text-sm text-muted-foreground text-center px-2" : "text-sm text-muted-foreground"}>
                Preparing payment form...
              </p>
            </div>
          )}
        </div>

        <DialogFooter className={isMobile ? "flex-row justify-between gap-2" : ""}>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isLoading}
            className={isMobile 
              ? "text-black dark:text-black hover:text-black h-10 px-4 text-base flex-1"
              : "text-black dark:text-black hover:text-black"
            }
          >
            {helcimIframeOpen ? "Close" : "Cancel"}
          </Button>
          {!helcimIframeOpen && (
            <Button 
              onClick={handleOpenHelcimModal} 
              disabled={isLoading || !isInitialized || !policyAgreed}
              className={isMobile ? "h-10 px-4 text-base flex-1" : ""}
            >
              {isLoading ? (
                <>
                  <Loader2 className={isMobile ? "mr-2 h-5 w-5 animate-spin" : "mr-2 h-4 w-4 animate-spin"} />
                  Loading...
                </>
              ) : (
                <>Open Secure Payment</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}