import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface SmartTerminalPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  amount: number;
  tipAmount?: number;
  reference?: string;
  description?: string;
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
}

type PaymentStatus = 'idle' | 'starting' | 'processing' | 'completed' | 'failed' | 'cancelled';

export default function SmartTerminalPaymentDialog({
  open,
  onOpenChange,
  locationId,
  amount,
  tipAmount = 0,
  reference,
  description,
  onSuccess,
  onError,
}: SmartTerminalPaymentDialogProps) {
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [message, setMessage] = useState('');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const paymentIdRef = useRef<string | null>(null);
  const { toast } = useToast();

  // Cleanup polling on unmount or dialog close
  useEffect(() => {
    if (!open && pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [open, pollingInterval]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStatus('idle');
      setMessage('');
      setPaymentId(null);
      paymentIdRef.current = null;
    }
  }, [open]);

  const startPayment = async () => {
    try {
      setStatus('starting');
      setMessage('Initializing payment on terminal...');

      const response = await apiRequest('POST', '/api/terminal/payment/start', {
        locationId,
        amount,
        tipAmount,
        reference,
        description,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to start payment');
      }

      const pid: string = result.transactionId || result.paymentId;
      setPaymentId(pid);
      paymentIdRef.current = pid;
      setStatus('processing');
      setMessage('Payment initiated. Please follow instructions on terminal.');

      // Start polling for status
      // Poll every 2 seconds with a hard stop after 2 minutes
      const startedAt = Date.now();
      const interval = setInterval(() => {
        if (!paymentIdRef.current) return;
        const elapsedMs = Date.now() - startedAt;
        if (elapsedMs > 120000) {
          clearInterval(interval);
          setPollingInterval(null);
          handlePaymentFailure('Unable to confirm payment. Please verify on the terminal.');
          return;
        }
        checkPaymentStatus(paymentIdRef.current);
      }, 2000);
      setPollingInterval(interval);

    } catch (error: any) {
      console.error('❌ Error starting payment:', error);
      setStatus('failed');
      setMessage(error.message || 'Failed to start payment');
      onError(error.message || 'Failed to start payment');
    }
  };

  const checkPaymentStatus = async (pid: string) => {
    try {
      const response = await apiRequest('GET', `/api/terminal/payment/${locationId}/${pid}`);
      const result = await response.json();

      // If server reveals a more specific transactionId, switch to it
      if (result?.transactionId && result.transactionId !== paymentIdRef.current) {
        setPaymentId(result.transactionId);
        paymentIdRef.current = result.transactionId;
      }

      if (result.status === 'completed') {
        handlePaymentSuccess(result);
      } else if (result.status === 'failed') {
        // Handle both declined and failed payments
        const errorMessage = result.message || 'Payment was declined';
        handlePaymentFailure(errorMessage);
      } else if (result.status === 'cancelled') {
        handlePaymentCancelled();
      } else {
        // Update message for ongoing payment
        setMessage(result.message || 'Processing payment...');
      }
    } catch (error: any) {
      console.error('❌ Error checking payment status:', error);
      // Don't fail the payment on polling errors, just log them
    }
  };

  const handlePaymentSuccess = (result: any) => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setStatus('completed');
    setMessage('Payment completed successfully!');
    onSuccess(result);
  };

  const handlePaymentFailure = (errorMessage: string) => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setStatus('failed');
    setMessage(errorMessage);
    onError(errorMessage);
  };

  const handlePaymentCancelled = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setStatus('cancelled');
    setMessage('Payment was cancelled');
    onError('Payment was cancelled');
  };

  const cancelPayment = async () => {
    if (!paymentId) return;

    try {
      await apiRequest('POST', `/api/terminal/payment/${locationId}/${paymentId}/cancel`);
      handlePaymentCancelled();
    } catch (error: any) {
      console.error('❌ Error cancelling payment:', error);
      toast({
        title: "Error",
        description: "Failed to cancel payment. Please check terminal.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Terminal Payment</DialogTitle>
          <DialogDescription>
            Process payment using Smart Terminal
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center gap-4 py-6">
          {/* Payment Amount */}
          <div className="text-center mb-4">
            <p className="text-2xl font-bold">
              ${(amount + (tipAmount || 0)).toFixed(2)}
            </p>
            {tipAmount > 0 && (
              <p className="text-sm text-gray-500">
                Includes ${tipAmount.toFixed(2)} tip
              </p>
            )}
          </div>

          {/* Status Display */}
          <div className="flex flex-col items-center gap-4">
            {status === 'idle' && (
              <Button onClick={startPayment} size="lg">
                Start Payment
              </Button>
            )}

            {(status === 'starting' || status === 'processing') && (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                <p className="text-center text-gray-600">{message}</p>
                <Button 
                  variant="outline" 
                  onClick={cancelPayment}
                  className="mt-2"
                >
                  Cancel Payment
                </Button>
              </>
            )}

            {status === 'completed' && (
              <>
                <CheckCircle className="h-8 w-8 text-green-500" />
                <p className="text-center text-gray-600">{message}</p>
              </>
            )}

            {status === 'failed' && (
              <>
                <XCircle className="h-8 w-8 text-red-500" />
                <p className="text-center text-gray-600">{message}</p>
                <Button 
                  onClick={startPayment}
                  className="mt-2"
                >
                  Retry Payment
                </Button>
              </>
            )}

            {status === 'cancelled' && (
              <>
                <AlertCircle className="h-8 w-8 text-orange-500" />
                <p className="text-center text-gray-600">{message}</p>
                <Button 
                  onClick={startPayment}
                  className="mt-2"
                >
                  Start New Payment
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Close button - only show when not processing */}
        {status !== 'starting' && status !== 'processing' && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}