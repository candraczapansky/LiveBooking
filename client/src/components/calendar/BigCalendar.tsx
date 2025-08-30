import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
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
  onPreSelectResource?: (resourceId: number | string | null) => void;
  onInterceptSlotClick?: (info: { date: Date | null; resourceId: number | string | null }) => boolean | void;
}

const BigCalendar: React.FC<BigCalendarProps> = ({ events, resources, backgroundEvents, onSelectEvent, onSelectSlot, view, date, onView, onNavigate, onPreSelectResource, onInterceptSlotClick }) => {
  // Limit visible time range to reduce internal scrolling and show more calendar content
  const today = new Date();
  // Keep a consistent visible window that matches Central hours. These are wall-clock hours.
  const minTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 6, 0, 0);
  const maxTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 22, 0, 0);

  // Wrapper to capture which resource column is being interacted with before selection completes
  const TimeSlotWrapper: React.FC<any> = (props: any) => {
    const resource = (props && (props.resource || props?.slotMetrics?.resource)) ?? null;
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      try {
        const resourceId = typeof resource === 'object' && resource ? (resource.resourceId ?? resource.id ?? null) : resource;
        const dateValue = props?.value instanceof Date ? props.value : null;
        onPreSelectResource?.(resourceId ?? null);
        const intercepted = onInterceptSlotClick?.({ date: dateValue, resourceId: resourceId ?? null }) ? true : false;
        if (intercepted) {
          e.preventDefault();
          e.stopPropagation();
        }
      } catch {}
    };
    return (
      <div onMouseDown={handleMouseDown}>
        {props.children}
      </div>
    );
  };

  const DateCellWrapper: React.FC<any> = (props: any) => {
    const resource = props?.resource ?? null;
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      try {
        const resourceId = typeof resource === 'object' && resource ? (resource.resourceId ?? resource.id ?? null) : resource;
        const dateValue = props?.value instanceof Date ? props.value : null;
        onPreSelectResource?.(resourceId ?? null);
        const intercepted = onInterceptSlotClick?.({ date: dateValue, resourceId: resourceId ?? null }) ? true : false;
        if (intercepted) {
          e.preventDefault();
          e.stopPropagation();
        }
      } catch {}
    };
    return (
      <div onMouseDown={handleMouseDown}>
        {props.children}
      </div>
    );
  };

  // Ensure clicks on events (especially blocked) do not bubble into slot-selection
  const EventWrapper: React.FC<any> = (props: any) => {
    const ev = props?.event;
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      try {
        if (ev && (ev as any).type === 'blocked') {
          e.preventDefault();
          e.stopPropagation();
          onSelectEvent?.(ev);
          return;
        }
      } catch {}
    };
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      try {
        if (ev && (ev as any).type === 'blocked') {
          e.preventDefault();
          e.stopPropagation();
          onSelectEvent?.(ev);
          return;
        }
      } catch {}
    };
    return (
      <div onMouseDown={handleMouseDown} onClick={handleClick}>
        {props.children}
      </div>
    );
  };

  return (
    <div style={{ height: '100%' }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        views={[Views.DAY, Views.WEEK, Views.MONTH]}
        defaultView={Views.DAY}
        onSelectEvent={onSelectEvent}
        onSelectSlot={(slotInfo: any) => {
          try {
            const intercepted = onInterceptSlotClick?.({
              date: slotInfo?.start ?? null,
              resourceId: (slotInfo as any)?.resourceId ?? null,
            }) ? true : false;
            if (intercepted) {
              return;
            }
          } catch {}
          onSelectSlot?.(slotInfo);
        }}
        selectable
        style={{ height: 'auto' }}
        min={minTime}
        max={maxTime}
        step={15}
        timeslots={4}
        scrollToTime={minTime}
        dayLayoutAlgorithm={'no-overlap'}
        resources={resources}
        resourceIdAccessor="resourceId"
        resourceTitleAccessor="resourceTitle"
        view={view}
        date={date}
        onView={onView}
        onNavigate={onNavigate}
        backgroundEvents={backgroundEvents}
        components={{
          timeSlotWrapper: TimeSlotWrapper as any,
          dateCellWrapper: DateCellWrapper as any,
          eventWrapper: EventWrapper as any,
        }}
        eventPropGetter={(event) => {
          // Handle blocked schedule events distinctly
          if ((event as any).type === 'blocked') {
            return {
              style: {
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: '1px solid #3b82f6',
                opacity: 0.85,
              },
            };
          }
          // For regular appointments, check payment status first
          const appointmentEvent = event as AppointmentEvent;
          const durationMinutes = (appointmentEvent.end.getTime() - appointmentEvent.start.getTime()) / 60000;
          const isFifteenMinute = durationMinutes > 0 && durationMinutes <= 16; // treat <=16m as 15m block visually

          // Base style accumulator
          const style: React.CSSProperties = {};
          
          // If appointment is paid, make it green
          if (appointmentEvent.resource && (appointmentEvent.resource as any).paymentStatus === 'paid') {
            style.backgroundColor = '#22c55e';
            style.color = '#ffffff';
            style.border = '1px solid #22c55e';
          }
          
          // For unpaid appointments, use the service color if available
          if (appointmentEvent.resource && (appointmentEvent.resource as any).serviceColor) {
            style.backgroundColor = (appointmentEvent.resource as any).serviceColor;
            style.color = '#ffffff';
            style.border = `1px solid ${(appointmentEvent.resource as any).serviceColor}`;
          }

          // Visual hack: shrink 15-minute events beginning at :15 or :45
          if (isFifteenMinute) {
            style.transform = 'scaleY(0.5)';
            style.transformOrigin = 'top left';
            style.paddingTop = '0px';
            style.paddingBottom = '0px';
            style.lineHeight = '1';
          }
          
          return { style };
        }}
        backgroundEventPropGetter={(event) => {
          // Handle background events (unavailable times)
          if ((event as any).type === 'unavailable' || (event as any).isBackground) {
            return {
              style: {
                pointerEvents: 'none',
                ...( (event as any).style || { backgroundColor: '#e5e7eb', opacity: 0.5 } )
              },
              className: 'bg-gray-200',
            };
          }
          return {};
        }}
        onDrillDown={(date: Date, viewName: any) => {
          try {
            const intercepted = onInterceptSlotClick?.({ date, resourceId: null }) ? true : false;
            if (!intercepted) return;
          } catch {}
        }}
      />
    </div>
  );
};

export default BigCalendar; 