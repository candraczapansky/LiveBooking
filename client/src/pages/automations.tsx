import { useState } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
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

// Types for automation rules
type AutomationRule = {
  id: number;
  name: string;
  type: 'email' | 'sms';
  trigger: 'appointment_reminder' | 'follow_up' | 'birthday' | 'no_show' | 'booking_confirmation' | 'cancellation' | 'custom';
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
  template: z.string().min(1, "Template is required").max(160, "SMS messages must be 160 characters or less"),
  active: z.boolean().default(true),
  customTriggerName: z.string().optional(),
});

type EmailRuleFormValues = z.infer<typeof emailRuleSchema>;
type SMSRuleFormValues = z.infer<typeof smsRuleSchema>;

export default function Automations() {
  const { isMobile } = useSidebar();
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isSMSDialogOpen, setIsSMSDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [selectedEmailTrigger, setSelectedEmailTrigger] = useState("");
  const [selectedSMSTrigger, setSelectedSMSTrigger] = useState("");

  // Mock automation rules data
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([
    {
      id: 1,
      name: "Appointment Reminder - 24h",
      type: "email",
      trigger: "appointment_reminder",
      timing: "24 hours before",
      subject: "Your appointment is tomorrow at {salon_name}",
      template: "Hi {client_name},\n\nThis is a friendly reminder that you have an appointment scheduled for tomorrow at {appointment_time} for {service_name} with {staff_name}.\n\nIf you need to reschedule or cancel, please call us at {salon_phone}.\n\nWe look forward to seeing you!\n\nBest regards,\n{salon_name}",
      active: true,
      lastRun: "2025-06-23T10:30:00Z",
      sentCount: 142
    },
    {
      id: 2,
      name: "SMS Reminder - 2h",
      type: "sms",
      trigger: "appointment_reminder",
      timing: "2 hours before",
      template: "Hi {client_name}, your appointment at {salon_name} is in 2 hours. See you at {appointment_time}!",
      active: true,
      lastRun: "2025-06-23T14:15:00Z",
      sentCount: 89
    },
    {
      id: 5,
      name: "Appointment Cancellation Email",
      type: "email",
      trigger: "cancellation",
      timing: "Immediately",
      subject: "Appointment Cancelled - {salon_name}",
      template: "Hi {client_name},\n\nWe've received your cancellation for your appointment scheduled on {appointment_datetime} for {service_name} with {staff_name}.\n\nYour appointment has been successfully cancelled. If you'd like to reschedule, please call us at {salon_phone} or book online.\n\nWe look forward to seeing you again soon!\n\nBest regards,\n{salon_name}",
      active: true,
      lastRun: "2025-06-24T16:04:00Z",
      sentCount: 1
    },
    {
      id: 6,
      name: "Cancellation Text",
      type: "sms",
      trigger: "cancellation",
      timing: "Immediately",
      template: "Hi {client_name}, your appointment at {salon_name} for {appointment_datetime} has been cancelled. Call {salon_phone} to reschedule anytime!",
      active: true,
      lastRun: "2025-06-24T16:04:00Z",
      sentCount: 1
    },
    {
      id: 3,
      name: "Booking Confirmation SMS",
      type: "sms",
      trigger: "booking_confirmation",
      timing: "Immediately",
      template: "Hi {client_name}! Your appointment at {salon_name} for {service_name} on {appointment_date} at {appointment_time} has been confirmed. See you soon!",
      active: true,
      lastRun: "2025-06-24T16:09:00Z",
      sentCount: 1
    },
    {
      id: 7,
      name: "Booking Confirmation Email",
      type: "email",
      trigger: "booking_confirmation",
      timing: "Immediately",
      subject: "Appointment Confirmed - {salon_name}",
      template: "Dear {client_name},\n\nYour appointment has been confirmed!\n\nDetails:\n- Service: {service_name}\n- Date & Time: {appointment_datetime}\n- Stylist: {staff_name}\n- Duration: {service_duration}\n- Price: {total_amount}\n\nLocation:\n{salon_address}\n\nIf you have any questions, please don't hesitate to contact us.\n\nThank you for choosing {salon_name}!",
      active: true,
      lastRun: "2025-06-23T16:45:00Z",
      sentCount: 67
    },
    {
      id: 4,
      name: "Follow-up Thank You",
      type: "email",
      trigger: "follow_up",
      timing: "1 day after",
      subject: "Thank you for visiting {salon_name}!",
      template: "Hi {client_name},\n\nThank you for visiting us yesterday! We hope you love your new look.\n\nWe'd love to hear about your experience. Please consider leaving us a review.\n\nDon't forget to book your next appointment to maintain your beautiful style.\n\nSee you soon!\n{salon_name}",
      active: false,
      lastRun: "2025-06-22T09:20:00Z",
      sentCount: 23
    }
  ]);

  // Form setup
  const emailForm = useForm<EmailRuleFormValues>({
    resolver: zodResolver(emailRuleSchema),
    defaultValues: {
      name: "",
      trigger: "",
      timing: "",
      subject: "",
      template: "",
      active: true,
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
    },
  });

  // Available trigger options
  const triggerOptions = [
    { value: "appointment_reminder", label: "Appointment Reminder" },
    { value: "booking_confirmation", label: "Booking Confirmation" },
    { value: "follow_up", label: "Follow-up" },
    { value: "birthday", label: "Birthday" },
    { value: "no_show", label: "No Show" },
    { value: "cancellation", label: "Appointment Cancellation" },
    { value: "custom", label: "Custom Trigger" },
  ];

  // Available timing options
  const timingOptions = [
    { value: "immediately", label: "Immediately" },
    { value: "30_minutes_before", label: "30 minutes before" },
    { value: "1_hour_before", label: "1 hour before" },
    { value: "2_hours_before", label: "2 hours before" },
    { value: "4_hours_before", label: "4 hours before" },
    { value: "24_hours_before", label: "24 hours before" },
    { value: "2_days_before", label: "2 days before" },
    { value: "1_week_before", label: "1 week before" },
    { value: "1_hour_after", label: "1 hour after" },
    { value: "1_day_after", label: "1 day after" },
    { value: "1_week_after", label: "1 week after" },
  ];

  // Available template variables
  const templateVariables = [
    "{client_name}", "{client_first_name}", "{client_last_name}",
    "{appointment_time}", "{appointment_date}", "{appointment_datetime}",
    "{service_name}", "{service_duration}", "{service_price}",
    "{staff_name}", "{staff_first_name}",
    "{salon_name}", "{salon_phone}", "{salon_address}",
    "{booking_date}", "{total_amount}"
  ];

  const onEmailSubmit = (data: EmailRuleFormValues) => {
    const newRule: AutomationRule = {
      id: Date.now(),
      name: data.name,
      type: "email",
      trigger: data.trigger as any,
      timing: data.timing,
      subject: data.subject,
      template: data.template,
      active: data.active,
      sentCount: 0,
      customTriggerName: data.trigger === "custom" ? data.customTriggerName : undefined
    };

    setAutomationRules(prev => [...prev, newRule]);
    setIsEmailDialogOpen(false);
    setSelectedEmailTrigger("");
    emailForm.reset();
  };

  const onSMSSubmit = (data: SMSRuleFormValues) => {
    const newRule: AutomationRule = {
      id: Date.now(),
      name: data.name,
      type: "sms",
      trigger: data.trigger as any,
      timing: data.timing,
      template: data.template,
      active: data.active,
      sentCount: 0,
      customTriggerName: data.trigger === "custom" ? data.customTriggerName : undefined
    };

    setAutomationRules(prev => [...prev, newRule]);
    setIsSMSDialogOpen(false);
    setSelectedSMSTrigger("");
    smsForm.reset();
  };

  const toggleRuleStatus = (id: number) => {
    setAutomationRules(prev => 
      prev.map(rule => 
        rule.id === id ? { ...rule, active: !rule.active } : rule
      )
    );
  };

  const deleteRule = (id: number) => {
    setAutomationRules(prev => prev.filter(rule => rule.id !== id));
  };

  const formatTriggerLabel = (trigger: string, customTriggerName?: string) => {
    if (trigger === "custom" && customTriggerName) {
      return customTriggerName;
    }
    return triggerOptions.find(opt => opt.value === trigger)?.label || trigger;
  };

  const emailRules = automationRules.filter(rule => rule.type === 'email');
  const smsRules = automationRules.filter(rule => rule.type === 'sms');

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="hidden lg:block">
        <SidebarController />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Automations</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Set up automated email and SMS reminders for your clients
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex space-x-3">
                <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Mail className="h-4 w-4 mr-2" />
                      Email Rule
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Email Automation Rule</DialogTitle>
                      <DialogDescription>
                        Set up an automated email to be sent to clients based on specific triggers.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...emailForm}>
                      <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                        <FormField
                          control={emailForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rule Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 24h Appointment Reminder" {...field} />
                              </FormControl>
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
                                }} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select trigger" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {triggerOptions.map(option => (
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
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select timing" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {timingOptions.map(option => (
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
                                  <Input placeholder="e.g., Cancellation Confirmation, Welcome Message" {...field} />
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
                                <Input placeholder="Your appointment reminder" {...field} />
                              </FormControl>
                              <FormDescription>
                                Use variables like {"{client_name}"}, {"{salon_name}"}, {"{appointment_time}"}
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
                                  className="min-h-[150px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Available variables: {templateVariables.join(", ")}
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
                          <Button type="submit">
                            Create Email Rule
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isSMSDialogOpen} onOpenChange={setIsSMSDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      SMS Rule
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create SMS Automation Rule</DialogTitle>
                      <DialogDescription>
                        Set up an automated SMS to be sent to clients based on specific triggers.
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
                                <Input placeholder="e.g., 2h SMS Reminder" {...field} />
                              </FormControl>
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
                                <FormLabel>Trigger</FormLabel>
                                <Select onValueChange={(value) => {
                                  field.onChange(value);
                                  setSelectedSMSTrigger(value);
                                }} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select trigger" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {triggerOptions.map(option => (
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
                            control={smsForm.control}
                            name="timing"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Timing</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select timing" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {timingOptions.map(option => (
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
                                  <Input placeholder="e.g., Cancellation Text, Welcome SMS" {...field} />
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
                                  placeholder="Hi {client_name}, your appointment is in 2 hours..."
                                  className="min-h-[100px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Max 160 characters. Variables: {templateVariables.slice(0, 5).join(", ")}, etc.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
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
                          <Button type="submit">
                            Create SMS Rule
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{automationRules.filter(r => r.active).length}</div>
                  <p className="text-xs text-muted-foreground">
                    {automationRules.length} total rules
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {emailRules.reduce((sum, rule) => sum + rule.sentCount, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">SMS Sent</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {smsRules.reduce((sum, rule) => sum + rule.sentCount, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">98.5%</div>
                  <p className="text-xs text-muted-foreground">
                    Delivery success
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Automation Rules */}
            <Tabs defaultValue="email" className="space-y-4">
              <TabsList>
                <TabsTrigger value="email" className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Email Rules ({emailRules.length})
                </TabsTrigger>
                <TabsTrigger value="sms" className="flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  SMS Rules ({smsRules.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="email">
                <div className="space-y-4">
                  {emailRules.map((rule) => (
                    <Card key={rule.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <CardTitle className="text-lg">{rule.name}</CardTitle>
                            <Badge variant={rule.active ? "default" : "secondary"}>
                              {rule.active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleRuleStatus(rule.id)}
                            >
                              {rule.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingRule(rule)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => deleteRule(rule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <strong>Trigger:</strong> {formatTriggerLabel(rule.trigger, rule.customTriggerName)}
                            </div>
                            <div>
                              <strong>Timing:</strong> {rule.timing}
                            </div>
                            <div>
                              <strong>Sent:</strong> {rule.sentCount} emails
                            </div>
                            <div>
                              <strong>Last run:</strong> {rule.lastRun ? new Date(rule.lastRun).toLocaleDateString() : 'Never'}
                            </div>
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div>
                            <strong>Subject:</strong> {rule.subject}
                          </div>
                          <div>
                            <strong>Template:</strong>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                              {rule.template.length > 200 ? rule.template.substring(0, 200) + "..." : rule.template}
                            </p>
                          </div>
                        </div>
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
              
              <TabsContent value="sms">
                <div className="space-y-4">
                  {smsRules.map((rule) => (
                    <Card key={rule.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <CardTitle className="text-lg">{rule.name}</CardTitle>
                            <Badge variant={rule.active ? "default" : "secondary"}>
                              {rule.active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleRuleStatus(rule.id)}
                            >
                              {rule.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingRule(rule)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => deleteRule(rule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <strong>Trigger:</strong> {formatTriggerLabel(rule.trigger, rule.customTriggerName)}
                            </div>
                            <div>
                              <strong>Timing:</strong> {rule.timing}
                            </div>
                            <div>
                              <strong>Sent:</strong> {rule.sentCount} SMS
                            </div>
                            <div>
                              <strong>Last run:</strong> {rule.lastRun ? new Date(rule.lastRun).toLocaleDateString() : 'Never'}
                            </div>
                          </div>
                        </CardDescription>
                      </CardHeader>
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