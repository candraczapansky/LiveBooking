import { Calendar, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpScheduleDetailed() {
  useDocumentTitle("Help | Schedule");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'browse', label: 'Browse staff' },
    { id: 'manage', label: 'Manage all schedules' },
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
              <h1 className="text-2xl font-bold">Schedule (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Find staff and view their schedules</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Use Staff Working Hours to search staff and view schedule counts and locations.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Staff list</div>
            </CardContent>
          </Card>

          <Card id="browse">
            <CardHeader><CardTitle>Browse staff</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Search by name/title and click a staff card to see their schedule detail.</p>
            </CardContent>
          </Card>

          <Card id="manage">
            <CardHeader><CardTitle>Manage all schedules</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Use Manage All to open the full schedule manager with filters for role and location.</p>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>No staff found: clear search; verify staff exist and are active.</li>
                <li>Counts look wrong: refresh to ensure latest schedules.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">How do I add schedules?</div>
                <p>Open Manage All or a staff’s detail page and use Add Schedule.</p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2"><Button asChild variant="outline"><a href="/help">Back to Help Home</a></Button></div>
        </div>
      </div>
    </div>
  );
}


