import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { NoteInput } from "@/components/ui/note-input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
// removed useLocation; handled note history locally


import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Edit, X, Save, MessageSquare, Calendar, Clock, User, Scissors, CheckCircle, AlertCircle, XCircle, DollarSign, CreditCard, Gift, FileText, Mail, UserCog, Settings, Camera } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { PermissionGuard } from "@/components/permissions/PermissionGuard";
import HelcimPayJsModal from "@/components/payment/helcim-payjs-modal";
import SmartTerminalPayment from "@/components/payment/smart-terminal-payment";
import ClientFormSubmissions from "@/components/client/client-form-submissions";
import ClientNoteHistory from "@/components/client/client-note-history";
import AppointmentPhotos from "@/components/appointments/appointment-photos";
// Removed inline photo upload UI; keep only components in use

interface AppointmentDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: number | null;
  onEdit?: (appointmentId: number) => void;
  onDelete?: (appointmentId: number) => void;
}

// Client form schema
const clientFormSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  firstName: z.string().min(1, { message: "First name is required" }).optional().or(z.literal('')),
  lastName: z.string().min(1, { message: "Last name is required" }).optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  zipCode: z.string().optional().or(z.literal(''))
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

// Service form schema
const serviceFormSchema = z.object({
  name: z.string().min(1, { message: "Service name is required" }),
  description: z.string().optional().or(z.literal('')),
  duration: z.number().min(1, { message: "Duration must be at least 1 minute" }),
  price: z.number().min(0, { message: "Price must be 0 or greater" }),
  color: z.string().optional().or(z.literal('')),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

// Staff edit removed

// Photo upload form types removed from notes card

const AppointmentDetails = ({ 
  open, 
  onOpenChange, 
  appointmentId, 
  onEdit, 
  onDelete 
}: AppointmentDetailsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);
  // Removed legacy inline notes editing state
  // no routing needed for notes/forms dialogs
  const [isProcessingCashPayment, setIsProcessingCashPayment] = useState(false);
  const [isProcessingCardPayment] = useState(false);
  const [chargeAmount, setChargeAmount] = useState<number>(0);
  const [isProcessingGiftCardPayment, setIsProcessingGiftCardPayment] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [showCardPayment, setShowCardPayment] = useState(false);
  const [showTerminalPayment, setShowTerminalPayment] = useState(false);
  // Removed terminal device selection UI; keep minimal state if needed in future
  const [giftCardCode, setGiftCardCode] = useState("");
  const [showHelcimModal, setShowHelcimModal] = useState(false);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [discountCode, setDiscountCode] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<string>("");
  const [isFormsOpen, setIsFormsOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [isEditServiceOpen, setIsEditServiceOpen] = useState(false);
  const [selectedSavedCard, setSelectedSavedCard] = useState<any>(null);
  // Staff edit dialog removed

  // Inline photo upload removed; handled by standalone AppointmentPhotos
  const [photoSectionNote, setPhotoSectionNote] = useState("");
  const [isSavingPhotoNote, setIsSavingPhotoNote] = useState(false);

  // Client edit form
  const editClientForm = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });

  // Service edit form
  const editServiceForm = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: '',
      description: '',
      duration: 60,
      price: 0,
      color: '#3B82F6',
    }
  });

  // Staff edit removed

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

  // Fetch saved payment methods for the client
  const { data: savedPaymentMethods } = useQuery({
    queryKey: ['/api/saved-payment-methods', appointment?.clientId],
    queryFn: async () => {
      if (!appointment?.clientId) return [];
      const response = await apiRequest("GET", `/api/saved-payment-methods?clientId=${appointment.clientId}`);
      return response.json();
    },
    enabled: !!appointment?.clientId
  });

  // Ensure fresh client data when opening the edit dialog
  useEffect(() => {
    if (isEditClientOpen && appointment?.clientId) {
      try {
        queryClient.invalidateQueries({ queryKey: ['/api/users', appointment.clientId] });
        queryClient.refetchQueries({ queryKey: ['/api/users', appointment.clientId] });
      } catch {}
    }
  }, [isEditClientOpen, appointment?.clientId, queryClient]);

  // Client update mutation
  const updateClientMutation = useMutation({
    mutationFn: async (data: ClientFormValues & { id: number }) => {
      const response = await apiRequest("PUT", `/api/users/${data.id}`, data);
      if (!response.ok) {
        throw new Error('Failed to update client');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', appointment?.clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users?role=client'] });
      setIsEditClientOpen(false);
      toast({
        title: "Success",
        description: "Client information updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update client information.",
        variant: "destructive",
      });
    },
  });

  // Service update mutation
  const updateServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormValues & { id: number }) => {
      const response = await apiRequest("PUT", `/api/services/${data.id}`, data);
      if (!response.ok) {
        throw new Error('Failed to update service');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services', appointment?.serviceId] });
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      setIsEditServiceOpen(false);
      toast({
        title: "Success",
        description: "Service information updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update service information.",
        variant: "destructive",
      });
    },
  });

  // Staff update removed per request

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

  const calculateFinalAmount = () => {
    const base = getAppointmentChargeAmount() || 0;
    const discounted = Math.max(0, base - (appliedDiscountCode ? discountAmount : 0));
    return discounted + (tipAmount || 0);
  };

  const handleApplyDiscount = async () => {
    const code = discountCode.trim();
    if (!code) {
      toast({ title: "Enter a code", description: "Please enter a discount code to apply.", variant: "destructive" });
      return;
    }
    setIsValidatingDiscount(true);
    try {
      const res = await apiRequest("POST", "/api/promo-codes/validate", {
        code,
        serviceId: service?.id,
        amount: getAppointmentChargeAmount() || 0,
      });
      const data = await res.json();
      if (!res.ok || !data?.valid) {
        setDiscountAmount(0);
        setAppliedDiscountCode("");
        toast({ title: "Invalid code", description: data?.message || "This discount code cannot be applied.", variant: "destructive" });
        return;
      }
      setDiscountAmount(Math.max(0, Number(data.discountAmount) || 0));
      setAppliedDiscountCode(code.toUpperCase());
      toast({ title: "Discount applied", description: `${code.toUpperCase()} applied successfully.` });
    } catch (err) {
      setDiscountAmount(0);
      setAppliedDiscountCode("");
      toast({ title: "Error", description: "Failed to validate discount code.", variant: "destructive" });
    } finally {
      setIsValidatingDiscount(false);
    }
  };

  const handleRemoveDiscount = () => {
    setDiscountCode("");
    setDiscountAmount(0);
    setAppliedDiscountCode("");
  };

  // Populate client edit form when client data changes
  useEffect(() => {
    if (client && isEditClientOpen) {
      editClientForm.reset({
        email: client.email || '',
        firstName: client.firstName || '',
        lastName: client.lastName || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        zipCode: client.zipCode || ''
      });
    }
  }, [client, isEditClientOpen, editClientForm]);

  // Populate service edit form when service data changes
  useEffect(() => {
    if (service && isEditServiceOpen) {
      editServiceForm.reset({
        name: service.name || '',
        description: service.description || '',
        duration: service.duration || 60,
        price: service.price || 0,
        color: service.color || '#3B82F6',
      });
    }
  }, [service, isEditServiceOpen, editServiceForm]);

  // Staff edit dialog removed

  // Removed legacy update notes mutation

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

  

  const handleCancel = async () => {
    if (!appointmentId) return;
    setIsCancelling(true);
    try {
      const res = await apiRequest("POST", `/api/appointments/${appointmentId}/cancel`, { reason: 'Cancelled from dashboard' });
      try { await res.json(); } catch {}
      try {
        await queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/appointments', appointmentId] });
        await queryClient.invalidateQueries({ queryKey: ['/api/cancelled-appointments'] });
      } catch {}
      toast({ title: 'Appointment Cancelled', description: 'The appointment has been moved to cancelled.' });
      onOpenChange(false);
      if (onDelete) onDelete(appointmentId);
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to cancel appointment.', variant: 'destructive' });
    } finally {
      setIsCancelling(false);
    }
  };

  // Notes edit handlers
  // Removed legacy inline notes editing handlers
  // Removed legacy save-to-profile handler

  // Inline photo helpers removed; handled by standalone AppointmentPhotos

  const handleSavePhotoSectionNote = async () => {
    if (!appointment || !client) return;
    if (!photoSectionNote.trim()) return;
    setIsSavingPhotoNote(true);
    try {
      await fetch('/api/note-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          appointmentId: appointment.id,
          noteContent: photoSectionNote,
          noteType: 'appointment',
          createdBy: 1,
          createdByRole: 'staff'
        })
      });
      try {
        await queryClient.invalidateQueries({ queryKey: [`/api/note-history/client/${client.id}`] });
      } catch {}
      toast({ title: 'Note Added', description: 'Your note was saved.' });
      setPhotoSectionNote("");
    } catch {
      toast({ title: 'Error', description: 'Failed to save note', variant: 'destructive' });
    } finally {
      setIsSavingPhotoNote(false);
    }
  };

  const handleEditClient = async (values: ClientFormValues) => {
    if (!client) return;
    
    await updateClientMutation.mutateAsync({
      ...values,
      id: client.id
    });
  };

  const handleEditService = async (values: ServiceFormValues) => {
    if (!service) return;
    
    await updateServiceMutation.mutateAsync({
      ...values,
      id: service.id
    });
  };

  // Staff edit removed

  const handleCashPayment = async () => {
    if (!appointmentId || !appointment) return;
    
    setIsProcessingCashPayment(true);
    try {
      const finalAmount = calculateFinalAmount();
      // Create a payment record for cash payment
      await apiRequest("POST", "/api/payments", {
        clientId: appointment.clientId,
        appointmentId: appointmentId,
        amount: finalAmount,
        totalAmount: finalAmount,
        discountAmount: appliedDiscountCode ? discountAmount : 0,
        discountCode: appliedDiscountCode || null,
        method: "cash",
        status: "completed"
      });

      // Update appointment payment status
      await apiRequest("PUT", `/api/appointments/${appointmentId}`, {
        ...appointment,
        paymentStatus: "paid",
        tipAmount: tipAmount || 0,
        totalAmount: finalAmount
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
    // Freeze the amount and show card payment options
    const amt = getAppointmentChargeAmount();
    console.log('[CardPayment] Freezing chargeAmount =', amt, {
      totalAmount: (appointment as any)?.totalAmount,
      servicePrice: (service as any)?.price
    });
    setChargeAmount(amt);
    setShowCardPayment(true);
    // Modal will be opened when user clicks "Pay Now" button
  };

  const handleSavedPaymentMethod = async (paymentMethod: any) => {
    // Process saved card payment directly without modal
    console.log('[SavedCardPayment] Processing with saved card:', paymentMethod);
    
    // Guard: prevent mock IDs from being used in live processing
    const isMock = (val: any) => typeof val === 'string' && /^(mock_|test_)/i.test(val);
    if (isMock(paymentMethod?.helcimCardId) || isMock(paymentMethod?.helcimCustomerId)) {
      toast({
        title: "Saved card needs updating",
        description: "This saved card was created in test mode. Please add a card again to process live payments.",
        variant: "destructive",
      });
      return;
    }

    const amt = getAppointmentChargeAmount();
    setChargeAmount(amt);
    
    // Show a loading toast
    const loadingToast = toast({
      title: "Processing Payment",
      description: `Using ${paymentMethod.cardBrand} ending in ${paymentMethod.cardLast4}...`,
      duration: 100000, // Keep it open until we dismiss it
    });
    
    try {
      // Process payment directly with saved card
      const response = await apiRequest("POST", "/api/helcim-pay/process-saved-card", {
        amount: amt,
        customerId: paymentMethod.helcimCustomerId || paymentMethod.helcimCardId,
        cardId: paymentMethod.helcimCardId,
        description: `Card payment for ${service?.name || 'Appointment'}`,
        appointmentId: appointment?.id,
        clientId: appointment?.clientId,
        tipAmount: tipAmount || 0
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to process saved card payment");
      }
      
      const paymentData = await response.json();
      console.log('[SavedCardPayment] Payment successful:', paymentData);
      
      // Update appointment as paid
      await apiRequest('PUT', `/api/appointments/${appointment?.id}`, {
        status: 'completed',
        paymentStatus: 'paid',
        tipAmount: tipAmount || 0,
        totalAmount: amt,
        paymentMethod: 'card',
        paymentReference: paymentData.paymentId
      });
      
      // Create payment record
      await apiRequest('POST', '/api/payments', {
        appointmentId: appointment?.id,
        clientId: appointment?.clientId,
        amount: amt - (tipAmount || 0),
        tipAmount: tipAmount || 0,
        totalAmount: amt,
        method: 'card',
        status: 'completed',
        type: 'appointment',
        description: `Card payment for ${service?.name || 'Appointment'}`,
        helcimPaymentId: paymentData.paymentId,
        transactionId: paymentData.transactionId
      });
      
      // Dismiss loading toast and show success
      loadingToast.dismiss();
      toast({
        title: "Payment Successful",
        description: `Payment of ${formatPrice(amt)} has been processed.`,
      });
      
      // Refresh data
      queryClient.invalidateQueries(['/api/appointments']);
      queryClient.invalidateQueries(['/api/payments']);
      
      // Reset UI states
      setShowPaymentOptions(false);
      setShowCardPayment(false);
      setChargeAmount(null);
      setTipAmount(0);
      
    } catch (error: any) {
      console.error('[SavedCardPayment] Payment error:', error);
      loadingToast.dismiss();
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment with saved card.",
        variant: "destructive"
      });
    }
  };

  // Card payment inline handlers handled inline in JSX

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
          
          // Use the complete endpoint to sync with calendar and save tip info
          try {
            const completeResponse = await fetch(`/api/terminal/complete/${appointment.id}/${paymentId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                transactionId,
                cardLast4: result.cardLast4 || result.last4,
                totalAmount: result.amount || appointment.totalAmount,
                tipAmount: result.tipAmount || 0,
                baseAmount: result.baseAmount || appointment.totalAmount
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
      const finalAmount = calculateFinalAmount();
      // Create a payment record for gift card payment
      await apiRequest("POST", "/api/payments", {
        clientId: appointment.clientId,
        appointmentId: appointmentId,
        amount: finalAmount,
        totalAmount: finalAmount,
        discountAmount: appliedDiscountCode ? discountAmount : 0,
        discountCode: appliedDiscountCode || null,
        method: "gift_card",
        status: "completed",
        notes: `Gift card payment with code: ${giftCardCode}`
      });

      // Update appointment payment status
      await apiRequest("PUT", `/api/appointments/${appointmentId}`, {
        ...appointment,
        paymentStatus: "paid",
        tipAmount: tipAmount || 0,
        totalAmount: finalAmount
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
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Staff
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {staffUser ? `${staffUser.firstName} ${staffUser.lastName}` : (staff?.user ? `${staff.user.firstName} ${staff.user.lastName}` : 'Unknown Staff')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-500" />
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Client</h3>
                </div>
                {client && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditClientOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <UserCog className="h-4 w-4" />
                    Edit Client
                  </Button>
                )}
              </div>
              {client ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Name:</span> {client.firstName} {client.lastName}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Email:</span>{' '}
                    <PermissionGuard permission="view_client_contact_info" fallback={<span className="italic text-gray-400">Hidden</span>}>
                      {client.email}
                    </PermissionGuard>
                  </p>
                  {client.phone && (
                    <p className="text-sm">
                      <span className="font-medium">Phone:</span>{' '}
                      <PermissionGuard permission="view_client_contact_info" fallback={<span className="italic text-gray-400">Hidden</span>}>
                        {client.phone}
                      </PermissionGuard>
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Scissors className="h-5 w-5 text-gray-500" />
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Service</h3>
                </div>
                {service && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditServiceOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Edit Service
                  </Button>
                )}
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

          {/* Staff Information section removed per request */}

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
                    {/* Discount Code Section */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Discount Code</div>
                      {!appliedDiscountCode ? (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter discount code"
                            value={discountCode}
                            onChange={(e) => setDiscountCode(e.target.value)}
                            className="flex-1"
                            disabled={isValidatingDiscount}
                          />
                          <Button
                            onClick={handleApplyDiscount}
                            disabled={!discountCode.trim() || isValidatingDiscount}
                            variant="outline"
                            size="sm"
                          >
                            {isValidatingDiscount ? "Validating" : "Apply"}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                          <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                            {appliedDiscountCode}: -{formatPrice(discountAmount)}
                          </span>
                          <Button onClick={handleRemoveDiscount} variant="ghost" size="sm" className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20">Remove</Button>
                        </div>
                      )}
                    </div>

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
                          <span className="ml-auto text-sm">Total: {formatPrice(calculateFinalAmount())}</span>
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
                          <>Pay {formatPrice(calculateFinalAmount())}</>
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

                        {/* Saved Payment Methods */}
                        {savedPaymentMethods && savedPaymentMethods.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Saved Payment Methods
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              Click to use your saved card (you'll need to complete the payment form)
                            </div>
                            {savedPaymentMethods.map((paymentMethod: any) => (
                              <Button
                                key={paymentMethod.id}
                                onClick={() => handleSavedPaymentMethod(paymentMethod)}
                                variant="outline"
                                className="w-full justify-start"
                              >
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4" />
                                  <span>
                                    {paymentMethod.cardBrand} ending in {paymentMethod.cardLast4}
                                  </span>
                                  {paymentMethod.isDefault && (
                                    <Badge variant="secondary" className="ml-auto text-xs">
                                      Default
                                    </Badge>
                                  )}
                                </div>
                              </Button>
                            ))}
                          </div>
                        )}
                        {/* Debug info - remove this later */}
                        {savedPaymentMethods && savedPaymentMethods.length === 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            No saved payment methods found for this client. Cards are saved during the booking process.
                          </div>
                        )}

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
                            <span>{formatPrice(calculateFinalAmount())}</span>
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
                            onClick={() => {
                              console.log('[CardPayment] Pay Now button clicked, opening modal...');
                              setShowHelcimModal(true);
                            }}
                            className="flex-1"
                          >
                            Pay Now
                          </Button>
                        </div>
                        <HelcimPayJsModal
                          open={showHelcimModal}
                          onOpenChange={(open) => {
                            setShowHelcimModal(open);
                            if (!open) {
                              setSelectedSavedCard(null); // Clear selection when modal closes
                            }
                          }}
                          amount={calculateFinalAmount()}
                          description={`Card payment for ${service?.name || 'Appointment'}`}
                          appointmentId={appointment.id}
                          clientId={appointment.clientId}
                          tipAmount={tipAmount}
                          savedCard={selectedSavedCard}
                          onSuccess={async (_response: any) => {
                            try {
                              await apiRequest('PUT', `/api/appointments/${appointment.id}`, {
                                status: 'completed',
                                paymentStatus: 'paid',
                                tipAmount: tipAmount || 0,
                                totalAmount: calculateFinalAmount()
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
                          amount={Math.max(0, (chargeAmount || getAppointmentChargeAmount()) - (appliedDiscountCode ? discountAmount : 0))}
                          tipAmount={tipAmount}
                          locationId={appointment.locationId}
                          description={`Payment for ${service?.name || 'Appointment'}`}
                          onSuccess={async (result: any) => {
                            try {
                              const finalAmount = calculateFinalAmount();
                              // First, create a pending payment record - don't mark as completed yet
                              const paymentResponse = await apiRequest("POST", "/api/payments", {
                                clientId: appointment.clientId,
                                appointmentId: appointment.id,
                                amount: finalAmount,
                                tipAmount: tipAmount || 0,
                                totalAmount: finalAmount,
                                discountAmount: appliedDiscountCode ? discountAmount : 0,
                                discountCode: appliedDiscountCode || null,
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
                                totalAmount: finalAmount
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

          {/* Notes (read-only) */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Notes</h3>
                <div className="flex items-center gap-2">
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
                </div>
              </div>
              <div>
                {appointment.notes ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{appointment.notes}</p>
                ) : (
                  <p className="text-sm text-gray-500 italic">No notes added yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Treatment Photos (standalone section) */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <Camera className="h-4 w-4" />
                <span className="text-sm font-medium">Treatment Photos</span>
              </div>
              {appointmentId && (
                <AppointmentPhotos appointmentId={appointmentId!} onPhotosUpdated={() => {}} />
              )}

              {/* Notes and Templates for Photos Section */}
              <div className="mt-4 space-y-3">
                <div className="text-sm font-medium">Add a Note</div>
                <NoteInput
                  value={photoSectionNote}
                  onChange={setPhotoSectionNote}
                  placeholder="Add a note about these photos..."
                  category="appointment"
                  showTemplateSelector={true}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSavePhotoSectionNote} disabled={isSavingPhotoNote || !photoSectionNote.trim()} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {isSavingPhotoNote ? 'Saving...' : 'Save Note'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPhotoSectionNote("")}>Clear</Button>
                </div>
              </div>
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
          
          {appointment?.status !== 'cancelled' && appointment?.paymentStatus !== 'paid' && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isCancelling}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              {isCancelling ? 'Cancelling...' : 'Cancel Appointment'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {client && (
      <Dialog open={isFormsOpen} onOpenChange={setIsFormsOpen}>
        <DialogContent className="w-[95vw] sm:max-w-5xl max-h-[85vh] overflow-y-auto">
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
          {/* Removed edit trigger from Note History dialog */}
          <ClientNoteHistory clientId={client.id} clientName={`${client.firstName} ${client.lastName}`} />
        </DialogContent>
      </Dialog>
    )}
    {client && (
      <Dialog open={isEditClientOpen} onOpenChange={setIsEditClientOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Edit Client Information
            </DialogTitle>
            <DialogDescription>
              Update {client.firstName} {client.lastName}'s information
            </DialogDescription>
          </DialogHeader>
          <Form {...editClientForm}>
            <form onSubmit={editClientForm.handleSubmit(handleEditClient)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editClientForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editClientForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editClientForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editClientForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editClientForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={editClientForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editClientForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editClientForm.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zip Code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditClientOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateClientMutation.isPending}>
                  {updateClientMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    )}
    {service && (
      <Dialog open={isEditServiceOpen} onOpenChange={setIsEditServiceOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Edit Service Information
            </DialogTitle>
            <DialogDescription>
              Update service details
            </DialogDescription>
          </DialogHeader>
          <Form {...editServiceForm}>
            <form onSubmit={editServiceForm.handleSubmit(handleEditService)} className="space-y-4">
              <FormField
                control={editServiceForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editServiceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editServiceForm.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editServiceForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editServiceForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input type="color" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditServiceOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateServiceMutation.isPending}>
                  {updateServiceMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    )}
    {/* Edit Staff dialog removed per request */}
    </>
  );
};

export default AppointmentDetails; 