import { useState, useContext } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AuthContext } from "@/contexts/AuthProvider";
import { CreditCard, Loader2 } from "lucide-react";

interface AddPaymentMethodProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

export default function AddPaymentMethod({ open, onOpenChange, onSuccess }: AddPaymentMethodProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !user) {
      return;
    }

    setIsLoading(true);

    try {
      // Create setup intent
      const setupResponse = await apiRequest("POST", "/api/create-setup-intent", {
        clientId: user.id
      });
      const { clientSecret } = await setupResponse.json();

      // Confirm setup intent with card
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (setupIntent.status === 'succeeded') {
        // Save payment method to database
        await apiRequest("POST", "/api/save-payment-method", {
          paymentMethodId: setupIntent.payment_method,
          clientId: user.id
        });

        toast({
          title: "Success",
          description: "Payment method added successfully!",
        });

        onSuccess();
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add payment method",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Add Payment Method
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Card Information
            </label>
            <div className="border rounded-md p-3 bg-white dark:bg-gray-800">
              <CardElement options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!stripe || isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Card"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}