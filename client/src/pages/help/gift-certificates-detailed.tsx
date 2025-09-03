import { Gift, CreditCard, Receipt, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpGiftCertificatesDetailed() {
  useDocumentTitle("Help | Gift Certificates");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'purchase', label: 'Purchase flow' },
    { id: 'payment', label: 'Payment & receipt' },
    { id: 'balance', label: 'Balance check' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <Gift className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Gift Certificates (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Sell and manage gift certificates</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Offer preset or custom amounts, accept payment, and email receipts. Balances are tracked.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Gift Certificates page</div>
            </CardContent>
          </Card>

          <Card id="purchase">
            <CardHeader><CardTitle>Purchase flow</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ol className="list-decimal pl-5 space-y-1">
                <li>Select a preset amount or enter a custom amount.</li>
                <li>Fill in recipient and purchaser details, and optional message.</li>
                <li>Click Continue to proceed to payment.</li>
              </ol>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Purchase form</div>
            </CardContent>
          </Card>

          <Card id="payment">
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Payment & receipt</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Complete via Helcim Pay.js or terminal (if configured). Email or display a receipt when done.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Payment modal</div>
            </CardContent>
          </Card>

          <Card id="balance">
            <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5" /> Balance check</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Enter the gift code to view remaining balance and recent usage.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Balance check</div>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Payment failed: confirm payment method; fallback to terminal or Pay.js as needed.</li>
                <li>Balance not updating: refresh page; verify the last transaction completed successfully.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Can I resend the receipt?</div>
                <p>Yes, open the purchase details and send the receipt again via email.</p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2"><Button asChild variant="outline"><a href="/help">Back to Help Home</a></Button></div>
        </div>
      </div>
    </div>
  );
}


