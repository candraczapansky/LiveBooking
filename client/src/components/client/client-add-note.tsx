import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type ClientAddNoteProps = {
  clientId: number;
  onCreated?: () => void;
};

export default function ClientAddNote({ clientId, onCreated }: ClientAddNoteProps) {
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/note-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          noteContent: note.trim(),
          noteType: "general",
          createdBy: 1,
          createdByRole: "staff",
        }),
      });
      if (!res.ok) throw new Error("Failed to save note");
      setNote("");
      onCreated?.();
      toast({ title: "Saved", description: "Note added to client" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to save note", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Note</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Write a note for this client..."
        />
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || !note.trim()}> {saving ? "Saving..." : "Save Note"} </Button>
        </div>
      </CardContent>
    </Card>
  );
}


