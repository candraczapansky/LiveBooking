import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, date, time } from "drizzle-orm/pg-core";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("client"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  profilePicture: text("profile_picture"),
  squareCustomerId: text("square_customer_id"),
  helcimCustomerId: text("helcim_customer_id"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  emailAccountManagement: boolean("email_account_management").default(true),
  emailAppointmentReminders: boolean("email_appointment_reminders").default(true),
  emailPromotions: boolean("email_promotions").default(false),
  smsAccountManagement: boolean("sms_account_management").default(false),
  smsAppointmentReminders: boolean("sms_appointment_reminders").default(true),
  smsPromotions: boolean("sms_promotions").default(false),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorBackupCodes: text("two_factor_backup_codes"),
  twoFactorMethod: text("two_factor_method").default("authenticator"),
  twoFactorEmailCode: text("two_factor_email_code"),
  twoFactorEmailCodeExpiry: timestamp("two_factor_email_code_expiry"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Locations table
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  phone: text("phone"),
  email: text("email"),
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service Categories table
export const serviceCategories = pgTable("service_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#667eea"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Services table
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(),
  price: doublePrecision("price").notNull(),
  categoryId: integer("category_id").references(() => serviceCategories.id),
  color: text("color"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Staff table
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title"),
  bio: text("bio"),
  specialties: text("specialties").array(),
  isActive: boolean("is_active").default(true),
  hireDate: date("hire_date"),
  terminationDate: date("termination_date"),
  hourlyRate: doublePrecision("hourly_rate"),
  commissionRate: doublePrecision("commission_rate"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Staff Services junction table
export const staffServices = pgTable("staff_services", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id),
  serviceId: integer("service_id").references(() => services.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Rooms table
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  locationId: integer("location_id").references(() => locations.id),
  capacity: integer("capacity").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Staff Schedules table
export const staffSchedules = pgTable("staff_schedules", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id),
  locationId: integer("location_id").references(() => locations.id),
  dayOfWeek: text("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isBlocked: boolean("is_blocked").default(false),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Marketing Campaigns table
export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  audience: text("audience").notNull(),
  subject: text("subject"),
  content: text("content").notNull(),
  htmlContent: text("html_content"),
  templateDesign: text("template_design"),
  sendDate: timestamp("send_date"),
  status: text("status").notNull().default("draft"),
  sentCount: integer("sent_count").default(0),
  deliveredCount: integer("delivered_count").default(0),
  failedCount: integer("failed_count").default(0),
  openedCount: integer("opened_count").default(0),
  clickedCount: integer("clicked_count").default(0),
  unsubscribedCount: integer("unsubscribed_count").default(0),
  sentAt: timestamp("sent_at"),
  targetClientIds: text("target_client_ids").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Appointments table
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => users.id),
  staffId: integer("staff_id").references(() => staff.id),
  serviceId: integer("service_id").references(() => services.id),
  roomId: integer("room_id").references(() => rooms.id),
  locationId: integer("location_id").references(() => locations.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").default("pending"),
  paymentStatus: text("payment_status").default("unpaid"),
  totalAmount: doublePrecision("total_amount"),
  tipAmount: doublePrecision("tip_amount"),
  discountAmount: doublePrecision("discount_amount"),
  taxAmount: doublePrecision("tax_amount"),
  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
  paymentDate: timestamp("payment_date"),
  confirmationSent: boolean("confirmation_sent").default(false),
  reminderSent: boolean("reminder_sent").default(false),
  cancellationReason: text("cancellation_reason"),
  rescheduledFrom: integer("rescheduled_from"),
  rescheduledTo: integer("rescheduled_to"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
