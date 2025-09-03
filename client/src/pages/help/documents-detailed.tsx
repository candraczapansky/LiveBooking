import { FileText, MessageSquare, Mail, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpDocumentsDetailed() {
  useDocumentTitle("Help | Documents");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'create', label: 'Create & edit' },
    { id: 'public', label: 'Public links' },
    { id: 'send', label: 'Send via SMS/Email' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Documents (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Create templates and share them with clients</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Design documents using the built-in editor, share public links, and send via SMS/Email.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Documents grid</div>
            </CardContent>
          </Card>

          <Card id="create">
            <CardHeader><CardTitle>Create & edit</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Open New Document or Edit; use the email template editor to design content; Save changes.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Editor</div>
            </CardContent>
          </Card>

          <Card id="public">
            <CardHeader><CardTitle>Public links</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Use Public Link to open a shareable, read-only URL for clients.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Public link button</div>
            </CardContent>
          </Card>

          <Card id="send">
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Send via SMS/Email</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Select Send SMS/Email to deliver the document to clients directly.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Send dialogs</div>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Public link not loading: ensure the document status is active and link is correct.</li>
                <li>Edits not saving: check required fields; try saving again.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Can I version documents?</div>
                <p>Keep multiple documents or update the existing one; versioning may be added later.</p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2"><Button asChild variant="outline"><a href="/help">Back to Help Home</a></Button></div>
        </div>
      </div>
    </div>
  );
}


