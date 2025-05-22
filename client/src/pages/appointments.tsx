import { useState } from "react";
import { SidebarController } from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { apiRequest } from "@/lib/queryClient";
import AppointmentCalendar from "@/components/appointments/appointment-calendar";
import AppointmentForm from "@/components/appointments/appointment-form";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const AppointmentsPage = () => {
  useDocumentTitle("Appointments | BeautyBook");
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isFormOpen, setIsFormOpen] = useState(location.includes("new=true"));
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Get URL params
  const searchParams = new URLSearchParams(location.split("?")[1]);
  
  // Check if we should open the form for creating a new appointment
  useState(() => {
    if (searchParams.get("new") === "true") {
      setIsFormOpen(true);
      // Clean up the URL
      setLocation("/appointments", { replace: true });
    }
  });

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['/api/appointments', selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      const date = selectedDate.toISOString().split('T')[0];
      const response = await fetch(`/api/appointments?date=${date}`);
      if (!response.ok) throw new Error('Failed to fetch appointments');
      return response.json();
    }
  });

  const handleNewAppointment = () => {
    setSelectedAppointmentId(null);
    setIsFormOpen(true);
  };

  const handleEditAppointment = (appointmentId: number) => {
    setSelectedAppointmentId(appointmentId);
    setIsFormOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <SidebarController />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Appointments</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Manage salon appointments and bookings
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <Button onClick={handleNewAppointment}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Appointment
                </Button>
              </div>
            </div>
            
            {/* Appointment Calendar */}
            <AppointmentCalendar 
              appointments={appointments || []}
              isLoading={isLoading}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onAppointmentClick={handleEditAppointment}
            />
          </div>
        </main>
      </div>
      
      {/* Appointment Form */}
      <AppointmentForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        appointmentId={selectedAppointmentId}
        selectedDate={selectedDate}
      />
    </div>
  );
};

export default AppointmentsPage;
