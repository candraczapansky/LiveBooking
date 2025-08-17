// Example: How to add Helcim popup payment to any existing page
// This shows integration without modifying existing working code

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EnhancedPaymentForm from "@/components/payment/enhanced-payment-form";
import HelcimPaymentTest from "@/components/payment/helcim-payment-test";
import { useToast } from "@/hooks/use-toast";

// Example 1: Add to POS page without modifying existing code
export function POSHelcimIntegration() {
  const [showHelcimPayment, setShowHelcimPayment] = useState(false);
  const { toast } = useToast();

  const handlePaymentSuccess = (paymentId: string) => {
    toast({
      title: "Payment Successful",
      description: `Payment processed: ${paymentId}`,
    });
    setShowHelcimPayment(false);
    // Add any additional success logic here
  };

  return (
    <div className="space-y-4">
      {/* This can be added to any existing page */}
      <Card>
        <CardHeader>
          <CardTitle>🆕 New Helcim Popup Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setShowHelcimPayment(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Try Helcim Popup Payment
          </Button>
          
          {showHelcimPayment && (
            <div className="mt-4">
              <EnhancedPaymentForm
                amount={25.00}
                tipAmount={5.00}
                description="POS transaction with Helcim popup"
                type="pos_payment"
                onSuccess={handlePaymentSuccess}
                onError={(error) => console.error(error)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Example 2: Add to appointment page
export function AppointmentHelcimIntegration({ appointment }: { appointment: any }) {
  const [showPayment, setShowPayment] = useState(false);

  const handlePaymentSuccess = (paymentId: string) => {
    console.log("Appointment payment successful:", paymentId);
    // Update appointment status or refresh data
    setShowPayment(false);
  };

  return (
    <div className="mt-4">
      {appointment.paymentStatus !== 'paid' && (
        <div className="space-y-2">
          <Button 
            onClick={() => setShowPayment(true)}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            💳 Pay with New Helcim Popup (${appointment.totalAmount})
          </Button>
          
          {showPayment && (
            <EnhancedPaymentForm
              amount={appointment.totalAmount || 0}
              appointmentId={appointment.id}
              description={`Payment for ${appointment.serviceName}`}
              type="appointment_payment"
              onSuccess={handlePaymentSuccess}
              onError={(error) => console.error(error)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Example 3: Simple test component that can be dropped anywhere
export function SimpleHelcimTest() {
  return (
    <div className="max-w-lg mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">🧪 Helcim Popup Test</h2>
      <HelcimPaymentTest />
    </div>
  );
}

// Example 4: Gift certificate integration
export function GiftCertificateHelcimPayment({ amount }: { amount: number }) {
  const [showPayment, setShowPayment] = useState(false);

  return (
    <div>
      <Button 
        onClick={() => setShowPayment(true)}
        className="w-full"
      >
        Purchase Gift Certificate with Helcim Popup
      </Button>
      
      {showPayment && (
        <div className="mt-4">
          <EnhancedPaymentForm
            amount={amount}
            description={`Gift certificate purchase - $${amount}`}
            type="gift_certificate"
            onSuccess={(paymentId) => {
              console.log("Gift certificate payment:", paymentId);
              setShowPayment(false);
            }}
            onError={(error) => console.error(error)}
            showCashOption={false} // Only card payments for gift certificates
          />
        </div>
      )}
    </div>
  );
}

/*
INTEGRATION INSTRUCTIONS:

1. Add test component to ANY page:
   Import: import { SimpleHelcimTest } from "./HELCIM_POPUP_EXAMPLE_INTEGRATION";
   Use: <SimpleHelcimTest />

2. Add to POS page:
   Import: import { POSHelcimIntegration } from "./HELCIM_POPUP_EXAMPLE_INTEGRATION";
   Use: <POSHelcimIntegration />

3. Add to appointment forms:
   Import: import { AppointmentHelcimIntegration } from "./HELCIM_POPUP_EXAMPLE_INTEGRATION";
   Use: <AppointmentHelcimIntegration appointment={appointment} />

4. Replace existing payment forms:
   Import: import EnhancedPaymentForm from "@/components/payment/enhanced-payment-form";
   Replace old form with: <EnhancedPaymentForm {...props} />

NO EXISTING CODE NEEDS TO BE MODIFIED!
All integrations can be added alongside existing functionality.
*/
