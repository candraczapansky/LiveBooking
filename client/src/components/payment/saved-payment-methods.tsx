import { useState, useContext, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AuthContext } from "@/App";
import { CreditCard, Plus, Trash2, Star } from "lucide-react";
import AddPaymentMethod from "./add-payment-method";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface SavedPaymentMethod {
  id: number;
  clientId: number;
  stripePaymentMethodId: string;
  cardBrand: string;
  cardLast4: string;
  cardExpMonth: number;
  cardExpYear: number;
  isDefault: boolean;
  createdAt: string;
}

export default function SavedPaymentMethods() {
  const [showAddCard, setShowAddCard] = useState(false);
  const { user } = useContext(AuthContext);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: savedMethods, isLoading } = useQuery({
    queryKey: ['/api/saved-payment-methods', user?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/saved-payment-methods?clientId=${user?.id}`);
      return response.json();
    },
    enabled: !!user?.id
  });

  const deleteMethodMutation = useMutation({
    mutationFn: async (methodId: number) => {
      const response = await apiRequest("DELETE", `/api/saved-payment-methods/${methodId}`);
      if (!response.ok) {
        throw new Error('Failed to delete payment method');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-payment-methods'] });
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
    mutationFn: async ({ methodId, clientId }: { methodId: number; clientId: number }) => {
      const response = await apiRequest("PUT", `/api/saved-payment-methods/${methodId}/default`, {
        clientId
      });
      if (!response.ok) {
        throw new Error('Failed to set default payment method');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-payment-methods'] });
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
    if (user?.id) {
      setDefaultMutation.mutate({ methodId, clientId: user.id });
    }
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
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!savedMethods || savedMethods.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No payment methods saved</p>
              <p className="text-xs mt-1">Add a card to make payments faster</p>
            </div>
          ) : (
            savedMethods.map((method: SavedPaymentMethod) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{getCardIcon(method.cardBrand)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">
                        {method.cardBrand} ••••{method.cardLast4}
                      </span>
                      {method.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
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
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(method.id)}
                      disabled={setDefaultMutation.isPending}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="outline"
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

      <Elements stripe={stripePromise}>
        <AddPaymentMethod
          open={showAddCard}
          onOpenChange={setShowAddCard}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/saved-payment-methods'] });
          }}
        />
      </Elements>
    </>
  );
}