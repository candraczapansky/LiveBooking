import { Building2, CreditCard, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpLocationsDetailed() {
  useDocumentTitle("Help | Locations");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'create', label: 'Create & edit locations' },
    { id: 'terminals', label: 'Payment terminals' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Locations (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Manage locations and smart terminal settings</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Create locations with address/contact info and set a default location.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: Locations list
              </div>
            </CardContent>
          </Card>

          <Card id="create">
            <CardHeader><CardTitle>Create & edit locations</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal pl-5 space-y-1">
                <li>Click Add Location; fill out name, address, timezone, and contact.</li>
                <li>Set Active and Default as needed; Save to create.</li>
                <li>Edit existing locations to update details or toggle Active/Default.</li>
              </ol>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: Add/Edit Location
              </div>
            </CardContent>
          </Card>

          <Card id="terminals">
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Payment terminals</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Manage Helcim Smart Terminals per location in Terminal Management.</li>
                <li>Ensure device code and API token are saved so they persist across restarts.</li>
                <li>Pay.js remains available as a fallback when terminal is unavailable.</li>
              </ul>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: Terminal settings
              </div>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Terminal not connecting: verify device code and API token for the location.</li>
                <li>Location not selectable: ensure it is Active; set a Default location if needed.</li>
              </ul>
            </CardContent>
          </Card>

                      <Card id="faqs">
              <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Do terminals persist after restart?</div>
                <p>Yes, device code and token are stored per location to persist between restarts.</p>
              </div>
              <div>
                <div className="font-medium">Is Pay.js available as backup?</div>
                <p>Yes, Pay.js is always available as a fallback if a terminal is unavailable.</p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2">
            <Button asChild variant="outline"><a href="/help">Back to Help Home</a></Button>
          </div>
        </div>
      </div>
    </div>
  );
}


