import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSidebar } from "@/contexts/SidebarContext";
import { SidebarController } from "@/components/layout/sidebar";
// import Header from "@/components/layout/header"; // Provided by MainLayout
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mail, 
  MessageSquare, 
  Clock, 
  Calendar, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause,
  Settings
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Types for automation rules
type AutomationRule = {
  id: number;
  name: string;
  type: 'email' | 'sms';
  trigger: 'appointment_reminder' | 'follow_up' | 'birthday' | 'no_show' | 'booking_confirmation' | 'cancellation' | 'after_payment' | 'custom';
  timing: string; // e.g., "24 hours before", "1 day after", "immediately"
  template: string;
  subject?: string; // Only for email
  active: boolean;
  lastRun?: string;
  sentCount: number;
  customTriggerName?: string; // For custom triggers
};

// Form schemas
const emailRuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  trigger: z.string().min(1, "Trigger is required"),
  timing: z.string().min(1, "Timing is required"),
  subject: z.string().min(1, "Subject is required"),
  template: z.string().min(1, "Template is required"),
  active: z.boolean().default(true),
  customTriggerName: z.string().optional(),
});

const smsRuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  trigger: z.string().min(1, "Trigger is required"),
  timing: z.string().min(1, "Timing is required"),
  template: z.string().min(1, "Template is required").max(500, "SMS messages must be 500 characters or less"),
  active: z.boolean().default(true),
  customTriggerName: z.string().optional(),
});

type EmailRuleFormValues = z.infer<typeof emailRuleSchema>;
type SMSRuleFormValues = z.infer<typeof smsRuleSchema>;

export default function Automations() {
  const { isMobile } = useSidebar();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isSMSDialogOpen, setIsSMSDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [selectedEmailTrigger, setSelectedEmailTrigger] = useState("");
  const [selectedSMSTrigger, setSelectedSMSTrigger] = useState("");

  // Fetch automation rules from API
  const { data: automationRules = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/automation-rules"],
  });

  // Create automation rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (ruleData: any) => {
      console.log('Making API request with data:', ruleData);
      return apiRequest("POST", "/api/automation-rules", ruleData);
    },
    onSuccess: (data) => {
      console.log('API request successful:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/automation-rules"] });
      toast({
        title: "Success",
        description: "Automation rule created successfully",
      });
    },
    onError: (error: any) => {
      console.error('API request failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create automation rule",
        variant: "destructive",
      });
    },
  });

  // Update automation rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, ruleData }: { id: number; ruleData: any }) => {
      console.log('Updating automation rule:', id, ruleData);
      return apiRequest("PUT", `/api/automation-rules/${id}`, ruleData);
    },
    onSuccess: (data) => {
      console.log('Rule updated successfully:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/automation-rules"] });
      toast({
        title: "Success",
        description: "Automation rule updated successfully",
      });
      setEditingRule(null);
    },
    onError: (error: any) => {
      console.error('Update failed:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update automation rule",
        variant: "destructive",
      });
    },
  });

  // Form handlers
  const emailForm = useForm<EmailRuleFormValues>({
    resolver: zodResolver(emailRuleSchema),
    defaultValues: {
      name: "",
      trigger: "",
      timing: "",
      subject: "",
      template: "",
      active: true,
      customTriggerName: "",
    },
  });

  const smsForm = useForm<SMSRuleFormValues>({
    resolver: zodResolver(smsRuleSchema),
    defaultValues: {
      name: "",
      trigger: "",
      timing: "",
      template: "",
      active: true,
      customTriggerName: "",
    },
  });

  // Populate form when editing a rule
  useEffect(() => {
    if (editingRule && editingRule.type === 'sms') {
      smsForm.reset({
        name: editingRule.name,
        trigger: editingRule.trigger,
        timing: editingRule.timing,
        template: editingRule.template,
        active: editingRule.active,
        customTriggerName: editingRule.customTriggerName || "",
      });
      setSelectedSMSTrigger(editingRule.trigger);
      setIsSMSDialogOpen(true);
    } else if (editingRule && editingRule.type === 'email') {
      emailForm.reset({
        name: editingRule.name,
        trigger: editingRule.trigger,
        timing: editingRule.timing,
        subject: editingRule.subject || "",
        template: editingRule.template,
        active: editingRule.active,
        customTriggerName: editingRule.customTriggerName || "",
      });
      setSelectedEmailTrigger(editingRule.trigger);
      setIsEmailDialogOpen(true);
    }
  }, [editingRule]);

  // Trigger and timing options
  const triggerOptions = [
    { value: "appointment_reminder", label: "Appointment Reminder" },
    { value: "follow_up", label: "Follow-up" },
    { value: "birthday", label: "Birthday" },
    { value: "no_show", label: "No Show" },
    { value: "booking_confirmation", label: "Booking Confirmation" },
    { value: "cancellation", label: "Cancellation" },
    { value: "after_payment", label: "After Payment" },
    { value: "custom", label: "Custom Trigger" }
  ];

  const timingOptions = [
    { value: "immediately", label: "Immediately" },
    { value: "15_minutes_before", label: "15 minutes before" },
    { value: "30_minutes_before", label: "30 minutes before" },
    { value: "1_hour_before", label: "1 hour before" },
    { value: "2_hours_before", label: "2 hours before" },
    { value: "4_hours_before", label: "4 hours before" },
    { value: "24_hours_before", label: "24 hours before" },
    { value: "48_hours_before", label: "48 hours before" },
    { value: "1_day_after", label: "1 day after" },
    { value: "3_days_after", label: "3 days after" },
    { value: "1_week_after", label: "1 week after" },
  ];

  const templateVariables = [
    "{client_name}", "{client_first_name}", "{client_last_name}", "{client_email}", "{client_phone}",
    "{service_name}", "{staff_name}", "{staff_phone}",
    "{appointment_date}", "{appointment_time}", "{appointment_datetime}",
    "{salon_name}", "{salon_phone}", "{salon_address}"
  ];

  // Form submission handlers
  const onEmailSubmit = (data: EmailRuleFormValues) => {
    const ruleData = {
      name: data.name,
      type: "email" as const,
      trigger: data.trigger,
      timing: data.timing,
      subject: data.subject,
      template: data.template,
      active: data.active,
      customTriggerName: data.trigger === "custom" ? data.customTriggerName : undefined
    };

    if (editingRule && editingRule.type === 'email') {
      updateRuleMutation.mutate({ id: editingRule.id, ruleData });
    } else {
      createRuleMutation.mutate(ruleData);
    }
    
    setIsEmailDialogOpen(false);
    setSelectedEmailTrigger("");
    setEditingRule(null);
    emailForm.reset();
  };

  const onSMSSubmit = (data: SMSRuleFormValues) => {
    console.log('✅ SMS form submitted successfully with data:', data);
    console.log('Form errors (should be empty):', smsForm.formState.errors);
    
    const ruleData = {
      name: data.name,
      type: "sms" as const,
      trigger: data.trigger,
      timing: data.timing,
      template: data.template,
      active: data.active,
      customTriggerName: data.trigger === "custom" ? data.customTriggerName : undefined
    };

    console.log('Sending rule data to API:', ruleData);
    
    if (editingRule && editingRule.type === 'sms') {
      updateRuleMutation.mutate({ id: editingRule.id, ruleData });
    } else {
      createRuleMutation.mutate(ruleData);
    }
    
    setIsSMSDialogOpen(false);
    setSelectedSMSTrigger("");
    setEditingRule(null);
    smsForm.reset();
  };

  // Default automation rule creation functions
  const createDefaultBookingConfirmation = async () => {
    const ruleData = {
      name: "Booking Confirmation Email",
      type: "email" as const,
      trigger: "booking_confirmation",
      timing: "immediately",
      subject: "Appointment Confirmation - Glo Head Spa",
      template: `Hi {client_name},

Your appointment has been confirmed!

Service: {service_name}
Date: {appointment_date}
Time: {appointment_time}
Staff: {staff_name}

We look forward to seeing you!

Best regards,
Glo Head Spa`,
      active: true,
      customTriggerName: undefined
    };

    try {
      await createRuleMutation.mutateAsync(ruleData);
      toast({
        title: "Success",
        description: "Booking confirmation email rule created successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create booking confirmation rule.",
        variant: "destructive",
      });
    }
  };

  const createDefaultBookingConfirmationSMS = async () => {
    const ruleData = {
      name: "Booking Confirmation SMS",
      type: "sms" as const,
      trigger: "booking_confirmation",
      timing: "immediately",
      template: `Hi {client_name}! Your {service_name} appointment is confirmed for {appointment_date} at {appointment_time}. We look forward to seeing you! - Glo Head Spa`,
      active: true,
      customTriggerName: undefined
    };

    try {
      await createRuleMutation.mutateAsync(ruleData);
      toast({
        title: "Success",
        description: "Booking confirmation SMS rule created successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create booking confirmation SMS rule.",
        variant: "destructive",
      });
    }
  };

  // Other utility functions
  const toggleRuleStatus = async (id: number) => {
    try {
      const rule = (automationRules as any[])?.find((r: any) => r.id === id);
      if (!rule) return;

      const response = await fetch(`/api/automation-rules/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: !rule.active }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle rule status');
      }

      // Refetch automation rules
      refetch();
    } catch (error) {
      console.error('Error toggling rule status:', error);
    }
  };

  const deleteRule = async (id: number) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) {
      return;
    }

    try {
      const response = await fetch(`/api/automation-rules/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete rule');
      }

      // Refetch automation rules
      refetch();
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const formatTriggerLabel = (trigger: string, customTriggerName?: string) => {
    if (trigger === "custom" && customTriggerName) {
      return customTriggerName;
    }
    return triggerOptions.find(opt => opt.value === trigger)?.label || trigger;
  };

  const emailRules = Array.isArray(automationRules) ? automationRules.filter((rule: any) => rule.type === 'email') : [];
  const smsRules = Array.isArray(automationRules) ? automationRules.filter((rule: any) => rule.type === 'sms') : [];

  return (
    <div className="min-h-screen bg-background">
      <SidebarController />
      <div className={`transition-all duration-300 ease-in-out ${isMobile ? 'ml-0' : 'ml-16'}`}>
        <main className="p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Automations</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Set up automated email and SMS communications for your clients
                </p>
              </div>
              <Settings className="h-6 w-6 text-gray-400" />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Mail className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Email Rules</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{emailRules.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <MessageSquare className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">SMS Rules</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{smsRules.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Rules</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {Array.isArray(automationRules) ? automationRules.filter((r: any) => r.active).length : 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-orange-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Messages Sent</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {Array.isArray(automationRules) ? automationRules.reduce((sum: number, rule: any) => sum + (rule.sentCount || 0), 0) : 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* This Month's Activity */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-primary" />
                  This Month's Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Email Communications</h4>
                    <p className="text-3xl font-bold text-blue-600">
                      {Array.isArray(automationRules) ? automationRules.reduce((sum: number, rule: any) => rule.type === 'email' ? sum + (rule.sentCount || 0) : sum, 0) : 0}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">emails sent</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">SMS Communications</h4>
                    <p className="text-3xl font-bold text-green-600">
                      {Array.isArray(automationRules) ? automationRules.reduce((sum: number, rule: any) => rule.type === 'sms' ? sum + (rule.sentCount || 0) : sum, 0) : 0}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">text messages sent</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Setup Section */}
            {Array.isArray(automationRules) && automationRules.length === 0 && (
              <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="text-blue-800 dark:text-blue-200">Quick Setup</CardTitle>
                  <CardDescription className="text-blue-600 dark:text-blue-300">
                    Get started with automated communications by creating a booking confirmation rule.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => createDefaultBookingConfirmation()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Create Booking Confirmation Email
                    </Button>
                    <Button 
                      onClick={() => createDefaultBookingConfirmationSMS()}
                      variant="outline"
                      className="border-blue-600 text-blue-600 hover:bg-blue-50"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Create Booking Confirmation SMS
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs for Email and SMS Rules */}
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email Rules</TabsTrigger>
                <TabsTrigger value="sms">SMS Rules</TabsTrigger>
              </TabsList>
              
              {/* Email Rules Tab */}
              <TabsContent value="email" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Email Automation Rules</h2>
                  <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Email Rule
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {editingRule && editingRule.type === 'email' ? 'Edit Email Automation Rule' : 'Create Email Automation Rule'}
                        </DialogTitle>
                        <DialogDescription>
                          {editingRule && editingRule.type === 'email' 
                            ? 'Update your automated email communication settings.' 
                            : 'Set up automated email communications to be sent to clients based on specific triggers.'
                          }
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...emailForm}>
                        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                          {/* Email form fields - similar to SMS but with subject field */}
                          <FormField
                            control={emailForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rule Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Email Reminder" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Give your email rule a descriptive name
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={emailForm.control}
                              name="trigger"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Trigger</FormLabel>
                                  <Select onValueChange={(value) => {
                                    field.onChange(value);
                                    setSelectedEmailTrigger(value);
                                  }} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select trigger" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {triggerOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={emailForm.control}
                              name="timing"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Timing</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select timing" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {timingOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {selectedEmailTrigger === "custom" && (
                            <FormField
                              control={emailForm.control}
                              name="customTriggerName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Custom Trigger Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Review Email" {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    Give your custom trigger a descriptive name
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                          
                          <FormField
                            control={emailForm.control}
                            name="subject"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Subject</FormLabel>
                                <FormControl>
                                  <Input placeholder="Your appointment is tomorrow" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Variables: {templateVariables.slice(0, 5).join(", ")}, etc.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={emailForm.control}
                            name="template"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Template</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Hi {client_name}, this is a reminder about your appointment..." 
                                    className="min-h-[100px]"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  Variables: {templateVariables.slice(0, 5).join(", ")}, etc.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={emailForm.control}
                            name="active"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">
                                    Active
                                  </FormLabel>
                                  <FormDescription>
                                    Start sending this automation immediately
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={createRuleMutation.isPending || updateRuleMutation.isPending}>
                              {(createRuleMutation.isPending || updateRuleMutation.isPending) 
                                ? (editingRule && editingRule.type === 'email' ? "Updating..." : "Creating...")
                                : (editingRule && editingRule.type === 'email' ? "Update Email Rule" : "Create Email Rule")
                              }
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="grid gap-4">
                  {emailRules.map((rule: any) => (
                    <Card key={rule.id}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{rule.name}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge variant={rule.active ? "default" : "secondary"}>
                            {rule.active ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRuleStatus(rule.id)}
                          >
                            {rule.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRule(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="space-y-1">
                          <div>
                            <strong>Trigger:</strong> {formatTriggerLabel(rule.trigger, rule.customTriggerName)}
                          </div>
                          <div>
                            <strong>Timing:</strong> {timingOptions.find(opt => opt.value === rule.timing)?.label || rule.timing}
                          </div>
                          <div>
                            <strong>Sent:</strong> {rule.sentCount || 0} times
                          </div>
                          <div>
                            <strong>Last run:</strong> {rule.lastRun ? new Date(rule.lastRun).toLocaleDateString() : 'Never'}
                          </div>
                        </CardDescription>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {emailRules.length === 0 && (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-10">
                        <Mail className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                          No email automation rules yet
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                          Create your first email automation rule to start sending automatic reminders to your clients.
                        </p>
                        <Button onClick={() => setIsEmailDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Email Rule
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
              
              {/* SMS Rules Tab */}
              <TabsContent value="sms" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">SMS Automation Rules</h2>
                  <Dialog open={isSMSDialogOpen} onOpenChange={setIsSMSDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create SMS Rule
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {editingRule && editingRule.type === 'sms' ? 'Edit SMS Automation Rule' : 'Create SMS Automation Rule'}
                        </DialogTitle>
                        <DialogDescription>
                          {editingRule && editingRule.type === 'sms' 
                            ? 'Update your automated SMS communication settings.' 
                            : 'Set up automated SMS communications to be sent to clients based on specific triggers.'
                          }
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...smsForm}>
                        <form onSubmit={smsForm.handleSubmit(onSMSSubmit)} className="space-y-4">
                          <FormField
                            control={smsForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rule Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Review SMS" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Give your SMS rule a descriptive name
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={smsForm.control}
                              name="trigger"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Trigger <span className="text-red-500">*</span></FormLabel>
                                  <Select onValueChange={(value) => {
                                    console.log('Trigger selected:', value);
                                    field.onChange(value);
                                    setSelectedSMSTrigger(value);
                                  }} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className={smsForm.formState.errors.trigger ? "border-red-500" : ""}>
                                        <SelectValue placeholder="Select a trigger" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {triggerOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                  {smsForm.formState.errors.trigger && (
                                    <p className="text-red-500 text-sm mt-1">
                                      Please select a trigger for your SMS automation
                                    </p>
                                  )}
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={smsForm.control}
                              name="timing"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Timing</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="1 day after" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {timingOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {selectedSMSTrigger === "custom" && (
                            <FormField
                              control={smsForm.control}
                              name="customTriggerName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Custom Trigger Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Review Text" {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    Give your custom trigger a descriptive name
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                          
                          <FormField
                            control={smsForm.control}
                            name="template"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SMS Template</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Hi {client_name}, thank you for choosing us to pamper you! If you have the spare time, we would love to have you did! If you were unsatisfied for any reason, please call us so we can help! : https://g.co/kgs/yvPWvGE" 
                                    className="min-h-[100px]"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  Max 500 characters. Variables: {templateVariables.slice(0, 5).join(", ")}, etc.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <p className="text-sm text-gray-600">
                            SMS messages must be 500 characters or less
                          </p>
                          
                          <FormField
                            control={smsForm.control}
                            name="active"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">
                                    Active
                                  </FormLabel>
                                  <FormDescription>
                                    Start sending this automation immediately
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsSMSDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                              onClick={() => {
                                console.log('SMS Rule button clicked');
                                console.log('Form state:', smsForm.formState);
                                console.log('Form errors:', smsForm.formState.errors);
                                console.log('Form values:', smsForm.getValues());
                              }}
                            >
                              {(createRuleMutation.isPending || updateRuleMutation.isPending) 
                                ? (editingRule && editingRule.type === 'sms' ? "Updating..." : "Creating...")
                                : (editingRule && editingRule.type === 'sms' ? "Update SMS Rule" : "Create SMS Rule")
                              }
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="grid gap-4">
                  {smsRules.map((rule: any) => (
                    <Card key={rule.id}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{rule.name}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge variant={rule.active ? "default" : "secondary"}>
                            {rule.active ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRuleStatus(rule.id)}
                          >
                            {rule.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRule(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="space-y-1">
                          <div>
                            <strong>Trigger:</strong> {formatTriggerLabel(rule.trigger, rule.customTriggerName)}
                          </div>
                          <div>
                            <strong>Timing:</strong> {timingOptions.find(opt => opt.value === rule.timing)?.label || rule.timing}
                          </div>
                          <div>
                            <strong>Sent:</strong> {rule.sentCount || 0} times
                          </div>
                          <div>
                            <strong>Last run:</strong> {rule.lastRun ? new Date(rule.lastRun).toLocaleDateString() : 'Never'}
                          </div>
                        </CardDescription>
                      </CardContent>
                      <CardContent>
                        <div>
                          <strong>Template:</strong>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                            {rule.template}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {rule.template.length}/160 characters
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {smsRules.length === 0 && (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-10">
                        <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                          No SMS automation rules yet
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                          Create your first SMS automation rule to start sending automatic text reminders to your clients.
                        </p>
                        <Button onClick={() => setIsSMSDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create SMS Rule
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}