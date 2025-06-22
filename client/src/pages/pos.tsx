import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

type Service = {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
  category: string;
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
  service: Service;
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
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [cashReceived, setCashReceived] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Tax rate (8.5%)
  const TAX_RATE = 0.085;

  // Fetch services
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/services"],
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

  const addToCart = (service: Service) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.service.id === service.id);
      if (existingItem) {
        return prev.map(item =>
          item.service.id === service.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * service.price }
            : item
        );
      } else {
        return [...prev, { service, quantity: 1, total: service.price }];
      }
    });
  };

  const updateCartQuantity = (serviceId: number, newQuantity: number) => {
    if (newQuantity === 0) {
      removeFromCart(serviceId);
      return;
    }
    
    setCart(prev =>
      prev.map(item =>
        item.service.id === serviceId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.service.price }
          : item
      )
    );
  };

  const removeFromCart = (serviceId: number) => {
    setCart(prev => prev.filter(item => item.service.id !== serviceId));
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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-7xl mx-auto h-full">
            <div className="flex flex-col lg:flex-row gap-6 h-full">
              
              {/* Services Selection Panel */}
              <div className="flex-1 flex flex-col">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Point of Sale</h1>
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        type="search"
                        placeholder="Search services..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Services Grid */}
                <div className="flex-1 overflow-y-auto">
                  {servicesLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="p-4">
                            <div className="h-4 bg-gray-200 rounded mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded mb-4"></div>
                            <div className="h-6 bg-gray-200 rounded"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredServices.map((service: Service) => (
                        <Card key={service.id} className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-semibold text-lg">{service.name}</h3>
                              <Badge variant="secondary">{service.category}</Badge>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                              {service.description}
                            </p>
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="text-lg font-bold text-primary">
                                  ${service.price.toFixed(2)}
                                </span>
                                <span className="text-sm text-gray-500 ml-2">
                                  {service.duration}min
                                </span>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => addToCart(service)}
                                className="flex items-center gap-1"
                              >
                                <Plus className="h-4 w-4" />
                                Add
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Cart Panel */}
              <div className="w-full lg:w-96 flex flex-col">
                <Card className="flex-1 flex flex-col">
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
                    <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                      {cart.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>Cart is empty</p>
                          <p className="text-sm">Add services to get started</p>
                        </div>
                      ) : (
                        cart.map((item) => (
                          <div key={item.service.id} className="flex items-center gap-3 p-3 border rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-medium">{item.service.name}</h4>
                              <p className="text-sm text-gray-600">${item.service.price.toFixed(2)} each</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateCartQuantity(item.service.id, item.quantity - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateCartQuantity(item.service.id, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => removeFromCart(item.service.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">${item.total.toFixed(2)}</p>
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
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>${getSubtotal().toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Tax ({(TAX_RATE * 100).toFixed(1)}%):</span>
                            <span>${getTax().toFixed(2)}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-bold text-lg">
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
        <DialogContent className="sm:max-w-md">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}