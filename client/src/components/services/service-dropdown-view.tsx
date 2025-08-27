import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDuration, formatPrice } from "@/lib/utils";
import ServiceForm from "./service-form";
import { Edit, Trash2, PlusCircle, Eye, EyeOff } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Service = {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
  categoryId: number;
  color: string;
  isHidden?: boolean;
  category?: {
    id: number;
    name: string;
    description?: string;
  };
};

type ServiceCategory = {
  id: number;
  name: string;
  description?: string;
};

type ServiceDropdownViewProps = {
  initialCategoryId?: number | null;
};

const ServiceDropdownView = ({ initialCategoryId }: ServiceDropdownViewProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    initialCategoryId ? String(initialCategoryId) : "all"
  );
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"services" | "addons">("services");
  const [searchQuery, setSearchQuery] = useState("");
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null);

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/service-categories'],
    queryFn: async () => {
      const response = await fetch('/api/service-categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  // Fetch all services
  const { data: allServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const response = await fetch('/api/services');
      if (!response.ok) throw new Error('Failed to fetch services');
      return response.json();
    }
  });

  // Filter services based on selections and view mode
  const filteredServices = allServices.filter((service: Service) => {
    // Filter by view mode (services vs add-ons)
    if (viewMode === "addons" && !service.isHidden) return false;
    if (viewMode === "services" && service.isHidden) return false;

    // Filter by category
    if (selectedCategoryId !== "all" && service.categoryId !== Number(selectedCategoryId)) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return service.name.toLowerCase().includes(query) ||
             service.description?.toLowerCase().includes(query);
    }

    return true;
  });

  // Get the selected service details
  const selectedService = selectedServiceId 
    ? allServices.find((s: Service) => s.id === Number(selectedServiceId))
    : null;

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({
        title: "Success",
        description: "Service deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setServiceToDelete(null);
      setSelectedServiceId("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete service: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleDeleteService = () => {
    if (serviceToDelete) {
      deleteServiceMutation.mutate(serviceToDelete);
    }
  };

  const openDeleteDialog = (serviceId: number) => {
    setServiceToDelete(serviceId);
    setIsDeleteDialogOpen(true);
  };

  const handleEditService = (serviceId: number) => {
    setEditingServiceId(serviceId);
    setIsServiceFormOpen(true);
  };

  const handleServiceCreated = (categoryId?: number) => {
    if (categoryId) {
      setSelectedCategoryId(String(categoryId));
    }
    setIsServiceFormOpen(false);
    setEditingServiceId(null);
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Service Management - Dropdown View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* View Mode Toggle */}
            <div>
              <Label htmlFor="view-mode">View Mode</Label>
              <Select value={viewMode} onValueChange={(value: "services" | "addons") => {
                setViewMode(value);
                setSelectedServiceId("");
              }}>
                <SelectTrigger id="view-mode">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="services">
                    <div className="flex items-center">
                      <Eye className="w-4 h-4 mr-2" />
                      Regular Services
                    </div>
                  </SelectItem>
                  <SelectItem value="addons">
                    <div className="flex items-center">
                      <EyeOff className="w-4 h-4 mr-2" />
                      Add-On Services
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Dropdown */}
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategoryId} onValueChange={(value) => {
                setSelectedCategoryId(value);
                setSelectedServiceId("");
              }}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category: ServiceCategory) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service/Add-on Dropdown */}
            <div>
              <Label htmlFor="service">
                {viewMode === "services" ? "Service" : "Add-On"}
              </Label>
              <Select 
                value={selectedServiceId} 
                onValueChange={setSelectedServiceId}
                disabled={filteredServices.length === 0}
              >
                <SelectTrigger id="service">
                  <SelectValue placeholder={
                    filteredServices.length === 0 
                      ? `No ${viewMode === "services" ? "services" : "add-ons"} available`
                      : `Select ${viewMode === "services" ? "service" : "add-on"}`
                  } />
                </SelectTrigger>
                <SelectContent>
                  {filteredServices.map((service: Service) => (
                    <SelectItem key={service.id} value={String(service.id)}>
                      <div className="flex items-center justify-between w-full">
                        <span>{service.name}</span>
                        <span className="ml-2 text-sm text-muted-foreground">
                          {formatPrice(service.price)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => {
                setIsServiceFormOpen(true);
                setEditingServiceId(null);
              }}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add {viewMode === "services" ? "Service" : "Add-On"}
            </Button>
            
            {selectedService && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleEditService(selectedService.id)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Selected
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => openDeleteDialog(selectedService.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Service Details */}
      {selectedService && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {selectedService.name}
                {selectedService.isHidden && (
                  <Badge variant="secondary">Add-On</Badge>
                )}
              </CardTitle>
              <div 
                className="w-6 h-6 rounded-full border-2" 
                style={{ backgroundColor: selectedService.color }}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <Label>Description</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedService.description || "No description provided"}
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Category</Label>
                  <p className="text-sm font-medium">
                    {selectedService.category?.name || "Uncategorized"}
                  </p>
                </div>
                <div>
                  <Label>Duration</Label>
                  <p className="text-sm font-medium">
                    {formatDuration(selectedService.duration)}
                  </p>
                </div>
                <div>
                  <Label>Price</Label>
                  <p className="text-sm font-medium">
                    {formatPrice(selectedService.price)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {viewMode === "services" ? "All Services" : "All Add-Ons"}
            {selectedCategoryId !== "all" && ` - ${categories.find((c: ServiceCategory) => c.id === Number(selectedCategoryId))?.name}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {servicesLoading || categoriesLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-center">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-primary rounded-full" />
                <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
              </div>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No {viewMode === "services" ? "services" : "add-ons"} found
                {selectedCategoryId !== "all" && " in this category"}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
              <Button 
                className="mt-4"
                onClick={() => {
                  setIsServiceFormOpen(true);
                  setEditingServiceId(null);
                }}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add {viewMode === "services" ? "Service" : "Add-On"}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-center">Color</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service: Service) => (
                  <TableRow 
                    key={service.id}
                    className={selectedServiceId === String(service.id) ? "bg-muted/50" : ""}
                    onClick={() => setSelectedServiceId(String(service.id))}
                    style={{ cursor: "pointer" }}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {service.name}
                        {service.isHidden && (
                          <Badge variant="secondary" className="text-xs">Add-On</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{service.category?.name || "—"}</TableCell>
                    <TableCell>{formatDuration(service.duration)}</TableCell>
                    <TableCell>{formatPrice(service.price)}</TableCell>
                    <TableCell className="text-center">
                      <div 
                        className="w-6 h-6 rounded-full border mx-auto" 
                        style={{ backgroundColor: service.color }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditService(service.id);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog(service.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Service Form Modal */}
      <ServiceForm 
        open={isServiceFormOpen} 
        onOpenChange={setIsServiceFormOpen}
        onServiceCreated={handleServiceCreated}
        serviceId={editingServiceId}
        defaultIsHidden={viewMode === "addons"}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {viewMode === "services" ? "service" : "add-on"} 
              {serviceToDelete && allServices.find((s: Service) => s.id === serviceToDelete) && 
                ` "${allServices.find((s: Service) => s.id === serviceToDelete).name}"`
              }.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteService} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ServiceDropdownView;
