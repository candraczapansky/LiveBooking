import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const addStaffSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  title: z.string().min(1, "Job title is required"),
  bio: z.string().optional(),
  commissionType: z.enum(["commission", "hourly", "fixed"]).default("commission"),
  commissionRate: z.number().min(0).max(100).default(45),
});

type AddStaffFormValues = z.infer<typeof addStaffSchema>;

type AddStaffDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AddStaffDialog({ open, onOpenChange }: AddStaffDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AddStaffFormValues>({
    resolver: zodResolver(addStaffSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      title: "",
      bio: "",
      commissionType: "commission",
      commissionRate: 45,
    },
  });

  const createStaffMutation = useMutation({
    mutationFn: async (data: AddStaffFormValues) => {
      // Step 1: Create user account
      const baseUsername = `${data.firstName.toLowerCase()}${data.lastName.toLowerCase()}`.replace(/[^a-z0-9]/g, '');
      const timestamp = Date.now().toString().slice(-4);
      const username = `${baseUsername}${timestamp}`;
      const defaultPassword = `${data.firstName}123!`;
      
      const userData = {
        username,
        email: data.email,
        password: defaultPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || "",
        role: "staff",
      };

      const userResponse = await apiRequest("POST", "/api/register", userData);
      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        throw new Error(errorData.error || "Failed to create user account");
      }

      const user = await userResponse.json();

      // Step 2: Create staff record
      const staffData = {
        userId: user.id,
        title: data.title,
        bio: data.bio || "",
        commissionType: data.commissionType,
        commissionRate: data.commissionRate / 100, // Convert percentage to decimal
        hourlyRate: data.commissionType === 'hourly' ? data.commissionRate : null,
        fixedRate: data.commissionType === 'fixed' ? data.commissionRate : null,
      };

      const staffResponse = await apiRequest("POST", "/api/staff", staffData);
      if (!staffResponse.ok) {
        const errorData = await staffResponse.json();
        throw new Error(errorData.error || "Failed to create staff member");
      }

      return await staffResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      toast({
        title: "Success",
        description: "Staff member created successfully!",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create staff member: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: AddStaffFormValues) => {
    console.log("Submitting staff form with data:", data);
    createStaffMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Staff Member</DialogTitle>
          <DialogDescription>
            Create a new staff member by filling out the form below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="Enter email address" 
                        {...field} 
                      />
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
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Job Information */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Hair Stylist" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the staff member's experience and specialties..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Structure */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="commissionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Structure</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="commission">Commission Only</SelectItem>
                        <SelectItem value="hourly">Hourly Rate</SelectItem>
                        <SelectItem value="fixed">Fixed Salary</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="commissionRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {form.watch('commissionType') === 'commission' ? 'Commission Rate (%)' :
                       form.watch('commissionType') === 'hourly' ? 'Hourly Rate ($)' :
                       'Annual Salary ($)'}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step={form.watch('commissionType') === 'commission' ? "0.1" : 
                              form.watch('commissionType') === 'hourly' ? "0.01" : "1000"}
                        placeholder={form.watch('commissionType') === 'commission' ? "45" :
                                   form.watch('commissionType') === 'hourly' ? "25.00" : "50000"}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createStaffMutation.isPending}
              >
                {createStaffMutation.isPending ? "Creating..." : "Create Staff Member"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}