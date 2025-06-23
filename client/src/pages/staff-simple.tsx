import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Edit, Trash2, PlusCircle, Search } from "lucide-react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import StaffForm from "@/components/staff/staff-form";
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

  const filteredStaff = Array.isArray(staff) ? staff.filter((staffMember: StaffMember) =>
    getFullName(staffMember.user?.firstName, staffMember.user?.lastName).toLowerCase().includes(searchQuery.toLowerCase()) ||
    staffMember.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staffMember.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (staffMember.user?.phone && staffMember.user.phone.includes(searchQuery))
  ) : [];

  return (
    <div className="min-h-screen bg-gray-50 mobile-scroll">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-64">
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <div className="lg:pl-64 min-h-screen flex flex-col">
        <Header />
        
        {/* Content Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto pb-safe-area-inset-bottom"
             style={{ paddingBottom: "env(safe-area-inset-bottom, 24px)" }}>
          {/* Header Section */}
          <Card className="mb-4 p-4 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 m-0">Staff Management</h1>
              <Button 
                onClick={handleAddStaff} 
                className="w-full sm:w-auto h-12 sm:h-10 text-base sm:text-sm font-medium"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Add Staff
              </Button>
            </div>
            
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="search"
                placeholder="Search staff by name, title, or email..."
                className="pl-10 h-12 text-base w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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
                          <AvatarFallback className="text-xl font-semibold bg-blue-100 text-blue-700">
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
                        <div className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                          Commission: {staffMember.commissionRate}%
                        </div>
                      </div>
                    </div>
                    
                    {/* Action buttons - optimized for mobile touch */}
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <Button
                        variant="outline"
                        onClick={() => handleEditStaff(staffMember.id)}
                        className="h-14 px-4 text-base font-medium border-2 border-blue-300 text-blue-700 hover:bg-blue-50 active:bg-blue-100 transition-colors"
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