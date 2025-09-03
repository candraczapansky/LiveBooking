import { Clock, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpTimeClockDetailed() {
  useDocumentTitle("Help | Time Clock");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'clockin', label: 'Clock in' },
    { id: 'clockout', label: 'Clock out & breaks' },
    { id: 'entries', label: 'Recent entries' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Time Clock (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Clock in/out and track hours</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Clock in and out of shifts; add break minutes; review entries.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Time Clock page</div>
            </CardContent>
          </Card>

          <Card id="clockin">
            <CardHeader><CardTitle>Clock in</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Select a location and optionally write a note; click Clock In.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Clock In</div>
            </CardContent>
          </Card>

          <Card id="clockout">
            <CardHeader><CardTitle>Clock out & breaks</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Enter break minutes and click Clock Out to finish the shift.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Clock Out</div>
            </CardContent>
          </Card>

          <Card id="entries">
            <CardHeader><CardTitle>Recent entries</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Review latest time entries with in/out times, hours, status, and location.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Entries table</div>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Clock In disabled: select a location first; ensure locations exist and are active.</li>
                <li>Entries missing: refresh the page and confirm the timeframe.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Can I edit past entries?</div>
                <p>Admins can adjust entries via the backend or future UI tools if enabled.</p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2"><Button asChild variant="outline"><a href="/help">Back to Help Home</a></Button></div>
        </div>
      </div>
    </div>
  );
}


