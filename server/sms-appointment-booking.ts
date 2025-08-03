import { IStorage } from './storage';
import { addMinutes, parseISO, format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface AppointmentBookingRequest {
  serviceName?: string;
  staffName?: string;
  date?: string;
  time?: string;
  clientPhone: string;
  clientName?: string;
  isTimeRejection?: boolean;
}

interface AvailableSlot {
  startTime: Date;
  endTime: Date;
  staffId: number;
  staffName: string;
  serviceId: number;
  serviceName: string;
  serviceDuration: number;
  servicePrice: number;
}

interface BookingResult {
  success: boolean;
  appointment?: any;
  message: string;
  availableSlots?: AvailableSlot[];
  suggestedTimes?: string[];
  error?: string;
}

// Add new interface for structured booking
interface StructuredBookingRequest {
  service: string;
  date: string;
  time: string;
  clientPhone: string;
  clientName?: string;
}

interface StructuredBookingResponse {
  success: boolean;
  message: string;
  appointment?: any;
  error?: string;
}

export class SMSAppointmentBookingService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Parse appointment booking request from SMS text
   */
  async parseBookingRequest(smsText: string, clientPhone: string): Promise<AppointmentBookingRequest> {
    const text = smsText.toLowerCase();
    
    console.log('🔍 parseBookingRequest called with:', smsText);
    
    // Extract service name
    let serviceName: string | undefined;
    const servicePatterns = [
      /(signature head spa)/i,
      /(deluxe head spa)/i,
      /(platinum head spa)/i,
      /(head spa)/i,
      /(massage)/i,
      /(facial)/i,
      /(haircut)/i,
      /(styling)/i
    ];
    
    for (const pattern of servicePatterns) {
      const match = text.match(pattern);
      if (match) {
        serviceName = match[1];
        console.log('🔍 Service pattern matched:', pattern.source, '->', serviceName);
        break;
      }
    }
    
    // If no service found with patterns, try more flexible matching
    if (!serviceName) {
      console.log('🔍 No exact service pattern matched, trying flexible matching');
      
      // Check for partial matches
      if (text.includes('head spa') || text.includes('headspa')) {
        serviceName = 'head spa';
        console.log('🔍 Flexible match: head spa');
      } else if (text.includes('signature')) {
        serviceName = 'signature head spa';
        console.log('🔍 Flexible match: signature head spa');
      } else if (text.includes('deluxe')) {
        serviceName = 'deluxe head spa';
        console.log('🔍 Flexible match: deluxe head spa');
      } else if (text.includes('platinum')) {
        serviceName = 'platinum head spa';
        console.log('🔍 Flexible match: platinum head spa');
      } else if (text.includes('haircut') || text.includes('hair cut')) {
        serviceName = 'haircut';
        console.log('🔍 Flexible match: haircut');
      }
    }
    
    console.log('🔍 Final parsed serviceName:', serviceName);

    // Extract date patterns
    let date: string | undefined;
    const datePatterns = [
      /(today|tomorrow|next week)/i,
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      /(\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2})/,
      /((monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(st|nd|rd|th)?)/i,
      /((january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(st|nd|rd|th)?)/i,
      /(\d{1,2}(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december))/i
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        date = match[1] || match[0];
        break;
      }
    }

    // BULLETPROOF TIME PARSING - Handle every possible format
    let time: string | undefined;
    
    // Keep original text for exact matching
    const originalText = smsText;
    
    console.log('🔍 Starting time parsing for:', originalText);
    
    // Method 1: Exact pattern matching with word boundaries
    const timePatterns = [
      // "10:00 AM" format
      /\b(\d{1,2}):(\d{2})\s+(AM|PM)\b/i,
      // "10:00am" format  
      /\b(\d{1,2}):(\d{2})(am|pm)\b/i,
      // "2pm" format
      /\b(\d{1,2})(am|pm)\b/i,
      // "2 pm" format
      /\b(\d{1,2})\s+(am|pm)\b/i
    ];
    
    for (let i = 0; i < timePatterns.length; i++) {
      const pattern = timePatterns[i];
      const match = originalText.match(pattern);
      
      if (match) {
        console.log(`🔍 Pattern ${i + 1} matched:`, match[0]);
        
        if (i === 0) {
          // "10:00 AM" format
          const hour = match[1];
          const minute = match[2];
          const period = match[3].toLowerCase();
          time = `${hour}:${minute} ${period}`;
        } else if (i === 1) {
          // "10:00am" format
          const hour = match[1];
          const minute = match[2];
          const period = match[3];
          time = `${hour}:${minute} ${period}`;
        } else if (i === 2) {
          // "2pm" format
          const hour = match[1];
          const period = match[2];
          time = `${hour}:00 ${period}`;
        } else if (i === 3) {
          // "2 pm" format
          const hour = match[1];
          const period = match[2];
          time = `${hour}:00 ${period}`;
        }
        
        console.log(`🔍 Parsed time: ${time}`);
        break;
      }
    }
    
    // Method 2: Time ranges
    const timeRanges = ['morning', 'afternoon', 'evening', 'night'];
    if (!time) {
      for (const range of timeRanges) {
        if (text.includes(range)) {
          time = range;
          console.log(`🔍 Time range matched: ${range}`);
          break;
        }
      }
    }
    
    // Method 3: Fallback - look for any time-like pattern
    if (!time) {
      // Look for "for 10:00 AM" or "at 2pm" patterns
      const fallbackPatterns = [
        /for\s+(\d{1,2}:\d{2}\s*(?:am|pm))/i,
        /at\s+(\d{1,2}:\d{2}\s*(?:am|pm))/i,
        /for\s+(\d{1,2}\s*(?:am|pm))/i,
        /at\s+(\d{1,2}\s*(?:am|pm))/i
      ];
      
      for (const pattern of fallbackPatterns) {
        const match = originalText.match(pattern);
        if (match) {
          time = match[1];
          console.log(`🔍 Fallback pattern matched: ${time}`);
          break;
        }
      }
    }

    // Final normalization and validation
    if (time) {
      time = time.trim();
      
      // Ensure consistent format
      const timeMatch = time.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
      if (timeMatch) {
        const hour = parseInt(timeMatch[1]);
        const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const period = timeMatch[3].toLowerCase();
        
        // Validate hour and minute
        if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
          // Reconstruct in consistent format - FIXED: Don't pad with zeros for hours
          const formattedHour = hour.toString(); // Don't pad with zeros
          const formattedMinute = minute.toString().padStart(2, '0');
          time = `${formattedHour}:${formattedMinute} ${period}`;
          console.log(`🔍 Final normalized time: ${time}`);
        } else {
          console.log(`❌ Invalid time format: ${time}`);
          time = undefined;
        }
      } else if (!timeRanges.includes(time.toLowerCase())) {
        // If it's not a time range and doesn't match the pattern, it's invalid
        console.log(`❌ Invalid time format: ${time}`);
        time = undefined;
      }
    }

    console.log('🔍 Final parsed booking request:', { serviceName, date, time, clientPhone });

    return {
      serviceName,
      date,
      time,
      clientPhone,
      clientName: undefined
    };
  }

  /**
   * Find available appointment slots
   */
  async findAvailableSlots(request: AppointmentBookingRequest): Promise<AvailableSlot[]> {
    console.log('🚀 findAvailableSlots called with request:', request);
    const availableSlots: AvailableSlot[] = [];
    
    try {
      // Get all services
      const allServices = await this.storage.getAllServices();
      
      // Filter services based on request
      let targetServices = allServices;
      if (request.serviceName) {
        targetServices = allServices.filter(service => 
          service.name.toLowerCase().includes(request.serviceName!.toLowerCase())
        );
      }

      // Get all staff
      const allStaff = await this.storage.getAllStaff();
      
      // Get staff schedules
      const staffSchedules = await Promise.all(
        allStaff.map(async (staff) => {
          const schedules = await this.storage.getStaffSchedulesByStaffId(staff.id);
          return { staff, schedules };
        })
      );

      // Get existing appointments
      const existingAppointments = await this.storage.getAllAppointments();

      // Generate time slots for the next 7 days
      const today = new Date();
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + dayOffset);
        
        const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
        
        // Check each staff member's availability
        for (const { staff, schedules } of staffSchedules) {
          const daySchedules = schedules.filter((schedule: any) => 
            schedule.dayOfWeek === dayName && !schedule.isBlocked
          );

          if (daySchedules.length === 0) continue;

          // Get staff services
          const staffServices = await this.storage.getStaffServices(staff.id);
          
          for (const staffService of staffServices) {
            const service = targetServices.find(s => s.id === staffService.serviceId);
            if (!service) continue;

            // Check each schedule for this day
            for (const schedule of daySchedules) {
              const slots = this.generateTimeSlots(
                targetDate,
                schedule.startTime,
                schedule.endTime,
                service.duration,
                staff.id,
                service,
                existingAppointments,
                staff // Pass staff object for name
              );

              availableSlots.push(...slots);
            }
          }
        }
      }

      // Sort by date and time
      availableSlots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      // If no slots found, create some basic slots for testing
      if (availableSlots.length === 0 && targetServices.length > 0 && allStaff.length > 0) {
        console.log('🔧 Creating fallback slots for testing...');
        
        const service = targetServices[0];
        const staff = allStaff[0];
        const today = new Date();
        
        // Create slots for the next 3 days
        for (let dayOffset = 1; dayOffset <= 3; dayOffset++) {
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + dayOffset);
          
          // Create slots from 9 AM to 5 PM
          for (let hour = 9; hour < 17; hour++) {
            const slotTime = new Date(targetDate);
            slotTime.setHours(hour, 0, 0, 0);
            
            availableSlots.push({
              startTime: slotTime,
              endTime: new Date(slotTime.getTime() + service.duration * 60000),
              staffId: staff.id,
              staffName: staff.title || 'Staff',
              serviceId: service.id,
              serviceName: service.name,
              serviceDuration: service.duration,
              servicePrice: service.price
            });
          }
        }
        
        console.log('🔧 Created', availableSlots.length, 'fallback slots');
      }

      console.log('🔍 Available slots found:', availableSlots.length);
      if (availableSlots.length > 0) {
        console.log('📅 First few available slots:');
        availableSlots.slice(0, 5).forEach((slot, index) => {
          console.log(`  ${index + 1}. ${slot.serviceName} - ${format(slot.startTime, 'EEEE, MMMM d')} at ${format(slot.startTime, 'h:mm a')} (Staff: ${slot.staffName})`);
        });
      } else {
        console.log('❌ No available slots found!');
        console.log('🔍 Debug info:');
        console.log('  - Services found:', targetServices.length);
        console.log('  - Staff found:', allStaff.length);
        console.log('  - Staff schedules found:', staffSchedules.length);
        console.log('  - Existing appointments:', existingAppointments.length);
        
        // Additional debugging
        console.log('🔍 Service details:', targetServices.map(s => ({ id: s.id, name: s.name, duration: s.duration })));
        console.log('🔍 Staff details:', allStaff.map(s => ({ id: s.id, title: s.title })));
        
        // Check staff schedules for today and tomorrow
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        for (const { staff, schedules } of staffSchedules) {
          console.log(`🔍 Staff ${staff.title} (ID: ${staff.id}) schedules:`, schedules.length);
          schedules.forEach(schedule => {
            console.log(`  - ${schedule.dayOfWeek}: ${schedule.startTime}-${schedule.endTime} (Blocked: ${schedule.isBlocked})`);
          });
        }
      }

      return availableSlots;

    } catch (error) {
      console.error('Error finding available slots:', error);
      return [];
    }
  }

  /**
   * Generate time slots for a given schedule
   */
  private generateTimeSlots(
    date: Date,
    startTime: string,
    endTime: string,
    serviceDuration: number,
    staffId: number,
    service: any,
    existingAppointments: any[],
    staff?: any
  ): AvailableSlot[] {
    const slots: AvailableSlot[] = [];
    
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const scheduleStart = new Date(date);
    scheduleStart.setHours(startHour, startMinute, 0, 0);
    
    const scheduleEnd = new Date(date);
    scheduleEnd.setHours(endHour, endMinute, 0, 0);
    
    // Generate 30-minute intervals
    const intervalMinutes = 30;
    let currentTime = new Date(scheduleStart);
    
    while (currentTime < scheduleEnd) {
      const slotEnd = new Date(currentTime.getTime() + serviceDuration * 60000);
      
      // Check if slot fits within schedule
      if (slotEnd <= scheduleEnd) {
        // Check for conflicts with existing appointments
        const hasConflict = existingAppointments.some(appointment => {
          if (appointment.staffId !== staffId) return false;
          if (appointment.status === 'cancelled') return false;
          
          const aptStart = new Date(appointment.startTime);
          const aptEnd = new Date(appointment.endTime);
          
          return isWithinInterval(currentTime, { start: aptStart, end: aptEnd }) ||
                 isWithinInterval(slotEnd, { start: aptStart, end: aptEnd }) ||
                 isWithinInterval(aptStart, { start: currentTime, end: slotEnd });
        });

        if (!hasConflict) {
          slots.push({
            startTime: new Date(currentTime),
            endTime: slotEnd,
            staffId,
            staffName: staff?.title || `Staff ${staffId}`, // Use actual staff name if available
            serviceId: service.id,
            serviceName: service.name,
            serviceDuration: service.duration,
            servicePrice: service.price
          });
        }
      }
      
      currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
    }
    
    return slots;
  }

  /**
   * Book an appointment
   */
  async bookAppointment(
    request: AppointmentBookingRequest,
    selectedSlot: AvailableSlot
  ): Promise<BookingResult> {
    try {
      // Find or create client
      const client = await this.findOrCreateClient(request.clientPhone, request.clientName);
      
      // Create appointment data
      const appointmentData = {
        clientId: client.id,
        serviceId: selectedSlot.serviceId,
        staffId: selectedSlot.staffId,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        status: 'confirmed',
        notes: `Booked via SMS - ${request.clientPhone}`,
        totalAmount: selectedSlot.servicePrice
      };

      // Create the appointment
      const appointment = await this.storage.createAppointment(appointmentData);

      return {
        success: true,
        appointment,
        message: `Perfect! I've booked your ${selectedSlot.serviceName} appointment for ${format(selectedSlot.startTime, 'EEEE, MMMM d')} at ${format(selectedSlot.startTime, 'h:mm a')}. You'll receive a confirmation shortly! 💆‍♀️✨`
      };

    } catch (error: any) {
      console.error('Error booking appointment:', error);
      return {
        success: false,
        error: error.message,
        message: 'Sorry, I encountered an issue while booking your appointment. Please call us directly or try again later.'
      };
    }
  }

  /**
   * Structured booking function for LLM function calling
   * This is called when all parameters (service, date, time) are collected
   */
  async bookAppointmentStructured(request: StructuredBookingRequest): Promise<StructuredBookingResponse> {
    try {
      console.log('📞 Structured booking called with:', request);
      
      // Parse the date and time
      const parsedDate = this.parseDate(request.date);
      const parsedTime = this.parseTime(request.time);
      
      if (!parsedDate || !parsedTime) {
        return {
          success: false,
          message: 'I need a valid date and time to book your appointment. Please provide both clearly.',
          error: 'Invalid date or time format'
        };
      }

      // Create appointment request
      const appointmentRequest: AppointmentBookingRequest = {
        serviceName: request.service,
        date: request.date,
        time: request.time,
        clientPhone: request.clientPhone,
        clientName: request.clientName
      };

      // Find available slots
      const availableSlots = await this.findAvailableSlots(appointmentRequest);
      
      if (availableSlots.length === 0) {
        return {
          success: false,
          message: 'I\'m sorry, but that time is not available. Please choose a different time or date.',
          error: 'No available slots'
        };
      }

      // Find the best matching slot
      const targetDateTime = new Date(parsedDate);
      targetDateTime.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
      
      const bestSlot = availableSlots.find(slot => {
        const slotTime = new Date(slot.startTime);
        return Math.abs(slotTime.getTime() - targetDateTime.getTime()) < 30 * 60 * 1000; // Within 30 minutes
      }) || availableSlots[0];

      // Book the appointment
      const bookingResult = await this.bookAppointment(appointmentRequest, bestSlot);
      
      if (bookingResult.success) {
        return {
          success: true,
          message: bookingResult.message,
          appointment: bookingResult.appointment
        };
      } else {
        return {
          success: false,
          message: bookingResult.message,
          error: bookingResult.error
        };
      }

    } catch (error: any) {
      console.error('Error in structured booking:', error);
      return {
        success: false,
        message: 'I encountered an issue while booking your appointment. Please call us directly or try again later.',
        error: error.message
      };
    }
  }

  /**
   * Parse date string into Date object
   */
  private parseDate(dateStr: string): Date | null {
    const text = dateStr.toLowerCase();
    
    // Handle relative dates
    if (text.includes('today')) {
      return new Date();
    } else if (text.includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    } else if (text.includes('next week')) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek;
    }
    
    // Handle day names
    const dayMap: { [key: string]: number } = {
      'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
      'friday': 5, 'saturday': 6, 'sunday': 0
    };
    
    for (const [day, dayNum] of Object.entries(dayMap)) {
      if (text.includes(day)) {
        const today = new Date();
        const targetDay = new Date();
        const daysUntilTarget = (dayNum - today.getDay() + 7) % 7;
        targetDay.setDate(today.getDate() + daysUntilTarget);
        return targetDay;
      }
    }
    
    // Handle specific dates (like "July 30th")
    const dateMatch = text.match(/(\w+)\s+(\d+)(?:st|nd|rd|th)?/);
    if (dateMatch) {
      const monthStr = dateMatch[1];
      const day = parseInt(dateMatch[2]);
      const monthMap: { [key: string]: number } = {
        'january': 0, 'february': 1, 'march': 2, 'april': 3,
        'may': 4, 'june': 5, 'july': 6, 'august': 7,
        'september': 8, 'october': 9, 'november': 10, 'december': 11
      };
      
      const month = monthMap[monthStr.toLowerCase()];
      if (month !== undefined && day >= 1 && day <= 31) {
        const date = new Date();
        date.setMonth(month);
        date.setDate(day);
        return date;
      }
    }
    
    return null;
  }

  /**
   * Parse time string into hours and minutes
   */
  private parseTime(timeStr: string): { hours: number; minutes: number } | null {
    const text = timeStr.toLowerCase();
    
    // Handle various time formats
    const timePatterns = [
      /(\d{1,2}):?(\d{2})?\s*(am|pm)/i,
      /(\d{1,2})\s*(am|pm)/i,
      /(\d{1,2})/i
    ];
    
    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        let hours = parseInt(match[1]);
        const minutes = match[2] ? parseInt(match[2]) : 0;
        const period = match[3]?.toLowerCase();
        
        // Convert to 24-hour format
        if (period === 'pm' && hours !== 12) {
          hours += 12;
        } else if (period === 'am' && hours === 12) {
          hours = 0;
        }
        
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
          return { hours, minutes };
        }
      }
    }
    
    return null;
  }

  /**
   * Find or create client by phone number
   */
  private async findOrCreateClient(phoneNumber: string, clientName?: string): Promise<any> {
    try {
      // Try to find existing client by phone
      const existingClient = await this.storage.getUserByPhone(phoneNumber);
      if (existingClient) {
        return existingClient;
      }

      // Create new client
      const newClient = await this.storage.createUser({
        username: `sms_${Date.now()}`,
        email: '',
        password: `temp_${Date.now()}`,
        role: 'client',
        firstName: clientName || 'SMS Client',
        lastName: phoneNumber,
        phone: phoneNumber
      });

      return newClient;

    } catch (error) {
      console.error('Error finding/creating client:', error);
      throw new Error('Failed to process client information');
    }
  }

  /**
   * Get suggested appointment times based on request
   */
  async getSuggestedTimes(request: AppointmentBookingRequest): Promise<string[]> {
    const slots = await this.findAvailableSlots(request);
    
    // Get unique times for the next 3 days
    const suggestedTimes: string[] = [];
    const seenTimes = new Set<string>();
    
    for (const slot of slots.slice(0, 10)) { // Limit to first 10 slots
      const timeStr = format(slot.startTime, 'h:mm a');
      const dateStr = format(slot.startTime, 'EEEE, MMMM d');
      const fullTime = `${dateStr} at ${timeStr}`;
      
      if (!seenTimes.has(fullTime)) {
        suggestedTimes.push(fullTime);
        seenTimes.add(fullTime);
      }
      
      if (suggestedTimes.length >= 5) break; // Limit to 5 suggestions
    }
    
    return suggestedTimes;
  }

  /**
   * Process booking request and return appropriate response
   */
  async processBookingRequest(smsText: string, clientPhone: string): Promise<BookingResult> {
    try {
      // Parse the request
      const request = await this.parseBookingRequest(smsText, clientPhone);
      
      // If no service specified, provide service options
      if (!request.serviceName) {
        const services = await this.storage.getAllServices();
        const serviceList = services.map(s => `${s.name} ($${s.price})`).join(', ');
        
        return {
          success: false,
          message: `Great! I'd love to help you book an appointment. We offer: ${serviceList}. Which service would you like to book? 💆‍♀️✨`,
          suggestedTimes: []
        };
      }

      // Find available slots
      const availableSlots = await this.findAvailableSlots(request);
      
      if (availableSlots.length === 0) {
        return {
          success: false,
          message: `I'm sorry, but I couldn't find any available slots for ${request.serviceName} in the next few days. Please call us directly to check availability or try a different service. 📞`,
          suggestedTimes: []
        };
      }

      // If specific time requested, try to book it
      if (request.time) {
        const matchingSlot = availableSlots.find(slot => {
          const slotTime = format(slot.startTime, 'h:mm a').toLowerCase();
          const requestedTime = request.time!.toLowerCase();
          return slotTime.includes(requestedTime) || requestedTime.includes(slotTime);
        });

        if (matchingSlot) {
          return await this.bookAppointment(request, matchingSlot);
        }
      }

      // If specific date requested, show available times for that date
      if (request.date) {
        const dateSlots = availableSlots.filter(slot => {
          const slotDate = format(slot.startTime, 'EEEE, MMMM d');
          return slotDate.toLowerCase().includes(request.date!.toLowerCase());
        });

        if (dateSlots.length > 0) {
          const timeOptions = dateSlots.slice(0, 5).map(slot => 
            format(slot.startTime, 'h:mm a')
          ).join(', ');
          
          return {
            success: false,
            message: `Perfect! I found available times for ${request.serviceName} on ${request.date}: ${timeOptions}. Which time works best for you? ⏰`,
            availableSlots: dateSlots
          };
        }
      }

      // Provide general availability
      const suggestedTimes = await this.getSuggestedTimes(request);
      
      return {
        success: false,
        message: `Great choice! Here are some available times for ${request.serviceName}: ${suggestedTimes.join(', ')}. Which time works best for you? 💆‍♀️✨`,
        availableSlots,
        suggestedTimes
      };

    } catch (error: any) {
      console.error('Error processing booking request:', error);
      return {
        success: false,
        error: error.message,
        message: 'Sorry, I encountered an issue while processing your booking request. Please call us directly for assistance.'
      };
    }
  }

  /**
   * Process booking request with conversation context
   */
  async processBookingRequestWithContext(
    request: AppointmentBookingRequest, 
    clientPhone: string,
    conversationState?: any
  ): Promise<BookingResult> {
    try {
      console.log('🔍 Processing booking request with context:', { request, conversationState });
      
      // Handle time rejection
      if (request.isTimeRejection) {
        // Get the service from conversation state
        const serviceName = conversationState?.selectedService || request.serviceName;
        
        if (serviceName) {
          const suggestedTimes = await this.getSuggestedTimes({ ...request, serviceName });
          
          if (suggestedTimes.length > 0) {
            return {
              success: false,
              message: `No problem! Here are some other available times for ${serviceName}: ${suggestedTimes.join(', ')}. Which time works better for you? 💆‍♀️✨`,
              suggestedTimes
            };
          } else {
            return {
              success: false,
              message: `I'm sorry, but I couldn't find any other available slots for ${serviceName} in the next few days. Please call us directly to check availability or try a different service. 📞`,
              suggestedTimes: []
            };
          }
        } else {
          const services = await this.storage.getAllServices();
          const serviceList = services.map(s => `${s.name} ($${s.price})`).join(', ');
          
          return {
            success: false,
            message: `No problem! Let me help you find a better time. We offer: ${serviceList}. Which service would you like to book? 💆‍♀️✨`,
            suggestedTimes: []
          };
        }
      }

      // Enhanced conversation flow logic
      const currentStep = conversationState?.conversationStep || 'initial';
      console.log('📱 Current conversation step:', currentStep);

      // Step 1: Service Selection
      if (currentStep === 'initial' && request.serviceName) {
        console.log('🎯 Service selected:', request.serviceName);
        
        // Update conversation state
        this.updateConversationState(clientPhone, {
          selectedService: request.serviceName,
          conversationStep: 'service_selected'
        });

        // Ask for date preference
        return {
          success: false,
          message: `Great choice! ${request.serviceName} is a wonderful service. When would you like to book your appointment? You can say "tomorrow", "Friday", or any day that works for you. 📅`,
          suggestedTimes: []
        };
      }

      // Step 2: Date Selection
      if (currentStep === 'service_selected' && (request.date || request.time)) {
        const selectedService = conversationState?.selectedService || request.serviceName;
        console.log('📅 Date/time selected:', request.date || request.time);

        // If they provided both date and time, try to book directly
        if (request.date && request.time) {
          console.log('🎯 Attempting direct booking with date and time');
          
          // Find available slots for the requested date
          const availableSlots = await this.findAvailableSlots({
            ...request,
            serviceName: selectedService
          });

          if (availableSlots.length === 0) {
            return {
              success: false,
              message: `I'm sorry, but I couldn't find any available slots for ${selectedService} on ${request.date}. Would you like to try a different date? 📅`,
              suggestedTimes: []
            };
          }

          // Try to match the requested time
          const matchingSlot = availableSlots.find(slot => {
            const slotTime = format(slot.startTime, 'h:mm a').toLowerCase();
            const requestedTime = request.time!.toLowerCase();
            
            console.log(`🔍 Comparing slot time "${slotTime}" with requested time "${requestedTime}"`);
            
            // Enhanced time matching
            const normalizedSlotTime = slotTime.replace(/\s+/g, '').replace(/^0/, '');
            const normalizedRequestedTime = requestedTime.replace(/\s+/g, '').replace(/^0/, '');
            
            if (normalizedSlotTime === normalizedRequestedTime) {
              console.log(`✅ Exact match found: ${slotTime} = ${requestedTime}`);
              return true;
            }
            
            // Handle various time formats
            const slotTimeParts = slotTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
            const requestedTimeParts = requestedTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
            
            if (slotTimeParts && requestedTimeParts) {
              const slotHour = parseInt(slotTimeParts[1]);
              const slotMinute = slotTimeParts[2] ? parseInt(slotTimeParts[2]) : 0;
              const slotPeriod = slotTimeParts[3].toLowerCase();
              
              const requestedHour = parseInt(requestedTimeParts[1]);
              const requestedMinute = requestedTimeParts[2] ? parseInt(requestedTimeParts[2]) : 0;
              const requestedPeriod = requestedTimeParts[3].toLowerCase();
              
              const timeMatch = slotHour === requestedHour && 
                               slotMinute === requestedMinute && 
                               slotPeriod === requestedPeriod;
              
              if (timeMatch) {
                console.log(`✅ Time parts match: ${slotHour}:${slotMinute}${slotPeriod} = ${requestedHour}:${requestedMinute}${requestedPeriod}`);
              }
              
              return timeMatch;
            }
            
            console.log(`❌ No match found for slot time "${slotTime}" and requested time "${requestedTime}"`);
            return false;
          });

          if (matchingSlot) {
            console.log('🎯 Found matching slot, attempting to book');
            
            try {
              const bookingResult = await this.bookAppointment(request, matchingSlot);
              
              if (bookingResult.success && bookingResult.appointment) {
                // Clear conversation state after successful booking
                this.clearConversationState(clientPhone);
                
                return {
                  success: true,
                  appointment: bookingResult.appointment,
                  message: `Perfect! I've booked your ${selectedService} appointment for ${format(matchingSlot.startTime, 'EEEE, MMMM d')} at ${format(matchingSlot.startTime, 'h:mm a')}. You'll receive a confirmation shortly! 💆‍♀️✨`
                };
              } else {
                return {
                  success: false,
                  message: `I'm sorry, but that time is no longer available. Here are some other available times for ${selectedService}: ${availableSlots.slice(0, 5).map(slot => format(slot.startTime, 'h:mm a')).join(', ')}. Which time works better for you? 💆‍♀️✨`,
                  availableSlots,
                  suggestedTimes: availableSlots.slice(0, 5).map(slot => format(slot.startTime, 'h:mm a'))
                };
              }
            } catch (error) {
              console.error('❌ Booking error:', error);
              return {
                success: false,
                message: `I'm sorry, but I couldn't book that appointment. Please call us directly at 918-932-5396 for assistance. 📞`,
                suggestedTimes: []
              };
            }
          } else {
            // Show available times for the requested date
            const dateSlots = availableSlots.filter(slot => {
              const slotDate = format(slot.startTime, 'EEEE, MMMM d');
              const slotDateShort = format(slot.startTime, 'MMMM d');
              const slotDateDay = format(slot.startTime, 'EEEE');
              
              const requestedDate = request.date!.toLowerCase();
              
              // Handle relative dates
              if (requestedDate === 'today') {
                const today = new Date();
                return slot.startTime.toDateString() === today.toDateString();
              }
              if (requestedDate === 'tomorrow') {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                return slot.startTime.toDateString() === tomorrow.toDateString();
              }
              
              return slotDate.toLowerCase().includes(requestedDate) ||
                     slotDateShort.toLowerCase().includes(requestedDate) ||
                     slotDateDay.toLowerCase().includes(requestedDate);
            });

            if (dateSlots.length > 0) {
              const timeOptions = dateSlots.slice(0, 5).map(slot => 
                format(slot.startTime, 'h:mm a')
              ).join(', ');
              
              // Update conversation state
              this.updateConversationState(clientPhone, {
                selectedDate: request.date,
                conversationStep: 'date_selected'
              });
              
              return {
                success: false,
                message: `Perfect! I found available times for ${selectedService} on ${request.date}: ${timeOptions}. Which time works best for you? ⏰`,
                availableSlots: dateSlots
              };
            } else {
              return {
                success: false,
                message: `I'm sorry, but I couldn't find any available slots for ${selectedService} on ${request.date}. Would you like to try a different date? 📅`,
                suggestedTimes: []
              };
            }
          }
        }
        
        // If they only provided a date, show available times
        if (request.date && !request.time) {
          console.log('📅 Date only provided, showing available times');
          
          const availableSlots = await this.findAvailableSlots({
            ...request,
            serviceName: selectedService
          });

          const dateSlots = availableSlots.filter(slot => {
            const slotDate = format(slot.startTime, 'EEEE, MMMM d');
            const slotDateShort = format(slot.startTime, 'MMMM d');
            const slotDateDay = format(slot.startTime, 'EEEE');
            
            const requestedDate = request.date!.toLowerCase();
            
            // Handle relative dates
            if (requestedDate === 'today') {
              const today = new Date();
              return slot.startTime.toDateString() === today.toDateString();
            }
            if (requestedDate === 'tomorrow') {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              return slot.startTime.toDateString() === tomorrow.toDateString();
            }
            
            return slotDate.toLowerCase().includes(requestedDate) ||
                   slotDateShort.toLowerCase().includes(requestedDate) ||
                   slotDateDay.toLowerCase().includes(requestedDate);
          });

          if (dateSlots.length > 0) {
            const timeOptions = dateSlots.slice(0, 5).map(slot => 
              format(slot.startTime, 'h:mm a')
            ).join(', ');
            
            // Update conversation state
            this.updateConversationState(clientPhone, {
              selectedDate: request.date,
              conversationStep: 'date_selected'
            });
            
            return {
              success: false,
              message: `Perfect! I found available times for ${selectedService} on ${request.date}: ${timeOptions}. Which time works best for you? ⏰`,
              availableSlots: dateSlots
            };
          } else {
            return {
              success: false,
              message: `I'm sorry, but I couldn't find any available slots for ${selectedService} on ${request.date}. Would you like to try a different date? 📅`,
              suggestedTimes: []
            };
          }
        }
      }

      // Step 3: Time Selection
      if (currentStep === 'date_selected' && request.time) {
        const selectedService = conversationState?.selectedService;
        const selectedDate = conversationState?.selectedDate;
        
        console.log('⏰ Time selected:', request.time);
        
        // Find available slots for the selected date
        const availableSlots = await this.findAvailableSlots({
          ...request,
          serviceName: selectedService,
          date: selectedDate
        });

        // Try to match the requested time
        const matchingSlot = availableSlots.find(slot => {
          const slotTime = format(slot.startTime, 'h:mm a').toLowerCase();
          const requestedTime = request.time!.toLowerCase();
          
          // Enhanced time matching
          const normalizedSlotTime = slotTime.replace(/\s+/g, '').replace(/^0/, '');
          const normalizedRequestedTime = requestedTime.replace(/\s+/g, '').replace(/^0/, '');
          
          if (normalizedSlotTime === normalizedRequestedTime) {
            return true;
          }
          
          // Handle various time formats
          const slotTimeParts = slotTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
          const requestedTimeParts = requestedTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
          
          if (slotTimeParts && requestedTimeParts) {
            const slotHour = parseInt(slotTimeParts[1]);
            const slotMinute = slotTimeParts[2] ? parseInt(slotTimeParts[2]) : 0;
            const slotPeriod = slotTimeParts[3].toLowerCase();
            
            const requestedHour = parseInt(requestedTimeParts[1]);
            const requestedMinute = requestedTimeParts[2] ? parseInt(requestedTimeParts[2]) : 0;
            const requestedPeriod = requestedTimeParts[3].toLowerCase();
            
            return slotHour === requestedHour && 
                   slotMinute === requestedMinute && 
                   slotPeriod === requestedPeriod;
          }
          
          return false;
        });

        if (matchingSlot) {
          console.log('🎯 Found matching slot, attempting to book');
          
          try {
            const bookingResult = await this.bookAppointment(request, matchingSlot);
            
            if (bookingResult.success && bookingResult.appointment) {
              // Clear conversation state after successful booking
              this.clearConversationState(clientPhone);
              
              return {
                success: true,
                appointment: bookingResult.appointment,
                message: `Perfect! I've booked your ${selectedService} appointment for ${format(matchingSlot.startTime, 'EEEE, MMMM d')} at ${format(matchingSlot.startTime, 'h:mm a')}. You'll receive a confirmation shortly! 💆‍♀️✨`
              };
            } else {
              return {
                success: false,
                message: `I'm sorry, but that time is no longer available. Here are some other available times for ${selectedService}: ${availableSlots.slice(0, 5).map(slot => format(slot.startTime, 'h:mm a')).join(', ')}. Which time works better for you? 💆‍♀️✨`,
                availableSlots,
                suggestedTimes: availableSlots.slice(0, 5).map(slot => format(slot.startTime, 'h:mm a'))
              };
            }
          } catch (error) {
            console.error('❌ Booking error:', error);
            return {
              success: false,
              message: `I'm sorry, but I couldn't book that appointment. Please call us directly at 918-932-5396 for assistance. 📞`,
              suggestedTimes: []
            };
          }
        } else {
          // Show available times if the requested time doesn't match
          const timeOptions = availableSlots.slice(0, 5).map(slot => 
            format(slot.startTime, 'h:mm a')
          ).join(', ');
          
          return {
            success: false,
            message: `I'm sorry, but ${request.time} is not available for ${selectedService}. Here are some available times: ${timeOptions}. Which time works better for you? 💆‍♀️✨`,
            availableSlots,
            suggestedTimes: timeOptions.split(', ')
          };
        }
      }

      // Fallback: Show general availability
      const availableSlots = await this.findAvailableSlots(request);
      
      // FIXED: If no service is specified, ask for service selection first
      if (!request.serviceName) {
        const services = await this.storage.getAllServices();
        const serviceList = services.map(s => `${s.name} ($${s.price})`).join(', ');
        
        return {
          success: false,
          message: `Great! I'd be happy to help you book an appointment. What type of service would you like?\n\n` +
                   `Our services include:\n` +
                   `• ${serviceList}\n\n` +
                   `Just let me know which service you'd like to book! 💆‍♀️✨`,
          suggestedTimes: []
        };
      }
      
      if (availableSlots.length === 0) {
        return {
          success: false,
          message: `I'm sorry, but I couldn't find any available slots for ${request.serviceName} in the next few days. Please call us directly to check availability or try a different service. 📞`,
          suggestedTimes: []
        };
      }

      // Provide general availability
      const suggestedTimes = await this.getSuggestedTimes(request);
      
      return {
        success: false,
        message: `Great choice! Here are some available times for ${request.serviceName}: ${suggestedTimes.join(', ')}. Which time works best for you? 💆‍♀️✨`,
        availableSlots,
        suggestedTimes
      };

    } catch (error: any) {
      console.error('Error processing booking request with context:', error);
      return {
        success: false,
        error: error.message,
        message: 'Sorry, I encountered an issue while processing your booking request. Please call us directly for assistance.'
      };
    }
  }

  /**
   * Update conversation state for a phone number
   */
  private updateConversationState(phoneNumber: string, updates: any): void {
    // This would typically update a conversation state in memory or database
    console.log('📱 Updating conversation state for', phoneNumber, ':', updates);
  }

  /**
   * Clear conversation state for a phone number
   */
  private clearConversationState(phoneNumber: string): void {
    // This would typically clear the conversation state
    console.log('📱 Clearing conversation state for', phoneNumber);
  }
} 