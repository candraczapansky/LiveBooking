import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const clientFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  emailAppointmentReminders: z.boolean().default(true),
  smsAppointmentReminders: z.boolean().default(true),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated?: (client: any) => void;
}

export function ClientCreationDialog({ open, onOpenChange, onClientCreated }: ClientCreationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      emailAppointmentReminders: true,
      smsAppointmentReminders: true,
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      return apiRequest("POST", "/api/clients", data);
    },
    onSuccess: async (response) => {
      const newClient = await response.json();
      
      // Invalidate and refetch client data
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users?role=client'] });
      queryClient.removeQueries({ queryKey: ['/api/users?role=client'] });
      queryClient.refetchQueries({ queryKey: ['/api/users?role=client'] });
      
      toast({
        title: "Success",
        description: "Client created successfully",
      });
      
      form.reset();
      onOpenChange(false);
      
      // Call the callback with the new client
      if (onClientCreated) {
        onClientCreated(newClient);
      }
    },
    onError: async (error: any) => {
      const status = error?.response?.status;
      const message = (error?.response?.data?.error || error?.message || '').toString();

      // Gracefully handle duplicate email by fetching existing user and treating as success
      if (status === 409 || /email already exists/i.test(message)) {
        try {
          const emailVal = form.getValues('email');
          const res = await apiRequest("GET", `/api/users?search=${encodeURIComponent(emailVal)}`);
          const list = await res.json();
          const existing = Array.isArray(list) ? list.find((u: any) => (u.email || '').toLowerCase() === (emailVal || '').toLowerCase()) : null;
          if (existing) {
            // Invalidate and refetch client data
            queryClient.invalidateQueries({ queryKey: ['/api/users'] });
            queryClient.invalidateQueries({ queryKey: ['/api/users?role=client'] });
            queryClient.removeQueries({ queryKey: ['/api/users?role=client'] });
            queryClient.refetchQueries({ queryKey: ['/api/users?role=client'] });

            toast({
              title: "Client Found",
              description: "Existing client matched by email and selected.",
            });

            form.reset();
            onOpenChange(false);
            if (onClientCreated) {
              onClientCreated(existing);
            }
            return;
          }
        } catch (e) {
          // fall through to default error toast
        }
      }

      toast({
        title: "Error",
        description: `Failed to create client: ${message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (data: ClientFormValues) => {
    createClientMutation.mutate(data);
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Create a new client to book an appointment.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
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
                control={form.control}
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
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="john.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="555-123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="emailAppointmentReminders"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Email appointment reminders</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="smsAppointmentReminders"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>SMS appointment reminders</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={createClientMutation.isPending}>
                {createClientMutation.isPending ? "Creating..." : "Create Client"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 