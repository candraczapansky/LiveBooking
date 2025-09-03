import { Bot, MessageSquare, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpAIMessagingDetailed() {
  useDocumentTitle("Help | AI Messaging");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'conversations', label: 'Conversations' },
    { id: 'knowledge', label: 'Knowledge & categories' },
    { id: 'autoresponder', label: 'Auto-responder' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <Bot className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">AI Messaging (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Assist clients with AI and manage knowledge</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Review AI-assisted conversations, manage FAQs/categories, and configure auto-responses.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: AI Messaging center</div>
            </CardContent>
          </Card>

          <Card id="conversations">
            <CardHeader><CardTitle>Conversations</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Search and review recent conversations; start a new AI response when needed.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Conversation list</div>
            </CardContent>
          </Card>

          <Card id="knowledge">
            <CardHeader><CardTitle>Knowledge & categories</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Update Knowledge (FAQ) and Categories so AI responses are accurate and on-brand.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: FAQ & Categories</div>
            </CardContent>
          </Card>

          <Card id="autoresponder">
            <CardHeader><CardTitle>Auto-responder</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Configure SMS/Email auto-responder: thresholds, hours, and per-location behavior.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Auto-responder settings</div>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>AI response off-topic: refine Knowledge and Categories; adjust prompts.</li>
                <li>Auto-responder too chatty: increase thresholds or restrict hours.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Can I turn off AI for certain times?</div>
                <p>Yes, use business hours settings or disable auto-responses temporarily.</p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2"><Button asChild variant="outline"><a href="/help">Back to Help Home</a></Button></div>
        </div>
      </div>
    </div>
  );
}


