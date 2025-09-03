import { Settings as SettingsIcon, Lock, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpSettingsDetailed() {
  useDocumentTitle("Help | Settings");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'profile', label: 'Profile & notifications' },
    { id: 'password', label: 'Change password' },
    { id: 'business', label: 'Business settings' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Settings (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Update your profile, notifications, and business info</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Customize personal settings and business configuration.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Settings tabs</div>
            </CardContent>
          </Card>

          <Card id="profile">
            <CardHeader><CardTitle>Profile & notifications</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Update profile details and choose email/SMS notification preferences; Save to apply.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Notifications</div>
            </CardContent>
          </Card>

          <Card id="password">
            <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> Change password</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Enter current, new, and confirm new passwords; Save to update.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Password change</div>
            </CardContent>
          </Card>

          <Card id="business">
            <CardHeader><CardTitle>Business settings</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Set business name, contact, timezone, currency, and branding; Save changes.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Business settings</div>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Preferences not saving: confirm you’re logged in and try again.</li>
                <li>Color/theme not applying: refresh the page to reapply styles.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Can I enable 2FA?</div>
                <p>Yes, use the Two-Factor setup in Settings to enroll or disable.</p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2"><Button asChild variant="outline"><a href="/help">Back to Help Home</a></Button></div>
        </div>
      </div>
    </div>
  );
}


