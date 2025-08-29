import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SaveCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  customerEmail?: string;
  customerName?: string;
  onSaved?: (paymentMethod: any) => void;
}

export default function SaveCardModal({
  open,
  onOpenChange,
  clientId,
  customerEmail,
  customerName,
  onSaved,
}: SaveCardModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  // Ensure Helcim scripts exist
  const ensureScripts = useCallback(() => {
    const hasStart = Array.from(document.scripts).some((s) => s.src.includes("helcim-pay/services/start.js"));
    if (!hasStart) {
      const s = document.createElement("script");
      s.type = "text/javascript";
      s.src = "https://secure.helcim.app/helcim-pay/services/start.js";
      document.body.appendChild(s);
    }
    const hasLegacy = Array.from(document.scripts).some((s) => s.src.includes("js/helcim.js"));
    if (!hasLegacy) {
      const s2 = document.createElement("script");
      s2.type = "text/javascript";
      s2.src = "https://secure.helcim.app/js/helcim.js";
      document.body.appendChild(s2);
    }
  }, []);

  const initializeForm = useCallback(async () => {
    if (isInitialized) return;
    // @ts-ignore - helcimPay injected by script
    if (!window.helcimPay) return;
    try {
      setIsLoading(true);
      // We only need a session token to render fields; use a minimal amount
      const initRes = await apiRequest("POST", "/api/payments/helcim/initialize", {
        amount: 1,
        description: "Save Card",
        customerEmail,
        customerName,
      });
      const initData = await initRes.json();
      if (!initRes.ok || !initData?.success || !initData?.token) {
        throw new Error(initData?.message || "Failed to initialize Helcim session");
      }
      // @ts-ignore
      await window.helcimPay.initialize({
        // Account/terminal are optional for Pay.js v2 when using checkout token; include if available
        accountId: (import.meta as any).env?.VITE_HELCIM_ACCOUNT_ID,
        terminalId: (import.meta as any).env?.VITE_HELCIM_TERMINAL_ID,
        token: initData.token,
        test: process.env.NODE_ENV !== "production",
      });
      // @ts-ignore
      window.helcimPay.mount("helcim-save-card-form");
      setIsInitialized(true);
    } catch (err: any) {
      console.error("Helcim form init failed:", err);
      toast({ title: "Unable to load card form", description: err?.message || String(err), variant: "destructive" });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, customerEmail, customerName, onOpenChange, toast]);

  useEffect(() => {
    if (!open) return;
    ensureScripts();
    const id = setInterval(() => {
      // @ts-ignore
      if (window.helcimPay && !isInitialized) {
        clearInterval(id);
        initializeForm();
      }
    }, 150);
    return () => clearInterval(id);
  }, [open, ensureScripts, isInitialized, initializeForm]);

  useEffect(() => {
    return () => {
      // @ts-ignore
      if (window.helcimPay && isInitialized) {
        // @ts-ignore
        window.helcimPay.unmount();
      }
      setIsInitialized(false);
    };
  }, [isInitialized]);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      // @ts-ignore
      if (!window.helcimPay) throw new Error("Card form not ready");
      // @ts-ignore
      const { token, error } = await window.helcimPay.createToken();
      if (error) throw new Error(error);
      if (!token) throw new Error("No token created");

      const res = await apiRequest("POST", "/api/payments/helcim/save-card", {
        clientId,
        token,
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to save card");
      }
      toast({ title: "Card saved", description: "Your card was added to your profile." });
      onSaved?.(data.paymentMethod);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Save card failed:", err);
      toast({ title: "Save failed", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add a card</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div id="helcim-save-card-form" className="min-h-[160px]" />
          {isLoading && (
            <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
          )}
          <p className="text-xs text-muted-foreground">
            Your card is securely saved with Helcim. We never store your full card number.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading || !isInitialized}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save card"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}




