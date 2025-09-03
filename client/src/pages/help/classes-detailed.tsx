import { Calendar, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpClassesDetailed() {
  useDocumentTitle("Help | Classes");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'create', label: 'Create class' },
    { id: 'manage', label: 'Manage classes' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Classes (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Create and manage group classes</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Set up classes with schedule, capacity, price, and location.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Classes list</div>
            </CardContent>
          </Card>

          <Card id="create">
            <CardHeader><CardTitle>Create class</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal pl-5 space-y-1">
                <li>Click New Class; enter name, start and end times.</li>
                <li>Set capacity and price; choose a location if needed.</li>
                <li>Save to publish the class.</li>
              </ol>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: New Class dialog</div>
            </CardContent>
          </Card>

          <Card id="manage">
            <CardHeader><CardTitle>Manage classes</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Edit schedule, capacity, price, and status from the class card.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Class card</div>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Times incorrect: ensure local timezone is set correctly in business settings.</li>
                <li>Class not visible: confirm location and status; refresh the page.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Can I duplicate a class?</div>
                <p>Create a new class and reuse details; duplication may be added later.</p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2"><Button asChild variant="outline"><a href="/help">Back to Help Home</a></Button></div>
        </div>
      </div>
    </div>
  );
}


