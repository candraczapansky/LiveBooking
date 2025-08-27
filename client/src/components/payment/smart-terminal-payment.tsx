import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, CheckCircle, XCircle } from 'lucide-react';

interface SmartTerminalPaymentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
  description?: string;
  locationId?: number | string;
  tipAmount?: number;
}

export default function SmartTerminalPayment({
  open,
  onOpenChange,
  amount,
  onSuccess,
  onError,
  description = "Payment",
  locationId,
  tipAmount,
}: SmartTerminalPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const startPayment = async () => {
    // Pre-generate a reference so we can attach to an in-progress terminal session if Helcim returns a conflict
    const preReference = `POS-${Date.now()}`;
    try {
      setIsLoading(true);
      setStatus('processing');
      setMessage('Initializing payment terminal...');

      // Start the payment process
      const response = await apiRequest('POST', '/api/terminal/payment/start', {
        locationId: String(locationId ?? ''),
        amount,
        description,
        reference: preReference,
        tipAmount: typeof tipAmount === 'number' ? tipAmount : undefined,
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to start payment');
      }

      // Derive a payment identifier from multiple possible fields
      const pid = (data?.paymentId) || (data?.transactionId) || (data?.id) || (data?.invoiceNumber);
      const sessionId = data?.invoiceNumber || pid;

      // Poll for payment status only if we have an identifier
      if (pid) {
        await pollPaymentStatus(String(locationId ?? ''), String(pid));
      } else {
        // No id yet; keep UI in processing and use invoice-based session to unblock later
        if (sessionId) {
          await pollPaymentStatus(String(locationId ?? ''), String(sessionId));
        } else {
          setMessage('Waiting for terminal to acknowledge transaction...');
        }
      }

    } catch (error) {
      // If Helcim reports a conflict/busy terminal, attach to the in-progress session using our pre-generated reference
      const errMsg = String((error as any)?.message || error || '').toLowerCase();
      if (errMsg.includes('conflict') || errMsg.includes('busy')) {
        try {
          setStatus('processing');
          setMessage('Terminal is busy. Attaching to in-progress payment...');
          const locId = String(locationId ?? '');
          const ref = preReference;
          await pollPaymentStatus(locId, ref);
          return;
        } catch (attachErr) {
          // Fall through to error handling below
        }
      }
      console.error('Payment failed:', error);
      setStatus('error');
      setMessage('Payment failed. Please try again.');
      handlePaymentError(error);
    }
  };

  const pollPaymentStatus = async (locId: string, paymentId: string) => {
    try {
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes with 2-second intervals
      let currentId = paymentId;
      
      const poll = async () => {
        if (attempts >= maxAttempts) {
          throw new Error('Payment timed out');
        }

        const response = await apiRequest('GET', `/api/terminal/payment/${locId}/${currentId}`);
        const data = await response.json();

        // If server reveals a concrete transactionId different from what we're polling, switch to it
        if (data?.transactionId && String(data.transactionId) !== String(currentId)) {
          currentId = String(data.transactionId);
        }

        if (data.status === 'completed') {
          setStatus('success');
          setMessage('Payment successful!');
          handlePaymentSuccess(data);
          return;
        } else if (data.status === 'failed') {
          throw new Error(data.message || 'Payment failed');
        }

        // Update status message
        setMessage(data.message || 'Processing payment...');
        
        // Continue polling
        attempts++;
        setTimeout(poll, 2000);
      };

      await poll();
    } catch (error) {
      throw error;
    }
  };

  const handlePaymentSuccess = (response: any) => {
    toast({
      title: "Payment Successful",
      description: "Your payment has been processed successfully.",
    });
    onSuccess?.(response);
    setTimeout(() => {
      onOpenChange(false);
      setStatus('idle');
      setMessage('');
    }, 2000);
  };

  const stringifyError = (err: any): string => {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message || 'Error';
    if (typeof err === 'object') return (err.message || err.error || JSON.stringify(err));
    return String(err);
  };

  const handlePaymentError = (error: any) => {
    toast({
      title: "Payment Failed",
      description: stringifyError(error) || "There was an error processing your payment. Please try again.",
      variant: "destructive",
    });
    onError?.(stringifyError(error));
    setTimeout(() => {
      onOpenChange(false);
      setStatus('idle');
      setMessage('');
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Terminal Payment</DialogTitle>
          <DialogDescription>
            Process payment using the card terminal
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex flex-col items-center justify-center p-4 space-y-4">
            {status === 'idle' && (
              <>
                <CreditCard className="h-16 w-16 text-gray-400" />
                <p className="text-center text-gray-600">
                  Click start to begin processing payment on the terminal
                </p>
                <Button
                  onClick={startPayment}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Starting..." : "Start Payment"}
                </Button>
              </>
            )}

            {status === 'processing' && (
              <>
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
                <p className="text-center text-gray-600">{message}</p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="h-16 w-16 text-green-500" />
                <p className="text-center text-gray-600">{message}</p>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="h-16 w-16 text-red-500" />
                <p className="text-center text-gray-600">{message}</p>
                <Button
                  onClick={startPayment}
                  disabled={isLoading}
                  className="w-full"
                >
                  Try Again
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setStatus('idle');
              setMessage('');
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
