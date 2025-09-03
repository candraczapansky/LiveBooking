import { Key, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpPermissionsDetailed() {
  useDocumentTitle("Help | Permissions");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'roles', label: 'Roles & granular access' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <Key className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Permissions (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Assign roles and control access</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Use the Permission Manager to grant or revoke access to features for different roles.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Permission Manager</div>
            </CardContent>
          </Card>

          <Card id="roles">
            <CardHeader><CardTitle>Roles & granular access</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Apply least-privilege principles. Grant admins access only where necessary.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Role configuration</div>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>User can’t access a page: verify their role includes the required permission.</li>
                <li>Too much access: remove unneeded permissions per least-privilege.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Do permission changes apply immediately?</div>
                <p>Yes. Users may need to refresh to see updated navigation.</p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2"><Button asChild variant="outline"><a href="/help">Back to Help Home</a></Button></div>
        </div>
      </div>
    </div>
  );
}


