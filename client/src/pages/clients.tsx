import { useState, useEffect, useRef } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useLocation } from "wouter";
import Papa from "papaparse";


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
import { PlusCircle, Search, Edit, Trash2, MoreHorizontal, Calendar, ArrowLeft, CreditCard, ChevronDown, ChevronRight, Download, Upload, FileText } from "lucide-react";
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
import ClientAppointmentHistory from "@/components/client/client-appointment-history";
import ClientFormSubmissions from "@/components/client/client-form-submissions";
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
  email: z.string(),
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
  useDocumentTitle("Clients | Glo Head Spa");
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
  
  // CSV Import state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  
  // Create a file input element programmatically as a fallback
  const createFileInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv,application/vnd.ms-excel,text/plain';
    input.style.display = 'none';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0] || null;
      processSelectedFile(file);
    };
    return input;
  };

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
    queryKey: ['/api/users?role=client'],
    queryFn: async () => {
      const response = await fetch('/api/users?role=client');
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
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
      // Invalidate all user-related queries with aggressive cache clearing
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users?role=client'] });
      queryClient.removeQueries({ queryKey: ['/api/users?role=client'] });
      // Force refetch client data for appointment forms
      queryClient.refetchQueries({ queryKey: ['/api/users?role=client'] });
      
      toast({
        title: "Success",
        description: "Client created successfully",
      });
      addForm.reset();
      setIsAddDialogOpen(false);
      setShowPaymentSection(false);
      setIsAddingPaymentMethod(false);
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
      // Invalidate all user-related queries with aggressive cache clearing
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users?role=client'] });
      queryClient.removeQueries({ queryKey: ['/api/users?role=client'] });
      // Force refetch client data for appointment forms
      queryClient.refetchQueries({ queryKey: ['/api/users?role=client'] });
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
      // Invalidate all user-related queries with aggressive cache clearing
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users?role=client'] });
      queryClient.removeQueries({ queryKey: ['/api/users?role=client'] });
      // Force refetch client data for appointment forms
      queryClient.refetchQueries({ queryKey: ['/api/users?role=client'] });
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

  const importClientsMutation = useMutation({
    mutationFn: async (clients: any[]) => {
      console.log('Sending import request with', clients.length, 'clients');
      return apiRequest("POST", "/api/clients/import", { clients });
    },
    onSuccess: async (response) => {
      console.log('Import response received:', response);
      const results = await response.json();
      console.log('Import results:', results);
      
      // Log any errors for debugging
      if (results.errors && results.errors.length > 0) {
        console.log('Import errors:', results.errors);
      }
      
      setImportResults(results);
      
      // Invalidate client queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users?role=client'] });
      queryClient.removeQueries({ queryKey: ['/api/users?role=client'] });
      queryClient.refetchQueries({ queryKey: ['/api/users?role=client'] });
      
      toast({
        title: "Import Complete",
        description: `Imported ${results.imported} clients, skipped ${results.skipped}`,
      });
    },
    onError: (error) => {
      console.error('Import mutation error:', error);
      toast({
        title: "Import Failed",
        description: `Failed to import clients: ${error.message || 'Unknown error occurred'}`,
        variant: "destructive",
      });
    }
  });

  const handleAddClient = async (values: ClientFormValues) => {
    createClientMutation.mutate(values);
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

  // CSV Import handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    processSelectedFile(file);
  };

  const processSelectedFile = (file: File | null) => {
    if (file) {
      // Check if it's a CSV file by extension or MIME type
      const isCSV = file.name.toLowerCase().endsWith('.csv') || 
                   file.type === 'text/csv' || 
                   file.type === 'application/vnd.ms-excel' ||
                   file.type === 'text/plain' ||
                   file.type === 'application/csv';
      
      if (isCSV) {
        setImportFile(file);
        setImportResults(null);
        toast({
          title: "File selected",
          description: `${file.name} has been selected for import.`,
        });
      } else {
        toast({
          title: "Invalid file type",
          description: `File type "${file.type}" is not supported. Please select a CSV file.`,
          variant: "destructive",
        });
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      processSelectedFile(file);
    }
  };

  const handleImportCSV = () => {
    if (!importFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    
    // First, let's read the file content to debug
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      console.log('File content preview (first 500 chars):', content.substring(0, 500));
      console.log('File content length:', content.length);
      console.log('File content lines:', content.split('\n').length);
      
      // Now parse the CSV
      Papa.parse(importFile, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        delimiter: ',',
        complete: (results) => {
        console.log('CSV parse results:', results);
        console.log('CSV meta:', results.meta);
        console.log('CSV errors:', results.errors);
        console.log('Raw data sample:', results.data.slice(0, 3));
        console.log('Total rows parsed:', results.data.length);
        
        const clients = results.data as any[];
        
        // Log the first few rows to see the structure
        console.log('First 3 rows structure:', clients.slice(0, 3).map((row, index) => ({
          rowIndex: index,
          keys: Object.keys(row),
          values: row
        })));
        
        if (clients.length === 0) {
          setIsImporting(false);
          toast({
            title: "No data found",
            description: `The CSV file appears to be empty or has no valid data. Parsed ${results.data.length} rows.`,
            variant: "destructive",
          });
          return;
        }
        
        // Validate and transform the data for new format: Last name, First name, Email, Phone number
        const validClients = clients.map((row: any, index: number) => {
          // Get all column names to help with debugging
          const columnNames = Object.keys(row);
          console.log(`Row ${index + 1} columns:`, columnNames);
          
          // Try multiple possible column names for each field, including the unusual ones from the CSV
          const email = row.email || row.Email || row.EMAIL || row['email'] || row['Email'] || 
                       row['narevalo2007@gmail.com'] || ''; // Handle the unusual email column
          const firstName = row.firstName || row['First Name'] || row['first name'] || row.first_name || 
                           row['firstName'] || row['First Name'] || row.nelly || ''; // Handle the unusual firstName column
          const lastName = row.lastName || row['Last Name'] || row['last name'] || row.last_name || 
                          row['lastName'] || row['Last Name'] || row.A || ''; // Handle the unusual lastName column
          const phone = row.phone || row.Phone || row.PHONE || row['phone'] || row['Phone'] || 
                       row['9182619317'] || ''; // Handle the unusual phone column
          
          // Debug the extracted values for the first few rows
          if (index < 5) {
            console.log(`Row ${index + 1} extracted values:`, {
              email: email,
              firstName: firstName,
              lastName: lastName,
              phone: phone,
              originalRow: row
            });
          }
          
          // Log phone extraction details for debugging
          console.log(`Row ${index + 1} phone extraction:`, {
            'row.phone': row.phone,
            'row.Phone': row.Phone,
            'row.PHONE': row.PHONE,
            'row["phone"]': row['phone'],
            'row["Phone"]': row['Phone'],
            'row["9182619317"]': row['9182619317'],
            'final phone value': phone
          });
          
          // Skip completely empty rows (check if any field has data)
          const hasAnyData = email.trim() || firstName.trim() || lastName.trim() || phone.trim();
          if (!hasAnyData) {
            console.log(`Row ${index + 1} is completely empty, skipping:`, row);
            return null;
          }
          
          // Log any rows with missing email for debugging
          if (!email || email.trim() === '') {
            console.log(`Row ${index + 1} has missing email, will generate placeholder:`, row);
          }
          
          return {
            email: email.trim(), // Keep as empty string, backend will generate placeholder
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            // Set default values for other fields
            address: '',
            city: '',
            state: '',
            zipCode: '',
            emailAccountManagement: true,
            emailAppointmentReminders: true,
            emailPromotions: false,
            smsAccountManagement: true,
            smsAppointmentReminders: true,
            smsPromotions: false,
          };
        }).filter(Boolean); // Remove null entries

        console.log('Valid clients to import:', validClients);
        
        // Debug: Show phone numbers being imported
        const clientsWithPhones = validClients.filter(client => client.phone && client.phone.trim() !== '');
        console.log('Clients with phone numbers:', clientsWithPhones.length, 'out of', validClients.length);
        if (clientsWithPhones.length > 0) {
          console.log('Sample phone numbers:', clientsWithPhones.slice(0, 3).map(c => ({ name: `${c.firstName} ${c.lastName}`, phone: c.phone })));
        }
        
        // Check if we have any valid clients to import
        if (validClients.length === 0) {
          setIsImporting(false);
          toast({
            title: "No valid data found",
            description: "No valid client data found in the CSV file. Please check the file format and try again.",
            variant: "destructive",
          });
          return;
        }
        
        // Check if the import is too large
        if (validClients.length > 1000) {
          setIsImporting(false);
          toast({
            title: "Import too large",
            description: `Cannot import ${validClients.length} clients at once. Please split your file into smaller batches of 1000 or fewer clients.`,
            variant: "destructive",
          });
          return;
        }
        
        // Show progress for large imports
        if (validClients.length > 100) {
          toast({
            title: "Large import detected",
            description: `Importing ${validClients.length} clients. This may take a few moments...`,
          });
        }
        
        // Debug: Show phone number status
        if (clientsWithPhones.length === 0) {
          toast({
            title: "No phone numbers found",
            description: "No phone numbers were extracted from the CSV file. Check your column headers.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Phone numbers detected",
            description: `${clientsWithPhones.length} out of ${validClients.length} clients have phone numbers.`,
          });
        }
        
        importClientsMutation.mutate(validClients);
        setIsImporting(false);
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        setIsImporting(false);
        toast({
          title: "CSV Parse Error",
          description: `Failed to parse CSV file: ${error.message}`,
          variant: "destructive",
        });
      }
    });
    };
    reader.readAsText(importFile);
  };

  const resetImportDialog = () => {
    setImportFile(null);
    setImportResults(null);
    setIsImportDialogOpen(false);
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      {
        lastName: 'Doe',
        firstName: 'John',
        email: 'john.doe@example.com',
        phone: '(555) 123-4567'
      },
      {
        lastName: 'Smith',
        firstName: 'Jane',
        email: 'jane.smith@example.com',
        phone: '(555) 987-6543'
      },
      {
        lastName: 'Johnson',
        firstName: 'Mike',
        email: '',
        phone: '(555) 111-2222'
      },
      {
        lastName: 'Wilson',
        firstName: 'Bob',
        email: 'bob.wilson@example.com',
        phone: ''
      },
      {
        lastName: '',
        firstName: 'Alice',
        email: '',
        phone: ''
      }
    ];

    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client_import_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
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
    const csvData = (clients as any[]).map((client: any) => [
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
      ...csvData.map((row: any) => row.map((field: any) => `"${field}"`).join(','))
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
        sidebarOpen ? 'md:ml-64 ml-0' : 'ml-0'
      }`}>
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 md:p-6">
          <div className="max-w-7xl mx-auto px-2 sm:px-0">
            {viewMode === 'list' ? (
              <>
                {/* Mobile-Optimized Page Header */}
                <div className="space-y-4 mb-6">
                  {/* Title Section */}
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Clients</h1>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Manage your salon clients
                    </p>
                  </div>
                  
                  {/* Search Section */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <Input
                      type="search"
                      placeholder="Search clients..."
                      className="pl-10 h-12 sm:h-10 text-base sm:text-sm w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  {/* Action Buttons - Mobile First Design */}
                  <div className="space-y-3">
                    {/* Primary action - full width on mobile */}
                    <Button 
                      onClick={() => setIsAddDialogOpen(true)}
                      className="w-full h-12 sm:h-10 text-base sm:text-sm font-medium sm:w-auto"
                      size="default"
                    >
                      <PlusCircle className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
                      Add New Client
                    </Button>
                    
                    {/* Secondary actions - side by side on mobile */}
                    <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-2 sm:justify-start">
                      <Button
                        variant="outline"
                        onClick={handleExportClients}
                        className="h-12 sm:h-10 text-base sm:text-sm sm:w-auto"
                        size="default"
                      >
                        <Download className="h-5 w-5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">Export</span>
                        <span className="xs:hidden">Export</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsImportDialogOpen(true)}
                        className="h-12 sm:h-10 text-base sm:text-sm sm:w-auto"
                        size="default"
                      >
                        <Upload className="h-5 w-5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden xs:inline">Import</span>
                        <span className="xs:hidden">Import</span>
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
                        {getFullName(clientDetail?.firstName, clientDetail?.lastName) || 'Client Profile'}
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
                    <Button
                      variant="default"
                      onClick={() => {
                        // Navigate to forms page with client context
                        window.location.href = '/forms';
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Send Form
                    </Button>
                  </div>
                </div>
              </>
            )}
            
            {viewMode === 'list' ? (
              <Card>
              <CardHeader className="px-4 sm:px-6 py-4">
                <CardTitle className="text-lg sm:text-xl">All Clients</CardTitle>
                <CardDescription>
                  View and manage all your salon clients
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : filteredClients?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No clients found. {searchQuery ? 'Try a different search term.' : 'Add your first client!'}
                  </div>
                ) : (
                  <>
                    {/* Mobile Card Layout - Hidden on Desktop */}
                    <div className="block sm:hidden space-y-3">
                      {filteredClients?.map((client: Client) => (
                        <Card key={client.id} className="p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <Avatar className="h-12 w-12 flex-shrink-0">
                                <AvatarFallback className="text-sm font-medium">
                                  {getInitials(client.firstName, client.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-base text-gray-900 dark:text-gray-100 truncate">
                                  {getFullName(client.firstName, client.lastName)}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                  {client.email}
                                </div>
                                {client.phone && (
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {client.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="default"
                                  className="h-10 w-10 p-0 flex-shrink-0 ml-2"
                                >
                                  <MoreHorizontal className="h-5 w-5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem onClick={() => handleViewClient(client)} className="py-3">
                                  <CreditCard className="h-4 w-4 mr-3" /> 
                                  <span>View Details & Cards</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewClient(client)} className="py-3">
                                  <Calendar className="h-4 w-4 mr-3" /> 
                                  <span>Appointments</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(client)} className="py-3">
                                  <Edit className="h-4 w-4 mr-3" /> 
                                  <span>Edit</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => openDeleteDialog(client)}
                                  className="text-red-600 focus:text-red-600 py-3"
                                >
                                  <Trash2 className="h-4 w-4 mr-3" /> 
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Desktop Table Layout - Hidden on Mobile */}
                    <div className="hidden sm:block">
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
                                    <DropdownMenuItem onClick={() => handleViewClient(client)}>
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
                    </div>
                  </>
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
                          {getFullName(clientDetail?.firstName, clientDetail?.lastName) || 'Client'}
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
                    clientName={getFullName(clientDetail.firstName, clientDetail.lastName) || 'Client'}
                  />
                )}

                {/* Appointment History */}
                {clientDetail && <ClientAppointmentHistory clientId={clientDetail.id} />}

                {/* Form Submissions */}
                {clientDetail && (
                  <ClientFormSubmissions 
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
            <form onSubmit={addForm.handleSubmit(handleAddClient)} className="space-y-4" noValidate>
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
                        <input
                          type="text" 
                          placeholder="Enter email address" 
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                          style={{
                            borderColor: 'hsl(var(--border))',
                            boxShadow: 'none'
                          }}
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
                        <div className="space-y-4 border-t pt-4">
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Payment methods can be added after client creation using Square integration
                          </div>
                        </div>
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
            <form onSubmit={editForm.handleSubmit(handleEditClient)} className="space-y-4" noValidate>
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
                        <input
                          type="text" 
                          placeholder="Enter email address" 
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                          style={{
                            borderColor: 'hsl(var(--border))',
                            boxShadow: 'none'
                          }}
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

      {/* CSV Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Clients from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import multiple clients at once. Download the sample file to see the format. 
              <br />
              <span className="text-green-600 font-medium">✓ All fields are optional! Missing emails will be auto-generated.</span>
              <br />
              <span className="text-orange-600 font-medium">Note: Large files (over 1000 clients) should be split into smaller batches for better performance.</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Sample CSV Download */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900">Sample CSV Template</h4>
                  <p className="text-sm text-blue-700 mt-1">Download to see the required format and column headers</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadSampleCSV}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Sample
                </Button>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select CSV File</label>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => {
                  const input = createFileInput();
                  document.body.appendChild(input);
                  input.click();
                  setTimeout(() => {
                    if (document.body.contains(input)) {
                      document.body.removeChild(input);
                    }
                  }, 1000);
                }}
              >
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-gray-400" />
                  {importFile ? (
                    <div>
                      <p className="text-sm font-medium text-green-600">{importFile.name}</p>
                      <p className="text-xs text-gray-500">File selected successfully</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium">Click to select CSV file</p>
                      <p className="text-xs text-gray-500">Or drag and drop your file here</p>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      const input = createFileInput();
                      document.body.appendChild(input);
                      input.click();
                      setTimeout(() => {
                        if (document.body.contains(input)) {
                          document.body.removeChild(input);
                        }
                      }, 1000);
                    }}
                    className="mt-2"
                  >
                    {importFile ? 'Change File' : 'Choose File'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Import Results */}
            {importResults && (
              <div className="p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-medium mb-2">Import Results</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Successfully imported:</span>
                    <span className="font-medium text-green-600">{importResults.imported} clients</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Skipped (duplicates/errors):</span>
                    <span className="font-medium text-orange-600">{importResults.skipped} clients</span>
                  </div>
                  {importResults.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium text-red-600 mb-1">Errors:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {importResults.errors.map((error, index) => (
                          <p key={index} className="text-xs text-red-600">{error}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={resetImportDialog}>
              {importResults ? 'Close' : 'Cancel'}
            </Button>
            {!importResults && (
              <Button 
                onClick={handleImportCSV} 
                disabled={!importFile || isImporting}
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Clients
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsPage;
