import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
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
import { Card, CardContent } from "@/components/ui/card";
import { 
  Calendar, 
  Clock, 
  User, 
  Scissors, 
  DollarSign, 
  Edit, 
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
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
  const [isDeleting, setIsDeleting] = useState(false);

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

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
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

  const startTime = new Date(appointment.startTime);
  const endTime = new Date(appointment.endTime);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon(appointment.status)}
            Appointment Details
          </DialogTitle>
          <DialogDescription>
            View and manage appointment information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Payment Status */}
          <div className="flex gap-4">
            <Badge className={getStatusColor(appointment.status)}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </Badge>
            <Badge className={getPaymentStatusColor(appointment.paymentStatus)}>
              {appointment.paymentStatus.charAt(0).toUpperCase() + appointment.paymentStatus.slice(1)}
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
                      {format(startTime, "EEEE, MMMM d, yyyy")}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
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
                      {Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))} minutes
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
                  <span className="font-medium">Status:</span> {appointment.paymentStatus}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {appointment.notes && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Notes</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{appointment.notes}</p>
              </CardContent>
            </Card>
          )}
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