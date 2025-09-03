import { FileText, Users, Mail, MessageSquare, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpFormsDetailed() {
  useDocumentTitle("Help | Forms");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'build', label: 'Build a form' },
    { id: 'send', label: 'Send via SMS/Email' },
    { id: 'submissions', label: 'View submissions' },
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
              <h1 className="text-2xl font-bold">Forms (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Build, send, and track form submissions</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Create intake, feedback, or booking forms and send them to clients.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Forms list</div>
            </CardContent>
          </Card>

          <Card id="build">
            <CardHeader><CardTitle>Build a form</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Use the drag-and-drop builder to add fields; set title, category, and status.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Form builder</div>
            </CardContent>
          </Card>

          <Card id="send">
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Send via SMS/Email</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Open Send dialog to send a public link via SMS or Email; choose recipients.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Send dialog</div>
            </CardContent>
          </Card>

          <Card id="submissions">
            <CardHeader><CardTitle>View submissions</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Open Submissions to review, export, or link responses to client records.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Submissions dialog</div>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Form not saving: ensure required fields are completed and valid.</li>
                <li>Client can’t open link: confirm the public link and client’s email/phone accuracy.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Can I duplicate a form?</div>
                <p>Create a new form and copy content as needed; duplication may be added later.</p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2"><Button asChild variant="outline"><a href="/help">Back to Help Home</a></Button></div>
        </div>
      </div>
    </div>
  );
}


