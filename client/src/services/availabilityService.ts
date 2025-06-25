import { format } from "date-fns";

export interface StaffAvailability {
  staffId: number;
  isAvailable: boolean;
  availableSlots: TimeSlot[];
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface Schedule {
  id: number;
  staffId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  location: string;
  serviceCategories: string[];
  startDate: string;
  endDate?: string;
  isBlocked: boolean;
}

export interface Appointment {
  id: number;
  staffId: number;
  startTime: string;
  endTime: string;
  status: string;
}

/**
 * Check if a staff member is available for a given date and time
 */
export function isStaffAvailable(
  staffId: number,
  date: Date,
  startTime: string,
  endTime: string,
  schedules: Schedule[],
  existingAppointments: Appointment[]
): boolean {
  const dayOfWeek = format(date, "EEEE");
  const dateString = format(date, "yyyy-MM-dd");

  // Find staff schedule for the requested day
  const staffSchedule = schedules.find(
    (schedule) =>
      schedule.staffId === staffId &&
      schedule.dayOfWeek === dayOfWeek &&
      !schedule.isBlocked &&
      schedule.startDate <= dateString &&
      (!schedule.endDate || schedule.endDate >= dateString)
  );

  if (!staffSchedule) {
    return false; // No schedule for this day
  }

  // Check if requested time is within scheduled hours
  const requestedStart = timeToMinutes(startTime);
  const requestedEnd = timeToMinutes(endTime);
  const scheduleStart = timeToMinutes(staffSchedule.startTime);
  const scheduleEnd = timeToMinutes(staffSchedule.endTime);

  if (requestedStart < scheduleStart || requestedEnd > scheduleEnd) {
    return false; // Outside scheduled hours
  }

  // Check for conflicts with existing appointments
  const appointmentDate = format(date, "yyyy-MM-dd");
  const conflictingAppointment = existingAppointments.find((appointment) => {
    if (appointment.staffId !== staffId) return false;
    if (appointment.status === "cancelled") return false;

    const appointmentDate = format(new Date(appointment.startTime), "yyyy-MM-dd");
    if (appointmentDate !== dateString) return false;

    const appointmentStart = timeToMinutes(format(new Date(appointment.startTime), "HH:mm"));
    const appointmentEnd = timeToMinutes(format(new Date(appointment.endTime), "HH:mm"));

    // Check for overlap
    return !(requestedEnd <= appointmentStart || requestedStart >= appointmentEnd);
  });

  return !conflictingAppointment;
}

/**
 * Get available staff members for a specific date, time, and service
 */
export function getAvailableStaff(
  date: Date,
  startTime: string,
  endTime: string,
  serviceId: number,
  allStaff: any[],
  schedules: Schedule[],
  appointments: Appointment[],
  staffServices: any[]
): any[] {
  return allStaff.filter((staff) => {
    // Check if staff can perform the requested service
    const canPerformService = staffServices.some(
      (staffService) =>
        staffService.staffId === staff.id && staffService.serviceId === serviceId
    );

    if (!canPerformService) {
      return false;
    }

    // Check availability
    return isStaffAvailable(
      staff.id,
      date,
      startTime,
      endTime,
      schedules,
      appointments
    );
  });
}

/**
 * Get available time slots for a staff member on a given date
 */
export function getAvailableTimeSlots(
  staffId: number,
  date: Date,
  serviceDuration: number,
  schedules: Schedule[],
  appointments: Appointment[]
): TimeSlot[] {
  const dayOfWeek = format(date, "EEEE");
  const dateString = format(date, "yyyy-MM-dd");

  // Find staff schedule for the requested day
  const staffSchedule = schedules.find(
    (schedule) =>
      schedule.staffId === staffId &&
      schedule.dayOfWeek === dayOfWeek &&
      !schedule.isBlocked &&
      schedule.startDate <= dateString &&
      (!schedule.endDate || schedule.endDate >= dateString)
  );

  if (!staffSchedule) {
    return []; // No schedule for this day
  }

  const scheduleStart = timeToMinutes(staffSchedule.startTime);
  const scheduleEnd = timeToMinutes(staffSchedule.endTime);

  // Get existing appointments for this day
  const dayAppointments = appointments
    .filter((appointment) => {
      if (appointment.staffId !== staffId) return false;
      if (appointment.status === "cancelled") return false;
      const appointmentDate = format(new Date(appointment.startTime), "yyyy-MM-dd");
      return appointmentDate === dateString;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const availableSlots: TimeSlot[] = [];
  let currentTime = scheduleStart;

  // Check for slots between appointments
  for (const appointment of dayAppointments) {
    const appointmentStart = timeToMinutes(format(new Date(appointment.startTime), "HH:mm"));
    const appointmentEnd = timeToMinutes(format(new Date(appointment.endTime), "HH:mm"));

    // Add slot before this appointment if there's enough time
    if (currentTime + serviceDuration <= appointmentStart) {
      availableSlots.push({
        start: minutesToTime(currentTime),
        end: minutesToTime(appointmentStart),
      });
    }

    currentTime = Math.max(currentTime, appointmentEnd);
  }

  // Add final slot after all appointments
  if (currentTime + serviceDuration <= scheduleEnd) {
    availableSlots.push({
      start: minutesToTime(currentTime),
      end: minutesToTime(scheduleEnd),
    });
  }

  return availableSlots;
}

/**
 * Generate available appointment times for a given slot and service duration
 */
export function generateAppointmentTimes(
  slot: TimeSlot,
  serviceDuration: number
): string[] {
  const times: string[] = [];
  const startMinutes = timeToMinutes(slot.start);
  const endMinutes = timeToMinutes(slot.end);

  for (let time = startMinutes; time + serviceDuration <= endMinutes; time += 30) {
    times.push(minutesToTime(time));
  }

  return times;
}

/**
 * Convert time string (HH:mm) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:mm)
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Check if a date/time combination is valid for booking
 */
export function validateBookingTime(
  date: Date,
  time: string,
  serviceDuration: number,
  staffId: number,
  schedules: Schedule[],
  appointments: Appointment[]
): { isValid: boolean; reason?: string } {
  const endTime = minutesToTime(timeToMinutes(time) + serviceDuration);
  
  if (!isStaffAvailable(staffId, date, time, endTime, schedules, appointments)) {
    return {
      isValid: false,
      reason: "Staff member is not available at this time"
    };
  }

  return { isValid: true };
}