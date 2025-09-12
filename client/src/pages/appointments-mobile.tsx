import { useEffect, useMemo, useState, useRef, lazy, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useLocation as useBusinessLocation } from "@/contexts/LocationContext";
import { apiRequest } from "@/lib/queryClient";
import { toCentralWallTime, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Menu, Filter } from "lucide-react";
import AppointmentDetails from "@/components/appointments/appointment-details";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";

const AppointmentForm = lazy(() => import("@/components/appointments/appointment-form"));

// Color palette for appointments - cycling through these for visual variety
const APPOINTMENT_COLORS = [
  'bg-blue-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-indigo-500',
  'bg-rose-500',
  'bg-teal-500',
];

export default function AppointmentsMobilePage() {
  useDocumentTitle("Appointments");
  const queryClient = useQueryClient();
  const { selectedLocation } = useBusinessLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsAppointmentId, setDetailsAppointmentId] = useState<number | null>(null);
  const [showStaffFilter, setShowStaffFilter] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");

  // Time range for the day view (7 AM to 9 PM by default for better coverage)
  const startHour = 7;
  const endHour = 21;
  const hourSlots = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  // Data queries
  const { data: appointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ["/api/appointments", selectedLocation?.id],
    queryFn: async () => {
      const url = selectedLocation?.id ? `/api/appointments?locationId=${selectedLocation.id}` : "/api/appointments";
      const res = await apiRequest("GET", url);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: services = [] } = useQuery<any[]>({ queryKey: ["/api/services"] });
  const { data: users = [] } = useQuery<any[]>({ queryKey: ["/api/users"] });
  const { data: staffRecords = [] } = useQuery<any[]>({ queryKey: ["/api/staff"] });

  // Helper maps
  const serviceIdToService = useMemo(() => {
    const map = new Map<number, any>();
    if (Array.isArray(services)) {
      for (const svc of services) map.set(svc.id, svc);
    }
    return map;
  }, [services]);

  const userIdToUser = useMemo(() => {
    const map = new Map<number, any>();
    if (Array.isArray(users)) {
      for (const u of users) map.set(u.id, u);
    }
    return map;
  }, [users]);

  const staffIdToUser = useMemo(() => {
    const map = new Map<number, any>();
    if (Array.isArray(staffRecords) && Array.isArray(users)) {
      for (const staff of staffRecords) {
        const user = users.find((u: any) => u.id === staff.userId);
        if (user) {
          // Map the staff.id to the user object
          map.set(staff.id, user);
        }
      }
    }
    return map;
  }, [staffRecords, users]);

  // Get week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Filter appointments for selected date
  const dayAppointments = useMemo(() => {
    const filtered = appointments.filter((apt: any) => {
      const aptDate = toCentralWallTime(apt.startTime);
      return isSameDay(aptDate, selectedDate);
    });

    // Filter by staff if needed
    if (selectedStaffId !== "all") {
      return filtered.filter((apt: any) => String(apt.staffId) === selectedStaffId);
    }

    return filtered;
  }, [appointments, selectedDate, selectedStaffId]);

  // Group appointments by staff for column layout
  const appointmentsByStaff = useMemo(() => {
    const grouped = new Map<number, any[]>();
    
    dayAppointments.forEach((apt: any) => {
      const staffId = apt.staffId;
      if (!grouped.has(staffId)) {
        grouped.set(staffId, []);
      }
      grouped.get(staffId)!.push(apt);
    });

    return grouped;
  }, [dayAppointments]);

  // Get unique staff for the day
  const dayStaff = useMemo(() => {
    const staffIds = new Set(dayAppointments.map((apt: any) => apt.staffId));
    const staffList: any[] = [];
    
    staffIds.forEach(staffId => {
      // Use staffIdToUser mapping since appointments have staffId
      const user = staffIdToUser.get(staffId);
      if (user) {
        staffList.push({ id: staffId, user });
      }
    });

    // Sort staff list by name for consistent ordering
    return staffList.sort((a, b) => {
      const nameA = `${a.user.firstName} ${a.user.lastName || ''}`.toLowerCase();
      const nameB = `${b.user.firstName} ${b.user.lastName || ''}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [dayAppointments, staffIdToUser]);

  // Navigation functions
  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setWeekStart(startOfWeek(today, { weekStartsOn: 0 }));
  };

  const previousWeek = () => {
    setWeekStart(prev => addDays(prev, -7));
    setSelectedDate(prev => addDays(prev, -7));
  };

  const nextWeek = () => {
    setWeekStart(prev => addDays(prev, 7));
    setSelectedDate(prev => addDays(prev, 7));
  };

  // Calculate appointment position and height with bigger slots
  const HOUR_HEIGHT = 90; // Increased from 60px to 90px for better spacing
  const getAppointmentStyle = (apt: any) => {
    const start = toCentralWallTime(apt.startTime);
    const end = toCentralWallTime(apt.endTime);
    
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const dayStartMinutes = startHour * 60;
    
    const top = ((startMinutes - dayStartMinutes) / 60) * HOUR_HEIGHT;
    const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
    
    return {
      top: `${top}px`,
      height: `${Math.max(height, 45)}px`, // Increased minimum height for better visibility
    };
  };

  // Get color for appointment
  const getAppointmentColor = (index: number) => {
    return APPOINTMENT_COLORS[index % APPOINTMENT_COLORS.length];
  };

  // Auto-scroll to current time on mount and when date changes
  useEffect(() => {
    if (scrollContainerRef.current && isSameDay(selectedDate, new Date())) {
      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour >= startHour && currentHour <= endHour) {
        // Scroll to current time with some offset to show context
        const scrollPosition = (currentHour - startHour) * HOUR_HEIGHT - 50;
        setTimeout(() => {
          scrollContainerRef.current?.scrollTo({
            top: Math.max(0, scrollPosition),
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  }, [selectedDate, HOUR_HEIGHT]);

  const onAppointmentCreated = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    setIsFormOpen(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold">Calendar</h1>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowStaffFilter(!showStaffFilter)}
              className="p-2"
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsFormOpen(true)}
              className="p-2"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Staff filter (when shown) */}
        {showStaffFilter && (
          <div className="mb-2">
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full px-3 py-1 text-sm border rounded-md"
            >
              <option value="all">All Staff</option>
              {Array.isArray(staffRecords) && staffRecords
                .map((staff: any) => {
                  const user = staffIdToUser.get(staff.id);
                  if (!user) return null;
                  return {
                    id: staff.id,
                    name: `${user.firstName || 'Staff'} ${user.lastName || ''}`.trim(),
                    user
                  };
                })
                .filter(Boolean)
                .sort((a: any, b: any) => a.name.localeCompare(b.name))
                .map((item: any) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Month/Year and Today button */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={previousWeek} className="p-1">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium text-sm">
              {format(selectedDate, 'MMMM yyyy')}
            </span>
            <Button size="sm" variant="ghost" onClick={nextWeek} className="p-1">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button size="sm" variant="outline" onClick={goToToday} className="text-xs px-2 py-1">
            Today
          </Button>
        </div>

        {/* Week days */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`
                  flex flex-col items-center justify-center py-2 rounded-lg transition-colors
                  ${isSelected ? 'bg-primary text-white' : 'hover:bg-gray-100'}
                  ${isToday && !isSelected ? 'text-primary font-semibold' : ''}
                `}
              >
                <span className="text-xs uppercase">{format(day, 'EEE')}</span>
                <span className={`text-lg ${isSelected ? 'font-bold' : ''}`}>
                  {format(day, 'd')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden bg-white">
        {loadingAppointments ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-600 text-sm">Loading appointments...</p>
            </div>
          </div>
        ) : (
          <div className="flex h-full relative">
            {/* Time column - sticky positioned */}
            <div className="w-14 border-r bg-gray-50 flex-shrink-0 sticky left-0 z-20">
              {hourSlots.map((hour) => (
                <div key={hour} className="h-[90px] relative border-b border-gray-100">
                  <span className="absolute top-1 right-1 text-xs text-gray-600 font-medium">
                    {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : hour === 0 ? '12 AM' : `${hour} AM`}
                  </span>
                </div>
              ))}
            </div>

            {/* Appointments grid with smooth scrolling */}
            <div 
              ref={scrollContainerRef} 
              className="flex-1 overflow-y-auto overflow-x-auto"
              style={{
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth'
              }}
            >
              <div 
                className="relative min-h-full" 
                style={{ 
                  height: `${hourSlots.length * HOUR_HEIGHT}px`, 
                  minWidth: dayStaff.length > 1 && selectedStaffId === "all" ? `${Math.max(dayStaff.length * 150, 300)}px` : '100%' 
                }}>
                {/* Hour lines */}
                {hourSlots.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-gray-200"
                    style={{ top: `${(hour - startHour) * HOUR_HEIGHT}px` }}
                  />
                ))}

                {/* Current time indicator (red line) - only shown for today */}
                {isSameDay(selectedDate, new Date()) && (() => {
                  const now = new Date();
                  const currentMinutes = now.getHours() * 60 + now.getMinutes();
                  const dayStartMinutes = startHour * 60;
                  const dayEndMinutes = endHour * 60;
                  
                  if (currentMinutes >= dayStartMinutes && currentMinutes <= dayEndMinutes) {
                    const top = ((currentMinutes - dayStartMinutes) / 60) * HOUR_HEIGHT;
                    return (
                      <div
                        className="absolute w-full border-t-2 border-red-500 z-10 pointer-events-none"
                        style={{ top: `${top}px` }}
                      >
                        <div className="absolute -top-2 left-0 w-2 h-2 bg-red-500 rounded-full"></div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Staff columns or single column */}
                <div className="flex h-full">
                  {dayStaff.length > 1 && selectedStaffId === "all" ? (
                    // Multiple staff columns with fixed width for better scrolling
                    dayStaff.map((staff, staffIndex) => (
                      <div key={staff.id} className="w-[150px] flex-shrink-0 relative border-r last:border-r-0">
                        {/* Staff name header - sticky at top */}
                        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 p-2 border-b shadow-sm">
                          <p className="text-xs font-semibold text-center truncate text-gray-700">
                            {staff.user.firstName || 'Staff'} {staff.user.lastName ? staff.user.lastName[0].toUpperCase() + '.' : ''}
                          </p>
                        </div>
                        
                        {/* Appointments for this staff */}
                        {(appointmentsByStaff.get(staff.id) || []).map((apt: any, index: number) => {
                          const client = userIdToUser.get(apt.clientId);
                          const service = serviceIdToService.get(apt.serviceId);
                          const style = getAppointmentStyle(apt);
                          
                          return (
                            <div
                              key={apt.id}
                              className={`absolute left-2 right-2 ${getAppointmentColor(staffIndex * 10 + index)} text-white rounded-lg p-2 cursor-pointer shadow-md hover:shadow-lg transition-shadow overflow-hidden`}
                              style={{...style, zIndex: 5}}
                              onClick={() => {
                                setDetailsAppointmentId(apt.id);
                                setIsDetailsOpen(true);
                              }}
                            >
                              <div className="text-xs font-bold truncate">
                                {client ? `${client.firstName} ${client.lastName}` : 'Client'}
                              </div>
                              <div className="text-[11px] opacity-95 font-medium">{formatTime(apt.startTime)}</div>
                              <div className="text-[11px] opacity-90 truncate mt-0.5">{service?.name}</div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  ) : (
                    // Single column view with better spacing
                    <div className="flex-1 relative px-2">
                      {dayAppointments.map((apt: any, index: number) => {
                        const client = userIdToUser.get(apt.clientId);
                        const service = serviceIdToService.get(apt.serviceId);
                        const staff = staffIdToUser.get(apt.staffId);
                        const style = getAppointmentStyle(apt);
                        
                        return (
                          <div
                            key={apt.id}
                            className={`absolute left-3 right-3 ${getAppointmentColor(index)} text-white rounded-lg p-3 cursor-pointer shadow-md hover:shadow-lg transition-shadow overflow-hidden`}
                            style={{...style, zIndex: 5}}
                            onClick={() => {
                              setDetailsAppointmentId(apt.id);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <div className="text-sm font-bold truncate">
                              {client ? `${client.firstName} ${client.lastName}` : 'Client'}
                            </div>
                            <div className="text-xs opacity-95 font-medium mt-0.5">{formatTime(apt.startTime)}</div>
                            <div className="text-xs opacity-90 truncate mt-1">{service?.name}</div>
                            {selectedStaffId === "all" && staff && (
                              <div className="text-xs opacity-85 truncate mt-1 font-medium">
                                with {staff.firstName || 'Staff'} {staff.lastName ? staff.lastName[0].toUpperCase() + '.' : ''}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Empty state */}
                {dayAppointments.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No appointments scheduled</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsFormOpen(true)}
                        className="mt-2"
                      >
                        Add Appointment
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation bar */}
      <div className="bg-white border-t px-4 py-2">
        <div className="flex justify-around">
          <button className="flex flex-col items-center p-2 text-primary">
            <CalendarIcon className="h-5 w-5" />
            <span className="text-xs mt-1">Calendar</span>
          </button>
          <button className="flex flex-col items-center p-2 text-gray-500">
            <Menu className="h-5 w-5" />
            <span className="text-xs mt-1">More</span>
          </button>
        </div>
      </div>

      {/* Dialogs */}
      {isFormOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg">
              <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        }>
          <AppointmentForm
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            appointmentId={null}
            onAppointmentCreated={onAppointmentCreated}
            appointments={appointments}
            selectedDate={selectedDate}
          />
        </Suspense>
      )}

      {isDetailsOpen && (
        <AppointmentDetails
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          appointmentId={detailsAppointmentId}
        />
      )}
    </div>
  );
}