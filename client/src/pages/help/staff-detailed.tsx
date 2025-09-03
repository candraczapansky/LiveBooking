import { Users, Plus, Edit, Key, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpStaffDetailed() {
  useDocumentTitle("Help | Staff");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'add', label: 'Add staff' },
    { id: 'edit', label: 'Edit staff & services' },
    { id: 'permissions', label: 'Permissions' },
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
              <h1 className="text-2xl font-bold">Staff (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Manage staff records and assign services</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Add and manage staff; assign services and set custom commissions.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: Staff list
              </div>
            </CardContent>
          </Card>

          <Card id="add">
            <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Add staff</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal pl-5 space-y-1">
                <li>Click Add Staff; enter user info, title, and rates as applicable.</li>
                <li>Save to create; staff can be assigned services later.</li>
              </ol>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: Add Staff
              </div>
            </CardContent>
          </Card>

          <Card id="edit">
            <CardHeader><CardTitle className="flex items-center gap-2"><Edit className="w-5 h-5" /> Edit staff & services</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Edit staff details and photo; update rates or titles.</li>
                <li>Assign services and set per-service custom commission percentages.</li>
              </ul>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: Assign services
              </div>
            </CardContent>
          </Card>

          <Card id="permissions">
            <CardHeader><CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> Permissions</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Use the Permissions page to grant roles and granular access to staff.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: Permissions manager
              </div>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Staff not appearing in Appointments: ensure schedules exist at the location.</li>
                <li>Cannot delete staff: try deactivating instead to keep historical records.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Can a staff have different commissions per service?</div>
                <p>Yes, set a custom commission percentage per service in assigned services.</p>
              </div>
              <div>
                <div className="font-medium">How do I change a staff photo?</div>
                <p>Edit the staff profile and upload a new photo; Save your changes.</p>
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


