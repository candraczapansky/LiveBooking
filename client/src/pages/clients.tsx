import { useState, useEffect } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useLocation } from "wouter";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PlusCircle, Search, Edit, Trash2, MoreHorizontal, Calendar, ArrowLeft, CreditCard, ChevronDown, ChevronRight, Download } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getInitials, getFullName } from "@/lib/utils";
import ClientPaymentMethods from "@/components/payment/client-payment-methods";
// Square payment configuration
const SQUARE_APP_ID = import.meta.env.VITE_SQUARE_APPLICATION_ID;

type Client = {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  emailAccountManagement?: boolean;
  emailAppointmentReminders?: boolean;
  emailPromotions?: boolean;
  smsAccountManagement?: boolean;
  smsAppointmentReminders?: boolean;
  smsPromotions?: boolean;
  role: string;
  createdAt?: string;
};

const clientFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  // Communication preferences
  emailAccountManagement: z.boolean().optional(),
  emailAppointmentReminders: z.boolean().optional(),
  emailPromotions: z.boolean().optional(),
  smsAccountManagement: z.boolean().optional(),
  smsAppointmentReminders: z.boolean().optional(),
  smsPromotions: z.boolean().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

const ClientsPage = () => {
  useDocumentTitle("Clients | BeautyBook");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [clientDetail, setClientDetail] = useState<Client | null>(null);
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const [isAddingPaymentMethod, setIsAddingPaymentMethod] = useState(false);
  const [location] = useLocation();

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

  // Handle quick action navigation
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split('?')[1] || '');
    if (searchParams.get('new') === 'true') {
      setIsAddDialogOpen(true);
      // Clean up URL without triggering navigation
      window.history.replaceState({}, '', '/clients');
    }
  }, [location]);

  const { data: clients, isLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      // In a real app, we would have a dedicated endpoint for clients
      // For this demo, we'll fetch all users and filter for clients
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch clients');
      const users = await response.json();
      return users.filter((user: Client) => user.role === 'client');
    }
  });

  const addForm = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      emailAccountManagement: true,
      emailAppointmentReminders: true,
      emailPromotions: false,
      smsAccountManagement: false,
      smsAppointmentReminders: true,
      smsPromotions: false,
    },
  });

  const editForm = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      emailAccountManagement: true,
      emailAppointmentReminders: true,
      emailPromotions: false,
      smsAccountManagement: false,
      smsAppointmentReminders: true,
      smsPromotions: false,
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      return apiRequest("POST", "/api/clients", data);
    },
    onSuccess: async (response) => {
      const newClient = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
      // If payment method section is shown and we're adding a payment method, proceed
      if (showPaymentSection && isAddingPaymentMethod) {
        setClientDetail(newClient);
        setViewMode('detail');
        setIsAddDialogOpen(false);
        addForm.reset();
        setShowPaymentSection(false);
        setIsAddingPaymentMethod(false);
        toast({
          title: "Success",
          description: "Client created successfully. You can now add payment methods.",
        });
      } else {
        toast({
          title: "Success",
          description: "Client created successfully",
        });
        addForm.reset();
        setIsAddDialogOpen(false);
        setShowPaymentSection(false);
        setIsAddingPaymentMethod(false);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create client: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ClientFormValues> }) => {
      return apiRequest("PUT", `/api/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Success",
        description: "Client updated successfully",
      });
      editForm.reset();
      setIsEditDialogOpen(false);
      setSelectedClient(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update client: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedClient(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete client: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleAddClient = async (values: ClientFormValues) => {
    // If payment method is selected, we need to handle both client creation and payment setup
    if (isAddingPaymentMethod) {
      // Create client first, then handle payment method in the success callback
      createClientMutation.mutate(values);
    } else {
      // Regular client creation without payment method
      createClientMutation.mutate(values);
    }
  };

  const handleEditClient = (values: ClientFormValues) => {
    if (selectedClient) {
      updateClientMutation.mutate({
        id: selectedClient.id,
        data: values
      });
    }
  };

  const handleDeleteClient = () => {
    if (selectedClient) {
      deleteClientMutation.mutate(selectedClient.id);
    }
  };

  const openEditDialog = (client: Client) => {
    setSelectedClient(client);
    editForm.reset({
      email: client.email,
      firstName: client.firstName || "",
      lastName: client.lastName || "",
      phone: client.phone || "",
      address: client.address || "",
      city: client.city || "",
      state: client.state || "",
      zipCode: client.zipCode || "",
      emailAccountManagement: client.emailAccountManagement ?? true,
      emailAppointmentReminders: client.emailAppointmentReminders ?? true,
      emailPromotions: client.emailPromotions ?? false,
      smsAccountManagement: client.smsAccountManagement ?? true,
      smsAppointmentReminders: client.smsAppointmentReminders ?? true,
      smsPromotions: client.smsPromotions ?? false,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (client: Client) => {
    setSelectedClient(client);
    setIsDeleteDialogOpen(true);
  };

  const handleViewClient = (client: Client) => {
    setClientDetail(client);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setClientDetail(null);
  };

  const handleExportClients = () => {
    if (!clients || clients.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no clients to export.",
        variant: "destructive",
      });
      return;
    }

    // Define CSV headers
    const headers = [
      'ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Username',
      'Address', 'City', 'State', 'ZIP Code', 'Join Date',
      'Email Account Management', 'Email Appointment Reminders', 'Email Promotions',
      'SMS Account Management', 'SMS Appointment Reminders', 'SMS Promotions'
    ];

    // Convert clients data to CSV format
    const csvData = clients.map(client => [
      client.id,
      client.firstName || '',
      client.lastName || '',
      client.email,
      client.phone || '',
      client.username,
      client.address || '',
      client.city || '',
      client.state || '',
      client.zipCode || '',
      client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '',
      client.emailAccountManagement ? 'Yes' : 'No',
      client.emailAppointmentReminders ? 'Yes' : 'No',
      client.emailPromotions ? 'Yes' : 'No',
      client.smsAccountManagement ? 'Yes' : 'No',
      client.smsAppointmentReminders ? 'Yes' : 'No',
      client.smsPromotions ? 'Yes' : 'No'
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clients_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `Exported ${clients.length} clients to CSV file.`,
    });
  };

  const filteredClients = clients?.filter((client: Client) =>
    client.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.firstName && client.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (client.lastName && client.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (client.phone && client.phone.includes(searchQuery))
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarOpen ? 'ml-64' : 'ml-0'
      }`}>
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {viewMode === 'list' ? (
              <>
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clients</h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Manage your salon clients
                    </p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="relative flex-1 sm:flex-none">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <Input
                        type="search"
                        placeholder="Search clients..."
                        className="pl-8 w-full sm:w-[250px]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2 sm:gap-4">
                      <Button
                        variant="outline"
                        onClick={handleExportClients}
                        className="flex-1 sm:flex-none min-h-[44px]"
                        size="default"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                      <Button 
                        onClick={() => setIsAddDialogOpen(true)}
                        className="flex-1 sm:flex-none min-h-[44px]"
                        size="default"
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Client
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Client Detail Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      onClick={handleBackToList}
                      className="flex items-center gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Clients
                    </Button>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {getFullName(clientDetail?.firstName, clientDetail?.lastName) || clientDetail?.username}
                      </h1>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Client Profile & Payment Methods
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => clientDetail && openEditDialog(clientDetail)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Client
                    </Button>
                  </div>
                </div>
              </>
            )}
            
            {viewMode === 'list' ? (
              <Card>
              <CardHeader className="px-6 py-4">
                <CardTitle>All Clients</CardTitle>
                <CardDescription>
                  View and manage all your salon clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : filteredClients?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No clients found. {searchQuery ? 'Try a different search term.' : 'Add your first client!'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients?.map((client: Client) => (
                        <TableRow key={client.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarFallback>
                                  {getInitials(client.firstName, client.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">
                                  {getFullName(client.firstName, client.lastName)}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{client.email}</TableCell>
                          <TableCell>{client.phone || "-"}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="default"
                                  className="min-h-[44px] min-w-[44px] p-2"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewClient(client)}>
                                  <CreditCard className="h-4 w-4 mr-2" /> View Details & Cards
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toast({ title: "Feature Coming Soon", description: "Appointments view will be available soon!" })}>
                                  <Calendar className="h-4 w-4 mr-2" /> Appointments
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(client)}>
                                  <Edit className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => openDeleteDialog(client)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            ) : (
              // Client Detail View with Payment Methods
              <div className="space-y-6">
                {/* Back Button */}
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    onClick={handleBackToList}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Clients
                  </Button>
                </div>
                {/* Client Information Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="text-lg">
                          {getInitials(clientDetail?.firstName, clientDetail?.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-semibold">
                          {getFullName(clientDetail?.firstName, clientDetail?.lastName) || clientDetail?.username}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Client since {new Date(clientDetail?.createdAt || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Contact Information */}
                      <div>
                        <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Contact Information</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Email:</span>
                            <span className="ml-2">{clientDetail?.email}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                            <span className="ml-2">{clientDetail?.phone || "Not provided"}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Username:</span>
                            <span className="ml-2">{clientDetail?.username}</span>
                          </div>
                        </div>
                      </div>

                      {/* Address Information */}
                      <div>
                        <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Address</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Street:</span>
                            <span className="ml-2">{clientDetail?.address || "Not provided"}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">City:</span>
                            <span className="ml-2">{clientDetail?.city || "Not provided"}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">State:</span>
                            <span className="ml-2">{clientDetail?.state || "Not provided"}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">ZIP Code:</span>
                            <span className="ml-2">{clientDetail?.zipCode || "Not provided"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Communication Preferences */}
                      <div>
                        <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Communication Preferences</h4>
                        <div className="space-y-3 text-sm">
                          <div>
                            <h5 className="font-medium text-xs text-gray-700 dark:text-gray-300 mb-2">Email Notifications</h5>
                            <div className="space-y-1 pl-2">
                              <div className="flex items-center">
                                <span className="text-gray-500 dark:text-gray-400">Account Management:</span>
                                <span className={`ml-2 ${clientDetail?.emailAccountManagement ? 'text-green-600' : 'text-red-600'}`}>
                                  {clientDetail?.emailAccountManagement ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <span className="text-gray-500 dark:text-gray-400">Appointment Reminders:</span>
                                <span className={`ml-2 ${clientDetail?.emailAppointmentReminders ? 'text-green-600' : 'text-red-600'}`}>
                                  {clientDetail?.emailAppointmentReminders ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <span className="text-gray-500 dark:text-gray-400">Promotions:</span>
                                <span className={`ml-2 ${clientDetail?.emailPromotions ? 'text-green-600' : 'text-red-600'}`}>
                                  {clientDetail?.emailPromotions ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h5 className="font-medium text-xs text-gray-700 dark:text-gray-300 mb-2">SMS Notifications</h5>
                            <div className="space-y-1 pl-2">
                              <div className="flex items-center">
                                <span className="text-gray-500 dark:text-gray-400">Account Management:</span>
                                <span className={`ml-2 ${clientDetail?.smsAccountManagement ? 'text-green-600' : 'text-red-600'}`}>
                                  {clientDetail?.smsAccountManagement ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <span className="text-gray-500 dark:text-gray-400">Appointment Reminders:</span>
                                <span className={`ml-2 ${clientDetail?.smsAppointmentReminders ? 'text-green-600' : 'text-red-600'}`}>
                                  {clientDetail?.smsAppointmentReminders ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <span className="text-gray-500 dark:text-gray-400">Promotions:</span>
                                <span className={`ml-2 ${clientDetail?.smsPromotions ? 'text-green-600' : 'text-red-600'}`}>
                                  {clientDetail?.smsPromotions ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Methods */}
                {clientDetail && (
                  <ClientPaymentMethods 
                    clientId={clientDetail.id} 
                    clientName={getFullName(clientDetail.firstName, clientDetail.lastName) || clientDetail.username}
                  />
                )}
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Add Client Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Create a new client by filling out the form below.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAddClient)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter email address" 
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                          data-lpignore="true"
                          data-form-type="other"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="(123) 456-7890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Address Section */}
              <div className="space-y-4">
                <FormField
                  control={addForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={addForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="New York" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="NY" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={addForm.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="10001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Communication Preferences Section */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Communication Preferences</h4>
                
                <div className="space-y-3">
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Email Notifications</div>
                  <div className="grid grid-cols-1 gap-3 pl-4">
                    <FormField
                      control={addForm.control}
                      name="emailAccountManagement"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="mt-0.5"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none flex-1">
                            <FormLabel className="text-sm cursor-pointer" onClick={() => field.onChange(!field.value)}>
                              Account Management
                            </FormLabel>
                            <FormDescription className="text-xs">Receipts, billing updates, booking confirmations, account changes</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="emailAppointmentReminders"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="mt-0.5"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none flex-1">
                            <FormLabel className="text-sm cursor-pointer" onClick={() => field.onChange(!field.value)}>
                              Appointment Reminders
                            </FormLabel>
                            <FormDescription className="text-xs">Booking confirmations and reminder notifications for appointments</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="emailPromotions"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="mt-0.5"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none flex-1">
                            <FormLabel className="text-sm cursor-pointer" onClick={() => field.onChange(!field.value)}>
                              Promotions & Marketing
                            </FormLabel>
                            <FormDescription className="text-xs">Special offers, new services, and promotional content</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 mt-4">SMS Notifications</div>
                  <div className="grid grid-cols-1 gap-3 pl-4">
                    <FormField
                      control={addForm.control}
                      name="smsAccountManagement"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="mt-0.5"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none flex-1">
                            <FormLabel className="text-sm cursor-pointer" onClick={() => field.onChange(!field.value)}>
                              Account Management
                            </FormLabel>
                            <FormDescription className="text-xs">Receipts, billing updates, booking confirmations, account changes</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="smsAppointmentReminders"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="mt-0.5"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none flex-1">
                            <FormLabel className="text-sm cursor-pointer" onClick={() => field.onChange(!field.value)}>
                              Appointment Reminders
                            </FormLabel>
                            <FormDescription className="text-xs">Booking confirmations and reminder notifications for appointments</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="smsPromotions"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="mt-0.5"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none flex-1">
                            <FormLabel className="text-sm cursor-pointer" onClick={() => field.onChange(!field.value)}>
                              Promotions & Marketing
                            </FormLabel>
                            <FormDescription className="text-xs">Special offers and promotional texts</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
              
              {/* Optional Payment Method Section */}
              <div className="border-t pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowPaymentSection(!showPaymentSection)}
                  className="flex items-center gap-2 w-full justify-start p-0 h-auto"
                >
                  {showPaymentSection ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <CreditCard className="h-4 w-4" />
                  <span>Add Payment Method (Optional)</span>
                </Button>
                
                {showPaymentSection && (
                  <div className="mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Save time by adding a payment method during client creation.
                    </p>
                    
                    <div className="space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddingPaymentMethod(!isAddingPaymentMethod)}
                        className="w-full"
                      >
                        {isAddingPaymentMethod ? "Skip Payment Method" : "Add Payment Method Now"}
                      </Button>
                      
                      {isAddingPaymentMethod && (
                        <Elements stripe={stripePromise}>
                          <div className="space-y-4 border-t pt-4">
                            <div className="text-sm font-medium">Payment Card Information</div>
                            <div className="p-3 border rounded-lg bg-white dark:bg-gray-700">
                              <CardElement
                                options={{
                                  style: {
                                    base: {
                                      fontSize: '16px',
                                      color: '#424770',
                                      '::placeholder': {
                                        color: '#aab7c4',
                                      },
                                      iconColor: '#666EE8',
                                    },
                                    invalid: {
                                      color: '#9e2146',
                                    },
                                  },
                                }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              The card will be saved securely using Stripe after the client is created.
                            </p>
                          </div>
                        </Elements>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsAddDialogOpen(false);
                  setShowPaymentSection(false);
                  setIsAddingPaymentMethod(false);
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createClientMutation.isPending}>
                  {createClientMutation.isPending ? "Creating..." : 
                   isAddingPaymentMethod ? "Create Client & Add Payment Method" : "Create Client"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update the client's information below.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditClient)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              

              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter email address" 
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                          data-lpignore="true"
                          data-form-type="other"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="(123) 456-7890" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Address Section */}
              <div className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={editForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="New York" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="NY" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="10001" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Communication Preferences Section */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Communication Preferences</h4>
                
                <div className="space-y-3">
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Email Notifications</div>
                  <div className="grid grid-cols-1 gap-3 pl-4">
                    <FormField
                      control={editForm.control}
                      name="emailAccountManagement"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm">Account Management</FormLabel>
                            <FormDescription className="text-xs">Receipts, billing updates, booking confirmations, account changes</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="emailAppointmentReminders"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm">Appointment Reminders</FormLabel>
                            <FormDescription className="text-xs">Booking confirmations and reminder notifications for appointments</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="emailPromotions"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm">Promotions & Marketing</FormLabel>
                            <FormDescription className="text-xs">Special offers, new services, and promotional content</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 mt-4">SMS Notifications</div>
                  <div className="grid grid-cols-1 gap-3 pl-4">
                    <FormField
                      control={editForm.control}
                      name="smsAccountManagement"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm">Account Management</FormLabel>
                            <FormDescription className="text-xs">Receipts, billing updates, booking confirmations, account changes</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="smsAppointmentReminders"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm">Appointment Reminders</FormLabel>
                            <FormDescription className="text-xs">Booking confirmations and reminder notifications for appointments</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={editForm.control}
                      name="smsPromotions"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm">Promotions & Marketing</FormLabel>
                            <FormDescription className="text-xs">Special offers and promotional texts</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateClientMutation.isPending}>
                  {updateClientMutation.isPending ? "Updating..." : "Update Client"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Client Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the client{' '}
              <span className="font-semibold">
                {selectedClient && getFullName(selectedClient.firstName, selectedClient.lastName)}
              </span>{' '}
              and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteClient} 
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteClientMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClientsPage;
