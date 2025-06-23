import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Edit, Trash2, PlusCircle, Search } from "lucide-react";
import Header from "@/components/layout/header";
import SidebarController from "@/components/layout/sidebar-controller";
import StaffForm from "@/components/forms/staff-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type StaffMember = {
  id: number;
  userId: number;
  title: string;
  bio?: string;
  commissionRate: number;
  photoUrl?: string;
  user: {
    id: number;
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
  };
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

  const handleAddStaff = () => {
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

  const filteredStaff = staff?.filter((staffMember: StaffMember) =>
    getFullName(staffMember.user?.firstName, staffMember.user?.lastName).toLowerCase().includes(searchQuery.toLowerCase()) ||
    staffMember.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staffMember.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (staffMember.user?.phone && staffMember.user.phone.includes(searchQuery))
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb", overflow: "hidden" }}>
      {/* Desktop Sidebar */}
      <div style={{ display: "none" }} className="lg:block lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-64">
        <SidebarController />
      </div>
      
      {/* Main Content */}
      <div style={{ paddingLeft: "0" }} className="lg:pl-64">
        <Header />
        
        {/* Content Area */}
        <div style={{ padding: "12px", maxWidth: "100%", boxSizing: "border-box" }}>
          {/* Header Section */}
          <Card style={{ marginBottom: "16px", padding: "16px", width: "100%", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
              <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: "0" }}>Staff Management</h1>
              <Button onClick={handleAddStaff} style={{ flexShrink: "0" }}>
                <PlusCircle style={{ width: "16px", height: "16px", marginRight: "8px" }} />
                Add Staff
              </Button>
            </div>
            
            <div style={{ position: "relative", width: "100%" }}>
              <Search style={{ position: "absolute", left: "10px", top: "10px", width: "16px", height: "16px", color: "#6b7280" }} />
              <Input
                type="search"
                placeholder="Search staff..."
                style={{ paddingLeft: "36px", width: "100%" }}
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
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredStaff?.map((staffMember: StaffMember) => (
                <Card key={staffMember.id} style={{ padding: "16px", width: "100%", boxSizing: "border-box" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <Avatar style={{ width: "48px", height: "48px", flexShrink: "0" }}>
                      {staffMember.photoUrl ? (
                        <img
                          src={staffMember.photoUrl}
                          alt={getFullName(staffMember.user?.firstName, staffMember.user?.lastName)}
                          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                        />
                      ) : (
                        <AvatarFallback>
                          {getInitials(staffMember.user?.firstName, staffMember.user?.lastName)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    
                    <div style={{ flex: "1", minWidth: "0" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 4px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {getFullName(staffMember.user?.firstName, staffMember.user?.lastName)}
                      </h3>
                      <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 4px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {staffMember.title}
                      </p>
                      <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 4px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {staffMember.user?.email}
                      </p>
                      <p style={{ fontSize: "14px", color: "#6b7280", margin: "0" }}>
                        Commission: {staffMember.commissionRate}%
                      </p>
                    </div>
                    
                    <div style={{ display: "flex", gap: "8px", flexShrink: "0" }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditStaff(staffMember.id)}
                        style={{ width: "32px", height: "32px", padding: "0" }}
                      >
                        <Edit style={{ width: "16px", height: "16px" }} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(staffMember)}
                        style={{ width: "32px", height: "32px", padding: "0", color: "#ef4444" }}
                      >
                        <Trash2 style={{ width: "16px", height: "16px" }} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <StaffForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        staffId={selectedStaffId || undefined}
      />
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the staff member{' '}
              <span style={{ fontWeight: "600" }}>
                {staffToDelete && getFullName(staffToDelete.user.firstName, staffToDelete.user.lastName)}
              </span>{' '}
              and remove their access to the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteStaff} 
              style={{ backgroundColor: "#dc2626" }}
            >
              {deleteStaffMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default StaffPageSimple;