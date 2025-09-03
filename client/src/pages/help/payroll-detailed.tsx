import { DollarSign, Calendar, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpPayrollDetailed() {
  useDocumentTitle("Help | Payroll");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'period', label: 'Select period' },
    { id: 'filter', label: 'Filter by staff' },
    { id: 'history', label: 'History & checks' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Payroll (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Review earnings and checks by period</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Analyze staff earnings (hourly, fixed, commission) and manage payroll checks.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Payroll page</div>
            </CardContent>
          </Card>

          <Card id="period">
            <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Select period</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Choose Current, Previous, or Custom dates to compute totals for a period.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Period selector</div>
            </CardContent>
          </Card>

          <Card id="filter">
            <CardHeader><CardTitle>Filter by staff</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Select a staff member to narrow results to a single person.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Staff filter</div>
            </CardContent>
          </Card>

          <Card id="history">
            <CardHeader><CardTitle>History & checks</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Review payroll history and check records; export or archive as needed.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: History & checks</div>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Totals seem wrong: confirm period boundaries and staff filter selection.</li>
                <li>Check list empty: ensure integration is configured and records exist.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Can I export payroll?</div>
                <p>Use report exports or copy totals for your payroll system.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2"><Button asChild variant="outline"><a href="/help">Back to Help Home</a></Button></div>
        </div>
      </div>
    </div>
  );
}


