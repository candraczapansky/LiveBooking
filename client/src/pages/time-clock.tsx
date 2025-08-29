import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type TimeClockEntry = {
  id: number;
  staffId: number;
  clockInTime: string;
  clockOutTime?: string | null;
  totalHours?: number | null;
  breakTime?: number | null;
  notes?: string | null;
  status: string;
  location?: string | null;
};

function formatDateTime(dt?: string | null) {
  if (!dt) return "";
  try {
    const d = new Date(dt);
    return d.toLocaleString();
  } catch {
    return String(dt);
  }
}

export default function TimeClockPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [breakMinutes, setBreakMinutes] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  const { data: statusData, refetch: refetchStatus, isFetching: statusLoading } = useQuery<{ clockedIn: boolean; entry: TimeClockEntry | null}>(
    {
      queryKey: ["/api/time-clock/status"],
    }
  );

  const { data: entriesData, isFetching: entriesLoading } = useQuery<TimeClockEntry[]>({
    queryKey: ["/api/time-clock/entries"],
  });

  type Location = { id: number; name: string; isActive?: boolean };
  const { data: locationsData, isFetching: locationsLoading } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const clockInMutation = useMutation({
    mutationFn: async (payload: { location: string; notes?: string }) => {
      const res = await apiRequest("POST", "/api/time-clock/clock-in", payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-clock/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-clock/entries"] });
      setNotes("");
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const bm = parseFloat(breakMinutes);
      const breakTime = Number.isFinite(bm) ? Math.max(0, bm) : 0;
      const res = await apiRequest("POST", "/api/time-clock/clock-out", {
        breakTime,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-clock/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-clock/entries"] });
      setBreakMinutes("0");
    },
  });

  const currentOpenEntry = useMemo(() => statusData?.entry || null, [statusData]);
  const activeLocations = useMemo(() => {
    const list = locationsData || [];
    return list.filter((l) => l.isActive !== false);
  }, [locationsData]);
  const selectedLocationName = useMemo(() => {
    const idNum = parseInt(selectedLocationId);
    return activeLocations.find((l) => l.id === idNum)?.name || "";
  }, [activeLocations, selectedLocationId]);

  useEffect(() => {
    // Ensure fresh status when arriving
    refetchStatus();
  }, [refetchStatus]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Time Clock</h1>
        <p className="text-sm text-muted-foreground">Clock in and out for hourly tracking.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 rounded-lg border bg-card">
          <h2 className="font-semibold mb-2">Current Status</h2>
          {statusLoading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-2">
              <p>
                <span className="font-medium">User: </span>
                {user?.firstName || user?.lastName ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim() : user?.username}
              </p>
              <p>
                <span className="font-medium">Status: </span>
                {statusData?.clockedIn ? "Clocked In" : "Clocked Out"}
              </p>
              {currentOpenEntry && (
                <div className="text-sm text-muted-foreground">
                  <p>Clock In: {formatDateTime(currentOpenEntry.clockInTime)}</p>
                  {currentOpenEntry.location ? <p>Location: {currentOpenEntry.location}</p> : null}
                </div>
              )}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {!statusData?.clockedIn ? (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Location <span className="text-red-500">*</span></label>
                  <select
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    required
                    disabled={locationsLoading}
                  >
                    <option value="">Select a location</option>
                    {activeLocations.map((loc) => (
                      <option key={loc.id} value={String(loc.id)}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Notes (optional)</label>
                  <input
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    placeholder="Any notes for this shift"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <button
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
                  onClick={() => selectedLocationName && clockInMutation.mutate({ location: selectedLocationName, notes: notes || undefined })}
                  disabled={clockInMutation.isPending || !selectedLocationId}
                >
                  {clockInMutation.isPending ? "Clocking In..." : "Clock In"}
                </button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Break (minutes)</label>
                  <input
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    type="number"
                    min={0}
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(e.target.value)}
                  />
                </div>
                <button
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
                  onClick={() => clockOutMutation.mutate()}
                  disabled={clockOutMutation.isPending}
                >
                  {clockOutMutation.isPending ? "Clocking Out..." : "Clock Out"}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-card">
          <h2 className="font-semibold mb-2">Recent Entries</h2>
          {entriesLoading ? (
            <p>Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-2">Clock In</th>
                    <th className="py-2 pr-2">Clock Out</th>
                    <th className="py-2 pr-2">Hours</th>
                    <th className="py-2 pr-2">Status</th>
                    <th className="py-2 pr-2">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {(entriesData || []).slice(0, 50).map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="py-2 pr-2">{formatDateTime(e.clockInTime)}</td>
                      <td className="py-2 pr-2">{formatDateTime(e.clockOutTime || null)}</td>
                      <td className="py-2 pr-2">{e.totalHours != null ? e.totalHours.toFixed(2) : ""}</td>
                      <td className="py-2 pr-2">{e.status}</td>
                      <td className="py-2 pr-2">{e.location || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


