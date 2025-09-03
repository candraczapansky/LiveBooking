import { HelpCircle, Mail, MessageSquare, BookOpen, ExternalLink, Calendar, Plus, Filter, CreditCard, Users, ShoppingBag, Package, Building2, BarChart2, Bot, Settings as SettingsIcon, Clock, Key, DollarSign, FileText, Gift, MapPin, Phone as PhoneIcon, StickyNote, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import HelpNav from "@/components/help/HelpNav";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useEffect, useRef, useState } from "react";

export default function HelpPage() {
  useDocumentTitle("Help | Glo Head Spa");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; title: string; snippet: string }[]>([]);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const nav = [
    { id: 'appointments', label: 'Appointments: Basics' },
    { id: 'book-appointment', label: 'Book an appointment' },
    { id: 'appointments-checkout', label: 'Appointments: Checkout & Payment' },
    { id: 'appointments-blocks', label: 'Appointments: Add blocked time' },
    { id: 'appointments-details', label: 'Appointments: View & edit details' },
    { id: 'appointments-advanced', label: 'Appointments: Advanced tips' },
    { id: 'appointments-troubleshooting', label: 'Appointments: Troubleshooting' },
    { id: 'clients', label: 'Clients: Basics' },
    { id: 'clients-add', label: 'Clients: Add/Edit' },
    { id: 'clients-import', label: 'Clients: CSV Import' },
    { id: 'clients-search', label: 'Clients: Search & filters' },
    { id: 'pos', label: 'POS: Basics & Checkout' },
    { id: 'pos-payments', label: 'POS: Payment methods' },
    { id: 'products', label: 'Products: Inventory' },
    { id: 'staff', label: 'Staff: Management & Services' },
    { id: 'locations', label: 'Locations: Setup & Terminals' },
    { id: 'reports', label: 'Reports: Overview & Filters' },
    { id: 'marketing', label: 'Marketing: Campaigns & Promos' },
    { id: 'marketing-templates', label: 'Marketing: Templates & limits' },
    { id: 'automations', label: 'Automations: Rules & Tests' },
    { id: 'automations-location', label: 'Automations: Location tagging' },
    { id: 'forms', label: 'Forms: Build, Send, Submissions' },
    { id: 'documents', label: 'Documents: Build & Send' },
    { id: 'documents-public-link', label: 'Documents: Public links' },
    { id: 'payroll', label: 'Payroll: Periods & Checks' },
    { id: 'permissions', label: 'Permissions: Roles & Access' },
    { id: 'time-clock', label: 'Time Clock: Clock In/Out' },
    { id: 'settings', label: 'Settings: Profile & Business' },
    { id: 'settings-2fa', label: 'Settings: Two-factor auth' },
    { id: 'ai-messaging', label: 'AI Messaging: Conversations & Knowledge' },
    { id: 'gift-certificates', label: 'Gift Certificates: Purchase & Balance' },
    { id: 'devices', label: 'Devices: Add/Edit & Status' },
    { id: 'classes', label: 'Classes: Create & Manage' },
    { id: 'memberships', label: 'Memberships: Plans & Subscribers' },
    { id: 'rooms', label: 'Rooms: Manage rooms' },
    { id: 'phone', label: 'Phone: Calls & notes' },
    { id: 'note-templates', label: 'Note Templates: Create & manage' },
    { id: 'schedule', label: 'Schedule: Staff list' },
    { id: 'staff-schedule', label: 'Schedule: Manage all staff' },
    { id: 'staff-schedule-detail', label: 'Schedule: Staff detail' },
  ];

  useEffect(() => {
    if (!contentRef.current) return;
    const root = contentRef.current;
    const q = query.trim().toLowerCase();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const candidates: { id: string; title: string; snippet: string }[] = [];
    const cards = root.querySelectorAll('div[id]');
    cards.forEach((section) => {
      const id = section.getAttribute('id') || '';
      if (!id) return;
      const titleEl = section.querySelector('h2, h3, h4, h5, h6');
      const title = (titleEl?.textContent || id).trim();
      const text = (section.textContent || '').trim();
      const lower = text.toLowerCase();
      const idx = lower.indexOf(q);
      if (idx >= 0) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(text.length, idx + q.length + 40);
        const snippet = text.slice(start, end).replace(/\s+/g, ' ');
        candidates.push({ id, title, snippet });
      }
    });
    setResults(candidates.slice(0, 50));
  }, [query]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[
          {
            label: 'Detailed Guides',
            children: [
              { label: 'Appointments', href: '/help/appointments' },
              { label: 'Clients', href: '/help/clients' },
              { label: 'POS', href: '/help/pos' },
              { label: 'Products', href: '/help/products' },
              { label: 'Staff', href: '/help/staff' },
              { label: 'Locations', href: '/help/locations' },
              { label: 'Reports', href: '/help/reports' },
              { label: 'Marketing', href: '/help/marketing' },
              { label: 'Automations', href: '/help/automations' },
              { label: 'Forms', href: '/help/forms' },
              { label: 'Documents', href: '/help/documents' },
              { label: 'Payroll', href: '/help/payroll' },
              { label: 'Permissions', href: '/help/permissions' },
              { label: 'Time Clock', href: '/help/time-clock' },
              { label: 'Settings', href: '/help/settings' },
              { label: 'AI Messaging', href: '/help/ai-messaging' },
              { label: 'Gift Certificates', href: '/help/gift-certificates' },
              { label: 'Devices', href: '/help/devices' },
              { label: 'Classes', href: '/help/classes' },
              { label: 'Rooms', href: '/help/rooms' },
              { label: 'Phone', href: '/help/phone' },
              { label: 'Note Templates', href: '/help/note-templates' },
              { label: 'Schedule', href: '/help/schedule' },
              { label: 'Staff Schedule', href: '/help/staff-schedule' },
              { label: 'Memberships', href: '/help/memberships' },
            ]
          },
          {
            label: 'On this page',
            children: nav
          }
        ]} />
        <div className="flex-1 space-y-6" ref={contentRef}>
          <div className="flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Help & Support</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Find quick answers and ways to get support.</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Search help</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                type="search"
                placeholder="Search issues, FAQs, troubleshooting..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-900"
                aria-label="Search help"
              />
              {query.trim().length >= 2 && (
                <div className="text-sm">
                  {results.length === 0 ? (
                    <div className="text-muted-foreground">No matches found.</div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-muted-foreground">{results.length} match{results.length === 1 ? '' : 'es'}</div>
                      <ul className="list-disc pl-5 space-y-1">
                        {results.map((r) => (
                          <li key={r.id}>
                            <a className="text-primary hover:underline" href={`#${r.id}`}>{r.title}</a>
                            <div className="text-xs text-muted-foreground line-clamp-2">{r.snippet}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

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

          <Card id="appointments-advanced">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Appointments: Advanced tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Quick-create by clicking an empty time slot; staff/time are prefilled.</li>
                <li>Switch Day/Week/Month to adjust who is shown; Day only shows staff scheduled for the selected date/location.</li>
                <li>Use the staff filter to focus the calendar; set back to All to see everyone eligible.</li>
                <li>Colors: adjust available/unavailable/blocked; changes persist per user and take effect immediately.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="appointments-troubleshooting">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Appointments: Troubleshooting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Staff missing in Day view: ensure they have a schedule for the selected location and date.</li>
                <li>Appointment not visible: verify selected location and staff filter; check start/end times are valid.</li>
                <li>Cannot book a time: a block may exist; click the blocked area to edit/delete it.</li>
                <li>Colors didn’t update: re-select the date or switch views to refresh.</li>
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

          {/* Clients */}
          <Card id="clients">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Clients: Basics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Search clients or view all clients.</li>
                <li>Click a client to view details: appointments, notes, forms, and communication.</li>
                <li>Use filters for status, communication preferences, spending, and last visit.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="clients-add">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Clients: Add/Edit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ol className="list-decimal pl-5 space-y-1 mt-1">
                <li>Click “Add Client” to open the form.</li>
                <li>Fill required fields: email, first/last name; add phone/address if available.</li>
                <li>Set email/SMS preferences as needed.</li>
                <li>Save to create; to edit, open a client and choose Edit.</li>
              </ol>
            </CardContent>
          </Card>

          <Card id="clients-import">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Clients: CSV Import
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ol className="list-decimal pl-5 space-y-1 mt-1">
                <li>Open the Import dialog from Clients.</li>
                <li>Select a CSV with columns like email, firstName, lastName, phone.</li>
                <li>Review the preview; fix any errors reported; then import.</li>
                <li>After import, search and spot-check a few records.</li>
              </ol>
            </CardContent>
          </Card>

          <Card id="clients-search">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Clients: Search & filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Typing 2+ characters triggers search; clear to view all clients.</li>
                <li>Filter by status, communication preferences, spending, and last visit.</li>
                <li>Open a client to view appointment history, notes, forms, and communication.</li>
              </ul>
            </CardContent>
          </Card>

          {/* POS */}
          <Card id="pos">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                POS: Basics & Checkout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Add items to cart from Services or Products tabs.</li>
                <li>Select a client (optional) for receipt and history.</li>
                <li>Open Checkout; choose payment method (card, terminal, Pay.js, cash).</li>
                <li>Add tip/discount as needed; complete payment and send receipt.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="pos-payments">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                POS: Payment methods
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Smart Terminal: collect in-person card payments; device is configured per location.</li>
                <li>Pay.js: use in-browser card collection. If the terminal isn’t available, fall back to Pay.js.</li>
                <li>Cash: enter received amount; the system computes change due.</li>
                <li>Receipts: send via email/SMS; you can enter a manual email or phone.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Products */}
          <Card id="products">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Products: Inventory
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Create products with name, category, price, and stock levels.</li>
                <li>Edit or delete products; upload an image if desired.</li>
                <li>Manage categories (separate from service categories).</li>
              </ul>
            </CardContent>
          </Card>

          {/* Staff */}
          <Card id="staff">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Staff: Management & Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Add/edit staff; manage titles, rates, and profiles.</li>
                <li>Assign services to staff; set custom commission per service.</li>
                <li>Deactivate staff if needed (keeps history intact).</li>
              </ul>
            </CardContent>
          </Card>

          {/* Locations */}
          <Card id="locations">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Locations: Setup & Terminals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Create and edit locations with address, contact, and timezone.</li>
                <li>Set a default location; toggle active status.</li>
                <li>Manage payment terminals per location in Terminal Management.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Reports */}
          <Card id="reports">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5" />
                Reports: Overview & Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Select a report category (Sales, Clients, Appointments, Services, Staff, Payroll, Time Clock).</li>
                <li>Use time period filters (day, week, month, quarter, year, custom) to change date ranges.</li>
                <li>Export or print where available; drill into charts and tables for detail.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Marketing */}
          <Card id="marketing">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Marketing: Campaigns & Promos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Create email or SMS campaigns; design email templates; schedule or send now.</li>
                <li>Manage promo codes (percentage or fixed), limits, and expiration dates.</li>
                <li>Review opt-outs and compliance; respect client preferences.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="marketing-templates">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Marketing: Templates & limits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Email campaigns require a subject.</li>
                <li>SMS content should be concise; plan for the 160-character SMS limit.</li>
                <li>Use the email template editor for rich designs; preview before sending.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Automations */}
          <Card id="automations">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Automations: Rules & Tests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Add email or SMS rules for triggers like reminders, follow-ups, birthdays, no-shows, and payments.</li>
                <li>Choose timing (e.g., 24 hours before); customize templates; optionally scope by location.</li>
                <li>Use the Test dialog to send a test and verify content and delivery.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="automations-location">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Automations: Location tagging
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Scope rules to a location by including a location token in templates or titles.</li>
                <li>Supported token formats: [location:ID] or @location:Name (mapped to an ID).</li>
                <li>Use the Test dialog to validate rendering and delivery before activating.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Forms */}
          <Card id="forms">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Forms: Build, Send, Submissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Build forms with the drag-and-drop builder.</li>
                <li>Send via SMS or Email; get public links; view submissions.</li>
                <li>Manage form lifecycle: draft, active, inactive.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card id="documents">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents: Build & Send
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Create documents with the template editor; preview and edit.</li>
                <li>Generate public links; send by SMS or Email to clients.</li>
                <li>Manage status (active, draft, inactive) and update as needed.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="documents-public-link">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents: Public links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Use the “Public Link” action to open a shareable link for a document.</li>
                <li>Links render a read-only view suitable for client access.</li>
                <li>You can also send documents via SMS/Email from the actions panel.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Payroll */}
          <Card id="payroll">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payroll: Periods & Checks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Select period (current, previous, custom) and filter by staff.</li>
                <li>Review earnings (hourly, fixed, commission) and history.</li>
                <li>Manage checks and export or archive records as needed.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card id="permissions">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Permissions: Roles & Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Use the permission manager to assign roles and granular access.</li>
                <li>Restrict sensitive areas to admins; grant least privilege needed.</li>
                <li>Changes apply immediately; review access regularly.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Time Clock */}
          <Card id="time-clock">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Time Clock: Clock In/Out
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Clock in with required location and optional notes.</li>
                <li>Clock out with break minutes; entries list shows recent activity.</li>
                <li>Locations list determines available clock-in locations.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card id="settings">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                Settings: Profile & Business
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Update profile info; change password with current/new/confirm.</li>
                <li>Set notification preferences (email/SMS) and save.</li>
                <li>Configure business settings: name, contact, timezone, branding.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="settings-2fa">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                Settings: Two-factor auth
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ol className="list-decimal pl-5 space-y-1 mt-1">
                <li>Open Settings and choose the 2FA setup option to begin.</li>
                <li>Follow the on-screen steps to enroll; keep backup codes safe.</li>
                <li>To disable, use the 2FA disable option and confirm.</li>
              </ol>
            </CardContent>
          </Card>

          {/* Gift Certificates */}
          <Card id="gift-certificates">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Gift Certificates: Purchase & Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ol className="list-decimal pl-5 space-y-1 mt-1">
                <li>Select a preset amount or enter a custom amount.</li>
                <li>Enter recipient and purchaser info; add an optional message.</li>
                <li>Proceed to payment; complete via Helcim Pay.js or terminal as configured.</li>
                <li>After purchase, view and send the receipt; balance is tracked.</li>
                <li>To check balance later, use the balance check input with the code.</li>
              </ol>
            </CardContent>
          </Card>

          {/* Devices */}
          <Card id="devices">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Devices: Add/Edit & Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Add devices with type, brand/model, and notes; edit or delete later.</li>
                <li>Status options: available, in_use, maintenance, broken (color-coded badges).</li>
                <li>Use the form to update device details and keep an inventory record.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Classes */}
          <Card id="classes">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Classes: Create & Manage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ol className="list-decimal pl-5 space-y-1 mt-1">
                <li>Click New Class; enter name, start/end, capacity, and price.</li>
                <li>Classes can be location-scoped; select location before creating.</li>
                <li>Manage scheduled classes; each card shows date/time, capacity, and price.</li>
              </ol>
            </CardContent>
          </Card>

          {/* Memberships */}
          <Card id="memberships">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Memberships: Plans & Subscribers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Create membership plans with name, description, price, and duration.</li>
                <li>Open Subscribers to view members; add or remove client subscriptions.</li>
                <li>Edit or delete plans; changes update the catalog for new signups.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Rooms */}
          <Card id="rooms">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Rooms: Manage rooms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Add rooms with name, description, location, capacity, and active status.</li>
                <li>Edit or delete rooms; room list shows location and capacity.</li>
                <li>Use Active/Inactive to toggle availability without deleting.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Phone */}
          <Card id="phone">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhoneIcon className="w-5 h-5" />
                Phone: Calls & notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>View recent calls with status and durations; search by number or client.</li>
                <li>Initiate outbound calls; choose staff and optional client; set purpose.</li>
                <li>Add call notes and connect calls to clients for history tracking.</li>
                <li>Review call analytics (inbound/outbound, completion, duration).</li>
              </ul>
            </CardContent>
          </Card>

          {/* Note Templates */}
          <Card id="note-templates">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="w-5 h-5" />
                Note Templates: Create & manage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Create reusable templates with name, content, category, and active status.</li>
                <li>Search and filter by category; edit or delete templates as needed.</li>
                <li>Use templates when adding notes to clients or appointments.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Schedule: Staff list */}
          <Card id="schedule">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Schedule: Staff list
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Browse staff and see count of schedules per person and their locations.</li>
                <li>Search by name/title; click a staff member to open their schedule detail.</li>
                <li>Use Manage All to jump to the full staff scheduling page.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Staff Schedule: Manage all */}
          <Card id="staff-schedule">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Schedule: Manage all staff
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Filter staff by role and location; search by name or email.</li>
                <li>See totals: staff, with schedules, total schedules, locations.</li>
                <li>Click a row to edit a specific staff member’s schedules.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Staff Schedule: Detail */}
          <Card id="staff-schedule-detail">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Schedule: Staff detail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Review schedules grouped by location and by day of week.</li>
                <li>Add, edit, or delete schedules; changes update the appointments calendar.</li>
                <li>Use the Add Schedule button to create new availability blocks.</li>
              </ul>
            </CardContent>
          </Card>

          {/* AI Messaging */}
          <Card id="ai-messaging">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                AI Messaging: Conversations & Knowledge
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>View conversations; search by client/message; start AI responses.</li>
                <li>Manage Knowledge (FAQ) and Categories to improve answers.</li>
                <li>Configure auto-responder for SMS/email, with per-location options.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


