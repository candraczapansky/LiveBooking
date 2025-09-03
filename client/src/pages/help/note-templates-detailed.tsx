import { StickyNote, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpNoteTemplatesDetailed() {
  useDocumentTitle("Help | Note Templates");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'create', label: 'Create a template' },
    { id: 'edit', label: 'Edit & delete' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <StickyNote className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Note Templates (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Create reusable templates for notes</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Build and manage note templates to standardize documentation for appointments and clients.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Templates grid</div>
            </CardContent>
          </Card>

          <Card id="create">
            <CardHeader><CardTitle>Create a template</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal pl-5 space-y-1">
                <li>Click New Template; enter name, content, category, and status.</li>
                <li>Save to add the template to your library.</li>
              </ol>
            </CardContent>
          </Card>

          <Card id="edit">
            <CardHeader><CardTitle>Edit & delete</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Open a template to edit fields; use Delete to remove when no longer needed.</p>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Template not saving: ensure required fields are present.</li>
                <li>Not visible in list: check filters and search; refresh the page.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Can I categorize templates?</div>
                <p>Yes, choose a category like General, Appointment, Client, etc.</p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2"><Button asChild variant="outline"><a href="/help">Back to Help Home</a></Button></div>
        </div>
      </div>
    </div>
  );
}


