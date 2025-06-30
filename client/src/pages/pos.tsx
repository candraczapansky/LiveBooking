import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// Square Web SDK will be loaded via script tag

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
  DollarSign,
  Package,
  Mail,
  MessageSquare,
  Check,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";

// Square payment configuration
const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APPLICATION_ID;
const SQUARE_LOCATION_ID = import.meta.env.VITE_SQUARE_LOCATION_ID;

// Square payment form component
const PaymentForm = ({ total, onSuccess, onError }: { 
  total: number; 
  onSuccess: () => void; 
  onError: (error: string) => void; 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardElement, setCardElement] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeSquarePaymentForm();
    
    return () => {
      // Cleanup Square elements when component unmounts
      if (cardElement) {
        cardElement.destroy();
      }
    };
  }, []);

  const initializeSquarePaymentForm = async () => {
    try {
      // Dynamically load Square Web SDK if not already loaded
      if (!(window as any).Square) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://web.squarecdn.com/v1/square.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const payments = (window as any).Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
      const card = await payments.card({
        style: {
          input: {
            fontSize: '16px',
            fontFamily: '"Helvetica Neue", Arial, sans-serif'
          },
          '.input-container': {
            borderColor: '#E5E7EB',
            borderRadius: '6px'
          }
        }
      });
      await card.attach('#pos-square-card-element');
      
      setCardElement(card);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Square payment form initialization error:', err);
      setError('Failed to load payment form. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!cardElement) {
      onError('Payment form not ready. Please try again.');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await cardElement.tokenize();
      
      if (result.status === 'OK') {
        const nonce = result.token;
        
        // Process payment with Square
        const response = await apiRequest("POST", "/api/create-payment", {
          amount: total,
          sourceId: nonce,
          type: "pos_payment",
          description: "Point of Sale Transaction"
        });

        const paymentData = await response.json();
        console.log('POS Payment response:', paymentData);
        
        if (paymentData.payment || paymentData.paymentId) {
          onSuccess();
        } else {
          console.error('Unexpected payment response:', paymentData);
          throw new Error('Payment processing failed');
        }
      } else {
        const errorMessages = result.errors?.map((error: any) => error.message).join(', ') || 'Payment failed';
        onError(errorMessages);
      }
    } catch (error: any) {
      console.error('POS Payment processing error:', error);
      onError(error.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
            Payment Form Error
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
        <Button onClick={initializeSquarePaymentForm} className="w-full">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div 
        id="pos-square-card-element" 
        className="min-h-[60px] border rounded-lg p-3 bg-white"
        data-testid="card-element"
        role="textbox"
        aria-label="Credit card number"
      >
        {/* Square Card element will be mounted here */}
      </div>
      
      {isLoading && (
        <div className="flex items-center justify-center text-sm text-muted-foreground">
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
          Loading secure payment form...
        </div>
      )}
      
      <Button 
        type="submit" 
        disabled={!cardElement || isProcessing || isLoading}
        className="w-full"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
            Processing...
          </div>
        ) : (
          `Pay $${total.toFixed(2)}`
        )}
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
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    sku: "",
    price: 0,
    costPrice: 0,
    category: "",
    brand: "",
    stockQuantity: 0,
    minStockLevel: 5,
    isActive: true,
    isTaxable: true
  });
  const { toast } = useToast();

  const queryClient = useQueryClient();

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      return await apiRequest("POST", "/api/products", productData);
    },
    onSuccess: () => {
      toast({
        title: "Product created",
        description: "Product has been added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsAddProductOpen(false);
      resetProductForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const resetProductForm = () => {
    setNewProduct({
      name: "",
      description: "",
      sku: "",
      price: 0,
      costPrice: 0,
      category: "",
      brand: "",
      stockQuantity: 0,
      minStockLevel: 5,
      isActive: true,
      isTaxable: true
    });
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || newProduct.price <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }
    createProductMutation.mutate(newProduct);
  };



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

  // Send receipt email mutation
  const sendReceiptEmailMutation = useMutation({
    mutationFn: async ({ email, receiptData }: { email: string; receiptData: any }) => {
      const response = await apiRequest("POST", "/api/send-receipt-email", {
        email,
        receiptData
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Receipt sent",
        description: "Email receipt sent successfully",
      });
      setManualEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Email failed",
        description: error.message || "Failed to send email receipt",
        variant: "destructive",
      });
    },
  });

  // Send receipt SMS mutation
  const sendReceiptSMSMutation = useMutation({
    mutationFn: async ({ phone, receiptData }: { phone: string; receiptData: any }) => {
      const response = await apiRequest("POST", "/api/send-receipt-sms", {
        phone,
        receiptData
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Receipt sent",
        description: "SMS receipt sent successfully",
      });
      setManualPhone("");
    },
    onError: (error: any) => {
      toast({
        title: "SMS failed",
        description: error.message || "Failed to send SMS receipt",
        variant: "destructive",
      });
    },
  });

  // Process transaction mutation
  const processTransactionMutation = useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'timestamp'>) => {
      console.log('Processing POS transaction:', transaction);
      const response = await apiRequest("POST", "/api/transactions", transaction);
      const result = await response.json();
      console.log('POS transaction response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('POS transaction completed successfully:', data);
      
      // Store transaction details for receipt
      setLastTransaction({
        ...data,
        client: selectedClient,
        items: cart,
        subtotal: getSubtotal(),
        tax: getTax(),
        total: getGrandTotal(),
        paymentMethod,
        timestamp: new Date()
      });
      
      toast({
        title: "Transaction completed",
        description: "Sale processed successfully",
      });
      clearCart();
      setIsCheckoutOpen(false);
      setCashReceived("");
      setSelectedClient(null);
      setManualEmail("");
      setManualPhone("");
      setShowReceiptDialog(true);
    },
    onError: (error) => {
      console.error('POS transaction error:', error);
      toast({
        title: "Transaction failed",
        description: error.message || "Unable to process sale",
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
                    <div className="flex items-center gap-2">
                      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex-1 sm:flex-none">
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
                      
                      {/* Add Product Button - Mobile Only */}
                      {activeTab === 'products' && (
                        <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              size="default" 
                              variant="default" 
                              className="lg:hidden flex-shrink-0 min-w-[44px] min-h-[44px] px-3 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md flex items-center justify-center"
                            >
                              <span className="hidden min-[380px]:inline text-sm font-medium">Add</span>
                              <span className="min-[380px]:hidden text-lg">+</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[90vh] overflow-y-auto p-4">
                            <DialogHeader>
                              <DialogTitle>Add New Product</DialogTitle>
                              <DialogDescription>
                                Create a new product for your inventory
                              </DialogDescription>
                            </DialogHeader>
                            
                            <form onSubmit={handleCreateProduct} className="space-y-4">
                              <div className="grid grid-cols-1 gap-4">
                                <div>
                                  <Label htmlFor="name">Product Name *</Label>
                                  <Input
                                    id="name"
                                    value={newProduct.name}
                                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                                    placeholder="Enter product name"
                                    className="min-h-[44px]"
                                    required
                                  />
                                </div>
                                
                                <div>
                                  <Label htmlFor="description">Description</Label>
                                  <Textarea
                                    id="description"
                                    value={newProduct.description}
                                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                                    placeholder="Product description"
                                    rows={2}
                                    className="min-h-[44px]"
                                  />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label htmlFor="price">Price *</Label>
                                    <Input
                                      id="price"
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={newProduct.price}
                                      onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})}
                                      placeholder="0.00"
                                      required
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label htmlFor="costPrice">Cost Price</Label>
                                    <Input
                                      id="costPrice"
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={newProduct.costPrice}
                                      onChange={(e) => setNewProduct({...newProduct, costPrice: parseFloat(e.target.value) || 0})}
                                      placeholder="0.00"
                                    />
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label htmlFor="category">Category</Label>
                                    <Input
                                      id="category"
                                      value={newProduct.category}
                                      onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                                      placeholder="Hair Care, Skincare, etc."
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label htmlFor="brand">Brand</Label>
                                    <Input
                                      id="brand"
                                      value={newProduct.brand}
                                      onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})}
                                      placeholder="Brand name"
                                    />
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label htmlFor="stockQuantity">Stock Quantity</Label>
                                    <Input
                                      id="stockQuantity"
                                      type="number"
                                      min="0"
                                      value={newProduct.stockQuantity}
                                      onChange={(e) => setNewProduct({...newProduct, stockQuantity: parseInt(e.target.value) || 0})}
                                      placeholder="0"
                                    />
                                  </div>
                                  
                                  <div>
                                    <Label htmlFor="minStockLevel">Min Stock Level</Label>
                                    <Input
                                      id="minStockLevel"
                                      type="number"
                                      min="0"
                                      value={newProduct.minStockLevel}
                                      onChange={(e) => setNewProduct({...newProduct, minStockLevel: parseInt(e.target.value) || 0})}
                                      placeholder="5"
                                    />
                                  </div>
                                </div>
                                
                                <div>
                                  <Label htmlFor="sku">SKU</Label>
                                  <Input
                                    id="sku"
                                    value={newProduct.sku}
                                    onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                                    placeholder="Product SKU"
                                  />
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      id="isActive"
                                      checked={newProduct.isActive}
                                      onCheckedChange={(checked) => setNewProduct({...newProduct, isActive: checked})}
                                    />
                                    <Label htmlFor="isActive">Active Product</Label>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      id="isTaxable"
                                      checked={newProduct.isTaxable}
                                      onCheckedChange={(checked) => setNewProduct({...newProduct, isTaxable: checked})}
                                    />
                                    <Label htmlFor="isTaxable">Taxable</Label>
                                  </div>
                                </div>
                              </div>
                              
                              <DialogFooter className="flex flex-col gap-2 sm:flex-row">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setIsAddProductOpen(false)}
                                  className="w-full sm:w-auto min-h-[44px]"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={createProductMutation.isPending}
                                  className="w-full sm:w-auto min-h-[44px]"
                                >
                                  {createProductMutation.isPending ? "Creating..." : "Create Product"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 sm:gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        type="search"
                        placeholder={`Search ${activeTab}...`}
                        className="pl-8 text-sm min-h-[44px]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    {/* Alternative Add Product Button for smaller screens */}
                    {activeTab === 'products' && (
                      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            size="default" 
                            className="min-[380px]:hidden min-w-[44px] min-h-[44px] px-3 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg rounded-full"
                          >
                            <Plus className="h-6 w-6" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[90vh] overflow-y-auto p-4">
                          <DialogHeader>
                            <DialogTitle>Add New Product</DialogTitle>
                            <DialogDescription>
                              Create a new product for your inventory
                            </DialogDescription>
                          </DialogHeader>
                          
                          <form onSubmit={handleCreateProduct} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <Label htmlFor="name-alt">Product Name *</Label>
                                <Input
                                  id="name-alt"
                                  value={newProduct.name}
                                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                                  placeholder="Enter product name"
                                  className="min-h-[44px]"
                                  required
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor="description-alt">Description</Label>
                                <Textarea
                                  id="description-alt"
                                  value={newProduct.description}
                                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                                  placeholder="Product description"
                                  rows={2}
                                  className="min-h-[44px]"
                                />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor="price-alt">Price *</Label>
                                  <Input
                                    id="price-alt"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={newProduct.price}
                                    onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})}
                                    placeholder="0.00"
                                    className="min-h-[44px]"
                                    required
                                  />
                                </div>
                                
                                <div>
                                  <Label htmlFor="costPrice-alt">Cost Price</Label>
                                  <Input
                                    id="costPrice-alt"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={newProduct.costPrice}
                                    onChange={(e) => setNewProduct({...newProduct, costPrice: parseFloat(e.target.value) || 0})}
                                    placeholder="0.00"
                                    className="min-h-[44px]"
                                  />
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor="category-alt">Category</Label>
                                  <Input
                                    id="category-alt"
                                    value={newProduct.category}
                                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                                    placeholder="Hair Care, Skincare, etc."
                                    className="min-h-[44px]"
                                  />
                                </div>
                                
                                <div>
                                  <Label htmlFor="brand-alt">Brand</Label>
                                  <Input
                                    id="brand-alt"
                                    value={newProduct.brand}
                                    onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})}
                                    placeholder="Brand name"
                                    className="min-h-[44px]"
                                  />
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor="stockQuantity-alt">Stock Quantity</Label>
                                  <Input
                                    id="stockQuantity-alt"
                                    type="number"
                                    min="0"
                                    value={newProduct.stockQuantity}
                                    onChange={(e) => setNewProduct({...newProduct, stockQuantity: parseInt(e.target.value) || 0})}
                                    placeholder="0"
                                    className="min-h-[44px]"
                                  />
                                </div>
                                
                                <div>
                                  <Label htmlFor="minStockLevel-alt">Min Stock Level</Label>
                                  <Input
                                    id="minStockLevel-alt"
                                    type="number"
                                    min="0"
                                    value={newProduct.minStockLevel}
                                    onChange={(e) => setNewProduct({...newProduct, minStockLevel: parseInt(e.target.value) || 0})}
                                    placeholder="5"
                                    className="min-h-[44px]"
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <Label htmlFor="sku-alt">SKU</Label>
                                <Input
                                  id="sku-alt"
                                  value={newProduct.sku}
                                  onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                                  placeholder="Product SKU"
                                  className="min-h-[44px]"
                                />
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id="isActive-alt"
                                    checked={newProduct.isActive}
                                    onCheckedChange={(checked) => setNewProduct({...newProduct, isActive: checked})}
                                  />
                                  <Label htmlFor="isActive-alt">Active Product</Label>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id="isTaxable-alt"
                                    checked={newProduct.isTaxable}
                                    onCheckedChange={(checked) => setNewProduct({...newProduct, isTaxable: checked})}
                                  />
                                  <Label htmlFor="isTaxable-alt">Taxable</Label>
                                </div>
                              </div>
                            </div>
                            
                            <DialogFooter className="flex flex-col gap-2 sm:flex-row">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddProductOpen(false)}
                                className="w-full sm:w-auto min-h-[44px]"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                disabled={createProductMutation.isPending}
                                className="w-full sm:w-auto min-h-[44px]"
                              >
                                {createProductMutation.isPending ? "Creating..." : "Create Product"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
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
                      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
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
                <PaymentForm
                  total={getGrandTotal()}
                  onSuccess={() => {
                    console.log('Square payment successful, processing POS transaction...');
                    // Process transaction after successful payment
                    const transaction = {
                      clientId: selectedClient?.id,
                      items: cart,
                      subtotal: getSubtotal(),
                      tax: getTax(),
                      total: getGrandTotal(),
                      paymentMethod: "card",
                    };
                    console.log('POS transaction data:', transaction);
                    processTransactionMutation.mutate(transaction);
                  }}
                  onError={(error) => {
                    console.error('Square payment error:', error);
                    toast({
                      title: "Payment Failed",
                      description: error,
                      variant: "destructive",
                    });
                  }}
                />
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

      {/* Receipt Confirmation Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Payment Successful
            </DialogTitle>
            <DialogDescription>
              Would you like to send a receipt to the customer?
            </DialogDescription>
          </DialogHeader>

          {lastTransaction && (
            <div className="space-y-4">
              {/* Transaction Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Transaction ID:</span>
                  <span className="font-mono text-xs">{lastTransaction.transactionId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Amount:</span>
                  <span className="font-semibold">${lastTransaction.total?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Payment Method:</span>
                  <span className="capitalize">{lastTransaction.paymentMethod}</span>
                </div>
                {lastTransaction.client && (
                  <div className="flex justify-between text-sm">
                    <span>Customer:</span>
                    <span>{lastTransaction.client.firstName} {lastTransaction.client.lastName}</span>
                  </div>
                )}
              </div>

              {/* Receipt Options */}
              <div className="space-y-4">
                <p className="text-sm font-medium">Send receipt via:</p>
                
                {/* Existing Customer Contact Info */}
                {lastTransaction.client?.email && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      sendReceiptEmailMutation.mutate({
                        email: lastTransaction.client.email,
                        receiptData: lastTransaction
                      });
                    }}
                    disabled={sendReceiptEmailMutation.isPending}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {sendReceiptEmailMutation.isPending ? "Sending..." : `Email to ${lastTransaction.client.email}`}
                  </Button>
                )}

                {lastTransaction.client?.phone && lastTransaction.client.phone.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      sendReceiptSMSMutation.mutate({
                        phone: lastTransaction.client.phone,
                        receiptData: lastTransaction
                      });
                    }}
                    disabled={sendReceiptSMSMutation.isPending}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {sendReceiptSMSMutation.isPending ? "Sending..." : `SMS to ${lastTransaction.client.phone}`}
                  </Button>
                )}

                {/* Manual Input Section */}
                <div className="border-t pt-3 space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Or enter contact information:</p>
                  
                  {/* Manual Email Input */}
                  <div className="space-y-2">
                    <Label htmlFor="manual-email" className="text-sm">Email Address</Label>
                    <div className="flex gap-2">
                      <Input
                        id="manual-email"
                        type="email"
                        placeholder="customer@email.com"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (manualEmail.trim()) {
                            sendReceiptEmailMutation.mutate({
                              email: manualEmail.trim(),
                              receiptData: lastTransaction
                            });
                          }
                        }}
                        disabled={!manualEmail.trim() || sendReceiptEmailMutation.isPending}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        {sendReceiptEmailMutation.isPending ? "Sending..." : "Send"}
                      </Button>
                    </div>
                  </div>

                  {/* Manual Phone Input */}
                  <div className="space-y-2">
                    <Label htmlFor="manual-phone" className="text-sm">Phone Number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="manual-phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={manualPhone}
                        onChange={(e) => setManualPhone(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (manualPhone.trim()) {
                            sendReceiptSMSMutation.mutate({
                              phone: manualPhone.trim(),
                              receiptData: lastTransaction
                            });
                          }
                        }}
                        disabled={!manualPhone.trim() || sendReceiptSMSMutation.isPending}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        {sendReceiptSMSMutation.isPending ? "Sending..." : "Send"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReceiptDialog(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Skip Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}