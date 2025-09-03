import { Mail, MessageSquare, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpMarketingDetailed() {
  useDocumentTitle("Help | Marketing");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'campaigns', label: 'Email & SMS campaigns' },
    { id: 'templates', label: 'Templates' },
    { id: 'promos', label: 'Promo codes' },
    { id: 'optouts', label: 'Opt-outs' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <Mail className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Marketing (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Create campaigns and promotions</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Build email/SMS campaigns, design templates, manage promotions, and track opt-outs.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Marketing tabs</div>
            </CardContent>
          </Card>

          <Card id="campaigns">
            <CardHeader><CardTitle>Email & SMS campaigns</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Choose Email or SMS; define audience and content (subject required for Email).</li>
                <li>Schedule send or send immediately; track status and results.</li>
              </ul>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Campaign form</div>
            </CardContent>
          </Card>

          <Card id="templates">
            <CardHeader><CardTitle>Templates</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Use the email template editor for rich designs; preview before sending.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Template editor</div>
            </CardContent>
          </Card>

          <Card id="promos">
            <CardHeader><CardTitle>Promo codes</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Create percentage or fixed discounts; set expiration and usage limits; activate/deactivate.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Promo form</div>
            </CardContent>
          </Card>

          <Card id="optouts">
            <CardHeader><CardTitle>Opt-outs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Review unsubscribed clients to ensure compliance and respect preferences.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Opt-outs list</div>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Emails not sending: verify SendGrid/API configuration; check logs.</li>
                <li>SMS too long: reduce content to fit 160 chars to avoid splits/cost.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">How do I segment the audience?</div>
                <p>Use the audience selector and filters to target specific client groups.</p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2"><Button asChild variant="outline"><a href="/help">Back to Help Home</a></Button></div>
        </div>
      </div>
    </div>
  );
}


