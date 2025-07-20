import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, FileText, Users, Calendar, Settings, Eye, Edit, Trash2, MessageSquare } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { FormBuilder } from "@/components/forms/form-builder";
import { SendFormSMSDialog } from "@/components/forms/send-form-sms-dialog";
import { FormSubmissionsDialog } from "@/components/forms/form-submissions-dialog";
import { getForms } from "@/api/forms";

const FormsPage = () => {
  useDocumentTitle("Forms | Glo Head Spa");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [submissionsDialogOpen, setSubmissionsDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<{ id: number; title: string } | null>(null);

  // Fetch forms from API using React Query
  const { data: forms = [], isLoading, error } = useQuery({
    queryKey: ["/api/forms"],
    queryFn: getForms,
  });

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'intake':
        return <Users className="h-4 w-4" />;
      case 'feedback':
        return <FileText className="h-4 w-4" />;
      case 'booking':
        return <Calendar className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'intake':
        return 'Intake Form';
      case 'feedback':
        return 'Feedback Survey';
      case 'booking':
        return 'Booking Form';
      default:
        return 'Form';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
        <SidebarController />
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
          sidebarOpen ? 'md:ml-64 ml-0' : 'ml-0'
        }`}>
          <Header />
          <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
            <div className="max-w-7xl mx-auto px-2 sm:px-0">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading forms...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
        <SidebarController />
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
          sidebarOpen ? 'md:ml-64 ml-0' : 'ml-0'
        }`}>
          <Header />
          <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
            <div className="max-w-7xl mx-auto px-2 sm:px-0">
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-red-400">
                  <FileText className="h-12 w-12" />
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Error loading forms</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {error instanceof Error ? error.message : "Failed to load forms"}
                </p>
                <div className="mt-6">
                  <Button 
                    onClick={() => window.location.reload()}
                    variant="default"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarOpen ? 'md:ml-64 ml-0' : 'ml-0'
      }`}>
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-7xl mx-auto px-2 sm:px-0">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Forms</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Build and manage client forms and surveys with our drag-and-drop form builder
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <Button 
                  onClick={() => setIsFormOpen(true)}
                  variant="default" 
                  className="flex items-center justify-center h-12 w-full sm:w-auto"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Build New Form
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Forms</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{forms.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Forms</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {forms.filter(f => f.status === 'active').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Submissions</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {forms.reduce((sum, form) => sum + (form.submissions || 0), 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                      <Settings className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Draft Forms</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {forms.filter(f => f.status === 'draft').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Forms List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {forms.map((form) => (
                <Card key={form.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          {getTypeIcon(form.type)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{form.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary">
                              {getTypeLabel(form.type)}
                            </Badge>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {form.submissions || 0} submissions
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(form.status)}>
                        {form.status}
                      </Badge>
                    </div>
                    <CardDescription className="mt-2">
                      {form.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Submissions:</span>
                        <span className="font-medium">{form.submissions || 0}</span>
                      </div>
                      
                      {form.lastSubmission && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Last submission:</span>
                          <span className="font-medium">{form.lastSubmission}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Created:</span>
                        <span className="font-medium">{form.createdAt}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" className="w-full">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            setSelectedForm({ id: form.id, title: form.title });
                            setSmsDialogOpen(true);
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Send SMS
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            setSelectedForm({ id: form.id, title: form.title });
                            setSubmissionsDialogOpen(true);
                          }}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Submissions
                        </Button>
                        <Button variant="outline" size="sm" className="w-full col-span-2">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Empty State */}
            {forms.length === 0 && (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <FileText className="h-12 w-12" />
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No forms yet</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get started by creating your first form.
                </p>
                <div className="mt-6">
                  <Button 
                    onClick={() => setIsFormOpen(true)}
                    variant="default"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Build Form
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Form Builder Modal */}
      <FormBuilder 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen}
      />

      {/* Send SMS Dialog */}
      {selectedForm && (
        <SendFormSMSDialog
          open={smsDialogOpen}
          onOpenChange={setSmsDialogOpen}
          formId={selectedForm.id}
          formTitle={selectedForm.title}
        />
      )}

      {/* Form Submissions Dialog */}
      {selectedForm && (
        <FormSubmissionsDialog
          open={submissionsDialogOpen}
          onOpenChange={setSubmissionsDialogOpen}
          formId={selectedForm.id}
          formTitle={selectedForm.title}
        />
      )}
    </div>
  );
};

export default FormsPage; 