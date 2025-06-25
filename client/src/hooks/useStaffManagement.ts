import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { staffService, type StaffMember, type CreateStaffData } from "@/services/staffService";

export function useStaffManagement() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch staff data
  const {
    data: staff = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['/api/staff'],
    queryFn: staffService.getAllStaff,
  });

  // Create staff mutation
  const createStaffMutation = useMutation({
    mutationFn: (data: CreateStaffData) => staffService.createStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      toast({
        title: "Success",
        description: "Staff member created successfully!",
      });
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create staff member: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Delete staff mutation
  const deleteStaffMutation = useMutation({
    mutationFn: (staffId: number) => staffService.deleteStaff(staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      toast({
        title: "Success",
        description: "Staff member deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setStaffToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete staff member: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Filtered staff based on search
  const filteredStaff = staff.filter((staffMember: StaffMember) => {
    const fullName = `${staffMember.user?.firstName || ''} ${staffMember.user?.lastName || ''}`.toLowerCase();
    const email = staffMember.user?.email?.toLowerCase() || '';
    const phone = staffMember.user?.phone || '';
    const title = staffMember.title.toLowerCase();

    return fullName.includes(searchQuery.toLowerCase()) ||
           email.includes(searchQuery.toLowerCase()) ||
           phone.includes(searchQuery) ||
           title.includes(searchQuery.toLowerCase());
  });

  // Action handlers
  const handleAddStaff = () => setIsAddDialogOpen(true);

  const handleDeleteStaff = (staffMember: StaffMember) => {
    setStaffToDelete(staffMember);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (staffToDelete) {
      deleteStaffMutation.mutate(staffToDelete.id);
    }
  };

  const handleEditStaff = (staffId: number) => {
    // TODO: Implement edit functionality
    toast({
      title: "Feature Coming Soon",
      description: "Staff editing functionality will be available soon.",
    });
  };

  return {
    // Data
    staff: filteredStaff,
    isLoading,
    error,
    searchQuery,
    
    // Dialog states
    isAddDialogOpen,
    isDeleteDialogOpen,
    staffToDelete,
    
    // Mutations
    createStaffMutation,
    deleteStaffMutation,
    
    // Actions
    handleAddStaff,
    handleEditStaff,
    handleDeleteStaff,
    confirmDelete,
    setSearchQuery,
    setIsAddDialogOpen,
    setIsDeleteDialogOpen,
  };
}