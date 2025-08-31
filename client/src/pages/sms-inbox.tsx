import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function SMSInboxPage() {
  useDocumentTitle("SMS Inbox");
  const qc = useQueryClient();
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [compose, setCompose] = useState<string>("");

  const { data: conversations = [], isLoading: loadingConvs } = useQuery({
    queryKey: ["/api/sms/conversations"],
    queryFn: async () => {
      const r = await fetch("/api/sms/conversations");
      if (!r.ok) throw new Error("Failed to fetch conversations");
      return r.json();
    },
    refetchInterval: 15000,
  });

  const { data: messages = [], isLoading: loadingMsgs } = useQuery({
    queryKey: ["/api/sms/messages", selectedPhone],
    queryFn: async () => {
      if (!selectedPhone) return [] as any[];
      const r = await fetch(`/api/sms/messages?phone=${encodeURIComponent(selectedPhone)}`);
      if (!r.ok) throw new Error("Failed to fetch messages");
      return r.json();
    },
    enabled: !!selectedPhone,
    refetchInterval: 8000,
  });

  const sendMutation = useMutation({
    mutationFn: async (payload: { phone: string; message: string }) => {
      const r = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok || j?.success === false) throw new Error(j?.error || "Failed to send");
      return j;
    },
    onSuccess: () => {
      setCompose("");
      qc.invalidateQueries({ queryKey: ["/api/sms/messages", selectedPhone] });
      qc.invalidateQueries({ queryKey: ["/api/sms/conversations"] });
    },
  });

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c: any) =>
      (c.clientName || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.lastMessage || "").toLowerCase().includes(q)
    );
  }, [search, conversations]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 flex flex-col p-4 md:p-6 gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-6rem)]">
          <Card className="md:col-span-1 flex flex-col">
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
              <Input
                placeholder="Search by name, phone, or message…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="flex-1 overflow-y-auto divide-y">
                {loadingConvs ? (
                  <div className="p-4 text-sm text-gray-500">Loading…</div>
                ) : filtered.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">No conversations</div>
                ) : (
                  filtered.map((c: any) => (
                    <button
                      key={c.phone}
                      className={`w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-800 ${selectedPhone === c.phone ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                      onClick={() => setSelectedPhone(c.phone)}
                    >
                      <div className="text-sm font-medium">{c.clientName || c.phone}</div>
                      <div className="text-xs text-gray-500 truncate">{c.lastMessage}</div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 flex flex-col">
            <CardHeader>
              <CardTitle>
                {selectedPhone ? `Thread: ${selectedPhone}` : "Select a conversation"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-2 p-2 rounded bg-white dark:bg-gray-900 border">
                {selectedPhone ? (
                  loadingMsgs ? (
                    <div className="p-2 text-sm text-gray-500">Loading…</div>
                  ) : messages.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No messages</div>
                  ) : (
                    messages.map((m: any, i: number) => (
                      <div
                        key={i}
                        className={`max-w-[80%] p-2 rounded ${
                          m.direction === "outbound"
                            ? "ml-auto bg-blue-600 text-white"
                            : "mr-auto bg-gray-200 dark:bg-gray-800"
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm">{m.body}</div>
                        <div className="text-[10px] opacity-70 mt-1">
                          {new Date(m.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  <div className="p-2 text-sm text-gray-500">Pick a conversation on the left.</div>
                )}
              </div>

              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message…"
                  value={compose}
                  onChange={(e) => setCompose(e.target.value)}
                  disabled={!selectedPhone}
                />
                <Button
                  onClick={() => selectedPhone && compose.trim() && sendMutation.mutate({ phone: selectedPhone, message: compose.trim() })}
                  disabled={!selectedPhone || !compose.trim() || sendMutation.isPending}
                >
                  {sendMutation.isPending ? "Sending…" : "Send"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}



