import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SidebarController } from "@/components/layout/sidebar";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { apiRequest } from "@/lib/queryClient";
import { useLocation as useAppLocation } from "@/contexts/LocationContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ClassItem = {
  id: number;
  name: string;
  description?: string | null;
  locationId?: number | null;
  roomId?: number | null;
  instructorStaffId?: number | null;
  startTime: string;
  endTime: string;
  capacity?: number | null;
  price?: number | null;
  color?: string | null;
  status?: string | null;
};

export default function ClassesPage() {
  useDocumentTitle("Classes | Glo Head Spa");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { selectedLocation } = useAppLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formState, setFormState] = useState({ name: "", startTime: "", endTime: "", capacity: 6, price: 0 });

  useEffect(() => {
    const checkSidebarState = () => {
      const globalSidebarState = (window as any).sidebarIsOpen;
      if (globalSidebarState !== undefined) setSidebarOpen(globalSidebarState);
    };
    const id = setInterval(checkSidebarState, 100);
    return () => clearInterval(id);
  }, []);

  const queryKey = useMemo(() => ['/api/classes', selectedLocation?.id], [selectedLocation?.id]);
  const { data: classes = [], refetch, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const url = selectedLocation?.id ? `/api/classes?locationId=${selectedLocation.id}` : '/api/classes';
      const res = await apiRequest('GET', url);
      return await res.json();
    }
  });

  const handleCreate = async () => {
    if (!formState.name || !formState.startTime || !formState.endTime) return;
    const body = {
      name: formState.name,
      startTime: new Date(formState.startTime),
      endTime: new Date(formState.endTime),
      capacity: Number(formState.capacity) || 1,
      price: Number(formState.price) || 0,
      locationId: selectedLocation?.id || null,
    };
    const res = await apiRequest('POST', '/api/classes', body);
    if (res.ok) {
      setIsCreateOpen(false);
      setFormState({ name: "", startTime: "", endTime: "", capacity: 6, price: 0 });
      refetch();
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-7xl mx-auto px-2 sm:px-0">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Classes</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Create and manage group classes</p>
              </div>
              <Button onClick={() => setIsCreateOpen(true)}>New Class</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(isLoading ? [] : classes).map((cls: ClassItem) => (
                <div key={cls.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold" style={{ color: cls.color || '#22C55E' }}>{cls.name}</h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{cls.status || 'scheduled'}</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {cls.description}
                  </div>
                  <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    <div>{new Date(cls.startTime).toLocaleString()} - {new Date(cls.endTime).toLocaleString()}</div>
                    {typeof cls.capacity === 'number' && (
                      <div>Capacity: {cls.capacity}</div>
                    )}
                    {typeof cls.price === 'number' && (
                      <div>Price: ${Number(cls.price).toFixed(2)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={formState.name} onChange={(e) => setFormState({ ...formState, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">Start</Label>
                <Input id="start" type="datetime-local" value={formState.startTime} onChange={(e) => setFormState({ ...formState, startTime: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="end">End</Label>
                <Input id="end" type="datetime-local" value={formState.endTime} onChange={(e) => setFormState({ ...formState, endTime: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input id="capacity" type="number" value={String(formState.capacity)} onChange={(e) => setFormState({ ...formState, capacity: Number(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="price">Price</Label>
                <Input id="price" type="number" step="0.01" value={String(formState.price)} onChange={(e) => setFormState({ ...formState, price: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


