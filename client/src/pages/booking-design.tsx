import { useEffect, useMemo, useRef, useState } from "react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type BookingDesign = {
  backgroundImage: string | null;
  primaryColor: string;
  textColor: string;
  aboutContent: string;
  servicesContent: string;
  contactContent: string;
  showTabs: boolean;
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  businessWebsite?: string;
};

export default function BookingDesignPage() {
  useDocumentTitle("Booking Design | Client Site");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [design, setDesign] = useState<BookingDesign>({
    backgroundImage: null,
    primaryColor: "#8b5cf6",
    textColor: "#111827",
    aboutContent: "",
    servicesContent: "",
    contactContent: "",
    showTabs: true,
    businessName: "",
    businessPhone: "",
    businessEmail: "",
    businessAddress: "",
    businessWebsite: "",
  });

  const [previewTab, setPreviewTab] = useState<'desktop' | 'mobile'>('desktop');
  const [previewNonce, setPreviewNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/booking-design");
        if (!res.ok) throw new Error("Failed to load design");
        const data = await res.json();
        if (!cancelled) setDesign((prev) => ({ ...prev, ...data }));
      } catch (e: any) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toDataUrl = (f: File): Promise<string> => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

    const downscale = (dataUrl: string, maxW = 1920, maxH = 1080, quality = 0.82): Promise<string> => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const ratio = Math.min(maxW / width, maxH / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const out = canvas.toDataURL('image/jpeg', quality);
          resolve(out || dataUrl);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });

    try {
      const raw = await toDataUrl(file);
      const compressed = await downscale(raw);
      const next = { ...design, backgroundImage: compressed };
      setDesign(next);
      try { localStorage.setItem('bookingBackgroundImage', compressed); } catch {}
      await save(next);
    } catch (err) {
      console.error('Image load/compress failed:', err);
    }
  };

  const previewStyles = useMemo(() => {
    const bg = design.backgroundImage
      ? {
          backgroundImage: `url(${design.backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        } as React.CSSProperties
      : {};
    return bg;
  }, [design.backgroundImage]);

  const frameSrc = useMemo(() => `/booking`, [previewNonce]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bookingDesignPreviewTab');
      if (saved === 'mobile' || saved === 'desktop') {
        setPreviewTab(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('bookingDesignPreviewTab', previewTab); } catch {}
  }, [previewTab]);

  const save = async (payload?: BookingDesign) => {
    try {
      setSaving(true);
      const body = JSON.stringify(payload ?? design);
      const res = await fetch("/api/booking-design", {
        method: "PUT",
        headers: { "Content-Type": "text/plain" },
        body,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || "Failed to save design");
      }
      try {
        const check = await fetch('/api/booking-design');
        if (check.ok) {
          const fresh = await check.json();
          setDesign((prev) => ({ ...prev, ...fresh }));
        }
      } catch {}
      const hasBg = ((payload ?? design)?.backgroundImage || '').length > 0;
      toast({ title: "Saved", description: hasBg ? "Background saved." : "Design updated." });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Booking Design</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await save();
                try { window.open("/booking", "_blank"); } catch { window.location.assign("/booking"); }
              }}
              disabled={loading}
            >
              Preview Booking
            </Button>
            <Button onClick={() => save()} disabled={saving || loading}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Branding & Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label>Background Image</Label>
                <div className="mt-2 flex items-center gap-3">
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Upload Image</Button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  {design.backgroundImage && (
                    <Button variant="ghost" onClick={() => setDesign((d) => ({ ...d, backgroundImage: null }))}>Remove</Button>
                  )}
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  For a clear, full-page background:
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>Use a high‑quality, large image.</li>
                    <li>Recommended size: <strong>1920 × 1080 px</strong> (Full HD) minimum.</li>
                    <li>Sharper option: <strong>2560 × 1440 px</strong> (for higher‑resolution displays).</li>
                    <li>Aspect ratio: <strong>16:9</strong> (keep important content centered).</li>
                    <li>Format: <strong>JPEG</strong> (quality 80–90%) or <strong>WebP</strong>. Use <strong>PNG</strong> only if transparency is required.</li>
                    <li>File size: ideally under <strong>2 MB</strong> for fast loading. We optimize on upload.</li>
                  </ul>
                </div>
                <div className="mt-3">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current background</div>
                  {design.backgroundImage ? (
                    <button
                      type="button"
                      onClick={() => { try { window.open('/booking', '_blank'); } catch { window.location.assign('/booking'); } }}
                      className="inline-block rounded border overflow-hidden bg-gray-50 dark:bg-gray-900 hover:shadow focus:outline-none focus:ring-2 focus:ring-primary"
                      title="Open booking preview"
                    >
                      <img
                        src={design.backgroundImage}
                        alt="Current booking background thumbnail"
                        className="h-24 w-40 object-cover"
                        loading="lazy"
                      />
                    </button>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400">No background image set yet.</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input id="primaryColor" type="color" value={design.primaryColor}
                      onChange={(e) => setDesign((d) => ({ ...d, primaryColor: e.target.value }))}
                      className="w-16 h-10 p-1" />
                    <Input value={design.primaryColor} onChange={(e) => setDesign((d) => ({ ...d, primaryColor: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="textColor">Text Color</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input id="textColor" type="color" value={design.textColor}
                      onChange={(e) => setDesign((d) => ({ ...d, textColor: e.target.value }))}
                      className="w-16 h-10 p-1" />
                    <Input value={design.textColor} onChange={(e) => setDesign((d) => ({ ...d, textColor: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input id="businessName" value={design.businessName || ""} onChange={(e) => setDesign((d) => ({ ...d, businessName: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="businessWebsite">Website</Label>
                  <Input id="businessWebsite" value={design.businessWebsite || ""} onChange={(e) => setDesign((d) => ({ ...d, businessWebsite: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="businessPhone">Phone</Label>
                  <Input id="businessPhone" value={design.businessPhone || ""} onChange={(e) => setDesign((d) => ({ ...d, businessPhone: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="businessEmail">Email</Label>
                  <Input id="businessEmail" type="email" value={design.businessEmail || ""} onChange={(e) => setDesign((d) => ({ ...d, businessEmail: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="businessAddress">Address</Label>
                  <Input id="businessAddress" value={design.businessAddress || ""} onChange={(e) => setDesign((d) => ({ ...d, businessAddress: e.target.value }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Site Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label htmlFor="aboutContent">About</Label>
                <Textarea id="aboutContent" value={design.aboutContent} onChange={(e) => setDesign((d) => ({ ...d, aboutContent: e.target.value }))} className="mt-2 min-h-[120px]" />
              </div>
              <div>
                <Label htmlFor="servicesContent">Services</Label>
                <Textarea id="servicesContent" value={design.servicesContent} onChange={(e) => setDesign((d) => ({ ...d, servicesContent: e.target.value }))} className="mt-2 min-h-[120px]" />
              </div>
              <div>
                <Label htmlFor="contactContent">Contact</Label>
                <Textarea id="contactContent" value={design.contactContent} onChange={(e) => setDesign((d) => ({ ...d, contactContent: e.target.value }))} className="mt-2 min-h-[120px]" />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden" style={previewStyles}>
                <div className="p-6 bg-white/80 dark:bg-gray-900/80">
                  <h2 className="text-xl font-semibold" style={{ color: design.textColor }}>Mini-site preview</h2>
                  <p className="text-sm mt-1" style={{ color: design.textColor }}>
                    Primary Color: <span style={{ color: design.primaryColor }}>{design.primaryColor}</span>
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Live preview</div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPreviewNonce((n) => n + 1)}>
                      Reload Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { try { window.open('/booking', '_blank'); } catch { window.location.assign('/booking'); } }}
                    >
                      Open in New Tab
                    </Button>
                  </div>
                </div>

                <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as 'desktop' | 'mobile')} className="w-full">
                  <TabsList className="grid grid-cols-2 w-fit">
                    <TabsTrigger value="desktop">Desktop</TabsTrigger>
                    <TabsTrigger value="mobile">Mobile</TabsTrigger>
                  </TabsList>
                  <TabsContent value="desktop" className="mt-4" forceMount>
                    <div className="w-full overflow-x-auto bg-gray-50 dark:bg-gray-900 p-4 rounded border">
                      <div className="mx-auto w-[1280px] h-[800px] bg-white dark:bg-gray-950 rounded shadow border overflow-hidden">
                        <iframe
                          key={`desktop-${previewNonce}`}
                          src={frameSrc}
                          title="Desktop booking preview"
                          className="w-full h-full border-0"
                        />
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="mobile" className="mt-4" forceMount>
                    <div className="w-full flex justify-center bg-gray-50 dark:bg-gray-900 p-4 rounded border">
                      <div className="relative w-[390px] h-[844px] rounded-[36px] border-[10px] border-gray-800 dark:border-gray-200 bg-black shadow-xl overflow-hidden">
                        <iframe
                          key={`mobile-${previewNonce}`}
                          src={frameSrc}
                          title="Mobile booking preview"
                          className="absolute inset-0 w-full h-full border-0 rounded-[26px]"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


