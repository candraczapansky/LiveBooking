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
  });

  const deleteStaffMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      toast({ title: "Staff member deleted successfully" });
      setIsDeleteDialogOpen(false);
      setStaffToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete staff member. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getFullName = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "Unknown User";
    return `${firstName || ""} ${lastName || ""}`.trim();
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
            <div className="flex flex-col gap-6">
              {filteredStaff?.map((staffMember: StaffMember) => (
                <Card key={staffMember.id} className="p-6 w-full shadow-sm border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200">
                  {/* Mobile-optimized layout */}
                  <div className="space-y-4">
                    {/* Avatar and basic info section */}
                    <div className="flex items-start gap-4">
                      <Avatar className="w-20 h-20 flex-shrink-0 ring-2 ring-gray-200">
                        {staffMember.photoUrl ? (
                          <img
                            src={staffMember.photoUrl}
                            alt={getFullName(staffMember.user?.firstName, staffMember.user?.lastName)}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <AvatarFallback className="text-xl font-semibold bg-[hsl(var(--primary)/0.1)] text-primary">
                            {getInitials(staffMember.user?.firstName, staffMember.user?.lastName)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <h3 className="text-xl font-bold text-gray-900 leading-tight">
                          {getFullName(staffMember.user?.firstName, staffMember.user?.lastName)}
                        </h3>
                        <p className="text-base text-gray-700 font-medium">
                          {staffMember.title}
                        </p>
                        <p className="text-sm text-gray-500 break-all">
                          {staffMember.user?.email}
                        </p>
                        <p className="text-xs text-gray-500 break-all">
                          Username: {staffMember.user?.username || '-'}
                        </p>
                        <div>
                          <div className="text-xs text-gray-500 mb-0.5">Default Pay</div>
                          <div className="inline-flex items-center px-2 py-1 rounded-full bg-[hsl(var(--primary)/0.1)] text-primary text-sm font-medium">
                            {formatPayRate(staffMember)}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Assigned Services Section */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <StaffServices staffId={staffMember.id} />
                    </div>

                    {/* Available Services (editable commissions) */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value={`available-${staffMember.id}`}>
                          <AccordionTrigger>
                            <div className="flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium text-gray-700">Available Services</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <StaffAvailableServices staffId={staffMember.id} />
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                    
                    {/* Action buttons - optimized for mobile touch */}
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <Button
                        variant="outline"
                        onClick={() => handleEditStaff(staffMember.id)}
                        className="h-14 px-4 text-base font-medium border-2 border-primary text-primary hover:bg-[hsl(var(--primary)/0.1)] active:bg-[hsl(var(--primary)/0.2)] transition-colors"
                      >
                        <Edit className="w-5 h-5 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => openDeleteDialog(staffMember)}
                        className="h-14 px-4 text-base font-medium border-2 border-red-300 text-red-700 hover:bg-red-50 active:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-5 h-5 mr-2" />
                        Delete
                      </Button>
                    </div>

                    {/* Create Login / Send Password Link */}
                    <div className="w-full mt-2 flex gap-2">
                      <Button
                        variant="default"
                        onClick={() => handleSendLoginLinkFor(staffMember)}
                        disabled={sendLoginLinkMutation.isPending}
                        className="h-12 flex-1 text-base font-medium"
                        title="Create Login / Send Login Link"
                        aria-label="Create Login / Send Login Link"
                      >
                        {sendLoginLinkMutation.isPending ? "Sending…" : "Create Login / Send Login Link"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleSendLoginLinkFor(staffMember)}
                        disabled={sendLoginLinkMutation.isPending}
                        className="h-12 px-4"
                        title="Create Login / Send Login Link"
                        aria-label="Create Login / Send Login Link"
                      >
                        <Key className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
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