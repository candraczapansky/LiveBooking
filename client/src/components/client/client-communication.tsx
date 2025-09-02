import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  MessageSquare, 
  Mail, 
  Phone, 
  Send, 
  Calendar,
  FileText,
  Bell,
  CheckCircle
} from "lucide-react";
import { PermissionGuard } from "@/components/permissions/PermissionGuard";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface ClientCommunicationProps {
  clientId: number;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
}

const messageSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  type: z.enum(["email", "sms", "reminder"]),
});

type MessageFormValues = z.infer<typeof messageSchema>;

export default function ClientCommunication({ 
  clientId, 
  clientName, 
  clientEmail, 
  clientPhone 
}: ClientCommunicationProps) {
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const messageForm = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      subject: "",
      message: "",
      type: "email",
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: MessageFormValues) => {
      return apiRequest("POST", "/api/communications/send", {
        clientId,
        ...data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
      setIsMessageDialogOpen(false);
      messageForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/communications/reminder", {
        clientId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Reminder Sent",
        description: "Appointment reminder has been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reminder",
        variant: "destructive",
      });
    },
  });

  const handleQuickAction = (action: string) => {
    setSelectedAction(action);
    setIsMessageDialogOpen(true);
    
    // Pre-fill form based on action
    switch (action) {
      case "welcome":
        messageForm.reset({
          subject: "Welcome to Glo Head Spa!",
          message: `Hi ${clientName},\n\nWelcome to Glo Head Spa! We're excited to have you as a client.\n\nIf you have any questions or need to book an appointment, please don't hesitate to reach out.\n\nBest regards,\nThe Glo Head Spa Team`,
          type: "email",
        });
        break;
      case "followup":
        messageForm.reset({
          subject: "How was your visit?",
          message: `Hi ${clientName},\n\nThank you for visiting Glo Head Spa! We hope you enjoyed your experience.\n\nWe'd love to hear your feedback and would be happy to help you book your next appointment.\n\nBest regards,\nThe Glo Head Spa Team`,
          type: "email",
        });
        break;
      case "promotion":
        messageForm.reset({
          subject: "Special Offer Just for You!",
          message: `Hi ${clientName},\n\nWe have a special offer just for our valued clients!\n\n[Add your promotion details here]\n\nBook your appointment today to take advantage of this offer.\n\nBest regards,\nThe Glo Head Spa Team`,
          type: "email",
        });
        break;
      case "reminder":
        sendReminderMutation.mutate();
        return;
      default:
        messageForm.reset({
          subject: "",
          message: "",
          type: "email",
        });
    }
  };

  const handleSendMessage = (values: MessageFormValues) => {
    sendMessageMutation.mutate(values);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "welcome":
        return <CheckCircle className="h-4 w-4" />;
      case "followup":
        return <MessageSquare className="h-4 w-4" />;
      case "promotion":
        return <Bell className="h-4 w-4" />;
      case "reminder":
        return <Calendar className="h-4 w-4" />;
      default:
        return <Send className="h-4 w-4" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "welcome":
        return "Send Welcome";
      case "followup":
        return "Send Follow-up";
      case "promotion":
        return "Send Promotion";
      case "reminder":
        return "Send Reminder";
      default:
        return "Send Message";
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Quick Communication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Contact Info */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">
                  <PermissionGuard permission="view_client_contact_info" fallback={<span className="italic text-gray-400">Hidden</span>}>
                    {clientEmail}
                  </PermissionGuard>
                </span>
              </div>
              {clientPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-green-600" />
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">
                    <PermissionGuard permission="view_client_contact_info" fallback={<span className="italic text-gray-400">Hidden</span>}>
                      {clientPhone}
                    </PermissionGuard>
                  </span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleQuickAction("welcome")}
                className="h-auto p-3 flex-col gap-2"
              >
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm">Welcome Message</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleQuickAction("followup")}
                className="h-auto p-3 flex-col gap-2"
              >
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <span className="text-sm">Follow-up</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleQuickAction("promotion")}
                className="h-auto p-3 flex-col gap-2"
              >
                <Bell className="h-5 w-5 text-purple-600" />
                <span className="text-sm">Promotion</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleQuickAction("reminder")}
                className="h-auto p-3 flex-col gap-2"
                disabled={sendReminderMutation.isPending}
              >
                <Calendar className="h-5 w-5 text-orange-600" />
                <span className="text-sm">
                  {sendReminderMutation.isPending ? "Sending..." : "Reminder"}
                </span>
              </Button>
            </div>

            {/* Custom Message Button */}
            <Button
              variant="default"
              onClick={() => {
                setSelectedAction("custom");
                setIsMessageDialogOpen(true);
                messageForm.reset({
                  subject: "",
                  message: "",
                  type: "email",
                });
              }}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Custom Message
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Message Dialog */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {getActionLabel(selectedAction)} to {clientName}
            </DialogTitle>
            <DialogDescription>
              Send a message to {clientName} via email or SMS.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...messageForm}>
            <form onSubmit={messageForm.handleSubmit(handleSendMessage)} className="space-y-4">
              <FormField
                control={messageForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message Type</FormLabel>
                    <div className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="email"
                          value="email"
                          checked={field.value === "email"}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="h-4 w-4 text-blue-600"
                        />
                        <label htmlFor="email" className="text-sm font-medium">
                          Email
                        </label>
                      </div>
                      {clientPhone && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="sms"
                            value="sms"
                            checked={field.value === "sms"}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="h-4 w-4 text-blue-600"
                          />
                          <label htmlFor="sms" className="text-sm font-medium">
                            SMS
                          </label>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={messageForm.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter message subject" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={messageForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter your message here..."
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsMessageDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={sendMessageMutation.isPending}
                >
                  {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
} 