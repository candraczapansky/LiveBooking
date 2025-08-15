import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, CreditCard, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { apiRequest } from '../../lib/queryClient';

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
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'checking' | 'sending' | 'waiting' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isCheckingDevices, setIsCheckingDevices] = useState(false);

  const totalAmount = amount + tipAmount;

  // Fetch available devices
  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setIsCheckingDevices(true);
      const response = await fetch('/api/helcim-smart-terminal/health');
      const healthData = await response.json();
      
      if (healthData.configured && healthData.defaultDeviceCode) {
        // Use the default UOJS device
        const device: SmartTerminalDevice = {
          id: healthData.defaultDeviceCode,
          code: healthData.defaultDeviceCode,
          name: 'UOJS Terminal',
          status: 'active',
          lastSeen: new Date().toISOString()
        };
        setDevices([device]);
        setSelectedDevice(device.code);
      } else {
        setErrorMessage('No terminal devices configured');
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      setErrorMessage('Failed to fetch terminal devices');
    } finally {
      setIsCheckingDevices(false);
    }
  };

  const checkDeviceReadiness = async (deviceCode: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/helcim-smart-terminal/devices/${deviceCode}/check-readiness`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      return data.success || false;
    } catch (error) {
      console.error('Error checking device readiness:', error);
      return false;
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
    setPaymentStatus('checking');
    setErrorMessage('');

    try {
      // Check device readiness
      console.log('Checking device readiness...');
      const isReady = await checkDeviceReadiness(selectedDevice);
      
      if (!isReady) {
        throw new Error('Terminal device is not ready. Please ensure it is powered on and connected.');
      }

      // Send payment to terminal
      setPaymentStatus('sending');
      console.log('Sending payment to terminal...');
      
      const response = await fetch(`/api/helcim-smart-terminal/devices/${selectedDevice}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: totalAmount,
          tipAmount: tipAmount,
          currency: 'CAD',
          appointmentId,
          clientId,
          // Don't send invoice number - let backend generate unique one
          customerCode: clientId ? `CLIENT-${clientId}` : undefined
        })
      });

      const data = await response.json();
      
      if (response.ok || response.status === 202) {
        setPaymentStatus('waiting');
        
        // Show success message
        toast({
          title: "Payment Sent",
          description: "Please complete the payment on the terminal device"
        });

        // Show success immediately since payment is recorded
        setPaymentStatus('success');
        
        // Call success callback with payment data from server
        const paymentData = {
          paymentId: data.paymentRecord?.id || data.purchase?.id || `terminal_${Date.now()}`,
          amount: totalAmount,
          method: 'helcim_terminal',
          status: 'completed',
          deviceCode: selectedDevice,
          paymentRecord: data.paymentRecord
        };
        
        console.log('Helcim payment completed, calling onSuccess with:', paymentData);
        
        toast({
          title: "Payment Successful",
          description: `Payment of $${totalAmount.toFixed(2)} has been recorded. Complete on terminal.`
        });
        
        // Call success callback immediately
        onSuccess(paymentData);
        
        // Auto-close after a short delay
        setTimeout(() => {
          onCancel();
        }, 2000);
      } else {
        throw new Error(data.error || 'Payment failed');
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
    } finally {
      if (paymentStatus !== 'success') {
        setIsProcessing(false);
      }
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'checking':
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
      case 'checking':
        return 'Checking device status...';
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
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartTerminalPayment;

