import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AppointmentPhotos from "./appointment-photos";
import { NoteInput } from "@/components/ui/note-input";
import { useLocation } from "wouter";
import SquarePaymentForm from "./square-payment-form";

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
import { Edit, X, Save, Trash2, MessageSquare, Calendar, Clock, User, Scissors, CheckCircle, AlertCircle, XCircle, DollarSign, CreditCard, Gift } from "lucide-react";
import { formatPrice } from "@/lib/utils";

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
  const [location, setLocation] = useLocation();
  const [isProcessingCashPayment, setIsProcessingCashPayment] = useState(false);
  const [isProcessingCardPayment, setIsProcessingCardPayment] = useState(false);
  const [isProcessingGiftCardPayment, setIsProcessingGiftCardPayment] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [showCardPayment, setShowCardPayment] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState("");

  // Fetch appointment details
  const { data: appointment, isLoading } = useQuery({
    queryKey: ['/api/appointments', appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;
      const response = await fetch(`/api/appointments/${appointmentId}`);
      if (!response.ok) throw new Error('Failed to fetch appointment');
      return response.json();
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
      const response = await fetch(`/api/services/${appointment.serviceId}`);
      if (!response.ok) throw new Error('Failed to fetch service');
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
    setShowCardPayment(true);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
            <Badge className={getPaymentStatusColor(appointment.paymentStatus || 'pending')}>
              {(appointment.paymentStatus || 'pending').charAt(0).toUpperCase() + (appointment.paymentStatus || 'pending').slice(1)}
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
                  <span className="font-medium">Amount:</span> {formatPrice(appointment.totalAmount || 0)}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Status:</span> {appointment.paymentStatus || 'pending'}
                </p>
                
                {/* Payment Options - Only show if not already paid */}
                {(appointment.paymentStatus || 'pending') !== 'paid' && (
                  <div className="pt-3 space-y-3">
                    {!showPaymentOptions ? (
                      <Button
                        onClick={() => setShowPaymentOptions(true)}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Pay {formatPrice(appointment.totalAmount || 0)}
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
                            Pay with Card (Test Mode)
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

                    {/* Square Card Payment Form */}
                    {showCardPayment && appointment && (
                      <div className="pt-4 border-t">
                        <SquarePaymentForm
                          amount={appointment.totalAmount || 0}
                          appointmentId={appointmentId!}
                          clientId={appointment.clientId}
                          onSuccess={handleCardPaymentSuccess}
                          onError={handleCardPaymentError}
                          onCancel={handleCardPaymentCancel}
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
                        onClick={() => setLocation(`/clients/${appointment?.clientId}`)}
                        className="flex items-center gap-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        View Note History
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
  );
};

export default AppointmentDetails; 