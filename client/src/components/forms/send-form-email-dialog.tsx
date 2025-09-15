import React, { useEffect, useState } from "react";
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
import { Mail, User } from "lucide-react";

const sendFormEmailSchema = z.object({
  sendMethod: z.enum(["client", "email"]),
  clientId: z.string().optional(),
  email: z.string().email().optional(),
  subject: z.string().optional(),
  customMessage: z.string().optional(),
}).refine((data) => {
  if (data.sendMethod === "client" && !data.clientId) return false;
  if (data.sendMethod === "email" && !data.email) return false;
  return true;
}, {
  message: "Please select a client or enter an email address",
});

type SendFormEmailValues = z.infer<typeof sendFormEmailSchema>;

interface SendFormEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: number;
  formTitle: string;
}

export function SendFormEmailDialog({ open, onOpenChange, formId, formTitle }: SendFormEmailDialogProps) {
  const queryClient = useQueryClient();
  const [sendMethod, setSendMethod] = useState<"client" | "email">("client");
  const [message, setMessage] = useState<string>("");

  const form = useForm<SendFormEmailValues>({
    resolver: zodResolver(sendFormEmailSchema),
    defaultValues: {
      sendMethod: "client",
      clientId: "",
      email: "",
      subject: "",
      customMessage: "",
    },
  });

  // Debounced client search
  const [clientSearch, setClientSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(clientSearch.trim()), 300);
    return () => clearTimeout(handle);
  }, [clientSearch]);

  const { data: clients = [], isFetching: isSearchingClients } = useQuery({
    queryKey: ["/api/users?role=client", debouncedSearch],
    queryFn: async () => {
      const qs = debouncedSearch && debouncedSearch.length >= 2
        ? `&search=${encodeURIComponent(debouncedSearch)}`
        : "";
      const response = await fetch(`/api/users?role=client${qs}`);
      if (!response.ok) throw new Error("Failed to fetch clients");
      return response.json();
    },
    enabled: open && sendMethod === "client" && debouncedSearch.length >= 2,
    staleTime: 30_000,
  });

  const clientsWithEmail = (clients || []).filter((client: any) => client.email);
  const limitedClients = clientsWithEmail.slice(0, 50);

  const sendEmailMutation = useMutation({
    mutationFn: async (data: SendFormEmailValues) => {
      const payload: any = {
        customMessage: data.customMessage,
        subject: data.subject,
      };
      if (data.sendMethod === "client") {
        payload.clientId = data.clientId;
      } else {
        payload.email = data.email;
      }
      const response = await fetch(`/api/forms/${formId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to send email");
      }
      return response.json();
    },
    onSuccess: () => {
      setMessage("Email sent successfully!");
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      setTimeout(() => {
        onOpenChange(false);
        form.reset();
        setMessage("");
      }, 2000);
    },
    onError: (error: any) => {
      setMessage(`Error: ${error.message || "Failed to send email"}`);
    },
  });

  const onSubmit = (data: SendFormEmailValues) => {
    sendEmailMutation.mutate(data);
  };

  const handleSendMethodChange = (value: "client" | "email") => {
    setSendMethod(value);
    form.setValue("sendMethod", value);
    form.setValue("clientId", "");
    form.setValue("email", "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Form via Email
          </DialogTitle>
          <DialogDescription>
            Send "{formTitle}" to a client via email. They will receive a link to complete the form.
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
                  <Select value={field.value} onValueChange={(v: any) => handleSendMethodChange(v)}>
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
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Send to Email Address
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {sendMethod === "client" && (
              <>
                <div className="space-y-2">
                  <Label>Search Client</Label>
                  <Input
                    placeholder="Type at least 2 characters to search clients"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                </div>
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
                          {debouncedSearch.length < 2 ? (
                            <SelectItem value="_hint" disabled>
                              Type at least 2 characters to search
                            </SelectItem>
                          ) : isSearchingClients ? (
                            <SelectItem value="_loading" disabled>
                              Searching...
                            </SelectItem>
                          ) : limitedClients.length === 0 ? (
                            <SelectItem value="_none" disabled>
                              No clients found
                            </SelectItem>
                          ) : (
                            limitedClients.map((client: any) => (
                              <SelectItem key={client.id} value={client.id.toString()}>
                                <div className="flex flex-col">
                                  <span>{client.firstName} {client.lastName}</span>
                                  <span className="text-xs text-gray-500">{client.email}</span>
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
              </>
            )}

            {sendMethod === "email" && (
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="client@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="New form to complete" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Hi! You have a new form from Glo Flo App..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={sendEmailMutation.isPending}>
                <Mail className="h-4 w-4 mr-2" />
                {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}



