import { CreditCard, Users, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpMembershipsDetailed() {
  useDocumentTitle("Help | Memberships");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'plans', label: 'Create & manage plans' },
    { id: 'subscribers', label: 'Manage subscribers' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Memberships (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Create plans and manage member subscriptions</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Offer recurring plans and manage client subscriptions and billing.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Memberships page</div>
            </CardContent>
          </Card>

          <Card id="plans">
            <CardHeader><CardTitle>Create & manage plans</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Click Add Membership Plan; enter name, price, duration, and benefits; Save.</p>
            </CardContent>
          </Card>

          <Card id="subscribers">
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Manage subscribers</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>View current subscribers; add clients to a plan or end subscriptions.</p>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Plan not saving: make sure required fields (name, price, duration) are valid.</li>
                <li>Subscriber not listed: refresh and ensure the client is correctly added.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Can members switch plans mid-cycle?</div>
                <p>Yes, cancel current and add to a new plan; proration depends on your policy.</p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2"><Button asChild variant="outline"><a href="/help">Back to Help Home</a></Button></div>
        </div>
      </div>
    </div>
  );
}


