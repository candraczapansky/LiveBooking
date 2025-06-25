import { useState } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useDocumentTitle } from "@/hooks/use-document-title";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Gift, CreditCard, DollarSign, Mail, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const giftCertificateSchema = z.object({
  amount: z.number().min(10, "Minimum amount is $10").max(1000, "Maximum amount is $1000"),
  recipientName: z.string().min(1, "Recipient name is required"),
  recipientEmail: z.string().email("Please enter a valid email address"),
  purchaserName: z.string().min(1, "Your name is required"),
  purchaserEmail: z.string().email("Please enter a valid email address"),
  message: z.string().optional(),
});

type GiftCertificateForm = z.infer<typeof giftCertificateSchema>;

const PRESET_AMOUNTS = [25, 50, 75, 100, 150, 200];

export default function GiftCertificatesPage() {
  useDocumentTitle("Gift Certificates | BeautyBook");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<GiftCertificateForm>({
    resolver: zodResolver(giftCertificateSchema),
    defaultValues: {
      amount: 0,
      recipientName: "",
      recipientEmail: "",
      purchaserName: "",
      purchaserEmail: "",
      message: "",
    },
  });

  const purchaseGiftCertificateMutation = useMutation({
    mutationFn: async (data: GiftCertificateForm) => {
      return await apiRequest("/api/gift-certificates/purchase", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Gift Certificate Purchased!",
        description: `Gift certificate code ${data.giftCard.code} has been sent to ${data.giftCard.issuedToEmail}`,
      });
      form.reset();
      setSelectedAmount(null);
      queryClient.invalidateQueries({ queryKey: ['/api/gift-cards'] });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to purchase gift certificate",
        variant: "destructive",
      });
    },
  });

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    form.setValue("amount", amount);
  };

  const handleCustomAmount = (value: string) => {
    const amount = parseFloat(value);
    if (!isNaN(amount)) {
      setSelectedAmount(amount);
      form.setValue("amount", amount);
    }
  };

  const onSubmit = async (data: GiftCertificateForm) => {
    setIsProcessing(true);
    try {
      await purchaseGiftCertificateMutation.mutateAsync(data);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Gift className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Gift Certificates
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Give the gift of beauty and relaxation with our digital gift certificates
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Purchase Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Purchase Gift Certificate
                  </CardTitle>
                  <CardDescription>
                    Create a digital gift certificate that can be used for any of our services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Amount Selection */}
                      <div className="space-y-4">
                        <FormLabel>Select Amount</FormLabel>
                        
                        {/* Preset Amounts */}
                        <div className="grid grid-cols-3 gap-3">
                          {PRESET_AMOUNTS.map((amount) => (
                            <Button
                              key={amount}
                              type="button"
                              variant={selectedAmount === amount ? "default" : "outline"}
                              onClick={() => handleAmountSelect(amount)}
                              className="h-12"
                            >
                              ${amount}
                            </Button>
                          ))}
                        </div>

                        {/* Custom Amount */}
                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Custom Amount</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                                  <Input
                                    type="number"
                                    placeholder="Enter custom amount"
                                    className="pl-10"
                                    min="10"
                                    max="1000"
                                    step="1"
                                    onChange={(e) => handleCustomAmount(e.target.value)}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Recipient Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Recipient Information
                        </h3>
                        
                        <FormField
                          control={form.control}
                          name="recipientName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Recipient Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter recipient's name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="recipientEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Recipient Email</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                                  <Input
                                    type="email"
                                    placeholder="recipient@example.com"
                                    className="pl-10"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Purchaser Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Your Information</h3>
                        
                        <FormField
                          control={form.control}
                          name="purchaserName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Your Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="purchaserEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Your Email</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                                  <Input
                                    type="email"
                                    placeholder="your@example.com"
                                    className="pl-10"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Message */}
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Personal Message (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Add a personal message for the recipient..."
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isProcessing || !selectedAmount || selectedAmount < 10}
                      >
                        {isProcessing ? "Processing..." : `Purchase Gift Certificate ${selectedAmount ? `($${selectedAmount})` : ""}`}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle>How It Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Choose Amount</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Select from preset amounts or enter a custom amount between $10-$1000
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Enter Details</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Provide recipient information and add a personal message
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Instant Delivery</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        The gift certificate is emailed instantly with a unique code
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Terms & Conditions</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• Valid for 1 year from purchase date</li>
                      <li>• Can be used for any salon service</li>
                      <li>• Non-refundable after purchase</li>
                      <li>• Cannot be exchanged for cash</li>
                      <li>• Transferable to others</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}