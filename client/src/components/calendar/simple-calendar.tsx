import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

interface SimpleCalendarProps {
  appointments: any[];
  staff: any[];
  users: any[];
  services: any[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onAppointmentClick: (appointmentId: number) => void;
  onAddAppointment: (time?: string) => void;
}

// Generate time slots from 8 AM to 10 PM in 15-minute intervals
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === 22 && minute > 0) break; // Stop at 10:00 PM
      
      const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayTime = `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
      
      slots.push({ time24, displayTime });
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

export default function SimpleCalendar({
  appointments,
  staff,
  users,
  services,
  currentDate,
  onDateChange,
  onAppointmentClick,
  onAddAppointment
}: SimpleCalendarProps) {
  
  // Filter appointments for current date
  const dayAppointments = useMemo(() => {
    if (!appointments) return [];
    
    const currentDateStr = currentDate.toISOString().split('T')[0];
    
    return appointments.filter((appointment: any) => {
      const appointmentDate = new Date(appointment.startTime);
      const appointmentDateStr = appointmentDate.toISOString().split('T')[0];
      return appointmentDateStr === currentDateStr;
    });
  }, [appointments, currentDate]);

  // Get appointment for specific staff and time slot
  const getAppointmentForSlot = (staffId: number, slotTime: string) => {
    return dayAppointments.find((appointment: any) => {
      if (appointment.staffId !== staffId) return false;
      
      const appointmentDate = new Date(appointment.startTime);
      const appointmentTime = appointmentDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      return appointmentTime === slotTime;
    });
  };

  // Calculate appointment height based on duration
  const getAppointmentHeight = (appointment: any) => {
    const service = services?.find((s: any) => s.id === appointment.serviceId);
    const duration = service?.duration || 60;
    const slots = Math.ceil(duration / 15);
    return slots * 40 - 4; // 40px per slot minus border spacing
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    onDateChange(newDate);
  };

  if (!staff || staff.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No staff members found. Please add staff members first.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            {currentDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h2>
          <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => onAddAppointment()}>
          <Plus className="h-4 w-4 mr-2" />
          New Appointment
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Column Headers */}
          <div className="flex border-b bg-gray-50 dark:bg-gray-800">
            <div className="w-20 p-3 text-sm font-medium text-gray-600 dark:text-gray-300 border-r">
              Time
            </div>
            {staff.map((staffMember: any) => {
              const staffName = staffMember.user 
                ? `${staffMember.user.firstName} ${staffMember.user.lastName}` 
                : 'Unknown Staff';
              return (
                <div 
                  key={staffMember.id}
                  className="w-64 p-3 text-sm font-medium text-gray-900 dark:text-gray-100 border-r"
                >
                  {staffName}
                </div>
              );
            })}
          </div>

          {/* Time Slots */}
          <div className="relative">
            {timeSlots.map((slot, index) => (
              <div key={slot.time24} className="flex border-b" style={{ height: '40px' }}>
                {/* Time Label */}
                <div className="w-20 p-2 text-xs text-gray-500 dark:text-gray-400 border-r bg-gray-50 dark:bg-gray-800 flex items-center">
                  {slot.displayTime}
                </div>

                {/* Staff Columns */}
                {staff.map((staffMember: any, staffIndex: number) => {
                  const appointment = getAppointmentForSlot(staffMember.id, slot.displayTime);
                  
                  return (
                    <div 
                      key={staffMember.id}
                      className="w-64 border-r relative hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => !appointment && onAddAppointment(slot.displayTime)}
                    >
                      {appointment && (
                        <div
                          className="absolute inset-x-1 bg-primary/10 border-l-4 border-primary rounded-r p-2 shadow-sm cursor-pointer hover:shadow-md transition-shadow z-10"
                          style={{ 
                            height: `${getAppointmentHeight(appointment)}px`,
                            borderLeftColor: services?.find((s: any) => s.id === appointment.serviceId)?.color || 'var(--primary)'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(appointment.id);
                          }}
                        >
                          <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                            {services?.find((s: any) => s.id === appointment.serviceId)?.name || 'Service'}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {users?.find((u: any) => u.id === appointment.clientId)?.firstName} {users?.find((u: any) => u.id === appointment.clientId)?.lastName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            {appointment.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
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
      </div>
    </div>
  );
}