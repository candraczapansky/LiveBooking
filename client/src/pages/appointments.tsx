import { useState, useEffect } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/use-document-title";
import AppointmentForm from "@/components/appointments/appointment-form";
import { PlusCircle, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";

// Sample appointment data that matches the calendar layout
const sampleAppointments = [
  {
    id: 1,
    title: "Natural Volume Hair Extensions",
    clientName: "Vicki S",
    time: "12:30 PM",
    duration: 60,
    service: "Hair",
    staff: "Kelsey Czapansky",
    color: "#e879f9"
  },
  {
    id: 2,
    title: "Classic Mini Fill",
    clientName: "Kelly B",
    time: "10:00 AM",
    duration: 90,
    service: "Nails",
    staff: "Kelsey Czapansky",
    color: "#facc15"
  },
  {
    id: 3,
    title: "Classic Fill",
    clientName: "Kelly B", 
    time: "11:00 AM",
    duration: 60,
    service: "Nails",
    staff: "Kelsey Czapansky",
    color: "#e879f9"
  },
  {
    id: 4,
    title: "Bold Fill",
    clientName: "Macy S",
    time: "12:00 PM",
    duration: 60,
    service: "Nails",
    staff: "Katy Ferguson",
    color: "#e879f9"
  },
  {
    id: 5,
    title: "Classic Full Set",
    clientName: "Suzy L",
    time: "1:00 PM",
    duration: 120,
    service: "Nails",
    staff: "Kelsey Czapansky",
    color: "#facc15"
  },
  {
    id: 6,
    title: "Bold Fill",
    clientName: "Louise C",
    time: "4:00 PM",
    duration: 60,
    service: "Nails",
    staff: "Kelsey Czapansky",
    color: "#e879f9"
  },
  {
    id: 7,
    title: "Natural Volume Extensions",
    clientName: "Emma K",
    time: "5:00 PM",
    duration: 90,
    service: "Hair",
    staff: "Kelsey Czapansky",
    color: "#e879f9"
  },
  {
    id: 8,
    title: "Outside Fill Color",
    clientName: "Jenni H",
    time: "12:00 PM",
    duration: 90,
    service: "Nails",
    staff: "Amanda Sappington",
    color: "#a855f7"
  },
  {
    id: 9,
    title: "Blended Fill",
    clientName: "Alyson J",
    time: "12:00 PM",
    duration: 60,
    service: "Nails",
    staff: "Rita Williams",
    color: "#facc15"
  },
  {
    id: 10,
    title: "Blended Extensions",
    clientName: "Christina W",
    time: "2:00 PM",
    duration: 120,
    service: "Hair",
    staff: "Amanda Sappington",
    color: "#f472b6"
  }
];

const timeSlots = [
  "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM",
  "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM",
  "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM",
  "7:00 PM"
];

const staffMembers = [
  "Kelsey Czapansky",
  "Katy Ferguson", 
  "Amanda Sappington",
  "Rita Williams"
];

const AppointmentsPage = () => {
  useDocumentTitle("Appointments | BeautyBook");
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState("day");
  const [selectedStaff, setSelectedStaff] = useState("all");
  const [selectedService, setSelectedService] = useState("all");
  const [zoomLevel, setZoomLevel] = useState(1); // 0.5 = zoomed out, 1 = normal, 2 = zoomed in

  useEffect(() => {
    const checkSidebarState = () => {
      const globalSidebarState = (window as any).sidebarIsOpen;
      if (globalSidebarState !== undefined) {
        setSidebarOpen(globalSidebarState);
      }
    };

    const interval = setInterval(checkSidebarState, 100);
    return () => clearInterval(interval);
  }, []);

  const { data: staff } = useQuery({
    queryKey: ['/api/staff'],
    queryFn: async () => {
      const response = await fetch('/api/staff');
      if (!response.ok) throw new Error('Failed to fetch staff');
      return response.json();
    }
  });

  const { data: services } = useQuery({
    queryKey: ['/api/services'],
    queryFn: async () => {
      const response = await fetch('/api/services');
      if (!response.ok) throw new Error('Failed to fetch services');
      return response.json();
    }
  });

  const formatDate = (date: Date) => {
    if (viewMode === 'month') {
      return date.toLocaleDateString('en-US', { 
        month: 'long',
        year: 'numeric'
      });
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getSlotHeight = () => {
    return Math.round(60 * zoomLevel); // Base 60px per hour slot, adjusted by zoom
  };

  const getAppointmentPosition = (time: string, duration: number) => {
    const timeIndex = timeSlots.findIndex(slot => slot === time);
    if (timeIndex === -1) return { top: 0, height: getSlotHeight() };
    
    const slotHeight = getSlotHeight(); // Each 30-minute slot
    const slotsNeeded = Math.ceil(duration / 30);
    
    return {
      top: timeIndex * slotHeight,
      height: Math.max(slotsNeeded * slotHeight, Math.round(45 * zoomLevel))
    };
  };

  const getStaffColumn = (staffName: string) => {
    return staffMembers.findIndex(name => name === staffName);
  };

  const handleAddAppointment = () => {
    setSelectedAppointmentId(null);
    setIsFormOpen(true);
  };

  const handleEditAppointment = (appointmentId: number) => {
    setSelectedAppointmentId(appointmentId);
    setIsFormOpen(true);
  };

  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.5, 3)); // Max zoom 3x
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.5, 0.3)); // Min zoom 0.3x
  };

  const resetZoom = () => {
    setZoomLevel(1);
  };

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const renderDayView = () => (
    <div className="flex" style={{ minHeight: `${timeSlots.length * getSlotHeight() + 48}px` }}>
      {/* Time Column */}
      <div className="w-20 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0 sticky left-0 z-10">
        <div className="h-12 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"></div>
        {timeSlots.map((time) => (
          <div 
            key={time}
            className="border-b border-gray-200 dark:border-gray-700 flex items-start justify-end pr-2 pt-1 bg-gray-50 dark:bg-gray-800"
            style={{ height: `${getSlotHeight()}px` }}
          >
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {time}
            </span>
          </div>
        ))}
      </div>

      {/* Main Calendar Area */}
      <div className="flex-1">
        {/* Staff Header - Sticky */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky top-0 z-20">
          {staffMembers.map((staffName, index) => (
            <div key={staffName} className="flex-1 h-12 border-r border-gray-200 dark:border-gray-700 last:border-r-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {staffName}
              </span>
            </div>
          ))}
        </div>

        {/* Time Grid */}
        <div className="relative">
          <div className="flex">
            {/* Staff Columns */}
            {staffMembers.map((staffName, staffIndex) => (
              <div key={staffName} className="flex-1 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                {timeSlots.map((time, timeIndex) => (
                  <div 
                    key={`${staffIndex}-${time}`}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    style={{ height: `${getSlotHeight()}px` }}
                    onClick={() => handleAddAppointment()}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Appointment Blocks */}
          <div className="absolute inset-0 pointer-events-none">
            {sampleAppointments.map((appointment) => {
              const position = getAppointmentPosition(appointment.time, appointment.duration);
              const staffColumn = getStaffColumn(appointment.staff);
              
              if (staffColumn === -1) return null;
              
              return (
                <div
                  key={appointment.id}
                  className="absolute pointer-events-auto cursor-pointer rounded-md p-2 text-xs overflow-hidden shadow-sm border text-white hover:shadow-md transition-shadow"
                  style={{
                    top: position.top,
                    height: position.height,
                    left: `${staffColumn * 25}%`,
                    width: '24%',
                    margin: '1px',
                    backgroundColor: appointment.color,
                    borderColor: appointment.color,
                    fontSize: `${Math.max(10, 12 * zoomLevel)}px`,
                    padding: `${Math.max(4, 8 * zoomLevel)}px`
                  }}
                  onClick={() => handleEditAppointment(appointment.id)}
                >
                  <div className="font-medium truncate">
                    {appointment.time} - {appointment.title}
                  </div>
                  <div className="opacity-90 truncate">
                    👤 {appointment.clientName}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    
    return (
      <div className="flex" style={{ minHeight: `${timeSlots.length * getSlotHeight() + 48}px` }}>
        {/* Time Column */}
        <div className="w-20 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0 sticky left-0 z-10">
          <div className="h-12 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"></div>
          {timeSlots.map((time) => (
            <div 
              key={time}
              className="border-b border-gray-200 dark:border-gray-700 flex items-start justify-end pr-2 pt-1 bg-gray-50 dark:bg-gray-800"
              style={{ height: `${getSlotHeight()}px` }}
            >
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {time}
              </span>
            </div>
          ))}
        </div>

        {/* Days Columns */}
        <div className="flex-1">
          {/* Days Header */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky top-0 z-20">
            {weekDays.map((day, index) => (
              <div key={index} className="flex-1 h-12 border-r border-gray-200 dark:border-gray-700 last:border-r-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {day.getDate()}
                </span>
              </div>
            ))}
          </div>

          {/* Time Grid */}
          <div className="relative">
            <div className="flex">
              {weekDays.map((day, dayIndex) => (
                <div key={dayIndex} className="flex-1 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                  {timeSlots.map((time, timeIndex) => (
                    <div 
                      key={`${dayIndex}-${time}`}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                      style={{ height: `${getSlotHeight()}px` }}
                      onClick={() => handleAddAppointment()}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthDays = getDaysInMonth(currentDate);
    const weeks = [];
    
    for (let i = 0; i < monthDays.length; i += 7) {
      weeks.push(monthDays.slice(i, i + 7));
    }
    
    return (
      <div className="h-full">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="flex-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 last:border-b-0" style={{ height: 'calc((100vh - 300px) / 6)' }}>
              {week.map((day, dayIndex) => {
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday = day.toDateString() === new Date().toDateString();
                
                return (
                  <div 
                    key={dayIndex}
                    className={`border-r border-gray-200 dark:border-gray-700 last:border-r-0 p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800 text-gray-400' : ''
                    } ${isToday ? 'bg-blue-50 dark:bg-blue-900' : ''}`}
                    onClick={() => handleAddAppointment()}
                  >
                    <div className={`text-sm ${isToday ? 'font-bold text-blue-600 dark:text-blue-400' : ''}`}>
                      {day.getDate()}
                    </div>
                    {/* Sample appointments for month view */}
                    {isCurrentMonth && day.getDate() % 3 === 0 && (
                      <div className="mt-1">
                        <div className="text-xs bg-purple-200 text-purple-800 px-1 rounded mb-1 truncate">
                          Appointment
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarOpen ? 'ml-64' : 'ml-0'
      }`}>
        <Header />
        
        <main className="flex-1 overflow-hidden bg-white dark:bg-gray-900">
          {/* Calendar Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Appointments</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage salon appointments and bookings
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button onClick={goToToday} variant="outline" size="sm">
                  Today
                </Button>
                
                {/* Zoom Controls */}
                <div className="flex items-center border rounded-md bg-gray-50 dark:bg-gray-800">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={zoomOut}
                    className="h-8 w-8 p-0 rounded-none border-r"
                    disabled={zoomLevel <= 0.3}
                  >
                    <ZoomOut className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetZoom}
                    className="h-8 px-2 rounded-none text-xs font-medium min-w-[40px]"
                  >
                    {Math.round(zoomLevel * 100)}%
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={zoomIn}
                    className="h-8 w-8 p-0 rounded-none border-l"
                    disabled={zoomLevel >= 3}
                  >
                    <ZoomIn className="h-3 w-3" />
                  </Button>
                </div>
                
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Platter - Broken A..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stylists</SelectItem>
                    {staffMembers.map((member) => (
                      <SelectItem key={member} value={member}>
                        {member}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All service categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All service categories</SelectItem>
                    <SelectItem value="hair">Hair Services</SelectItem>
                    <SelectItem value="nails">Nail Services</SelectItem>
                    <SelectItem value="skin">Skin Services</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={handleAddAppointment} className="bg-blue-600 hover:bg-blue-700">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Appointment
                </Button>
              </div>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={goToPrevious}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 min-w-[200px]">
                    {formatDate(currentDate)}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={goToNext}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Select value={viewMode} onValueChange={setViewMode}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 overflow-auto" style={{ height: 'calc(100vh - 200px)' }}>
            {viewMode === 'day' && renderDayView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'month' && renderMonthView()}
          </div>
        </main>
      </div>

      {/* Appointment Form */}
      <AppointmentForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        appointmentId={selectedAppointmentId}
        defaultDate={currentDate}
      />
    </div>
  );
};

export default AppointmentsPage;