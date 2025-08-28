import React from "react";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Mail } from "lucide-react";

const schema = z.object({
  sendMethod: z.enum(["client", "email"]).default("client"),
  clientId: z.string().optional(),
  email: z.string().email().optional(),
  subject: z.string().optional(),
  customMessage: z.string().optional(),
}).refine((d) => !!(d.clientId || d.email), { message: "Select a client or enter an email" });

type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
}

export function SendDocumentEmailDialog({ open, onOpenChange, documentId, documentTitle }: Props) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { sendMethod: "client", subject: documentTitle } });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: Values) => {
      const payload: any = { subject: data.subject, customMessage: data.customMessage };
      if (data.clientId) payload.clientId = data.clientId; else payload.email = data.email;
      const res = await fetch(`/api/documents/${documentId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send email");
      }
      return res.json();
    },
    onSuccess: () => onOpenChange(false)
  });

  const onSubmit = (data: Values) => sendEmailMutation.mutate(data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5"/>Send Document via Email</DialogTitle>
          <DialogDescription>Send "{documentTitle}" to a client via email with a link to view it.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField name="sendMethod" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Send Method</FormLabel>
                <FormControl>
                  <select className="w-full border rounded h-9 px-2 bg-background" value={field.value} onChange={(e) => { const v = e.target.value as any; field.onChange(v); form.setValue('clientId',''); form.setValue('email',''); }}>
                    <option value="client">Send to Client</option>
                    <option value="email">Send to Email Address</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {form.watch('sendMethod') === 'client' ? (
              <FormField name="clientId" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Client ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Client ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            ) : (
              <FormField name="email" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField name="subject" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Subject</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField name="customMessage" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel>Custom Message (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Please review this document..." className="min-h-[100px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={sendEmailMutation.isPending}><Mail className="h-4 w-4 mr-2"/>{sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


