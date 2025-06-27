import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
// Square Web SDK for payment processing

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Star,
  StarOff
} from "lucide-react";

// Square payment configuration
const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APPLICATION_ID;

interface SavedPaymentMethod {
  id: number;
  clientId: number;
  squareCardId: string;
  cardBrand: string;
  cardLast4: string;
  cardExpMonth: number;
  cardExpYear: number;
  isDefault: boolean;
  createdAt: string;
}

interface ClientPaymentMethodsProps {
  clientId: number;
  clientName: string;
}

const AddCardForm = ({ clientId, onSuccess, onCancel }: { 
  clientId: number; 
  onSuccess: () => void; 
  onCancel: () => void; 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);

    try {
      // Create setup intent
      const setupResponse = await apiRequest("POST", "/api/create-setup-intent", {
        clientId: clientId
      });
      const { clientSecret } = await setupResponse.json();

      // Confirm setup intent with card element
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (setupIntent && setupIntent.payment_method) {
        // Save payment method to database
        await apiRequest("POST", "/api/save-payment-method", {
          paymentMethodId: setupIntent.payment_method,
          clientId: clientId
        });

        toast({
          title: "Success",
          description: "Payment method added successfully",
        });
        onSuccess();
      }
    } catch (error: any) {
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
                iconColor: '#666EE8',
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>
      
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || isLoading}>
          {isLoading ? "Adding..." : "Add Card"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default function ClientPaymentMethods({ clientId, clientName }: ClientPaymentMethodsProps) {
  const [showAddCard, setShowAddCard] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: paymentMethods, isLoading } = useQuery({
    queryKey: ['/api/clients', clientId, 'payment-methods'],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/clients/${clientId}/payment-methods`);
      return response.json();
    },
  });

  const deleteMethodMutation = useMutation({
    mutationFn: async (methodId: number) => {
      const response = await apiRequest("DELETE", `/api/payment-methods/${methodId}`);
      if (!response.ok) {
        throw new Error('Failed to delete payment method');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'payment-methods'] });
      toast({
        title: "Success",
        description: "Payment method removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove payment method",
        variant: "destructive",
      });
    }
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (methodId: number) => {
      const response = await apiRequest("PUT", `/api/payment-methods/${methodId}/set-default`);
      if (!response.ok) {
        throw new Error('Failed to set default payment method');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'payment-methods'] });
      toast({
        title: "Success",
        description: "Default payment method updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update default payment method",
        variant: "destructive",
      });
    }
  });

  const handleDeleteMethod = (methodId: number) => {
    if (confirm('Are you sure you want to remove this payment method?')) {
      deleteMethodMutation.mutate(methodId);
    }
  };

  const handleSetDefault = (methodId: number) => {
    setDefaultMutation.mutate(methodId);
  };

  const getCardIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      default:
        return '💳';
    }
  };

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <Button
              onClick={() => setShowAddCard(true)}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!paymentMethods || paymentMethods.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No payment methods saved</p>
              <p className="text-xs mt-1">Add a card to make payments faster</p>
            </div>
          ) : (
            paymentMethods.map((method: SavedPaymentMethod) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{getCardIcon(method.cardBrand)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatCardBrand(method.cardBrand)} •••• {method.cardLast4}
                      </span>
                      {method.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Expires {method.cardExpMonth.toString().padStart(2, '0')}/{method.cardExpYear}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!method.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(method.id)}
                      disabled={setDefaultMutation.isPending}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteMethod(method.id)}
                    disabled={deleteMethodMutation.isPending}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Add Card Dialog */}
      <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Add a new payment card for {clientName}
            </DialogDescription>
          </DialogHeader>
          
          <Elements stripe={stripePromise}>
            <AddCardForm
              clientId={clientId}
              onSuccess={() => {
                setShowAddCard(false);
                queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'payment-methods'] });
              }}
              onCancel={() => setShowAddCard(false)}
            />
          </Elements>
        </DialogContent>
      </Dialog>
    </>
  );
}