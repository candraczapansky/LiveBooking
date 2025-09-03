import { Wrench, Edit, Trash2, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpDevicesDetailed() {
  useDocumentTitle("Help | Devices");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'add', label: 'Add device' },
    { id: 'edit', label: 'Edit device' },
    { id: 'delete', label: 'Delete device' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <Wrench className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Devices (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Track devices and statuses</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Manage device inventory: status, brand/model, and notes.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Devices list</div>
            </CardContent>
          </Card>

          <Card id="add">
            <CardHeader><CardTitle>Add device</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Click Add Device and fill in required fields. Save to add it to the inventory.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Add Device form</div>
            </CardContent>
          </Card>

          <Card id="edit">
            <CardHeader><CardTitle className="flex items-center gap-2"><Edit className="w-5 h-5" /> Edit device</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Open a device and update status, description, or details. Save to apply changes.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Edit Device</div>
            </CardContent>
          </Card>

          <Card id="delete">
            <CardHeader><CardTitle className="flex items-center gap-2"><Trash2 className="w-5 h-5" /> Delete device</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Use Delete to remove a device; confirm the prompt to proceed.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Delete confirmation</div>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Missing device: refresh and verify it wasn’t deleted.</li>
                <li>Status unclear: use color-coded badges to quickly identify state.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">What statuses are supported?</div>
                <p>Available, In Use, Maintenance, Broken.</p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2"><Button asChild variant="outline"><a href="/help">Back to Help Home</a></Button></div>
        </div>
      </div>
    </div>
  );
}


