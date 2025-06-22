import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("client"), // admin, staff, client
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Service Categories schema
export const serviceCategories = pgTable("service_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
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
  stripeSubscriptionId: text("stripe_subscription_id"),
});

export const insertClientMembershipSchema = createInsertSchema(clientMemberships).omit({
  id: true,
});

// Payments schema
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  appointmentId: integer("appointment_id"),
  clientMembershipId: integer("client_membership_id"),
  amount: doublePrecision("amount").notNull(),
  method: text("method").notNull().default("card"), // card, cash, check, etc.
  status: text("status").notNull().default("pending"), // pending, completed, failed, refunded
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paymentDate: timestamp("payment_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

// Saved payment methods schema
export const savedPaymentMethods = pgTable("saved_payment_methods", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  stripePaymentMethodId: text("stripe_payment_method_id").notNull(),
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

export type Membership = typeof memberships.$inferSelect;
export type InsertMembership = z.infer<typeof insertMembershipSchema>;

export type ClientMembership = typeof clientMemberships.$inferSelect;
export type InsertClientMembership = z.infer<typeof insertClientMembershipSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type SavedPaymentMethod = typeof savedPaymentMethods.$inferSelect;
export type InsertSavedPaymentMethod = z.infer<typeof insertSavedPaymentMethodSchema>;

export type SavedGiftCard = typeof savedGiftCards.$inferSelect;
export type InsertSavedGiftCard = z.infer<typeof insertSavedGiftCardSchema>;

export type GiftCard = typeof giftCards.$inferSelect;
export type InsertGiftCard = z.infer<typeof insertGiftCardSchema>;

export type GiftCardTransaction = typeof giftCardTransactions.$inferSelect;
export type InsertGiftCardTransaction = z.infer<typeof insertGiftCardTransactionSchema>;

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
  sendDate: timestamp("send_date"),
  status: text("status").notNull().default("draft"), // draft, scheduled, sent, failed
  sentCount: integer("sent_count").default(0),
  deliveredCount: integer("delivered_count").default(0),
  failedCount: integer("failed_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  sentAt: timestamp("sent_at"),
});

export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns).omit({
  id: true,
  createdAt: true,
  sentAt: true,
});

// Marketing campaign recipients schema (for tracking individual sends)
export const marketingCampaignRecipients = pgTable("marketing_campaign_recipients", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, sent, delivered, failed
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  errorMessage: text("error_message"),
});

export const insertMarketingCampaignRecipientSchema = createInsertSchema(marketingCampaignRecipients).omit({
  id: true,
});

export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
export type InsertMarketingCampaign = z.infer<typeof insertMarketingCampaignSchema>;

export type MarketingCampaignRecipient = typeof marketingCampaignRecipients.$inferSelect;
export type InsertMarketingCampaignRecipient = z.infer<typeof insertMarketingCampaignRecipientSchema>;
