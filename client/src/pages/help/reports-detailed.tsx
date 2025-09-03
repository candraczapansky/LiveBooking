import { BarChart2, Calendar, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpReportsDetailed() {
  useDocumentTitle("Help | Reports");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'categories', label: 'Report categories' },
    { id: 'filters', label: 'Date ranges & filters' },
    { id: 'export', label: 'Export & printing' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Reports (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Analyze sales, clients, appointments, staff, payroll, and more</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Open Reports to choose a category and drill into charts and tables.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Reports landing</div>
            </CardContent>
          </Card>

          <Card id="categories">
            <CardHeader><CardTitle>Report categories</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Sales, Clients, Appointments, Services, Staff, Payroll, Time Clock</li>
              </ul>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Category cards</div>
            </CardContent>
          </Card>

          <Card id="filters">
            <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Date ranges & filters</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Choose time period (day, week, month, quarter, year, custom).</li>
                <li>Use custom date range for precise windows; charts update live.</li>
              </ul>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Date filter</div>
            </CardContent>
          </Card>

          <Card id="export">
            <CardHeader><CardTitle>Export & printing</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Export datasets where available or print the page for reporting.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Export menu</div>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>No data: adjust date range or confirm data exists for the period.</li>
                <li>Totals look off: verify timezone and filters; try a different period.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Can I export charts?</div>
                <p>Export options vary by report. Use table exports or print to PDF.</p>
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


