import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSidebar } from "@/contexts/SidebarContext";
import { SidebarController } from "@/components/layout/sidebar";
import { useSidebar as useSidebarContext } from "@/contexts/SidebarContext";
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
  Settings,
  Beaker
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

// Types inferred from zod; using any with react-hook-form to avoid strict resolver generics friction
// Note: inferred form value types are unused intentionally to avoid strict generics friction
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type EmailRuleFormValues = z.infer<typeof emailRuleSchema>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const [selectedEmailLocationId, setSelectedEmailLocationId] = useState("");
  const [selectedSMSLocationId, setSelectedSMSLocationId] = useState("");
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testingRule, setTestingRule] = useState<AutomationRule | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testLocationId, setTestLocationId] = useState<string>("");

  // Locations for optional per-location scoping
  const { data: locations = [] } = useQuery<any[]>({
    queryKey: ["/api/locations"],
  });

  const stripLocationTag = (text: string): string => {
    try {
      return (text || '').replace(/\s*(\[location:[^\]]+\]|@location:[^\s]+)/ig, '').trim();
    } catch { return text; }
  };

  const openTestDialog = (rule: AutomationRule) => {
    setTestingRule(rule);
    setTestEmail("");
    setIsTestDialogOpen(true);
  };

  const runAutomationTest = async () => {
    if (!testingRule) return;
    const email = (testEmail || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    try {
      setIsTesting(true);
      await apiRequest("POST", "/api/automation-rules/trigger", {
        ruleId: testingRule.id,
        trigger: testingRule.trigger,
        customTriggerName: testingRule.trigger === 'custom' ? testingRule.customTriggerName : undefined,
        testEmail: email,
        locationId: testLocationId ? parseInt(testLocationId) : undefined,
      });
      toast({ title: "Test triggered", description: `Automation "${testingRule.name}" executed.` });
      setIsTestDialogOpen(false);
    } catch (e: any) {
      toast({ title: "Test failed", description: e?.message || "Unable to trigger automation.", variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  };

  const appendLocationTag = (base: string, locationId: string): string => {
    if (!locationId) return base;
    const cleaned = stripLocationTag(base);
    return `${cleaned} [location:${locationId}]`;
  };

  const parseLocationToken = (text?: string | null): string => {
    try {
      if (!text) return "";
      const m = /(?:\[location:([^\]]+)\]|@location:([^\s]+))/i.exec(text);
      if (!m) return "";
      const token = (m[1] || m[2] || '').toString().trim();
      // If numeric id, return as-is; otherwise try to map name to id from locations list
      const n = parseInt(token);
      if (!Number.isNaN(n)) return String(n);
      const key = token.toLowerCase();
      const found = (Array.isArray(locations) ? locations : []).find((l: any) => String(l?.name || '').trim().toLowerCase() === key);
      return found?.id ? String(found.id) : "";
    } catch { return ""; }
  };

  // Refs to manage cursor insertion for quick variable buttons
  const emailSubjectRef = useRef<HTMLInputElement | null>(null);
  const emailTemplateRef = useRef<HTMLTextAreaElement | null>(null);
  const smsTemplateRef = useRef<HTMLTextAreaElement | null>(null);

  // Generic insertion helper for input/textarea
  const insertAtCursor = (
    el: HTMLInputElement | HTMLTextAreaElement | null,
    currentValue: string,
    onChange: (val: string) => void,
    token: string
  ) => {
    const value = currentValue || "";
    if (el && typeof (el as any).selectionStart === 'number') {
      const start = (el as any).selectionStart as number;
      const end = (el as any).selectionEnd as number;
      const before = value.slice(0, start);
      const after = value.slice(end ?? start);
      const next = `${before}${token}${after}`;
      onChange(next);
      // Reset caret just after inserted token
      setTimeout(() => {
        try {
          el.focus();
          const pos = start + token.length;
          (el as any).setSelectionRange(pos, pos);
        } catch {}
      }, 0);
    } else {
      onChange(`${value}${token}`);
    }
  };

  // Fetch automation rules from API
  const { data: automationRules = [], refetch } = useQuery<any[]>({
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
  const emailForm = useForm<any>({
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

  const smsForm = useForm<any>({
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
      setSelectedSMSLocationId(parseLocationToken(editingRule.name));
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
      // Prefer name tag; fall back to subject tag for backward compatibility
      const locFromName = parseLocationToken(editingRule.name);
      const locFromSubject = parseLocationToken(editingRule.subject);
      setSelectedEmailLocationId(locFromName || locFromSubject || "");
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
  const onEmailSubmit = (data: any) => {
    const ruleData = {
      name: appendLocationTag(data.name, selectedEmailLocationId),
      type: "email" as const,
      trigger: data.trigger,
      timing: data.timing,
      // Optionally also tag the subject so it's visible in lists; keep name as source of truth
      subject: selectedEmailLocationId ? appendLocationTag(data.subject, selectedEmailLocationId) : data.subject,
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
    setSelectedEmailLocationId("");
    setEditingRule(null);
    emailForm.reset();
  };

  const onSMSSubmit = (data: any) => {
    console.log('✅ SMS form submitted successfully with data:', data);
    console.log('Form errors (should be empty):', smsForm.formState.errors);
    
    const ruleData = {
      name: appendLocationTag(data.name, selectedSMSLocationId),
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
    setSelectedSMSLocationId("");
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
      subject: "Appointment Confirmation - {salon_name}",
      template: `Hi {client_name},

Your appointment has been confirmed!

Service: {service_name}
Date: {appointment_date}
Time: {appointment_time}
Staff: {staff_name}

We look forward to seeing you!

Best regards,
{salon_name}`,
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
      template: `Hi {client_name}! Your {service_name} appointment is confirmed for {appointment_date} at {appointment_time}. We look forward to seeing you! - {salon_name}`,
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

  // Optional: quick-create default cancellation email rule
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const createDefaultCancellationEmail = async () => {
    const ruleData = {
      name: "Cancellation Email",
      type: "email" as const,
      trigger: "cancellation",
      timing: "immediately",
      subject: "Your appointment has been cancelled - {salon_name}",
      template: `Hi {client_name},\n\nYour appointment for {service_name} on {appointment_date} at {appointment_time} has been cancelled.\n\nIf you didn’t request this or would like to reschedule, please contact us.\n\n- {salon_name}`,
      active: true,
      customTriggerName: undefined
    };

    try {
      await createRuleMutation.mutateAsync(ruleData);
      toast({
        title: "Success",
        description: "Cancellation email rule created successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create cancellation rule.",
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
      {/* Provide required props to SidebarController to satisfy types */}
      {(() => {
        try {
          const ctx = (useSidebarContext as any)();
          const isOpen = !!ctx?.isOpen;
          const isMobileSidebar = !!ctx?.isMobile;
          return <SidebarController isOpen={isOpen} isMobile={isMobileSidebar} />;
        } catch {
          return <SidebarController isOpen={false} isMobile={false} />;
        }
      })()}
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

                          {/* Optional: Location scope */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                              <FormLabel>Location (optional)</FormLabel>
                              <Select value={selectedEmailLocationId} onValueChange={(v) => setSelectedEmailLocationId(v === 'all' ? '' : v)}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="All locations" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="all">All locations</SelectItem>
                                  {(Array.isArray(locations) ? locations : []).map((loc: any) => (
                                    <SelectItem key={loc.id} value={String(loc.id)}>
                                      {loc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                If set, this rule only runs for appointments at the selected location.
                              </FormDescription>
                              <div className="flex flex-wrap gap-2 pt-1">
                                {(Array.isArray(locations) ? locations : []).map((loc: any) => (
                                  <Button
                                    key={`email-locbtn-${loc.id}`}
                                    type="button"
                                    size="sm"
                                    variant={selectedEmailLocationId === String(loc.id) ? 'default' : 'secondary'}
                                    onClick={() => setSelectedEmailLocationId(String(loc.id))}
                                  >
                                    {loc.name}
                                  </Button>
                                ))}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={selectedEmailLocationId === '' ? 'default' : 'secondary'}
                                  onClick={() => setSelectedEmailLocationId('')}
                                >
                                  All
                                </Button>
                              </div>
                            </div>
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
                                  <Input 
                                    placeholder="Your appointment is tomorrow" 
                                    {...field}
                                    ref={(el) => { emailSubjectRef.current = el; (field as any).ref?.(el); }}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Variables: {templateVariables.slice(0, 5).join(", ")}, etc.
                                </FormDescription>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {templateVariables.map((tok) => (
                                    <Button
                                      key={`subj-${tok}`}
                                      type="button"
                                      variant="default"
                                      size="sm"
                                      onClick={() => insertAtCursor(emailSubjectRef.current, field.value as any, field.onChange, tok)}
                                    >
                                      {tok}
                                    </Button>
                                  ))}
                                </div>
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
                                    ref={(el) => { emailTemplateRef.current = el; (field as any).ref?.(el); }} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  Variables: {templateVariables.slice(0, 5).join(", ")}, etc.
                                </FormDescription>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {templateVariables.map((tok) => (
                                    <Button
                                      key={`tmpl-${tok}`}
                                      type="button"
                                      variant="default"
                                      size="sm"
                                      onClick={() => insertAtCursor(emailTemplateRef.current, field.value as any, field.onChange, tok)}
                                    >
                                      {tok}
                                    </Button>
                                  ))}
                                </div>
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
                            onClick={() => openTestDialog(rule)}
                            title="Test this automation"
                          >
                            <Beaker className="h-4 w-4" />
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

                          {/* Optional: Location scope */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                              <FormLabel>Location (optional)</FormLabel>
                              <Select value={selectedSMSLocationId} onValueChange={(v) => setSelectedSMSLocationId(v === 'all' ? '' : v)}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="All locations" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="all">All locations</SelectItem>
                                  {(Array.isArray(locations) ? locations : []).map((loc: any) => (
                                    <SelectItem key={loc.id} value={String(loc.id)}>
                                      {loc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                If set, this rule only runs for appointments at the selected location.
                              </FormDescription>
                              <div className="flex flex-wrap gap-2 pt-1">
                                {(Array.isArray(locations) ? locations : []).map((loc: any) => (
                                  <Button
                                    key={`sms-locbtn-${loc.id}`}
                                    type="button"
                                    size="sm"
                                    variant={selectedSMSLocationId === String(loc.id) ? 'default' : 'secondary'}
                                    onClick={() => setSelectedSMSLocationId(String(loc.id))}
                                  >
                                    {loc.name}
                                  </Button>
                                ))}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={selectedSMSLocationId === '' ? 'default' : 'secondary'}
                                  onClick={() => setSelectedSMSLocationId('')}
                                >
                                  All
                                </Button>
                              </div>
                            </div>
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
                                    ref={(el) => { smsTemplateRef.current = el; (field as any).ref?.(el); }} 
                                  />
                                </FormControl>
                                <FormDescription>
                                  Max 500 characters. Variables: {templateVariables.slice(0, 5).join(", ")}, etc.
                                </FormDescription>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {templateVariables.map((tok) => (
                                    <Button
                                      key={`sms-${tok}`}
                                      type="button"
                                      variant="default"
                                      size="sm"
                                      onClick={() => insertAtCursor(smsTemplateRef.current, field.value as any, field.onChange, tok)}
                                    >
                                      {tok}
                                    </Button>
                                  ))}
                                </div>
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
                            onClick={() => openTestDialog(rule)}
                            title="Test this automation"
                          >
                            <Beaker className="h-4 w-4" />
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

            {/* Test Automation Dialog */}
            <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Test Automation</DialogTitle>
                  <DialogDescription>
                    {testingRule ? `Rule: ${testingRule.name}` : ''}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <label className="text-sm font-medium">Test Email</label>
                  <Input 
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="name@example.com"
                  />
                  <p className="text-xs text-gray-500">
                    Sends this rule’s email content directly to the address above (ignores client preferences).
                  </p>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-medium">Location (optional)</label>
                  <Select value={testLocationId} onValueChange={(v) => setTestLocationId(v === 'all' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All locations</SelectItem>
                      {(Array.isArray(locations) ? locations : []).map((loc: any) => (
                        <SelectItem key={`testloc-${loc.id}`} value={String(loc.id)}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">If your rule has a location tag (e.g., [location:2]), set the matching location here for testing.</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(Array.isArray(locations) ? locations : []).map((loc: any) => (
                      <Button
                        key={`test-locbtn-${loc.id}`}
                        type="button"
                        size="sm"
                        variant={testLocationId === String(loc.id) ? 'default' : 'secondary'}
                        onClick={() => setTestLocationId(String(loc.id))}
                      >
                        {loc.name}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant={testLocationId === '' ? 'default' : 'secondary'}
                      onClick={() => setTestLocationId('')}
                    >
                      All
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTestDialogOpen(false)} disabled={isTesting}>Cancel</Button>
                  <Button onClick={runAutomationTest} disabled={isTesting}>
                    {isTesting ? 'Testing...' : 'Run Test'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}