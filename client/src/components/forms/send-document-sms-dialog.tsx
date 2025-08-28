import React, { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquare, User, Phone } from "lucide-react";

const sendDocumentSMSSchema = z.object({
  sendMethod: z.enum(["client", "phone"]),
  clientId: z.string().optional(),
  phone: z.string().optional(),
  customMessage: z.string().optional(),
}).refine((data) => {
  if (data.sendMethod === "client" && !data.clientId) return false;
  if (data.sendMethod === "phone" && !data.phone) return false;
  return true;
}, { message: "Please select a client or enter a phone number" });

type SendDocumentSMSValues = z.infer<typeof sendDocumentSMSSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
}

export function SendDocumentSMSDialog({ open, onOpenChange, documentId, documentTitle }: Props) {
  const [sendMethod, setSendMethod] = useState<"client" | "phone">("client");
  const [clientSearch, setClientSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const form = useForm<SendDocumentSMSValues>({
    resolver: zodResolver(sendDocumentSMSSchema),
    defaultValues: { sendMethod: "client", clientId: "", phone: "", customMessage: "" },
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(clientSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [clientSearch]);

  useEffect(() => {
    async function run() {
      if (!open || sendMethod !== "client" || debouncedSearch.length < 2) return;
      try {
        setLoadingClients(true);
        const res = await fetch(`/api/users?role=client&search=${encodeURIComponent(debouncedSearch)}`);
        if (res.ok) {
          const list = await res.json();
          setClients((list || []).filter((c: any) => c.phone).slice(0, 50));
        }
      } finally {
        setLoadingClients(false);
      }
    }
    run();
  }, [open, sendMethod, debouncedSearch]);

  const sendSMSMutation = useMutation({
    mutationFn: async (data: SendDocumentSMSValues) => {
      const payload: any = { customMessage: data.customMessage };
      if (data.sendMethod === "client") payload.clientId = data.clientId;
      else payload.phone = data.phone;
      const res = await fetch(`/api/documents/${documentId}/send-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send SMS");
      }
      return res.json();
    },
    onSuccess: () => {
      onOpenChange(false);
    }
  });

  const onSubmit = (data: SendDocumentSMSValues) => sendSMSMutation.mutate(data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send Document via SMS
          </DialogTitle>
          <DialogDescription>
            Send "{documentTitle}" to a client via SMS. They will receive a link to view the document.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField name="sendMethod" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Send Method</FormLabel>
                <Select value={field.value} onValueChange={(v: any) => { field.onChange(v); setSendMethod(v); form.setValue('clientId',''); form.setValue('phone',''); }}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select send method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="client"><div className="flex items-center gap-2"><User className="h-4 w-4"/>Send to Client</div></SelectItem>
                    <SelectItem value="phone"><div className="flex items-center gap-2"><Phone className="h-4 w-4"/>Send to Phone Number</div></SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {sendMethod === 'client' && (
              <>
                <div className="space-y-2">
                  <Label>Search Client</Label>
                  <Input placeholder="Type at least 2 characters to search clients" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
                </div>
                <FormField name="clientId" control={form.control} render={({ field }) => (
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
                          <SelectItem value="_hint" disabled>Type at least 2 characters to search</SelectItem>
                        ) : loadingClients ? (
                          <SelectItem value="_loading" disabled>Searching...</SelectItem>
                        ) : (clients.length === 0 ? (
                          <SelectItem value="_none" disabled>No clients found</SelectItem>
                        ) : clients.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            <div className="flex flex-col">
                              <span>{c.firstName} {c.lastName}</span>
                              <span className="text-xs text-gray-500">{c.phone}</span>
                            </div>
                          </SelectItem>
                        )))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </>
            )}

            {sendMethod === 'phone' && (
              <FormField name="phone" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField name="customMessage" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Custom Message (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Hi! Please review this document from Glo Head Spa..." className="min-h-[100px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={sendSMSMutation.isPending}>
                <MessageSquare className="h-4 w-4 mr-2" />
                {sendSMSMutation.isPending ? 'Sending...' : 'Send SMS'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


