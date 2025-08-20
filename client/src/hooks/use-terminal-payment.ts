import { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";

interface UseTerminalPaymentProps {
  locationId: string;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

interface PaymentOptions {
  amount: number;
  tipAmount?: number;
  reference?: string;
  description?: string;
}

export function useTerminalPayment({ locationId, onSuccess, onError }: UseTerminalPaymentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptions | null>(null);
  const { toast } = useToast();

  const startTerminalPayment = (options: PaymentOptions) => {
    // Validate location has a terminal configured
    if (!locationId) {
      toast({
        title: "Error",
        description: "No location selected for payment",
        variant: "destructive",
      });
      return;
    }

    // Validate amount
    if (!options.amount || options.amount <= 0) {
      toast({
        title: "Error",
        description: "Invalid payment amount",
        variant: "destructive",
      });
      return;
    }

    setPaymentOptions(options);
    setIsOpen(true);
  };

  const handleSuccess = (result: any) => {
    toast({
      title: "Payment Successful",
      description: `Payment of $${paymentOptions?.amount.toFixed(2)} processed successfully`,
    });
    onSuccess?.(result);
  };

  const handleError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
    onError?.(error);
  };

  return {
    isOpen,
    setIsOpen,
    startTerminalPayment,
    paymentOptions,
    handleSuccess,
    handleError,
  };
}