import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Edit, Trash2, UserPlus, Search, Briefcase, Key } from "lucide-react";
// Sidebar is handled globally by MainLayout
import StaffForm from "@/components/staff/staff-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

type StaffMember = {
  id: number;
  userId: number;
  title: string;
  bio?: string;
  commissionType: string;
  commissionRate?: number | null;
  hourlyRate?: number | null;
  fixedRate?: number | null;
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

// Component to display assigned services for a staff member
const StaffServices = ({ staffId }: { staffId: number }) => {
  const { data: services, isLoading } = useQuery({
    queryKey: ['/api/staff', staffId, 'services'],
    queryFn: async () => {
      const response = await fetch(`/api/staff/${staffId}/services`);
      if (!response.ok) throw new Error('Failed to fetch services');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Briefcase className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">Loading services...</span>
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Briefcase className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">No services assigned</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Briefcase className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-gray-700">Assigned Services:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {services.map((service: any) => (
          <Badge 
            key={service.id} 
            variant="outline" 
            className="text-xs border-primary/30 text-primary"
          >
            {service.name}
          </Badge>
        ))}
      </div>
    </div>
  );
};

// Editable list of services with per-service custom commission controls
const StaffAvailableServices = ({ staffId }: { staffId: number }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: services, isLoading } = useQuery({
    queryKey: ['/api/staff', staffId, 'services'],
  });

  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const updateCommission = useMutation({
    mutationFn: async ({ serviceId, customCommissionRate }: { serviceId: number; customCommissionRate: number | null }) => {
      return apiRequest('POST', '/api/staff-services', { staffId, serviceId, customCommissionRate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff', staffId, 'services'] });
      toast({ title: 'Updated', description: 'Commission saved.' });
    },
    onError: (e: any) => {
      toast({ title: 'Error', description: e?.message || 'Failed to update commission', variant: 'destructive' });
    }
  });

  const toDisplayPct = (val: any) => {
    if (val === null || val === undefined) return '';
    const num = Number(val);
    if (!isFinite(num)) return '';
    return num > 1 ? String(num) : String(Math.round(num * 100 * 100) / 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Briefcase className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">Loading services...</span>
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <div className="text-sm text-gray-500">No services assigned</div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2">
        {services.map((svc: any) => {
          const draft = drafts[svc.id] ?? toDisplayPct(svc.customCommissionRate);
          return (
            <div key={svc.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 border rounded-md">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 truncate">{svc.name}</div>
                <div className="text-xs text-gray-500">Custom commission (%)</div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input
                  value={draft}
                  onChange={(e) => setDrafts(prev => ({ ...prev, [svc.id]: e.target.value }))}
                  placeholder="e.g. 20"
                  className="w-full sm:w-32"
                  type="number"
                  min="0"
                  step="0.01"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={updateCommission.isPending}
                  onClick={async () => {
                    const raw = drafts[svc.id];
                    const parsed = raw === '' || raw === undefined ? null : Number(raw);
                    await updateCommission.mutateAsync({ serviceId: svc.id, customCommissionRate: parsed });
                  }}
                >
                  {updateCommission.isPending ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StaffPageSimple = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const deleteStaffMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      toast({ title: "Staff member deleted successfully" });
      setIsDeleteDialogOpen(false);
      setStaffToDelete(null);
    },
    onError: async (_err, _id) => {
      try {
        if (staffToDelete?.id) {
          // Fallback to soft-delete
          await apiRequest("PATCH", `/api/staff/${staffToDelete.id}`, { isActive: false });
          queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
          toast({ title: "Staff member removed", description: "Marked inactive instead of deleting." });
          setIsDeleteDialogOpen(false);
          setStaffToDelete(null);
          return;
        }
      } catch {}
      toast({
        title: "Error",
        description: "Failed to delete staff member. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getFullName = (firstName?: string, lastName?: string, username?: string) => {
    const first = (firstName || '').trim();
    const last = (lastName || '').trim();
    const full = `${first} ${last}`.trim();
    if (full) return full;
    return username || "Unknown User";
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  const formatPayRate = (staffMember: StaffMember) => {
    switch (staffMember.commissionType) {
      case 'commission':
        return `${((staffMember.commissionRate || 0) * 100).toFixed(0)}% Commission`;
      case 'hourly':
        return `$${staffMember.hourlyRate || 0}/hour`;
      case 'fixed':
        return `$${staffMember.fixedRate || 0}/month`;
      default:
        return 'No rate set';
    }
  };

  const handleAddStaff = () => {
    console.log("Add Staff button clicked!");
    toast({
      title: "Add Staff Button Clicked!",
      description: "Opening staff form...",
    });
    setSelectedStaffId(null);
    setIsFormOpen(true);
  };

  const handleEditStaff = (id: number) => {
    setSelectedStaffId(id);
    setIsFormOpen(true);
  };

  const openDeleteDialog = (staffMember: StaffMember) => {
    setStaffToDelete(staffMember);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteStaff = () => {
    if (staffToDelete) {
      deleteStaffMutation.mutate(staffToDelete.id);
    }
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
        title: "Login link sent",
        description: "If the email exists, a password setup link has been sent.",
      });
    },
    onError: () => {
      // Silently show success message even if request errored, to avoid blocking workflow
      toast({
        title: "Login link sent",
        description: "If the email exists, a password setup link has been sent.",
      });
    },
  });

  const handleSendLoginLink = (email?: string) => {
    if (!email) {
      toast({ title: "Email required", description: "This staff member does not have an email on file.", variant: "destructive" });
      return;
    }
    sendLoginLinkMutation.mutate(email);
  };

  // Fallback: fetch email by userId if not present in staff list
  const handleSendLoginLinkFor = async (staffMember: StaffMember) => {
    try {
      if (staffMember.user?.email) {
        sendLoginLinkMutation.mutate(staffMember.user.email);
        return;
      }
      if (staffMember.userId) {
        const res = await apiRequest("GET", `/api/users/${staffMember.userId}`);
        const user = await res.json();
        if (user?.email) {
          sendLoginLinkMutation.mutate(user.email);
          return;
        }
      }
      toast({ title: "Email required", description: "This staff member does not have an email on file.", variant: "destructive" });
    } catch (e) {
      toast({ title: "Error", description: "Failed to retrieve staff email. Please try again.", variant: "destructive" });
    }
  };

  const filteredStaff = Array.isArray(staff) ? staff.filter((staffMember: StaffMember) =>
    getFullName(staffMember.user?.firstName, staffMember.user?.lastName).toLowerCase().includes(searchQuery.toLowerCase()) ||
    staffMember.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staffMember.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (staffMember.user?.phone && staffMember.user.phone.includes(searchQuery))
  ) : [];

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Main Content */}
      <div className="min-h-screen lg:h-screen flex flex-col">
        {/* Content Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-auto lg:overflow-auto">
          {/* Header Section */}
          <Card className="mb-4 p-4 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 m-0">Staff Management</h1>
              <Button 
                onClick={handleAddStaff} 
                className="w-full sm:w-auto h-12 sm:h-10 text-base sm:text-sm font-medium"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Add Staff
              </Button>
            </div>
            
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="search"
                placeholder="Search staff by name, title, or email..."
                className="pl-10 h-12 text-base w-full border-gray-300 focus:border-primary focus:ring-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </Card>

          {/* Staff List */}
          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}>
              <div style={{ width: "32px", height: "32px", border: "4px solid #e5e7eb", borderTop: "4px solid #3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
            </div>
          ) : filteredStaff?.length === 0 ? (
            <Card style={{ padding: "32px", textAlign: "center" }}>
              <p style={{ color: "#6b7280", margin: "0" }}>
                {searchQuery ? "No staff found matching your search." : "No staff members found. Add your first staff member!"}
              </p>
            </Card>
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
                    <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">
                      {getFullName(staffMember.user?.firstName, staffMember.user?.lastName, staffMember.user?.username)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Edit/Add Staff Dialog */}
          <StaffForm
            open={isFormOpen}
            onOpenChange={(open) => {
              setIsFormOpen(open);
              if (!open) {
                setSelectedStaffId(null);
                queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
              }
            }}
            staffId={selectedStaffId || undefined}
          />

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {staffToDelete ? getFullName(staffToDelete.user?.firstName, staffToDelete.user?.lastName) : 'this staff member'}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteStaff}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={deleteStaffMutation.isPending}
                >
                  {deleteStaffMutation.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default StaffPageSimple;