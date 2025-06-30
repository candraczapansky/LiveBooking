import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, DollarSign, User, Mail, Phone } from "lucide-react";

type Membership = {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number;
  benefits: string;
};

type User = {
  id: number;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  role: string;
};

interface MembershipPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: Membership | null;
  client: User | null;
}

export default function MembershipPaymentDialog({
  open,
  onOpenChange,
  membership,
  client,
}: MembershipPaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card");
  const [cardToken, setCardToken] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Process membership payment
  const processPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!client || !membership) throw new Error("Missing client or membership data");

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + membership.duration);

      // First create the membership subscription
      const membershipResponse = await apiRequest("POST", "/api/client-memberships", {
        clientId: client.id,
        membershipId: membership.id,
        startDate,
        endDate,
        active: true
      });
      const membershipSubscription = await membershipResponse.json();

      // Then create and process the payment
      let paymentStatus = "pending";
      let squarePaymentId = null;

      if (paymentMethod === "card" && cardToken) {
        // Process Square payment
        try {
          const paymentResponse = await apiRequest("POST", "/api/process-square-payment", {
            sourceId: cardToken,
            amount: Math.round(membership.price * 100), // Convert to cents
            currency: "USD",
            reference_id: `membership-${membershipSubscription.id}`,
            note: `Membership payment for ${membership.name}`
          });
          const paymentResult = await paymentResponse.json();
          
          if (paymentResult.payment?.id) {
            paymentStatus = "completed";
            squarePaymentId = paymentResult.payment.id;
          }
        } catch (error) {
          console.error("Square payment failed:", error);
          paymentStatus = "failed";
        }
      } else if (paymentMethod === "cash") {
        paymentStatus = "completed";
      }

      // Create payment record
      const paymentRecordResponse = await apiRequest("POST", "/api/payments", {
        clientId: client.id,
        clientMembershipId: membershipSubscription.id,
        amount: membership.price,
        method: paymentMethod,
        status: paymentStatus,
        type: "membership",
        description: `Membership payment for ${membership.name}`,
        squarePaymentId: squarePaymentId,
        paymentDate: new Date()
      });
      const paymentRecord = await paymentRecordResponse.json();

      return { membershipSubscription, paymentRecord };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      toast({
        title: "Success",
        description: `${client?.firstName} ${client?.lastName} subscribed to ${membership?.name} and payment processed successfully`,
      });
      onOpenChange(false);
      setCardToken("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to process membership payment: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handlePaymentSubmit = () => {
    if (paymentMethod === "card" && !cardToken) {
      toast({
        title: "Error",
        description: "Please provide payment card information",
        variant: "destructive",
      });
      return;
    }
    processPaymentMutation.mutate();
  };

  const getClientName = () => {
    if (!client) return "Unknown Client";
    return client.firstName && client.lastName 
      ? `${client.firstName} ${client.lastName}`
      : client.firstName || client.lastName || client.email;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Process Membership Payment
          </DialogTitle>
          <DialogDescription>
            Complete the payment to activate the membership subscription
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client Information */}
          <div className="border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4" />
              <span className="font-medium">Client</span>
            </div>
            <p className="text-sm">{getClientName()}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              {client?.email}
            </div>
            {client?.phone && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                {client.phone}
              </div>
            )}
          </div>

          {/* Membership Information */}
          <div className="border rounded-lg p-3 bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{membership?.name}</span>
              <Badge variant="secondary">{membership?.duration} days</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{membership?.description}</p>
            <div className="flex items-center gap-1 text-lg font-bold">
              <DollarSign className="h-4 w-4" />
              {membership?.price?.toFixed(2)}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Payment Method</Label>
            <div className="flex gap-2">
              <Button
                variant={paymentMethod === "card" ? "default" : "outline"}
                size="sm"
                onClick={() => setPaymentMethod("card")}
                className="flex-1"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Credit Card
              </Button>
              <Button
                variant={paymentMethod === "cash" ? "default" : "outline"}
                size="sm"
                onClick={() => setPaymentMethod("cash")}
                className="flex-1"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Cash
              </Button>
            </div>
          </div>

          {/* Card Payment Fields */}
          {paymentMethod === "card" && (
            <div className="space-y-2">
              <Label htmlFor="card-token">Card Token (from Square SDK)</Label>
              <Input
                id="card-token"
                placeholder="Enter card token from payment form"
                value={cardToken}
                onChange={(e) => setCardToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                In production, this would be generated by Square Web SDK payment form
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={processPaymentMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handlePaymentSubmit}
            disabled={processPaymentMutation.isPending}
          >
            {processPaymentMutation.isPending ? "Processing..." : "Process Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}