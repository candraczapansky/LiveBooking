import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe, useElements, CardElement } from "@stripe/react-stripe-js";

import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Minus, 
  Search, 
  ShoppingCart, 
  CreditCard, 
  Trash2,
  Receipt,
  User,
  DollarSign
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Initialize Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Card element styling
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

// Payment form component
const PaymentForm = ({ total, onSuccess, onError }: { 
  total: number; 
  onSuccess: () => void; 
  onError: (error: string) => void; 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      // Create payment intent
      const response = await apiRequest("POST", "/api/create-payment-intent", {
        amount: total,
        type: "pos_payment",
        description: "Point of Sale Transaction"
      });
      const { clientSecret } = await response.json();

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        onError(error.message || 'Payment failed');
      } else if (paymentIntent.status === 'succeeded') {
        onSuccess();
      }
    } catch (error: any) {
      onError(error.message || 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 border rounded-md bg-white dark:bg-gray-800">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>
      <Button 
        type="submit" 
        disabled={!stripe || isLoading}
        className="w-full"
      >
        {isLoading ? "Processing..." : `Pay $${total.toFixed(2)}`}
      </Button>
    </form>
  );
};

type Service = {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
  category: string;
};

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  brand?: string;
  stockQuantity: number;
  imageUrl?: string;
};

type Client = {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

type CartItem = {
  item: Service | Product;
  type: 'service' | 'product';
  quantity: number;
  total: number;
};

type Transaction = {
  id: string;
  clientId?: number;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  timestamp: Date;
};

export default function PointOfSale() {
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("card");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const { toast } = useToast();

  const queryClient = useQueryClient();



  // Tax rate (8.5%)
  const TAX_RATE = 0.085;

  // Fetch services
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/services"],
  });

  // Fetch products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["/api/users"],
  });

  const clientList = (clients as any[])?.filter((user: any) => user.role === 'client') || [];

  // Process transaction mutation
  const processTransactionMutation = useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'timestamp'>) => {
      const response = await apiRequest("POST", "/api/transactions", transaction);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transaction completed",
        description: "Sale processed successfully",
      });
      clearCart();
      setIsCheckoutOpen(false);
      setCashReceived("");
      setSelectedClient(null);
    },
    onError: (error) => {
      toast({
        title: "Transaction failed",
        description: "Unable to process sale",
        variant: "destructive",
      });
    },
  });

  const addServiceToCart = (service: Service) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.type === 'service' && item.item.id === service.id);
      if (existingItem) {
        return prev.map(item =>
          item.type === 'service' && item.item.id === service.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * service.price }
            : item
        );
      } else {
        return [...prev, { item: service, type: 'service', quantity: 1, total: service.price }];
      }
    });
  };

  const addProductToCart = (product: Product) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.type === 'product' && item.item.id === product.id);
      if (existingItem) {
        return prev.map(item =>
          item.type === 'product' && item.item.id === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * product.price }
            : item
        );
      } else {
        return [...prev, { item: product, type: 'product', quantity: 1, total: product.price }];
      }
    });
  };

  const updateCartQuantity = (itemId: number, type: 'service' | 'product', newQuantity: number) => {
    if (newQuantity === 0) {
      removeFromCart(itemId, type);
      return;
    }
    
    setCart(prev =>
      prev.map(item =>
        item.item.id === itemId && item.type === type
          ? { ...item, quantity: newQuantity, total: newQuantity * item.item.price }
          : item
      )
    );
  };

  const removeFromCart = (itemId: number, type: 'service' | 'product') => {
    setCart(prev => prev.filter(item => !(item.item.id === itemId && item.type === type)));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.total, 0);
  };

  const getSubtotal = () => getCartTotal();
  const getTax = () => getSubtotal() * TAX_RATE;
  const getGrandTotal = () => getSubtotal() + getTax();

  const getChange = () => {
    if (paymentMethod === "cash" && cashReceived) {
      return parseFloat(cashReceived) - getGrandTotal();
    }
    return 0;
  };

  const processTransaction = () => {
    if (cart.length === 0) {
      toast({
        title: "Empty cart",
        description: "Please add items to cart before checkout",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === "cash") {
      const cash = parseFloat(cashReceived);
      if (!cash || cash < getGrandTotal()) {
        toast({
          title: "Insufficient payment",
          description: "Cash amount must be greater than or equal to total",
          variant: "destructive",
        });
        return;
      }
    }

    const transaction = {
      clientId: selectedClient?.id,
      items: cart,
      subtotal: getSubtotal(),
      tax: getTax(),
      total: getGrandTotal(),
      paymentMethod,
    };

    processTransactionMutation.mutate(transaction);
  };

  const filteredServices = (services as any[])?.filter((service: any) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.category.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredProducts = (products as any[])?.filter((product: any) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.brand && product.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="hidden lg:block">
        <SidebarController />
      </div>
      
      <div className="flex-1 flex flex-col lg:ml-64">
        <Header />
        
        <main className="flex-1 bg-gray-50 dark:bg-gray-900 p-2 sm:p-3 md:p-4 lg:p-6">
          <div className="w-full max-w-7xl mx-auto">
            <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 lg:gap-6 min-h-0">
              
              {/* Services Selection Panel */}
              <div className="flex-1 flex flex-col min-w-0 xl:min-w-[60%]">
                <div className="mb-3 sm:mb-4 lg:mb-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-3">
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100">Point of Sale</h1>
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant={activeTab === 'services' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('services')}
                        className="flex-1 sm:flex-none px-3 sm:px-4 text-xs sm:text-sm"
                      >
                        Services
                      </Button>
                      <Button
                        size="sm"
                        variant={activeTab === 'products' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('products')}
                        className="flex-1 sm:flex-none px-3 sm:px-4 text-xs sm:text-sm"
                      >
                        Products
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        type="search"
                        placeholder={`Search ${activeTab}...`}
                        className="pl-8 text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Services/Products Grid */}
                <div className="flex-1 min-h-0">
                  {activeTab === 'services' ? (
                    servicesLoading ? (
                      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <Card key={i} className="animate-pulse">
                            <CardContent className="p-3 sm:p-4">
                              <div className="h-4 bg-gray-200 rounded mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded mb-4"></div>
                              <div className="h-6 bg-gray-200 rounded"></div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                        {filteredServices.map((service: Service) => (
                          <Card key={service.id} className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-base sm:text-lg">{service.name}</h3>
                                <Badge variant="secondary" className="text-xs">{service.category}</Badge>
                              </div>
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                                {service.description}
                              </p>
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="text-base sm:text-lg font-bold text-primary">
                                    ${service.price.toFixed(2)}
                                  </span>
                                  <span className="text-xs sm:text-sm text-gray-500 ml-2">
                                    {service.duration}min
                                  </span>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => addServiceToCart(service)}
                                  className="flex items-center gap-1 text-xs sm:text-sm"
                                >
                                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                                  Add
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )
                  ) : (
                    productsLoading ? (
                      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <Card key={i} className="animate-pulse">
                            <CardContent className="p-3 sm:p-4">
                              <div className="h-4 bg-gray-200 rounded mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded mb-4"></div>
                              <div className="h-6 bg-gray-200 rounded"></div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
                        {filteredProducts.map((product: Product) => (
                          <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-base sm:text-lg">{product.name}</h3>
                                <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                              </div>
                              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                                {product.description}
                              </p>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-base sm:text-lg font-bold text-primary">
                                  ${product.price.toFixed(2)}
                                </span>
                                <div className="text-right">
                                  <div className="text-xs text-gray-500">Stock: {product.stockQuantity}</div>
                                  {product.brand && (
                                    <div className="text-xs text-gray-400">{product.brand}</div>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => addProductToCart(product)}
                                className="flex items-center gap-1 w-full text-xs sm:text-sm"
                                disabled={product.stockQuantity <= 0}
                              >
                                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                                {product.stockQuantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Cart Panel */}
              <div className="w-full xl:w-80 2xl:w-96 flex flex-col xl:min-w-[320px]">
                <Card className="flex-1 flex flex-col h-full xl:max-h-[calc(100vh-8rem)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Cart ({cart.length} items)
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col">
                    {/* Client Selection */}
                    <div className="mb-4">
                      <label className="text-sm font-medium mb-2 block">Customer (Optional)</label>
                      <Select value={selectedClient?.id?.toString() || "walk-in"} onValueChange={(value) => {
                        if (value === "walk-in") {
                          setSelectedClient(null);
                        } else {
                          const client = clientList.find((c: Client) => c.id.toString() === value);
                          setSelectedClient(client || null);
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                          {clientList.map((client: Client) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.firstName && client.lastName 
                                ? `${client.firstName} ${client.lastName}` 
                                : client.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator className="mb-4" />

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3 mb-4 max-h-[40vh] xl:max-h-none">
                      {cart.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>Cart is empty</p>
                          <p className="text-sm">Add services or products to get started</p>
                        </div>
                      ) : (
                        cart.map((item) => (
                          <div key={`${item.type}-${item.item.id}`} className="flex flex-col gap-2 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">{item.item.name}</h4>
                                <p className="text-xs text-gray-600 dark:text-gray-400">${item.item.price.toFixed(2)} each</p>
                                {item.type === 'service' && (
                                  <p className="text-xs text-gray-500">{(item.item as Service).duration}min</p>
                                )}
                                {item.type === 'product' && (
                                  <p className="text-xs text-gray-500">Stock: {(item.item as Product).stockQuantity}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-sm">${item.total.toFixed(2)}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCartQuantity(item.item.id, item.type, item.quantity - 1)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center text-sm">{item.quantity}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateCartQuantity(item.item.id, item.type, item.quantity + 1)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => removeFromCart(item.item.id, item.type)}
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Cart Summary */}
                    {cart.length > 0 && (
                      <>
                        <Separator className="mb-4" />
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm sm:text-base">
                            <span>Subtotal:</span>
                            <span>${getSubtotal().toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs sm:text-sm text-gray-600">
                            <span>Tax ({(TAX_RATE * 100).toFixed(1)}%):</span>
                            <span>${getTax().toFixed(2)}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-bold text-base sm:text-lg">
                            <span>Total:</span>
                            <span>${getGrandTotal().toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Button
                            className="w-full"
                            onClick={() => setIsCheckoutOpen(true)}
                            disabled={cart.length === 0}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Checkout
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={clearCart}
                          >
                            Clear Cart
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              Complete the transaction for ${getGrandTotal().toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedClient && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">
                    {selectedClient.firstName && selectedClient.lastName 
                      ? `${selectedClient.firstName} ${selectedClient.lastName}` 
                      : selectedClient.username}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Payment Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="gift_card">Gift Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === "cash" && (
              <div>
                <label className="text-sm font-medium mb-2 block">Cash Received</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                />
                {cashReceived && parseFloat(cashReceived) >= getGrandTotal() && (
                  <p className="text-sm text-green-600 mt-1">
                    Change: ${getChange().toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {paymentMethod === "card" && (
              <div>
                <label className="text-sm font-medium mb-2 block">Card Information</label>
                <Elements stripe={stripePromise}>
                  <PaymentForm
                    total={getGrandTotal()}
                    onSuccess={() => {
                      // Process transaction after successful payment
                      const transaction = {
                        clientId: selectedClient?.id,
                        items: cart,
                        subtotal: getSubtotal(),
                        tax: getTax(),
                        total: getGrandTotal(),
                        paymentMethod: "card",
                      };
                      processTransactionMutation.mutate(transaction);
                    }}
                    onError={(error) => {
                      toast({
                        title: "Payment Failed",
                        description: error,
                        variant: "destructive",
                      });
                    }}
                  />
                </Elements>
              </div>
            )}

            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Amount:</span>
                <span className="text-lg font-bold">${getGrandTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
              Cancel
            </Button>
            {paymentMethod !== "card" && (
              <Button 
                onClick={processTransaction}
                disabled={processTransactionMutation.isPending}
              >
                {processTransactionMutation.isPending ? (
                  "Processing..."
                ) : (
                  <>
                    <Receipt className="h-4 w-4 mr-2" />
                    Complete Sale
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}