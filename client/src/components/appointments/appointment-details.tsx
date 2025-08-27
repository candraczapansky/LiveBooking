import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AppointmentPhotos from "./appointment-photos";
import { NoteInput } from "@/components/ui/note-input";
// removed useLocation; handled note history locally


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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Edit, X, Save, Trash2, MessageSquare, Calendar, Clock, User, Scissors, CheckCircle, AlertCircle, XCircle, DollarSign, CreditCard, Gift, FileText, Mail } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import HelcimPayJsModal from "@/components/payment/helcim-payjs-modal";
import SmartTerminalPayment from "@/components/payment/smart-terminal-payment";
import ClientFormSubmissions from "@/components/client/client-form-submissions";
import ClientNoteHistory from "@/components/client/client-note-history";

interface AppointmentDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: number | null;
  onEdit?: (appointmentId: number) => void;
  onDelete?: (appointmentId: number) => void;
}

const AppointmentDetails = ({ 
  open, 
  onOpenChange, 
  appointmentId, 
  onEdit, 
  onDelete 
}: AppointmentDetailsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState("");
  // no routing needed for notes/forms dialogs
  const [isProcessingCashPayment, setIsProcessingCashPayment] = useState(false);
  const [isProcessingCardPayment, setIsProcessingCardPayment] = useState(false);
  const [chargeAmount, setChargeAmount] = useState<number>(0);
  const [isProcessingGiftCardPayment, setIsProcessingGiftCardPayment] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [showCardPayment, setShowCardPayment] = useState(false);
  const [showTerminalPayment, setShowTerminalPayment] = useState(false);
  const [selectedTerminalDevice, setSelectedTerminalDevice] = useState<string>('');
  const [giftCardCode, setGiftCardCode] = useState("");
  const [showHelcimModal, setShowHelcimModal] = useState(false);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [isFormsOpen, setIsFormsOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  // Fetch appointment details (robust with fallback)
  const { data: appointment, isLoading } = useQuery({
    queryKey: ['/api/appointments', appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;
      try {
        const res = await apiRequest("GET", `/api/appointments/${appointmentId}?v=${Date.now()}`);
        if (res.ok) {
          return res.json();
        }
        // If not found (404), return null to show not found dialog
        if (res.status === 404) {
          return null;
        }
      } catch {}

      // Fallback: fetch all appointments and find locally
      try {
        const listRes = await apiRequest("GET", '/api/appointments');
        if (listRes.ok) {
          const list = await listRes.json();
          const found = Array.isArray(list) ? list.find((a: any) => a?.id === appointmentId) : null;
          return found || null;
        }
      } catch {}

      return null;
    },
    enabled: open && !!appointmentId
  });

  // Fetch related data
  const { data: client } = useQuery({
    queryKey: ['/api/users', appointment?.clientId],
    queryFn: async () => {
      if (!appointment?.clientId) return null;
      const response = await fetch(`/api/users/${appointment.clientId}`);
      if (!response.ok) throw new Error('Failed to fetch client');
      return response.json();
    },
    enabled: !!appointment?.clientId
  });

  const { data: service } = useQuery({
    queryKey: ['/api/services', appointment?.serviceId],
    queryFn: async () => {
      if (!appointment?.serviceId) return null;
      const response = await apiRequest("GET", `/api/services/${appointment.serviceId}?v=${Date.now()}`);
      return response.json();
    },
    enabled: !!appointment?.serviceId
  });

  const { data: staff } = useQuery({
    queryKey: ['/api/staff', appointment?.staffId],
    queryFn: async () => {
      if (!appointment?.staffId) return null;
      const response = await fetch(`/api/staff/${appointment.staffId}`);
      if (!response.ok) throw new Error('Failed to fetch staff');
      return response.json();
    },
    enabled: !!appointment?.staffId
  });

  const { data: staffUser } = useQuery({
    queryKey: ['/api/users', staff?.userId],
    queryFn: async () => {
      if (!staff?.userId) return null;
      const response = await fetch(`/api/users/${staff.userId}`);
      if (!response.ok) throw new Error('Failed to fetch staff user');
      return response.json();
    },
    enabled: !!staff?.userId
  });

  // Compute the amount to charge for this appointment
  const getAppointmentChargeAmount = () => {
    const total = Number((appointment as any)?.totalAmount ?? 0);
    if (!Number.isNaN(total) && total > 0) return total;
    const fromAppointmentService = Number((appointment as any)?.service?.price ?? 0);
    if (!Number.isNaN(fromAppointmentService) && fromAppointmentService > 0) return fromAppointmentService;
    const fallback = Number((service as any)?.price ?? 0);
    if (!Number.isNaN(fallback) && fallback > 0) return fallback;
    const fromAmount = Number((appointment as any)?.amount ?? 0);
    return Number.isNaN(fromAmount) ? 0 : fromAmount;
  };

  // Freeze amount when card payment UI is shown (must be after queries exist)
  useEffect(() => {
    if (showCardPayment) {
      const amt = getAppointmentChargeAmount();
      if (amt && amt > 0) {
        setChargeAmount(amt);
      }
    } else {
      setChargeAmount(0);
    }
  }, [showCardPayment, (appointment as any)?.totalAmount, (service as any)?.price]);

  // Update notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      if (!appointmentId) throw new Error('No appointment ID');
      return apiRequest("PUT", `/api/appointments/${appointmentId}`, {
        notes: notes || null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments', appointmentId] });
      setIsEditingNotes(false);
      toast({
        title: "Success",
        description: "Notes updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update notes.",
        variant: "destructive",
      });
    },
  });

  // Resend confirmation - SMS
  const resendSmsMutation = useMutation({
    mutationFn: async () => {
      if (!appointmentId) throw new Error('No appointment ID');
      return apiRequest("POST", `/api/appointments/${appointmentId}/resend-confirmation`, { channel: 'sms' });
    },
    onSuccess: async (res: Response) => {
      try { await res.json(); } catch {}
      toast({
        title: "SMS Sent",
        description: "Confirmation SMS has been resent.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "SMS Not Sent",
        description: error?.message || "Unable to resend SMS. Check client preferences.",
        variant: "destructive",
      });
    }
  });

  // Resend confirmation - Email
  const resendEmailMutation = useMutation({
    mutationFn: async () => {
      if (!appointmentId) throw new Error('No appointment ID');
      return apiRequest("POST", `/api/appointments/${appointmentId}/resend-confirmation`, { channel: 'email' });
    },
    onSuccess: async (res: Response) => {
      try { await res.json(); } catch {}
      toast({
        title: "Email Sent",
        description: "Confirmation email has been resent.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Email Not Sent",
        description: error?.message || "Unable to resend email. Check client preferences.",
        variant: "destructive",
      });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'unpaid': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'refunded': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const handleDelete = async () => {
    if (!appointmentId) return;
    
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/appointments/${appointmentId}`);
      toast({
        title: "Success",
        description: "Appointment deleted successfully.",
      });
      onOpenChange(false);
      if (onDelete) onDelete(appointmentId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete appointment.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartEditNotes = () => {
    setEditedNotes(appointment?.notes || "");
    setIsEditingNotes(true);
  };

  const handleCancelEditNotes = () => {
    setIsEditingNotes(false);
    setEditedNotes("");
  };

  const handleSaveNotes = async () => {
    if (!appointment) return;

    try {
      // Update appointment notes
      await updateNotesMutation.mutateAsync(editedNotes);

      // Also save to note history
      await fetch('/api/note-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: appointment.clientId,
          appointmentId: appointment.id,
          noteContent: editedNotes,
          noteType: 'appointment',
          createdBy: 1, // TODO: Get actual user ID from auth context
          createdByRole: 'staff'
        })
      });

      setIsEditingNotes(false);
      toast({
        title: "Notes Updated",
        description: "Appointment notes have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notes. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCashPayment = async () => {
    if (!appointmentId || !appointment) return;
    
    setIsProcessingCashPayment(true);
    try {
      // Create a payment record for cash payment
      await apiRequest("POST", "/api/payments", {
        clientId: appointment.clientId,
        appointmentId: appointmentId,
        amount: appointment.totalAmount || 0,
        totalAmount: appointment.totalAmount || 0,
        method: "cash",
        status: "completed"
      });

      // Update appointment payment status
      await apiRequest("PUT", `/api/appointments/${appointmentId}`, {
        ...appointment,
        paymentStatus: "paid"
      });

      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments', appointmentId] });
      // Refresh payroll/reporting immediately
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['staff-earnings'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales-history'] });
      
      toast({
        title: "Cash Payment Recorded",
        description: "Appointment marked as paid with cash.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record cash payment.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingCashPayment(false);
    }
  };

  const handleCardPayment = () => {
    // Freeze the amount and open Helcim modal immediately
    const amt = getAppointmentChargeAmount();
    console.log('[CardPayment] Freezing chargeAmount =', amt, {
      totalAmount: (appointment as any)?.totalAmount,
      servicePrice: (service as any)?.price
    });
    setChargeAmount(amt);
    setShowCardPayment(true);
    setShowHelcimModal(true);
  };

  const handleCardPaymentSuccess = () => {
    setShowCardPayment(false);
    setShowPaymentOptions(false);
    queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    queryClient.invalidateQueries({ queryKey: ['/api/appointments', appointmentId] });
    toast({
      title: "Card Payment Successful",
      description: "Payment processed successfully.",
    });
  };

  const handleCardPaymentError = (error: string) => {
    toast({
      title: "Payment Error",
      description: error,
      variant: "destructive",
    });
  };

  const handleCardPaymentCancel = () => {
    setShowCardPayment(false);
  };

  const pollForPaymentConfirmation = async (transactionId: string, paymentId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // Poll for up to 5 minutes
    
    const pollInterval = setInterval(async () => {
      attempts++;
      
      try {
        // Check terminal payment status using locationId (no device code needed)
        const response = await fetch(`/api/terminal/payment/${appointment.locationId}/${transactionId}`);
        const result = await response.json();
        
        if ((result.success || result.status === 'completed') && result.status === 'completed') {
          clearInterval(pollInterval);
          
          // Use the new complete-payment endpoint to sync with calendar
          try {
            const completeResponse = await fetch('/api/terminal/complete-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                transactionId,
                appointmentId: appointment.id,
                paymentId
              }),
            });

            const completeResult = await completeResponse.json();
            
            if (completeResult.success) {
              console.log('✅ Terminal payment completed and calendar synced successfully');
              try {
                await queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
                await queryClient.invalidateQueries({ queryKey: ['/api/appointments', appointment.id] });
                await queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
                await queryClient.invalidateQueries({ queryKey: ['staff-earnings'] });
                await queryClient.invalidateQueries({ queryKey: ['payroll-history'] });
                await queryClient.invalidateQueries({ queryKey: ['/api/sales-history'] });
              } catch {}
              
              toast({
                title: "Payment Confirmed",
                description: `Terminal payment completed. Card ending in ${result.cardLast4 || '****'}`,
              });

              onOpenChange(false);
              if (onEdit) onEdit(appointment.id);
            } else {
              throw new Error(completeResult.error || 'Failed to sync payment with calendar');
            }
          } catch (error: any) {
            console.error('Error completing terminal payment:', error);
            
            // Fallback to manual updates if the new endpoint fails
            try {
              await apiRequest("PUT", `/api/payments/${paymentId}`, {
                status: 'completed'
              });

              await apiRequest("PUT", `/api/appointments/${appointment.id}`, {
                paymentStatus: 'paid'
              });

              try {
                await queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
                await queryClient.invalidateQueries({ queryKey: ['/api/appointments', appointment.id] });
                await queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
                await queryClient.invalidateQueries({ queryKey: ['staff-earnings'] });
                await queryClient.invalidateQueries({ queryKey: ['payroll-history'] });
                await queryClient.invalidateQueries({ queryKey: ['/api/sales-history'] });
              } catch {}

              toast({
                title: "Payment Confirmed",
                description: `Terminal payment completed. Card ending in ${result.cardLast4 || '****'}`,
              });

              onOpenChange(false);
              if (onEdit) onEdit(appointment.id);
            } catch (fallbackError) {
              console.error('Fallback payment update failed:', fallbackError);
              toast({
                title: "Payment Sync Error",
                description: "Payment completed on terminal but failed to sync with calendar. Please contact support.",
                variant: "destructive",
              });
            }
          }
        } else if (result.status === 'failed' || result.status === 'cancelled') {
          clearInterval(pollInterval);
          
          // Mark payment as failed
          await apiRequest("PUT", `/api/payments/${paymentId}`, {
            status: 'failed'
          });

          toast({
            title: "Payment Failed",
            description: result.error || 'Payment failed on terminal',
            variant: "destructive",
          });
        }
        // If still pending, continue polling
      } catch (error) {
        console.error('Error checking payment status:', error);
        
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          toast({
            title: "Payment Status Check Failed",
            description: "Unable to confirm payment status. Please check manually.",
            variant: "destructive",
          });
        }
      }
    }, 5000); // Check every 5 seconds
  };

  const handleGiftCardPayment = async () => {
    if (!appointmentId || !appointment || !giftCardCode.trim()) return;
    
    setIsProcessingGiftCardPayment(true);
    try {
      // Create a payment record for gift card payment
      await apiRequest("POST", "/api/payments", {
        clientId: appointment.clientId,
        appointmentId: appointmentId,
        amount: appointment.totalAmount || 0,
        totalAmount: appointment.totalAmount || 0,
        method: "gift_card",
        status: "completed",
        notes: `Gift card payment with code: ${giftCardCode}`
      });

      // Update appointment payment status
      await apiRequest("PUT", `/api/appointments/${appointmentId}`, {
        ...appointment,
        paymentStatus: "paid"
      });

      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments', appointmentId] });
      
      toast({
        title: "Gift Card Payment Recorded",
        description: "Appointment marked as paid with gift card.",
      });
      
      // Reset gift card code
      setGiftCardCode("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record gift card payment.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingGiftCardPayment(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Loading Appointment</DialogTitle>
            <DialogDescription>
              Please wait while we load the appointment details.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!appointment) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Appointment Not Found</DialogTitle>
            <DialogDescription>
              The requested appointment could not be found.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  // Safely create Date objects with validation
  const startTime = appointment.startTime ? new Date(appointment.startTime) : new Date();
  const endTime = appointment.endTime ? new Date(appointment.endTime) : new Date();
  
  // Validate that the dates are valid
  const isValidStartTime = !isNaN(startTime.getTime());
  const isValidEndTime = !isNaN(endTime.getTime());

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-4xl md:max-w-5xl max-h-[80vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon(appointment.status || 'pending')}
            Appointment Details
          </DialogTitle>
          <DialogDescription>
            View and manage appointment information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Payment Status */}
          <div className="flex gap-4">
            <Badge className={getStatusColor(appointment.status || 'pending')}>
              {(appointment.status || 'pending').charAt(0).toUpperCase() + (appointment.status || 'pending').slice(1)}
            </Badge>
            <Badge className={getPaymentStatusColor(appointment.paymentStatus || 'unpaid')}>
              {(appointment.paymentStatus || 'unpaid').charAt(0).toUpperCase() + (appointment.paymentStatus || 'unpaid').slice(1)}
            </Badge>
          </div>

          {/* Time and Date */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {isValidStartTime ? format(startTime, "EEEE, MMMM d, yyyy") : "Date not available"}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {isValidStartTime && isValidEndTime 
                        ? `${format(startTime, "h:mm a")} - ${format(endTime, "h:mm a")}`
                        : "Time not available"
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Duration
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {isValidStartTime && isValidEndTime 
                        ? `${Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))} minutes`
                        : "Duration not available"
                      }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <User className="h-5 w-5 text-gray-500" />
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Client</h3>
              </div>
              {client ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Name:</span> {client.firstName} {client.lastName}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Email:</span> {client.email}
                  </p>
                  {client.phone && (
                    <p className="text-sm">
                      <span className="font-medium">Phone:</span> {client.phone}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Client information not available</p>
              )}
            </CardContent>
          </Card>

          {/* Service Information */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Scissors className="h-5 w-5 text-gray-500" />
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Service</h3>
              </div>
              {service ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Service:</span> {service.name}
                  </p>
                  {service.description && (
                    <p className="text-sm">
                      <span className="font-medium">Description:</span> {service.description}
                    </p>
                  )}
                  <p className="text-sm">
                    <span className="font-medium">Duration:</span> {service.duration} minutes
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Price:</span> {formatPrice(service.price || 0)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Service information not available</p>
              )}
            </CardContent>
          </Card>

          {/* Staff Information */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <User className="h-5 w-5 text-gray-500" />
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Staff Member</h3>
              </div>
              {staffUser ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Name:</span> {staffUser.firstName} {staffUser.lastName}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Email:</span> {staffUser.email}
                  </p>
                  {staff?.title && (
                    <p className="text-sm">
                      <span className="font-medium">Title:</span> {staff.title}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Staff information not available</p>
              )}
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="h-5 w-5 text-gray-500" />
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Payment</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Amount:</span> {formatPrice(getAppointmentChargeAmount())}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Status:</span> {appointment.paymentStatus || 'unpaid'}
                </p>
                
                {/* Payment Options - Only show if not already paid */}
                {(appointment.paymentStatus || 'unpaid') !== 'paid' && (
                  <div className="pt-3 space-y-3">
                    {/* Tip selection shown before choosing payment method */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Tip</div>
                      <div className="space-y-2">
                        <div className="grid grid-cols-4 gap-2">
                          {[0, 0.15, 0.18, 0.2].map((p) => (
                            <Button key={p} variant={tipAmount / (getAppointmentChargeAmount() || 1) === p ? 'default' : 'outline'} size="sm" onClick={() => setTipAmount(Math.round((getAppointmentChargeAmount() * p) * 100) / 100)}>
                              {p === 0 ? 'No Tip' : `${Math.round(p * 100)}%`}
                            </Button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Custom:</span>
                          <Input type="number" className="h-8 w-28" value={Number.isNaN(tipAmount) ? '' : tipAmount} onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)} min="0" step="0.01" />
                          <span className="ml-auto text-sm">Total: {formatPrice((getAppointmentChargeAmount() || 0) + (tipAmount || 0))}</span>
                        </div>
                      </div>
                    </div>
                    {!showPaymentOptions ? (
                      <Button
                        onClick={() => setShowPaymentOptions(true)}
                        variant="outline"
                        className="w-full"
                        disabled={getAppointmentChargeAmount() <= 0}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        {getAppointmentChargeAmount() > 0 ? (
                          <>Pay {formatPrice((getAppointmentChargeAmount() || 0) + (tipAmount || 0))}</>
                        ) : (
                          <>Calculating price…</>
                        )}
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        {/* Cash Payment */}
                        <Button
                          onClick={handleCashPayment}
                          disabled={isProcessingCashPayment}
                          variant="outline"
                          className="w-full"
                        >
                          {isProcessingCashPayment ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                              Processing...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              Pay Cash
                            </div>
                          )}
                        </Button>

                        {/* Credit/Debit Card Payment */}
                        <Button
                          onClick={handleCardPayment}
                          disabled={isProcessingCardPayment}
                          variant="outline"
                          className="w-full"
                        >
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Pay with Card
                          </div>
                        </Button>

                        {/* Smart Terminal Payment */}
                        <Button
                          onClick={() => setShowTerminalPayment(true)}
                          variant="outline"
                          className="w-full"
                        >
                          <div className="flex items-center gap-2">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                            </svg>
                            Smart Terminal
                          </div>
                        </Button>

                        {/* Gift Card Payment */}
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter gift card code"
                              value={giftCardCode}
                              onChange={(e) => setGiftCardCode(e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              onClick={handleGiftCardPayment}
                              disabled={isProcessingGiftCardPayment || !giftCardCode.trim()}
                              variant="outline"
                              size="sm"
                            >
                              {isProcessingGiftCardPayment ? (
                                <div className="flex items-center gap-1">
                                  <div className="animate-spin w-3 h-3 border-2 border-primary border-t-transparent rounded-full" />
                                  Processing
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Gift className="h-3 w-3" />
                                  Use Gift Card
                                </div>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Back Button */}
                        <Button
                          onClick={() => setShowPaymentOptions(false)}
                          variant="outline"
                          className="w-full"
                        >
                          Back
                        </Button>
                      </div>
                    )}

                    {/* Card Payment via Helcim: inline Pay Now that opens popup */}
                    {showCardPayment && appointment && (
                      <div className="space-y-4">
                        <div className="bg-muted p-4 rounded-lg">
                          <div className="flex justify-between items-center text-lg font-semibold">
                            <span>Total:</span>
                            <span>${(((chargeAmount || getAppointmentChargeAmount()) + (tipAmount || 0))).toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() => setShowCardPayment(false)}
                            className="flex-1"
                          >
                            Back
                          </Button>
                          <Button
                            onClick={() => setShowHelcimModal(true)}
                            className="flex-1"
                          >
                            Pay Now
                          </Button>
                        </div>
                        <HelcimPayJsModal
                          open={showHelcimModal}
                          onOpenChange={setShowHelcimModal}
                          amount={(chargeAmount || getAppointmentChargeAmount()) + (tipAmount || 0)}
                          description={`Card payment for ${service?.name || 'Appointment'}`}
                          appointmentId={appointment.id}
                          clientId={appointment.clientId}
                          tipAmount={tipAmount}
                          onSuccess={async (_response: any) => {
                            try {
                              await apiRequest('PUT', `/api/appointments/${appointment.id}`, {
                                status: 'completed',
                                paymentStatus: 'paid',
                                tipAmount: tipAmount || 0,
                                totalAmount: (appointment.totalAmount ?? appointment.service?.price ?? 0) + (tipAmount || 0)
                              });
                            } catch {}
                            setShowHelcimModal(false);
                            setShowCardPayment(false);
                            setShowPaymentOptions(false);
                            queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
                            queryClient.invalidateQueries({ queryKey: ['/api/appointments', appointmentId] });
                            // Also refresh payroll-related data immediately
                            queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
                            queryClient.invalidateQueries({ queryKey: ['staff-earnings'] });
                            queryClient.invalidateQueries({ queryKey: ['payroll-history'] });
                            queryClient.invalidateQueries({ queryKey: ['/api/sales-history'] });
                          }}
                          onError={() => setShowHelcimModal(false)}
                        />
                      </div>
                    )}

                    {/* Smart Terminal Payment */}
                    {showTerminalPayment && appointment && (
                      <div className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Smart Terminal Payment</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowTerminalPayment(false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <SmartTerminalPayment
                          open={showTerminalPayment}
                          onOpenChange={setShowTerminalPayment}
                          amount={chargeAmount || getAppointmentChargeAmount()}
                          tipAmount={tipAmount}
                          locationId={appointment.locationId}
                          description={`Payment for ${service?.name || 'Appointment'}`}
                          onSuccess={async (result: any) => {
                            try {
                              // First, create a pending payment record - don't mark as completed yet
                              const paymentResponse = await apiRequest("POST", "/api/payments", {
                                clientId: appointment.clientId,
                                appointmentId: appointment.id,
                                amount: (appointment.totalAmount ?? appointment.service?.price ?? 0) + (tipAmount || 0),
                                tipAmount: tipAmount || 0,
                                totalAmount: (appointment.totalAmount ?? appointment.service?.price ?? 0) + (tipAmount || 0),
                                method: 'card',
                                status: 'pending', // Start as pending until terminal confirms
                                type: 'appointment_payment',
                                description: `Terminal payment for ${service?.name || 'Appointment'}`,
                                helcimTransactionId: result.transactionId,
                                cardLast4: result.cardLast4,
                                paymentMethod: result.paymentMethod,
                                paymentDate: new Date()
                              });

                              const paymentData = await paymentResponse.json();

                              // Update appointment status to pending payment - not completed yet
                              await apiRequest("PUT", `/api/appointments/${appointment.id}`, {
                                paymentStatus: 'pending', // Keep as pending until terminal confirms
                                status: 'completed', // Service is completed but payment is pending
                                tipAmount: tipAmount || 0,
                                totalAmount: (appointment.totalAmount ?? appointment.service?.price ?? 0) + (tipAmount || 0)
                              });

                              toast({
                                title: "Payment Processing",
                                description: `Terminal payment initiated. Please complete payment on terminal.`,
                              });

                              // Start polling for payment confirmation
                              pollForPaymentConfirmation(result.transactionId, paymentData.id);
                            } catch (error: any) {
                              console.error('Error recording terminal payment:', error);
                              toast({
                                title: "Payment Recording Failed",
                                description: "Failed to record payment. Please try again.",
                                variant: "destructive",
                              });
                            }
                          }}
                          onError={(error: string) => {
                            toast({
                              title: "Terminal Payment Failed",
                              description: typeof error === 'string' ? error : (error ? String(error) : 'Unknown error'),
                              variant: "destructive",
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Notes</h3>
                <div className="flex items-center gap-2">
                  {!isEditingNotes && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsNotesOpen(true)}
                        className="flex items-center gap-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        View Note History
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsFormsOpen(true)}
                        className="flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        View Client Forms
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleStartEditNotes}
                        className="flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              {isEditingNotes ? (
                <div className="space-y-4">
                  <NoteInput
                    value={editedNotes}
                    onChange={setEditedNotes}
                    placeholder="Add notes for this appointment..."
                    category="appointment"
                    showTemplateSelector={true}
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={updateNotesMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {updateNotesMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEditNotes}
                      disabled={updateNotesMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {appointment.notes ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{appointment.notes}</p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No notes added yet</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress Photos */}
          <Card>
            <CardContent className="pt-6">
              <AppointmentPhotos 
                appointmentId={appointmentId!} 
                onPhotosUpdated={() => {
                  // Optionally refresh appointment data if needed
                }}
              />
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => resendSmsMutation.mutate()}
            disabled={resendSmsMutation.isPending}
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            {resendSmsMutation.isPending ? "Sending SMS..." : "Resend SMS"}
          </Button>
          <Button
            variant="outline"
            onClick={() => resendEmailMutation.mutate()}
            disabled={resendEmailMutation.isPending}
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            {resendEmailMutation.isPending ? "Sending Email..." : "Resend Email"}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {onEdit && (
            <Button
              onClick={() => {
                onOpenChange(false);
                onEdit(appointmentId!);
              }}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {client && (
      <Dialog open={isFormsOpen} onOpenChange={setIsFormsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Client Forms
            </DialogTitle>
            <DialogDescription>
              Forms submitted by {client.firstName} {client.lastName}
            </DialogDescription>
          </DialogHeader>
          <ClientFormSubmissions clientId={client.id} clientName={`${client.firstName} ${client.lastName}`} />
        </DialogContent>
      </Dialog>
    )}
    {client && (
      <Dialog open={isNotesOpen} onOpenChange={setIsNotesOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Note History
            </DialogTitle>
            <DialogDescription>
              Notes for {client.firstName} {client.lastName}
            </DialogDescription>
          </DialogHeader>
          <ClientNoteHistory clientId={client.id} clientName={`${client.firstName} ${client.lastName}`} />
        </DialogContent>
      </Dialog>
    )}
    </>
  );
};

export default AppointmentDetails; 