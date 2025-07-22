import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("client"), // admin, staff, client
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone").unique(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  profilePicture: text("profile_picture"), // Base64 encoded image data
  squareCustomerId: text("stripe_customer_id"),
  // Password reset fields
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  // Communication preferences
  emailAccountManagement: boolean("email_account_management").default(true),
  emailAppointmentReminders: boolean("email_appointment_reminders").default(true),
  emailPromotions: boolean("email_promotions").default(false),
  smsAccountManagement: boolean("sms_account_management").default(false),
  smsAppointmentReminders: boolean("sms_appointment_reminders").default(true),
  smsPromotions: boolean("sms_promotions").default(false),
  // Two-factor authentication fields
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorBackupCodes: text("two_factor_backup_codes"), // JSON array of backup codes
  twoFactorMethod: text("two_factor_method").default("authenticator"), // "authenticator" or "email"
  twoFactorEmailCode: text("two_factor_email_code"), // Temporary email verification code
  twoFactorEmailCodeExpiry: timestamp("two_factor_email_code_expiry"), // When email code expires

  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Client-specific schema without username/password for client registration
export const insertClientSchema = createInsertSchema(users).omit({
  id: true,
  username: true,
  password: true,
  createdAt: true,
  role: true,
  squareCustomerId: true,
});

// Service Categories schema
export const serviceCategories = pgTable("service_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#3B82F6"), // hex color code for UI display
});

export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({
  id: true,
});

// Rooms schema
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  capacity: integer("capacity").default(1),
  isActive: boolean("is_active").default(true),
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
});

// Devices schema
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  deviceType: text("device_type").notNull(), // hair_dryer, massage_table, styling_chair, etc.
  brand: text("brand"),
  model: text("model"),
  serialNumber: text("serial_number"),
  purchaseDate: text("purchase_date"),
  warrantyExpiry: text("warranty_expiry"),
  status: text("status").notNull().default("available"), // available, in_use, maintenance, broken
  isActive: boolean("is_active").notNull().default(true),
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
});

// Services schema
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(), // in minutes
  price: doublePrecision("price").notNull(),
  categoryId: integer("category_id").notNull(),
  roomId: integer("room_id"),
  bufferTimeBefore: integer("buffer_time_before").default(0), // in minutes
  bufferTimeAfter: integer("buffer_time_after").default(0), // in minutes
  color: text("color").default("#3B82F6"), // hex color code
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
});

// Products schema
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku").unique(),
  barcode: text("barcode"),
  price: doublePrecision("price").notNull(),
  costPrice: doublePrecision("cost_price"),
  category: text("category").notNull(),
  brand: text("brand"),
  stockQuantity: integer("stock_quantity").default(0),
  minStockLevel: integer("min_stock_level").default(0),
  isActive: boolean("is_active").default(true),
  isTaxable: boolean("is_taxable").default(true),
  weight: doublePrecision("weight"), // in grams
  dimensions: text("dimensions"), // "length x width x height"
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

// Staff schema (extends users)
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  bio: text("bio"),
  commissionType: text("commission_type").notNull().default("commission"), // commission, hourly, fixed, hourly_plus_commission
  commissionRate: doublePrecision("commission_rate"), // percentage for commission (0-1)
  hourlyRate: doublePrecision("hourly_rate"), // hourly wage
  fixedRate: doublePrecision("fixed_rate"), // fixed amount per service
  photoUrl: text("photo_url"),
});

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
});

// Staff services (many-to-many relationship between staff and services)
export const staffServices = pgTable("staff_services", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  serviceId: integer("service_id").notNull(),
  customRate: doublePrecision("custom_rate"), // Custom pay rate for this specific service
  customCommissionRate: doublePrecision("custom_commission_rate"), // Custom commission rate for this specific service
});

export const insertStaffServiceSchema = createInsertSchema(staffServices).omit({
  id: true,
});

// Appointments schema
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  serviceId: integer("service_id").notNull(),
  staffId: integer("staff_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").notNull().default("pending"), // pending, confirmed, cancelled, completed
  paymentStatus: text("payment_status").notNull().default("unpaid"), // unpaid, paid, refunded
  totalAmount: doublePrecision("total_amount"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
}).extend({
  startTime: z.union([z.date(), z.string().transform((str) => new Date(str))]),
  endTime: z.union([z.date(), z.string().transform((str) => new Date(str))]),
});

// Appointment History schema - tracks all changes to appointments
export const appointmentHistory = pgTable("appointment_history", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull(),
  
  // Action tracking
  action: text("action").notNull(), // "created", "updated", "cancelled", "confirmed", "completed", "rescheduled", "payment_updated"
  actionBy: integer("action_by"), // User ID who performed the action
  actionByRole: text("action_by_role"), // "admin", "staff", "client"
  
  // Previous and new values for tracking changes
  previousValues: text("previous_values"), // JSON string of previous field values
  newValues: text("new_values"), // JSON string of new field values
  
  // Snapshot of appointment state at time of change
  clientId: integer("client_id"),
  serviceId: integer("service_id"),
  staffId: integer("staff_id"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  status: text("status"),
  paymentStatus: text("payment_status"),
  totalAmount: doublePrecision("total_amount"),
  notes: text("notes"),
  
  // Additional context
  reason: text("reason"), // Reason for cancellation, reschedule, etc.
  systemGenerated: boolean("system_generated").default(false), // True for automated changes
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAppointmentHistorySchema = createInsertSchema(appointmentHistory).omit({
  id: true,
  createdAt: true,
});

// Cancelled Appointments schema - separate storage for cancelled appointments
export const cancelledAppointments = pgTable("cancelled_appointments", {
  id: serial("id").primaryKey(),
  originalAppointmentId: integer("original_appointment_id").notNull(), // Reference to original appointment ID
  clientId: integer("client_id").notNull(),
  serviceId: integer("service_id").notNull(),
  staffId: integer("staff_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  totalAmount: doublePrecision("total_amount"),
  notes: text("notes"),
  cancellationReason: text("cancellation_reason"),
  cancelledBy: integer("cancelled_by"), // User ID who cancelled
  cancelledByRole: text("cancelled_by_role"), // "admin", "staff", "client"
  paymentStatus: text("payment_status").notNull().default("unpaid"), // For refund tracking
  refundAmount: doublePrecision("refund_amount").default(0),
  refundDate: timestamp("refund_date"),
  originalCreatedAt: timestamp("original_created_at"), // When the original appointment was created
  cancelledAt: timestamp("cancelled_at").defaultNow(), // When it was cancelled
});

export const insertCancelledAppointmentSchema = createInsertSchema(cancelledAppointments).omit({
  id: true,
  cancelledAt: true,
}).extend({
  startTime: z.union([z.date(), z.string().transform((str) => new Date(str))]),
  endTime: z.union([z.date(), z.string().transform((str) => new Date(str))]),
  originalCreatedAt: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
  refundDate: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
});

// Memberships schema
export const memberships = pgTable("memberships", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: doublePrecision("price").notNull(),
  duration: integer("duration").notNull(), // in days
  benefits: text("benefits"),
});

export const insertMembershipSchema = createInsertSchema(memberships).omit({
  id: true,
});

// Client memberships
export const clientMemberships = pgTable("client_memberships", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  membershipId: integer("membership_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  active: boolean("active").notNull().default(true),
  squareSubscriptionId: text("square_subscription_id"),
  // Auto-renewal fields
  autoRenew: boolean("auto_renew").notNull().default(false),
  renewalDate: integer("renewal_date"), // Day of month (1-31) for billing
  lastRenewalAttempt: timestamp("last_renewal_attempt"),
  renewalFailureCount: integer("renewal_failure_count").default(0),
  paymentMethodId: text("payment_method_id"), // Stored payment method for auto-renewal
});

export const insertClientMembershipSchema = createInsertSchema(clientMemberships).omit({
  id: true,
}).extend({
  startDate: z.union([
    z.date(),
    z.string().transform((str) => new Date(str))
  ]),
  endDate: z.union([
    z.date(), 
    z.string().transform((str) => new Date(str))
  ])
});

// Payments schema
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  appointmentId: integer("appointment_id"),
  clientMembershipId: integer("client_membership_id"),
  amount: doublePrecision("amount").notNull(),
  tipAmount: doublePrecision("tip_amount").default(0),
  totalAmount: doublePrecision("total_amount").notNull(), // amount + tipAmount
  method: text("method").notNull().default("card"), // card, cash, check, etc.
  status: text("status").notNull().default("pending"), // pending, completed, failed, refunded
  type: text("type").notNull().default("appointment"), // appointment, pos_payment, membership
  description: text("description"),
  squarePaymentId: text("square_payment_id"),
  paymentDate: timestamp("payment_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
}).extend({
  paymentDate: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
});

// Staff earnings tracking
export const staffEarnings = pgTable("staff_earnings", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  appointmentId: integer("appointment_id"),
  serviceId: integer("service_id").notNull(),
  paymentId: integer("payment_id"),
  earningsAmount: doublePrecision("earnings_amount").notNull(),
  rateType: text("rate_type").notNull(), // commission, hourly, fixed
  rateUsed: doublePrecision("rate_used").notNull(),
  isCustomRate: boolean("is_custom_rate").notNull().default(false),
  servicePrice: doublePrecision("service_price").notNull(),
  calculationDetails: text("calculation_details"), // JSON string with calculation breakdown
  earningsDate: timestamp("earnings_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStaffEarningsSchema = createInsertSchema(staffEarnings).omit({
  id: true,
  createdAt: true,
});

// Saved payment methods schema
export const savedPaymentMethods = pgTable("saved_payment_methods", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  squareCardId: text("square_card_id").notNull(),
  cardBrand: text("card_brand").notNull(), // visa, mastercard, amex, etc.
  cardLast4: text("card_last4").notNull(),
  cardExpMonth: integer("card_exp_month").notNull(),
  cardExpYear: integer("card_exp_year").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Saved gift cards schema (for customers to save their gift card codes)
export const savedGiftCards = pgTable("saved_gift_cards", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  giftCardId: integer("gift_card_id").notNull(),
  nickname: text("nickname"), // Optional nickname for the gift card
  addedAt: timestamp("added_at").defaultNow(),
});

export const insertSavedPaymentMethodSchema = createInsertSchema(savedPaymentMethods).omit({
  id: true,
  createdAt: true,
});

export const insertSavedGiftCardSchema = createInsertSchema(savedGiftCards).omit({
  id: true,
  addedAt: true,
});

// Gift cards schema
export const giftCards = pgTable("gift_cards", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  initialAmount: doublePrecision("initial_amount").notNull(),
  currentBalance: doublePrecision("current_balance").notNull(),
  issuedToEmail: text("issued_to_email"),
  issuedToName: text("issued_to_name"),
  purchasedByUserId: integer("purchased_by_user_id"),
  status: text("status").notNull().default("active"), // active, inactive, expired, used
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGiftCardSchema = createInsertSchema(giftCards).omit({
  id: true,
  createdAt: true,
});

// Gift card transactions schema
export const giftCardTransactions = pgTable("gift_card_transactions", {
  id: serial("id").primaryKey(),
  giftCardId: integer("gift_card_id").notNull(),
  appointmentId: integer("appointment_id"),
  transactionType: text("transaction_type").notNull(), // purchase, redemption, refund
  amount: doublePrecision("amount").notNull(),
  balanceAfter: doublePrecision("balance_after").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGiftCardTransactionSchema = createInsertSchema(giftCardTransactions).omit({
  id: true,
  createdAt: true,
});

// User color preferences schema
export const userColorPreferences = pgTable("user_color_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  primaryColor: text("primary_color").notNull().default("#f4a4c0"), // HSL format
  primaryTextColor: text("primary_text_color").notNull().default("#000000"),
  secondaryTextColor: text("secondary_text_color").notNull().default("#6b7280"),
  isDarkMode: boolean("is_dark_mode").notNull().default(false),
  savedBrandColors: text("saved_brand_colors"), // JSON string array
  savedTextColors: text("saved_text_colors"), // JSON string array
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserColorPreferencesSchema = createInsertSchema(userColorPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type InsertServiceCategory = z.infer<typeof insertServiceCategorySchema>;

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type Staff = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;

export type StaffService = typeof staffServices.$inferSelect;
export type InsertStaffService = z.infer<typeof insertStaffServiceSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type CancelledAppointment = typeof cancelledAppointments.$inferSelect;
export type InsertCancelledAppointment = z.infer<typeof insertCancelledAppointmentSchema>;

export type Membership = typeof memberships.$inferSelect;
export type InsertMembership = z.infer<typeof insertMembershipSchema>;

export type ClientMembership = typeof clientMemberships.$inferSelect;
export type InsertClientMembership = z.infer<typeof insertClientMembershipSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type StaffEarnings = typeof staffEarnings.$inferSelect;
export type InsertStaffEarnings = z.infer<typeof insertStaffEarningsSchema>;

export type SavedPaymentMethod = typeof savedPaymentMethods.$inferSelect;
export type InsertSavedPaymentMethod = z.infer<typeof insertSavedPaymentMethodSchema>;

export type SavedGiftCard = typeof savedGiftCards.$inferSelect;
export type InsertSavedGiftCard = z.infer<typeof insertSavedGiftCardSchema>;

export type GiftCard = typeof giftCards.$inferSelect;
export type InsertGiftCard = z.infer<typeof insertGiftCardSchema>;

export type GiftCardTransaction = typeof giftCardTransactions.$inferSelect;
export type InsertGiftCardTransaction = z.infer<typeof insertGiftCardTransactionSchema>;

export type UserColorPreferences = typeof userColorPreferences.$inferSelect;
export type InsertUserColorPreferences = z.infer<typeof insertUserColorPreferencesSchema>;

export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;

// Marketing campaigns schema
export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // email, sms
  audience: text("audience").notNull(), // All Clients, Regular Clients, etc.
  subject: text("subject"), // For email campaigns
  content: text("content").notNull(),
  htmlContent: text("html_content"), // Generated HTML from Unlayer
  templateDesign: text("template_design"), // Unlayer design JSON as text
  sendDate: timestamp("send_date"),
  status: text("status").notNull().default("draft"), // draft, scheduled, sent, failed
  sentCount: integer("sent_count").default(0),
  deliveredCount: integer("delivered_count").default(0),
  failedCount: integer("failed_count").default(0),
  openedCount: integer("opened_count").default(0), // Track email opens
  clickedCount: integer("clicked_count").default(0), // Track link clicks
  unsubscribedCount: integer("unsubscribed_count").default(0), // Track unsubscribes
  createdAt: timestamp("created_at").defaultNow(),
  sentAt: timestamp("sent_at"),
});

export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns).omit({
  id: true,
  createdAt: true,
}).extend({
  sendDate: z.union([z.date(), z.string(), z.null()]).optional(),
});

// Marketing campaign recipients schema (for tracking individual sends)
export const marketingCampaignRecipients = pgTable("marketing_campaign_recipients", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, sent, delivered, failed
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"), // Track when email was opened
  clickedAt: timestamp("clicked_at"), // Track when links were clicked
  unsubscribedAt: timestamp("unsubscribed_at"), // Track when user unsubscribed
  trackingToken: text("tracking_token").unique(), // Unique token for tracking pixels and links
  errorMessage: text("error_message"),
});

export const insertMarketingCampaignRecipientSchema = createInsertSchema(marketingCampaignRecipients).omit({
  id: true,
});

export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
export type InsertMarketingCampaign = z.infer<typeof insertMarketingCampaignSchema>;

export type MarketingCampaignRecipient = typeof marketingCampaignRecipients.$inferSelect;
export type InsertMarketingCampaignRecipient = z.infer<typeof insertMarketingCampaignRecipientSchema>;

// Phone calls schema
export const phoneCalls = pgTable("phone_calls", {
  id: serial("id").primaryKey(),
  twilioCallSid: text("twilio_call_sid").notNull().unique(),
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  direction: text("direction").notNull(), // inbound, outbound
  status: text("status").notNull(), // queued, ringing, in-progress, completed, busy, failed, no-answer, canceled
  duration: integer("duration"), // Call duration in seconds
  price: text("price"), // Call cost from Twilio
  priceUnit: text("price_unit"), // Currency unit (USD)
  userId: integer("user_id"), // Associated client/user account
  staffId: integer("staff_id"), // Staff member who made/received the call
  appointmentId: integer("appointment_id"), // Related appointment if applicable
  notes: text("notes"), // Call notes from staff
  purpose: text("purpose"), // Call purpose: appointment_booking, follow_up, consultation, support, sales
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
});

// Call recordings schema
export const callRecordings = pgTable("call_recordings", {
  id: serial("id").primaryKey(),
  phoneCallId: integer("phone_call_id").notNull(),
  twilioRecordingSid: text("twilio_recording_sid").notNull().unique(),
  recordingUrl: text("recording_url").notNull(),
  duration: integer("duration"), // Recording duration in seconds
  fileSize: integer("file_size"), // File size in bytes
  format: text("format").default("mp3"), // Audio format
  channels: integer("channels").default(1), // Number of audio channels
  status: text("status").notNull(), // processing, completed, failed
  transcription: text("transcription"), // AI transcription of the call
  transcriptionStatus: text("transcription_status"), // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPhoneCallSchema = createInsertSchema(phoneCalls).omit({
  id: true,
  createdAt: true,
});

export const insertCallRecordingSchema = createInsertSchema(callRecordings).omit({
  id: true,
  createdAt: true,
});

export type PhoneCall = typeof phoneCalls.$inferSelect;
export type InsertPhoneCall = z.infer<typeof insertPhoneCallSchema>;

export type CallRecording = typeof callRecordings.$inferSelect;
export type InsertCallRecording = z.infer<typeof insertCallRecordingSchema>;

// Promo codes schema
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  type: text("type").notNull(), // percentage, fixed
  value: doublePrecision("value").notNull(),
  service: text("service"), // Optional - specific service or null for all services
  expirationDate: date("expiration_date").notNull(),
  usageLimit: integer("usage_limit").notNull(),
  usedCount: integer("used_count").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({
  id: true,
  usedCount: true,
  createdAt: true,
});

export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;

// Staff schedules schema
export const staffSchedules = pgTable("staff_schedules", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  dayOfWeek: text("day_of_week").notNull(), // Monday, Tuesday, etc.
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  location: text("location").notNull(),
  serviceCategories: text("service_categories").array().default([]), // Array of category IDs
  startDate: date("start_date").notNull(),
  endDate: date("end_date"), // Optional end date
  isBlocked: boolean("is_blocked").default(false), // If true, staff is unavailable
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStaffScheduleSchema = createInsertSchema(staffSchedules).omit({
  id: true,
  createdAt: true,
});

export type StaffSchedule = typeof staffSchedules.$inferSelect;
export type InsertStaffSchedule = z.infer<typeof insertStaffScheduleSchema>;

// Time clock entries schema
export const timeClockEntries = pgTable("time_clock_entries", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  clockInTime: timestamp("clock_in_time").notNull(),
  clockOutTime: timestamp("clock_out_time"),
  totalHours: doublePrecision("total_hours"), // Calculated when clocking out
  breakTime: doublePrecision("break_time").default(0), // Minutes
  notes: text("notes"), // Optional notes for the time entry
  status: text("status").notNull().default("clocked_in"), // clocked_in, clocked_out
  location: text("location"), // Where they clocked in/out
  externalId: text("external_id").unique(), // ID from external time clock system
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTimeClockEntrySchema = createInsertSchema(timeClockEntries).omit({
  id: true,
  totalHours: true,
  createdAt: true,
});

export type TimeClockEntry = typeof timeClockEntries.$inferSelect;
export type InsertTimeClockEntry = z.infer<typeof insertTimeClockEntrySchema>;

// Payroll history schema - for storing generated payroll reports
export const payrollHistory = pgTable("payroll_history", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  periodStart: timestamp("period_start").notNull(), // Start date of payroll period
  periodEnd: timestamp("period_end").notNull(), // End date of payroll period
  periodType: text("period_type").notNull().default("monthly"), // monthly, weekly, biweekly
  totalHours: doublePrecision("total_hours").default(0),
  totalServices: integer("total_services").default(0),
  totalRevenue: doublePrecision("total_revenue").default(0),
  totalCommission: doublePrecision("total_commission").default(0),
  totalHourlyPay: doublePrecision("total_hourly_pay").default(0),
  totalFixedPay: doublePrecision("total_fixed_pay").default(0),
  totalEarnings: doublePrecision("total_earnings").notNull(),
  commissionType: text("commission_type").notNull(), // commission, hourly, fixed, hourly_plus_commission
  baseCommissionRate: doublePrecision("base_commission_rate"),
  hourlyRate: doublePrecision("hourly_rate"),
  fixedRate: doublePrecision("fixed_rate"),
  earningsBreakdown: text("earnings_breakdown"), // JSON string with detailed breakdown
  timeEntriesData: text("time_entries_data"), // JSON string with time clock data
  appointmentsData: text("appointments_data"), // JSON string with appointment details
  payrollStatus: text("payroll_status").notNull().default("generated"), // generated, reviewed, approved, paid
  generatedBy: integer("generated_by"), // User ID who generated the payroll
  reviewedBy: integer("reviewed_by"), // User ID who reviewed the payroll
  approvedBy: integer("approved_by"), // User ID who approved the payroll
  paidDate: timestamp("paid_date"), // When payroll was marked as paid
  notes: text("notes"), // Additional notes for this payroll period
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPayrollHistorySchema = createInsertSchema(payrollHistory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PayrollHistory = typeof payrollHistory.$inferSelect;
export type InsertPayrollHistory = z.infer<typeof insertPayrollHistorySchema>;

// Email unsubscribes schema (global unsubscribe tracking)
export const emailUnsubscribes = pgTable("email_unsubscribes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  email: text("email").notNull(),
  unsubscribedAt: timestamp("unsubscribed_at").defaultNow(),
  campaignId: integer("campaign_id"), // Which campaign triggered the unsubscribe
  reason: text("reason"), // Optional reason for unsubscribing
  ipAddress: text("ip_address"), // Track where unsubscribe came from
});

export const insertEmailUnsubscribeSchema = createInsertSchema(emailUnsubscribes).omit({
  id: true,
  unsubscribedAt: true,
});

export type EmailUnsubscribe = typeof emailUnsubscribes.$inferSelect;
export type InsertEmailUnsubscribe = z.infer<typeof insertEmailUnsubscribeSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

// Notifications schema for tracking real system events
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // appointment_booked, appointment_cancelled, payment_received, new_membership, etc.
  title: text("title").notNull(),
  description: text("description").notNull(),
  message: text("message"), // Additional message content
  userId: integer("user_id"), // Who the notification is for (optional - can be system-wide)
  relatedId: integer("related_id"), // ID of related entity (appointment, payment, etc.)
  relatedType: text("related_type"), // appointment, payment, membership, etc.
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Sales History schema - comprehensive tracking of all transactions
export const salesHistory = pgTable("sales_history", {
  id: serial("id").primaryKey(),
  
  // Transaction identification
  transactionType: text("transaction_type").notNull(), // "appointment", "pos_sale", "membership"
  transactionDate: timestamp("transaction_date").notNull(),
  
  // Payment information
  paymentId: integer("payment_id"), // Links to payments table
  totalAmount: doublePrecision("total_amount").notNull(),
  paymentMethod: text("payment_method").notNull(), // "cash", "card", "check"
  paymentStatus: text("payment_status").notNull().default("completed"), // "completed", "refunded", "failed"
  
  // Customer information
  clientId: integer("client_id"),
  clientName: text("client_name"),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  
  // Staff information (for appointments)
  staffId: integer("staff_id"),
  staffName: text("staff_name"),
  
  // Appointment-specific data
  appointmentId: integer("appointment_id"),
  serviceIds: text("service_ids"), // JSON array of service IDs
  serviceNames: text("service_names"), // JSON array of service names
  serviceTotalAmount: doublePrecision("service_total_amount"),
  
  // POS-specific data
  productIds: text("product_ids"), // JSON array of product IDs  
  productNames: text("product_names"), // JSON array of product names
  productQuantities: text("product_quantities"), // JSON array of quantities
  productUnitPrices: text("product_unit_prices"), // JSON array of unit prices
  productTotalAmount: doublePrecision("product_total_amount"),
  
  // Membership-specific data
  membershipId: integer("membership_id"),
  membershipName: text("membership_name"),
  membershipDuration: integer("membership_duration"), // in months
  
  // Tax and fees
  taxAmount: doublePrecision("tax_amount").default(0),
  tipAmount: doublePrecision("tip_amount").default(0),
  discountAmount: doublePrecision("discount_amount").default(0),
  
  // Business insights
  businessDate: date("business_date"), // Date for business day grouping
  dayOfWeek: text("day_of_week"),
  monthYear: text("month_year"), // Format: "2025-06" for easy monthly grouping
  quarter: text("quarter"), // Format: "2025-Q2"
  
  // External tracking
  squarePaymentId: text("square_payment_id"),
  
  // Audit trail
  createdBy: integer("created_by"), // User who created the record
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSalesHistorySchema = createInsertSchema(salesHistory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SalesHistory = typeof salesHistory.$inferSelect;
export type InsertSalesHistory = z.infer<typeof insertSalesHistorySchema>;



// Type definitions
export type AppointmentHistory = typeof appointmentHistory.$inferSelect;
export type InsertAppointmentHistory = z.infer<typeof insertAppointmentHistorySchema>;

// Business Settings schema
export const businessSettings = pgTable("business_settings", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull(),
  businessLogo: text("business_logo"), // Base64 encoded logo or URL
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  timezone: text("timezone").default("America/New_York"),
  currency: text("currency").default("USD"),
  taxRate: doublePrecision("tax_rate").default(0.08),
  receiptFooter: text("receipt_footer"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBusinessSettingsSchema = createInsertSchema(businessSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type BusinessSettings = typeof businessSettings.$inferSelect;
export type InsertBusinessSettings = z.infer<typeof insertBusinessSettingsSchema>;

// Automation Rules schema
export const automationRules = pgTable("automation_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "email" or "sms"
  trigger: text("trigger").notNull(), // "appointment_reminder", "follow_up", "birthday", etc.
  timing: text("timing").notNull(), // "24 hours before", "1 day after", "immediately", etc.
  template: text("template").notNull(),
  subject: text("subject"), // Only for email type
  active: boolean("active").default(true),
  customTriggerName: text("custom_trigger_name"), // For custom triggers
  sentCount: integer("sent_count").default(0),
  lastRun: timestamp("last_run"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// FAQ Categories schema
export const businessKnowledgeCategories = pgTable("business_knowledge_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#3B82F6"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// FAQ and Business Knowledge schema
export const businessKnowledge = pgTable("business_knowledge", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => businessKnowledgeCategories.id),
  category: text("category").notNull(), // "pricing", "services", "policies", "hours", "location", "faq"
  title: text("title").notNull(),
  content: text("content").notNull(),
  keywords: text("keywords"), // Comma-separated keywords for better matching
  priority: integer("priority").default(1), // Higher priority items are used more frequently
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// LLM Conversation History schema
export const llmConversations = pgTable("llm_conversations", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => users.id),
  clientMessage: text("client_message").notNull(),
  aiResponse: text("ai_response").notNull(),
  channel: text("channel").notNull(), // "email" or "sms"
  confidence: doublePrecision("confidence"),
  suggestedActions: text("suggested_actions"), // JSON string of suggested actions
  metadata: text("metadata"), // JSON string of additional data
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAutomationRuleSchema = createInsertSchema(automationRules).omit({
  id: true,
  sentCount: true,
  lastRun: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBusinessKnowledgeCategorySchema = createInsertSchema(businessKnowledgeCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBusinessKnowledgeSchema = createInsertSchema(businessKnowledge).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLLMConversationSchema = createInsertSchema(llmConversations).omit({
  id: true,
  createdAt: true,
});

export type AutomationRule = typeof automationRules.$inferSelect;
export type InsertAutomationRule = z.infer<typeof insertAutomationRuleSchema>;

// Forms schema
export const forms = pgTable("forms", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // intake, feedback, booking, etc.
  status: text("status").notNull().default("active"), // active, draft, inactive
  fields: text("fields"), // JSON string of form fields
  submissions: integer("submissions").default(0),
  lastSubmission: date("last_submission"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
  createdAt: true,
  lastSubmission: true,
}).extend({
  fields: z.union([z.array(z.any()), z.string()]).optional().transform((val) => {
    if (Array.isArray(val)) {
      return JSON.stringify(val);
    }
    return val;
  }),
});

// Form submissions schema
export const formSubmissions = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull(),
  clientId: integer("client_id"), // Links to users table for client identification
  formData: text("form_data").notNull(), // JSON string of form data
  submittedAt: timestamp("submitted_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFormSubmissionSchema = createInsertSchema(formSubmissions).omit({
  id: true,
  createdAt: true,
});

export type FormSubmission = typeof formSubmissions.$inferSelect;
export type InsertFormSubmission = typeof formSubmissions.$inferInsert;

export type Form = typeof forms.$inferSelect & {
  fields?: any[] | string | null; // Can be either parsed array or JSON string
  submissions?: number | null; // Add submissions field to the type
};
export type InsertForm = z.infer<typeof insertFormSchema>;

export type BusinessKnowledgeCategory = typeof businessKnowledgeCategories.$inferSelect;
export type InsertBusinessKnowledgeCategory = z.infer<typeof insertBusinessKnowledgeCategorySchema>;

export type BusinessKnowledge = typeof businessKnowledge.$inferSelect;
export type InsertBusinessKnowledge = z.infer<typeof insertBusinessKnowledgeSchema>;

export type LLMConversation = typeof llmConversations.$inferSelect;
export type InsertLLMConversation = z.infer<typeof insertLLMConversationSchema>;

// Check Software Integration types
export type CheckSoftwareProvider = typeof checkSoftwareProviders.$inferSelect;
export type InsertCheckSoftwareProvider = typeof checkSoftwareProviders.$inferInsert;

export type PayrollCheck = typeof payrollChecks.$inferSelect;
export type InsertPayrollCheck = typeof payrollChecks.$inferInsert;

export type CheckSoftwareLog = typeof checkSoftwareLogs.$inferSelect;
export type InsertCheckSoftwareLog = typeof checkSoftwareLogs.$inferInsert;

export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;

// Check Software Integration schema
export const checkSoftwareProviders = pgTable("check_software_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // "quickbooks", "adp", "gusto", "paychex", "square", "custom"
  displayName: text("display_name").notNull(),
  apiKey: text("api_key"),
  apiSecret: text("api_secret"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  webhookUrl: text("webhook_url"),
  companyId: text("company_id"),
  locationId: text("location_id"),
  isActive: boolean("is_active").default(true),
  config: text("config"), // JSON string with provider-specific configuration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payroll Check Processing schema
export const payrollChecks = pgTable("payroll_checks", {
  id: serial("id").primaryKey(),
  payrollHistoryId: integer("payroll_history_id").references(() => payrollHistory.id),
  staffId: integer("staff_id").notNull(),
  checkNumber: text("check_number"),
  checkAmount: doublePrecision("check_amount").notNull(),
  checkDate: timestamp("check_date").notNull(),
  providerId: integer("provider_id").references(() => checkSoftwareProviders.id),
  providerCheckId: text("provider_check_id"), // External check ID from provider
  status: text("status").notNull().default("pending"), // pending, issued, cleared, voided
  issueDate: timestamp("issue_date"),
  clearDate: timestamp("clear_date"),
  voidDate: timestamp("void_date"),
  voidReason: text("void_reason"),
  checkImageUrl: text("check_image_url"), // URL to check image if available
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Check Software API Logs schema
export const checkSoftwareLogs = pgTable("check_software_logs", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").references(() => checkSoftwareProviders.id),
  action: text("action").notNull(), // "create_check", "void_check", "sync_payroll", etc.
  status: text("status").notNull(), // "success", "error", "pending"
  requestData: text("request_data"), // JSON string of request sent to provider
  responseData: text("response_data"), // JSON string of response from provider
  errorMessage: text("error_message"),
  payrollCheckId: integer("payroll_check_id").references(() => payrollChecks.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// System Configuration schema
export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // "openai_api_key", "sendgrid_api_key", etc.
  value: text("value"), // The actual configuration value
  description: text("description"), // Human-readable description
  isEncrypted: boolean("is_encrypted").default(false), // Whether the value is encrypted
  category: text("category").default("general"), // "ai", "email", "sms", "payment", etc.
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSystemConfigSchema = createInsertSchema(systemConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
