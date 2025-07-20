import React, { useState } from "react";
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
import { MessageSquare, User, Phone } from "lucide-react";

const sendFormSMSSchema = z.object({
  sendMethod: z.enum(["client", "phone"]),
  clientId: z.string().optional(),
  phone: z.string().optional(),
  customMessage: z.string().optional(),
}).refine((data) => {
  if (data.sendMethod === "client" && !data.clientId) {
    return false;
  }
  if (data.sendMethod === "phone" && !data.phone) {
    return false;
  }
  return true;
}, {
  message: "Please select a client or enter a phone number",
});

type SendFormSMSValues = z.infer<typeof sendFormSMSSchema>;

interface SendFormSMSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: number;
  formTitle: string;
}

export function SendFormSMSDialog({
  open,
  onOpenChange,
  formId,
  formTitle,
}: SendFormSMSDialogProps) {
  const queryClient = useQueryClient();
  const [sendMethod, setSendMethod] = useState<"client" | "phone">("client");
  const [message, setMessage] = useState<string>("");

  const form = useForm<SendFormSMSValues>({
    resolver: zodResolver(sendFormSMSSchema),
    defaultValues: {
      sendMethod: "client",
      clientId: "",
      phone: "",
      customMessage: "",
    },
  });

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

  // Filter clients with phone numbers
  const clientsWithPhone = clients.filter((client: any) => client.phone);

  // Send SMS mutation
  const sendSMSMutation = useMutation({
    mutationFn: async (data: SendFormSMSValues) => {
      const payload: any = {
        customMessage: data.customMessage,
      };

      if (data.sendMethod === "client") {
        payload.clientId = data.clientId;
      } else {
        payload.phone = data.phone;
      }

      const response = await fetch(`/api/forms/${formId}/send-sms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send SMS");
      }

      return response.json();
    },
    onSuccess: () => {
      setMessage("SMS sent successfully!");
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      setTimeout(() => {
        onOpenChange(false);
        form.reset();
        setMessage("");
      }, 2000);
    },
    onError: (error: any) => {
      setMessage(`Error: ${error.message || "Failed to send SMS"}`);
    },
  });

  const onSubmit = (data: SendFormSMSValues) => {
    sendSMSMutation.mutate(data);
  };

  const handleSendMethodChange = (value: "client" | "phone") => {
    setSendMethod(value);
    form.setValue("sendMethod", value);
    form.setValue("clientId", "");
    form.setValue("phone", "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send Form via SMS
          </DialogTitle>
          <DialogDescription>
            Send "{formTitle}" to a client via SMS. They will receive a link to complete the form.
          </DialogDescription>
        </DialogHeader>

        {message && (
          <div className={`p-3 rounded-md text-sm ${
            message.startsWith("Error") 
              ? "bg-red-50 text-red-700 border border-red-200" 
              : "bg-green-50 text-green-700 border border-green-200"
          }`}>
            {message}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sendMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Send Method</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value: "client" | "phone") => handleSendMethodChange(value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select send method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="client">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Send to Client
                        </div>
                      </SelectItem>
                      <SelectItem value="phone">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Send to Phone Number
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {sendMethod === "client" && (
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Client</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientsWithPhone.length === 0 ? (
                          <SelectItem value="no-clients" disabled>
                            No clients with phone numbers found
                          </SelectItem>
                        ) : (
                          clientsWithPhone.map((client: any) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              <div className="flex flex-col">
                                <span>{client.firstName} {client.lastName}</span>
                                <span className="text-xs text-gray-500">{client.phone}</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {sendMethod === "phone" && (
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(555) 123-4567"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="customMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Hi! You have a new form from Glo Head Spa..."
                      className="min-h-[100px]"
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
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={sendSMSMutation.isPending}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {sendSMSMutation.isPending ? "Sending..." : "Send SMS"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 