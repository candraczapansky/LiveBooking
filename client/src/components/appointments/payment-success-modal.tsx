import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface PaymentSuccessModalProps {
  isOpen: boolean;
  amount: number;
  onClose: () => void;
}

// Global state to prevent modal from closing
(window as any).__PAYMENT_SUCCESS_ACTIVE = false;

export function PaymentSuccessModal({ isOpen, amount, onClose }: PaymentSuccessModalProps) {
  const [forceOpen, setForceOpen] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      (window as any).__PAYMENT_SUCCESS_ACTIVE = true;
      setForceOpen(true);
      console.log("[PaymentSuccessModal] ACTIVATED - Modal will stay open");
    }
  }, [isOpen]);
  
  // Prevent any automatic closing
  useEffect(() => {
    if (forceOpen) {
      const interval = setInterval(() => {
        if (!(window as any).__PAYMENT_SUCCESS_ACTIVE) {
          console.log("[PaymentSuccessModal] Detected attempt to close - keeping open");
          (window as any).__PAYMENT_SUCCESS_ACTIVE = true;
        }
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [forceOpen]);
  
  const handleClose = () => {
    console.log("[PaymentSuccessModal] User manually closing success modal");
    (window as any).__PAYMENT_SUCCESS_ACTIVE = false;
    setForceOpen(false);
    onClose();
  };
  
  if (!forceOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
    >
      <Card className="w-full max-w-md animate-in zoom-in duration-200">
        <CardContent className="text-center py-8">
          <div className="bg-green-50 rounded-full p-4 inline-flex mb-4">
            <CheckCircle className="h-20 w-20 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h2>
          <p className="text-lg text-gray-700 mb-2">
            The appointment has been marked as completed and paid.
          </p>
          <p className="text-md text-gray-500 mb-8">
            Transaction complete • {formatPrice(amount)} processed
          </p>
          <Button 
            onClick={handleClose}
            size="lg"
            className="px-12 py-3 text-lg"
            variant="default"
          >
            Close Window
          </Button>
          <p className="text-xs text-gray-400 mt-4">
            This window will remain open until you click Close
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
