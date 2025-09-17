import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const membershipFormSchema = z.object({
  name: z.string().min(1, "Membership name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  duration: z.coerce.number().min(1, "Duration must be at least 1 day"),
  benefits: z.string().optional(),
  includedServices: z.array(z.number()).optional().default([]),
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
  const [servicesOpen, setServicesOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);

  // Fetch available services
  const { data: services } = useQuery({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const response = await fetch('/api/services');
      if (!response.ok) throw new Error('Failed to fetch services');
      return response.json();
    },
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
    },
  });

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

  const getSelectedServiceNames = () => {
    if (!services || selectedServices.length === 0) return "Select services...";
    const selected = services.filter((s: any) => selectedServices.includes(s.id));
    return selected.map((s: any) => s.name).join(", ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{membershipId ? "Edit Membership" : "Add New Membership"}</DialogTitle>
          <DialogDescription>
            {membershipId
              ? "Update the membership details below."
              : "Create a new membership plan by filling out the form below."}
          </DialogDescription>
        </DialogHeader>

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
            <FormItem>
              <FormLabel>Included Services</FormLabel>
              <Popover open={servicesOpen} onOpenChange={setServicesOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={servicesOpen}
                    className="w-full justify-between text-left font-normal"
                    type="button"
                  >
                    <span className="truncate">
                      {selectedServices.length === 0
                        ? "Select services to include..."
                        : `${selectedServices.length} service${selectedServices.length !== 1 ? 's' : ''} selected`}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search services..." />
                    <CommandEmpty>No services found.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-[300px]">
                        {services?.map((service: any) => (
                          <CommandItem
                            key={service.id}
                            onSelect={() => {
                              setSelectedServices(prev => {
                                if (prev.includes(service.id)) {
                                  return prev.filter(id => id !== service.id);
                                } else {
                                  return [...prev, service.id];
                                }
                              });
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedServices.includes(service.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{service.name}</div>
                              {service.price && (
                                <div className="text-sm text-gray-500">
                                  ${service.price} - {service.duration} min
                                </div>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedServices.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {services
                    ?.filter((s: any) => selectedServices.includes(s.id))
                    .map((service: any) => (
                      <Badge key={service.id} variant="secondary">
                        {service.name}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedServices(prev => prev.filter(id => id !== service.id));
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                </div>
              )}
            </FormItem>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || createMembershipMutation.isPending || updateMembershipMutation.isPending}
              >
                {isLoading || createMembershipMutation.isPending || updateMembershipMutation.isPending
                  ? "Saving..."
                  : membershipId
                  ? "Update Membership"
                  : "Create Membership"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default MembershipForm;
