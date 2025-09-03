import { Calendar, Plus, Filter, CreditCard, Users, Building2, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpAppointmentsDetailed() {
  useDocumentTitle("Help | Appointments");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'views', label: 'Calendar views' },
    { id: 'filtering', label: 'Filtering' },
    { id: 'book', label: 'Book an appointment' },
    { id: 'checkout', label: 'Checkout & payment' },
    { id: 'blocks', label: 'Blocked time' },
    { id: 'details', label: 'View & edit details' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[
          { id: 'index', label: 'Help Home', href: '/help' },
          ...nav,
        ]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Appointments (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Step-by-step instructions with image placeholders</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                Use the Appointments page to view staff schedules by location, create and manage bookings, process checkout, and block time.
              </p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" />
                Screenshot placeholder: Appointments header and calendar
              </div>
            </CardContent>
          </Card>

          <Card id="views">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Calendar views</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Day: shows only staff scheduled for the selected date and location.</li>
                <li>Week/Month: shows staff who have schedules at the selected location.</li>
              </ul>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" />
                Screenshot placeholder: Day/Week/Month switch
              </div>
            </CardContent>
          </Card>

          <Card id="filtering">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Filter className="w-5 h-5" /> Filtering</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Header location selector: switch locations.</li>
                <li>Staff filter: focus on one staff member or show all.</li>
                <li>Colors: adjust available/unavailable/blocked; persists per user.</li>
              </ul>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" />
                Screenshot placeholder: Staff filter and color pickers
              </div>
            </CardContent>
          </Card>

          <Card id="book">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Book an appointment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal pl-5 space-y-1">
                <li>Click New Appointment or click an empty slot on the calendar.</li>
                <li>Select Client, Service, Staff, Date & Time; add Notes if needed.</li>
                <li>Save to create the appointment; it appears on the calendar.</li>
              </ol>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" />
                Screenshot placeholder: Appointment form
              </div>
            </CardContent>
          </Card>

          <Card id="checkout">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Checkout & payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Open the appointment details; choose terminal or Pay.js, or cash.</li>
                <li>Enter tip/discounts; complete the payment and send receipt.</li>
                <li>Payments are linked to the appointment record.</li>
              </ul>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" />
                Screenshot placeholder: Checkout dialog
              </div>
            </CardContent>
          </Card>

          <Card id="blocks">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Blocked time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal pl-5 space-y-1">
                <li>Click Add Block (or click a blocked area to quick-edit).</li>
                <li>Select Staff, Date, Start/End; optionally set repeat window.</li>
                <li>Save to prevent bookings in that time range.</li>
              </ol>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" />
                Screenshot placeholder: Add Block dialog
              </div>
            </CardContent>
          </Card>

          <Card id="details">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> View & edit details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Click an appointment to view client, service, notes, and photos.</li>
                <li>Edit appointment info; manage forms and notes from details.</li>
                <li>Use checkout from details when ready to collect payment.</li>
              </ul>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" />
                Screenshot placeholder: Appointment details
              </div>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader>
              <CardTitle>Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Staff missing in Day view: ensure active schedule for date/location.</li>
                <li>Appointment not visible: verify filters and time; check location match.</li>
                <li>Could not book time: an existing Block likely overlaps; edit/delete it.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader>
              <CardTitle>FAQs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Why isn't a staff member showing on Day view?</div>
                <p>They must have an active schedule for the selected location and date. Add or adjust their schedule.</p>
              </div>
              <div>
                <div className="font-medium">Can I change the calendar colors?</div>
                <p>Yes. Use the color pickers above the calendar. Changes persist per user.</p>
              </div>
              <div>
                <div className="font-medium">How do I quickly block time?</div>
                <p>Click an existing blocked band or use Add Block. Quick edit is available by clicking a blocked slot.</p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2">
            <Button asChild variant="outline">
              <a href="/help">Back to Help Home</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


