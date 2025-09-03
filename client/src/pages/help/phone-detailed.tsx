import { Phone as PhoneIcon, PhoneCall, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpPhoneDetailed() {
  useDocumentTitle("Help | Phone");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'outbound', label: 'Make outbound call' },
    { id: 'notes', label: 'Add call notes' },
    { id: 'connect', label: 'Connect call to client' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <PhoneIcon className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Phone (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Review and manage calls</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>View recent calls, place outbound calls, record notes, connect to clients, and review analytics.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Phone page</div>
            </CardContent>
          </Card>

          <Card id="outbound">
            <CardHeader><CardTitle className="flex items-center gap-2"><PhoneCall className="w-5 h-5" /> Make outbound call</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal pl-5 space-y-1">
                <li>Enter the phone number and select a staff member.</li>
                <li>Optionally select a client to associate call history.</li>
                <li>Click Call to initiate; status updates will appear in recent calls.</li>
              </ol>
            </CardContent>
          </Card>

          <Card id="notes">
            <CardHeader><CardTitle>Add call notes</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Open a call and add notes to document outcomes or follow-ups.</p>
            </CardContent>
          </Card>

          <Card id="connect">
            <CardHeader><CardTitle>Connect call to client</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Link a call to a client for unified history and future reference.</p>
            </CardContent>
          </Card>

          <Card id="analytics">
            <CardHeader><CardTitle>Analytics</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Review total, inbound/outbound counts, completion, and durations to gauge performance.</p>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Outbound call failed: verify number format and connectivity.</li>
                <li>Notes not saving: ensure required fields and try again.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Can I play recordings?</div>
                <p>Yes, use the playback controls when a recording is available.</p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2"><Button asChild variant="outline"><a href="/help">Back to Help Home</a></Button></div>
        </div>
      </div>
    </div>
  );
}


