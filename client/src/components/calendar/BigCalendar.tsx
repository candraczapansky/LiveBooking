import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import React from 'react';

// If using TypeScript and @types/react-big-calendar is not installed, add a module declaration:
// declare module 'react-big-calendar';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

// Appointment type: expects { id, startTime, endTime, clientName, serviceName, staffId, ... }
export interface AppointmentEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resourceId?: number | string;
  resource?: any;
  type?: string;
}

export interface CalendarResource {
  resourceId: number | string;
  resourceTitle: string;
}

interface BigCalendarProps {
  events: AppointmentEvent[];
  resources?: CalendarResource[];
  backgroundEvents?: any[];
  onSelectEvent?: (event: AppointmentEvent) => void;
  onSelectSlot?: (slotInfo: any) => void;
  view?: View;
  date?: Date;
  onView?: (view: View) => void;
  onNavigate?: (date: Date) => void;
}

const BigCalendar: React.FC<BigCalendarProps> = ({ events, resources, backgroundEvents, onSelectEvent, onSelectSlot, view, date, onView, onNavigate }) => {
  return (
    <div style={{ height: 600 }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        views={[Views.DAY, Views.WEEK, Views.MONTH]}
        defaultView={Views.DAY}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        selectable
        style={{ height: '100%' }}
        resources={resources}
        resourceIdAccessor="resourceId"
        resourceTitleAccessor="resourceTitle"
        view={view}
        date={date}
        onView={onView}
        onNavigate={onNavigate}
        backgroundEvents={backgroundEvents}
        eventPropGetter={(event) => {
          // For regular appointments, check payment status first
          const appointmentEvent = event as AppointmentEvent;
          
          // If appointment is paid, make it green
          if (appointmentEvent.resource && (appointmentEvent.resource as any).paymentStatus === 'paid') {
            return {
              style: { 
                backgroundColor: '#22c55e', // Green color for paid appointments
                color: '#ffffff', // White text for contrast
                border: '1px solid #22c55e',
              },
            };
          }
          
          // For unpaid appointments, use the service color if available
          if (appointmentEvent.resource && (appointmentEvent.resource as any).serviceColor) {
            return {
              style: { 
                backgroundColor: (appointmentEvent.resource as any).serviceColor,
                color: '#ffffff', // White text for contrast
                border: `1px solid ${(appointmentEvent.resource as any).serviceColor}`,
              },
            };
          }
          
          return {};
        }}
        backgroundEventPropGetter={(event) => {
          // Handle background events (unavailable times)
          if ((event as any).type === 'unavailable' || (event as any).isBackground) {
            return {
              style: (event as any).style || { backgroundColor: '#e5e7eb', opacity: 0.5 },
              className: 'bg-gray-200',
            };
          }
          return {};
        }}
      />
    </div>
  );
};

export default BigCalendar; 