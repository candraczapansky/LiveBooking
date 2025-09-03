import { Users, Plus, Search, Filter, FileDown, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpClientsDetailed() {
  useDocumentTitle("Help | Clients");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'add', label: 'Add client' },
    { id: 'search', label: 'Search & filters' },
    { id: 'import', label: 'CSV import' },
    { id: 'detail', label: 'Client detail & actions' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Clients (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Manage client records, imports, and communication</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Use the Clients page to search, add, and manage client profiles and preferences.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: Clients list and actions
              </div>
            </CardContent>
          </Card>

          <Card id="add">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Add client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal pl-5 space-y-1">
                <li>Click Add Client.</li>
                <li>Enter Email, First name, Last name; optionally add phone and address.</li>
                <li>Set email/SMS preferences; Save to create the record.</li>
              </ol>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: Add Client dialog
              </div>
            </CardContent>
          </Card>

          <Card id="search">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5" /> Search & filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Type 2+ characters to search by name, email, or phone.</li>
                <li>Use filters for status, communication preferences, spending, and last visit.</li>
                <li>Toggle Show All to list all clients when not searching.</li>
              </ul>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: Search and filters
              </div>
            </CardContent>
          </Card>

          <Card id="import">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileDown className="w-5 h-5" /> CSV import</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal pl-5 space-y-1">
                <li>Open Import; choose a CSV with columns like email, firstName, lastName, phone.</li>
                <li>Review the preview, resolve any errors, and start the import.</li>
                <li>After completion, spot-check imported clients using Search.</li>
              </ol>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: Import dialog
              </div>
            </CardContent>
          </Card>

          <Card id="detail">
            <CardHeader>
              <CardTitle>Client detail & actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Open a client to view appointments, notes, forms, and communication history.</li>
                <li>Edit profile or communication preferences; send SMS/Email from the client record.</li>
              </ul>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: Client detail
              </div>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader>
              <CardTitle>Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Missing client after import: verify CSV headers and email format; re-import corrected rows.</li>
                <li>Search returns nothing: type at least 2 characters; clear filters.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader>
              <CardTitle>FAQs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Can I bulk update client preferences?</div>
                <p>Use CSV import with updated preference columns to overwrite preferences in bulk.</p>
              </div>
              <div>
                <div className="font-medium">How do I contact a client?</div>
                <p>Open the client record and use the SMS or Email actions from the profile.</p>
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


