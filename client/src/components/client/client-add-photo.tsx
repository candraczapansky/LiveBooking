import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Camera, Upload } from "lucide-react";

type ClientAddPhotoProps = {
  clientId: number;
  onUploaded?: () => void;
};

type AppointmentSummary = {
  id: number;
  startTime: string;
  service?: { id: number; name: string } | null;
};

export default function ClientAddPhoto({ clientId, onUploaded }: ClientAddPhotoProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState<boolean>(false);
  const [appointmentId, setAppointmentId] = useState<string>("");
  const [photoType, setPhotoType] = useState<"before" | "during" | "after" | "progress">("progress");
  const [description, setDescription] = useState<string>("");
  const [photoData, setPhotoData] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);

  useEffect(() => {
    const loadAppointments = async () => {
      setLoadingAppointments(true);
      try {
        const res = await apiRequest("GET", `/api/appointments/client/${clientId}`);
        if (!res.ok) throw new Error("Failed to fetch appointments");
        const list = await res.json();
        const mapped = (Array.isArray(list) ? list : []).map((apt: any) => ({
          id: Number(apt.id),
          startTime: String(apt.startTime || apt.createdAt || new Date().toISOString()),
          service: apt.service ? { id: Number(apt.service.id), name: String(apt.service.name || "Service") } : null,
        })) as AppointmentSummary[];
        setAppointments(mapped);
        if (mapped.length > 0) setAppointmentId(String(mapped[0].id));
      } catch (err) {
        toast({ title: "Error", description: "Failed to load appointments", variant: "destructive" });
      } finally {
        setLoadingAppointments(false);
      }
    };
    loadAppointments();
  }, [clientId, toast]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max size is 10MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setPhotoData(String(e.target?.result || ""));
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!appointmentId) {
      toast({ title: "Choose appointment", description: "Select an appointment to attach the photo", variant: "destructive" });
      return;
    }
    if (!photoData) {
      toast({ title: "No photo", description: "Please choose a photo to upload", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const res = await apiRequest("POST", `/api/appointments/${appointmentId}/photos`, {
        photoType,
        description,
        photoData,
        uploadedByRole: "staff",
      });
      if (!res.ok) throw new Error("Failed to upload photo");
      setDescription("");
      setPhotoData("");
      onUploaded?.();
      toast({ title: "Uploaded", description: "Photo added to client" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const optionsLabel = (apt: AppointmentSummary) => {
    const date = new Date(apt.startTime).toLocaleString();
    return `${apt.service?.name || "Appointment"} — ${date}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Photo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-sm mb-1">Appointment</div>
            <Select value={appointmentId} onValueChange={(v) => setAppointmentId(v)} disabled={loadingAppointments || appointments.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={loadingAppointments ? "Loading..." : appointments.length ? "Select appointment" : "No appointments"} />
              </SelectTrigger>
              <SelectContent>
                {appointments.map((apt) => (
                  <SelectItem key={apt.id} value={String(apt.id)}>
                    {optionsLabel(apt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-sm mb-1">Photo Type</div>
            <Select value={photoType} onValueChange={(v: any) => setPhotoType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="before">Before</SelectItem>
                <SelectItem value="during">During</SelectItem>
                <SelectItem value="after">After</SelectItem>
                <SelectItem value="progress">Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
              <Camera className="h-4 w-4 mr-2" /> Choose Photo
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </div>
        </div>

        <div>
          <div className="text-sm mb-1">Description (optional)</div>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what this photo shows..." />
        </div>

        {photoData && (
          <div className="border rounded p-2">
            <img src={photoData} alt="Preview" className="w-full max-h-64 object-contain" />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setPhotoData(""); setDescription(""); }} disabled={uploading}>
            Reset
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !appointmentId || !photoData}>
            {uploading ? "Uploading..." : "Upload Photo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


