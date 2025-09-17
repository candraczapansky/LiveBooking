import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { paymentSuccessStore } from "@/lib/payment-success-store";
import { useQueryClient } from "@tanstack/react-query";

export function GlobalPaymentSuccess() {
  const [state, setState] = useState(paymentSuccessStore.getState());
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to store changes
    const unsubscribe = paymentSuccessStore.subscribe(() => {
      const newState = paymentSuccessStore.getState();
      console.log('[GlobalPaymentSuccess] Store updated:', newState);
      setState(newState);
    });

    // Check initial state
    const initialState = paymentSuccessStore.getState();
    if (initialState.isOpen) {
      console.log('[GlobalPaymentSuccess] Found active payment success on mount');
      setState(initialState);
    }

    return unsubscribe;
  }, []);

  const handleClose = () => {
    console.log('[GlobalPaymentSuccess] User manually closing success modal');
    
    // Refresh all data
    queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
    queryClient.invalidateQueries({ queryKey: ['staff-earnings'] });
    queryClient.invalidateQueries({ queryKey: ['payroll-history'] });
    queryClient.invalidateQueries({ queryKey: ['/api/sales-history'] });
    queryClient.invalidateQueries({ queryKey: ['/api/saved-payment-methods'] });
    
    // Hide the modal
    paymentSuccessStore.hide();
  };

  if (!state.isOpen) return null;

  console.log('[GlobalPaymentSuccess] Rendering success modal');

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4"
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: 99999,
        pointerEvents: 'auto'
      }}
    >
      <Card className="w-full max-w-lg animate-in zoom-in duration-300 shadow-2xl">
        <CardContent className="text-center py-12 px-8">
          <div className="bg-green-100 rounded-full p-6 inline-flex mb-6">
            <CheckCircle className="h-24 w-24 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Payment Successful! ✅
          </h1>
          
          <p className="text-xl text-gray-700 mb-3">
            The appointment has been marked as completed and paid.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-8">
            <p className="text-2xl font-semibold text-gray-800">
              {formatPrice(state.amount)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Transaction processed successfully
            </p>
          </div>
          
          <Button 
            onClick={handleClose}
            size="lg"
            className="px-16 py-6 text-lg font-semibold"
            variant="default"
          >
            Close Window
          </Button>
          
          <p className="text-sm text-gray-400 mt-6 italic">
            This window will stay open until you click Close
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
