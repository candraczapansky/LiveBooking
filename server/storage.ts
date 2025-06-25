import {
  users, User, InsertUser,
  serviceCategories, ServiceCategory, InsertServiceCategory,
  rooms, Room, InsertRoom,
  devices, Device, InsertDevice,
  services, Service, InsertService,
  products, Product, InsertProduct,
  staff, Staff, InsertStaff,
  staffServices, StaffService, InsertStaffService,
  appointments, Appointment, InsertAppointment,
  memberships, Membership, InsertMembership,
  clientMemberships, ClientMembership, InsertClientMembership,
  payments, Payment, InsertPayment,
  staffEarnings, insertStaffEarningsSchema,
  savedPaymentMethods, SavedPaymentMethod, InsertSavedPaymentMethod,
  savedGiftCards, SavedGiftCard, InsertSavedGiftCard,
  giftCards, GiftCard, InsertGiftCard,
  giftCardTransactions, GiftCardTransaction, InsertGiftCardTransaction,
  marketingCampaigns, MarketingCampaign, InsertMarketingCampaign,
  marketingCampaignRecipients, MarketingCampaignRecipient, InsertMarketingCampaignRecipient,
  emailUnsubscribes, EmailUnsubscribe, InsertEmailUnsubscribe,
  promoCodes, PromoCode, InsertPromoCode,
  staffSchedules, StaffSchedule, InsertStaffSchedule
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, gte, lte, desc, asc, isNull, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User>;

  // Service Category operations
  createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory>;
  getServiceCategory(id: number): Promise<ServiceCategory | undefined>;
  getAllServiceCategories(): Promise<ServiceCategory[]>;
  updateServiceCategory(id: number, categoryData: Partial<InsertServiceCategory>): Promise<ServiceCategory>;
  deleteServiceCategory(id: number): Promise<boolean>;

  // Room operations
  createRoom(room: InsertRoom): Promise<Room>;
  getRoom(id: number): Promise<Room | undefined>;
  getAllRooms(): Promise<Room[]>;
  updateRoom(id: number, roomData: Partial<InsertRoom>): Promise<Room>;
  deleteRoom(id: number): Promise<boolean>;

  // Device operations
  createDevice(device: InsertDevice): Promise<Device>;
  getDevice(id: number): Promise<Device | undefined>;
  getAllDevices(): Promise<Device[]>;
  updateDevice(id: number, deviceData: Partial<InsertDevice>): Promise<Device>;
  deleteDevice(id: number): Promise<boolean>;

  // Service operations
  createService(service: InsertService): Promise<Service>;
  getService(id: number): Promise<Service | undefined>;
  getServicesByCategory(categoryId: number): Promise<Service[]>;
  getAllServices(): Promise<Service[]>;
  updateService(id: number, serviceData: Partial<InsertService>): Promise<Service>;
  deleteService(id: number): Promise<boolean>;

  // Product operations
  createProduct(product: InsertProduct): Promise<Product>;
  getProduct(id: number): Promise<Product | undefined>;
  getAllProducts(): Promise<Product[]>;
  updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<boolean>;
  updateProductStock(id: number, quantity: number): Promise<Product>;

  // Staff operations
  createStaff(staffMember: InsertStaff): Promise<Staff>;
  getStaff(id: number): Promise<Staff | undefined>;
  getStaffByUserId(userId: number): Promise<Staff | undefined>;
  getAllStaff(): Promise<Staff[]>;
  updateStaff(id: number, staffData: Partial<InsertStaff>): Promise<Staff>;
  deleteStaff(id: number): Promise<boolean>;

  // Staff Service operations
  assignServiceToStaff(staffService: InsertStaffService): Promise<StaffService>;
  getStaffServices(staffId: number): Promise<StaffService[]>;
  getStaffServicesByService(serviceId: number): Promise<StaffService[]>;
  getStaffServiceById(id: number): Promise<StaffService | undefined>;
  updateStaffService(id: number, data: Partial<InsertStaffService>): Promise<StaffService>;
  removeServiceFromStaff(staffId: number, serviceId: number): Promise<boolean>;

  // Appointment operations
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAllAppointments(): Promise<Appointment[]>;
  getAppointmentsByClient(clientId: number): Promise<Appointment[]>;
  getAppointmentsByStaff(staffId: number): Promise<Appointment[]>;
  getAppointmentsByDate(date: Date): Promise<Appointment[]>;
  updateAppointment(id: number, appointmentData: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: number): Promise<boolean>;

  // Membership operations
  createMembership(membership: InsertMembership): Promise<Membership>;
  getMembership(id: number): Promise<Membership | undefined>;
  getAllMemberships(): Promise<Membership[]>;
  updateMembership(id: number, membershipData: Partial<InsertMembership>): Promise<Membership>;
  deleteMembership(id: number): Promise<boolean>;

  // Client Membership operations
  createClientMembership(clientMembership: InsertClientMembership): Promise<ClientMembership>;
  getClientMembership(id: number): Promise<ClientMembership | undefined>;
  getClientMembershipsByClient(clientId: number): Promise<ClientMembership[]>;
  updateClientMembership(id: number, data: Partial<InsertClientMembership>): Promise<ClientMembership>;
  deleteClientMembership(id: number): Promise<boolean>;

  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByClient(clientId: number): Promise<Payment[]>;
  getAllPayments(): Promise<Payment[]>;
  updatePayment(id: number, paymentData: Partial<InsertPayment>): Promise<Payment>;

  // Saved Payment Methods operations
  createSavedPaymentMethod(paymentMethod: InsertSavedPaymentMethod): Promise<SavedPaymentMethod>;
  getSavedPaymentMethod(id: number): Promise<SavedPaymentMethod | undefined>;
  getSavedPaymentMethodsByClient(clientId: number): Promise<SavedPaymentMethod[]>;
  updateSavedPaymentMethod(id: number, data: Partial<InsertSavedPaymentMethod>): Promise<SavedPaymentMethod>;
  deleteSavedPaymentMethod(id: number): Promise<boolean>;
  setDefaultPaymentMethod(clientId: number, paymentMethodId: number): Promise<boolean>;

  // User Square operations
  updateUserSquareCustomerId(userId: number, squareCustomerId: string): Promise<User>;

  // Gift Card operations
  createGiftCard(giftCard: InsertGiftCard): Promise<GiftCard>;
  getGiftCard(id: number): Promise<GiftCard | undefined>;
  getGiftCardByCode(code: string): Promise<GiftCard | undefined>;
  getAllGiftCards(): Promise<GiftCard[]>;
  updateGiftCard(id: number, giftCardData: Partial<InsertGiftCard>): Promise<GiftCard>;
  deleteGiftCard(id: number): Promise<boolean>;

  // Gift Card Transaction operations
  createGiftCardTransaction(transaction: InsertGiftCardTransaction): Promise<GiftCardTransaction>;
  getGiftCardTransaction(id: number): Promise<GiftCardTransaction | undefined>;
  getGiftCardTransactionsByCard(giftCardId: number): Promise<GiftCardTransaction[]>;

  // Saved Gift Card operations
  createSavedGiftCard(savedGiftCard: InsertSavedGiftCard): Promise<SavedGiftCard>;
  getSavedGiftCard(id: number): Promise<SavedGiftCard | undefined>;
  getSavedGiftCardsByClient(clientId: number): Promise<SavedGiftCard[]>;
  deleteSavedGiftCard(id: number): Promise<boolean>;

  // Marketing Campaign operations
  createMarketingCampaign(campaign: InsertMarketingCampaign): Promise<MarketingCampaign>;
  getMarketingCampaign(id: number): Promise<MarketingCampaign | undefined>;
  getAllMarketingCampaigns(): Promise<MarketingCampaign[]>;
  updateMarketingCampaign(id: number, campaignData: Partial<InsertMarketingCampaign>): Promise<MarketingCampaign>;
  deleteMarketingCampaign(id: number): Promise<boolean>;

  // Marketing Campaign Recipient operations
  createMarketingCampaignRecipient(recipient: InsertMarketingCampaignRecipient): Promise<MarketingCampaignRecipient>;
  getMarketingCampaignRecipient(id: number): Promise<MarketingCampaignRecipient | undefined>;
  getMarketingCampaignRecipients(campaignId: number): Promise<MarketingCampaignRecipient[]>;
  updateMarketingCampaignRecipient(id: number, data: Partial<InsertMarketingCampaignRecipient>): Promise<MarketingCampaignRecipient>;
  getMarketingCampaignRecipientByToken(token: string): Promise<MarketingCampaignRecipient | undefined>;

  // Email unsubscribe operations
  createEmailUnsubscribe(unsubscribe: InsertEmailUnsubscribe): Promise<EmailUnsubscribe>;
  getEmailUnsubscribe(userId: number): Promise<EmailUnsubscribe | undefined>;
  getAllEmailUnsubscribes(): Promise<EmailUnsubscribe[]>;
  isUserUnsubscribed(email: string): Promise<boolean>;

  // Promo code operations
  createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode>;
  getPromoCode(id: number): Promise<PromoCode | undefined>;
  getPromoCodeByCode(code: string): Promise<PromoCode | undefined>;
  getAllPromoCodes(): Promise<PromoCode[]>;
  updatePromoCode(id: number, promoCodeData: Partial<InsertPromoCode>): Promise<PromoCode>;
  deletePromoCode(id: number): Promise<boolean>;

  // Staff Schedule operations
  createStaffSchedule(schedule: InsertStaffSchedule): Promise<StaffSchedule>;
  getStaffSchedule(id: number): Promise<StaffSchedule | undefined>;
  getAllStaffSchedules(): Promise<StaffSchedule[]>;
  getStaffSchedulesByStaffId(staffId: number): Promise<StaffSchedule[]>;
  updateStaffSchedule(id: number, scheduleData: Partial<InsertStaffSchedule>): Promise<StaffSchedule>;
  deleteStaffSchedule(id: number): Promise<boolean>;

  // User filtering for campaigns
  getUsersByAudience(audience: string): Promise<User[]>;
  
  // Staff Earnings operations
  createStaffEarnings(earnings: any): Promise<any>;
  getStaffEarnings(staffId: number, month?: Date): Promise<any[]>;
  getAllStaffEarnings(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize with sample data for demo purposes
    this.initializeSampleData().catch(err => {
      console.error("Failed to initialize sample data:", err);
    });
  }

  private async initializeSampleData() {
    try {
      // Check if data already exists
      const existingUsers = await db.select().from(users).limit(1);
      if (existingUsers.length > 0) {
        console.log("Sample data already exists, skipping initialization");
        return;
      }

      // Create admin user
      await this.createUser({
        username: 'admin',
        password: 'password',
        email: 'admin@beautybook.com',
        role: 'admin',
        firstName: 'Sarah',
        lastName: 'Johnson',
        phone: '555-123-4567'
      });

      // Create sample service categories
      const hairCategory = await this.createServiceCategory({
        name: 'Hair Services',
        description: 'Professional hair styling, cutting, and coloring services'
      });

      const facialCategory = await this.createServiceCategory({
        name: 'Facial Treatments',
        description: 'Skincare and facial rejuvenation treatments'
      });

      // Create sample rooms
      await this.createRoom({
        name: 'Treatment Room 1',
        description: 'Main treatment room for facials and individual services',
        capacity: 1,
        isActive: true
      });

      await this.createRoom({
        name: 'Treatment Room 2', 
        description: 'Secondary treatment room for massages and body treatments',
        capacity: 1,
        isActive: true
      });

      // Create sample devices
      await this.createDevice({
        name: 'Professional Hair Dryer Station 1',
        description: 'High-speed ionic hair dryer for quick styling',
        deviceType: 'hair_dryer',
        brand: 'Dyson',
        model: 'Supersonic HD07',
        serialNumber: 'DYS001234',
        purchaseDate: '2024-01-15',
        warrantyExpiry: '2026-01-15',
        status: 'available',
        isActive: true
      });

      // Create sample services
      await this.createService({
        name: "Women's Haircut & Style",
        description: "Professional haircut with styling",
        duration: 60,
        price: 75,
        categoryId: hairCategory.id,
        bufferTimeBefore: 0,
        bufferTimeAfter: 0,
        color: "#3B82F6"
      });

      await this.createService({
        name: "Men's Haircut",
        description: "Classic men's haircut",
        duration: 45,
        price: 45,
        categoryId: hairCategory.id,
        bufferTimeBefore: 0,
        bufferTimeAfter: 0,
        color: "#3B82F6"
      });

      // Create staff user and staff member
      const staffUser = await this.createUser({
        username: 'stylist1',
        password: 'password',
        email: 'emma.martinez@beautybook.com',
        role: 'staff',
        firstName: 'Emma',
        lastName: 'Martinez',
        phone: '555-234-5678'
      });

      await this.createStaff({
        userId: staffUser.id,
        title: 'Senior Hair Stylist',
        bio: 'Emma has over 8 years of experience in hair styling and coloring. She specializes in modern cuts and color correction.',
        commissionType: 'commission',
        commissionRate: 0.45
      });

      console.log("Sample data initialized successfully");
    } catch (error) {
      console.error("Error initializing sample data:", error);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    if (!updatedUser) {
      throw new Error('User not found');
    }
    return updatedUser;
  }

  // Service Category operations
  async createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory> {
    const [newCategory] = await db.insert(serviceCategories).values(category).returning();
    return newCategory;
  }

  async getServiceCategory(id: number): Promise<ServiceCategory | undefined> {
    const [category] = await db.select().from(serviceCategories).where(eq(serviceCategories.id, id));
    return category;
  }

  async getAllServiceCategories(): Promise<ServiceCategory[]> {
    return await db.select().from(serviceCategories);
  }

  async updateServiceCategory(id: number, categoryData: Partial<InsertServiceCategory>): Promise<ServiceCategory> {
    const [updated] = await db.update(serviceCategories).set(categoryData).where(eq(serviceCategories.id, id)).returning();
    if (!updated) throw new Error('Service category not found');
    return updated;
  }

  async deleteServiceCategory(id: number): Promise<boolean> {
    const result = await db.delete(serviceCategories).where(eq(serviceCategories.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Room operations
  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db.insert(rooms).values(room).returning();
    return newRoom;
  }

  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async getAllRooms(): Promise<Room[]> {
    return await db.select().from(rooms);
  }

  async updateRoom(id: number, roomData: Partial<InsertRoom>): Promise<Room> {
    const [updated] = await db.update(rooms).set(roomData).where(eq(rooms.id, id)).returning();
    if (!updated) throw new Error('Room not found');
    return updated;
  }

  async deleteRoom(id: number): Promise<boolean> {
    const result = await db.delete(rooms).where(eq(rooms.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Device operations
  async createDevice(device: InsertDevice): Promise<Device> {
    const [newDevice] = await db.insert(devices).values(device).returning();
    return newDevice;
  }

  async getDevice(id: number): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device;
  }

  async getAllDevices(): Promise<Device[]> {
    return await db.select().from(devices);
  }

  async updateDevice(id: number, deviceData: Partial<InsertDevice>): Promise<Device> {
    const [updated] = await db.update(devices).set(deviceData).where(eq(devices.id, id)).returning();
    if (!updated) throw new Error('Device not found');
    return updated;
  }

  async deleteDevice(id: number): Promise<boolean> {
    const result = await db.delete(devices).where(eq(devices.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Service operations
  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async getServicesByCategory(categoryId: number): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.categoryId, categoryId));
  }

  async getAllServices(): Promise<Service[]> {
    return await db.select().from(services);
  }

  async updateService(id: number, serviceData: Partial<InsertService>): Promise<Service> {
    const [updated] = await db.update(services).set(serviceData).where(eq(services.id, id)).returning();
    if (!updated) throw new Error('Service not found');
    return updated;
  }

  async deleteService(id: number): Promise<boolean> {
    const result = await db.delete(services).where(eq(services.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Product operations
  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product> {
    const [updated] = await db.update(products).set(productData).where(eq(products.id, id)).returning();
    if (!updated) throw new Error('Product not found');
    return updated;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async updateProductStock(id: number, quantity: number): Promise<Product> {
    const [updated] = await db.update(products)
      .set({ 
        stock: sql`${products.stock} + ${quantity}` 
      })
      .where(eq(products.id, id))
      .returning();
    if (!updated) throw new Error('Product not found');
    return updated;
  }

  // Staff operations
  async createStaff(staffMember: InsertStaff): Promise<Staff> {
    const [newStaff] = await db.insert(staff).values(staffMember).returning();
    return newStaff;
  }

  async getStaff(id: number): Promise<Staff | undefined> {
    const [staffMember] = await db.select().from(staff).where(eq(staff.id, id));
    return staffMember;
  }

  async getStaffByUserId(userId: number): Promise<Staff | undefined> {
    const [staffMember] = await db.select().from(staff).where(eq(staff.userId, userId));
    return staffMember;
  }

  async getAllStaff(): Promise<Staff[]> {
    const allStaff = await db.select().from(staff);
    
    // Get user details for each staff member
    const staffWithUsers = await Promise.all(
      allStaff.map(async (staffMember) => {
        const user = await this.getUser(staffMember.userId);
        return {
          ...staffMember,
          user: user ? {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone
          } : null
        };
      })
    );
    
    return staffWithUsers;
  }

  async updateStaff(id: number, staffData: Partial<InsertStaff>): Promise<Staff> {
    const [updated] = await db.update(staff).set(staffData).where(eq(staff.id, id)).returning();
    if (!updated) throw new Error('Staff member not found');
    return updated;
  }

  async deleteStaff(id: number): Promise<boolean> {
    const result = await db.delete(staff).where(eq(staff.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Staff Service operations
  async assignServiceToStaff(staffService: InsertStaffService): Promise<StaffService> {
    const [newAssignment] = await db.insert(staffServices).values(staffService).returning();
    return newAssignment;
  }

  async getStaffServices(staffId: number): Promise<StaffService[]> {
    return await db.select().from(staffServices).where(eq(staffServices.staffId, staffId));
  }

  async getStaffServicesByService(serviceId: number): Promise<StaffService[]> {
    return await db.select().from(staffServices).where(eq(staffServices.serviceId, serviceId));
  }

  async getStaffServiceById(id: number): Promise<StaffService | undefined> {
    const [staffService] = await db.select().from(staffServices).where(eq(staffServices.id, id));
    return staffService;
  }

  async updateStaffService(id: number, data: Partial<InsertStaffService>): Promise<StaffService> {
    const [updated] = await db.update(staffServices).set(data).where(eq(staffServices.id, id)).returning();
    if (!updated) throw new Error('Staff service assignment not found');
    return updated;
  }

  async removeServiceFromStaff(staffId: number, serviceId: number): Promise<boolean> {
    const result = await db.delete(staffServices).where(
      and(
        eq(staffServices.staffId, staffId),
        eq(staffServices.serviceId, serviceId)
      )
    );
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Appointment operations
  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db.insert(appointments).values(appointment).returning();
    return newAppointment;
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment;
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments).orderBy(desc(appointments.createdAt));
  }

  async getAppointmentsByClient(clientId: number): Promise<Appointment[]> {
    return await db.select().from(appointments).where(eq(appointments.clientId, clientId));
  }

  async getAppointmentsByStaff(staffId: number): Promise<Appointment[]> {
    return await db.select().from(appointments).where(eq(appointments.staffId, staffId));
  }

  async getAppointmentsByDate(date: Date): Promise<Appointment[]> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    return await db.select().from(appointments).where(
      and(
        gte(appointments.startTime, targetDate),
        lte(appointments.startTime, nextDay)
      )
    );
  }

  async updateAppointment(id: number, appointmentData: Partial<InsertAppointment>): Promise<Appointment> {
    const [updated] = await db.update(appointments).set(appointmentData).where(eq(appointments.id, id)).returning();
    if (!updated) throw new Error('Appointment not found');
    return updated;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    const result = await db.delete(appointments).where(eq(appointments.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Membership operations
  async createMembership(membership: InsertMembership): Promise<Membership> {
    const [newMembership] = await db.insert(memberships).values(membership).returning();
    return newMembership;
  }

  async getMembership(id: number): Promise<Membership | undefined> {
    const [membership] = await db.select().from(memberships).where(eq(memberships.id, id));
    return membership;
  }

  async getAllMemberships(): Promise<Membership[]> {
    return await db.select().from(memberships);
  }

  async updateMembership(id: number, membershipData: Partial<InsertMembership>): Promise<Membership> {
    const [updated] = await db.update(memberships).set(membershipData).where(eq(memberships.id, id)).returning();
    if (!updated) throw new Error('Membership not found');
    return updated;
  }

  async deleteMembership(id: number): Promise<boolean> {
    const result = await db.delete(memberships).where(eq(memberships.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Client Membership operations
  async createClientMembership(clientMembership: InsertClientMembership): Promise<ClientMembership> {
    const [newMembership] = await db.insert(clientMemberships).values(clientMembership).returning();
    return newMembership;
  }

  async getClientMembership(id: number): Promise<ClientMembership | undefined> {
    const [membership] = await db.select().from(clientMemberships).where(eq(clientMemberships.id, id));
    return membership;
  }

  async getClientMembershipsByClient(clientId: number): Promise<ClientMembership[]> {
    return await db.select().from(clientMemberships).where(eq(clientMemberships.clientId, clientId));
  }

  async updateClientMembership(id: number, data: Partial<InsertClientMembership>): Promise<ClientMembership> {
    const [updated] = await db.update(clientMemberships).set(data).where(eq(clientMemberships.id, id)).returning();
    if (!updated) throw new Error('Client membership not found');
    return updated;
  }

  async deleteClientMembership(id: number): Promise<boolean> {
    const result = await db.delete(clientMemberships).where(eq(clientMemberships.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Payment operations
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async getPaymentsByClient(clientId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.clientId, clientId));
  }

  async getAllPayments(): Promise<Payment[]> {
    console.log("Fetching all payments for reports...");
    const allPayments = await db.select().from(payments);
    console.log("Found", allPayments.length, "payments");
    return allPayments;
  }

  async updatePayment(id: number, paymentData: Partial<InsertPayment>): Promise<Payment> {
    const [updated] = await db.update(payments).set(paymentData).where(eq(payments.id, id)).returning();
    if (!updated) throw new Error('Payment not found');
    return updated;
  }

  // Saved Payment Methods operations
  async createSavedPaymentMethod(paymentMethod: InsertSavedPaymentMethod): Promise<SavedPaymentMethod> {
    const [newMethod] = await db.insert(savedPaymentMethods).values(paymentMethod).returning();
    return newMethod;
  }

  async getSavedPaymentMethod(id: number): Promise<SavedPaymentMethod | undefined> {
    const [method] = await db.select().from(savedPaymentMethods).where(eq(savedPaymentMethods.id, id));
    return method;
  }

  async getSavedPaymentMethodsByClient(clientId: number): Promise<SavedPaymentMethod[]> {
    return await db.select().from(savedPaymentMethods).where(eq(savedPaymentMethods.clientId, clientId));
  }

  async updateSavedPaymentMethod(id: number, data: Partial<InsertSavedPaymentMethod>): Promise<SavedPaymentMethod> {
    const [updated] = await db.update(savedPaymentMethods).set(data).where(eq(savedPaymentMethods.id, id)).returning();
    if (!updated) throw new Error('Saved payment method not found');
    return updated;
  }

  async deleteSavedPaymentMethod(id: number): Promise<boolean> {
    const result = await db.delete(savedPaymentMethods).where(eq(savedPaymentMethods.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async setDefaultPaymentMethod(clientId: number, paymentMethodId: number): Promise<boolean> {
    // First, remove default status from all other payment methods for this client
    await db.update(savedPaymentMethods)
      .set({ isDefault: false })
      .where(eq(savedPaymentMethods.clientId, clientId));
    
    // Set the specified method as default
    await this.updateSavedPaymentMethod(paymentMethodId, { isDefault: true });
    return true;
  }

  async updateUserSquareCustomerId(userId: number, squareCustomerId: string): Promise<User> {
    return await this.updateUser(userId, { squareCustomerId });
  }

  // Gift Card operations
  async createGiftCard(giftCard: InsertGiftCard): Promise<GiftCard> {
    const [newCard] = await db.insert(giftCards).values(giftCard).returning();
    return newCard;
  }

  async getGiftCard(id: number): Promise<GiftCard | undefined> {
    const [card] = await db.select().from(giftCards).where(eq(giftCards.id, id));
    return card;
  }

  async getGiftCardByCode(code: string): Promise<GiftCard | undefined> {
    const [card] = await db.select().from(giftCards).where(eq(giftCards.code, code));
    return card;
  }

  async getAllGiftCards(): Promise<GiftCard[]> {
    return await db.select().from(giftCards);
  }

  async updateGiftCard(id: number, giftCardData: Partial<InsertGiftCard>): Promise<GiftCard> {
    const [updated] = await db.update(giftCards).set(giftCardData).where(eq(giftCards.id, id)).returning();
    if (!updated) throw new Error('Gift card not found');
    return updated;
  }

  async deleteGiftCard(id: number): Promise<boolean> {
    const result = await db.delete(giftCards).where(eq(giftCards.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Gift Card Transaction operations
  async createGiftCardTransaction(transaction: InsertGiftCardTransaction): Promise<GiftCardTransaction> {
    const [newTransaction] = await db.insert(giftCardTransactions).values(transaction).returning();
    return newTransaction;
  }

  async getGiftCardTransaction(id: number): Promise<GiftCardTransaction | undefined> {
    const [transaction] = await db.select().from(giftCardTransactions).where(eq(giftCardTransactions.id, id));
    return transaction;
  }

  async getGiftCardTransactionsByCard(giftCardId: number): Promise<GiftCardTransaction[]> {
    return await db.select().from(giftCardTransactions).where(eq(giftCardTransactions.giftCardId, giftCardId));
  }

  // Saved Gift Card operations
  async createSavedGiftCard(savedGiftCard: InsertSavedGiftCard): Promise<SavedGiftCard> {
    const [newCard] = await db.insert(savedGiftCards).values(savedGiftCard).returning();
    return newCard;
  }

  async getSavedGiftCard(id: number): Promise<SavedGiftCard | undefined> {
    const [card] = await db.select().from(savedGiftCards).where(eq(savedGiftCards.id, id));
    return card;
  }

  async getSavedGiftCardsByClient(clientId: number): Promise<SavedGiftCard[]> {
    return await db.select().from(savedGiftCards).where(eq(savedGiftCards.clientId, clientId));
  }

  async deleteSavedGiftCard(id: number): Promise<boolean> {
    const result = await db.delete(savedGiftCards).where(eq(savedGiftCards.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Marketing Campaign operations
  async createMarketingCampaign(campaign: InsertMarketingCampaign): Promise<MarketingCampaign> {
    const [newCampaign] = await db.insert(marketingCampaigns).values(campaign).returning();
    return newCampaign;
  }

  async getMarketingCampaign(id: number): Promise<MarketingCampaign | undefined> {
    const [campaign] = await db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, id));
    return campaign;
  }

  async getAllMarketingCampaigns(): Promise<MarketingCampaign[]> {
    return await db.select().from(marketingCampaigns).orderBy(desc(marketingCampaigns.createdAt));
  }

  async updateMarketingCampaign(id: number, campaignData: Partial<InsertMarketingCampaign>): Promise<MarketingCampaign> {
    const [updated] = await db.update(marketingCampaigns).set(campaignData).where(eq(marketingCampaigns.id, id)).returning();
    if (!updated) throw new Error('Marketing campaign not found');
    return updated;
  }

  async deleteMarketingCampaign(id: number): Promise<boolean> {
    const result = await db.delete(marketingCampaigns).where(eq(marketingCampaigns.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Marketing Campaign Recipient operations
  async createMarketingCampaignRecipient(recipient: InsertMarketingCampaignRecipient): Promise<MarketingCampaignRecipient> {
    const [newRecipient] = await db.insert(marketingCampaignRecipients).values(recipient).returning();
    return newRecipient;
  }

  async getMarketingCampaignRecipient(id: number): Promise<MarketingCampaignRecipient | undefined> {
    const [recipient] = await db.select().from(marketingCampaignRecipients).where(eq(marketingCampaignRecipients.id, id));
    return recipient;
  }

  async getMarketingCampaignRecipients(campaignId: number): Promise<MarketingCampaignRecipient[]> {
    return await db.select().from(marketingCampaignRecipients).where(eq(marketingCampaignRecipients.campaignId, campaignId));
  }

  async updateMarketingCampaignRecipient(id: number, data: Partial<InsertMarketingCampaignRecipient>): Promise<MarketingCampaignRecipient> {
    const [updated] = await db.update(marketingCampaignRecipients).set(data).where(eq(marketingCampaignRecipients.id, id)).returning();
    if (!updated) throw new Error('Marketing campaign recipient not found');
    return updated;
  }

  async getMarketingCampaignRecipientByToken(token: string): Promise<MarketingCampaignRecipient | undefined> {
    const [recipient] = await db.select().from(marketingCampaignRecipients).where(eq(marketingCampaignRecipients.unsubscribeToken, token));
    return recipient;
  }

  // Email unsubscribe operations
  async createEmailUnsubscribe(unsubscribe: InsertEmailUnsubscribe): Promise<EmailUnsubscribe> {
    const [newUnsubscribe] = await db.insert(emailUnsubscribes).values(unsubscribe).returning();
    return newUnsubscribe;
  }

  async getEmailUnsubscribe(userId: number): Promise<EmailUnsubscribe | undefined> {
    const [unsubscribe] = await db.select().from(emailUnsubscribes).where(eq(emailUnsubscribes.userId, userId));
    return unsubscribe;
  }

  async getAllEmailUnsubscribes(): Promise<EmailUnsubscribe[]> {
    return await db.select().from(emailUnsubscribes);
  }

  async isUserUnsubscribed(email: string): Promise<boolean> {
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (user.length === 0) return false;
    
    const unsubscribe = await this.getEmailUnsubscribe(user[0].id);
    return !!unsubscribe;
  }

  // Promo code operations
  async createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode> {
    const [newPromoCode] = await db.insert(promoCodes).values(promoCode).returning();
    return newPromoCode;
  }

  async getPromoCode(id: number): Promise<PromoCode | undefined> {
    const [promoCode] = await db.select().from(promoCodes).where(eq(promoCodes.id, id));
    return promoCode;
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | undefined> {
    const [promoCode] = await db.select().from(promoCodes).where(eq(promoCodes.code, code));
    return promoCode;
  }

  async getAllPromoCodes(): Promise<PromoCode[]> {
    return await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
  }

  async updatePromoCode(id: number, promoCodeData: Partial<InsertPromoCode>): Promise<PromoCode> {
    const [updatedPromoCode] = await db
      .update(promoCodes)
      .set(promoCodeData)
      .where(eq(promoCodes.id, id))
      .returning();
    return updatedPromoCode;
  }

  async deletePromoCode(id: number): Promise<boolean> {
    const result = await db.delete(promoCodes).where(eq(promoCodes.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Staff Schedule operations
  async createStaffSchedule(schedule: InsertStaffSchedule): Promise<StaffSchedule> {
    const [newSchedule] = await db.insert(staffSchedules).values(schedule).returning();
    return newSchedule;
  }

  async getStaffSchedule(id: number): Promise<StaffSchedule | undefined> {
    const [schedule] = await db.select().from(staffSchedules).where(eq(staffSchedules.id, id));
    return schedule;
  }

  async getAllStaffSchedules(): Promise<StaffSchedule[]> {
    return await db.select().from(staffSchedules).orderBy(staffSchedules.dayOfWeek, staffSchedules.startTime);
  }

  async getStaffSchedulesByStaffId(staffId: number): Promise<StaffSchedule[]> {
    return await db.select().from(staffSchedules).where(eq(staffSchedules.staffId, staffId)).orderBy(staffSchedules.dayOfWeek, staffSchedules.startTime);
  }

  async updateStaffSchedule(id: number, scheduleData: Partial<InsertStaffSchedule>): Promise<StaffSchedule> {
    const [updatedSchedule] = await db.update(staffSchedules).set(scheduleData).where(eq(staffSchedules.id, id)).returning();
    if (!updatedSchedule) {
      throw new Error('Staff schedule not found');
    }
    return updatedSchedule;
  }

  async deleteStaffSchedule(id: number): Promise<boolean> {
    const result = await db.delete(staffSchedules).where(eq(staffSchedules.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getUsersByAudience(audience: string): Promise<User[]> {
    const allUsers = await this.getAllUsers();
    
    switch (audience) {
      case 'all_clients':
        return allUsers.filter(user => user.role === 'client');
      case 'regular_clients':
        return allUsers.filter(user => user.role === 'client');
      case 'new_clients':
        return allUsers.filter(user => user.role === 'client');
      case 'vip_clients':
        return allUsers.filter(user => user.role === 'client');
      default:
        return allUsers.filter(user => user.role === 'client');
    }
  }

  // Staff Earnings operations
  async createStaffEarnings(earnings: any): Promise<any> {
    try {
      const [result] = await db.insert(staffEarnings).values(earnings).returning();
      return result;
    } catch (error) {
      console.error('Error creating staff earnings:', error);
      throw error;
    }
  }

  async getStaffEarnings(staffId: number, month?: Date): Promise<any[]> {
    try {
      let query = db.select().from(staffEarnings).where(eq(staffEarnings.staffId, staffId));
      
      if (month) {
        const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
        const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        query = query.where(and(
          eq(staffEarnings.staffId, staffId),
          gte(staffEarnings.earningsDate, startOfMonth),
          lte(staffEarnings.earningsDate, endOfMonth)
        ));
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting staff earnings:', error);
      return [];
    }
  }

  async getAllStaffEarnings(): Promise<any[]> {
    try {
      return await db.select().from(staffEarnings);
    } catch (error) {
      console.error('Error getting all staff earnings:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();
export { DatabaseStorage as PgStorage };