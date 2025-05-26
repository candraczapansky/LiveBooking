import { useState } from "react";
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
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);

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
    setSelectedStaffId(null);
    setIsFormOpen(true);
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
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Staff</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Manage your salon staff
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search staff..."
                    className="pl-8 w-[250px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddStaff}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStaff?.map((staffMember: StaffMember) => (
                  <Card key={staffMember.id} className="overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <Avatar className="h-16 w-16">
                          {staffMember.photoUrl ? (
                            <img
                              src={staffMember.photoUrl}
                              alt={getFullName(staffMember.user?.firstName, staffMember.user?.lastName)}
                              className="h-full w-full object-cover rounded-full"
                            />
                          ) : (
                            <AvatarFallback className="text-lg">
                              {getInitials(staffMember.user?.firstName, staffMember.user?.lastName)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditStaff(staffMember.id)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(staffMember)}
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <CardTitle className="text-xl">
                          {getFullName(staffMember.user?.firstName, staffMember.user?.lastName)}
                        </CardTitle>
                        <CardDescription className="flex items-center mt-1">
                          <Badge variant="outline" className="mr-2">
                            {staffMember.title}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {(staffMember.commissionRate * 100).toFixed(0)}% Commission
                          </span>
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <span className="font-medium w-20">Email:</span>
                          <span className="text-gray-600 dark:text-gray-400">{staffMember.user?.email || "-"}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="font-medium w-20">Phone:</span>
                          <span className="text-gray-600 dark:text-gray-400">{staffMember.user?.phone || "-"}</span>
                        </div>
                        {staffMember.bio && (
                          <div className="pt-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {staffMember.bio}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button variant="outline" className="w-full" onClick={() => toast({ title: "Feature Coming Soon", description: "View schedule functionality will be available soon!" })}>
                        <Scissors className="h-4 w-4 mr-2" />
                        View Services
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Staff Form Dialog */}
      <StaffForm
        open={isFormOpen}
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
    </div>
  );
};

export default StaffPage;
