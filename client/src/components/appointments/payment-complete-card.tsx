import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { useToast } from '../ui/use-toast';
import { CheckCircle2, Send, Mail, MessageSquare, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface PaymentDetails {
  amount: number;
  tipAmount?: number;
  transactionId?: string;
  cardLast4?: string;
  method?: string;
  timestamp?: Date | string;
  description?: string;
}

interface PaymentCompleteCardProps {
  paymentDetails: PaymentDetails;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  onClose: () => void;
}

export default function PaymentCompleteCard({
  paymentDetails,
  clientName,
  clientEmail,
  clientPhone,
  onClose
}: PaymentCompleteCardProps) {
  const { toast } = useToast();
  const [sendingReceipt, setSendingReceipt] = useState(false);
  const [receiptType, setReceiptType] = useState<'email' | 'sms'>('email');
  const [recipient, setRecipient] = useState(clientEmail || clientPhone || '');
  const [showReceiptForm, setShowReceiptForm] = useState(false);

  const handleSendReceipt = async () => {
    if (!recipient) {
      toast({
        title: "Recipient Required",
        description: "Please enter an email address or phone number",
        variant: "destructive"
      });
      return;
    }

    setSendingReceipt(true);
    try {
      const response = await apiRequest('POST', '/api/send-receipt', {
        type: receiptType,
        recipient: recipient,
        paymentDetails: {
          amount: paymentDetails.amount,
          tipAmount: paymentDetails.tipAmount,
          transactionId: paymentDetails.transactionId,
          cardLast4: paymentDetails.cardLast4,
          last4: paymentDetails.cardLast4, // Alias for compatibility
          timestamp: paymentDetails.timestamp || new Date(),
          description: paymentDetails.description || `Payment for ${clientName}`
        }
      });

      if (response.success) {
        toast({
          title: "Receipt Sent",
          description: `Receipt has been sent via ${receiptType === 'email' ? 'email' : 'SMS'} to ${recipient}`,
        });
        setShowReceiptForm(false);
      } else {
        throw new Error(response.error || 'Failed to send receipt');
      }
    } catch (error: any) {
      console.error('Error sending receipt:', error);
      toast({
        title: "Failed to Send Receipt",
        description: error.message || 'An error occurred while sending the receipt',
        variant: "destructive"
      });
    } finally {
      setSendingReceipt(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Card className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
      
      <CardHeader>
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
          <div>
            <CardTitle className="text-green-600">Payment Complete</CardTitle>
            <CardDescription>
              Transaction processed successfully
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Payment Summary */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Amount Paid:</span>
            <span className="font-semibold">{formatPrice(paymentDetails.amount)}</span>
          </div>
          
          {paymentDetails.tipAmount && paymentDetails.tipAmount > 0 && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Service:</span>
                <span className="text-sm">{formatPrice(paymentDetails.amount - paymentDetails.tipAmount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Tip:</span>
                <span className="text-sm text-green-600">{formatPrice(paymentDetails.tipAmount)}</span>
              </div>
            </>
          )}
          
          {paymentDetails.cardLast4 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Card:</span>
              <span className="text-sm">****{paymentDetails.cardLast4}</span>
            </div>
          )}
          
          {paymentDetails.transactionId && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Transaction ID:</span>
              <span className="text-xs font-mono">{paymentDetails.transactionId}</span>
            </div>
          )}
        </div>

        {/* Receipt Options */}
        {!showReceiptForm ? (
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                setReceiptType('email');
                setRecipient(clientEmail || '');
                setShowReceiptForm(true);
              }}
              variant="outline"
              className="w-full justify-start"
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Email Receipt
            </Button>
            
            <Button
              onClick={() => {
                setReceiptType('sms');
                setRecipient(clientPhone || '');
                setShowReceiptForm(true);
              }}
              variant="outline"
              className="w-full justify-start"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Send SMS Receipt
            </Button>
            
            <Button
              onClick={onClose}
              className="w-full mt-2"
            >
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <RadioGroup value={receiptType} onValueChange={(value) => setReceiptType(value as 'email' | 'sms')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email">Email Receipt</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sms" id="sms" />
                <Label htmlFor="sms">SMS Receipt</Label>
              </div>
            </RadioGroup>
            
            <div className="space-y-2">
              <Label htmlFor="recipient">
                {receiptType === 'email' ? 'Email Address' : 'Phone Number'}
              </Label>
              <Input
                id="recipient"
                type={receiptType === 'email' ? 'email' : 'tel'}
                placeholder={receiptType === 'email' ? 'client@example.com' : '+1234567890'}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setShowReceiptForm(false)}
                variant="outline"
                className="flex-1"
                disabled={sendingReceipt}
              >
                Cancel
              </Button>
              
              <Button
                onClick={handleSendReceipt}
                className="flex-1"
                disabled={sendingReceipt || !recipient}
              >
                {sendingReceipt ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Send Receipt
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
