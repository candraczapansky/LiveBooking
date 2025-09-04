import React, { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, Image as ImageIcon, Download } from "lucide-react";

type ClientPhotoGalleryProps = {
  clientId: number;
  clientName: string;
};

type AppointmentSummary = {
  id: number;
  startTime: string;
  service?: { id: number; name: string } | null;
};

type AppointmentPhoto = {
  id: number;
  appointmentId: number;
  photoData: string;
  photoType: "before" | "during" | "after" | "progress";
  description?: string;
  uploadedBy?: number;
  uploadedByRole?: string;
  createdAt: string;
};

type ClientPhoto = AppointmentPhoto & {
  appointment?: AppointmentSummary | null;
};

const photoTypeLabels: Record<AppointmentPhoto["photoType"], string> = {
  before: "Before",
  during: "During",
  after: "After",
  progress: "Progress",
};

const photoTypeColors: Record<AppointmentPhoto["photoType"], string> = {
  before: "bg-blue-100 text-blue-800",
  during: "bg-yellow-100 text-yellow-800",
  after: "bg-green-100 text-green-800",
  progress: "bg-purple-100 text-purple-800",
};

export default function ClientPhotoGallery({ clientId, clientName }: ClientPhotoGalleryProps) {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<ClientPhoto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selected, setSelected] = useState<ClientPhoto | null>(null);

  const { data: appointments = [], isLoading: isLoadingAppointments, error: appointmentsError } = useQuery<AppointmentSummary[]>({
    queryKey: ["/api/appointments/client", clientId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/appointments/client/${clientId}`);
      if (!res.ok) throw new Error("Failed to fetch client appointments");
      const list = await res.json();
      return (Array.isArray(list) ? list : []).map((apt: any) => ({
        id: Number(apt.id),
        startTime: String(apt.startTime || apt.createdAt || new Date().toISOString()),
        service: apt.service ? { id: Number(apt.service.id), name: String(apt.service.name || "Service") } : null,
      }));
    },
  });

  useEffect(() => {
    const loadAllPhotos = async () => {
      if (!appointments || appointments.length === 0) {
        setPhotos([]);
        return;
      }
      setIsLoading(true);
      try {
        const results = await Promise.all(
          appointments.map(async (apt) => {
            try {
              const resp = await apiRequest("GET", `/api/appointments/${apt.id}/photos`);
              if (!resp.ok) return [] as ClientPhoto[];
              const arr: AppointmentPhoto[] = await resp.json();
              return (arr || []).map((p) => ({ ...p, appointment: apt })) as ClientPhoto[];
            } catch {
              return [] as ClientPhoto[];
            }
          })
        );
        const flat = results.flat();
        // Sort newest first by createdAt
        flat.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPhotos(flat);
      } catch (err) {
        console.error("Error loading client photos", err);
        toast({ title: "Error", description: "Failed to load client photos", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    loadAllPhotos();
  }, [appointments, toast]);

  const hasNoPhotos = useMemo(() => !isLoading && photos.length === 0, [isLoading, photos.length]);

  const formatDateTime = (ds: string) => new Date(ds).toLocaleString();

  const downloadPhoto = (photo: ClientPhoto) => {
    const link = document.createElement("a");
    link.href = photo.photoData;
    const dateLabel = new Date(photo.createdAt).toISOString().split("T")[0];
    link.download = `client-${clientId}-apt-${photo.appointmentId}-${photo.photoType}-${dateLabel}.jpg`;
    link.click();
  };

  if (isLoadingAppointments) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Client Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (appointmentsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Client Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">Failed to load client appointments</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Client Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : hasNoPhotos ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No photos found for this client.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden">
                  <div className="relative group">
                    <img
                      src={photo.photoData}
                      alt={`${photo.photoType} photo`}
                      className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setSelected(photo)}
                    />
                    <div className="absolute top-2 left-2">
                      <Badge className={photoTypeColors[photo.photoType]}>
                        {photoTypeLabels[photo.photoType]}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-2">
                    {photo.description ? (
                      <p className="text-sm text-gray-600">{photo.description}</p>
                    ) : null}
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {photo.appointment?.service?.name || "Appointment"}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDateTime(photo.createdAt)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Photo Viewer</DialogTitle>
            <DialogDescription>
              {clientName} — {selected?.appointment?.service?.name || "Appointment"}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={photoTypeColors[selected.photoType]}>
                  {photoTypeLabels[selected.photoType]}
                </Badge>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatDateTime(selected.createdAt)}
                </div>
              </div>
              <img
                src={selected.photoData}
                alt={`${selected.photoType} photo`}
                className="w-full max-h-[75vh] object-contain rounded-md"
              />
              {selected.description ? (
                <p className="text-sm text-gray-600">{selected.description}</p>
              ) : null}
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => downloadPhoto(selected)} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


