import { useState } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, Clock, DollarSign, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate base amount
  const baseAmount = appointment.totalAmount || (appointment.service?.price && appointment.service.price > 0 ? appointment.service.price : appointment.amount) || 0;

  const handleCompleteAppointment = async () => {
    setIsProcessing(true);
    try {
      // Record a cash payment and create staff earnings, then mark appointment complete
      await apiRequest("POST", "/api/confirm-cash-payment", {
        appointmentId: appointment.id,
        amount: baseAmount,
        notes: 'Completed via calendar checkout'
      });

      // Ensure appointment is marked completed for calendar views
      await apiRequest("PUT", `/api/appointments/${appointment.id}`, {
        status: 'completed',
        paymentStatus: 'paid',
        totalAmount: baseAmount
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

      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
            Complete Appointment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    Amount: {formatPrice(baseAmount)}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="text-sm text-gray-600">
                <p>This will mark the appointment as completed.</p>
                <p className="mt-1">Note: Payment processing has been removed from this app.</p>
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
                  disabled={isProcessing}
                >
                  {isProcessing ? "Completing..." : "Complete Appointment"}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Appointment Completed!</h3>
              <p className="text-sm text-gray-600">
                The appointment has been successfully marked as completed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}