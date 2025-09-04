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
  // Optional color customization
  blockedColor?: string;
  unavailableColor?: string;
  availableColor?: string;
  // New: optional right-click handler for events
  onEventContextMenu?: (event: AppointmentEvent, position: { x: number; y: number }) => void;
  // New: appointment status colors
  confirmedColor?: string;
  arrivedColor?: string;
}

const BigCalendar: React.FC<BigCalendarProps> = ({ events, resources, backgroundEvents, onSelectEvent, onSelectSlot, view, date, onView, onNavigate, onPreSelectResource, onInterceptSlotClick, blockedColor, unavailableColor, availableColor, onEventContextMenu, confirmedColor, arrivedColor }) => {
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
    const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
      try {
        if (!ev) return;
        // Only surface context menu for appointment events; leave others alone
        if ((ev as any).type === 'appointment' && onEventContextMenu) {
          e.preventDefault();
          e.stopPropagation();
          onEventContextMenu(ev as AppointmentEvent, { x: e.clientX, y: e.clientY });
          return;
        }
      } catch {}
    };
    return (
      <div onMouseDown={handleMouseDown} onClick={handleClick} onContextMenu={handleContextMenu}>
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
                // Use provided blocked color or fallback to unavailability gray
                backgroundColor: blockedColor || '#e5e7eb',
                color: '#111827',
                border: `1px solid ${blockedColor || '#d1d5db'}`,
                opacity: 0.9,
                // Keep blocked events clickable and above masks
                zIndex: 5,
                pointerEvents: 'auto',
                cursor: 'pointer',
              },
            };
          }
          // Render available/unavailable background strips even if passed via regular events
          if ((event as any).type === 'available') {
            return {
              style: {
                backgroundColor: availableColor || '#dbeafe',
                border: 'none',
                opacity: 1,
                zIndex: 1,
                pointerEvents: 'none',
              },
            };
          }
          if ((event as any).type === 'unavailable') {
            return {
              style: {
                backgroundColor: unavailableColor || '#e5e7eb',
                border: 'none',
                opacity: ((event as any).style?.opacity ?? 0.5),
                zIndex: 1,
                pointerEvents: 'none',
              },
            };
          }
          // For regular appointments, ensure they render above background strips and remain clickable
          const appointmentEvent = event as AppointmentEvent;
          const durationMinutes = (appointmentEvent.end.getTime() - appointmentEvent.start.getTime()) / 60000;
          const isFifteenMinute = durationMinutes > 0 && durationMinutes <= 16; // treat <=16m as 15m block visually

          // Base style accumulator
          const style: React.CSSProperties = { zIndex: 10, pointerEvents: 'auto' };

          // Determine appointment color: always use the appointment's original service color
          const eventResource: any = appointmentEvent.resource;
          const serviceColor: string | undefined = eventResource && eventResource.serviceColor ? String(eventResource.serviceColor) : undefined;
          if (serviceColor) {
            style.backgroundColor = serviceColor;
            style.color = '#ffffff';
            style.border = `1px solid ${serviceColor}`;
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
          if ((event as any).type === 'unavailable' || (event as any).type === 'available') {
            return {
              style: {
                pointerEvents: 'none',
                zIndex: 1,
                ...( (event as any).style || { backgroundColor: ((event as any).type === 'unavailable' ? (unavailableColor || '#e5e7eb') : '#dbeafe'), opacity: 0.5 } )
              },
              // Do not force a Tailwind class so custom colors can apply
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