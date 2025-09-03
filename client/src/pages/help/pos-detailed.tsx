import { ShoppingBag, CreditCard, DollarSign, Users, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpPOSDetailed() {
  useDocumentTitle("Help | POS");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'cart', label: 'Build a cart' },
    { id: 'client', label: 'Select client' },
    { id: 'checkout', label: 'Checkout & payment methods' },
    { id: 'receipt', label: 'Send receipt' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">POS (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Ring up services/products and collect payment</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Use POS to add services and products to a cart, optionally select a client, and complete checkout.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: POS layout
              </div>
            </CardContent>
          </Card>

          <Card id="cart">
            <CardHeader><CardTitle>Build a cart</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Add items from Services or Products tabs.</li>
                <li>Adjust quantities; remove items if needed.</li>
              </ul>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: Cart and tabs
              </div>
            </CardContent>
          </Card>

          <Card id="client">
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Select client</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Select a client for receipts and history (optional).</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: Client selector
              </div>
            </CardContent>
          </Card>

          <Card id="checkout">
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Checkout & payment methods</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Smart Terminal for in-person card; Pay.js in-browser; Cash supported.</li>
                <li>Add tip/discount if needed; confirm totals before charging.</li>
              </ul>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: Checkout dialog
              </div>
            </CardContent>
          </Card>

          <Card id="receipt">
            <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5" /> Send receipt</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Send receipts via email or SMS; you can enter a manual email/phone.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground">
                <Image className="w-5 h-5" /> Screenshot placeholder: Receipt options
              </div>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Terminal not available: ensure location terminal is configured; fallback to Pay.js.</li>
                <li>Cash change incorrect: confirm received amount and item totals; re-enter if needed.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Can I apply both tip and discount?</div>
                <p>Yes, apply discounts first, then add a tip before finalizing payment.</p>
              </div>
              <div>
                <div className="font-medium">How do I resend a receipt?</div>
                <p>Open the last transaction details and choose Send receipt via email/SMS.</p>
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


