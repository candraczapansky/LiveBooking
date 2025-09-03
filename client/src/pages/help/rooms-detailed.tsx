import { MapPin, Image } from "lucide-react";
import HelpNav from "@/components/help/HelpNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function HelpRoomsDetailed() {
  useDocumentTitle("Help | Rooms");

  const nav = [
    { id: 'overview', label: 'Overview' },
    { id: 'add', label: 'Add room' },
    { id: 'manage', label: 'Manage rooms' },
    { id: 'troubleshoot', label: 'Troubleshooting' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-6">
        <HelpNav items={[{ id: 'index', label: 'Help Home', href: '/help' }, ...nav]} />
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <MapPin className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Rooms (Detailed)</h1>
              <p className="text-sm text-muted-foreground">Configure treatment rooms and service areas</p>
            </div>
          </div>

          <Card id="overview">
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Create rooms with names, descriptions, locations, capacities, and active status.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Rooms table</div>
            </CardContent>
          </Card>

          <Card id="add">
            <CardHeader><CardTitle>Add room</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Click Add Room; enter details; Save to add to the location.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Add Room dialog</div>
            </CardContent>
          </Card>

          <Card id="manage">
            <CardHeader><CardTitle>Manage rooms</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Edit details or toggle active/inactive; each room shows its location and capacity.</p>
              <div className="border rounded-lg p-4 flex items-center gap-3 text-muted-foreground"><Image className="w-5 h-5" /> Screenshot placeholder: Room actions</div>
            </CardContent>
          </Card>

          <Card id="troubleshoot">
            <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-disc pl-5 space-y-1">
                <li>Room not shown: ensure it is Active and assigned to a Location.</li>
                <li>Capacity missing: update the room and set a capacity value.</li>
              </ul>
            </CardContent>
          </Card>

          <Card id="faqs">
            <CardHeader><CardTitle>FAQs</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Can rooms be location-specific?</div>
                <p>Yes, assign a room to a location so it appears where relevant.</p>
              </div>
            </CardContent>
          </Card>

          <div className="pt-2"><Button asChild variant="outline"><a href="/help">Back to Help Home</a></Button></div>
        </div>
      </div>
    </div>
  );
}


