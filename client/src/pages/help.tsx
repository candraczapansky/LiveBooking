import { HelpCircle, Mail, MessageSquare, BookOpen, ExternalLink, Calendar, Plus, Filter, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpPage() {
  useDocumentTitle("Help | Glo Head Spa");
  const nav = [
    { id: 'appointments', label: 'Appointments: Basics' },
    { id: 'book-appointment', label: 'Book an appointment' },
    { id: 'appointments-checkout', label: 'Appointments: Checkout & Payment' },
    { id: 'appointments-blocks', label: 'Appointments: Add blocked time' },
    { id: 'appointments-details', label: 'Appointments: View & edit details' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <aside className="hidden md:block w-64 shrink-0">
          <Card>
            <CardHeader>
              <CardTitle>Help Navigation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <nav className="flex flex-col gap-1">
                {nav.map((item) => (
                  <a key={item.id} href={`#${item.id}`} className="text-sm text-primary hover:underline">
                    {item.label}
                  </a>
                ))}
              </nav>
            </CardContent>
          </Card>
        </aside>
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Help & Support</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Find quick answers and ways to get support.</p>
            </div>
          </div>

          <Card id="appointments">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Appointments: Basics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
              <div>
                <div className="font-medium">Views</div>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Daily view shows staff scheduled for the selected location and date.</li>
                  <li>Week and Month views show staff who have schedules at the selected location.</li>
                  <li>Use the location selector in the header to switch locations.</li>
                </ul>
              </div>

              <div>
                <div className="font-medium">Filtering</div>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Use the staff filter to view all staff or a specific person.</li>
                  <li>Only staff scheduled at the selected location appear by default.</li>
                </ul>
              </div>

              <div>
                <div className="font-medium">Add Appointment</div>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Open the New Appointment form from the calendar actions.</li>
                  <li>Select client, service, staff, date, and time, then save.</li>
                  <li>After an appointment, open Checkout to process payment if needed.</li>
                </ul>
              </div>

              <div>
                <div className="font-medium">Blocks & Schedules</div>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Add a Block to reserve time where no bookings are allowed.</li>
                  <li>Use Quick Block for a fast block on a specific day/time.</li>
                  <li>Staff schedules control who appears on the calendar for each location.</li>
                </ul>
              </div>

              <div>
                <div className="font-medium">Colors</div>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>Available, Unavailable, and Blocked colors can be customized per user.</li>
                  <li>Color preferences load automatically when you sign in.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card id="book-appointment">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Book an appointment (step by step)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ol className="list-decimal pl-5 space-y-1 mt-1">
                <li>Open the Appointments page from the left sidebar.</li>
                <li>Use the location selector in the header to choose the correct location.</li>
                <li>Select the date in the mini calendar. Optionally choose Day, Week, or Month view.</li>
                <li>Start a new booking in one of two ways:
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>Click <span className="inline-flex items-center"><Plus className="w-4 h-4 mr-1" /> New Appointment</span> at the top right, or</li>
                    <li>Click directly on an empty time slot in the calendar (prefills staff/time).</li>
                  </ul>
                </li>
                <li>In the form, fill out the required fields:
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>Client: pick an existing client or add a new one.</li>
                    <li>Service: choose the service to book.</li>
                    <li>Staff: choose who will perform the service.</li>
                    <li>Date & Time: confirm or adjust as needed.</li>
                    <li>Notes (optional): add any internal notes.</li>
                  </ul>
                </li>
                <li>Click Save. The appointment appears on the calendar immediately.</li>
                <li>Optional: open the appointment to review details or proceed to checkout at the time of service.</li>
              </ol>
            </CardContent>
          </Card>

          <Card id="appointments-checkout">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Appointments: Checkout & Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ol className="list-decimal pl-5 space-y-1 mt-1">
                <li>Open the appointment from the calendar.</li>
                <li>Choose a payment method. Smart Terminal or Pay.js may be available depending on setup.</li>
                <li>Enter tip or discounts if applicable.</li>
                <li>Complete the payment and wait for confirmation.</li>
                <li>Payments are logged with the appointment record.</li>
              </ol>
            </CardContent>
          </Card>

          <Card id="appointments-blocks">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Appointments: Add blocked time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ol className="list-decimal pl-5 space-y-1 mt-1">
                <li>Click Add Block at the top of the Appointments page.</li>
                <li>Select staff, date, and time window to block.</li>
                <li>Save the block. It will appear as a non-bookable area on the calendar.</li>
                <li>Click a block to edit or delete it, or use quick edit when clicking within the blocked area.</li>
              </ol>
            </CardContent>
          </Card>

          <Card id="appointments-details">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Appointments: View & edit details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Click an appointment to open details (client, service, staff, notes).</li>
                <li>Edit appointment info or manage notes, forms, and photos where available.</li>
                <li>Use checkout from details when ready to collect payment.</li>
                <li>Admins can cancel or delete if needed.</li>
              </ul>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Getting Started
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Managing locations, staff, and services</li>
                  <li>Scheduling appointments and classes</li>
                  <li>Point of Sale and gift certificates</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Contact Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Need help? Reach out and we'll get back to you.
                </div>
                <div className="flex gap-2">
                  <Button asChild>
                    <a href="mailto:support@example.com" aria-label="Email support">
                      <Mail className="w-4 h-4 mr-2" /> Email Support
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="https://example.com/help" target="_blank" rel="noreferrer" aria-label="Open help docs">
                      <ExternalLink className="w-4 h-4 mr-2" /> Help Docs
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


