import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Bot, 
  Mail, 
  MessageSquare, 
  Send, 
  RefreshCw, 
  User, 
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const aiMessagingSchema = z.object({
  clientId: z.string().min(1, "Please select a client"),
  clientMessage: z.string().min(1, "Please enter the client's message"),
  channel: z.enum(["email", "sms"]),
  subject: z.string().optional(),
});

type AIMessagingValues = z.infer<typeof aiMessagingSchema>;

interface AIMessagingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIMessagingDialog({ open, onOpenChange }: AIMessagingDialogProps) {
  const [aiResponse, setAiResponse] = useState<string>("");
  const [suggestedActions, setSuggestedActions] = useState<any[]>([]);
  const [confidence, setConfidence] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AIMessagingValues>({
    resolver: zodResolver(aiMessagingSchema),
    defaultValues: {
      clientId: "",
      clientMessage: "",
      channel: "email",
      subject: "",
    },
  });

  const selectedChannel = form.watch("channel");

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/users?role=client"],
    queryFn: async () => {
      const response = await fetch("/api/users?role=client");
      if (!response.ok) throw new Error("Failed to fetch clients");
      return response.json();
    },
    enabled: open,
  });

  // Generate AI response mutation
  const generateResponseMutation = useMutation({
    mutationFn: async (data: AIMessagingValues) => {
      const response = await fetch("/api/llm/generate-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientMessage: data.clientMessage,
          clientId: parseInt(data.clientId),
          channel: data.channel,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate response");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setAiResponse(data.response);
      setSuggestedActions(data.suggestedActions || []);
      setConfidence(data.confidence || 0);
      toast({
        title: "AI Response Generated",
        description: "The AI has generated a response for you to review.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate AI response",
        variant: "destructive",
      });
    },
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (data: { clientId: string; clientMessage: string; aiResponse: string; subject?: string }) => {
      const response = await fetch("/api/llm/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send email");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "AI response has been sent to the client via email.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    },
  });

  // Send SMS mutation
  const sendSMSMutation = useMutation({
    mutationFn: async (data: { clientId: string; clientMessage: string; aiResponse: string }) => {
      const response = await fetch("/api/llm/send-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send SMS");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "SMS Sent",
        description: "AI response has been sent to the client via SMS.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send SMS",
        variant: "destructive",
      });
    },
  });

  const handleGenerateResponse = async (data: AIMessagingValues) => {
    setIsGenerating(true);
    try {
      await generateResponseMutation.mutateAsync(data);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendResponse = async () => {
    const data = form.getValues();
    setIsSending(true);
    
    try {
      if (data.channel === "email") {
        await sendEmailMutation.mutateAsync({
          clientId: data.clientId,
          clientMessage: data.clientMessage,
          aiResponse,
          subject: data.subject,
        });
      } else {
        await sendSMSMutation.mutateAsync({
          clientId: data.clientId,
          clientMessage: data.clientMessage,
          aiResponse,
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setAiResponse("");
    setSuggestedActions([]);
    setConfidence(0);
    onOpenChange(false);
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return "bg-green-100 text-green-800";
    if (conf >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getConfidenceIcon = (conf: number) => {
    if (conf >= 0.8) return <CheckCircle className="h-4 w-4" />;
    if (conf >= 0.6) return <AlertCircle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI-Powered Client Messaging
          </DialogTitle>
          <DialogDescription>
            Generate intelligent responses to client messages using AI, then send via email or SMS.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Input Form */}
          <Form {...form}>
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client: any) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {client.firstName && client.lastName
                                  ? `${client.firstName} ${client.lastName}`
                                  : client.username}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="channel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Channel</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="email">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Email
                            </div>
                          </SelectItem>
                          <SelectItem value="sms">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              SMS
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {selectedChannel === "email" && (
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter email subject..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="clientMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter the client's message here..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                onClick={form.handleSubmit(handleGenerateResponse)}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating Response...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate AI Response
                  </>
                )}
              </Button>
            </form>
          </Form>

          {/* AI Response */}
          {aiResponse && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    AI Generated Response
                  </div>
                  <Badge className={getConfidenceColor(confidence)}>
                    <div className="flex items-center gap-1">
                      {getConfidenceIcon(confidence)}
                      {Math.round(confidence * 100)}% Confidence
                    </div>
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{aiResponse}</p>
                </div>

                {/* Suggested Actions */}
                {suggestedActions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Suggested Actions:</h4>
                    <div className="space-y-2">
                      {suggestedActions.map((action, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">{action.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Send Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleSendResponse}
                    disabled={isSending}
                    className="flex-1"
                  >
                    {isSending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send via {selectedChannel === "email" ? "Email" : "SMS"}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 