import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { SidebarController } from "@/components/layout/sidebar";
import { useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/contexts/AuthProvider";
// import Header from "@/components/layout/header"; // Provided by MainLayout
import { apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";
import StaffForm from "@/components/staff/staff-form";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, Search, Edit, Trash2, Scissors, Key } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { getInitials, getFullName } from "@/lib/utils";

type StaffMember = {
  id: number;
  userId: number;
  title: string;
  bio?: string;
  commissionRate: number;
  photoUrl?: string;
  user: {
    id: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
  };
};

// Display assigned services as badges with ability to remove
const AssignedServicesBadges = ({ staffId }: { staffId: number }) => {
  const queryClient = useQueryClient();
  const { data: services, isLoading } = useQuery({
    queryKey: ['/api/staff', staffId, 'services'],
    queryFn: async () => {
      const res = await fetch(`/api/staff/${staffId}/services`);
      if (!res.ok) throw new Error('Failed to fetch staff services');
      return res.json();
    }
  });

  if (isLoading) {
    return <div className="text-xs text-gray-500">Loading services…</div>;
  }

  if (!services || services.length === 0) {
    return <div className="text-xs text-gray-500">No services assigned</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {services.map((service: any) => (
        <div key={`${staffId}-${service.id}`} className="inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-xs">
          <span>{service.name}</span>
          <button
            type="button"
            onClick={async () => {
              try {
                await apiRequest('DELETE', `/api/staff-services/${service.staffServiceId}`);
                queryClient.invalidateQueries({ queryKey: ['/api/staff', staffId, 'services'] });
              } catch (e) {}
            }}
            className="text-gray-500 hover:text-red-600"
            aria-label="Remove service"
            title="Remove"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

// Controls to assign a new service to a staff member
const ServiceAssignmentControls = ({ staffId, allServices }: { staffId: number; allServices: any[] }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  const handleAdd = async () => {
    const idNum = parseInt(selectedServiceId);
    if (!idNum) {
      toast({ title: 'Select a service', description: 'Please choose a service to assign.', variant: 'destructive' });
      return;
    }
    try {
      await apiRequest('POST', '/api/staff-services', { staffId, serviceId: idNum });
      setSelectedServiceId("");
      queryClient.invalidateQueries({ queryKey: ['/api/staff', staffId, 'services'] });
      toast({ title: 'Service assigned', description: 'Service added to staff.' });
    } catch (e: any) {
      toast({ title: 'Failed to assign', description: e?.message || 'Could not assign service', variant: 'destructive' });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
        <SelectTrigger id={`service-select-${staffId}`}>
          <SelectValue placeholder="Select a service" />
        </SelectTrigger>
        <SelectContent>
          {(allServices || []).map((svc: any) => (
            <SelectItem key={svc.id} value={svc.id.toString()}>
              {svc.name} {typeof svc.price === 'number' ? `- ${formatPrice(svc.price)}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={handleAdd} className="h-9">Add Service</Button>
    </div>
  );
};

const StaffPage = () => {
  useDocumentTitle("Staff | Glo Head Spa");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Debug state changes
  useEffect(() => {
    console.log("isFormOpen state changed to:", isFormOpen);
  }, [isFormOpen]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const { isOpen: sidebarOpen } = useSidebar();

  // Remove the old sidebar state management since it's now handled by context
  // useEffect(() => {
  //   const checkSidebarState = () => {
  //     const globalSidebarState = (window as any).sidebarIsOpen;
  //     if (globalSidebarState !== undefined && globalSidebarState !== sidebarOpen) {
  //       // Sidebar state is managed by the context now
  //     }
  //   };

  //   const interval = setInterval(checkSidebarState, 100);
  //   return () => clearInterval(interval);
  // }, [sidebarOpen]);

  const { data: staff, isLoading } = useQuery({
    queryKey: ['/api/staff'],
    queryFn: async () => {
      const response = await fetch('/api/staff', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch staff');
      return response.json();
    }
  });

  // Fetch all services for assignment UI
  const { data: _allServices } = useQuery({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const response = await fetch('/api/services');
      if (!response.ok) throw new Error('Failed to fetch services');
      return response.json();
    }
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (staffId: number) => {
      return apiRequest("DELETE", `/api/staff/${staffId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      toast({
        title: "Success",
        description: "Staff member deleted successfully",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: async (_error) => {
      try {
        if (staffToDelete?.id) {
          await apiRequest("PATCH", `/api/staff/${staffToDelete.id}`, { isActive: false });
          queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
          toast({ title: 'Staff member removed', description: 'Marked inactive instead.' });
          setIsDeleteDialogOpen(false);
          return;
        }
      } catch {}
      toast({
        title: "Error",
        description: `Failed to delete staff member: ${(_error as any)?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });

  const handleAddStaff = () => {
    console.log("handleAddStaff called");
    console.log("Current isFormOpen state:", isFormOpen);
    setSelectedStaffId(null);
    setIsFormOpen(true);
    console.log("After setting isFormOpen to true");
  };

  const handleEditStaff = (staffId: number) => {
    setSelectedStaffId(staffId);
    setIsFormOpen(true);
  };

  const handleDeleteStaff = () => {
    if (staffToDelete) {
      deleteStaffMutation.mutate(staffToDelete.id);
    }
  };

  const openDeleteDialog = (staffMember: StaffMember) => {
    setStaffToDelete(staffMember);
    setIsDeleteDialogOpen(true);
  };

  // Send password setup link for staff login
  const sendLoginLinkMutation = useMutation({
    mutationFn: async (email: string) => {
      try {
        await fetch('/api/auth/password-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
          credentials: 'include',
        });
      } catch {}
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Login link sent',
        description: 'If the email exists, a password setup link has been sent.',
      });
    },
    onError: () => {
      toast({
        title: 'Login link sent',
        description: 'If the email exists, a password setup link has been sent.',
      });
    }
  });

  const handleSendLoginLink = (email?: string) => {
    if (!email) {
      toast({ title: 'Email required', description: 'This staff member does not have an email on file.', variant: 'destructive' });
      return;
    }
    sendLoginLinkMutation.mutate(email);
  };

  // Fallback: fetch email by userId if not present in staff list
  const handleSendLoginLinkFor = async (staffMember: StaffMember) => {
    try {
      const existingEmail = staffMember.user?.email;
      if (existingEmail) {
        sendLoginLinkMutation.mutate(existingEmail);
        return;
      }
      if (staffMember.userId) {
        const res = await apiRequest('GET', `/api/users/${staffMember.userId}`);
        const user = await res.json();
        if (user?.email) {
          sendLoginLinkMutation.mutate(user.email);
          return;
        }
      }
      toast({ title: 'Email required', description: 'This staff member does not have an email on file.', variant: 'destructive' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to retrieve staff email. Please try again.', variant: 'destructive' });
    }
  };

  const filteredStaff = staff?.filter((staffMember: StaffMember) =>
    staffMember.user?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staffMember.user?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staffMember.user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staffMember.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staffMember.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (staffMember.user?.phone && staffMember.user.phone.includes(searchQuery))
  );

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="hidden lg:block">
        <SidebarController />
      </div>
      
      <div className="min-h-screen lg:h-screen flex flex-col transition-all duration-300">
        
        <main className="flex-1 bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 md:p-6 pb-4 sm:pb-6 overflow-auto lg:overflow-auto">
          <div className="w-full max-w-none sm:max-w-7xl mx-auto px-0 sm:px-4">
            <div className="space-y-4 lg:space-y-6">
            {/* Page Header */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 lg:p-6 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h1 className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-gray-100">Staff</h1>
                    <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                      Manage your salon staff
                    </p>
                  </div>
                  {user && user.role === 'admin' && (
                    <button
                      onClick={() => {
                        console.log("Add Staff button clicked");
                        toast({
                          title: "Add Staff Clicked!",
                          description: "Original button works",
                        });
                        setSelectedStaffId(null);
                        setIsFormOpen(true);
                      }}
                      className="relative z-50 inline-flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 border-0"
                      style={{
                        minHeight: '44px',
                        minWidth: '120px',
                        WebkitTapHighlightColor: 'rgba(0,0,0,0)',
                        userSelect: 'none',
                        touchAction: 'manipulation'
                      }}
                      type="button"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span className="ml-1">Add Staff</span>
                    </button>
                  )}
                </div>
                
                <div className="w-full">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <Input
                      type="search"
                      placeholder="Search staff..."
                      className="pl-8 w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Staff List */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : filteredStaff?.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No staff members found. {searchQuery ? 'Try a different search term.' : 'Add your first staff member!'}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredStaff?.map((staffMember: StaffMember) => (
                    <button
                      key={staffMember.id}
                      type="button"
                      onClick={() => handleEditStaff(staffMember.id)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
                    >
                      <span className="text-sm lg:text-base font-semibold text-gray-900 dark:text-gray-100">
                        {getFullName(staffMember.user?.firstName, staffMember.user?.lastName, staffMember.user?.username)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            </div>
          </div>
        </main>
      </div>

      {/* Delete Staff Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the staff member{' '}
              <span className="font-semibold">
                {staffToDelete && getFullName(staffToDelete.user.firstName, staffToDelete.user.lastName, staffToDelete.user.username)}
              </span>{' '}
              and remove their access to the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteStaff} 
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteStaffMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Staff Form Dialog */}
      <StaffForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        staffId={selectedStaffId || undefined}
      />
    </div>
  );
};

export default StaffPage;
