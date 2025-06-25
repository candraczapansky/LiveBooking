import { useState } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useStaffManagement } from "@/hooks/useStaffManagement";
import { getStaffFullName, getStaffInitials, formatCommissionRate } from "@/services/staffService";
import { StaffManagementDialog } from "@/components/staff/staff-management-dialog";
import { useDocumentTitle } from "@/hooks/use-document-title";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle,
  Search,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  Mail,
  Phone,
} from "lucide-react";
import { useLocation } from "wouter";

const StaffPage = () => {
  useDocumentTitle("Staff | BeautyBook");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [, setLocation] = useLocation();

  // Use the consolidated staff management hook
  const {
    staff,
    isLoading,
    searchQuery,
    isAddDialogOpen,
    isDeleteDialogOpen,
    staffToDelete,
    createStaffMutation,
    handleAddStaff,
    handleEditStaff,
    handleDeleteStaff,
    confirmDelete,
    setSearchQuery,
    setIsAddDialogOpen,
    setIsDeleteDialogOpen,
  } = useStaffManagement();

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
                    <h1 className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-gray-100">
                      Staff Management
                    </h1>
                    <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                      Manage your salon staff
                    </p>
                  </div>
                  <Button onClick={handleAddStaff} size="sm">
                    <PlusCircle className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">Add Staff</span>
                  </Button>
                </div>
                
                <div className="w-full">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search staff by name, title, email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Staff List */}
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading staff...</p>
              </div>
            ) : staff.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No staff members found</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {searchQuery ? "No staff members match your search." : "Get started by adding your first staff member."}
                  </p>
                  {!searchQuery && (
                    <Button onClick={handleAddStaff}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Staff Member
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {staff.map((staffMember) => (
                  <Card key={staffMember.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div 
                          className="flex items-center space-x-3 cursor-pointer flex-1"
                          onClick={() => setLocation(`/staff-schedule/${staffMember.id}`)}
                        >
                          <Avatar className="h-12 w-12">
                            <AvatarFallback>
                              {getStaffInitials(staffMember)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-lg">
                              {getStaffFullName(staffMember)}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {staffMember.title}
                            </CardDescription>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Click to view schedule
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditStaff(staffMember.id);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStaff(staffMember);
                            }}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Mail className="h-4 w-4 mr-2" />
                          {staffMember.user?.email || 'No email'}
                        </div>
                        {staffMember.user?.phone && (
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Phone className="h-4 w-4 mr-2" />
                            {staffMember.user.phone}
                          </div>
                        )}
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <DollarSign className="h-4 w-4 mr-2" />
                          <Badge variant="secondary">
                            {formatCommissionRate(staffMember)}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Staff Management Dialog */}
      <StaffManagementDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={(data) => createStaffMutation.mutate(data)}
        isSubmitting={createStaffMutation.isPending}
      />
      
      {/* Delete Staff Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the staff member{' '}
              <span className="font-semibold">
                {staffToDelete && getStaffFullName(staffToDelete)}
              </span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StaffPage;