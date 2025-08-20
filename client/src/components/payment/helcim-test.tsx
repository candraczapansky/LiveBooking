import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import HelcimPay from './helcim-pay';

export default function HelcimTest() {
  const [amount, setAmount] = useState(10.00);
  const [showPayment, setShowPayment] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');

  const handleSuccess = (data: any) => {
    console.log('Payment successful:', data);
    alert('Payment successful! Check console for details.');
  };

  const handleError = (error: any) => {
    console.error('Payment failed:', error);
    alert(`Payment failed: ${error.message}`);
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Helcim Pay.js Test</h1>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (USD)</Label>
          <Input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerEmail">Customer Email (optional)</Label>
          <Input
            id="customerEmail"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerName">Customer Name (optional)</Label>
          <Input
            id="customerName"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        <Button
          onClick={() => setShowPayment(true)}
          className="w-full"
        >
          Test Payment
        </Button>
      </div>

      <HelcimPay
        open={showPayment}
        onOpenChange={setShowPayment}
        amount={amount}
        description="Test Payment"
        customerEmail={customerEmail || undefined}
        customerName={customerName || undefined}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}


