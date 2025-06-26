import { useState, useEffect } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPrice } from "@/lib/utils";
import StaffForm from "@/components/staff/staff-form";
import { useDocumentTitle } from "@/hooks/use-document-title";

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
import { PlusCircle, Search, Edit, Trash2, Scissors } from "lucide-react";
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
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
  };
};

const StaffPage = () => {
  useDocumentTitle("Staff | BeautyBook");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Debug state changes
  useEffect(() => {
    console.log("isFormOpen state changed to:", isFormOpen);
  }, [isFormOpen]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
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

  const { data: staff, isLoading } = useQuery({
    queryKey: ['/api/staff'],
    queryFn: async () => {
      const response = await fetch('/api/staff');
      if (!response.ok) throw new Error('Failed to fetch staff');
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
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete staff member: ${error.message}`,
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

  const filteredStaff = staff?.filter((staffMember: StaffMember) =>
    staffMember.user?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staffMember.user?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staffMember.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    staffMember.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (staffMember.user?.phone && staffMember.user.phone.includes(searchQuery))
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="hidden lg:block fixed inset-y-0 left-0 z-50 w-64">
        <SidebarController />
      </div>
      
      <div className="lg:pl-64">
        <Header />
        
        <main className="p-3 lg:p-6">
          <div className="w-full space-y-4 lg:space-y-6">
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
                  <Button
                    onClick={() => {
                      // Visual feedback for mobile testing
                      toast({
                        title: "Button Clicked!",
                        description: "Add Staff button was clicked",
                      });
                      setSelectedStaffId(null);
                      setIsFormOpen(true);
                    }}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span className="ml-1">Add Staff</span>
                  </Button>
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
            
            {/* Staff Cards */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : filteredStaff?.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No staff members found. {searchQuery ? 'Try a different search term.' : 'Add your first staff member!'}
              </div>
            ) : (
              <div className="space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-6 lg:space-y-0">
                {filteredStaff?.map((staffMember: StaffMember) => (
                  <div key={staffMember.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 lg:p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10 lg:h-12 lg:w-12 flex-shrink-0">
                        {staffMember.photoUrl ? (
                          <img
                            src={staffMember.photoUrl}
                            alt={getFullName(staffMember.user?.firstName, staffMember.user?.lastName)}
                            className="h-full w-full object-cover rounded-full"
                          />
                        ) : (
                          <AvatarFallback className="text-sm">
                            {getInitials(staffMember.user?.firstName, staffMember.user?.lastName)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm lg:text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {getFullName(staffMember.user?.firstName, staffMember.user?.lastName)}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs px-2 py-0">
                                {staffMember.title}
                              </Badge>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {(staffMember.commissionRate * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex space-x-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditStaff(staffMember.id)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(staffMember)}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-2 space-y-1">
                          <div className="text-xs">
                            <span className="text-gray-500 dark:text-gray-400">Email:</span>
                            <span className="ml-1 text-gray-700 dark:text-gray-300 text-xs break-all">
                              {staffMember.user?.email || "-"}
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                            <span className="ml-1 text-gray-700 dark:text-gray-300">
                              {staffMember.user?.phone || "-"}
                            </span>
                          </div>
                          {staffMember.bio && (
                            <div className="text-xs mt-1">
                              <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                                {staffMember.bio}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Staff Form Dialog */}
      <StaffForm
        open={Boolean(isFormOpen)}
        onOpenChange={setIsFormOpen}
        staffId={selectedStaffId || undefined}
      />
      
      {/* Delete Staff Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the staff member{' '}
              <span className="font-semibold">
                {staffToDelete && getFullName(staffToDelete.user.firstName, staffToDelete.user.lastName)}
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
