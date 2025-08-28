import { useState, useEffect } from "react";
import { SidebarController } from "@/components/layout/sidebar";
// import Header from "@/components/layout/header"; // Provided by MainLayout
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ensureAuthenticated, refreshToken } from "@/lib/auth-helper";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  PlusCircle, 
  MapPin, 
  Edit,
  Trash2,
  Star,
  StarOff,
  CheckCircle,
  XCircle,
  Building2,
  Phone,
  Mail,
  Globe,
  Clock,
  RefreshCw,
  CreditCard
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import TerminalManagement from "@/components/payment/terminal-management";

type Location = {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
  email?: string;
  timezone: string;
  isActive: boolean;
  isDefault: boolean;
  description?: string;
  businessHours?: string;
  createdAt: string;
  updatedAt: string;
};

const locationFormSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  timezone: z.string().default("America/New_York"),
  description: z.string().optional(),
  businessHours: z.string().optional(),
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

const LocationsPage = () => {
  useDocumentTitle("Locations | Glo Head Spa");
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [locationToEdit, setLocationToEdit] = useState<Location | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [inlineEdits, setInlineEdits] = useState<Record<number, { phone?: string; email?: string }>>({});
  const [terminalDialogOpen, setTerminalDialogOpen] = useState(false);
  const [selectedLocationForTerminal, setSelectedLocationForTerminal] = useState<Location | null>(null);

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

  // Ensure authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsAuthenticating(true);
      try {
        const isAuth = await ensureAuthenticated();
        if (!isAuth) {
          toast({
            title: "Authentication Required",
            description: "Please log in to access locations.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        toast({
          title: "Authentication Error",
          description: "Please log in to access locations.",
          variant: "destructive",
        });
      } finally {
        setIsAuthenticating(false);
      }
    };

    checkAuth();
  }, [toast]);

  // Form setup
  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      email: "",
      timezone: "America/New_York",
      description: "",
      businessHours: "",
    },
  });

  // Fetch locations
  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/locations");
      return response.json();
    },
    enabled: !isAuthenticating, // Only fetch when not authenticating
  });

  // Create location mutation
  const createLocationMutation = useMutation({
    mutationFn: async (data: LocationFormValues) => {
      const response = await apiRequest("POST", "/api/locations", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      setIsFormOpen(false);
      form.reset();
      toast({
        title: "Location created",
        description: "New location has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create location",
        variant: "destructive",
      });
    },
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: LocationFormValues }) => {
      const response = await apiRequest("PUT", `/api/locations/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      setIsFormOpen(false);
      setLocationToEdit(null);
      form.reset();
      toast({
        title: "Location updated",
        description: "Location has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update location",
        variant: "destructive",
      });
    },
  });

  // Delete location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/locations/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      toast({
        title: "Location deleted",
        description: "Location has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete location",
        variant: "destructive",
      });
    },
  });

  // Set default location mutation
  const setDefaultLocationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("PATCH", `/api/locations/${id}/set-default`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      toast({
        title: "Default location updated",
        description: "Default location has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update default location",
        variant: "destructive",
      });
    },
  });

  // Toggle location active status mutation
  const toggleLocationActiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("PATCH", `/api/locations/${id}/toggle-active`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      toast({
        title: "Location status updated",
        description: "Location active status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update location status",
        variant: "destructive",
      });
    },
  });

  // Inline partial update for quick edits (e.g., phone/email)
  const updateInlineFieldsMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<LocationFormValues> }) => {
      const response = await apiRequest("PUT", `/api/locations/${id}`, data);
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      setInlineEdits((prev) => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
      toast({
        title: "Saved",
        description: "Location details updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update location",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = async (data: LocationFormValues) => {
    // Ensure authentication before submitting
    const isAuth = await ensureAuthenticated();
    if (!isAuth) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save locations.",
        variant: "destructive",
      });
      return;
    }

    if (locationToEdit) {
      updateLocationMutation.mutate({ id: locationToEdit.id, data });
    } else {
      createLocationMutation.mutate(data);
    }
  };

  // Handle edit location
  const handleEditLocation = (location: Location) => {
    setLocationToEdit(location);
    form.reset({
      name: location.name,
      address: location.address,
      city: location.city,
      state: location.state,
      zipCode: location.zipCode,
      phone: location.phone || "",
      email: location.email || "",
      timezone: location.timezone,
      description: location.description || "",
      businessHours: location.businessHours || "",
    });
    setIsFormOpen(true);
  };

  // Handle delete location
  const handleDeleteLocation = (location: Location) => {
    if (confirm(`Are you sure you want to delete "${location.name}"? This action cannot be undone.`)) {
      deleteLocationMutation.mutate(location.id);
    }
  };

  // Handle set default location
  const handleSetDefault = (location: Location) => {
    if (!location.isDefault) {
      setDefaultLocationMutation.mutate(location.id);
    }
  };

  // Handle toggle active status
  const handleToggleActive = (location: Location) => {
    if (location.isDefault && location.isActive) {
      toast({
        title: "Cannot deactivate default location",
        description: "Please set another location as default first.",
        variant: "destructive",
      });
      return;
    }
    toggleLocationActiveMutation.mutate(location.id);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      
      <div className={`flex flex-col transition-all duration-300 ${
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
      }`}>
        
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Locations</h1>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  Manage your business locations and settings
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex gap-3">
                <Button 
                  onClick={async () => {
                    try {
                      await refreshToken();
                      toast({
                        title: "Token Refreshed",
                        description: "Authentication token has been refreshed.",
                      });
                    } catch (error) {
                      toast({
                        title: "Refresh Failed",
                        description: "Failed to refresh authentication token.",
                        variant: "destructive",
                      });
                    }
                  }}
                  variant="brandOutline"
                  className="w-full sm:w-auto"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Auth
                </Button>
                <Button 
                  onClick={() => {
                    setLocationToEdit(null);
                    form.reset();
                    setIsFormOpen(true);
                  }}
                  variant="brandOutline"
                  className="w-full sm:w-auto"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </div>
            </div>
            
            {/* Authentication Loading */}
            {isAuthenticating && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Checking authentication...</span>
              </div>
            )}

            {/* Locations Grid */}
            {!isAuthenticating && (
              isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Loading locations...</span>
                </div>
              ) : locations.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Building2 className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Locations Found</h3>
                    <p className="text-sm text-gray-500 mb-4 text-center max-w-md">
                      Add your first business location to get started.
                    </p>
                    <Button 
                      onClick={() => {
                        setLocationToEdit(null);
                        form.reset();
                        setIsFormOpen(true);
                      }}
                      variant="outline"
                      className="bg-transparent border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Location
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {locations.map((location) => (
                  <Card key={location.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-3">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg font-semibold line-clamp-1">{location.name}</CardTitle>
                          <div className="flex gap-1">
                            {location.isDefault && (
                              <Badge variant="default" className="text-xs px-1.5 py-0">
                                <Star className="h-3 w-3" />
                              </Badge>
                            )}
                            <Badge 
                              variant={location.isActive ? "default" : "secondary"} 
                              className={`text-xs px-1.5 py-0 ${location.isActive ? "bg-green-500" : ""}`}
                            >
                              {location.isActive ? "✓" : "✗"}
                            </Badge>
                          </div>
                        </div>
                        <CardDescription className="text-xs line-clamp-2">
                          <span>{location.address}</span><br/>
                          <span>{location.city}, {location.state} {location.zipCode}</span>
                        </CardDescription>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pb-3 px-4 flex-1">
                      <div className="space-y-2 text-sm">
                        {location.phone && location.phone.trim() !== "" && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Phone className="h-3 w-3" />
                            <span className="truncate">{location.phone}</span>
                          </div>
                        )}

                        {location.email && location.email.trim() !== "" && (
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{location.email}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Globe className="h-3 w-3" />
                          <span className="text-xs">{location.timezone}</span>
                        </div>
                        
                        {location.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 pt-1 line-clamp-2">
                            {location.description}
                          </div>
                        )}
                      </div>
                    </CardContent>
                    
                    <CardFooter className="p-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-2 gap-1 w-full">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditLocation(location)}
                          className="text-xs h-8"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLocationForTerminal(location);
                            setTerminalDialogOpen(true);
                          }}
                          className="text-xs h-8"
                        >
                          <CreditCard className="h-3 w-3 mr-1" />
                          Terminal
                        </Button>
                        
                        {!location.isDefault ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(location)}
                            className="text-xs h-8"
                          >
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Button>
                        ) : (
                          <div></div>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(location)}
                          className="text-xs h-8"
                        >
                          {location.isActive ? (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Disable
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Enable
                            </>
                          )}
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )
          )}
        </div>
        </main>
      </div>
      
      {/* Location Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {locationToEdit ? "Edit Location" : "Add New Location"}
            </DialogTitle>
            <DialogDescription>
              {locationToEdit 
                ? "Update the location information below."
                : "Add a new business location with all the necessary details."
              }
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Main Location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="New York" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="NY" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input placeholder="10001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="info@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                        <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                        <SelectItem value="America/Anchorage">Alaska Time (AKT)</SelectItem>
                        <SelectItem value="Pacific/Honolulu">Hawaii Time (HST)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of this location..."
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="businessHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Hours (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Monday-Friday: 9AM-6PM, Saturday: 10AM-4PM, Sunday: Closed"
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Enter business hours in any format that works for your business.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="outline"
                  className="bg-transparent border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300 transition-colors"
                  disabled={createLocationMutation.isPending || updateLocationMutation.isPending}
                >
                  {createLocationMutation.isPending || updateLocationMutation.isPending 
                    ? "Saving..." 
                    : locationToEdit 
                    ? "Update Location" 
                    : "Create Location"
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Terminal Management Dialog */}
      <Dialog open={terminalDialogOpen} onOpenChange={setTerminalDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Terminal Configuration - {selectedLocationForTerminal?.name}</DialogTitle>
            <DialogDescription>
              Configure and manage your Helcim Smart Terminal for this location
            </DialogDescription>
          </DialogHeader>
          {selectedLocationForTerminal && (
            <TerminalManagement locationId={String(selectedLocationForTerminal.id)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocationsPage; 