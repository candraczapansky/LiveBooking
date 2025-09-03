import { CalendarDays, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpStaffScheduleDetailed() {
  useDocumentTitle("Help | Staff Schedule Detail");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'add', label: 'Add availability' },
    { id: 'edit', label: 'Edit/delete availability' },
    { id: 'grouping', label: 'Grouped views' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Staff Schedule Detail (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Add, edit, and delete staff availability</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Work with a single staff member’s schedules grouped by location and day.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Staff schedule detail</div>
            </CardContent>
          </Card>

          <Card id="add">
            <CardHeader><CardTitle>Add availability</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Click Add Schedule; set day, start/end times, and location; Save.</p>
            </CardContent>
          </Card>

          <Card id="edit">
            <CardHeader><CardTitle>Edit/delete availability</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Open a schedule row to modify or delete; changes take effect on the calendar.</p>
            </CardContent>
          </Card>

          <Card id="grouping">
            <CardHeader><CardTitle>Grouped views</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Schedules are grouped by location and day to simplify reviewing coverage.</p>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Times not saving: verify valid time format and end after start.</li>
                <li>Wrong location: ensure the correct location is selected for the schedule.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Can I repeat availability weekly?</div>
                <p>Create multiple entries per day or use repeat options where available.</p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2"><Button asChild variant="outline"><a href="/help">Back to Help Home</a></Button></div>
        </div>
      </div>
    </div>
  );
}


