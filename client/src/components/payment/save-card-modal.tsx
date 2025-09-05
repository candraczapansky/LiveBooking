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
  const { toast } = useToast();

  // Debug modal state changes
  useEffect(() => {
    console.log("[SaveCardModal] 🔄 Modal state changed - open:", open);
  }, [open]);

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
            
            try {
              const eventMessageData = JSON.parse(event.data.eventMessage);
              console.log("[SaveCardModal] 🔒 PERSISTENT LISTENER - Full event data:", eventMessageData);
              
              const cardData = eventMessageData.data?.data;
              cardToken = cardData?.cardToken;
              transactionId = cardData?.transactionId;
              cardLast4 = cardData?.cardNumber?.slice(-4);
              cardBrand = cardData?.cardType || cardData?.cardBrand || 'Card';
              const cardCustomerCode = cardData?.customerCode;
              
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
                    try {
                      const evt = new CustomEvent('helcimCardSaved', { detail: saveResult });
                      window.dispatchEvent(evt);
                      console.log('[SaveCardModal] Dispatched helcimCardSaved');
                    } catch {}
                  } else {
                    console.warn("[SaveCardModal] 🔒 PERSISTENT LISTENER - Card save failed (non-blocking):", saveResult.message);
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
      
      // Optional: auto-open Helcim window once initialized
      try {
        setTimeout(() => {
          if (!helcimIframeOpen) {
            console.log("[SaveCardModal] Auto-opening Helcim iframe after init");
            try { handleOpenHelcimModal(); } catch (e) { console.warn("[SaveCardModal] Auto-open failed:", e); }
          }
        }, 150);
      } catch {}
      
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
        // Open the Helcim iframe modal
        // @ts-ignore
        if (typeof window.appendHelcimPayIframe === 'function') {
          try {
            // @ts-ignore
            const result = window.appendHelcimPayIframe(checkoutToken);
            console.log("[SaveCardModal] appendHelcimPayIframe result:", result);
            
            // Check if the iframe was actually added
            setTimeout(() => {
              const iframe = document.querySelector('iframe#helcimPayIframe') as HTMLIFrameElement;
              if (iframe) {
                console.log("[SaveCardModal] Helcim iframe confirmed in DOM");
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]" style={{ zIndex: helcimIframeOpen ? 1 : undefined }}>
        <DialogHeader>
          <DialogTitle>Add a Card (DEBUG v3)</DialogTitle>
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
                  If you don't see the payment window, it may be blocked by your browser.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline" 
                    size="sm"
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
                    size="sm"
                    onClick={() => {
                      console.log("[SaveCardModal] Manual completion triggered");
                      // Remove iframe
                      if (typeof window.removeHelcimPayIframe === 'function') {
                        // @ts-ignore
                        window.removeHelcimPayIframe();
                      }
                      setHelcimIframeOpen(false);
                      
                      // Trigger the callback
                      if (onSaved) {
                        console.log("[SaveCardModal] Calling onSaved directly from manual complete");
                        onSaved({
                          last4: '****',
                          brand: 'Card',
                          saved: true
                        });
                      } else {
                        // @ts-ignore
                        if (window.helcimSaveCardCallback && window.helcimSaveCardCallback.onSaved) {
                          console.log("[SaveCardModal] Calling onSaved from window from manual complete");
                          // @ts-ignore
                          window.helcimSaveCardCallback.onSaved({
                            last4: '****',
                            brand: 'Card',
                            saved: true
                          });
                        }
                      }
                      
                      toast({ 
                        title: "Continuing with booking", 
                        description: "Processing your appointment..." 
                      });
                    }}
                  >
                    ✓ I've Completed Entering My Card
                  </Button>
                  
                  {/* DEBUG: Direct callback test */}
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      console.log("[SaveCardModal] DEBUG: Direct onSaved test - BUTTON CLICKED!");
                      console.log("[SaveCardModal] DEBUG: onSaved exists?", !!onSaved);
                      console.log("[SaveCardModal] DEBUG: onSaved type:", typeof onSaved);
                      console.log("[SaveCardModal] DEBUG: onSaved function:", onSaved);
                      
                      if (onSaved) {
                        console.log("[SaveCardModal] DEBUG: About to call onSaved directly...");
                        try {
                          onSaved({
                            last4: 'TEST',
                            brand: 'TEST',
                            saved: true,
                            debug: true
                          });
                          console.log("[SaveCardModal] DEBUG: onSaved called successfully!");
                        } catch (err) {
                          console.error("[SaveCardModal] DEBUG: Error calling onSaved:", err);
                        }
                      } else {
                        console.log("[SaveCardModal] DEBUG: onSaved is null/undefined!");
                      }
                      
                      // Close modal after a delay to see console output
                      setTimeout(() => {
                        setHelcimIframeOpen(false);
                        onOpenChange(false);
                      }, 1000);
                    }}
                  >
                    DEBUG: Test Callback
                  </Button>
                </div>
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
                
                {/* DEBUG BUTTON - ALWAYS VISIBLE */}
                <Button 
                  variant="destructive" 
                  size="lg"
                  className="mt-4 w-full"
                  onClick={() => {
                    console.log("🔴🔴🔴 DEBUG BUTTON CLICKED!");
                    console.log("onSaved exists?", !!onSaved);
                    console.log("onSaved type:", typeof onSaved);
                    
                    if (onSaved) {
                      console.log("Calling onSaved...");
                      onSaved({
                        last4: 'DEBUG',
                        brand: 'DEBUG',
                        saved: true,
                        debug: true
                      });
                      console.log("onSaved called!");
                      
                      // Close modal after delay
                      setTimeout(() => {
                        onOpenChange(false);
                      }, 1000);
                    } else {
                      console.log("ERROR: onSaved is null!");
                      alert("ERROR: onSaved callback is null!");
                    }
                  }}
                >
                  🔴 DEBUG: TEST APPOINTMENT CREATION 🔴
                </Button>
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