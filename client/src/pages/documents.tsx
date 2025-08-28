import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Eye, Edit, Trash2, PlusCircle, MessageSquare, Mail, FileText } from "lucide-react";
import EmailTemplateEditor, { EmailTemplateEditorRef } from "@/components/email/EmailTemplateEditor";
import { SendDocumentSMSDialog } from "@/components/forms/send-document-sms-dialog";
import { SendDocumentEmailDialog } from "@/components/forms/send-document-email-dialog";

type DocumentRecord = {
  id: string;
  title: string;
  description?: string;
  status: "active" | "draft" | "inactive";
  tags?: string[];
  design?: any;
  htmlContent: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function DocumentsPage() {
  useDocumentTitle("Documents | Glo Head Spa");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [docToEdit, setDocToEdit] = useState<DocumentRecord | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [docToView, setDocToView] = useState<DocumentRecord | null>(null);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedDocForSend, setSelectedDocForSend] = useState<DocumentRecord | null>(null);
  const emailEditorRef = useRef<EmailTemplateEditorRef>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftStatus, setDraftStatus] = useState<"active" | "draft" | "inactive">("active");
  const [design, setDesign] = useState<any>(null);
  const [editorHtml, setEditorHtml] = useState<string>("");

  const { data: documents = [], isLoading } = useQuery<DocumentRecord[]>({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("Failed to load documents");
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<DocumentRecord>) => {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to create document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setIsEditorOpen(false);
      toast({ title: "Saved", description: "Document created" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" })
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<DocumentRecord> }) => {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to update document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setIsEditorOpen(false);
      setDocToEdit(null);
      toast({ title: "Updated", description: "Document updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to update", variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Deleted", description: "Document deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to delete", variant: "destructive" })
  });

  const openCreate = () => {
    setDocToEdit(null);
    setDraftTitle("");
    setDraftDescription("");
    setDraftStatus("active");
    setDesign(null);
    setEditorHtml("");
    setIsEditorOpen(true);
  };

  const openEdit = (doc: DocumentRecord) => {
    setDocToEdit(doc);
    setDraftTitle(doc.title || "");
    setDraftDescription(doc.description || "");
    setDraftStatus(doc.status || "active");
    setDesign(doc.design || null);
    setEditorHtml(doc.htmlContent || "");
    setIsEditorOpen(true);
  };

  const saveDocument = async () => {
    const exported = await emailEditorRef.current?.exportHtml();
    const finalDesign = exported?.design ?? design;
    const finalHtml = exported?.html ?? editorHtml;
    const payload: Partial<DocumentRecord> = {
      title: draftTitle.trim() || "Untitled Document",
      description: draftDescription,
      status: draftStatus,
      design: finalDesign,
      htmlContent: finalHtml || "",
    };
    if (docToEdit) {
      updateMutation.mutate({ id: docToEdit.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-screen-2xl mx-auto w-full px-2 sm:px-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Documents</h1>
              </div>
              <div className="mt-4 sm:mt-0">
                <Button onClick={openCreate} variant="default" className="flex items-center justify-center h-12 w-full sm:w-auto">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Document
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {(documents || []).map((doc) => (
                <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{doc.title}</CardTitle>
                        <CardDescription className="mt-1">{doc.description}</CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{doc.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setDocToView(doc); setIsViewOpen(true); }}>
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(doc)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => window.open(`/api/public-documents/${doc.id}`, "_blank") }>
                        <FileText className="h-4 w-4 mr-1" />
                        Public Link
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(doc.id)}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setSelectedDocForSend(doc); setSmsDialogOpen(true); }}>
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Send SMS
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setSelectedDocForSend(doc); setEmailDialogOpen(true); }}>
                        <Mail className="h-4 w-4 mr-1" />
                        Send Email
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Editor Modal */}
      <Dialog open={isEditorOpen} onOpenChange={(o) => { setIsEditorOpen(o); if (!o) setDocToEdit(null); }}>
        <DialogContent className="w-[95vw] h-[90vh] max-h-[95vh] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw] 2xl:max-w-[95vw] p-2">
          <DialogHeader>
            <DialogTitle>{docToEdit ? "Edit Document" : "New Document"}</DialogTitle>
            <DialogDescription>Use the template builder to compose the document content.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Title</Label>
                <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <select className="w-full border rounded h-9 px-2 bg-background" value={draftStatus} onChange={(e) => setDraftStatus(e.target.value as any)}>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={draftDescription} onChange={(e) => setDraftDescription(e.target.value)} />
            </div>
            <div className="h-[calc(90vh-180px)] border rounded">
              <EmailTemplateEditor
                ref={emailEditorRef}
                onDesignChange={setDesign}
                onHtmlChange={setEditorHtml}
                initialDesign={design}
                className="h-full"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
            <Button onClick={saveDocument}>{docToEdit ? "Save Changes" : "Create Document"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> {docToView?.title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto p-3 border rounded bg-white">
            <div dangerouslySetInnerHTML={{ __html: docToView?.htmlContent || "" }} />
          </div>
        </DialogContent>
      </Dialog>

      {selectedDocForSend && (
        <SendDocumentSMSDialog
          open={smsDialogOpen}
          onOpenChange={(o) => { setSmsDialogOpen(o); if (!o) setSelectedDocForSend(null); }}
          documentId={selectedDocForSend.id}
          documentTitle={selectedDocForSend.title}
        />
      )}
      {selectedDocForSend && (
        <SendDocumentEmailDialog
          open={emailDialogOpen}
          onOpenChange={(o) => { setEmailDialogOpen(o); if (!o) setSelectedDocForSend(null); }}
          documentId={selectedDocForSend.id}
          documentTitle={selectedDocForSend.title}
        />
      )}
    </div>
  );
}


