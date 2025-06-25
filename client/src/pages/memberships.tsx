import { useState, useEffect } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";
import MembershipForm from "@/components/memberships/membership-form";
import { useDocumentTitle } from "@/hooks/use-document-title";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Edit, Trash2, CreditCard, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, getFullName, formatDate } from "@/lib/utils";

type Membership = {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number;
  benefits: string;
};

type ClientMembership = {
  id: number;
  clientId: number;
  membershipId: number;
  startDate: string;
  endDate: string;
  active: boolean;
  stripeSubscriptionId?: string;
  client?: {
    id: number;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  membership?: Membership;
};

const MembershipsPage = () => {
  useDocumentTitle("Memberships | BeautyBook");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("plans");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMembershipId, setSelectedMembershipId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [membershipToDelete, setMembershipToDelete] = useState<Membership | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const checkSidebarState = () => {
      const globalSidebarState = (window as any).sidebarIsOpen;
      if (globalSidebarState !== undefined) {
        setSidebarOpen(globalSidebarState);
      }
    };

    const interval = setInterval(checkSidebarState, 100);
    return () => clearInterval(interval);
  }, []);

  const { data: memberships, isLoading: isMembershipsLoading } = useQuery({
    queryKey: ['/api/memberships'],
    queryFn: async () => {
      const response = await fetch('/api/memberships');
      if (!response.ok) throw new Error('Failed to fetch memberships');
      return response.json();
    }
  });

  const { data: clientMemberships, isLoading: isClientMembershipsLoading } = useQuery({
    queryKey: ['/api/client-memberships'],
    queryFn: async () => {
      // In a real app, we would have a better way to get all client memberships
      // For this demo, we'll just fake it with what we have
      const response = await fetch('/api/client-memberships?clientId=1');
      if (!response.ok) throw new Error('Failed to fetch client memberships');
      return response.json();
    },
    enabled: activeTab === "subscribers"
  });

  const deleteMembershipMutation = useMutation({
    mutationFn: async (membershipId: number) => {
      return apiRequest("DELETE", `/api/memberships/${membershipId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/memberships'] });
      toast({
        title: "Success",
        description: "Membership plan deleted successfully",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete membership plan: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleAddMembership = () => {
    setSelectedMembershipId(null);
    setIsFormOpen(true);
  };

  const handleEditMembership = (membershipId: number) => {
    setSelectedMembershipId(membershipId);
    setIsFormOpen(true);
  };

  const handleDeleteMembership = () => {
    if (membershipToDelete) {
      deleteMembershipMutation.mutate(membershipToDelete.id);
    }
  };

  const openDeleteDialog = (membership: Membership) => {
    setMembershipToDelete(membership);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarOpen ? 'ml-64' : 'ml-0'
      }`}>
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Memberships</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Manage membership plans and subscribers
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <Button onClick={handleAddMembership} className="flex items-center justify-center">
                  Add Membership Plan
                </Button>
              </div>
            </div>
            
            {/* Memberships Tabs */}
            <Tabs defaultValue="plans" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="plans" className="flex items-center">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Membership Plans
                </TabsTrigger>
                <TabsTrigger value="subscribers" className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Subscribers
                </TabsTrigger>
              </TabsList>
              
              {/* Membership Plans Tab */}
              <TabsContent value="plans">
                {isMembershipsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : memberships?.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <CreditCard className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Membership Plans</h3>
                      <p className="text-sm text-gray-500 mb-4 text-center max-w-md">
                        Create membership plans to offer your clients regular services at discounted rates or exclusive benefits.
                      </p>
                      <Button onClick={handleAddMembership} className="flex items-center justify-center">
                        Add Membership Plan
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {memberships?.map((membership: Membership) => (
                      <Card key={membership.id} className="overflow-hidden">
                        <CardHeader className="pb-4">
                          <div className="flex justify-between items-start">
                            <CardTitle>{membership.name}</CardTitle>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditMembership(membership.id)}
                                className="h-8 w-8"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(membership)}
                                className="h-8 w-8 text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <CardDescription>
                            <div className="flex items-center mt-1">
                              <Badge variant="secondary" className="mr-2">
                                {membership.duration} days
                              </Badge>
                              <span className="text-lg font-bold text-primary">
                                {formatPrice(membership.price)}
                              </span>
                            </div>
                          </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="pb-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {membership.description}
                          </p>
                          
                          {membership.benefits && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Benefits:</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {membership.benefits}
                              </p>
                            </div>
                          )}
                        </CardContent>
                        
                        <CardFooter className="bg-muted/50 pt-4">
                          <Button variant="outline" className="w-full" onClick={() => toast({ title: "Feature Coming Soon", description: "View subscribers functionality will be available soon!" })}>
                            View Subscribers
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              {/* Subscribers Tab */}
              <TabsContent value="subscribers">
                <Card>
                  <CardHeader>
                    <CardTitle>Membership Subscribers</CardTitle>
                    <CardDescription>
                      View and manage clients with active memberships
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isClientMembershipsLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                      </div>
                    ) : clientMemberships?.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No clients have active memberships yet.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Client</TableHead>
                            <TableHead>Membership</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clientMemberships?.map((membership: ClientMembership) => (
                            <TableRow key={membership.id}>
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <Avatar>
                                    <AvatarFallback>
                                      {getInitials(
                                        membership.client?.firstName,
                                        membership.client?.lastName
                                      )}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium">
                                      {getFullName(
                                        membership.client?.firstName,
                                        membership.client?.lastName
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      {membership.client?.email}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{membership.membership?.name}</TableCell>
                              <TableCell>
                                <Badge variant={membership.active ? "success" : "secondary"}>
                                  {membership.active ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatDate(new Date(membership.startDate))}</TableCell>
                              <TableCell>{formatDate(new Date(membership.endDate))}</TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  className="text-primary" 
                                  onClick={() => toast({ title: "Feature Coming Soon", description: "Membership management will be available soon!" })}
                                >
                                  Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      
      {/* Membership Form */}
      <MembershipForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        membershipId={selectedMembershipId || undefined}
      />
      
      {/* Delete Membership Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the membership plan{' '}
              <span className="font-semibold">
                {membershipToDelete?.name}
              </span>{' '}
              and may affect clients who have subscribed to it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteMembership} 
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMembershipMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MembershipsPage;
