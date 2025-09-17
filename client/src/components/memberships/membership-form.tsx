import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ChevronsUpDown, X } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const membershipFormSchema = z.object({
  name: z.string().min(1, "Membership name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  duration: z.coerce.number().min(1, "Duration must be at least 1 day"),
  benefits: z.string().optional(),
  includedServices: z.array(z.number()).optional().default([]),
  credits: z.coerce.number().min(0, "Credits must be a positive number").default(0),
});

type MembershipFormValues = z.infer<typeof membershipFormSchema>;

type MembershipFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membershipId?: number;
};

const MembershipForm = ({ open, onOpenChange, membershipId }: MembershipFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch available services
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const response = await fetch('/api/services');
      if (!response.ok) throw new Error('Failed to fetch services');
      const data = await response.json();
      // Filter out hidden services
      return data.filter((s: any) => !s.isHidden);
    },
    enabled: open,
  });

  const form = useForm<MembershipFormValues>({
    resolver: zodResolver(membershipFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      duration: 30, // Default to 30 days
      benefits: "",
      includedServices: [],
      credits: 0,
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset({
        name: "",
        description: "",
        price: 0,
        duration: 30,
        benefits: "",
        includedServices: [],
        credits: 0,
      });
      setSelectedServices([]);
      setServicesDropdownOpen(false);
    }
  }, [open, form]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setServicesDropdownOpen(false);
      }
    };

    if (servicesDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [servicesDropdownOpen]);

  // Fetch membership data if editing
  useEffect(() => {
    if (membershipId && open) {
      setIsLoading(true);
      fetch(`/api/memberships/${membershipId}`)
        .then(res => res.json())
        .then(data => {
          form.reset({
            name: data.name,
            description: data.description || "",
            price: data.price,
            duration: data.duration,
            benefits: data.benefits || "",
            includedServices: data.includedServices || [],
            credits: data.credits || 0,
          });
          setSelectedServices(data.includedServices || []);
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Error fetching membership:", err);
          toast({
            title: "Error",
            description: "Failed to load membership data",
            variant: "destructive",
          });
          setIsLoading(false);
          onOpenChange(false);
        });
    }
  }, [membershipId, open, form, toast, onOpenChange]);

  const createMembershipMutation = useMutation({
    mutationFn: async (data: MembershipFormValues) => {
      return apiRequest("POST", "/api/memberships", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/memberships'] });
      toast({
        title: "Success",
        description: "Membership created successfully",
      });
      form.reset();
      setSelectedServices([]);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create membership: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const updateMembershipMutation = useMutation({
    mutationFn: async (data: MembershipFormValues) => {
      return apiRequest("PUT", `/api/memberships/${membershipId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/memberships'] });
      toast({
        title: "Success",
        description: "Membership updated successfully",
      });
      form.reset();
      setSelectedServices([]);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update membership: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (values: MembershipFormValues) => {
    const dataToSubmit = {
      ...values,
      includedServices: selectedServices,
    };
    if (membershipId) {
      updateMembershipMutation.mutate(dataToSubmit);
    } else {
      createMembershipMutation.mutate(dataToSubmit);
    }
  };

  const toggleService = (serviceId: number) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const removeService = (serviceId: number) => {
    setSelectedServices(prev => prev.filter(id => id !== serviceId));
  };

  const getServiceName = (serviceId: number) => {
    const service = services.find((s: any) => s.id === serviceId);
    return service?.name || 'Unknown Service';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{membershipId ? "Edit Membership" : "Add New Membership"}</DialogTitle>
          <DialogDescription>
            {membershipId
              ? "Update the membership details below."
              : "Create a new membership plan by filling out the form below."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90vh-200px)] overflow-y-auto pr-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Membership Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Premium Membership" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the membership..."
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (days)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="credits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Credits</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        {...field}
                        placeholder="e.g., 2"
                      />
                    </FormControl>
                    <FormDescription>
                      Number of service credits members get per duration period. 
                      For example, 2 credits = 2 services can be used from the selected services below.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="benefits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Benefits</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="List membership benefits..."
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Included Services Selection */}
              <div className="space-y-2">
                <FormLabel>Included Services</FormLabel>
                <FormDescription>
                  Select which services members can use with their credits
                </FormDescription>
                
                {/* Services Dropdown with fixed positioning */}
                <div className="relative" ref={dropdownRef}>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setServicesDropdownOpen(!servicesDropdownOpen)}
                  >
                    <span>
                      {selectedServices.length === 0
                        ? "Select services to include..."
                        : `${selectedServices.length} service${selectedServices.length !== 1 ? 's' : ''} selected`}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>

                  {/* Dropdown positioned to not affect container height */}
                  {servicesDropdownOpen && (
                    <div 
                      className="absolute z-[200] mt-1 w-full rounded-md border bg-white dark:bg-gray-950 shadow-lg"
                      style={{ 
                        maxHeight: '240px'
                      }}
                    >
                      <div className="max-h-[230px] overflow-y-auto p-1">
                        {servicesLoading ? (
                          <div className="p-2 text-center text-sm text-gray-500">
                            Loading services...
                          </div>
                        ) : services.length === 0 ? (
                          <div className="p-2 text-center text-sm text-gray-500">
                            No services available
                          </div>
                        ) : (
                          services.map((service: any) => (
                            <div
                              key={service.id}
                              className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                              onClick={() => toggleService(service.id)}
                            >
                              <Checkbox
                                checked={selectedServices.includes(service.id)}
                                onCheckedChange={() => toggleService(service.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="mr-2"
                              />
                              <div className="flex-1">
                                <div className="text-sm font-medium">{service.name}</div>
                                {service.price !== undefined && service.price !== null && (
                                  <div className="text-xs text-gray-500">
                                    ${service.price} - {service.duration || 60} min
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Services Badges */}
                {selectedServices.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedServices.map(serviceId => (
                      <Badge key={serviceId} variant="secondary" className="pr-1">
                        {getServiceName(serviceId)}
                        <button
                          type="button"
                          onClick={() => removeService(serviceId)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </form>
          </Form>
        </div>

        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={form.handleSubmit(onSubmit)}
            disabled={isLoading || createMembershipMutation.isPending || updateMembershipMutation.isPending}
          >
            {isLoading || createMembershipMutation.isPending || updateMembershipMutation.isPending
              ? "Saving..."
              : membershipId
              ? "Update Membership"
              : "Create Membership"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MembershipForm;