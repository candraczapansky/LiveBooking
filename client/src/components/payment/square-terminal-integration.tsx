import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Terminal,
  Receipt
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SquareTerminalIntegrationProps {
  amount: number;
  tipAmount?: number;
  appointmentId?: number;
  clientId?: number;
  description?: string;
  onSuccess: (paymentData: any) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export default function SquareTerminalIntegration({
  amount,
  tipAmount = 0,
  appointmentId,
  clientId,
  description,
  onSuccess,
  onError,
  onCancel
}: SquareTerminalIntegrationProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [terminalStatus, setTerminalStatus] = useState<any>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const { toast } = useToast();

  const totalAmount = amount + tipAmount;

  useEffect(() => {
    checkTerminalStatus();
  }, []);

  const checkTerminalStatus = async () => {
    try {
      setIsCheckingStatus(true);
      const response = await apiRequest("GET", "/api/square-terminal/status");
      const status = await response.json();
      setTerminalStatus(status);
    } catch (error: any) {
      console.error('Error checking terminal status:', error);
      setTerminalStatus({ connected: false, error: error.message });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const processTerminalPayment = async () => {
    try {
      setIsProcessing(true);
      
      const paymentData = {
        amount,
        tipAmount,
        appointmentId,
        clientId,
        description: description || "Terminal Payment",
        type: appointmentId ? "appointment_payment" : "terminal_payment"
      };

      console.log('Sending payment to Square Terminal:', paymentData);
      
      const response = await apiRequest("POST", "/api/square-terminal/payment", paymentData);
      const result = await response.json();
      
      if (result.success) {
        console.log('Terminal payment successful:', result);
        toast({
          title: "Payment Successful",
          description: "Payment processed through Square Terminal",
        });
        onSuccess(result);
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Terminal payment error:', error);
      const errorMessage = error.message || 'Payment processing failed';
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      });
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const createTerminalCheckout = async () => {
    try {
      setIsProcessing(true);
      
      const checkoutData = {
        amount,
        tipAmount,
        appointmentId,
        clientId,
        description: description || "Terminal Checkout",
        items: [] // You can add items here if needed
      };

      console.log('Creating Square Terminal checkout:', checkoutData);
      
      const response = await apiRequest("POST", "/api/square-terminal/checkout", checkoutData);
      const result = await response.json();
      
      if (result.success) {
        console.log('Terminal checkout created:', result);
        toast({
          title: "Checkout Created",
          description: "Payment request sent to Square Terminal",
        });
        onSuccess(result);
      } else {
        throw new Error(result.error || 'Checkout creation failed');
      }
    } catch (error: any) {
      console.error('Terminal checkout error:', error);
      const errorMessage = error.message || 'Checkout creation failed';
      toast({
        title: "Checkout Failed",
        description: errorMessage,
        variant: "destructive",
      });
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isCheckingStatus) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Checking Terminal Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          Square Terminal Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Terminal Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2">
            {terminalStatus?.connected ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm font-medium">
              Terminal Status
            </span>
          </div>
          <Badge variant={terminalStatus?.connected ? "default" : "destructive"}>
            {terminalStatus?.connected ? "Connected" : "Disconnected"}
          </Badge>
        </div>

        {/* Payment Details */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Amount:</span>
            <span className="font-medium">${amount.toFixed(2)}</span>
          </div>
          {tipAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Tip:</span>
              <span className="font-medium">${tipAmount.toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-semibold">
            <span>Total:</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Error Display */}
        {terminalStatus?.error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-400">
              {terminalStatus.error}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancel
          </Button>
          
          {terminalStatus?.connected ? (
            <Button
              onClick={processTerminalPayment}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Process Payment
                </div>
              )}
            </Button>
          ) : (
            <Button
              onClick={createTerminalCheckout}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Create Checkout
                </div>
              )}
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="font-medium mb-1">Instructions:</p>
          <ul className="space-y-1">
            <li>• Ensure your Square Terminal is connected and ready</li>
            <li>• The payment will be sent to your terminal for processing</li>
            <li>• Customer will complete payment on the terminal</li>
            <li>• Payment will be automatically recorded in your system</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 