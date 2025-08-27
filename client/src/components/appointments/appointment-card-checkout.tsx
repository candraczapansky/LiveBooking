import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Calendar, User, Clock, DollarSign, Loader2, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import TipSelection from "./tip-selection";

interface AppointmentCardCheckoutProps {
  appointment: {
    id: number;
    clientId?: number;
    clientName: string;
    serviceName: string;
    staffName: string;
    startTime: Date;
    endTime: Date;
    amount: number;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    service?: {
      id: number;
      name: string;
      price: number;
      description?: string;
      duration: number;
    };
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AppointmentCardCheckout({ 
  appointment, 
  isOpen, 
  onClose, 
  onSuccess 
}: AppointmentCardCheckoutProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardExpiryMonth: '',
    cardExpiryYear: '',
    cardCVV: ''
  });

  // Calculate the base service amount with proper fallbacks
  const baseAmount = appointment.totalAmount || 
                    (appointment.service?.price && appointment.service.price > 0 ? appointment.service.price : null) || 
                    appointment.amount || 
                    0;
  
  const totalAmount = baseAmount + tipAmount;

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s/g, ''); // Remove spaces
    value = value.replace(/\D/g, ''); // Remove non-digits
    value = value.replace(/(\d{4})/g, '$1 ').trim(); // Add spaces every 4 digits
    setCardData(prev => ({ ...prev, cardNumber: value }));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    setCardData(prev => ({ ...prev, cardExpiryMonth: value.split('/')[0] || '', cardExpiryYear: value.split('/')[1] || '' }));
  };

  const handleCVVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 4);
    setCardData(prev => ({ ...prev, cardCVV: value }));
  };

  const validateForm = () => {
    if (!cardData.cardNumber.replace(/\s/g, '')) return "Card number is required";
    if (!cardData.cardExpiryMonth || !cardData.cardExpiryYear) return "Expiry date is required";
    if (!cardData.cardCVV) return "CVV is required";
    if (cardData.cardNumber.replace(/\s/g, '').length < 13) return "Invalid card number";
    if (cardData.cardCVV.length < 3) return "Invalid CVV";
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // Handle 2-digit year format (YY) - convert to 4-digit (YYYY)
    let expYear = parseInt(cardData.cardExpiryYear);
    console.log('Original expiry year:', cardData.cardExpiryYear, 'Parsed as:', expYear);
    
    if (expYear < 100) {
      // For credit card expiry dates, assume 20xx for all 2-digit years
      // This is the standard practice for credit card expiry dates
      expYear = 2000 + expYear;
      console.log('Converted 2-digit year to:', expYear);
    }
    
    const expMonth = parseInt(cardData.cardExpiryMonth);
    console.log('Expiry month:', expMonth);
    console.log('Current year:', currentYear, 'Current month:', currentMonth);
    console.log('Expiry year:', expYear, 'Expiry month:', expMonth);
    
    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      console.log('Card has expired!');
      return "Card has expired";
    }
    
    console.log('Card validation passed!');
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted!');

    const validationError = validateForm();
    console.log('Validation error:', validationError);
    
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      console.log('Starting card payment process...');
      console.log('Payment data being sent:', {
        amount: baseAmount,
        tipAmount: tipAmount,
        totalAmount: totalAmount,
        cardData: {
          cardNumber: cardData.cardNumber.replace(/\s/g, ''),
          cardExpiryMonth: cardData.cardExpiryMonth,
          cardExpiryYear: cardData.cardExpiryYear,
          cardCVV: cardData.cardCVV
        },
        type: "appointment_payment",
        appointmentId: appointment.id,
        description: `Card payment for ${appointment.serviceName} appointment`
      });

      // Direct card payment flow removed in favor of HelcimPay.js
      throw new Error("Card payments are handled via HelcimPay.js. Please use the HelcimPay modal.");

      console.log('Payment response received:', paymentResponse);
      
      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text();
        console.error('Payment API error:', errorText);
        throw new Error(`Payment failed: ${errorText}`);
      }

      // (Old success flow removed)
    } catch (error: any) {
      console.error('Card payment error:', error);
      
      // Show specific error message
      const errorMessage = error.message || 'Payment processing failed';
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Still try to update appointment status in case payment succeeded on server
      try {
        await apiRequest("PUT", `/api/appointments/${appointment.id}`, {
          paymentStatus: 'paid',
          tipAmount,
          totalAmount
        });
      } catch (updateError) {
        console.error('Failed to update appointment status:', updateError);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Card Payment - {appointment.serviceName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Appointment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Appointment Details</h3>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Client:</span>
                <span>{appointment.clientName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Date:</span>
                <span>{format(appointment.startTime, "PPP")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Time:</span>
                <span>{format(appointment.startTime, "p")} - {format(appointment.endTime, "p")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Service:</span>
                <span>{appointment.serviceName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Staff:</span>
                <span>{appointment.staffName}</span>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Payment Summary</h3>
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Service Total:</span>
                <span>{formatPrice(baseAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-2">
                <span>Tip:</span>
                <span>{formatPrice(tipAmount)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total Amount:</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Tip Selection */}
          <div className="space-y-3">
            <h4 className="text-md font-medium">Add Tip</h4>
            <TipSelection 
              serviceAmount={baseAmount}
              onTipChange={setTipAmount}
              selectedTip={tipAmount}
            />
          </div>

          {/* Success State */}
          {isSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <h4 className="text-sm font-medium text-green-800">
                    Payment Successful!
                  </h4>
                  <p className="text-sm text-green-700 mt-1">
                    Your card payment of {formatPrice(totalAmount)} has been processed successfully.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Card Payment Form */}
          {!isSuccess && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-semibold">Card Information</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={cardData.cardNumber}
                    onChange={handleCardNumberChange}
                    maxLength={19}
                    disabled={isProcessing}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input
                      id="expiry"
                      type="text"
                      placeholder="MM/YY"
                      value={`${cardData.cardExpiryMonth}${cardData.cardExpiryMonth ? '/' : ''}${cardData.cardExpiryYear}`}
                      onChange={handleExpiryChange}
                      maxLength={5}
                      disabled={isProcessing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      type="text"
                      placeholder="123"
                      value={cardData.cardCVV}
                      onChange={handleCVVChange}
                      maxLength={4}
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1"
                  onClick={() => {
                    console.log('Pay button clicked!');
                    console.log('Form data:', cardData);
                    console.log('Validation result:', validateForm());
                  }}
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Pay {formatPrice(totalAmount)}
                    </div>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 