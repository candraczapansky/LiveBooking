import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDuration, formatPrice } from "@/lib/utils";
import ServiceForm from "./service-form";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Trash2, Search } from "lucide-react";

type Service = {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
  categoryId: number;
  color: string;
  category?: {
    id: number;
    name: string;
    description?: string;
  };
};

type ServiceListProps = {
  categoryId: number | null; // Allow null for "all categories"
};

const ServiceList = ({ categoryId }: ServiceListProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null);

  const { data: services, isLoading } = useQuery({
    queryKey: ['/api/services', categoryId],
    queryFn: async () => {
      // If categoryId is null, fetch all services; otherwise filter by category
      const url = categoryId ? `/api/services?categoryId=${categoryId}` : '/api/services';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch services');
      return response.json();
    }
  });

  const { data: category } = useQuery({
    queryKey: ['/api/service-categories', categoryId],
    queryFn: async () => {
      const response = await fetch(`/api/service-categories/${categoryId}`);
      if (!response.ok) throw new Error('Failed to fetch category');
      return response.json();
    },
    enabled: !!categoryId // Only fetch category details when a specific category is selected
  });

  const { data: allStaff } = useQuery({
    queryKey: ['/api/staff'],
    queryFn: async () => {
      const response = await fetch('/api/staff');
      if (!response.ok) throw new Error('Failed to fetch staff');
      return response.json();
    }
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      return apiRequest("DELETE", `/api/services/${serviceId}`);
    },
    onSuccess: () => {
      // Invalidate all service-related queries to sync across all pages
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      // Specifically invalidate this component's query with categoryId
      queryClient.invalidateQueries({ queryKey: ['/api/services', categoryId] });
      // Also invalidate queries with any additional parameters
      queryClient.invalidateQueries({ predicate: query => 
        Array.isArray(query.queryKey) && (
          query.queryKey[0] === '/api/services' ||
          query.queryKey[0] === "/api/services"
        )
      });
      toast({
        title: "Success",
        description: "Service deleted successfully",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete service: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const filteredServices = services?.filter((service: Service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditService = (serviceId: number) => {
    setSelectedService(serviceId);
    setIsServiceFormOpen(true);
  };

  const handleDeleteService = (serviceId: number) => {
    setServiceToDelete(serviceId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteService = () => {
    if (serviceToDelete) {
      deleteServiceMutation.mutate(serviceToDelete);
    }
  };

  const getStaffForService = (serviceId: number) => {
    // In a real app, we would check which staff members are associated with this service
    // For now, we'll just return "All Staff"
    return "All Staff";
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b">
          <CardTitle className="text-lg font-medium">{categoryId ? (category?.name || 'Services') : 'All Services'}</CardTitle>
          <div className="relative">
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 py-1 h-8 text-sm"
            />
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70%] min-w-[640px]">Service</TableHead>
                {!categoryId && <TableHead className="w-[10%]">Category</TableHead>}
                <TableHead className="w-28">Duration</TableHead>
                <TableHead className="w-28">Price</TableHead>
                <TableHead className="w-32">Staff</TableHead>
                <TableHead className="w-40">Color</TableHead>
                <TableHead className="text-right w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={categoryId ? 6 : 7} className="text-center py-4">
                    Loading services...
                  </TableCell>
                </TableRow>
              ) : filteredServices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={categoryId ? 6 : 7} className="text-center py-4">
                    No services found. {searchQuery ? 'Try a different search term.' : ''}
                  </TableCell>
                </TableRow>
              ) : (
                filteredServices?.map((service: Service) => (
                  <TableRow key={service.id}>
                    <TableCell className="align-top">
                      <div className="font-medium">{service.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-normal break-words leading-relaxed">
                        {service.description}
                      </div>
                    </TableCell>
                    {!categoryId && (
                      <TableCell className="align-top whitespace-nowrap">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                          {service.category?.name || 'Uncategorized'}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="align-top whitespace-nowrap">{formatDuration(service.duration)}</TableCell>
                    <TableCell className="align-top whitespace-nowrap">{formatPrice(service.price)}</TableCell>
                    <TableCell className="align-top whitespace-nowrap">{getStaffForService(service.id)}</TableCell>
                    <TableCell className="align-top">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600"
                          style={{ backgroundColor: service.color || "#3B82F6" }}
                          title={service.color || "#3B82F6"}
                        />
                        <span className="text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {service.color || "#3B82F6"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditService(service.id)}
                        className="text-primary hover:text-primary/80 hover:bg-primary/10"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteService(service.id)}
                        className="text-gray-500 hover:text-primary hover:bg-primary/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ServiceForm
        open={isServiceFormOpen}
        onOpenChange={setIsServiceFormOpen}
        serviceId={selectedService || undefined}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the service and remove it from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteService} className="bg-primary hover:bg-primary/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ServiceList;
