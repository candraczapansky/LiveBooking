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
  appointmentHistory, AppointmentHistory, InsertAppointmentHistory,
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
  staffSchedules, StaffSchedule, InsertStaffSchedule,
  timeClockEntries, TimeClockEntry, InsertTimeClockEntry,
  userColorPreferences, UserColorPreferences, InsertUserColorPreferences,
  notifications, Notification, InsertNotification,
  payrollHistory, PayrollHistory, InsertPayrollHistory,
  salesHistory, SalesHistory, InsertSalesHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, gte, lte, desc, asc, isNull, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User>;
  setPasswordResetToken(userId: number, token: string, expiry: Date): Promise<void>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearPasswordResetToken(userId: number): Promise<void>;

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
  getAppointmentsByClient(clientId: number): Promise<any[]>;
  getAppointmentsByStaff(staffId: number): Promise<Appointment[]>;
  getAppointmentsByDate(date: Date): Promise<Appointment[]>;
  updateAppointment(id: number, appointmentData: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: number): Promise<boolean>;

  // Appointment History operations
  createAppointmentHistory(history: InsertAppointmentHistory): Promise<AppointmentHistory>;
  getAppointmentHistory(appointmentId: number): Promise<AppointmentHistory[]>;
  getAllAppointmentHistory(): Promise<AppointmentHistory[]>;

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

  // User Color Preferences operations
  getUserColorPreferences(userId: number): Promise<UserColorPreferences | undefined>;
  createUserColorPreferences(preferences: InsertUserColorPreferences): Promise<UserColorPreferences>;
  updateUserColorPreferences(userId: number, preferences: Partial<InsertUserColorPreferences>): Promise<UserColorPreferences>;

  // User filtering for campaigns
  getUsersByAudience(audience: string): Promise<User[]>;
  
  // Staff Earnings operations
  createStaffEarnings(earnings: any): Promise<any>;
  getStaffEarnings(staffId: number, month?: Date): Promise<any[]>;
  getAllStaffEarnings(): Promise<any[]>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getRecentNotifications(limit?: number): Promise<Notification[]>;
  getNotificationsByUser(userId: number, limit?: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<boolean>;

  // Time Clock operations
  createTimeClockEntry(entry: InsertTimeClockEntry): Promise<TimeClockEntry>;
  getTimeClockEntry(id: number): Promise<TimeClockEntry | undefined>;
  getAllTimeClockEntries(): Promise<TimeClockEntry[]>;
  getTimeClockEntriesByStaffId(staffId: number): Promise<TimeClockEntry[]>;
  getTimeClockEntryByExternalId(externalId: string): Promise<TimeClockEntry | undefined>;
  updateTimeClockEntry(id: number, entryData: Partial<InsertTimeClockEntry>): Promise<TimeClockEntry>;
  deleteTimeClockEntry(id: number): Promise<boolean>;
  getStaffByName(name: string): Promise<Staff | undefined>;

  // Payroll History operations
  createPayrollHistory(payrollHistory: InsertPayrollHistory): Promise<PayrollHistory>;
  getPayrollHistory(id: number): Promise<PayrollHistory | undefined>;
  getPayrollHistoryByStaff(staffId: number): Promise<PayrollHistory[]>;
  getPayrollHistoryByPeriod(staffId: number, periodStart: Date, periodEnd: Date): Promise<PayrollHistory | undefined>;
  getAllPayrollHistory(): Promise<PayrollHistory[]>;
  updatePayrollHistory(id: number, payrollData: Partial<InsertPayrollHistory>): Promise<PayrollHistory>;
  deletePayrollHistory(id: number): Promise<boolean>;

  // Sales History operations
  createSalesHistory(salesHistory: InsertSalesHistory): Promise<SalesHistory>;
  getSalesHistory(id: number): Promise<SalesHistory | undefined>;
  getSalesHistoryByDateRange(startDate: Date, endDate: Date): Promise<SalesHistory[]>;
  getSalesHistoryByTransactionType(transactionType: string): Promise<SalesHistory[]>;
  getSalesHistoryByClient(clientId: number): Promise<SalesHistory[]>;
  getSalesHistoryByStaff(staffId: number): Promise<SalesHistory[]>;
  getSalesHistoryByMonth(monthYear: string): Promise<SalesHistory[]>;
  getAllSalesHistory(): Promise<SalesHistory[]>;
  updateSalesHistory(id: number, salesData: Partial<InsertSalesHistory>): Promise<SalesHistory>;
  deleteSalesHistory(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  private users: Map<number, User>;
  private serviceCategories: Map<number, ServiceCategory>;
  private rooms: Map<number, Room>;
  private devices: Map<number, Device>;
  private services: Map<number, Service>;
  private staff: Map<number, Staff>;

  private appointments: Map<number, Appointment>;
  private memberships: Map<number, Membership>;
  private clientMemberships: Map<number, ClientMembership>;
  private payments: Map<number, Payment>;
  private savedPaymentMethods: Map<number, SavedPaymentMethod>;
  private giftCards: Map<number, GiftCard>;
  private giftCardTransactions: Map<number, GiftCardTransaction>;
  private savedGiftCards: Map<number, SavedGiftCard>;
  private marketingCampaigns: Map<number, MarketingCampaign>;
  private marketingCampaignRecipients: Map<number, MarketingCampaignRecipient>;
  private emailUnsubscribes: Map<number, EmailUnsubscribe>;

  private currentUserId: number;
  private currentServiceCategoryId: number;
  private currentRoomId: number;
  private currentDeviceId: number;
  private currentServiceId: number;
  private currentStaffId: number;

  private currentAppointmentId: number;
  private currentMembershipId: number;
  private currentClientMembershipId: number;
  private currentPaymentId: number;
  private currentSavedPaymentMethodId: number;
  private currentGiftCardId: number;
  private currentGiftCardTransactionId: number;
  private currentSavedGiftCardId: number;
  private currentMarketingCampaignId: number;
  private currentMarketingCampaignRecipientId: number;
  private currentEmailUnsubscribeId: number;

  constructor() {
    this.users = new Map();
    this.serviceCategories = new Map();
    this.rooms = new Map();
    this.devices = new Map();
    this.services = new Map();
    this.staff = new Map();

    this.appointments = new Map();
    this.memberships = new Map();
    this.clientMemberships = new Map();
    this.payments = new Map();
    this.savedPaymentMethods = new Map();
    this.giftCards = new Map();
    this.giftCardTransactions = new Map();
    this.savedGiftCards = new Map();
    this.marketingCampaigns = new Map();
    this.marketingCampaignRecipients = new Map();
    this.emailUnsubscribes = new Map();

    this.currentUserId = 1;
    this.currentServiceCategoryId = 1;
    this.currentRoomId = 1;
    this.currentDeviceId = 1;
    this.currentServiceId = 1;
    this.currentStaffId = 1;

    this.currentAppointmentId = 1;
    this.currentMembershipId = 1;
    this.currentClientMembershipId = 1;
    this.currentPaymentId = 1;
    this.currentSavedPaymentMethodId = 1;
    this.currentGiftCardId = 1;
    this.currentGiftCardTransactionId = 1;
    this.currentSavedGiftCardId = 1;
    this.currentMarketingCampaignId = 1;
    this.currentMarketingCampaignRecipientId = 1;
    this.currentEmailUnsubscribeId = 1;

    // Initialize with sample data for demo purposes - DISABLED to prevent service duplication
    // this.initializeSampleData();
  }

  private async initializeSampleData() {
    // Create admin user if not exists
    const existingAdmin = await this.getUserByUsername('admin');
    if (!existingAdmin) {
      await this.createUser({
        username: 'admin',
        password: 'password',
        email: 'admin@beautybook.com',
        role: 'admin',
        firstName: 'Sarah',
        lastName: 'Johnson',
        phone: '555-123-4567'
      });
    }

    // Create sample service categories only if they don't exist
    const existingCategories = await this.getAllServiceCategories();
    
    if (!existingCategories.find(c => c.name === 'Hair Services')) {
      this.createServiceCategory({
        name: 'Hair Services',
        description: 'Professional hair styling, cutting, and coloring services'
      });
    }

    if (!existingCategories.find(c => c.name === 'Facial Treatments')) {
      this.createServiceCategory({
        name: 'Facial Treatments',
        description: 'Skincare and facial rejuvenation treatments'
      });
    }

    // Create sample rooms
    this.createRoom({
      name: 'Treatment Room 1',
      description: 'Main treatment room for facials and individual services',
      capacity: 1,
      isActive: true
    });

    this.createRoom({
      name: 'Treatment Room 2', 
      description: 'Secondary treatment room for massages and body treatments',
      capacity: 1,
      isActive: true
    });

    this.createRoom({
      name: 'Styling Station Area',
      description: 'Open area with multiple styling stations',
      capacity: 4,
      isActive: true
    });

    // Create sample devices
    this.createDevice({
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

    this.createDevice({
      name: 'Luxury Massage Table 1',
      description: 'Electric height-adjustable massage table with heating',
      deviceType: 'massage_table',
      brand: 'Earthlite',
      model: 'Ellora Vista',
      serialNumber: 'EL789456',
      purchaseDate: '2023-08-20',
      warrantyExpiry: '2025-08-20',
      status: 'available',
      isActive: true
    });

    this.createDevice({
      name: 'Hydraulic Styling Chair A',
      description: 'Professional salon chair with 360-degree rotation',
      deviceType: 'styling_chair',
      brand: 'Takara Belmont',
      model: 'Apollo II',
      serialNumber: 'TB345678',
      purchaseDate: '2023-05-10',
      warrantyExpiry: '2028-05-10',
      status: 'in_use',
      isActive: true
    });

    this.createDevice({
      name: 'Facial Steamer Pro',
      description: 'Professional ozone facial steamer for deep cleansing',
      deviceType: 'facial_steamer',
      brand: 'Lucas',
      model: 'Champagne 701',
      serialNumber: 'LC112233',
      purchaseDate: '2024-03-01',
      status: 'maintenance',
      isActive: true
    });

    // Create sample staff user (if not exists)
    this.getUserByUsername('stylist1').then(existingUser => {
      if (!existingUser) {
        this.createUser({
          username: 'stylist1',
          password: 'password',
          email: 'emma.martinez@beautybook.com',
          role: 'staff',
          firstName: 'Emma',
          lastName: 'Martinez',
          phone: '555-234-5678'
        });
      }
    });

    // Create staff member profile after creating the staff user
    this.getUserByUsername('stylist1').then(async existingUser => {
      if (existingUser) {
        // Check if staff profile already exists
        const existingStaff = await this.getStaffByUserId(existingUser.id);
        if (!existingStaff) {
          this.createStaff({
            userId: existingUser.id,
            title: 'Senior Hair Stylist',
            bio: 'Emma has over 8 years of experience in hair styling and coloring. She specializes in modern cuts and color correction.',
            commissionType: 'commission',
            commissionRate: 0.45, // 45% commission
            photoUrl: null
          });
        }
      }
    });

    // Create sample services only if they don't exist
    const existingServices = await this.getAllServices();
    
    if (!existingServices.find(s => s.name === 'Women\'s Haircut & Style')) {
      this.createService({
        name: 'Women\'s Haircut & Style',
        description: 'Professional haircut with wash, cut, and styling',
        duration: 60,
        price: 85.00,
        categoryId: 1, // Hair Services category
        roomId: 3, // Styling Station Area
        bufferTimeBefore: 10,
        bufferTimeAfter: 10,
        color: '#FF6B9D'
      });
    }

    if (!existingServices.find(s => s.name === 'Color & Highlights')) {
      this.createService({
        name: 'Color & Highlights',
        description: 'Full color service with highlights and toning',
        duration: 120,
        price: 150.00,
        categoryId: 1, // Hair Services category
        roomId: 3, // Styling Station Area
        bufferTimeBefore: 15,
        bufferTimeAfter: 15,
        color: '#8B5CF6'
      });
    }

    if (!existingServices.find(s => s.name === 'Deep Cleansing Facial')) {
      this.createService({
        name: 'Deep Cleansing Facial',
        description: 'Relaxing facial treatment with deep pore cleansing and moisturizing',
        duration: 90,
        price: 95.00,
        categoryId: 2, // Facial Treatments category
        roomId: 1, // Treatment Room 1
        bufferTimeBefore: 10,
        bufferTimeAfter: 10,
        color: '#10B981'
      });
    }

    // Assign services to staff member
    this.assignServiceToStaff({
      staffId: 1, // Emma Martinez
      serviceId: 1, // Women's Haircut & Style
      customRate: null,
      customCommissionRate: null
    });

    this.assignServiceToStaff({
      staffId: 1, // Emma Martinez  
      serviceId: 2, // Color & Highlights
      customRate: null,
      customCommissionRate: 0.50 // Higher commission for complex color work
    });

    // Create sample completed appointments for payroll testing
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Create some appointments this month
    this.createAppointment({
      clientId: 1, // Admin user as client for testing
      serviceId: 1, // Women's Haircut & Style
      staffId: 1, // Emma Martinez
      startTime: new Date(thisMonth.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days into month
      endTime: new Date(thisMonth.getTime() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // +1 hour
      status: 'completed',
      notes: 'Regular haircut and style service'
    });

    this.createAppointment({
      clientId: 1,
      serviceId: 2, // Color & Highlights
      staffId: 1, // Emma Martinez
      startTime: new Date(thisMonth.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days into month
      endTime: new Date(thisMonth.getTime() + 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // +2 hours
      status: 'completed',
      notes: 'Full color and highlights treatment'
    });

    this.createAppointment({
      clientId: 1,
      serviceId: 1, // Women's Haircut & Style
      staffId: 1, // Emma Martinez
      startTime: new Date(thisMonth.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days into month
      endTime: new Date(thisMonth.getTime() + 15 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // +1 hour
      status: 'completed',
      notes: 'Follow-up styling appointment'
    });

    // Create sample membership
    this.createMembership({
      name: 'Premium',
      description: 'Monthly premium membership with discounts',
      price: 49.99,
      duration: 30, // 30 days
      benefits: 'Includes 10% off all services, one free blowout per month'
    });

    // Create sample gift cards
    // Gift cards will be created through the purchase system
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
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    try {
      const [updatedUser] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
      if (!updatedUser) {
        throw new Error('User not found');
      }
      return updatedUser;
    } catch (error) {
      console.error('Drizzle update failed, trying direct SQL approach:', error);
      
      // Fallback to direct SQL for field mapping issues
      const updateFields: string[] = [];
      const values: any[] = [];

      // Map frontend field names to database column names
      Object.keys(userData).forEach(key => {
        const value = (userData as any)[key];
        if (value !== undefined) {
          switch (key) {
            case 'firstName':
              updateFields.push('first_name = ?');
              values.push(value);
              break;
            case 'lastName':
              updateFields.push('last_name = ?');
              values.push(value);
              break;
            case 'zipCode':
              updateFields.push('zip_code = ?');
              values.push(value);
              break;
            case 'profilePicture':
              updateFields.push('profile_picture = ?');
              values.push(value);
              break;
            case 'squareCustomerId':
              updateFields.push('stripe_customer_id = ?');
              values.push(value);
              break;
            case 'emailAccountManagement':
              updateFields.push('email_account_management = ?');
              values.push(value);
              break;
            case 'emailAppointmentReminders':
              updateFields.push('email_appointment_reminders = ?');
              values.push(value);
              break;
            case 'emailPromotions':
              updateFields.push('email_promotions = ?');
              values.push(value);
              break;
            case 'smsAccountManagement':
              updateFields.push('sms_account_management = ?');
              values.push(value);
              break;
            case 'smsAppointmentReminders':
              updateFields.push('sms_appointment_reminders = ?');
              values.push(value);
              break;
            case 'smsPromotions':
              updateFields.push('sms_promotions = ?');
              values.push(value);
              break;
            default:
              // Fields that don't need mapping (email, phone, username, password, etc.)
              updateFields.push(`${key} = ?`);
              values.push(value);
              break;
          }
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(id);
      const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ? RETURNING *`;
      
      console.log('Executing fallback SQL:', updateQuery);
      console.log('With values:', values);
      
      // Use template literal SQL 
      let sqlQuery = updateQuery;
      values.forEach((value, index) => {
        sqlQuery = sqlQuery.replace('?', `$${index + 1}`);
      });
      
      console.log('Final SQL Query:', sqlQuery);
      
      // Use the underlying neon client directly for parameterized queries
      const result = await (db as any).execute(sqlQuery, values);
      
      if (!result.rows || result.rows.length === 0) {
        throw new Error('User not found');
      }
      
      return result.rows[0] as User;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async setPasswordResetToken(userId: number, token: string, expiry: Date): Promise<void> {
    await db.update(users)
      .set({ 
        resetToken: token, 
        resetTokenExpiry: expiry 
      })
      .where(eq(users.id, userId));
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(
        eq(users.resetToken, token),
        gte(users.resetTokenExpiry, new Date())
      )
    );
    return user;
  }

  async clearPasswordResetToken(userId: number): Promise<void> {
    await db.update(users)
      .set({ 
        resetToken: null, 
        resetTokenExpiry: null 
      })
      .where(eq(users.id, userId));
  }

  // Service Category operations
  async createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory> {
    const [newCategory] = await db.insert(serviceCategories).values(category).returning();
    return newCategory;
  }

  async getServiceCategory(id: number): Promise<ServiceCategory | undefined> {
    return this.serviceCategories.get(id);
  }

  async getAllServiceCategories(): Promise<ServiceCategory[]> {
    return await db.select().from(serviceCategories);
  }

  async updateServiceCategory(id: number, categoryData: Partial<InsertServiceCategory>): Promise<ServiceCategory> {
    const category = await this.getServiceCategory(id);
    if (!category) {
      throw new Error('Service category not found');
    }
    const updatedCategory = { ...category, ...categoryData };
    this.serviceCategories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteServiceCategory(id: number): Promise<boolean> {
    return this.serviceCategories.delete(id);
  }

  // Room operations
  async createRoom(room: InsertRoom): Promise<Room> {
    const id = this.currentRoomId++;
    const newRoom = { ...room, id } as Room;
    this.rooms.set(id, newRoom);
    return newRoom;
  }

  async getRoom(id: number): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async getAllRooms(): Promise<Room[]> {
    return Array.from(this.rooms.values());
  }

  async updateRoom(id: number, roomData: Partial<InsertRoom>): Promise<Room> {
    const existingRoom = this.rooms.get(id);
    if (!existingRoom) {
      throw new Error("Room not found");
    }
    const updatedRoom: Room = { ...existingRoom, ...roomData };
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }

  async deleteRoom(id: number): Promise<boolean> {
    return this.rooms.delete(id);
  }

  // Device operations
  async createDevice(device: InsertDevice): Promise<Device> {
    const id = this.currentDeviceId++;
    const newDevice = { ...device, id } as Device;
    this.devices.set(id, newDevice);
    return newDevice;
  }

  async getDevice(id: number): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async getAllDevices(): Promise<Device[]> {
    return Array.from(this.devices.values());
  }

  async updateDevice(id: number, deviceData: Partial<InsertDevice>): Promise<Device> {
    const existingDevice = this.devices.get(id);
    if (!existingDevice) {
      throw new Error(`Device with id ${id} not found`);
    }
    const updatedDevice: Device = { ...existingDevice, ...deviceData };
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }

  async deleteDevice(id: number): Promise<boolean> {
    return this.devices.delete(id);
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
    const categoryServices = await db.select().from(services).where(eq(services.categoryId, categoryId));
    return categoryServices;
  }

  async getAllServices(): Promise<Service[]> {
    const allServices = await db.select().from(services);
    return allServices;
  }

  async updateService(id: number, serviceData: Partial<InsertService>): Promise<Service> {
    const [updatedService] = await db
      .update(services)
      .set(serviceData)
      .where(eq(services.id, id))
      .returning();
    
    if (!updatedService) {
      throw new Error('Service not found');
    }
    
    return updatedService;
  }

  async deleteService(id: number): Promise<boolean> {
    const result = await db.delete(services).where(eq(services.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Staff operations
  async createStaff(staffMember: InsertStaff): Promise<Staff> {
    try {
      const [result] = await db.insert(staff).values(staffMember).returning();
      console.log('Created staff record:', result);
      return result;
    } catch (error) {
      console.error('Error creating staff:', error);
      throw error;
    }
  }

  async getStaff(id: number): Promise<Staff | undefined> {
    try {
      const [result] = await db.select().from(staff).where(eq(staff.id, id));
      return result;
    } catch (error) {
      console.error('Error getting staff by id:', error);
      return undefined;
    }
  }

  async getStaffByUserId(userId: number): Promise<Staff | undefined> {
    try {
      const [result] = await db.select().from(staff).where(eq(staff.userId, userId));
      return result;
    } catch (error) {
      console.error('Error getting staff by user id:', error);
      return undefined;
    }
  }

  async getAllStaff(): Promise<Staff[]> {
    try {
      const result = await db.select().from(staff).orderBy(staff.id);
      console.log('Retrieved staff from database:', result);
      return result;
    } catch (error) {
      console.error('Error getting staff:', error);
      return [];
    }
  }

  async updateStaff(id: number, staffData: Partial<InsertStaff>): Promise<Staff> {
    try {
      const [result] = await db.update(staff).set(staffData).where(eq(staff.id, id)).returning();
      if (!result) {
        throw new Error('Staff member not found');
      }
      return result;
    } catch (error) {
      console.error('Error updating staff:', error);
      throw error;
    }
  }

  async deleteStaff(id: number): Promise<boolean> {
    try {
      const result = await db.delete(staff).where(eq(staff.id, id));
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Error deleting staff:', error);
      return false;
    }
  }

  // Staff Service operations
  async assignServiceToStaff(staffService: InsertStaffService): Promise<StaffService> {
    try {
      const [newStaffService] = await db.insert(staffServices).values(staffService).returning();
      return newStaffService;
    } catch (error) {
      console.error('Error assigning service to staff:', error);
      throw error;
    }
  }

  async getStaffServices(staffId: number): Promise<StaffService[]> {
    try {
      return await db.select().from(staffServices).where(eq(staffServices.staffId, staffId));
    } catch (error) {
      console.error('Error getting staff services:', error);
      return [];
    }
  }

  async getStaffServicesByService(serviceId: number): Promise<StaffService[]> {
    try {
      return await db.select().from(staffServices).where(eq(staffServices.serviceId, serviceId));
    } catch (error) {
      console.error('Error getting staff services by service:', error);
      return [];
    }
  }

  async getStaffServiceById(id: number): Promise<StaffService | undefined> {
    try {
      const [staffService] = await db.select().from(staffServices).where(eq(staffServices.id, id));
      return staffService;
    } catch (error) {
      console.error('Error getting staff service by id:', error);
      return undefined;
    }
  }

  async updateStaffService(id: number, data: Partial<InsertStaffService>): Promise<StaffService> {
    try {
      const [updatedStaffService] = await db
        .update(staffServices)
        .set(data)
        .where(eq(staffServices.id, id))
        .returning();
      
      if (!updatedStaffService) {
        throw new Error("Staff service not found");
      }
      
      return updatedStaffService;
    } catch (error) {
      console.error('Error updating staff service:', error);
      throw error;
    }
  }

  async removeServiceFromStaff(staffId: number, serviceId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(staffServices)
        .where(and(eq(staffServices.staffId, staffId), eq(staffServices.serviceId, serviceId)));
      
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error removing service from staff:', error);
      return false;
    }
  }

  // Appointment operations
  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db.insert(appointments).values(appointment).returning();
    
    // Create appointment history entry for tracking
    await this.createAppointmentHistory({
      appointmentId: newAppointment.id,
      action: 'created',
      actionBy: null,
      actionByRole: 'system',
      previousValues: null,
      newValues: JSON.stringify(newAppointment),
      clientId: newAppointment.clientId,
      serviceId: newAppointment.serviceId,
      staffId: newAppointment.staffId,
      startTime: newAppointment.startTime,
      endTime: newAppointment.endTime,
      status: newAppointment.status,
      paymentStatus: newAppointment.paymentStatus,
      totalAmount: newAppointment.totalAmount,
      notes: newAppointment.notes,
      systemGenerated: true
    });
    
    return newAppointment;
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment;
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments).orderBy(desc(appointments.startTime));
  }

  async getAppointmentsByClient(clientId: number): Promise<any[]> {
    const clientAppointments = await db
      .select()
      .from(appointments)
      .where(eq(appointments.clientId, clientId))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .leftJoin(staff, eq(appointments.staffId, staff.id))
      .leftJoin(users, eq(staff.userId, users.id))
      .orderBy(desc(appointments.startTime));

    return clientAppointments.map(row => ({
      ...row.appointments,
      service: row.services,
      staff: row.staff ? {
        ...row.staff,
        user: row.users
      } : null
    }));
  }

  async getAppointmentsByStaff(staffId: number): Promise<Appointment[]> {
    return await db.select().from(appointments).where(eq(appointments.staffId, staffId)).orderBy(desc(appointments.startTime));
  }

  async getAppointmentsByDate(date: Date): Promise<Appointment[]> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    
    return await db.select().from(appointments).where(
      and(
        gte(appointments.startTime, startOfDay),
        lte(appointments.startTime, endOfDay)
      )
    ).orderBy(appointments.startTime);
  }

  async updateAppointment(id: number, appointmentData: Partial<InsertAppointment>): Promise<Appointment> {
    const existingAppointment = await this.getAppointment(id);
    if (!existingAppointment) {
      throw new Error('Appointment not found');
    }
    
    const [updatedAppointment] = await db
      .update(appointments)
      .set(appointmentData)
      .where(eq(appointments.id, id))
      .returning();
    
    if (!updatedAppointment) {
      throw new Error('Failed to update appointment');
    }
    
    // Create appointment history entry for tracking
    await this.createAppointmentHistory({
      appointmentId: id,
      action: 'updated',
      actionBy: null,
      actionByRole: 'system',
      previousValues: JSON.stringify(existingAppointment),
      newValues: JSON.stringify(updatedAppointment),
      clientId: updatedAppointment.clientId,
      serviceId: updatedAppointment.serviceId,
      staffId: updatedAppointment.staffId,
      startTime: updatedAppointment.startTime,
      endTime: updatedAppointment.endTime,
      status: updatedAppointment.status,
      paymentStatus: updatedAppointment.paymentStatus,
      totalAmount: updatedAppointment.totalAmount,
      notes: updatedAppointment.notes,
      systemGenerated: true
    });
    
    return updatedAppointment;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    const existingAppointment = await this.getAppointment(id);
    if (!existingAppointment) {
      return false;
    }
    
    // Create appointment history entry for tracking
    await this.createAppointmentHistory({
      appointmentId: id,
      action: 'deleted',
      actionBy: null,
      actionByRole: 'system',
      previousValues: JSON.stringify(existingAppointment),
      newValues: null,
      clientId: existingAppointment.clientId,
      serviceId: existingAppointment.serviceId,
      staffId: existingAppointment.staffId,
      startTime: existingAppointment.startTime,
      endTime: existingAppointment.endTime,
      status: existingAppointment.status,
      paymentStatus: existingAppointment.paymentStatus,
      totalAmount: existingAppointment.totalAmount,
      notes: existingAppointment.notes,
      systemGenerated: true
    });
    
    const result = await db.delete(appointments).where(eq(appointments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Appointment History operations
  async createAppointmentHistory(history: InsertAppointmentHistory): Promise<AppointmentHistory> {
    const [newHistory] = await db.insert(appointmentHistory).values(history).returning();
    return newHistory;
  }

  async getAppointmentHistory(appointmentId: number): Promise<AppointmentHistory[]> {
    return await db.select().from(appointmentHistory).where(eq(appointmentHistory.appointmentId, appointmentId)).orderBy(desc(appointmentHistory.createdAt));
  }

  async getAllAppointmentHistory(): Promise<AppointmentHistory[]> {
    return await db.select().from(appointmentHistory).orderBy(desc(appointmentHistory.createdAt));
  }

  // Membership operations
  async createMembership(membership: InsertMembership): Promise<Membership> {
    const id = this.currentMembershipId++;
    const newMembership = { ...membership, id } as Membership;
    this.memberships.set(id, newMembership);
    return newMembership;
  }

  async getMembership(id: number): Promise<Membership | undefined> {
    return this.memberships.get(id);
  }

  async getAllMemberships(): Promise<Membership[]> {
    return Array.from(this.memberships.values());
  }

  async updateMembership(id: number, membershipData: Partial<InsertMembership>): Promise<Membership> {
    const membership = await this.getMembership(id);
    if (!membership) {
      throw new Error('Membership not found');
    }
    const updatedMembership = { ...membership, ...membershipData };
    this.memberships.set(id, updatedMembership);
    return updatedMembership;
  }

  async deleteMembership(id: number): Promise<boolean> {
    return this.memberships.delete(id);
  }

  // Client Membership operations
  async createClientMembership(clientMembership: InsertClientMembership): Promise<ClientMembership> {
    const id = this.currentClientMembershipId++;
    const newClientMembership = { ...clientMembership, id } as ClientMembership;
    this.clientMemberships.set(id, newClientMembership);
    return newClientMembership;
  }

  async getClientMembership(id: number): Promise<ClientMembership | undefined> {
    return this.clientMemberships.get(id);
  }

  async getClientMembershipsByClient(clientId: number): Promise<ClientMembership[]> {
    return Array.from(this.clientMemberships.values()).filter(
      (clientMembership) => clientMembership.clientId === clientId
    );
  }

  async updateClientMembership(id: number, data: Partial<InsertClientMembership>): Promise<ClientMembership> {
    const clientMembership = await this.getClientMembership(id);
    if (!clientMembership) {
      throw new Error('Client membership not found');
    }
    const updatedClientMembership = { ...clientMembership, ...data };
    this.clientMemberships.set(id, updatedClientMembership);
    return updatedClientMembership;
  }

  async deleteClientMembership(id: number): Promise<boolean> {
    return this.clientMemberships.delete(id);
  }

  // Payment operations
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.currentPaymentId++;
    // @ts-ignore - Type assertion for demo data
    const newPayment = { ...payment, id, createdAt: new Date() } as Payment;
    this.payments.set(id, newPayment);
    return newPayment;
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async getPaymentsByClient(clientId: number): Promise<Payment[]> {
    // Get all client's appointments
    const clientAppointments = await this.getAppointmentsByClient(clientId);
    const appointmentIds = clientAppointments.map(appointment => appointment.id);
    
    // Get all client's memberships
    const clientMemberships = await this.getClientMembershipsByClient(clientId);
    const membershipIds = clientMemberships.map(membership => membership.id);
    
    // Get payments related to appointments or memberships
    return Array.from(this.payments.values()).filter(
      (payment) => 
        (payment.appointmentId && appointmentIds.includes(payment.appointmentId)) ||
        (payment.clientMembershipId && membershipIds.includes(payment.clientMembershipId))
    );
  }

  async getAllPayments(): Promise<Payment[]> {
    return Array.from(this.payments.values());
  }

  async updatePayment(id: number, paymentData: Partial<InsertPayment>): Promise<Payment> {
    const payment = await this.getPayment(id);
    if (!payment) {
      throw new Error('Payment not found');
    }
    const updatedPayment = { ...payment, ...paymentData };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }

  // Saved Payment Methods operations
  async createSavedPaymentMethod(paymentMethod: InsertSavedPaymentMethod): Promise<SavedPaymentMethod> {
    const id = this.currentSavedPaymentMethodId++;
    const savedMethod: SavedPaymentMethod = {
      id,
      ...paymentMethod,
      isDefault: paymentMethod.isDefault || false,
      createdAt: new Date()
    };
    this.savedPaymentMethods.set(id, savedMethod);
    return savedMethod;
  }

  async getSavedPaymentMethod(id: number): Promise<SavedPaymentMethod | undefined> {
    return this.savedPaymentMethods.get(id);
  }

  async getSavedPaymentMethodsByClient(clientId: number): Promise<SavedPaymentMethod[]> {
    return Array.from(this.savedPaymentMethods.values()).filter(
      method => method.clientId === clientId
    );
  }

  async updateSavedPaymentMethod(id: number, data: Partial<InsertSavedPaymentMethod>): Promise<SavedPaymentMethod> {
    const method = await this.getSavedPaymentMethod(id);
    if (!method) {
      throw new Error('Saved payment method not found');
    }
    const updatedMethod = { ...method, ...data };
    this.savedPaymentMethods.set(id, updatedMethod);
    return updatedMethod;
  }

  async deleteSavedPaymentMethod(id: number): Promise<boolean> {
    return this.savedPaymentMethods.delete(id);
  }

  async setDefaultPaymentMethod(clientId: number, paymentMethodId: number): Promise<boolean> {
    // First, remove default status from all other payment methods for this client
    const clientMethods = await this.getSavedPaymentMethodsByClient(clientId);
    for (const method of clientMethods) {
      if (method.isDefault) {
        await this.updateSavedPaymentMethod(method.id, { isDefault: false });
      }
    }
    
    // Set the specified method as default
    await this.updateSavedPaymentMethod(paymentMethodId, { isDefault: true });
    return true;
  }

  async updateUserSquareCustomerId(userId: number, squareCustomerId: string): Promise<User> {
    return this.updateUser(userId, { squareCustomerId });
  }

  // Gift Card operations
  async createGiftCard(giftCard: InsertGiftCard): Promise<GiftCard> {
    const [newGiftCard] = await db.insert(giftCards).values(giftCard).returning();
    return newGiftCard;
  }

  async getGiftCard(id: number): Promise<GiftCard | undefined> {
    const [giftCard] = await db.select().from(giftCards).where(eq(giftCards.id, id));
    return giftCard;
  }

  async getGiftCardByCode(code: string): Promise<GiftCard | undefined> {
    const [giftCard] = await db.select().from(giftCards).where(eq(giftCards.code, code));
    return giftCard;
  }

  async getAllGiftCards(): Promise<GiftCard[]> {
    return await db.select().from(giftCards).orderBy(desc(giftCards.createdAt));
  }

  async updateGiftCard(id: number, giftCardData: Partial<InsertGiftCard>): Promise<GiftCard> {
    const [updatedGiftCard] = await db
      .update(giftCards)
      .set(giftCardData)
      .where(eq(giftCards.id, id))
      .returning();
    if (!updatedGiftCard) {
      throw new Error('Gift card not found');
    }
    return updatedGiftCard;
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
    return await db.select().from(giftCardTransactions)
      .where(eq(giftCardTransactions.giftCardId, giftCardId))
      .orderBy(desc(giftCardTransactions.createdAt));
  }

  // Saved Gift Card operations
  async createSavedGiftCard(savedGiftCard: InsertSavedGiftCard): Promise<SavedGiftCard> {
    const [newSavedGiftCard] = await db.insert(savedGiftCards).values(savedGiftCard).returning();
    return newSavedGiftCard;
  }

  async getSavedGiftCard(id: number): Promise<SavedGiftCard | undefined> {
    const [savedCard] = await db.select().from(savedGiftCards).where(eq(savedGiftCards.id, id));
    return savedCard;
  }

  async getSavedGiftCardsByClient(clientId: number): Promise<SavedGiftCard[]> {
    return await db.select().from(savedGiftCards)
      .where(eq(savedGiftCards.clientId, clientId))
      .orderBy(desc(savedGiftCards.addedAt));
  }

  async deleteSavedGiftCard(id: number): Promise<boolean> {
    const result = await db.delete(savedGiftCards).where(eq(savedGiftCards.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Marketing Campaign operations
  async createMarketingCampaign(campaign: InsertMarketingCampaign): Promise<MarketingCampaign> {
    const [newCampaign] = await db
      .insert(marketingCampaigns)
      .values({
        ...campaign,
        sendDate: campaign.sendDate ? (typeof campaign.sendDate === 'string' ? new Date(campaign.sendDate) : campaign.sendDate) : null,
      })
      .returning();
    return newCampaign;
  }

  async getMarketingCampaign(id: number): Promise<MarketingCampaign | undefined> {
    const [campaign] = await db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, id));
    return campaign || undefined;
  }

  async getAllMarketingCampaigns(): Promise<MarketingCampaign[]> {
    return await db.select().from(marketingCampaigns).orderBy(marketingCampaigns.createdAt);
  }

  async updateMarketingCampaign(id: number, campaignData: Partial<InsertMarketingCampaign>): Promise<MarketingCampaign> {
    // Handle date conversion for sendDate if it's a string
    const processedData = { ...campaignData };
    if (processedData.sendDate && typeof processedData.sendDate === 'string') {
      processedData.sendDate = new Date(processedData.sendDate);
    }
    if (processedData.sentAt && typeof processedData.sentAt === 'string') {
      processedData.sentAt = new Date(processedData.sentAt);
    }

    const [updatedCampaign] = await db
      .update(marketingCampaigns)
      .set(processedData)
      .where(eq(marketingCampaigns.id, id))
      .returning();

    if (!updatedCampaign) {
      throw new Error(`Marketing campaign with id ${id} not found`);
    }

    return updatedCampaign;
  }

  async deleteMarketingCampaign(id: number): Promise<boolean> {
    return this.marketingCampaigns.delete(id);
  }

  // Marketing Campaign Recipient operations
  async createMarketingCampaignRecipient(recipient: InsertMarketingCampaignRecipient): Promise<MarketingCampaignRecipient> {
    const id = this.currentMarketingCampaignRecipientId++;
    const trackingToken = this.generateTrackingToken();
    const newRecipient: MarketingCampaignRecipient = {
      id,
      campaignId: recipient.campaignId,
      userId: recipient.userId,
      status: recipient.status || "pending",
      sentAt: recipient.sentAt || null,
      deliveredAt: recipient.deliveredAt || null,
      openedAt: recipient.openedAt || null,
      clickedAt: recipient.clickedAt || null,
      unsubscribedAt: recipient.unsubscribedAt || null,
      trackingToken,
      errorMessage: recipient.errorMessage || null,
    };
    this.marketingCampaignRecipients.set(id, newRecipient);
    return newRecipient;
  }

  private generateTrackingToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  async getMarketingCampaignRecipient(id: number): Promise<MarketingCampaignRecipient | undefined> {
    return this.marketingCampaignRecipients.get(id);
  }

  async getMarketingCampaignRecipients(campaignId: number): Promise<MarketingCampaignRecipient[]> {
    return Array.from(this.marketingCampaignRecipients.values()).filter(
      recipient => recipient.campaignId === campaignId
    );
  }

  async updateMarketingCampaignRecipient(id: number, data: Partial<InsertMarketingCampaignRecipient>): Promise<MarketingCampaignRecipient> {
    const existingRecipient = this.marketingCampaignRecipients.get(id);
    if (!existingRecipient) {
      throw new Error(`Marketing campaign recipient with id ${id} not found`);
    }

    const updatedRecipient: MarketingCampaignRecipient = {
      ...existingRecipient,
      ...data,
    };
    this.marketingCampaignRecipients.set(id, updatedRecipient);
    return updatedRecipient;
  }

  // User filtering for campaigns
  async getUsersByAudience(audience: string): Promise<User[]> {
    switch (audience) {
      case "All Clients":
        return await db.select().from(users).where(eq(users.role, "client"));
        
      case "Regular Clients": {
        // Users with more than 3 appointments - simplified approach
        const allClients = await db.select().from(users).where(eq(users.role, "client"));
        const regularClients = [];
        
        for (const client of allClients) {
          const appointmentCount = await db
            .select({ count: count() })
            .from(appointments)
            .where(eq(appointments.clientId, client.id));
          
          if (appointmentCount[0]?.count > 3) {
            regularClients.push(client);
          }
        }
        return regularClients;
      }
        
      case "New Clients": {
        // Users with 3 or fewer appointments - simplified approach
        const allClients = await db.select().from(users).where(eq(users.role, "client"));
        const newClients = [];
        
        for (const client of allClients) {
          const appointmentCount = await db
            .select({ count: count() })
            .from(appointments)
            .where(eq(appointments.clientId, client.id));
          
          if ((appointmentCount[0]?.count || 0) <= 3) {
            newClients.push(client);
          }
        }
        return newClients;
      }
        
      case "Inactive Clients": {
        // Users with no appointments in the last 60 days
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        
        const allClients = await db.select().from(users).where(eq(users.role, "client"));
        const inactiveClients = [];
        
        for (const client of allClients) {
          const recentAppointments = await db
            .select({ count: count() })
            .from(appointments)
            .where(and(
              eq(appointments.clientId, client.id),
              gte(appointments.startTime, sixtyDaysAgo)
            ));
          
          if ((recentAppointments[0]?.count || 0) === 0) {
            inactiveClients.push(client);
          }
        }
        return inactiveClients;
      }
        
      case "Upcoming Appointments": {
        // Users with appointments in the next 7 days
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const now = new Date();
        
        const allClients = await db.select().from(users).where(eq(users.role, "client"));
        const upcomingClients = [];
        
        for (const client of allClients) {
          const upcomingAppointments = await db
            .select({ count: count() })
            .from(appointments)
            .where(and(
              eq(appointments.clientId, client.id),
              gte(appointments.startTime, now),
              lte(appointments.startTime, nextWeek)
            ));
          
          if ((upcomingAppointments[0]?.count || 0) > 0) {
            upcomingClients.push(client);
          }
        }
        return upcomingClients;
      }
        
      default:
        return await db.select().from(users).where(eq(users.role, "client"));
    }
  }

  // Email tracking methods
  async getMarketingCampaignRecipientByToken(token: string): Promise<MarketingCampaignRecipient | undefined> {
    return Array.from(this.marketingCampaignRecipients.values()).find(
      recipient => recipient.trackingToken === token
    );
  }

  async createEmailUnsubscribe(unsubscribe: InsertEmailUnsubscribe): Promise<EmailUnsubscribe> {
    const id = this.currentEmailUnsubscribeId++;
    const newUnsubscribe: EmailUnsubscribe = {
      id,
      userId: unsubscribe.userId,
      email: unsubscribe.email,
      unsubscribedAt: new Date(),
      campaignId: unsubscribe.campaignId || null,
      reason: unsubscribe.reason || null,
      ipAddress: unsubscribe.ipAddress || null,
    };
    this.emailUnsubscribes.set(id, newUnsubscribe);
    return newUnsubscribe;
  }

  async getEmailUnsubscribe(userId: number): Promise<EmailUnsubscribe | undefined> {
    return Array.from(this.emailUnsubscribes.values()).find(
      unsubscribe => unsubscribe.userId === userId
    );
  }

  async getAllEmailUnsubscribes(): Promise<EmailUnsubscribe[]> {
    return Array.from(this.emailUnsubscribes.values());
  }

  async isUserUnsubscribed(email: string): Promise<boolean> {
    return Array.from(this.emailUnsubscribes.values()).some(
      unsubscribe => unsubscribe.email === email
    );
  }

  // Product operations
  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set(productData)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async updateProductStock(id: number, quantity: number): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ stockQuantity: quantity })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
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

  // User Color Preferences operations
  async getUserColorPreferences(userId: number): Promise<UserColorPreferences | undefined> {
    try {
      const result = await db.select().from(userColorPreferences).where(eq(userColorPreferences.userId, userId));
      return result[0];
    } catch (error) {
      console.error('Error getting user color preferences:', error);
      return undefined;
    }
  }

  async createUserColorPreferences(preferences: InsertUserColorPreferences): Promise<UserColorPreferences> {
    const result = await db.insert(userColorPreferences).values(preferences).returning();
    return result[0];
  }

  async updateUserColorPreferences(userId: number, preferences: Partial<InsertUserColorPreferences>): Promise<UserColorPreferences> {
    const result = await db.update(userColorPreferences)
      .set({ ...preferences, updatedAt: new Date() })
      .where(eq(userColorPreferences.userId, userId))
      .returning();
    return result[0];
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getRecentNotifications(limit: number = 10): Promise<Notification[]> {
    const recentNotifications = await db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    return recentNotifications;
  }

  async getNotificationsByUser(userId: number, limit: number = 10): Promise<Notification[]> {
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(or(eq(notifications.userId, userId), isNull(notifications.userId)))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    return userNotifications;
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Time Clock operations
  async createTimeClockEntry(entry: InsertTimeClockEntry): Promise<TimeClockEntry> {
    const [created] = await db.insert(timeClockEntries).values(entry).returning();
    return created;
  }

  async getTimeClockEntry(id: number): Promise<TimeClockEntry | undefined> {
    const [entry] = await db.select().from(timeClockEntries).where(eq(timeClockEntries.id, id));
    return entry;
  }

  async getAllTimeClockEntries(): Promise<TimeClockEntry[]> {
    return await db.select().from(timeClockEntries).orderBy(desc(timeClockEntries.createdAt));
  }

  async getTimeClockEntriesByStaffId(staffId: number): Promise<TimeClockEntry[]> {
    return await db.select().from(timeClockEntries)
      .where(eq(timeClockEntries.staffId, staffId))
      .orderBy(desc(timeClockEntries.createdAt));
  }

  async getTimeClockEntryByExternalId(externalId: string): Promise<TimeClockEntry | undefined> {
    const [entry] = await db.select().from(timeClockEntries)
      .where(eq(timeClockEntries.externalId, externalId));
    return entry;
  }

  async updateTimeClockEntry(id: number, entryData: Partial<InsertTimeClockEntry>): Promise<TimeClockEntry> {
    const [updated] = await db.update(timeClockEntries)
      .set(entryData)
      .where(eq(timeClockEntries.id, id))
      .returning();
    return updated;
  }

  async deleteTimeClockEntry(id: number): Promise<boolean> {
    const result = await db.delete(timeClockEntries).where(eq(timeClockEntries.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getStaffByName(name: string): Promise<Staff | undefined> {
    const result = await db.select()
      .from(staff)
      .leftJoin(users, eq(staff.userId, users.id))
      .where(
        or(
          eq(users.firstName, name),
          eq(users.lastName, name),
          sql`${users.firstName} || ' ' || ${users.lastName} = ${name}`
        )
      );
    
    return result[0]?.staff;
  }

  // Payroll History operations
  async createPayrollHistory(payrollData: InsertPayrollHistory): Promise<PayrollHistory> {
    const [payroll] = await db.insert(payrollHistory)
      .values(payrollData)
      .returning();
    return payroll;
  }

  async getPayrollHistory(id: number): Promise<PayrollHistory | undefined> {
    const [payroll] = await db.select()
      .from(payrollHistory)
      .where(eq(payrollHistory.id, id));
    return payroll;
  }

  async getPayrollHistoryByStaff(staffId: number): Promise<PayrollHistory[]> {
    return await db.select()
      .from(payrollHistory)
      .where(eq(payrollHistory.staffId, staffId))
      .orderBy(desc(payrollHistory.periodStart));
  }

  async getPayrollHistoryByPeriod(staffId: number, periodStart: Date, periodEnd: Date): Promise<PayrollHistory | undefined> {
    const [payroll] = await db.select()
      .from(payrollHistory)
      .where(
        and(
          eq(payrollHistory.staffId, staffId),
          eq(payrollHistory.periodStart, periodStart.toISOString().split('T')[0]),
          eq(payrollHistory.periodEnd, periodEnd.toISOString().split('T')[0])
        )
      );
    return payroll;
  }

  async getAllPayrollHistory(): Promise<PayrollHistory[]> {
    return await db.select()
      .from(payrollHistory)
      .orderBy(desc(payrollHistory.periodStart));
  }

  async updatePayrollHistory(id: number, payrollData: Partial<InsertPayrollHistory>): Promise<PayrollHistory> {
    const [updated] = await db.update(payrollHistory)
      .set({ ...payrollData, updatedAt: new Date() })
      .where(eq(payrollHistory.id, id))
      .returning();
    return updated;
  }

  async deletePayrollHistory(id: number): Promise<boolean> {
    const result = await db.delete(payrollHistory).where(eq(payrollHistory.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Sales History operations
  async createSalesHistory(salesHistoryData: InsertSalesHistory): Promise<SalesHistory> {
    const [newSalesHistory] = await db.insert(salesHistory).values(salesHistoryData).returning();
    return newSalesHistory;
  }

  async getSalesHistory(id: number): Promise<SalesHistory | undefined> {
    const [result] = await db.select().from(salesHistory).where(eq(salesHistory.id, id));
    return result || undefined;
  }

  async getSalesHistoryByDateRange(startDate: Date, endDate: Date): Promise<SalesHistory[]> {
    return await db
      .select()
      .from(salesHistory)
      .where(
        and(
          gte(salesHistory.transactionDate, startDate),
          lte(salesHistory.transactionDate, endDate)
        )
      )
      .orderBy(desc(salesHistory.transactionDate));
  }

  async getSalesHistoryByTransactionType(transactionType: string): Promise<SalesHistory[]> {
    return await db
      .select()
      .from(salesHistory)
      .where(eq(salesHistory.transactionType, transactionType))
      .orderBy(desc(salesHistory.transactionDate));
  }

  async getSalesHistoryByClient(clientId: number): Promise<SalesHistory[]> {
    return await db
      .select()
      .from(salesHistory)
      .where(eq(salesHistory.clientId, clientId))
      .orderBy(desc(salesHistory.transactionDate));
  }

  async getSalesHistoryByStaff(staffId: number): Promise<SalesHistory[]> {
    return await db
      .select()
      .from(salesHistory)
      .where(eq(salesHistory.staffId, staffId))
      .orderBy(desc(salesHistory.transactionDate));
  }

  async getSalesHistoryByMonth(monthYear: string): Promise<SalesHistory[]> {
    return await db
      .select()
      .from(salesHistory)
      .where(eq(salesHistory.monthYear, monthYear))
      .orderBy(desc(salesHistory.transactionDate));
  }

  async getAllSalesHistory(): Promise<SalesHistory[]> {
    return await db
      .select()
      .from(salesHistory)
      .orderBy(desc(salesHistory.transactionDate));
  }

  async updateSalesHistory(id: number, salesData: Partial<InsertSalesHistory>): Promise<SalesHistory> {
    const [updatedSalesHistory] = await db
      .update(salesHistory)
      .set({ ...salesData, updatedAt: new Date() })
      .where(eq(salesHistory.id, id))
      .returning();
    return updatedSalesHistory;
  }

  async deleteSalesHistory(id: number): Promise<boolean> {
    const result = await db.delete(salesHistory).where(eq(salesHistory.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
export { DatabaseStorage as PgStorage };
