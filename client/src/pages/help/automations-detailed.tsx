import { Bot, Settings, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpAutomationsDetailed() {
  useDocumentTitle("Help | Automations");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'rules', label: 'Create rules' },
    { id: 'triggers', label: 'Triggers & timing' },
    { id: 'location', label: 'Location tagging' },
    { id: 'test', label: 'Testing automations' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <Bot className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Automations (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Set up email/SMS rules for reminders and follow-ups</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Automate communications for appointment reminders, follow-ups, no-shows, birthdays, and more.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Automations list</div>
            </CardContent>
          </Card>

          <Card id="rules">
            <CardHeader><CardTitle>Create rules</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Create Email or SMS rules with a name, template, and active status.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Rule form</div>
            </CardContent>
          </Card>

          <Card id="triggers">
            <CardHeader><CardTitle>Triggers & timing</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Select a trigger (appointment reminder, follow-up, birthday, etc.) and specify timing (e.g., 24 hours before).</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Trigger options</div>
            </CardContent>
          </Card>

          <Card id="location">
            <CardHeader><CardTitle>Location tagging</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Scope rules to a location with tokens like [location:ID] or @location:Name.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Location tag example</div>
            </CardContent>
          </Card>

          <Card id="test">
            <CardHeader><CardTitle>Testing automations</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Use the Test dialog to send a test message and verify delivery before activating rules.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Test dialog</div>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Rule didn’t fire: confirm trigger conditions and timing window.</li>
                <li>Wrong location: ensure correct location tag is present and valid.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Can I pause a rule?</div>
                <p>Yes, toggle Active off to pause without deleting the configuration.</p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2"><Button asChild variant="outline"><a href="/help">Back to Help Home</a></Button></div>
        </div>
      </div>
    </div>
  );
}


