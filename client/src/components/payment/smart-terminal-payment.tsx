import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, CreditCard, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from '../../hooks/use-toast';

interface SmartTerminalPaymentProps {
  amount: number;
  tipAmount?: number;
  appointmentId?: number;
  clientId?: number;
  description?: string;
  onSuccess: (paymentData: any) => void;
  onCancel: () => void;
}

interface SmartTerminalDevice {
  id: string;
  code: string;
  name: string;
  status: string;
  lastSeen: string;
}

export const SmartTerminalPayment: React.FC<SmartTerminalPaymentProps> = ({
  amount,
  tipAmount = 0,
  appointmentId,
  clientId,
  description,
  onSuccess,
  onCancel
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [devices, setDevices] = useState<SmartTerminalDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'sending' | 'waiting' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isCheckingDevices, setIsCheckingDevices] = useState(false);
  const [transactionId, setTransactionId] = useState<string>('');


  const totalAmount = amount + tipAmount;

  // Fetch available devices
  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setIsCheckingDevices(true);
      // For now, use a default terminal ID since we're using the new endpoint
      const device: SmartTerminalDevice = {
        id: 'TERM001',
        code: 'TERM001',
        name: 'Helcim Smart Terminal',
        status: 'active',
        lastSeen: new Date().toISOString()
      };
      setDevices([device]);
      setSelectedDevice(device.code);
    } catch (error) {
      console.error('Error setting up default device:', error);
      setErrorMessage('Failed to set up terminal device');
    } finally {
      setIsCheckingDevices(false);
    }
  };



  const processPayment = async () => {
    if (!selectedDevice) {
      toast({
        title: "No Device Selected",
        description: "Please select a terminal device",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('sending');
    setErrorMessage('');

    try {
      // Use the new clean payment endpoint
      console.log('Initiating payment with new endpoint...');
      
      const paymentRequest = {
        amount: totalAmount,
        terminalId: selectedDevice,
        bookingId: appointmentId ? `APT-${appointmentId}` : `POS-${Date.now()}`
      };
      
      const response = await fetch('/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentRequest)
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Store transaction ID for webhook handling
        const txnId = data.transactionId;
        setTransactionId(txnId);
        setPaymentStatus('waiting');
        
        // Show success message
        toast({
          title: "Payment Initiated",
          description: "Please complete the payment on the terminal device. The system will automatically update when payment is completed."
        });

        // For now, simulate success after a delay (webhook will handle real updates)
        setTimeout(() => {
          setPaymentStatus('success');
          setIsProcessing(false);
          
          // Call onSuccess with payment data
          onSuccess({
            transactionId: txnId,
            status: 'completed',
            amount: totalAmount,
            method: 'helcim_terminal'
          });
        }, 5000); // 5 second delay for demo
        
      } else {
        throw new Error(data.detail || 'Payment initiation failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentStatus('failed');
      setErrorMessage(error.message || 'Payment processing failed');
      
      toast({
        title: "Payment Failed",
        description: error.message || 'Failed to process payment',
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  



  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'sending':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
      case 'waiting':
        return <CreditCard className="h-8 w-8 text-yellow-500 animate-pulse" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'failed':
        return <XCircle className="h-8 w-8 text-red-500" />;
      default:
        return <CreditCard className="h-8 w-8 text-gray-400" />;
    }
  };

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case 'sending':
        return 'Sending payment to terminal...';
      case 'waiting':
        return 'Please complete payment on terminal';
      case 'success':
        return 'Payment completed successfully!';
      case 'failed':
        return errorMessage || 'Payment failed';
      default:
        return `Ready to process $${totalAmount.toFixed(2)}`;
    }
  };

  if (isCheckingDevices) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading terminal devices...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (devices.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <AlertCircle className="h-8 w-8 text-yellow-500" />
            <p className="text-sm text-gray-600">No terminal devices available</p>
            <Button onClick={onCancel} variant="outline">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Smart Terminal Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Payment Amount */}
          <div className="text-center">
            <p className="text-3xl font-bold">${totalAmount.toFixed(2)}</p>
            {tipAmount > 0 && (
              <p className="text-sm text-gray-600">
                (includes ${tipAmount.toFixed(2)} tip)
              </p>
            )}
          </div>

          {/* Status Icon and Message */}
          <div className="flex flex-col items-center space-y-3">
            {getStatusIcon()}
            <p className="text-center text-sm">{getStatusMessage()}</p>
          </div>

          {/* Device Selection (if multiple devices) */}
          {devices.length > 1 && paymentStatus === 'idle' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Terminal Device
              </label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full p-2 border rounded-md"
                disabled={isProcessing}
              >
                <option value="">Select a device...</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.code}>
                    {device.name} ({device.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {paymentStatus === 'idle' || paymentStatus === 'failed' ? (
              <>
                <Button
                  onClick={processPayment}
                  disabled={isProcessing || !selectedDevice}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Process Payment'
                  )}
                </Button>
                <Button
                  onClick={onCancel}
                  variant="outline"
                  disabled={isProcessing}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </>
            ) : paymentStatus === 'success' ? (
              <Button
                onClick={onCancel}
                className="w-full"
                variant="default"
              >
                Done
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => {
                    setPaymentStatus('idle');
                    setIsProcessing(false);
                  }}
                  variant="outline"
                  className="w-full"
                  disabled={paymentStatus === 'waiting'}
                >
                  {paymentStatus === 'waiting' ? 'Waiting for terminal...' : 'Cancel'}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartTerminalPayment;

