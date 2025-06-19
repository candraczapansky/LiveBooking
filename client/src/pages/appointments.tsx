import { useState, useEffect } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/use-document-title";
import AppointmentForm from "@/components/appointments/appointment-form";
import AppointmentCheckout from "@/components/appointments/appointment-checkout";
import { PlusCircle, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, CreditCard, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";

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

const AppointmentsPage = () => {
  useDocumentTitle("Appointments | BeautyBook");
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutAppointment, setCheckoutAppointment] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState("day");
  const [selectedStaff, setSelectedStaff] = useState("all");
  const [selectedService, setSelectedService] = useState("all");
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    const checkSidebarState = () => {
      const globalSidebarState = (window as any).sidebarIsOpen;
      if (globalSidebarState !== undefined) {
        setSidebarOpen(globalSidebarState);
      }
    };

    checkSidebarState();
    const interval = setInterval(checkSidebarState, 100);
    return () => clearInterval(interval);
  }, []);

  // Fetch appointments from API
  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['/api/appointments'],
  });

  // Fetch staff from API
  const { data: staff, isLoading: staffLoading } = useQuery({
    queryKey: ['/api/staff'],
  });

  // Fetch services from API
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/services'],
  });

  // Fetch users to get client information
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    if (viewMode === 'day') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    
    setCurrentDate(newDate);
  };

  const zoomIn = () => {
    if (zoomLevel < 3) {
      setZoomLevel(prev => Math.min(prev + 0.5, 3));
    }
  };

  const zoomOut = () => {
    if (zoomLevel > 0.5) {
      setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
    }
  };

  const handlePayment = (appointment: any) => {
    // Get service details and calculate amount
    const service = services?.find((s: any) => s.id === appointment.serviceId);
    const staffMember = staff?.find((s: any) => s.id === appointment.staffId);
    const client = users?.find((u: any) => u.id === appointment.clientId);
    
    const checkoutData = {
      id: appointment.id,
      clientName: client ? `${client.firstName} ${client.lastName}` : 'Unknown Client',
      serviceName: service?.name || 'Unknown Service',
      staffName: staffMember?.user ? `${staffMember.user.firstName} ${staffMember.user.lastName}` : 'Unknown Staff',
      startTime: new Date(appointment.startTime),
      endTime: new Date(appointment.endTime),
      amount: service?.price || 0,
      status: appointment.status,
      paymentStatus: appointment.paymentStatus || 'unpaid'
    };
    
    setCheckoutAppointment(checkoutData);
    setIsCheckoutOpen(true);
  };

  const handlePaymentSuccess = () => {
    toast({
      title: "Payment Successful",
      description: "The appointment payment has been processed successfully.",
    });
    // Refresh appointments data
    window.location.reload();
  };

  const getAppointmentStyle = (appointment: any) => {
    const startTime = new Date(appointment.startTime);
    const endTime = new Date(appointment.endTime);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    
    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const topPosition = ((startHour - 8) * 2 + (startMinute === 30 ? 1 : 0)) * 30 * zoomLevel;
    
    const slotHeight = 30 * zoomLevel;
    const slotsNeeded = Math.ceil(duration / 30);
    
    // Ensure minimum height for button visibility
    const minHeight = duration > 30 ? Math.round(65 * zoomLevel) : Math.round(45 * zoomLevel);
    
    return {
      top: `${topPosition}px`,
      height: Math.max(slotsNeeded * slotHeight, minHeight)
    };
  };

  const getStaffColumn = (staffName: string) => {
    if (!staff) return -1;
    return staff.findIndex((staffMember: any) => {
      const fullName = staffMember.user ? `${staffMember.user.firstName} ${staffMember.user.lastName}` : 'Unknown Staff';
      return fullName === staffName;
    });
  };

  const handleAddAppointment = () => {
    setSelectedAppointmentId(null);
    setIsFormOpen(true);
  };

  const renderDayView = () => {
    const staffCount = staff?.length || 1;
    const columnWidth = Math.max(200, Math.floor((window.innerWidth - (sidebarOpen ? 280 : 80) - 100) / staffCount));
    
    return (
      <div className="relative">
        {/* Header with staff names */}
        <div className="flex border-b bg-white dark:bg-gray-800 sticky top-0 z-10">
          <div className="w-20 flex-shrink-0 border-r p-4 text-sm font-medium text-gray-600 dark:text-gray-300">
            Time
          </div>
          {staff?.map((staffMember: any) => {
            const staffName = staffMember.user ? `${staffMember.user.firstName} ${staffMember.user.lastName}` : 'Unknown Staff';
            return (
              <div 
                key={staffMember.id}
                className="border-r p-4 text-sm font-medium text-gray-900 dark:text-gray-100 flex-shrink-0" 
                style={{ width: columnWidth }}
              >
                {staffName}
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="relative">
          {/* Time labels and grid lines */}
          <div className="flex">
            <div className="w-20 flex-shrink-0">
              {timeSlots.map((time, index) => (
                <div 
                  key={time} 
                  className="border-r border-b h-8 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 flex items-center"
                  style={{ height: Math.round(30 * zoomLevel) }}
                >
                  {time}
                </div>
              ))}
            </div>
            
            {/* Staff columns */}
            {staff?.map((staffMember: any) => (
              <div key={staffMember.id} className="flex-shrink-0 border-r relative" style={{ width: columnWidth }}>
                {timeSlots.map((time, index) => (
                  <div 
                    key={time} 
                    className="border-b h-8 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    style={{ height: Math.round(30 * zoomLevel) }}
                    onClick={() => {
                      // Set time for new appointment
                      const [timeStr, period] = time.split(' ');
                      const [hours, minutes] = timeStr.split(':');
                      let hour = parseInt(hours);
                      if (period === 'PM' && hour !== 12) hour += 12;
                      if (period === 'AM' && hour === 12) hour = 0;
                      
                      const appointmentDate = new Date(currentDate);
                      appointmentDate.setHours(hour, parseInt(minutes), 0, 0);
                      
                      handleAddAppointment();
                    }}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Appointment Blocks */}
          <div className="absolute inset-0 pointer-events-none">
            {appointments?.map((appointment: any) => {
              const startTime = new Date(appointment.startTime);
              const endTime = new Date(appointment.endTime);
              const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
              const timeString = startTime.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true
              });

              // Find staff member and get column
              const staffMember = staff?.find((s: any) => s.id === appointment.staffId);
              const staffName = staffMember?.user ? `${staffMember.user.firstName} ${staffMember.user.lastName}` : 'Unknown Staff';
              const columnIndex = getStaffColumn(staffName);
              
              // Find service information
              const service = services?.find((s: any) => s.id === appointment.serviceId);
              const serviceName = service?.name || 'Service';
              
              // Find client information
              const client = users?.find((u: any) => u.id === appointment.clientId);
              const clientName = client ? `${client.firstName} ${client.lastName}` : `Client ${appointment.clientId}`;
              
              if (columnIndex === -1) return null;

              const leftPosition = 80 + (columnIndex * columnWidth);
              const appointmentStyle = getAppointmentStyle(appointment);

              return (
                <div
                  key={appointment.id}
                  className="absolute pointer-events-auto rounded-lg border-l-4 p-2 shadow-sm hover:shadow-md transition-shadow"
                  style={{
                    left: `${leftPosition + 4}px`,
                    width: `${columnWidth - 8}px`,
                    ...appointmentStyle,
                    backgroundColor: appointment.paymentStatus === 'paid' ? '#10b981' : '#e879f9',
                    borderLeftColor: appointment.paymentStatus === 'paid' ? '#059669' : '#c026d3',
                    color: '#ffffff'
                  }}
                >
                  <div className="text-xs font-medium truncate">
                    {serviceName}
                  </div>
                  <div className="text-xs opacity-90 truncate">
                    {clientName}
                  </div>
                  <div className="text-xs opacity-75 truncate">
                    {timeString} • {duration} min
                  </div>
                  {appointment.paymentStatus === 'paid' && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs bg-white bg-opacity-20 rounded px-1.5 py-0.5 flex items-center gap-1">
                        <DollarSign className="w-2.5 h-2.5" />
                        Paid
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    
    return (
      <div className="text-center p-8 text-gray-500 dark:text-gray-400">
        <p>Week view coming soon...</p>
        <div className="mt-4 flex justify-center space-x-4">
          {weekDays.map((day, index) => (
            <div key={index} className="text-center">
              <div className="text-sm font-medium">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="text-lg">
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthDays = getDaysInMonth(currentDate);
    
    return (
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-600 dark:text-gray-300">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((day, index) => {
            if (!day) {
              return <div key={index} className="h-24"></div>;
            }
            
            const isToday = day.toDateString() === new Date().toDateString();
            
            return (
              <div 
                key={index} 
                className={`h-24 border rounded-lg p-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  isToday ? 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700' : 'bg-white dark:bg-gray-800'
                }`}
                onClick={() => {
                  setCurrentDate(day);
                  setViewMode('day');
                }}
              >
                <div className={`text-sm ${isToday ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (appointmentsLoading || staffLoading || servicesLoading || usersLoading) {
    return (
      <div className="flex">
        <SidebarController />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-4">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      <SidebarController />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <Header />
        
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          {/* Top Controls */}
          <div className="bg-white dark:bg-gray-800 border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Appointments</h1>
                
                <Button
                  onClick={handleAddAppointment}
                  className="bg-pink-600 hover:bg-pink-700 text-white"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Appointment
                </Button>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Date Navigation */}
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateDate('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <span className="text-sm font-medium min-w-48 text-center">
                    {formatDate(currentDate)}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateDate('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* View Mode Toggle */}
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

                {/* Zoom Controls */}
                <div className="flex border rounded-lg overflow-hidden">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={zoomOut}
                    className="h-8 w-8 p-0 rounded-none border-r"
                    disabled={zoomLevel <= 0.5}
                  >
                    <ZoomOut className="h-3 w-3" />
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
                    <SelectValue placeholder="Select staff..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stylists</SelectItem>
                    {staff?.map((staffMember: any) => {
                      const staffName = staffMember.user ? `${staffMember.user.firstName} ${staffMember.user.lastName}` : 'Unknown Staff';
                      return (
                        <SelectItem key={staffMember.id} value={staffName}>
                          {staffName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select service..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All services</SelectItem>
                    {services?.map((service: any) => (
                      <SelectItem key={service.id} value={service.name}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Calendar Views */}
          <div className="p-6">
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
        selectedDate={currentDate}
      />

      {/* Checkout Component */}
      {checkoutAppointment && (
        <AppointmentCheckout
          appointment={checkoutAppointment}
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default AppointmentsPage;