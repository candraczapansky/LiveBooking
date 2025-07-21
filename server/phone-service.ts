import twilio from 'twilio';
import { db } from './db';
import { phoneCalls, callRecordings, users } from '@shared/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  throw new Error('Missing required Twilio environment variables');
}

const client = twilio(accountSid, authToken);

export class PhoneService {
  // Make an outbound call
  static async makeOutboundCall(
    toNumber: string,
    staffId: number,
    userId?: number,
    appointmentId?: number,
    purpose: string = 'outbound'
  ) {
    try {
      // Create TwiML for call with recording
      const call = await client.calls.create({
        twiml: `<Response><Say voice="alice">Hello, this is BeautyBook Salon. Please hold while we connect you.</Say><Dial record="record-from-ringing" recordingStatusCallback="${(process.env.CUSTOM_DOMAIN || 'https://gloupheadspa.app' || process.env.REPLIT_DOMAINS || 'http://localhost:3000')}/api/phone/recording-status"><Number>${toNumber}</Number></Dial></Response>`,
        from: twilioPhoneNumber!,
        to: toNumber,
        statusCallback: `${(process.env.CUSTOM_DOMAIN || 'https://gloupheadspa.app' || process.env.REPLIT_DOMAINS || 'http://localhost:3000')}/api/phone/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        record: true,
      });

      // Save call record to database
      const [phoneCall] = await db.insert(phoneCalls).values({
        twilioCallSid: call.sid,
        fromNumber: twilioPhoneNumber!,
        toNumber: toNumber,
        direction: 'outbound',
        status: call.status,
        userId: userId || null,
        staffId: staffId || null,
        appointmentId: appointmentId || null,
        purpose,
        startedAt: new Date(),
      }).returning();

      return phoneCall;
    } catch (error) {
      console.error('Error making outbound call:', error);
      throw error;
    }
  }

  // Handle incoming call webhook
  static async handleIncomingCall(callSid: string, fromNumber: string, toNumber: string) {
    try {
      // Try to find existing user by phone number
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.phone, fromNumber))
        .limit(1);

      // Save incoming call record
      const [phoneCall] = await db.insert(phoneCalls).values({
        twilioCallSid: callSid,
        fromNumber,
        toNumber,
        direction: 'inbound',
        status: 'ringing',
        userId: existingUser?.id,
        purpose: 'inbound',
        startedAt: new Date(),
      }).returning();

      // Generate TwiML response with recording
      const twiml = `
        <Response>
          <Say voice="alice">Thank you for calling ${process.env.BUSINESS_NAME || 'BeautyBook Salon'}. Your call is being recorded for quality assurance. Please hold while we connect you to our staff.</Say>
          <Dial record="record-from-ringing" recordingStatusCallback="${process.env.CUSTOM_DOMAIN || 'https://gloupheadspa.app' || process.env.REPLIT_DOMAINS || 'http://localhost:3000'}/api/phone/recording-status">
            <Queue>salon-queue</Queue>
          </Dial>
        </Response>
      `;

      return { phoneCall, twiml };
    } catch (error) {
      console.error('Error handling incoming call:', error);
      throw error;
    }
  }

  // Update call status from Twilio webhooks
  static async updateCallStatus(callSid: string, status: string, duration?: number) {
    try {
      const updateData: any = { status };
      
      if (duration !== undefined) {
        updateData.duration = duration;
      }
      
      if (status === 'completed') {
        updateData.endedAt = new Date();
      }

      await db
        .update(phoneCalls)
        .set(updateData)
        .where(eq(phoneCalls.twilioCallSid, callSid));

      return true;
    } catch (error) {
      console.error('Error updating call status:', error);
      throw error;
    }
  }

  // Save call recording
  static async saveCallRecording(
    callSid: string,
    recordingSid: string,
    recordingUrl: string,
    duration?: number
  ) {
    try {
      // Find the phone call record
      const [phoneCall] = await db
        .select()
        .from(phoneCalls)
        .where(eq(phoneCalls.twilioCallSid, callSid))
        .limit(1);

      if (!phoneCall) {
        throw new Error(`Phone call not found for callSid: ${callSid}`);
      }

      // Save recording record
      const [recording] = await db.insert(callRecordings).values({
        phoneCallId: phoneCall.id,
        twilioRecordingSid: recordingSid,
        recordingUrl,
        duration,
        status: 'completed',
      }).returning();

      return recording;
    } catch (error) {
      console.error('Error saving call recording:', error);
      throw error;
    }
  }

  // Get call history for a user
  static async getCallHistoryForUser(userId: number) {
    try {
      const callHistory = await db
        .select({
          id: phoneCalls.id,
          twilioCallSid: phoneCalls.twilioCallSid,
          fromNumber: phoneCalls.fromNumber,
          toNumber: phoneCalls.toNumber,
          direction: phoneCalls.direction,
          status: phoneCalls.status,
          duration: phoneCalls.duration,
          purpose: phoneCalls.purpose,
          notes: phoneCalls.notes,
          createdAt: phoneCalls.createdAt,
          startedAt: phoneCalls.startedAt,
          endedAt: phoneCalls.endedAt,
          recordings: callRecordings,
        })
        .from(phoneCalls)
        .leftJoin(callRecordings, eq(phoneCalls.id, callRecordings.phoneCallId))
        .where(eq(phoneCalls.userId, userId))
        .orderBy(desc(phoneCalls.createdAt));

      return callHistory;
    } catch (error) {
      console.error('Error getting call history:', error);
      throw error;
    }
  }

  // Get all recent calls for dashboard
  static async getRecentCalls(limit: number = 50) {
    try {
      const recentCalls = await db
        .select({
          id: phoneCalls.id,
          twilioCallSid: phoneCalls.twilioCallSid,
          fromNumber: phoneCalls.fromNumber,
          toNumber: phoneCalls.toNumber,
          direction: phoneCalls.direction,
          status: phoneCalls.status,
          duration: phoneCalls.duration,
          purpose: phoneCalls.purpose,
          notes: phoneCalls.notes,
          createdAt: phoneCalls.createdAt,
          startedAt: phoneCalls.startedAt,
          endedAt: phoneCalls.endedAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            phone: users.phone,
          },
        })
        .from(phoneCalls)
        .leftJoin(users, eq(phoneCalls.userId, users.id))
        .orderBy(desc(phoneCalls.createdAt))
        .limit(limit);

      return recentCalls;
    } catch (error) {
      console.error('Error getting recent calls:', error);
      throw error;
    }
  }

  // Add notes to a call
  static async addCallNotes(callId: number, notes: string, staffId: number) {
    try {
      await db
        .update(phoneCalls)
        .set({ notes, staffId })
        .where(eq(phoneCalls.id, callId));

      return true;
    } catch (error) {
      console.error('Error adding call notes:', error);
      throw error;
    }
  }

  // Update user association for a call
  static async updateCallUserAssociation(callId: number, userId: number | null) {
    try {
      await db
        .update(phoneCalls)
        .set({ userId })
        .where(eq(phoneCalls.id, callId));

      return true;
    } catch (error) {
      console.error('Error updating call user association:', error);
      throw error;
    }
  }

  // Find user by phone number
  static async findUserByPhone(phoneNumber: string) {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.phone, phoneNumber))
        .limit(1);

      return user || null;
    } catch (error) {
      console.error('Error finding user by phone:', error);
      throw error;
    }
  }

  // Get recording download URL
  static async getRecordingDownloadUrl(recordingSid: string) {
    try {
      const recording = await client.recordings(recordingSid).fetch();
      return `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
    } catch (error) {
      console.error('Error getting recording download URL:', error);
      throw error;
    }
  }

  // Generate call analytics
  static async getCallAnalytics(startDate?: Date, endDate?: Date) {
    try {
      let conditions: any[] = [];
      
      if (startDate && endDate) {
        conditions.push(
          and(
            gte(phoneCalls.createdAt, startDate),
            lte(phoneCalls.createdAt, endDate)
          )
        );
      }

      const calls = await db
        .select()
        .from(phoneCalls)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const analytics = {
        totalCalls: calls.length,
        inboundCalls: calls.filter(c => c.direction === 'inbound').length,
        outboundCalls: calls.filter(c => c.direction === 'outbound').length,
        completedCalls: calls.filter(c => c.status === 'completed').length,
        failedCalls: calls.filter(c => ['failed', 'busy', 'no-answer'].includes(c.status)).length,
        totalDuration: calls.reduce((sum, call) => sum + (call.duration || 0), 0),
        averageDuration: calls.length > 0 
          ? calls.reduce((sum, call) => sum + (call.duration || 0), 0) / calls.filter(c => c.duration).length 
          : 0,
        callsByPurpose: calls.reduce((acc, call) => {
          const purpose = call.purpose || 'unknown';
          acc[purpose] = (acc[purpose] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };

      return analytics;
    } catch (error) {
      console.error('Error generating call analytics:', error);
      throw error;
    }
  }
}