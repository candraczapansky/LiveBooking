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
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
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
  appointmentId: integer("appointment_id"),
  clientMembershipId: integer("client_membership_id"),
  amount: doublePrecision("amount").notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, failed, refunded
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paymentDate: timestamp("payment_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
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

export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
