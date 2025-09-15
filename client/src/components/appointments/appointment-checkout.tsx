import { useState, useEffect } from "react";
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, Clock, DollarSign, CheckCircle, CreditCard, Loader2, ShoppingCart, Plus, X, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { HelcimPayModal } from "../payment/helcim-pay-modal";
import { SaveCardModal } from "../payment/save-card-modal";
import { useBusinessSettings } from "@/contexts/BusinessSettingsContext";

interface AppointmentDetails {
  id: number;
  clientId: number;
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
  // Optional enrichments from backend for add-ons checkout
  addOns?: { id: number; name: string; price: number; duration?: number }[];
  products?: { id: number; name: string; price: number; quantity: number }[];
  computedTotalAmount?: number;
}

interface AppointmentCheckoutProps {
  appointment: AppointmentDetails;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AppointmentCheckout({ 
  appointment, 
  isOpen, 
  onClose, 
  onSuccess 
}: AppointmentCheckoutProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [showHelcimPayModal, setShowHelcimPayModal] = useState(false);
  const [showSaveCardModal, setShowSaveCardModal] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<{id: number; name: string; price: number; quantity: number; isTaxable?: boolean}[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { businessSettings } = useBusinessSettings();
  
  // Debug log to verify component is loading with latest code
  useEffect(() => {
    if (isOpen) {
      console.log("[AppointmentCheckout] Component opened - Product button should be visible between Service Amount and Discount Code");
      console.log("[AppointmentCheckout] Version: 2024.1 - WITH PRODUCTS FEATURE");
    }
  }, [isOpen]);

  // Fetch latest appointment details (to include add-ons and computed total)
  const { data: apptDetails } = useQuery({
    queryKey: ['/api/appointments', appointment.id],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/appointments/${appointment.id}`);
      const data = await res.json();
      return data;
    },
    enabled: isOpen && !!appointment.id,
  });

  // Fetch saved payment methods for the client
  const { data: savedPaymentMethods, isLoading: isLoadingCards } = useQuery({
    queryKey: ['/api/saved-payment-methods', appointment.clientId],
    queryFn: async () => {
      if (!appointment.clientId) return [];
      const response = await apiRequest('GET', `/api/saved-payment-methods?clientId=${appointment.clientId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isOpen && !!appointment.clientId
  });

  // Fetch products for selection
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/products");
      if (!res.ok) return [];
      const products = await res.json();
      // Filter active products only
      return products.filter((p: any) => p.isActive && p.stockQuantity > 0);
    },
    enabled: isOpen,
  });

  // Fetch client details for payment processing
  const { data: clientData } = useQuery({
    queryKey: ['/api/clients', appointment.clientId],
    queryFn: async () => {
      if (!appointment.clientId) return null;
      const response = await apiRequest('GET', `/api/clients/${appointment.clientId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: isOpen && !!appointment.clientId
  });

  // Calculate base amount including add-ons and products so they are checked out as one
  const effectiveAddOns = Array.isArray(apptDetails?.addOns)
    ? apptDetails?.addOns
    : (Array.isArray(appointment.addOns) ? appointment.addOns : []);
  
  const addOnTotal = Array.isArray(effectiveAddOns)
    ? effectiveAddOns.reduce((sum: number, a: any) => sum + (Number(a?.price ?? 0) || 0), 0)
    : 0;
    
  // Calculate product totals and tax
  const productSubtotal = selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  const taxRate = businessSettings?.taxRate || 0.08; // Default to 8% if settings not loaded
  
  // Calculate tax on taxable products
  const productTaxAmount = selectedProducts
    .filter(p => p.isTaxable !== false) // Default to taxable if not specified
    .reduce((sum, p) => sum + (p.price * p.quantity * taxRate), 0);
  
  const productTotal = productSubtotal + productTaxAmount;
    
  const serviceOnlyAmount = (appointment.service?.price && appointment.service.price > 0 ? appointment.service.price : appointment.amount) || 0;
  const baseAmount = (Number(appointment.totalAmount) && Number(appointment.totalAmount) > 0)
    ? Number(appointment.totalAmount)
    : (Number(apptDetails?.computedTotalAmount ?? appointment.computedTotalAmount) && Number(apptDetails?.computedTotalAmount ?? appointment.computedTotalAmount) > 0)
      ? Number(apptDetails?.computedTotalAmount ?? appointment.computedTotalAmount)
      : (serviceOnlyAmount + addOnTotal);
      
  const totalAmountWithProducts = baseAmount + productTotal;

  // Discount state and helpers
  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const finalAmount = Math.max(totalAmountWithProducts - discountAmount, 0);

  const handleApplyDiscount = async () => {
    const code = discountCode.trim();
    if (!code) {
      toast({ title: "Enter a code", description: "Please enter a discount code to apply.", variant: "destructive" });
      return;
    }
    setIsApplyingDiscount(true);
    try {
      const res = await apiRequest("POST", "/api/promo-codes/validate", {
        code,
        serviceId: appointment.service?.id,
        amount: baseAmount,
      });
      const data = await res.json();
      if (!res.ok || !data?.valid) {
        setDiscountAmount(0);
        toast({ title: "Invalid code", description: data?.message || "This discount code cannot be applied.", variant: "destructive" });
        return;
      }
      setDiscountAmount(Math.max(0, Number(data.discountAmount) || 0));
      toast({ title: "Discount applied", description: `${code.toUpperCase()} applied successfully.` });
    } catch (err) {
      setDiscountAmount(0);
      toast({ title: "Error", description: "Failed to validate discount code.", variant: "destructive" });
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const handleCompleteAppointment = async () => {
    if (paymentMethod === "card" && !selectedCardId && savedPaymentMethods?.length > 0) {
      toast({
        title: "Select a payment method",
        description: "Please select a saved card or add a new one.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      if (paymentMethod === "cash") {
        // Record a cash payment and create staff earnings, then mark appointment complete
        await apiRequest("POST", "/api/confirm-cash-payment", {
          appointmentId: appointment.id,
          amount: finalAmount,
          notes: `Completed via calendar checkout${discountAmount > 0 && discountCode ? ` | Discount ${discountCode.toUpperCase()} -$${discountAmount.toFixed(2)}` : ''}`,
          ...(discountAmount > 0 && discountCode ? { discountCode: discountCode.trim(), discountAmount } : {}),
          products: selectedProducts.length > 0 ? selectedProducts : undefined,
          productTaxAmount: productTaxAmount,
          taxRate: taxRate,
        });

        // Ensure appointment is marked completed for calendar views
        await apiRequest("PUT", `/api/appointments/${appointment.id}`, {
          status: 'completed',
          paymentStatus: 'paid',
          totalAmount: finalAmount
        });

        toast({
          title: "Appointment Completed",
          description: `Appointment for ${appointment.serviceName} has been marked as completed.`,
        });

        // Invalidate related data so payroll/report pages reflect immediately
        queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
        queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
        queryClient.invalidateQueries({ queryKey: ['staff-earnings'] });
        queryClient.invalidateQueries({ queryKey: ['payroll-history'] });
        queryClient.invalidateQueries({ queryKey: ['/api/sales-history'] });
        queryClient.invalidateQueries({ queryKey: ['/api/saved-payment-methods'] });

        setIsSuccess(true);
        // Notify parent that payment succeeded for any external updates
        try { onSuccess(); } catch {}
      } else {
        // Card payment - show HelcimPay modal
        setShowHelcimPayModal(true);
      }
    } catch (error: any) {
      console.error('Error completing appointment:', error);
      toast({
        title: "Error",
        description: "Failed to complete appointment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Helcim payment success
  const handleHelcimPaymentSuccess = async (paymentData: any) => {
    try {
      console.log("[AppointmentCheckout] Helcim payment success:", paymentData);
      
      // Update appointment as paid
      await apiRequest("PUT", `/api/appointments/${appointment.id}`, {
        status: 'completed',
        paymentStatus: 'paid',
        totalAmount: finalAmount,
        paymentMethod: 'card',
        paymentReference: paymentData.paymentId
      });

      // Create payment record
      await apiRequest("POST", "/api/payments", {
        clientId: appointment.clientId,
        appointmentId: appointment.id,
        amount: baseAmount,
        tipAmount: 0,
        totalAmount: finalAmount,
        method: 'card',
        status: 'completed',
        type: 'appointment',
        description: `Card payment for ${appointment.serviceName} appointment`,
        helcimPaymentId: paymentData.paymentId,
        paymentDate: new Date(),
        products: selectedProducts.length > 0 ? selectedProducts : undefined,
        productTaxAmount: productTaxAmount,
        taxRate: taxRate,
      });

      toast({
        title: "Payment Successful",
        description: `Payment of ${formatPrice(finalAmount)} has been processed.`,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['staff-earnings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/saved-payment-methods'] });

      setShowHelcimPayModal(false);
      setIsSuccess(true);
      try { onSuccess(); } catch {}
    } catch (error) {
      console.error("[AppointmentCheckout] Error after payment:", error);
      toast({
        title: "Error",
        description: "Payment was processed but failed to update appointment. Please contact support.",
        variant: "destructive"
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full w-[95vw] max-w-2xl md:max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
            Complete Appointment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 overflow-x-hidden">
          {!isSuccess ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Client: {appointment.clientName}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {format(new Date(appointment.startTime), 'PPP')}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {format(new Date(appointment.startTime), 'p')} - {format(new Date(appointment.endTime), 'p')}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    Service: {appointment.serviceName}
                  </span>
                </div>
                {Array.isArray(effectiveAddOns) && effectiveAddOns.length > 0 && (
                  <div className="space-y-1 pl-6">
                    {effectiveAddOns.map((ao: any) => (
                      <div key={ao.id} className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="text-xs text-gray-600">Add-On: {ao.name}{ao.duration ? ` (+${ao.duration} min)` : ''} — {formatPrice(Number(ao.price) || 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    Service Amount: {formatPrice(baseAmount)}
                  </span>
                </div>
                
                {/* Products Section */}
                {selectedProducts.length > 0 && (
                  <div className="space-y-1 pl-6">
                    {selectedProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ShoppingCart className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-600">
                            {product.name} (x{product.quantity}) — {formatPrice(product.price * product.quantity)}
                            {product.isTaxable !== false && <span className="text-xs text-gray-400 ml-1">(+tax)</span>}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                          onClick={() => {
                            setSelectedProducts(prev => 
                              prev.filter(p => p.id !== product.id)
                            );
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm pt-1">
                      <span className="font-medium">Products Subtotal:</span>
                      <span>{formatPrice(productSubtotal)}</span>
                    </div>
                    {productTaxAmount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Sales Tax ({(taxRate * 100).toFixed(2)}%):</span>
                        <span>{formatPrice(productTaxAmount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span>Products Total:</span>
                      <span>{formatPrice(productTotal)}</span>
                    </div>
                  </div>
                )}
                
                {/* PRODUCT BUTTON START - THIS SHOULD ALWAYS BE VISIBLE */}
                <div className="mt-3 mb-3" style={{ marginTop: '12px', marginBottom: '12px' }}>
                  <Button
                    variant="default"
                    className="flex items-center w-full justify-center bg-primary hover:bg-primary/90"
                    onClick={() => {
                      console.log("[AppointmentCheckout] Opening product selector");
                      setShowProductSelector(true);
                    }}
                    style={{ width: '100%', padding: '8px 16px' }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" /> Add Products to Checkout
                  </Button>
                </div>
                {/* PRODUCT BUTTON END */}

                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                  <div className="md:col-span-2">
                    <Label htmlFor="discountCode" className="text-sm">Discount Code</Label>
                    <Input
                      id="discountCode"
                      placeholder="Enter code"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      disabled={isProcessing || isApplyingDiscount}
                    />
                  </div>
                  <div className="flex">
                    <Button
                      type="button"
                      onClick={handleApplyDiscount}
                      disabled={isProcessing || isApplyingDiscount}
                      className="w-full"
                    >
                      {isApplyingDiscount ? "Applying..." : "Apply"}
                    </Button>
                  </div>
                </div>

                {discountAmount > 0 && (
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Discount {discountCode ? `(${discountCode.toUpperCase()})` : ''}: -{formatPrice(discountAmount)}
                    </span>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-800 font-semibold">
                    Total Due: {formatPrice(finalAmount)}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Payment Method</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={paymentMethod === "cash" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("cash")}
                    className="flex-1"
                    disabled={isProcessing}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Cash
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === "card" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("card")}
                    className="flex-1"
                    disabled={isProcessing}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Card
                  </Button>
                </div>

                {/* Saved Cards Section */}
                {paymentMethod === "card" && (
                  <div className="space-y-2 mt-3">
                    {isLoadingCards ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-sm text-gray-600">Loading saved cards...</span>
                      </div>
                    ) : savedPaymentMethods && savedPaymentMethods.length > 0 ? (
                      <>
                        <Label className="text-sm">Select a saved card</Label>
                        <div className="space-y-2">
                          {savedPaymentMethods.map((card: any) => (
                            <div
                              key={card.id}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedCardId === card.id 
                                  ? 'border-primary bg-primary/10' 
                                  : 'border-gray-200 hover:border-primary/50'
                              }`}
                              onClick={() => setSelectedCardId(card.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4" />
                                  <span className="text-sm font-medium">
                                    {card.cardBrand} •••• {card.cardLast4}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500">
                                  Exp: {card.cardExpMonth}/{card.cardExpYear}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowSaveCardModal(true)}
                            className="w-full"
                            disabled={isProcessing}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Add New Card
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-600 mb-3">No saved cards found</p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowSaveCardModal(true)}
                          disabled={isProcessing}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Add New Card
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex space-x-2 pt-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCompleteAppointment}
                  className="flex-1"
                  disabled={isProcessing || (paymentMethod === "card" && !savedPaymentMethods?.length && !selectedCardId)}
                >
                  {isProcessing ? "Processing..." : paymentMethod === "cash" ? "Complete (Cash)" : "Process Payment"}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Successful</h3>
              <p className="text-sm text-gray-600 mb-4">
                The appointment has been successfully marked as completed and paid.
              </p>
              <Button onClick={onClose} className="mt-2">Close</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Helcim Payment Modal */}
      {showHelcimPayModal && (
        <HelcimPayModal
          open={showHelcimPayModal}
          onOpenChange={setShowHelcimPayModal}
          amount={finalAmount}
          customerId={selectedCardId ? 
            savedPaymentMethods?.find((c: any) => c.id === selectedCardId)?.helcimCustomerId :
            clientData?.helcimCustomerId
          }
          cardId={selectedCardId ? 
            savedPaymentMethods?.find((c: any) => c.id === selectedCardId)?.helcimCardId : 
            undefined
          }
          description={`Payment for ${appointment.serviceName} appointment`}
          onSuccess={handleHelcimPaymentSuccess}
          onError={(error) => {
            console.error("[AppointmentCheckout] Payment error:", error);
            toast({
              title: "Payment Failed",
              description: error.message || "Failed to process payment. Please try again.",
              variant: "destructive"
            });
          }}
        />
      )}

      {/* Save Card Modal */}
      {showSaveCardModal && clientData && (
        <SaveCardModal
          open={showSaveCardModal}
          onOpenChange={setShowSaveCardModal}
          clientId={appointment.clientId}
          customerEmail={clientData.email}
          customerName={`${clientData.firstName} ${clientData.lastName}`}
          onSaved={(cardInfo) => {
            console.log("[AppointmentCheckout] Card saved:", cardInfo);
            queryClient.invalidateQueries({ queryKey: ['/api/saved-payment-methods'] });
            setShowSaveCardModal(false);
            toast({
              title: "Card Saved",
              description: `Card ending in ${cardInfo.last4} has been saved.`
            });
          }}
        />
      )}

      {/* Product Selector Modal */}
      <Dialog open={showProductSelector} onOpenChange={setShowProductSelector}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Add Products</DialogTitle>
            <DialogDescription>
              Select products to add to this checkout
            </DialogDescription>
          </DialogHeader>
          
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              className="pl-9"
              placeholder="Search products..."
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {isLoadingProducts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading products...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No products available</p>
              </div>
            ) : (
              <div className="space-y-2">
                {products
                  .filter((product: any) => {
                    if (!productSearchQuery.trim()) return true;
                    const query = productSearchQuery.toLowerCase().trim();
                    return (
                      product.name?.toLowerCase().includes(query) ||
                      product.description?.toLowerCase().includes(query) ||
                      product.sku?.toLowerCase().includes(query) ||
                      product.barcode?.toLowerCase().includes(query) ||
                      product.category?.toLowerCase().includes(query) ||
                      product.brand?.toLowerCase().includes(query)
                    );
                  })
                  .map((product: any) => {
                  const isSelected = selectedProducts.some(p => p.id === product.id);
                  const selectedProduct = selectedProducts.find(p => p.id === product.id);
                  const quantity = selectedProduct ? selectedProduct.quantity : 0;
                  
                  return (
                    <div key={product.id} className="p-3 border rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatPrice(product.price)} 
                            {product.isTaxable !== false && <span className="text-xs">(+{(taxRate * 100).toFixed(2)}% tax)</span>} 
                            - {product.stockQuantity} in stock
                          </p>
                          {product.brand && (
                            <p className="text-xs text-muted-foreground">{product.brand}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {isSelected ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7"
                                onClick={() => {
                                  if (quantity > 1) {
                                    setSelectedProducts(prev => 
                                      prev.map(p => 
                                        p.id === product.id 
                                          ? {...p, quantity: p.quantity - 1} 
                                          : p
                                      )
                                    );
                                  } else {
                                    setSelectedProducts(prev => 
                                      prev.filter(p => p.id !== product.id)
                                    );
                                  }
                                }}
                              >
                                <span>-</span>
                              </Button>
                              <span className="w-5 text-center">{quantity}</span>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7"
                                onClick={() => {
                                  // Don't allow adding more than stock
                                  if (quantity < product.stockQuantity) {
                                    setSelectedProducts(prev => 
                                      prev.map(p => 
                                        p.id === product.id 
                                          ? {...p, quantity: p.quantity + 1} 
                                          : p
                                      )
                                    );
                                  }
                                }}
                                disabled={quantity >= product.stockQuantity}
                              >
                                <span>+</span>
                              </Button>
                            </>
                          ) : (
                            <Button 
                              variant="outline" 
                              className="text-xs h-7"
                              onClick={() => {
                                setSelectedProducts(prev => [
                                  ...prev, 
                                  {
                                    id: product.id,
                                    name: product.name,
                                    price: product.price,
                                    quantity: 1,
                                    isTaxable: product.isTaxable !== false // Default to taxable if not specified
                                  }
                                ]);
                              }}
                            >
                              Add
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-between items-center">
            <div className="text-sm">
              {selectedProducts.length > 0 ? (
                <span>Selected: {selectedProducts.reduce((sum, p) => sum + p.quantity, 0)} products</span>
              ) : (
                <span>No products selected</span>
              )}
            </div>
            <Button onClick={() => setShowProductSelector(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}