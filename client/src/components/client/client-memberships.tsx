import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatPrice } from "@/lib/utils";
import { 
  CreditCard, 
  Calendar, 
  Clock, 
  RefreshCw,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Package,
  Coins
} from "lucide-react";
import MembershipSubscriptionDialog from "@/components/memberships/membership-subscription-dialog";
import MembershipEditDialog from "./membership-edit-dialog";

interface ClientMembershipsProps {
  clientId: number;
  clientName: string;
}

interface ClientMembership {
  id: number;
  clientId: number;
  membershipId: number;
  startDate: string;
  endDate: string;
  active: boolean;
  autoRenew: boolean;
  renewalDay?: number;
  paymentMethodId?: string;
  membership: {
    id: number;
    name: string;
    description: string;
    price: number;
    duration: number;
    benefits: string;
  };
}

interface Membership {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number;
  benefits: string;
  includedServices?: number[];
  credits?: number;
}

interface Service {
  id: number;
  name: string;
  price: number;
  duration: number;
  description: string;
}

export default function ClientMemberships({ clientId, clientName }: ClientMembershipsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMembership, setEditingMembership] = useState<ClientMembership | null>(null);

  // Fetch client's memberships
  const { data: memberships, isLoading: isLoadingMemberships } = useQuery<ClientMembership[]>({
    queryKey: ['/api/client-memberships', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/client-memberships?clientId=${clientId}`);
      if (!response.ok) throw new Error('Failed to fetch client memberships');
      return response.json();
    },
  });

  // Fetch all available memberships for adding new ones
  const { data: availableMemberships } = useQuery<Membership[]>({
    queryKey: ['/api/memberships'],
    queryFn: async () => {
      const response = await fetch('/api/memberships');
      if (!response.ok) throw new Error('Failed to fetch available memberships');
      return response.json();
    },
  });

  // Fetch all services to display names of included services
  const { data: services } = useQuery<Service[]>({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const response = await fetch('/api/services');
      if (!response.ok) throw new Error('Failed to fetch services');
      return response.json();
    },
  });

  // Toggle auto-renewal mutation
  const toggleAutoRenewalMutation = useMutation({
    mutationFn: async ({ membershipId, autoRenew }: { membershipId: number; autoRenew: boolean }) => {
      return apiRequest("PUT", `/api/client-memberships/${membershipId}`, { autoRenew });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-memberships'] });
      toast({
        title: "Success",
        description: "Auto-renewal setting updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update auto-renewal",
        variant: "destructive",
      });
    },
  });

  // Cancel membership mutation
  const cancelMembershipMutation = useMutation({
    mutationFn: async (membershipId: number) => {
      return apiRequest("DELETE", `/api/client-memberships/${membershipId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-memberships'] });
      toast({
        title: "Success",
        description: "Membership cancelled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel membership",
        variant: "destructive",
      });
    },
  });

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (membership: ClientMembership) => {
    if (!membership.active) return "secondary";
    const daysRemaining = getDaysRemaining(membership.endDate);
    if (daysRemaining <= 7) return "destructive";
    if (daysRemaining <= 30) return "warning";
    return "default";
  };

  const getStatusText = (membership: ClientMembership) => {
    if (!membership.active) return "Inactive";
    const daysRemaining = getDaysRemaining(membership.endDate);
    if (daysRemaining <= 0) return "Expired";
    if (daysRemaining <= 7) return `Expires in ${daysRemaining} days`;
    if (daysRemaining <= 30) return `${daysRemaining} days left`;
    return "Active";
  };

  if (isLoadingMemberships) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Memberships
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeMemberships = memberships?.filter(m => m.active) || [];
  const inactiveMemberships = memberships?.filter(m => !m.active) || [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Memberships
            </CardTitle>
            {availableMemberships && availableMemberships.length > 0 && (
              <Button
                size="sm"
                onClick={() => {
                  // Open a simple selection dialog or use the first available membership
                  if (availableMemberships.length === 1) {
                    setSelectedMembership(availableMemberships[0]);
                    setIsSubscriptionDialogOpen(true);
                  } else {
                    // For now, just use the first membership
                    // In a future update, you could add a selection dialog
                    setSelectedMembership(availableMemberships[0]);
                    setIsSubscriptionDialogOpen(true);
                  }
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Membership
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(!memberships || memberships.length === 0) ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No memberships found</p>
              <p className="text-sm mt-2">Click "Add Membership" to subscribe to a membership plan</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Memberships */}
              {activeMemberships.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Active Memberships
                  </h4>
                  {activeMemberships.map((membership) => (
                    <div key={membership.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">
                            {membership.membership.name}
                          </h5>
                          <p className="text-sm text-gray-600 mt-1">
                            {membership.membership.description}
                          </p>
                        </div>
                        <Badge variant={getStatusColor(membership) as any}>
                          {getStatusText(membership)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Price:</span>
                          <p className="font-medium">{formatPrice(membership.membership.price)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Start Date:</span>
                          <p className="font-medium">{formatDate(new Date(membership.startDate))}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">End Date:</span>
                          <p className="font-medium">{formatDate(new Date(membership.endDate))}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Duration:</span>
                          <p className="font-medium">{membership.membership.duration} days</p>
                        </div>
                      </div>

                      {membership.membership.credits && membership.membership.credits > 0 && (
                        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
                          <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                              {membership.membership.credits} Service Credits Available
                            </span>
                            <span className="text-xs text-blue-700 dark:text-blue-300">
                              (per {membership.membership.duration} day period)
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <RefreshCw className={`h-4 w-4 ${membership.autoRenew ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-sm">
                            Auto-renewal: <strong>{membership.autoRenew ? 'Enabled' : 'Disabled'}</strong>
                            {membership.autoRenew && membership.renewalDay && (
                              <span className="ml-1 text-gray-600">
                                (Day {membership.renewalDay})
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingMembership(membership);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleAutoRenewalMutation.mutate({ 
                              membershipId: membership.id, 
                              autoRenew: !membership.autoRenew 
                            })}
                            disabled={toggleAutoRenewalMutation.isPending}
                          >
                            {membership.autoRenew ? 'Disable' : 'Enable'} Auto-renewal
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              if (confirm(`Are you sure you want to cancel ${membership.membership.name}?`)) {
                                cancelMembershipMutation.mutate(membership.id);
                              }
                            }}
                            disabled={cancelMembershipMutation.isPending}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>

                      {membership.membership.benefits && (
                        <div className="pt-3 border-t">
                          <span className="text-sm text-gray-600">Benefits:</span>
                          <p className="text-sm mt-1">{membership.membership.benefits}</p>
                        </div>
                      )}

                      {membership.membership.includedServices && membership.membership.includedServices.length > 0 && (
                        <div className="pt-3 border-t">
                          <span className="text-sm text-gray-600 flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            Included Services ({membership.membership.includedServices.length}):
                          </span>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {membership.membership.includedServices.map(serviceId => {
                              const service = services?.find((s: Service) => s.id === serviceId);
                              return service ? (
                                <Badge key={serviceId} variant="outline" className="text-xs">
                                  {service.name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Inactive/Expired Memberships */}
              {inactiveMemberships.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-gray-400" />
                    Inactive Memberships
                  </h4>
                  {inactiveMemberships.map((membership) => (
                    <div key={membership.id} className="border rounded-lg p-4 opacity-60 space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100">
                          {membership.membership.name}
                        </h5>
                        <Badge variant="secondary">Inactive</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>{formatDate(new Date(membership.startDate))} - {formatDate(new Date(membership.endDate))}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingMembership(membership);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit / Reactivate
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Membership Subscription Dialog */}
      {selectedMembership && (
        <MembershipSubscriptionDialog
          open={isSubscriptionDialogOpen}
          onOpenChange={setIsSubscriptionDialogOpen}
          membership={selectedMembership}
        />
      )}

      {/* Edit Membership Dialog */}
      <MembershipEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        membership={editingMembership}
      />
    </>
  );
}
