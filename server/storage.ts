// Removed direct Neon/drizzle client construction from this module to centralize
// DB connection handling in server/db.ts and avoid hard-coded URLs.
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
  cancelledAppointments, CancelledAppointment, InsertCancelledAppointment,
  appointmentPhotos, AppointmentPhoto, InsertAppointmentPhoto,
  memberships, Membership, InsertMembership,
  clientMemberships, ClientMembership, InsertClientMembership,
  payments, Payment, InsertPayment,
  savedPaymentMethods, SavedPaymentMethod, InsertSavedPaymentMethod,
  giftCards, GiftCard, InsertGiftCard,
  giftCardTransactions, GiftCardTransaction, InsertGiftCardTransaction,
  savedGiftCards, SavedGiftCard, InsertSavedGiftCard,
  classes, classEnrollments, Class, InsertClass, ClassEnrollment, InsertClassEnrollment,
  marketingCampaigns, MarketingCampaign, InsertMarketingCampaign,
  marketingCampaignRecipients, MarketingCampaignRecipient, InsertMarketingCampaignRecipient,
  emailUnsubscribes, EmailUnsubscribe, InsertEmailUnsubscribe,
  promoCodes, PromoCode, InsertPromoCode,
  staffSchedules, StaffSchedule, InsertStaffSchedule,
  userColorPreferences, UserColorPreferences, InsertUserColorPreferences,
  notifications, Notification, InsertNotification,
  timeClockEntries, TimeClockEntry, InsertTimeClockEntry,
  payrollHistory, PayrollHistory, InsertPayrollHistory,
  salesHistory, SalesHistory, InsertSalesHistory,
  businessSettings, BusinessSettings, InsertBusinessSettings,
  automationRules, AutomationRule, InsertAutomationRule,
  forms, Form, InsertForm,
  formSubmissions, FormSubmission, InsertFormSubmission,
  businessKnowledge, BusinessKnowledge, InsertBusinessKnowledge,
  businessKnowledgeCategories, BusinessKnowledgeCategory, InsertBusinessKnowledgeCategory,
  llmConversations, LLMConversation, InsertLLMConversation,
  checkSoftwareProviders, CheckSoftwareProvider, InsertCheckSoftwareProvider,
  payrollChecks, PayrollCheck, InsertPayrollCheck,
  checkSoftwareLogs, CheckSoftwareLog, InsertCheckSoftwareLog,
  staffEarnings, StaffEarnings, InsertStaffEarnings,
  systemConfig, SystemConfig, InsertSystemConfig,
  aiMessagingConfig, AiMessagingConfig, InsertAiMessagingConfig,
  conversationFlows, ConversationFlow, InsertConversationFlow,
  noteTemplates, NoteTemplate, InsertNoteTemplate, UpdateNoteTemplate,
  noteHistory, NoteHistory, InsertNoteHistory, UpdateNoteHistory,
  permissions, Permission, InsertPermission,
  permissionGroups, PermissionGroup, InsertPermissionGroup,
  permissionGroupMappings, PermissionGroupMapping, InsertPermissionGroupMapping,
  userPermissionGroups, UserPermissionGroup, InsertUserPermissionGroup,
  userDirectPermissions, UserDirectPermission, InsertUserDirectPermission,
  phoneCalls, PhoneCall, InsertPhoneCall
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, and, or, ne, gte, lte, desc, asc, isNull, count, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  searchUsers(query: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<boolean>;
  setPasswordResetToken(userId: number, token: string, expiry: Date): Promise<void>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearPasswordResetToken(userId: number): Promise<void>;

  // Service Category operations
  createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory>;
  getServiceCategory(id: number): Promise<ServiceCategory | undefined>;
  getServiceCategoryByName(name: string): Promise<ServiceCategory | undefined>;
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
  getServiceByName(name: string): Promise<Service | undefined>;
  getServicesByCategory(categoryId: number): Promise<Service[]>;
  getAllServices(): Promise<Service[]>;
  updateService(id: number, serviceData: Partial<InsertService>): Promise<Service>;
  deleteService(id: number): Promise<boolean>;
  // Service analytics
  getServiceAvailability(serviceId: number, date: Date, staffId?: number): Promise<string[]>;
  getPopularServices(limit: number, periodDays: number): Promise<Service[]>;
  getServiceStatistics(serviceId: number, startDate: Date, endDate: Date): Promise<any>;
  getServicesByStatus(isActive: boolean): Promise<Service[]>;

  // Classes operations
  createClass(data: InsertClass): Promise<Class>;
  getClass(id: number): Promise<Class | undefined>;
  getAllClasses(): Promise<Class[]>;
  getClassesByLocation(locationId: number): Promise<Class[]>;
  updateClass(id: number, data: Partial<InsertClass>): Promise<Class>;
  deleteClass(id: number): Promise<boolean>;

  // Class Enrollment operations
  createClassEnrollment(data: InsertClassEnrollment): Promise<ClassEnrollment>;
  getClassEnrollment(id: number): Promise<ClassEnrollment | undefined>;
  getEnrollmentsByClass(classId: number): Promise<ClassEnrollment[]>;
  getEnrollmentsByClient(clientId: number): Promise<ClassEnrollment[]>;
  updateClassEnrollment(id: number, data: Partial<InsertClassEnrollment>): Promise<ClassEnrollment>;
  deleteClassEnrollment(id: number): Promise<boolean>;

  // Add-on mapping operations
  getAddOnMapping(): Promise<Record<string, number[]>>;
  setAddOnMapping(map: Record<string, number[]>): Promise<void>;
  getBaseServicesForAddOn(addOnServiceId: number): Promise<number[]>;
  setBaseServicesForAddOn(addOnServiceId: number, baseServiceIds: number[]): Promise<void>;
  addBaseServiceToAddOn(addOnServiceId: number, baseServiceId: number): Promise<void>;
  removeBaseServiceFromAddOn(addOnServiceId: number, baseServiceId: number): Promise<void>;
  getBaseServiceObjectsForAddOn(addOnServiceId: number): Promise<Service[]>;

  // Appointment add-ons mapping operations
  getAppointmentAddOnMapping(): Promise<Record<string, number[]>>;
  setAppointmentAddOnMapping(map: Record<string, number[]>): Promise<void>;
  getAddOnsForAppointment(appointmentId: number): Promise<number[]>;
  setAddOnsForAppointment(appointmentId: number, addOnServiceIds: number[]): Promise<void>;
  addAddOnToAppointment(appointmentId: number, addOnServiceId: number): Promise<void>;
  removeAddOnFromAppointment(appointmentId: number, addOnServiceId: number): Promise<void>;
  getAddOnServiceObjectsForAppointment(appointmentId: number): Promise<Service[]>;

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
  getAllStaffServices(): Promise<StaffService[]>;
  getStaffServicesByService(serviceId: number): Promise<StaffService[]>;
  getStaffServiceById(id: number): Promise<StaffService | undefined>;
  getStaffServiceAssignment(staffId: number, serviceId: number): Promise<StaffService | undefined>;
  updateStaffService(id: number, data: Partial<InsertStaffService>): Promise<StaffService>;
  removeServiceFromStaff(staffId: number, serviceId: number): Promise<boolean>;

  // Appointment operations
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAllAppointments(): Promise<Appointment[]>;
  getAppointmentById(id: string | number): Promise<Appointment | undefined>;
  getAppointmentsByClient(clientId: number): Promise<any[]>;
  getAppointmentsByStaff(staffId: number): Promise<Appointment[]>;
  getAppointmentsByService(serviceId: number): Promise<Appointment[]>;
  getAppointmentsByLocation(locationId: number): Promise<Appointment[]>;
  getActiveAppointmentsByStaff(staffId: number): Promise<Appointment[]>;
  getAppointmentsByStaffAndDateRange(staffId: number, startDate: Date, endDate: Date): Promise<Appointment[]>;
  getAppointmentsByDate(date: Date): Promise<Appointment[]>;
  getActiveAppointmentsByDate(date: Date): Promise<Appointment[]>;
  getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<Appointment[]>;
  updateAppointment(id: number, appointmentData: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: number): Promise<boolean>;
  cancelAppointment(id: string | number): Promise<boolean>;

  // Appointment History operations
  createAppointmentHistory(history: InsertAppointmentHistory): Promise<AppointmentHistory>;
  getAppointmentHistory(appointmentId: number): Promise<AppointmentHistory[]>;
  getAllAppointmentHistory(): Promise<AppointmentHistory[]>;

  // Cancelled Appointment operations
  createCancelledAppointment(cancelledAppointment: InsertCancelledAppointment): Promise<CancelledAppointment>;
  getCancelledAppointment(id: number): Promise<CancelledAppointment | undefined>;
  getAllCancelledAppointments(): Promise<CancelledAppointment[]>;
  getCancelledAppointmentsByClient(clientId: number): Promise<CancelledAppointment[]>;
  getCancelledAppointmentsByStaff(staffId: number): Promise<CancelledAppointment[]>;
  getCancelledAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<CancelledAppointment[]>;

  // Appointment Photo operations
  createAppointmentPhoto(photo: InsertAppointmentPhoto): Promise<AppointmentPhoto>;
  getAppointmentPhotos(appointmentId: number): Promise<AppointmentPhoto[]>;
  getAppointmentPhoto(id: number): Promise<AppointmentPhoto | undefined>;
  deleteAppointmentPhoto(id: number): Promise<boolean>;
  moveAppointmentToCancelled(appointmentId: number, cancellationReason?: string, cancelledBy?: number, cancelledByRole?: string): Promise<CancelledAppointment>;

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
  getAllClientMemberships(): Promise<ClientMembership[]>;
  getClientMembershipsByMembership(membershipId: number): Promise<ClientMembership[]>;
  updateClientMembership(id: number, data: Partial<InsertClientMembership>): Promise<ClientMembership>;
  deleteClientMembership(id: number): Promise<boolean>;

  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentByHelcimId(helcimPaymentId: string): Promise<Payment | undefined>;
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
  // Deprecated: Square customer ID is no longer used
  updateUserSquareCustomerId(userId: number, squareCustomerId: string): Promise<User>;
  updateUserHelcimCustomerId(userId: number, helcimCustomerId: string): Promise<User>;

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
  getMarketingCampaigns(): Promise<MarketingCampaign[]>;
  updateMarketingCampaign(id: number, campaignData: Partial<InsertMarketingCampaign>): Promise<MarketingCampaign>;
  deleteMarketingCampaign(id: number): Promise<boolean>;

  // Marketing Campaign Recipient operations
  createMarketingCampaignRecipient(recipient: InsertMarketingCampaignRecipient): Promise<MarketingCampaignRecipient>;
  getMarketingCampaignRecipient(id: number): Promise<MarketingCampaignRecipient | undefined>;
  getMarketingCampaignRecipients(campaignId: number): Promise<MarketingCampaignRecipient[]>;
  updateMarketingCampaignRecipient(id: number, data: Partial<InsertMarketingCampaignRecipient>): Promise<MarketingCampaignRecipient>;
  // Atomically claim a recipient for sending (transitions status from "pending" to a temporary "processing")
  claimMarketingCampaignRecipient(recipientId: number): Promise<boolean>;
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
  deleteUserColorPreferences(userId: number): Promise<boolean>;

  // User filtering for campaigns
  getUsersByAudience(audience: string, targetClientIds?: number[]): Promise<User[]>;
  
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

  // Business Settings operations
  getBusinessSettings(): Promise<BusinessSettings | undefined>;
  updateBusinessSettings(businessData: Partial<InsertBusinessSettings>): Promise<BusinessSettings>;
  createBusinessSettings(businessData: InsertBusinessSettings): Promise<BusinessSettings>;

  // Automation Rules operations
  createAutomationRule(rule: InsertAutomationRule): Promise<AutomationRule>;
  getAutomationRule(id: number): Promise<AutomationRule | undefined>;
  getAllAutomationRules(): Promise<AutomationRule[]>;
  updateAutomationRule(id: number, ruleData: Partial<InsertAutomationRule>): Promise<AutomationRule | undefined>;
  deleteAutomationRule(id: number): Promise<boolean>;
  updateAutomationRuleSentCount(id: number, sentCount: number): Promise<void>;
  updateAutomationRuleLastRun(id: number, lastRun: Date): Promise<void>;

  // Forms operations
  createForm(form: InsertForm): Promise<Form>;
  getForm(id: number): Promise<Form | undefined>;
  getAllForms(): Promise<Form[]>;
  updateForm(id: number, formData: Partial<InsertForm>): Promise<Form>;
  updateFormSubmissions(id: number, submissions: number, lastSubmission?: Date): Promise<Form>;
  deleteForm(id: number): Promise<boolean>;
  saveFormSubmission(submission: any): Promise<void>;
  getFormSubmissions(formId: number): Promise<Array<{
    id: string;
    formId: number;
    formData: Record<string, any>;
    submittedAt: string;
    ipAddress?: string;
    userAgent?: string;
  }>>;
  getClientFormSubmissions(clientId: number): Promise<Array<{
    id: string;
    formId: number;
    formTitle: string;
    formType: string;
    formData: Record<string, any>;
    submittedAt: string;
    ipAddress?: string;
    userAgent?: string;
  }>>;
  getUnclaimedFormSubmissions(): Promise<Array<{
    id: string;
    formId: number;
    formTitle: string;
    formType: string;
    submittedAt: string;
    ipAddress?: string;
    userAgent?: string;
    submitterName?: string;
  }>>;
  attachFormSubmissionToClient(submissionId: number, clientId: number): Promise<{
    id: string;
    formId: number;
    formTitle: string;
    formType: string;
    submittedAt: string;
    clientId: number;
  }>;

  // Business Knowledge
  getBusinessKnowledge(categories?: string[]): Promise<any[]>;
  createBusinessKnowledge(knowledge: any): Promise<any>;
  updateBusinessKnowledge(id: number, updates: any): Promise<any>;
  deleteBusinessKnowledge(id: number): Promise<void>;

  // Business Knowledge Categories
  getBusinessKnowledgeCategories(): Promise<any[]>;
  createBusinessKnowledgeCategory(category: any): Promise<any>;
  updateBusinessKnowledgeCategory(id: number, updates: any): Promise<any>;
  deleteBusinessKnowledgeCategory(id: number): Promise<void>;

  // LLM Conversations
  createLLMConversation(conversation: any): Promise<any>;
  getLLMConversations(clientId?: number): Promise<any[]>;

  // Check Software Providers
  getCheckSoftwareProviders(): Promise<any[]>;
  getCheckSoftwareProvider(id: number): Promise<any | undefined>;
  createCheckSoftwareProvider(provider: any): Promise<any>;
  updateCheckSoftwareProvider(id: number, updates: any): Promise<any>;
  deleteCheckSoftwareProvider(id: number): Promise<boolean>;

  // Payroll Checks
  getPayrollChecks(staffId?: number, status?: string): Promise<any[]>;
  getPayrollCheck(id: number): Promise<any | undefined>;
  createPayrollCheck(check: any): Promise<any>;
  updatePayrollCheck(id: number, updates: any): Promise<any>;
  deletePayrollCheck(id: number): Promise<boolean>;

  // Check Software Logs
  getCheckSoftwareLogs(providerId?: number, action?: string): Promise<any[]>;
  createCheckSoftwareLog(log: any): Promise<any>;

  // System Configuration
  getSystemConfig(key: string): Promise<SystemConfig | undefined>;
  getAllSystemConfig(category?: string): Promise<SystemConfig[]>;
  setSystemConfig(config: InsertSystemConfig): Promise<SystemConfig>;
  updateSystemConfig(key: string, value: string, description?: string): Promise<SystemConfig>;
  deleteSystemConfig(key: string): Promise<boolean>;
  getSystemConfigByCategory(category: string): Promise<SystemConfig[]>;

  // AI Messaging Configuration
  getAiMessagingConfig(): Promise<AiMessagingConfig | undefined>;
  createAiMessagingConfig(config: InsertAiMessagingConfig): Promise<AiMessagingConfig>;
  updateAiMessagingConfig(id: number, config: Partial<InsertAiMessagingConfig>): Promise<AiMessagingConfig>;
  deleteAiMessagingConfig(id: number): Promise<boolean>;

  // Conversation Flows
  getConversationFlows(): Promise<any[]>;
  getConversationFlow(id: string): Promise<any | undefined>;
  saveConversationFlow(flow: any): Promise<any>;
  updateConversationFlow(flow: any): Promise<any>;
  deleteConversationFlow(id: string): Promise<boolean>;

  // Note Template operations
  createNoteTemplate(template: InsertNoteTemplate): Promise<NoteTemplate>;
  getNoteTemplate(id: number): Promise<NoteTemplate | undefined>;
  getAllNoteTemplates(): Promise<NoteTemplate[]>;
  getNoteTemplatesByCategory(category: string): Promise<NoteTemplate[]>;
  getActiveNoteTemplates(): Promise<NoteTemplate[]>;
  updateNoteTemplate(id: number, templateData: UpdateNoteTemplate): Promise<NoteTemplate>;
  deleteNoteTemplate(id: number): Promise<boolean>;

  // Note History operations
  createNoteHistory(history: InsertNoteHistory): Promise<NoteHistory>;
  getNoteHistoryByClient(clientId: number): Promise<NoteHistory[]>;
  getNoteHistoryByAppointment(appointmentId: number): Promise<NoteHistory[]>;
  getAllNoteHistory(): Promise<NoteHistory[]>;
  updateNoteHistory(id: number, historyData: UpdateNoteHistory): Promise<NoteHistory>;
  deleteNoteHistory(id: number): Promise<boolean>;

  // Permission operations
  createPermission(permission: InsertPermission): Promise<Permission>;
  getPermission(id: number): Promise<Permission | undefined>;
  getPermissionByName(name: string): Promise<Permission | undefined>;
  getAllPermissions(): Promise<Permission[]>;
  getPermissionsByCategory(category: string): Promise<Permission[]>;
  updatePermission(id: number, permissionData: Partial<InsertPermission>): Promise<Permission>;
  deletePermission(id: number): Promise<boolean>;

  // Permission Group operations
  createPermissionGroup(group: InsertPermissionGroup): Promise<PermissionGroup>;
  getPermissionGroup(id: number): Promise<PermissionGroup | undefined>;
  getPermissionGroupByName(name: string): Promise<PermissionGroup | undefined>;
  getAllPermissionGroups(): Promise<PermissionGroup[]>;
  updatePermissionGroup(id: number, groupData: Partial<InsertPermissionGroup>): Promise<PermissionGroup>;
  deletePermissionGroup(id: number): Promise<boolean>;
  assignPermissionsToGroup(groupId: number, permissionIds: number[]): Promise<void>;
  removePermissionsFromGroup(groupId: number, permissionIds: number[]): Promise<void>;
  getPermissionGroupMappings(groupId: number): Promise<PermissionGroupMapping[]>;
  createPermissionGroupMapping(mapping: InsertPermissionGroupMapping): Promise<PermissionGroupMapping>;
  deletePermissionGroupMappings(groupId: number): Promise<void>;

  // User Permission operations
  assignPermissionGroupToUser(userId: number, groupId: number): Promise<void>;
  removePermissionGroupFromUser(userId: number, groupId: number): Promise<void>;
  getUserPermissionGroups(userId: number): Promise<UserPermissionGroup[]>;
  getUserPermissionGroup(userId: number, groupId: number): Promise<UserPermissionGroup | null>;
  createUserPermissionGroup(data: InsertUserPermissionGroup): Promise<UserPermissionGroup>;
  deleteUserPermissionGroup(id: number): Promise<void>;
  grantDirectPermission(userId: number, permissionId: number): Promise<void>;
  denyDirectPermission(userId: number, permissionId: number): Promise<void>;
  removeDirectPermission(userId: number, permissionId: number): Promise<void>;
  getUserDirectPermissions(userId: number): Promise<UserDirectPermission[]>;
  getUserDirectPermission(userId: number, permissionId: number): Promise<UserDirectPermission | null>;
  createUserDirectPermission(data: InsertUserDirectPermission): Promise<UserDirectPermission>;
  updateUserDirectPermission(id: number, data: Partial<UserDirectPermission>): Promise<UserDirectPermission>;
  deleteUserDirectPermission(id: number): Promise<void>;

  // Email Templates stored in system_config (category 'email_templates')
  createEmailTemplate(template: { name: string; subject?: string; htmlContent: string; variables?: any[] }): Promise<{ id: string; name: string; subject?: string; htmlContent: string; variables: any[]; createdAt: string }>;
  getEmailTemplates(): Promise<Array<{ id: string; name: string; subject?: string; htmlContent: string; variables: any[]; createdAt: string }>>;

  // AI Messaging Configuration
  getAIMessagingConfig(): Promise<AiMessagingConfig | undefined>;
  setAIMessagingConfig(config: Partial<AiMessagingConfig>): Promise<AiMessagingConfig>;
  updateAIMessagingStats(stats: Partial<AiMessagingConfig>): Promise<AiMessagingConfig>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // PostgreSQL storage - no in-memory structures needed
    this.initializeConnection();
    // Initialize sample data including services
    this.initializeSampleData().catch(error => {
      console.error('Sample data initialization failed:', error);
      // Don't throw error to prevent server startup failure
    });
  }

  private async initializeConnection() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL must be set");
    }
    try {
      // Test database connection
      await db.select().from(users).limit(1);
      console.log('Database connection established successfully');
      
      // Add missing columns if they don't exist (migration)
      try {
        await db.execute(sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false`);
        // Ensure rooms table has required columns for current app schema
        await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description TEXT`);
        await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 1`);
        await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`);
        // Ensure rooms table has location_id for room-to-location linkage
        await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS location_id INTEGER`);
        // Ensure services table has room_id for room-capacity enforcement on services
        await db.execute(sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS room_id INTEGER`);
        // Ensure services table has location_id to link services to a location
        await db.execute(sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS location_id INTEGER`);
        console.log('Ensured is_hidden column exists in services table');
        // Ensure add-on mapping container exists in system_config
        try {
          const existing: any = await db.execute(sql`SELECT 1 FROM system_config WHERE key = 'service_add_on_mapping' LIMIT 1`);
          const rows = (existing?.rows ?? existing) as any[];
          if (!rows || rows.length === 0) {
            await db.execute(sql`INSERT INTO system_config (key, value, description, category) VALUES ('service_add_on_mapping', '{}', 'JSON mapping of add-on serviceId -> [baseServiceIds]', 'services')`);
            console.log('Initialized service_add_on_mapping in system_config');
          }
        } catch {}
      } catch (migrationError) {
        // Column might already exist, which is fine
        console.log('Migration check completed');
      }
    } catch (error) {
      console.error('Database connection failed:', error);
      // Don't throw error to prevent server startup failure
    }
  }

  private async initializeSampleData() {
    try {
      console.log('Starting sample data initialization...');
      
      // Check if sample data has already been initialized
      const sampleDataFlag = await this.getSystemConfig('sample_data_initialized');
      const existingServices = await this.getAllServices();
      
      // If services are missing, force re-initialization of services only
      if (existingServices.length === 0) {
        console.log('Services are missing, forcing service restoration...');
        // Continue with initialization
      } else if (sampleDataFlag && sampleDataFlag.value === 'true') {
        console.log('Sample data initialization skipped - flag indicates it has already been initialized');
        return;
      }
      
      // Create admin user if not exists
      const existingAdmin = await this.getUserByUsername('admin');
      if (!existingAdmin) {
        console.log('Creating admin user...');
        await this.createUser({
          username: 'admin',
          password: 'password',
          email: 'admin@admin.com',
          role: 'admin',
          firstName: 'Sarah',
          lastName: 'Johnson',
          phone: '555-123-4567'
        });
        console.log('Admin user created successfully');
      } else {
        console.log('Admin user already exists');
      }

      // Create sample service categories only if they don't exist
      const existingCategories = await this.getAllServiceCategories();
      
      if (!existingCategories.find(c => c.name === 'Hair Services')) {
        console.log('Creating Hair Services category...');
        await this.createServiceCategory({
          name: 'Hair Services',
          description: 'Professional hair styling, cutting, and coloring services'
        });
      }

      if (!existingCategories.find(c => c.name === 'Facial Treatments')) {
        console.log('Creating Facial Treatments category...');
        await this.createServiceCategory({
          name: 'Facial Treatments',
          description: 'Skincare and facial rejuvenation treatments'
        });
      }
      
      // Re-fetch categories after creation to ensure we have the latest data
      const categoriesAfterCreate = await this.getAllServiceCategories();

      // Create sample rooms only if they don't exist
      const existingRooms = await this.getAllRooms();
      
      if (!existingRooms.find(r => r.name === 'Treatment Room 1')) {
        console.log('Creating Treatment Room 1...');
        await this.createRoom({
          name: 'Treatment Room 1',
          description: 'Main treatment room for facials and individual services',
          capacity: 1,
          isActive: true
        });
      }

      if (!existingRooms.find(r => r.name === 'Treatment Room 2')) {
        console.log('Creating Treatment Room 2...');
        await this.createRoom({
          name: 'Treatment Room 2', 
          description: 'Secondary treatment room for massages and body treatments',
          capacity: 1,
          isActive: true
        });
      }

      if (!existingRooms.find(r => r.name === 'Styling Station Area')) {
        console.log('Creating Styling Station Area...');
        await this.createRoom({
          name: 'Styling Station Area',
          description: 'Open area with multiple styling stations',
          capacity: 4,
          isActive: true
        });
      }

      // Create sample devices only if they don't exist
      const existingDevices = await this.getAllDevices();
      
      if (!existingDevices.find(d => d.name === 'Professional Hair Dryer Station 1')) {
        console.log('Creating Professional Hair Dryer Station 1...');
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
      }

      if (!existingDevices.find(d => d.name === 'Luxury Massage Table 1')) {
        console.log('Creating Luxury Massage Table 1...');
        await this.createDevice({
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
      }

      if (!existingDevices.find(d => d.name === 'Hydraulic Styling Chair A')) {
        console.log('Creating Hydraulic Styling Chair A...');
        await this.createDevice({
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
      }

      if (!existingDevices.find(d => d.name === 'Facial Steamer Pro')) {
        console.log('Creating Facial Steamer Pro...');
        await this.createDevice({
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
      }

      // Create sample note templates
      const existingTemplates = await this.getAllNoteTemplates();
      
      if (!existingTemplates.find(t => t.name === 'Follow-up Consultation')) {
        console.log('Creating Follow-up Consultation template...');
        await this.createNoteTemplate({
          name: 'Follow-up Consultation',
          description: 'Standard follow-up consultation notes',
          content: 'Client returned for follow-up consultation. Discussed previous treatment results and current concerns. Recommended next steps based on client goals and skin/hair condition.',
          category: 'appointment',
          isActive: true
        });
      }

      if (!existingTemplates.find(t => t.name === 'New Client Welcome')) {
        console.log('Creating New Client Welcome template...');
        await this.createNoteTemplate({
          name: 'New Client Welcome',
          description: 'Welcome notes for first-time clients',
          content: 'First-time client visit. Completed consultation and discussed client goals. Explained services and treatment options. Client showed interest in [specific services]. Scheduled follow-up appointment.',
          category: 'appointment',
          isActive: true
        });
      }

      if (!existingTemplates.find(t => t.name === 'Treatment Notes')) {
        console.log('Creating Treatment Notes template...');
        await this.createNoteTemplate({
          name: 'Treatment Notes',
          description: 'Standard treatment session notes',
          content: 'Treatment completed successfully. Client reported [comfort level]. Used [products/tools]. Client was satisfied with results. Recommended home care routine: [specific recommendations].',
          category: 'treatment',
          isActive: true
        });
      }

      if (!existingTemplates.find(t => t.name === 'Aftercare Instructions')) {
        console.log('Creating Aftercare Instructions template...');
        await this.createNoteTemplate({
          name: 'Aftercare Instructions',
          description: 'Post-treatment care instructions',
          content: 'Aftercare instructions provided: [specific instructions]. Client understands care routine. Advised to avoid [restrictions] for [time period]. Scheduled follow-up in [timeframe].',
          category: 'aftercare',
          isActive: true
        });
      }

      if (!existingTemplates.find(t => t.name === 'Client Preferences')) {
        console.log('Creating Client Preferences template...');
        await this.createNoteTemplate({
          name: 'Client Preferences',
          description: 'Notes about client preferences and history',
          content: 'Client preferences noted: [specific preferences]. Previous treatments: [history]. Allergies/sensitivities: [if any]. Preferred communication method: [preference].',
          category: 'client',
          isActive: true
        });
      }

      // Create sample staff user (if not exists)
      const existingStylist = await this.getUserByUsername('stylist1');
      if (!existingStylist) {
        console.log('Creating stylist1 user...');
        await this.createUser({
          username: 'stylist1',
          password: 'password',
          email: 'emma.martinez@example.com',
          role: 'staff',
          firstName: 'Emma',
          lastName: 'Martinez',
          phone: '555-234-5678'
        });
        console.log('Stylist user created successfully');
      } else {
        console.log('Stylist user already exists');
      }

      // Create staff member profile after creating the staff user
      const stylistUser = await this.getUserByUsername('stylist1');
      if (stylistUser) {
        const existingStaff = await this.getStaffByUserId(stylistUser.id);
        if (!existingStaff) {
          console.log('Creating staff profile for stylist1...');
          await this.createStaff({
            userId: stylistUser.id,
            title: 'Senior Hair Stylist',
            bio: 'Emma has over 8 years of experience in hair styling and coloring. She specializes in modern cuts and color correction.',
            commissionType: 'commission',
            commissionRate: 0.45, // 45% commission
            photoUrl: null
          });
          console.log('Staff profile created successfully');
        } else {
          console.log('Staff profile already exists');
        }
      }

      // Create sample services only if they don't exist
      const existingServicesCheck = await this.getAllServices();
      
      // Get the actual category IDs for reference (use the refreshed categories)
      const hairServicesCategory = categoriesAfterCreate.find(c => c.name === 'Hair Services');
      const facialTreatmentsCategory = categoriesAfterCreate.find(c => c.name === 'Facial Treatments');
      
      if (!existingServicesCheck.find((s: Service) => s.name === 'Women\'s Haircut & Style') && hairServicesCategory) {
        console.log('Creating Women\'s Haircut & Style service...');
        await this.createService({
          name: 'Women\'s Haircut & Style',
          description: 'Professional haircut with wash, cut, and styling',
          duration: 60,
          price: 85.00,
          categoryId: hairServicesCategory.id,
          roomId: 3, // Styling Station Area
          bufferTimeBefore: 10,
          bufferTimeAfter: 10,
          color: '#FF6B9D'
        });
      }

      if (!existingServicesCheck.find((s: Service) => s.name === 'Color & Highlights') && hairServicesCategory) {
        console.log('Creating Color & Highlights service...');
        await this.createService({
          name: 'Color & Highlights',
          description: 'Full color service with highlights and toning',
          duration: 120,
          price: 150.00,
          categoryId: hairServicesCategory.id,
          roomId: 3, // Styling Station Area
          bufferTimeBefore: 15,
          bufferTimeAfter: 15,
          color: '#8B5CF6'
        });
      }

      if (!existingServicesCheck.find((s: Service) => s.name === 'Deep Cleansing Facial') && facialTreatmentsCategory) {
        console.log('Creating Deep Cleansing Facial service...');
        await this.createService({
          name: 'Deep Cleansing Facial',
          description: 'Relaxing facial treatment with deep pore cleansing and moisturizing',
          duration: 90,
          price: 95.00,
          categoryId: facialTreatmentsCategory.id,
          roomId: 1, // Treatment Room 1
          bufferTimeBefore: 10,
          bufferTimeAfter: 10,
          color: '#10B981'
        });
      }

      console.log('Sample data initialization completed successfully');
      
      // Set flag to prevent future initialization
      try {
        await this.setSystemConfig({
          key: 'sample_data_initialized',
          value: 'true',
          description: 'Flag to prevent sample data from being recreated'
        });
        console.log('Sample data initialization flag set');
      } catch (flagError) {
        console.log('Could not set sample data flag (this is optional)');
      }
      
      // Create default automation rules
      try {
        const existingRules = await this.getAllAutomationRules();
        if (existingRules.length === 0) {
          console.log('Creating default automation rules...');
          
          // Create booking confirmation email rule
          await this.createAutomationRule({
            name: 'Booking Confirmation Email',
            trigger: 'booking_confirmation',
            type: 'email',
            subject: 'Appointment Confirmation - Glo Head Spa',
            template: `Hi {client_name},

Your appointment has been confirmed!

Service: {service_name}
Date: {appointment_date}
Time: {appointment_time}
Staff: {staff_name}

We look forward to seeing you!

Best regards,
Glo Head Spa`,
            active: true,
            timing: 'immediate'
          });
          
          console.log('Default automation rules created successfully');
        }
      } catch (error) {
        console.log('Error creating automation rules:', error);
      }
    } catch (error) {
      console.error('Error during sample data initialization:', error);
      // Don't throw error to prevent server startup failure
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async searchUsers(query: string): Promise<User[]> {
    const searchTerm = `%${query}%`;
    const fullNameTerm = `%${query.trim().replace(/\s+/g, ' ')}%`;
    return await db
      .select()
      .from(users)
      .where(
        or(
          sql`LOWER(${users.username}) LIKE LOWER(${searchTerm})`,
          sql`LOWER(${users.firstName}) LIKE LOWER(${searchTerm})`,
          sql`LOWER(${users.lastName}) LIKE LOWER(${searchTerm})`,
          sql`LOWER(${users.email}) LIKE LOWER(${searchTerm})`,
          sql`LOWER(${users.phone}) LIKE LOWER(${searchTerm})`,
          // Match full name queries like "First Last"
          sql`LOWER(COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, '')) LIKE LOWER(${fullNameTerm})`,
          // Also match reversed order just in case ("Last First")
          sql`LOWER(COALESCE(${users.lastName}, '') || ' ' || COALESCE(${users.firstName}, '')) LIKE LOWER(${fullNameTerm})`
        )
      )
      .limit(20);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      console.log('Storage: Creating user with data:', insertUser);
      
      // Handle empty phone numbers - generate unique placeholder to avoid unique constraint violations
      const processedUser = { ...insertUser };
      if (processedUser.phone === '' || processedUser.phone === null) {
        // Generate a unique placeholder phone number
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const processId = process.pid || Math.floor(Math.random() * 10000);
        processedUser.phone = `555-000-${timestamp.toString().slice(-4)}-${processId.toString().slice(-4)}`;
        console.log('Storage: Generated placeholder phone for new user:', processedUser.phone);
      }
      
      const [user] = await db.insert(users).values(processedUser).returning();
      console.log('Storage: User created successfully:', user);
      return user;
    } catch (error) {
      console.error('Storage: Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    try {
      console.log('Updating user with data:', userData);
      console.log('Profile picture in userData:', userData.profilePicture);
      console.log('Profile picture type:', typeof userData.profilePicture);
      console.log('Profile picture length:', userData.profilePicture?.length);
      
      // Check if email is being updated and validate it doesn't conflict with other users
      if (userData.email) {
        const existingUser = await this.getUser(id);
        if (!existingUser) {
          throw new Error('User not found');
        }
        
        // If email is being changed, check if the new email belongs to a different user
        if (existingUser.email !== userData.email) {
          const userWithNewEmail = await this.getUserByEmail(userData.email);
          if (userWithNewEmail && userWithNewEmail.id !== id) {
            throw new Error(`Email ${userData.email} is already in use by another user`);
          }
        }
      }
      
      // Handle phone numbers carefully: do not overwrite when not provided
      const processedData: any = { ...userData };
      console.log('Phone number received:', processedData.phone);
      console.log('Phone number type:', typeof processedData.phone);
      console.log('Phone number length:', processedData.phone?.length);
      console.log('Phone number is empty string:', processedData.phone === '');
      console.log('Phone number is null:', processedData.phone === null);
      console.log('Phone number is undefined:', processedData.phone === undefined);
      
      if (processedData.phone === undefined) {
        // Do not touch the phone field if it was not provided in the update payload
        delete processedData.phone;
        console.log('Phone not provided in update; preserving existing value.');
      } else if (processedData.phone === '' || processedData.phone === null) {
        // Explicitly clear phone when empty or null is sent
        processedData.phone = null;
        console.log('Clearing phone number (set to null).');
      } else {
        // Keep the provided phone number as-is
        console.log('Using provided phone number:', processedData.phone);
      }
      
      // Use Drizzle ORM directly - it should handle field mapping automatically
      console.log('Final processed data being sent to database:', processedData);
      console.log('Profile picture in processed data:', processedData.profilePicture);
      console.log('Profile picture type:', typeof processedData.profilePicture);
      console.log('Profile picture length:', processedData.profilePicture?.length);
      
      const [updatedUser] = await db.update(users).set(processedData).where(eq(users.id, id)).returning();
      
      if (!updatedUser) {
        throw new Error('User not found');
      }
      
      console.log('User updated successfully:', updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      
      // Re-throw the error instead of falling back to original user
      throw error;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      console.log(`DatabaseStorage: Attempting to delete user with ID: ${id}`);
      
      // Check for related appointments first
      const relatedAppointments = await db.select().from(appointments).where(eq(appointments.clientId, id));
      console.log(`DatabaseStorage: Found ${relatedAppointments.length} related appointments for user ${id}`);
      
      if (relatedAppointments.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedAppointments.length} appointments`);
        throw new Error(`Cannot delete user - has ${relatedAppointments.length} associated appointments. Please delete or reassign appointments first.`);
      }
      
      // Check for related cancelled appointments
      const relatedCancelledAppointments = await db.select().from(cancelledAppointments).where(eq(cancelledAppointments.clientId, id));
      console.log(`DatabaseStorage: Found ${relatedCancelledAppointments.length} related cancelled appointments for user ${id}`);
      
      if (relatedCancelledAppointments.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedCancelledAppointments.length} cancelled appointments`);
        throw new Error(`Cannot delete user - has ${relatedCancelledAppointments.length} associated cancelled appointments. Please delete or reassign cancelled appointments first.`);
      }
      
      // Check for related appointment history
      const relatedAppointmentHistory = await db.select().from(appointmentHistory).where(eq(appointmentHistory.clientId, id));
      console.log(`DatabaseStorage: Found ${relatedAppointmentHistory.length} related appointment history records for user ${id}`);
      
      if (relatedAppointmentHistory.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedAppointmentHistory.length} appointment history records`);
        throw new Error(`Cannot delete user - has ${relatedAppointmentHistory.length} associated appointment history records. Please delete or reassign appointment history first.`);
      }
      
      // Check for related client memberships
      const relatedClientMemberships = await db.select().from(clientMemberships).where(eq(clientMemberships.clientId, id));
      console.log(`DatabaseStorage: Found ${relatedClientMemberships.length} related client memberships for user ${id}`);
      
      if (relatedClientMemberships.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedClientMemberships.length} client memberships`);
        throw new Error(`Cannot delete user - has ${relatedClientMemberships.length} associated client memberships. Please delete or reassign memberships first.`);
      }
      
      // Check for related payments
      const relatedPayments = await db.select().from(payments).where(eq(payments.clientId, id));
      console.log(`DatabaseStorage: Found ${relatedPayments.length} related payments for user ${id}`);
      
      if (relatedPayments.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedPayments.length} payments`);
        throw new Error(`Cannot delete user - has ${relatedPayments.length} associated payments. Please delete or reassign payments first.`);
      }
      
      // Check for related saved payment methods
      const relatedSavedPaymentMethods = await db.select().from(savedPaymentMethods).where(eq(savedPaymentMethods.clientId, id));
      console.log(`DatabaseStorage: Found ${relatedSavedPaymentMethods.length} related saved payment methods for user ${id}`);
      
      if (relatedSavedPaymentMethods.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedSavedPaymentMethods.length} saved payment methods`);
        throw new Error(`Cannot delete user - has ${relatedSavedPaymentMethods.length} associated saved payment methods. Please delete or reassign payment methods first.`);
      }
      
      // Check for related saved gift cards
      const relatedSavedGiftCards = await db.select().from(savedGiftCards).where(eq(savedGiftCards.clientId, id));
      console.log(`DatabaseStorage: Found ${relatedSavedGiftCards.length} related saved gift cards for user ${id}`);
      
      if (relatedSavedGiftCards.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedSavedGiftCards.length} saved gift cards`);
        throw new Error(`Cannot delete user - has ${relatedSavedGiftCards.length} associated saved gift cards. Please delete or reassign gift cards first.`);
      }
      
      // Handle related user permission groups by removing mappings instead of blocking deletion
      const relatedUserPermissionGroups = await db.select().from(userPermissionGroups).where(eq(userPermissionGroups.userId, id));
      console.log(`DatabaseStorage: Found ${relatedUserPermissionGroups.length} related user permission groups for user ${id}`);
      if (relatedUserPermissionGroups.length > 0) {
        console.log(`DatabaseStorage: Auto-removing ${relatedUserPermissionGroups.length} user permission group mappings for user ${id} before deletion`);
        await db.delete(userPermissionGroups).where(eq(userPermissionGroups.userId, id));
      }
      
      // Check for related user direct permissions
      const relatedUserDirectPermissions = await db.select().from(userDirectPermissions).where(eq(userDirectPermissions.userId, id));
      console.log(`DatabaseStorage: Found ${relatedUserDirectPermissions.length} related user direct permissions for user ${id}`);
      
      if (relatedUserDirectPermissions.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedUserDirectPermissions.length} user direct permissions`);
        throw new Error(`Cannot delete user - has ${relatedUserDirectPermissions.length} associated user direct permissions. Please delete or reassign permissions first.`);
      }
      
      // Check for related notifications
      const relatedNotifications = await db.select().from(notifications).where(eq(notifications.userId, id));
      console.log(`DatabaseStorage: Found ${relatedNotifications.length} related notifications for user ${id}`);
      
      if (relatedNotifications.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedNotifications.length} notifications`);
        throw new Error(`Cannot delete user - has ${relatedNotifications.length} associated notifications. Please delete or reassign notifications first.`);
      }
      
      // Check for related phone calls
      const relatedPhoneCalls = await db.select().from(phoneCalls).where(eq(phoneCalls.userId, id));
      console.log(`DatabaseStorage: Found ${relatedPhoneCalls.length} related phone calls for user ${id}`);
      
      if (relatedPhoneCalls.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedPhoneCalls.length} phone calls`);
        throw new Error(`Cannot delete user - has ${relatedPhoneCalls.length} associated phone calls. Please delete or reassign phone calls first.`);
      }
      
      // Check for related form submissions
      const relatedFormSubmissions = await db.select().from(formSubmissions).where(eq(formSubmissions.clientId, id));
      console.log(`DatabaseStorage: Found ${relatedFormSubmissions.length} related form submissions for user ${id}`);
      
      if (relatedFormSubmissions.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedFormSubmissions.length} form submissions`);
        throw new Error(`Cannot delete user - has ${relatedFormSubmissions.length} associated form submissions. Please delete or reassign form submissions first.`);
      }
      
      // Check for related LLM conversations
      const relatedLLMConversations = await db.select().from(llmConversations).where(eq(llmConversations.clientId, id));
      console.log(`DatabaseStorage: Found ${relatedLLMConversations.length} related LLM conversations for user ${id}`);
      
      if (relatedLLMConversations.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedLLMConversations.length} LLM conversations`);
        throw new Error(`Cannot delete user - has ${relatedLLMConversations.length} associated LLM conversations. Please delete or reassign conversations first.`);
      }
      
      // Check for related note history
      const relatedNoteHistory = await db.select().from(noteHistory).where(eq(noteHistory.clientId, id));
      console.log(`DatabaseStorage: Found ${relatedNoteHistory.length} related note history for user ${id}`);
      
      if (relatedNoteHistory.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedNoteHistory.length} note history records`);
        throw new Error(`Cannot delete user - has ${relatedNoteHistory.length} associated note history records. Please delete or reassign note history first.`);
      }
      
      // Check for related user color preferences
      const relatedUserColorPreferences = await db.select().from(userColorPreferences).where(eq(userColorPreferences.userId, id));
      console.log(`DatabaseStorage: Found ${relatedUserColorPreferences.length} related user color preferences for user ${id}`);
      
      if (relatedUserColorPreferences.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedUserColorPreferences.length} user color preferences`);
        throw new Error(`Cannot delete user - has ${relatedUserColorPreferences.length} associated user color preferences. Please delete or reassign color preferences first.`);
      }
      
      // Check for related email unsubscribes
      const relatedEmailUnsubscribes = await db.select().from(emailUnsubscribes).where(eq(emailUnsubscribes.userId, id));
      console.log(`DatabaseStorage: Found ${relatedEmailUnsubscribes.length} related email unsubscribes for user ${id}`);
      
      if (relatedEmailUnsubscribes.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedEmailUnsubscribes.length} email unsubscribes`);
        throw new Error(`Cannot delete user - has ${relatedEmailUnsubscribes.length} associated email unsubscribes. Please delete or reassign email unsubscribes first.`);
      }
      
      // Check for related marketing campaign recipients
      const relatedMarketingCampaignRecipients = await db.select().from(marketingCampaignRecipients).where(eq(marketingCampaignRecipients.userId, id));
      console.log(`DatabaseStorage: Found ${relatedMarketingCampaignRecipients.length} related marketing campaign recipients for user ${id}`);
      
      if (relatedMarketingCampaignRecipients.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedMarketingCampaignRecipients.length} marketing campaign recipients`);
        throw new Error(`Cannot delete user - has ${relatedMarketingCampaignRecipients.length} associated marketing campaign recipients. Please delete or reassign marketing campaign recipients first.`);
      }
      
      // Check for related sales history
      const relatedSalesHistory = await db.select().from(salesHistory).where(eq(salesHistory.clientId, id));
      console.log(`DatabaseStorage: Found ${relatedSalesHistory.length} related sales history for user ${id}`);
      
      if (relatedSalesHistory.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedSalesHistory.length} sales history records`);
        throw new Error(`Cannot delete user - has ${relatedSalesHistory.length} associated sales history records. Please delete or reassign sales history first.`);
      }
      
      // Check for related staff earnings (if user is staff)
      const relatedStaffEarnings = await db.select().from(staffEarnings).where(eq(staffEarnings.staffId, id));
      console.log(`DatabaseStorage: Found ${relatedStaffEarnings.length} related staff earnings for user ${id}`);
      
      if (relatedStaffEarnings.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedStaffEarnings.length} staff earnings records`);
        throw new Error(`Cannot delete user - has ${relatedStaffEarnings.length} associated staff earnings records. Please delete or reassign staff earnings first.`);
      }
      
      // Check for related payroll history (if user is staff)
      const relatedPayrollHistory = await db.select().from(payrollHistory).where(eq(payrollHistory.staffId, id));
      console.log(`DatabaseStorage: Found ${relatedPayrollHistory.length} related payroll history for user ${id}`);
      
      if (relatedPayrollHistory.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedPayrollHistory.length} payroll history records`);
        throw new Error(`Cannot delete user - has ${relatedPayrollHistory.length} associated payroll history records. Please delete or reassign payroll history first.`);
      }
      
      // Check for related time clock entries (if user is staff)
      const relatedTimeClockEntries = await db.select().from(timeClockEntries).where(eq(timeClockEntries.staffId, id));
      console.log(`DatabaseStorage: Found ${relatedTimeClockEntries.length} related time clock entries for user ${id}`);
      
      if (relatedTimeClockEntries.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedTimeClockEntries.length} time clock entries`);
        throw new Error(`Cannot delete user - has ${relatedTimeClockEntries.length} associated time clock entries. Please delete or reassign time clock entries first.`);
      }
      
      // Check for related staff schedules (if user is staff)
      const relatedStaffSchedules = await db
        .select({ id: staffSchedules.id })
        .from(staffSchedules)
        .where(eq(staffSchedules.staffId, id));
      console.log(`DatabaseStorage: Found ${relatedStaffSchedules.length} related staff schedules for user ${id}`);
      
      if (relatedStaffSchedules.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedStaffSchedules.length} staff schedules`);
        throw new Error(`Cannot delete user - has ${relatedStaffSchedules.length} associated staff schedules. Please delete or reassign staff schedules first.`);
      }
      
      // Check for related staff services (if user is staff)
      const relatedStaffServices = await db.select().from(staffServices).where(eq(staffServices.staffId, id));
      console.log(`DatabaseStorage: Found ${relatedStaffServices.length} related staff services for user ${id}`);
      
      if (relatedStaffServices.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedStaffServices.length} staff services`);
        throw new Error(`Cannot delete user - has ${relatedStaffServices.length} associated staff services. Please delete or reassign staff services first.`);
      }
      
      // Check for related staff records
      const relatedStaff = await db.select().from(staff).where(eq(staff.userId, id));
      console.log(`DatabaseStorage: Found ${relatedStaff.length} related staff records for user ${id}`);
      
      if (relatedStaff.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedStaff.length} staff records`);
        throw new Error(`Cannot delete user - has ${relatedStaff.length} associated staff records. Please delete or reassign staff records first.`);
      }
      
      // Skip checking permission groups createdBy to avoid dependency on optional columns during cleanup
      
      // Check for related gift cards purchased by this user
      const relatedGiftCards = await db.select().from(giftCards).where(eq(giftCards.purchasedByUserId, id));
      console.log(`DatabaseStorage: Found ${relatedGiftCards.length} related gift cards purchased by user ${id}`);
      
      if (relatedGiftCards.length > 0) {
        console.log(`DatabaseStorage: Cannot delete user ${id} - has ${relatedGiftCards.length} gift cards purchased by this user`);
        throw new Error(`Cannot delete user - has ${relatedGiftCards.length} associated gift cards purchased by this user. Please delete or reassign gift cards first.`);
      }
      
      // If we get here, all checks passed - proceed with deletion
      console.log(`DatabaseStorage: All checks passed, proceeding with user deletion for ID: ${id}`);
      
      const result = await db.delete(users).where(eq(users.id, id));
      const success = result.rowCount ? result.rowCount > 0 : false;
      
      console.log(`DatabaseStorage: User deletion result:`, success);
      return success;
    } catch (error) {
      console.error(`DatabaseStorage: Error deleting user ${id}:`, error);
      throw error; // Re-throw to bubble up the specific error message
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
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
    const [category] = await db.select().from(serviceCategories).where(eq(serviceCategories.id, id));
    return category;
  }

  async getServiceCategoryByName(name: string): Promise<ServiceCategory | undefined> {
    const [category] = await db.select().from(serviceCategories).where(eq(serviceCategories.name, name));
    return category;
  }

  async getAllServiceCategories(): Promise<ServiceCategory[]> {
    return await db.select().from(serviceCategories);
  }

  async updateServiceCategory(id: number, categoryData: Partial<InsertServiceCategory>): Promise<ServiceCategory> {
    const [updatedCategory] = await db
      .update(serviceCategories)
      .set(categoryData)
      .where(eq(serviceCategories.id, id))
      .returning();
    if (!updatedCategory) {
      throw new Error('Service category not found');
    }
    return updatedCategory;
  }

  async deleteServiceCategory(id: number): Promise<boolean> {
    const result = await db.delete(serviceCategories).where(eq(serviceCategories.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Room operations
  async createRoom(room: InsertRoom): Promise<Room> {
    try {
      const [newRoom] = await db.insert(rooms).values(room).returning();
      return newRoom;
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : '';
      // If the rooms table itself doesn't exist, create a minimal version and retry
      if (/relation\s+\"?rooms\"?\s+does\s+not\s+exist/i.test(message)) {
        const name = (room as any).name;
        if (!name) throw err;
        const description = (room as any).description ?? null;
        const capacity = (room as any).capacity ?? 1;
        const isActive = (room as any).isActive ?? true;
        try {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS rooms (
              id SERIAL PRIMARY KEY,
              name TEXT NOT NULL,
              description TEXT,
              capacity INTEGER DEFAULT 1,
              is_active BOOLEAN DEFAULT TRUE
            )
          `);
        } catch {}
        const resultCreate: any = await db.execute(sql`
          INSERT INTO rooms (name, description, capacity, is_active)
          VALUES (${name}, ${description}, ${capacity}, ${isActive})
          RETURNING id, name, description, capacity, is_active AS "isActive"
        `);
        const rowsCreate = (resultCreate?.rows ?? resultCreate) as any[];
        if (!rowsCreate?.[0]) throw err;
        return rowsCreate[0] as Room;
      }
      // Fallback for older schemas that may be missing optional columns
      if (/does\s+not\s+exist/i.test(message) || /column\s+\"?location_id\"?\s+does\s+not\s+exist/i.test(message)) {
        const name = (room as any).name;
        if (!name) throw err;
        const description = (room as any).description ?? null;
        const capacity = (room as any).capacity ?? 1;
        const isActive = (room as any).isActive ?? true;

        // Attempt progressively simpler inserts without relying on missing columns
        // 1) name, description, capacity, is_active
        try {
          const res1: any = await db.execute(sql`
            INSERT INTO rooms (name, description, capacity, is_active)
            VALUES (${name}, ${description}, ${capacity}, ${isActive})
            RETURNING id, name, description, capacity, is_active AS "isActive"
          `);
          const rows1 = (res1?.rows ?? res1) as any[];
          if (rows1?.[0]) return rows1[0] as Room;
        } catch {}

        // 2) name, description, capacity
        try {
          const res2: any = await db.execute(sql`
            INSERT INTO rooms (name, description, capacity)
            VALUES (${name}, ${description}, ${capacity})
            RETURNING id, name, description, capacity
          `);
          const rows2 = (res2?.rows ?? res2) as any[];
          if (rows2?.[0]) return rows2[0] as Room;
        } catch {}

        // 3) name, description
        try {
          const res3: any = await db.execute(sql`
            INSERT INTO rooms (name, description)
            VALUES (${name}, ${description})
            RETURNING id, name, description
          `);
          const rows3 = (res3?.rows ?? res3) as any[];
          if (rows3?.[0]) return rows3[0] as Room;
        } catch {}

        // 4) name only
        const res4: any = await db.execute(sql`
          INSERT INTO rooms (name)
          VALUES (${name})
          RETURNING id, name
        `);
        const rows4 = (res4?.rows ?? res4) as any[];
        if (!rows4?.[0]) throw err;
        return rows4[0] as Room;
      }
      throw err;
    }
  }

  async getRoom(id: number): Promise<Room | undefined> {
    const result = await db.select().from(rooms).where(eq(rooms.id, id));
    return result[0];
  }

  async getAllRooms(): Promise<Room[]> {
    return await db.select().from(rooms);
  }

  async updateRoom(id: number, roomData: Partial<InsertRoom>): Promise<Room> {
    const [updatedRoom] = await db.update(rooms).set(roomData).where(eq(rooms.id, id)).returning();
    if (!updatedRoom) {
      throw new Error("Room not found");
    }
    return updatedRoom;
  }

  async deleteRoom(id: number): Promise<boolean> {
    const result = await db.delete(rooms).where(eq(rooms.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Device operations
  async createDevice(device: InsertDevice): Promise<Device> {
    const [newDevice] = await db.insert(devices).values(device).returning();
    return newDevice;
  }

  async getDevice(id: number): Promise<Device | undefined> {
    const result = await db.select().from(devices).where(eq(devices.id, id));
    return result[0];
  }

  async getAllDevices(): Promise<Device[]> {
    return await db.select().from(devices);
  }

  async updateDevice(id: number, deviceData: Partial<InsertDevice>): Promise<Device> {
    const [updatedDevice] = await db.update(devices).set(deviceData).where(eq(devices.id, id)).returning();
    if (!updatedDevice) {
      throw new Error(`Device with id ${id} not found`);
    }
    return updatedDevice;
  }

  async deleteDevice(id: number): Promise<boolean> {
    const result = await db.delete(devices).where(eq(devices.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Service operations
  async createService(service: InsertService): Promise<Service> {
    try {
      const [created] = await db.insert(services).values(service as any).returning();
      return created;
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : '';
      if (/does\s+not\s+exist/i.test(message)) {
        // Fallback to minimal raw SQL insert for older schemas missing optional columns
        // Required columns: name, duration, price, category_id
        const name = (service as any).name;
        const duration = Number((service as any).duration);
        const price = Number((service as any).price);
        const categoryId = Number((service as any).categoryId);

        if (!name || !Number.isFinite(duration) || !Number.isFinite(price) || !Number.isFinite(categoryId)) {
          throw err;
        }

        const result: any = await db.execute(sql`
          INSERT INTO services (name, duration, price, category_id)
          VALUES (${name}, ${duration}, ${price}, ${categoryId})
          RETURNING id, name, duration, price, category_id AS "categoryId"
        `);
        const rows = (result?.rows ?? result) as any[];
        if (!rows?.[0]) throw err;
        return rows[0] as Service;
      }
      throw err;
    }
  }

  async getService(id: number): Promise<Service | undefined> {
    try {
      const [row] = await db.select().from(services).where(eq(services.id, id));
      return row;
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : '';
      if (/does\s+not\s+exist/i.test(message)) {
        const result: any = await db.execute(sql`
          SELECT 
            id, name, description, duration, price,
            category_id AS "categoryId",
            color,
            is_active AS "isActive"
          FROM services
          WHERE id = ${id}
          LIMIT 1
        `);
        const rows = (result?.rows ?? result) as any[];
        return rows?.[0] as Service | undefined;
      }
      throw err;
    }
  }

  async getServiceByName(name: string): Promise<Service | undefined> {
    try {
      const [row] = await db.select().from(services).where(eq(services.name, name));
      return row;
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : '';
      if (/does\s+not\s+exist/i.test(message)) {
        const result: any = await db.execute(sql`
          SELECT 
            id, name, description, duration, price,
            category_id AS "categoryId",
            color,
            is_active AS "isActive"
          FROM services
          WHERE name = ${name}
          LIMIT 1
        `);
        const rows = (result?.rows ?? result) as any[];
        return rows?.[0] as Service | undefined;
      }
      throw err;
    }
  }

  async getServicesByCategory(categoryId: number): Promise<Service[]> {
    try {
      return await db.select().from(services).where(eq(services.categoryId, categoryId));
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : '';
      if (/does\s+not\s+exist/i.test(message)) {
        const result: any = await db.execute(sql`
          SELECT 
            id, name, description, duration, price,
            category_id AS "categoryId",
            color,
            is_active AS "isActive"
          FROM services
          WHERE category_id = ${categoryId}
        `);
        const rows = (result?.rows ?? result) as any[];
        return rows as Service[];
      }
      throw err;
    }
  }

  async getAllServices(): Promise<Service[]> {
    try {
      return await db.select().from(services);
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : '';
      if (/does\s+not\s+exist/i.test(message)) {
        const result: any = await db.execute(sql`
          SELECT 
            id, name, description, duration, price,
            category_id AS "categoryId",
            color,
            is_active AS "isActive"
          FROM services
        `);
        const rows = (result?.rows ?? result) as any[];
        return rows as Service[];
      }
      throw err;
    }
  }

  async updateService(id: number, serviceData: Partial<InsertService>): Promise<Service> {
    try {
      const [updated] = await db.update(services).set(serviceData as any).where(eq(services.id, id)).returning();
      return updated as Service;
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : '';
      // Fallback: if RETURNING or columns cause issues (legacy schema), try update without returning, then re-fetch
      if (/does\s+not\s+exist/i.test(message) || /RETURNING/i.test(message)) {
        await db.update(services).set(serviceData as any).where(eq(services.id, id));
        // Use robust getter that handles missing columns via raw SQL fallback
        const svc = await this.getService(id);
        if (!svc) {
          throw new Error('Service updated but could not be re-fetched');
        }
        return svc as Service;
      }
      throw err;
    }
  }

  async deleteService(id: number): Promise<boolean> {
    const result = await db.delete(services).where(eq(services.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getServiceAvailability(serviceId: number, date: Date, staffId?: number): Promise<string[]> {
    return [];
  }

  async getPopularServices(limit: number, periodDays: number): Promise<Service[]> {
    const all = await this.getAllServices();
    return all.slice(0, Math.max(0, limit));
  }

  async getServiceStatistics(serviceId: number, startDate: Date, endDate: Date): Promise<any> {
    return { totalAppointments: 0, totalRevenue: 0, averageDurationMinutes: null, startDate, endDate };
  }

  async getServicesByStatus(isActive: boolean): Promise<Service[]> {
    try {
      return await db.select().from(services).where(eq(services.isActive as any, isActive));
    } catch (err: any) {
      const message = typeof err?.message === 'string' ? err.message : '';
      if (/does\s+not\s+exist/i.test(message)) {
        const result: any = await db.execute(sql`
          SELECT 
            id, name, description, duration, price,
            category_id AS "categoryId",
            color,
            is_active AS "isActive"
          FROM services
          WHERE is_active = ${isActive}
        `);
        const rows = (result?.rows ?? result) as any[];
        return rows as Service[];
      }
      throw err;
    }
  }

  // Classes operations
  async createClass(data: InsertClass): Promise<Class> {
    const [created] = await db.insert(classes).values(data as any).returning();
    return created as unknown as Class;
  }

  async getClass(id: number): Promise<Class | undefined> {
    const [row] = await db.select().from(classes).where(eq(classes.id, id));
    return row as unknown as Class | undefined;
  }

  async getAllClasses(): Promise<Class[]> {
    const rows = await db.select().from(classes).orderBy(desc(classes.startTime));
    return rows as unknown as Class[];
  }

  async getClassesByLocation(locationId: number): Promise<Class[]> {
    const rows = await db.select().from(classes).where(eq(classes.locationId, locationId)).orderBy(desc(classes.startTime));
    return rows as unknown as Class[];
  }

  async updateClass(id: number, data: Partial<InsertClass>): Promise<Class> {
    const [updated] = await db.update(classes).set(data as any).where(eq(classes.id, id)).returning();
    if (!updated) throw new Error('Class not found');
    return updated as unknown as Class;
  }

  async deleteClass(id: number): Promise<boolean> {
    const result = await db.delete(classes).where(eq(classes.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Class Enrollment operations
  async createClassEnrollment(data: InsertClassEnrollment): Promise<ClassEnrollment> {
    const [created] = await db.insert(classEnrollments).values(data as any).returning();
    return created as unknown as ClassEnrollment;
  }

  async getClassEnrollment(id: number): Promise<ClassEnrollment | undefined> {
    const [row] = await db.select().from(classEnrollments).where(eq(classEnrollments.id, id));
    return row as unknown as ClassEnrollment | undefined;
  }

  async getEnrollmentsByClass(classId: number): Promise<ClassEnrollment[]> {
    const rows = await db.select().from(classEnrollments).where(eq(classEnrollments.classId, classId)).orderBy(desc(classEnrollments.createdAt));
    return rows as unknown as ClassEnrollment[];
  }

  async getEnrollmentsByClient(clientId: number): Promise<ClassEnrollment[]> {
    const rows = await db.select().from(classEnrollments).where(eq(classEnrollments.clientId, clientId)).orderBy(desc(classEnrollments.createdAt));
    return rows as unknown as ClassEnrollment[];
  }

  async updateClassEnrollment(id: number, data: Partial<InsertClassEnrollment>): Promise<ClassEnrollment> {
    const [updated] = await db.update(classEnrollments).set(data as any).where(eq(classEnrollments.id, id)).returning();
    if (!updated) throw new Error('Class enrollment not found');
    return updated as unknown as ClassEnrollment;
  }

  async deleteClassEnrollment(id: number): Promise<boolean> {
    const result = await db.delete(classEnrollments).where(eq(classEnrollments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // -----------------------------
  // Add-on mapping operations
  // Stored as JSON in system_config under key 'service_add_on_mapping'
  // Shape: { [addOnServiceId: string]: number[] }
  async getAddOnMapping(): Promise<Record<string, number[]>> {
    try {
      const cfg = await this.getSystemConfig('service_add_on_mapping');
      const raw = cfg?.value || '{}';
      try { return JSON.parse(raw) as Record<string, number[]>; } catch { return {}; }
    } catch {
      return {};
    }
  }

  async setAddOnMapping(map: Record<string, number[]>): Promise<void> {
    const value = JSON.stringify(map);
    await this.updateSystemConfig('service_add_on_mapping', value, 'JSON mapping of add-on -> base services');
  }

  async getBaseServicesForAddOn(addOnServiceId: number): Promise<number[]> {
    const map = await this.getAddOnMapping();
    return map[String(addOnServiceId)] || [];
  }

  async setBaseServicesForAddOn(addOnServiceId: number, baseServiceIds: number[]): Promise<void> {
    const map = await this.getAddOnMapping();
    map[String(addOnServiceId)] = Array.from(new Set(baseServiceIds.map((n) => Number(n))));
    await this.setAddOnMapping(map);
  }

  async addBaseServiceToAddOn(addOnServiceId: number, baseServiceId: number): Promise<void> {
    const current = await this.getBaseServicesForAddOn(addOnServiceId);
    if (!current.includes(Number(baseServiceId))) {
      current.push(Number(baseServiceId));
      await this.setBaseServicesForAddOn(addOnServiceId, current);
    }
  }

  async removeBaseServiceFromAddOn(addOnServiceId: number, baseServiceId: number): Promise<void> {
    const current = await this.getBaseServicesForAddOn(addOnServiceId);
    const next = current.filter((id) => Number(id) !== Number(baseServiceId));
    await this.setBaseServicesForAddOn(addOnServiceId, next);
  }

  async getBaseServiceObjectsForAddOn(addOnServiceId: number): Promise<Service[]> {
    const ids = await this.getBaseServicesForAddOn(addOnServiceId);
    const all = await this.getAllServices();
    const idSet = new Set(ids.map(Number));
    return all.filter((s) => idSet.has(Number(s.id)));
  }

  // -----------------------------
  // Appointment add-on mapping operations
  // Stored as JSON in system_config under key 'appointment_add_on_mapping'
  // Shape: { [appointmentId: string]: number[] }
  async getAppointmentAddOnMapping(): Promise<Record<string, number[]>> {
    try {
      const cfg = await this.getSystemConfig('appointment_add_on_mapping');
      const raw = cfg?.value || '{}';
      try { return JSON.parse(raw) as Record<string, number[]>; } catch { return {}; }
    } catch {
      return {};
    }
  }

  async setAppointmentAddOnMapping(map: Record<string, number[]>): Promise<void> {
    const value = JSON.stringify(map);
    await this.updateSystemConfig('appointment_add_on_mapping', value, 'JSON mapping of appointmentId -> [addOnServiceIds]');
  }

  async getAddOnsForAppointment(appointmentId: number): Promise<number[]> {
    const map = await this.getAppointmentAddOnMapping();
    return map[String(appointmentId)] || [];
  }

  async setAddOnsForAppointment(appointmentId: number, addOnServiceIds: number[]): Promise<void> {
    const map = await this.getAppointmentAddOnMapping();
    map[String(appointmentId)] = Array.from(new Set(addOnServiceIds.map((n) => Number(n))));
    await this.setAppointmentAddOnMapping(map);
  }

  async addAddOnToAppointment(appointmentId: number, addOnServiceId: number): Promise<void> {
    const current = await this.getAddOnsForAppointment(appointmentId);
    if (!current.includes(Number(addOnServiceId))) {
      current.push(Number(addOnServiceId));
      await this.setAddOnsForAppointment(appointmentId, current);
    }
  }

  async removeAddOnFromAppointment(appointmentId: number, addOnServiceId: number): Promise<void> {
    const current = await this.getAddOnsForAppointment(appointmentId);
    const next = current.filter((id) => Number(id) !== Number(addOnServiceId));
    await this.setAddOnsForAppointment(appointmentId, next);
  }

  async getAddOnServiceObjectsForAppointment(appointmentId: number): Promise<Service[]> {
    const ids = await this.getAddOnsForAppointment(appointmentId);
    const all = await this.getAllServices();
    const idSet = new Set(ids.map(Number));
    return all.filter((s) => idSet.has(Number(s.id)));
  }

  // Staff operations
  async createStaff(staffMember: InsertStaff): Promise<Staff> {
    // Insert only columns guaranteed to exist in the current DB
    const insertData: any = {
      userId: (staffMember as any).userId,
      title: (staffMember as any).title,
      bio: (staffMember as any).bio ?? null,
      commissionType: (staffMember as any).commissionType,
      commissionRate: (staffMember as any).commissionRate ?? null,
      hourlyRate: (staffMember as any).hourlyRate ?? null,
      fixedRate: (staffMember as any).fixedRate ?? null,
    };
    const locationId = (staffMember as any).locationId ?? null;
    // Use explicit SQL to avoid referencing non-existent photo_url in some DBs
    const result: any = await db.execute(sql`
      INSERT INTO "staff" (
        "user_id", "title", "bio", "commission_type", "commission_rate", "hourly_rate", "fixed_rate", "location_id"
      ) VALUES (
        ${insertData.userId}, ${insertData.title}, ${insertData.bio}, ${insertData.commissionType}, ${insertData.commissionRate}, ${insertData.hourlyRate}, ${insertData.fixedRate}, ${locationId}
      ) RETURNING 
        "id", "user_id" as "userId", "title", "bio", "commission_type" as "commissionType", 
        "commission_rate" as "commissionRate", "hourly_rate" as "hourlyRate", "fixed_rate" as "fixedRate", "location_id" as "locationId";
    `);
    return result.rows[0] as Staff;
  }

  async getStaff(id: number): Promise<Staff | undefined> {
    const [result] = await db
      .select({
        id: staff.id,
        userId: staff.userId,
        title: staff.title,
        bio: staff.bio,
        locationId: staff.locationId,
        commissionType: staff.commissionType,
        commissionRate: staff.commissionRate,
        hourlyRate: staff.hourlyRate,
        fixedRate: staff.fixedRate,
      })
      .from(staff)
      .where(eq(staff.id, id));
    return result as unknown as Staff | undefined;
  }

  async getStaffByUserId(userId: number): Promise<Staff | undefined> {
    try {
      const [result] = await db
        .select({
          id: staff.id,
          userId: staff.userId,
          title: staff.title,
          bio: staff.bio,
          locationId: staff.locationId,
          commissionType: staff.commissionType,
          commissionRate: staff.commissionRate,
          hourlyRate: staff.hourlyRate,
          fixedRate: staff.fixedRate,
        })
        .from(staff)
        .where(eq(staff.userId, userId));
      return result as unknown as Staff | undefined;
    } catch (error) {
      console.error('Error getting staff by user id:', error);
      return undefined;
    }
  }

  async getAllStaff(): Promise<Staff[]> {
    try {
      const result = await db
        .select({
          id: staff.id,
          userId: staff.userId,
          title: staff.title,
          bio: staff.bio,
          locationId: staff.locationId,
          commissionType: staff.commissionType,
          commissionRate: staff.commissionRate,
          hourlyRate: staff.hourlyRate,
          fixedRate: staff.fixedRate,
        })
        .from(staff)
        .where(eq(staff.isActive, true))
        .orderBy(staff.id);
      console.log('Retrieved staff from database:', result);
      return result as unknown as Staff[];
    } catch (error) {
      console.error('Error getting staff:', error);
      return [];
    }
  }

  async updateStaff(id: number, staffData: Partial<InsertStaff>): Promise<Staff> {
    try {
      // Whitelist updatable columns only; include keys present even if null to allow clearing values
      const safeUpdate: any = {};
      if ((staffData as any).title !== undefined) safeUpdate.title = (staffData as any).title;
      if ((staffData as any).bio !== undefined) safeUpdate.bio = (staffData as any).bio;
      if ((staffData as any).locationId !== undefined) safeUpdate.locationId = (staffData as any).locationId;
      if ((staffData as any).commissionType !== undefined) safeUpdate.commissionType = (staffData as any).commissionType;
      if ((staffData as any).commissionRate !== undefined) safeUpdate.commissionRate = (staffData as any).commissionRate;
      if ((staffData as any).hourlyRate !== undefined) safeUpdate.hourlyRate = (staffData as any).hourlyRate;
      if ((staffData as any).fixedRate !== undefined) safeUpdate.fixedRate = (staffData as any).fixedRate;
      if ((staffData as any).isActive !== undefined) safeUpdate.isActive = (staffData as any).isActive;

      const [result] = await db
        .update(staff)
        .set(safeUpdate)
        .where(eq(staff.id, id))
        .returning({
          id: staff.id,
          userId: staff.userId,
          title: staff.title,
          bio: staff.bio,
          locationId: staff.locationId,
          commissionType: staff.commissionType,
          commissionRate: staff.commissionRate,
          hourlyRate: staff.hourlyRate,
          fixedRate: staff.fixedRate,
        });
      if (!result) {
        throw new Error('Staff member not found');
      }
      return result as unknown as Staff;
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

  async getAllStaffServices(): Promise<StaffService[]> {
    try {
      return await db.select().from(staffServices);
    } catch (error) {
      console.error('Error getting all staff services:', error);
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

  async getStaffServiceAssignment(staffId: number, serviceId: number): Promise<StaffService | undefined> {
    try {
      const [staffService] = await db.select().from(staffServices).where(
        and(eq(staffServices.staffId, staffId), eq(staffServices.serviceId, serviceId))
      );
      return staffService;
    } catch (error) {
      console.error('Error getting staff service assignment:', error);
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
    const appointmentData = await db
      .select({
        appointments,
        staff: {
          id: staff.id,
          userId: staff.userId,
          title: staff.title,
          bio: staff.bio,
          locationId: staff.locationId,
          commissionType: staff.commissionType,
          commissionRate: staff.commissionRate,
          hourlyRate: staff.hourlyRate,
          fixedRate: staff.fixedRate,
        },
        users,
      })
      .from(appointments)
      .where(eq(appointments.id, id))
      .leftJoin(staff, eq(appointments.staffId, staff.id))
      .leftJoin(users, eq(staff.userId, users.id));

    if (!appointmentData || appointmentData.length === 0) return undefined;
    
    const row = appointmentData[0];
    const appointment = row.appointments;
    
    // Convert local datetime strings to Date objects for frontend
    return {
      ...appointment,
      startTime: this.convertLocalToDate(appointment.startTime),
      endTime: this.convertLocalToDate(appointment.endTime)
    };
  }

  async getAllAppointments(): Promise<Appointment[]> {
    const appointmentList = await db
      .select({
        appointments,
        staff: {
          id: staff.id,
          userId: staff.userId,
          title: staff.title,
          bio: staff.bio,
          locationId: staff.locationId,
          commissionType: staff.commissionType,
          commissionRate: staff.commissionRate,
          hourlyRate: staff.hourlyRate,
          fixedRate: staff.fixedRate,
        },
        users,
      })
      .from(appointments)
      .leftJoin(staff, eq(appointments.staffId, staff.id))
      .leftJoin(users, eq(staff.userId, users.id))
      .orderBy(desc(appointments.startTime));
    
    // Convert local datetime strings to Date objects for frontend
    return appointmentList.map((row: any) => ({
      ...row.appointments,
      startTime: this.convertLocalToDate(row.appointments.startTime),
      endTime: this.convertLocalToDate(row.appointments.endTime),
      staff: row.staff ? {
        ...row.staff,
        user: row.users,
      } : null,
    }));
  }

  async getAppointmentById(id: string | number): Promise<Appointment | undefined> {
    const numeric = typeof id === 'string' ? parseInt(id, 10) : id;
    const [row] = await db.select().from(appointments).where(eq(appointments.id, numeric));
    return row;
  }

  private convertLocalToDate(localTimeValue: string | Date): Date {
    // If it's already a Date object, return it
    if (localTimeValue instanceof Date) {
      return localTimeValue;
    }
    
    // If it's null or undefined, return current time as fallback
    if (!localTimeValue) {
      return new Date();
    }
    
    // If it's already an ISO string (UTC timestamp), parse it directly
    // The database stores timestamps as UTC, so we can use them as-is
    if (localTimeValue.includes('T') || localTimeValue.includes('Z')) {
      return new Date(localTimeValue);
    }
    
    // Convert local datetime string (YYYY-MM-DD HH:MM:SS) to Date object
    // This is for legacy data or if we ever store local times as strings
    const [datePart, timePart] = localTimeValue.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);
    
    // Create date in local timezone
    return new Date(year, month - 1, day, hour, minute, second || 0);
  }

  async getAppointmentsByClient(clientId: number): Promise<any[]> {
    const clientAppointments = await db
      .select({
        appointments,
        services,
        staff: {
          id: staff.id,
          userId: staff.userId,
          title: staff.title,
          bio: staff.bio,
          locationId: staff.locationId,
          commissionType: staff.commissionType,
          commissionRate: staff.commissionRate,
          hourlyRate: staff.hourlyRate,
          fixedRate: staff.fixedRate,
        },
        users,
      })
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
    const appointmentList = await db
      .select({ appointments })
      .from(appointments)
      .where(eq(appointments.staffId, staffId))
      .orderBy(desc(appointments.startTime));
    
    // Convert local datetime strings to Date objects for frontend
    return appointmentList.map((appointment: any) => ({
      ...appointment,
      startTime: this.convertLocalToDate(appointment.startTime),
      endTime: this.convertLocalToDate(appointment.endTime)
    }));
  }

  async getAppointmentsByService(serviceId: number): Promise<Appointment[]> {
    const appointmentList = await db.select().from(appointments).where(eq(appointments.serviceId, serviceId)).orderBy(desc(appointments.startTime));
    
    // Convert local datetime strings to Date objects for frontend
    return appointmentList.map((appointment: any) => ({
      ...appointment,
      startTime: this.convertLocalToDate(appointment.startTime),
      endTime: this.convertLocalToDate(appointment.endTime)
    }));
  }

  async getAppointmentsByLocation(locationId: number): Promise<Appointment[]> {
    const appointmentList = await db.select().from(appointments).where(eq(appointments.locationId, locationId)).orderBy(desc(appointments.startTime));
    
    // Convert local datetime strings to Date objects for frontend
    return appointmentList.map((appointment: any) => ({
      ...appointment,
      startTime: this.convertLocalToDate(appointment.startTime),
      endTime: this.convertLocalToDate(appointment.endTime)
    }));
  }

  async getActiveAppointmentsByStaff(staffId: number): Promise<Appointment[]> {
    const appointmentList = await db.select().from(appointments).where(
      and(
        eq(appointments.staffId, staffId),
        or(
          eq(appointments.status, "pending"),
          eq(appointments.status, "confirmed"),
          eq(appointments.status, "completed")
        )
      )
    ).orderBy(desc(appointments.startTime));
    
    // Convert local datetime strings to Date objects for frontend
    return appointmentList.map((appointment: any) => ({
      ...appointment,
      startTime: this.convertLocalToDate(appointment.startTime),
      endTime: this.convertLocalToDate(appointment.endTime)
    }));
  }

  async getAppointmentsByStaffAndDateRange(staffId: number, startDate: Date, endDate: Date): Promise<Appointment[]> {
    return await db.select().from(appointments).where(
      and(
        eq(appointments.staffId, staffId),
        gte(appointments.startTime, startDate),
        lte(appointments.startTime, endDate)
      )
    ).orderBy(appointments.startTime);
  }

  async getAppointmentsByDate(date: Date): Promise<Appointment[]> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    
    const appointmentList = await db.select().from(appointments).where(
      and(
        gte(appointments.startTime, startOfDay),
        lte(appointments.startTime, endOfDay)
      )
    ).orderBy(appointments.startTime);
    
    // Convert local datetime strings to Date objects for frontend
    return appointmentList.map((appointment: any) => ({
      ...appointment,
      startTime: this.convertLocalToDate(appointment.startTime),
      endTime: this.convertLocalToDate(appointment.endTime)
    }));
  }

  async getActiveAppointmentsByDate(date: Date): Promise<Appointment[]> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    
    const appointmentList = await db.select().from(appointments).where(
      and(
        gte(appointments.startTime, startOfDay),
        lte(appointments.startTime, endOfDay),
        or(
          eq(appointments.status, "pending"),
          eq(appointments.status, "confirmed"),
          eq(appointments.status, "completed")
        )
      )
    ).orderBy(appointments.startTime);
    
    // Convert local datetime strings to Date objects for frontend
    return appointmentList.map((appointment: any) => ({
      ...appointment,
      startTime: this.convertLocalToDate(appointment.startTime),
      endTime: this.convertLocalToDate(appointment.endTime)
    }));
  }

  async getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<Appointment[]> {
    return await db.select().from(appointments).where(
      and(
        gte(appointments.startTime, startDate),
        lte(appointments.startTime, endDate)
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

  async cancelAppointment(id: string | number): Promise<boolean> {
    const numeric = typeof id === 'string' ? parseInt(id, 10) : id;
    const [updated] = await db.update(appointments).set({ status: 'cancelled' } as any).where(eq(appointments.id, numeric)).returning();
    return !!updated;
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

  // Cancelled Appointment operations
  async createCancelledAppointment(cancelledAppointment: InsertCancelledAppointment): Promise<CancelledAppointment> {
    const [newCancelledAppointment] = await db.insert(cancelledAppointments).values(cancelledAppointment).returning();
    return newCancelledAppointment;
  }

  async getCancelledAppointment(id: number): Promise<CancelledAppointment | undefined> {
    const [cancelled] = await db.select().from(cancelledAppointments).where(eq(cancelledAppointments.id, id));
    return cancelled;
  }

  async getAllCancelledAppointments(): Promise<CancelledAppointment[]> {
    return await db.select().from(cancelledAppointments).orderBy(desc(cancelledAppointments.cancelledAt));
  }

  async getCancelledAppointmentsByClient(clientId: number): Promise<CancelledAppointment[]> {
    return await db.select().from(cancelledAppointments).where(eq(cancelledAppointments.clientId, clientId)).orderBy(desc(cancelledAppointments.cancelledAt));
  }

  async getCancelledAppointmentsByStaff(staffId: number): Promise<CancelledAppointment[]> {
    return await db.select().from(cancelledAppointments).where(eq(cancelledAppointments.staffId, staffId)).orderBy(desc(cancelledAppointments.cancelledAt));
  }

  async getCancelledAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<CancelledAppointment[]> {
    return await db.select().from(cancelledAppointments).where(
      and(
        gte(cancelledAppointments.startTime, startDate),
        lte(cancelledAppointments.startTime, endDate)
      )
    ).orderBy(cancelledAppointments.startTime);
  }

  async moveAppointmentToCancelled(appointmentId: number, cancellationReason?: string, cancelledBy?: number, cancelledByRole?: string): Promise<CancelledAppointment> {
    // Get the original appointment
    const appointment = await this.getAppointment(appointmentId);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Create the cancelled appointment record
    const cancelledAppointmentData: InsertCancelledAppointment = {
      originalAppointmentId: appointment.id,
      clientId: appointment.clientId,
      serviceId: appointment.serviceId,
      staffId: appointment.staffId,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      totalAmount: appointment.totalAmount,
      notes: appointment.notes,
      cancellationReason: cancellationReason || 'No reason provided',
      cancelledBy: cancelledBy || null,
      cancelledByRole: cancelledByRole || 'system',
      paymentStatus: appointment.paymentStatus,
      refundAmount: 0,
      originalCreatedAt: appointment.createdAt ?? undefined
    };

    const cancelledAppointment = await this.createCancelledAppointment(cancelledAppointmentData);

    // Create appointment history entry for the cancellation
    await this.createAppointmentHistory({
      appointmentId: appointment.id,
      action: 'cancelled',
      actionBy: cancelledBy || null,
      actionByRole: cancelledByRole || 'system',
      previousValues: JSON.stringify(appointment),
      newValues: JSON.stringify({ status: 'cancelled', reason: cancellationReason }),
      clientId: appointment.clientId,
      serviceId: appointment.serviceId,
      staffId: appointment.staffId,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: 'cancelled',
      paymentStatus: appointment.paymentStatus,
      totalAmount: appointment.totalAmount,
      notes: appointment.notes,
      reason: cancellationReason,
      systemGenerated: false
    });

    // Remove the appointment from the active appointments table
    await this.deleteAppointment(appointmentId);

    return cancelledAppointment;
  }

  // Appointment Photo operations
  async createAppointmentPhoto(photo: InsertAppointmentPhoto): Promise<AppointmentPhoto> {
    const [newPhoto] = await db.insert(appointmentPhotos).values(photo).returning();
    return newPhoto;
  }

  async getAppointmentPhotos(appointmentId: number): Promise<AppointmentPhoto[]> {
    const photos = await db
      .select()
      .from(appointmentPhotos)
      .where(eq(appointmentPhotos.appointmentId, appointmentId))
      .orderBy(desc(appointmentPhotos.createdAt));
    
    return photos.map((photo: any) => ({
      ...photo,
      createdAt: this.convertLocalToDate(photo.createdAt)
    }));
  }

  async getAppointmentPhoto(id: number): Promise<AppointmentPhoto | undefined> {
    const [photo] = await db.select().from(appointmentPhotos).where(eq(appointmentPhotos.id, id));
    if (!photo) return undefined;
    
    return {
      ...photo,
      createdAt: photo.createdAt ? this.convertLocalToDate(photo.createdAt) : null
    };
  }

  async deleteAppointmentPhoto(id: number): Promise<boolean> {
    const result = await db.delete(appointmentPhotos).where(eq(appointmentPhotos.id, id));
    return result.rowCount > 0;
  }

  // Membership operations
  async createMembership(membership: InsertMembership): Promise<Membership> {
    const [newMembership] = await db.insert(memberships).values(membership).returning();
    return newMembership;
  }

  async getMembership(id: number): Promise<Membership | undefined> {
    const result = await db.select().from(memberships).where(eq(memberships.id, id));
    return result[0];
  }

  async getAllMemberships(): Promise<Membership[]> {
    return await db.select().from(memberships);
  }

  async updateMembership(id: number, membershipData: Partial<InsertMembership>): Promise<Membership> {
    const [updatedMembership] = await db.update(memberships).set(membershipData).where(eq(memberships.id, id)).returning();
    if (!updatedMembership) {
      throw new Error('Membership not found');
    }
    return updatedMembership;
  }

  async deleteMembership(id: number): Promise<boolean> {
    const result = await db.delete(memberships).where(eq(memberships.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Client Membership operations
  async createClientMembership(clientMembership: InsertClientMembership): Promise<ClientMembership> {
    const [newClientMembership] = await db.insert(clientMemberships).values(clientMembership).returning();
    return newClientMembership;
  }

  async getClientMembership(id: number): Promise<ClientMembership | undefined> {
    const result = await db.select().from(clientMemberships).where(eq(clientMemberships.id, id));
    return result[0];
  }

  async getClientMembershipsByClient(clientId: number): Promise<ClientMembership[]> {
    return await db.select().from(clientMemberships).where(eq(clientMemberships.clientId, clientId));
  }

  async getAllClientMemberships(): Promise<ClientMembership[]> {
    return await db.select().from(clientMemberships);
  }

  async getClientMembershipsByMembership(membershipId: number): Promise<ClientMembership[]> {
    return await db.select().from(clientMemberships).where(eq(clientMemberships.membershipId, membershipId));
  }

  async updateClientMembership(id: number, data: Partial<InsertClientMembership>): Promise<ClientMembership> {
    const [updatedClientMembership] = await db.update(clientMemberships).set(data).where(eq(clientMemberships.id, id)).returning();
    if (!updatedClientMembership) {
      throw new Error('Client membership not found');
    }
    return updatedClientMembership;
  }

  async deleteClientMembership(id: number): Promise<boolean> {
    const result = await db.delete(clientMemberships).where(eq(clientMemberships.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Payment operations
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const result = await db.select().from(payments).where(eq(payments.id, id));
    return result[0];
  }

  async getPaymentByHelcimId(helcimPaymentId: string): Promise<Payment | undefined> {
    const result = await db.select().from(payments).where(eq(payments.helcimPaymentId, helcimPaymentId));
    return result[0];
  }

  async getPaymentsByClient(clientId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.clientId, clientId));
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments);
  }

  async updatePayment(id: number, paymentData: Partial<InsertPayment>): Promise<Payment> {
    const [updatedPayment] = await db.update(payments).set(paymentData).where(eq(payments.id, id)).returning();
    if (!updatedPayment) {
      throw new Error('Payment not found');
    }
    return updatedPayment;
  }

  // Saved Payment Methods operations
  async createSavedPaymentMethod(paymentMethod: InsertSavedPaymentMethod): Promise<SavedPaymentMethod> {
    const [newPaymentMethod] = await db.insert(savedPaymentMethods).values(paymentMethod).returning();
    return newPaymentMethod;
  }

  async getSavedPaymentMethod(id: number): Promise<SavedPaymentMethod | undefined> {
    const result = await db.select().from(savedPaymentMethods).where(eq(savedPaymentMethods.id, id));
    return result[0];
  }

  async getSavedPaymentMethodsByClient(clientId: number): Promise<SavedPaymentMethod[]> {
    return await db.select().from(savedPaymentMethods).where(eq(savedPaymentMethods.clientId, clientId));
  }

  async updateSavedPaymentMethod(id: number, data: Partial<InsertSavedPaymentMethod>): Promise<SavedPaymentMethod> {
    const [updatedMethod] = await db.update(savedPaymentMethods).set(data).where(eq(savedPaymentMethods.id, id)).returning();
    if (!updatedMethod) {
      throw new Error('Saved payment method not found');
    }
    return updatedMethod;
  }

  async deleteSavedPaymentMethod(id: number): Promise<boolean> {
    const result = await db.delete(savedPaymentMethods).where(eq(savedPaymentMethods.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async setDefaultPaymentMethod(clientId: number, paymentMethodId: number): Promise<boolean> {
    // First, remove default status from all other payment methods for this client
    await db.update(savedPaymentMethods)
      .set({ isDefault: false })
      .where(and(eq(savedPaymentMethods.clientId, clientId), eq(savedPaymentMethods.isDefault, true)));
    
    // Set the specified method as default
    await db.update(savedPaymentMethods)
      .set({ isDefault: true })
      .where(eq(savedPaymentMethods.id, paymentMethodId));
    
    return true;
  }

  async updateUserSquareCustomerId(userId: number, squareCustomerId: string): Promise<User> {
    // No-op in current system; maintain compatibility by returning the user unchanged
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');
    return user as any;
  }

  async updateUserHelcimCustomerId(userId: number, helcimCustomerId: string): Promise<User> {
    return this.updateUser(userId, { helcimCustomerId });
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
    // Normalize targetClientIds to Postgres text[] (array of strings)
    const campaignData: any = { ...campaign };
    let targetClientIdsArray: string[] | null = null;
    if (Array.isArray(campaignData.targetClientIds)) {
      targetClientIdsArray = (campaignData.targetClientIds as any[]).map((v) => String(v));
    } else if (typeof campaignData.targetClientIds === 'string') {
      const raw = campaignData.targetClientIds.trim();
      if (raw.length > 0) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            targetClientIdsArray = parsed.map((v: any) => String(v));
          }
        } catch {
          // If not JSON, attempt to parse simple Postgres array literal like {1,2}
          if (raw.startsWith('{') && raw.endsWith('}')) {
            targetClientIdsArray = raw
              .slice(1, -1)
              .split(',')
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0);
          }
        }
      }
    }
    
    const [newCampaign] = await db
      .insert(marketingCampaigns)
      .values({
        ...campaignData,
        sendDate: campaign.sendDate ? (typeof campaign.sendDate === 'string' ? new Date(campaign.sendDate) : campaign.sendDate) : null,
        targetClientIds: targetClientIdsArray ?? null,
      } as any)
      .returning();
    return newCampaign;
  }

  async getMarketingCampaign(id: number): Promise<MarketingCampaign | undefined> {
    const [campaign] = await db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, id));
    return campaign || undefined;
  }

  async getAllMarketingCampaigns(): Promise<MarketingCampaign[]> {
    return await db.select().from(marketingCampaigns).orderBy(desc(marketingCampaigns.id));
  }

  async getMarketingCampaigns(): Promise<MarketingCampaign[]> {
    // Alias for getAllMarketingCampaigns for compatibility
    return this.getAllMarketingCampaigns();
  }

  async updateMarketingCampaign(id: number, campaignData: Partial<InsertMarketingCampaign>): Promise<MarketingCampaign> {
    // Handle date conversion for sendDate if it's a string
    const processedData: any = { ...campaignData };
    if (processedData.sendDate && typeof processedData.sendDate === 'string') {
      processedData.sendDate = new Date(processedData.sendDate);
    }
    if (processedData.sentAt && typeof processedData.sentAt === 'string') {
      processedData.sentAt = new Date(processedData.sentAt);
    }
    // Normalize targetClientIds if present
    if (processedData.targetClientIds !== undefined) {
      if (Array.isArray(processedData.targetClientIds)) {
        processedData.targetClientIds = (processedData.targetClientIds as any[]).map((v) => String(v));
      } else if (typeof processedData.targetClientIds === 'string') {
        const raw = processedData.targetClientIds.trim();
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            processedData.targetClientIds = parsed.map((v: any) => String(v));
          }
        } catch {
          if (raw.startsWith('{') && raw.endsWith('}')) {
            processedData.targetClientIds = raw
              .slice(1, -1)
              .split(',')
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0);
          }
        }
      }
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
    const result = await db.delete(marketingCampaigns).where(eq(marketingCampaigns.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Marketing Campaign Recipient operations
  async createMarketingCampaignRecipient(recipient: InsertMarketingCampaignRecipient): Promise<MarketingCampaignRecipient> {
    const trackingToken = this.generateTrackingToken();
    const newRecipient = {
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
    
    const [created] = await db.insert(marketingCampaignRecipients).values(newRecipient).returning();
    return created;
  }

  private generateTrackingToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  async getMarketingCampaignRecipient(id: number): Promise<MarketingCampaignRecipient | undefined> {
    const [result] = await db.select().from(marketingCampaignRecipients).where(eq(marketingCampaignRecipients.id, id));
    return result;
  }

  async getMarketingCampaignRecipients(campaignId: number): Promise<MarketingCampaignRecipient[]> {
    return await db.select().from(marketingCampaignRecipients).where(eq(marketingCampaignRecipients.campaignId, campaignId));
  }

  async updateMarketingCampaignRecipient(id: number, data: Partial<InsertMarketingCampaignRecipient>): Promise<MarketingCampaignRecipient> {
    const [updatedRecipient] = await db.update(marketingCampaignRecipients)
      .set(data)
      .where(eq(marketingCampaignRecipients.id, id))
      .returning();
    
    if (!updatedRecipient) {
      throw new Error(`Marketing campaign recipient with id ${id} not found`);
    }
    
    return updatedRecipient;
  }

  // Attempt to atomically claim a recipient for processing. Returns true if claim succeeded.
  async claimMarketingCampaignRecipient(recipientId: number): Promise<boolean> {
    try {
      // Only claim if currently pending
      const [claimed] = await db
        .update(marketingCampaignRecipients)
        .set({ status: 'processing' as any, sentAt: new Date() } as any)
        .where(and(eq(marketingCampaignRecipients.id, recipientId), eq(marketingCampaignRecipients.status, 'pending' as any)))
        .returning();
      return !!claimed;
    } catch (error) {
      console.error('Error claiming marketing campaign recipient:', { recipientId }, error);
      return false;
    }
  }

  // User filtering for campaigns
  async getUsersByAudience(audience: string, targetClientIds?: number[]): Promise<User[]> {
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
        
      case "Specific Clients": {
        // Return specific clients by their IDs
        if (targetClientIds && targetClientIds.length > 0) {
          return await db.select().from(users).where(
            and(
              eq(users.role, "client"),
              inArray(users.id, targetClientIds)
            )
          );
        }
        return [];
      }
        
      default:
        return await db.select().from(users).where(eq(users.role, "client"));
    }
  }

  // Email tracking methods
  async getMarketingCampaignRecipientByToken(token: string): Promise<MarketingCampaignRecipient | undefined> {
    const [result] = await db.select().from(marketingCampaignRecipients).where(eq(marketingCampaignRecipients.trackingToken, token));
    return result;
  }

  async createEmailUnsubscribe(unsubscribe: InsertEmailUnsubscribe): Promise<EmailUnsubscribe> {
    const newUnsubscribe = {
      userId: unsubscribe.userId,
      email: unsubscribe.email,
      unsubscribedAt: new Date(),
      campaignId: unsubscribe.campaignId || null,
      reason: unsubscribe.reason || null,
      ipAddress: unsubscribe.ipAddress || null,
    };
    
    const [created] = await db.insert(emailUnsubscribes).values(newUnsubscribe).returning();
    return created;
  }

  async getEmailUnsubscribe(userId: number): Promise<EmailUnsubscribe | undefined> {
    const [result] = await db.select().from(emailUnsubscribes).where(eq(emailUnsubscribes.userId, userId));
    return result;
  }

  async getAllEmailUnsubscribes(): Promise<EmailUnsubscribe[]> {
    return await db.select().from(emailUnsubscribes);
  }

  async isUserUnsubscribed(email: string): Promise<boolean> {
    const [result] = await db.select().from(emailUnsubscribes).where(eq(emailUnsubscribes.email, email));
    return !!result;
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
    // Ensure serviceCategories is properly formatted as an array
    const scheduleData = {
      ...schedule,
      serviceCategories: Array.isArray(schedule.serviceCategories) 
        ? schedule.serviceCategories 
        : schedule.serviceCategories 
          ? [schedule.serviceCategories] 
          : []
    };
    const [newSchedule] = await db.insert(staffSchedules).values(scheduleData as any).returning();
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
    // Ensure serviceCategories is properly formatted as an array if provided
    const updateData = {
      ...scheduleData,
      ...(scheduleData.serviceCategories && {
        serviceCategories: Array.isArray(scheduleData.serviceCategories) 
          ? scheduleData.serviceCategories 
          : [scheduleData.serviceCategories]
      })
    };
    const [updatedSchedule] = await db.update(staffSchedules).set(updateData as any).where(eq(staffSchedules.id, id)).returning();
    if (!updatedSchedule) {
      throw new Error('Staff schedule not found');
    }
    return updatedSchedule;
  }

  async deleteStaffSchedule(id: number): Promise<boolean> {
    const result = await db.delete(staffSchedules).where(eq(staffSchedules.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
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
      if (month) {
        const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
        const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        return await db.select().from(staffEarnings).where(and(
          eq(staffEarnings.staffId, staffId),
          gte(staffEarnings.earningsDate, startOfMonth),
          lte(staffEarnings.earningsDate, endOfMonth)
        ));
      } else {
        return await db.select().from(staffEarnings).where(eq(staffEarnings.staffId, staffId));
      }
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
      console.log(`Found ${result.length} color preference records for user ${userId}`);
      console.log(result);
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

  async deleteUserColorPreferences(userId: number): Promise<boolean> {
    try {
      console.log(`Attempting to delete ALL color preferences for user ${userId}`);
      
      // Delete all records for this user
      const result = await db.delete(userColorPreferences)
        .where(eq(userColorPreferences.userId, userId));
      
      console.log(`Delete operation completed. Rows affected: ${result.rowCount}`);
      
      // Return true if any rows were deleted, false otherwise
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting user color preferences:', error);
      return false;
    }
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
          eq(payrollHistory.periodStart, periodStart),
          eq(payrollHistory.periodEnd, periodEnd)
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

  // Business Settings operations
  async getBusinessSettings(): Promise<BusinessSettings | undefined> {
    const result = await db.select().from(businessSettings).limit(1);
    return result[0];
  }

  async updateBusinessSettings(businessData: Partial<InsertBusinessSettings>): Promise<BusinessSettings> {
    const existing = await this.getBusinessSettings();
    if (existing) {
      const result = await db
        .update(businessSettings)
        .set({ ...businessData, updatedAt: new Date() })
        .where(eq(businessSettings.id, existing.id))
        .returning();
      return result[0];
    } else {
      // Create if doesn't exist
      return await this.createBusinessSettings(businessData as InsertBusinessSettings);
    }
  }

  async createBusinessSettings(businessData: InsertBusinessSettings): Promise<BusinessSettings> {
    const result = await db.insert(businessSettings).values(businessData).returning();
    return result[0];
  }

  // Automation Rules operations
  async createAutomationRule(rule: InsertAutomationRule): Promise<AutomationRule> {
    const result = await db.insert(automationRules).values(rule).returning();
    return result[0];
  }

  async getAutomationRule(id: number): Promise<AutomationRule | undefined> {
    const result = await db.select().from(automationRules).where(eq(automationRules.id, id)).limit(1);
    return result[0];
  }

  async getAllAutomationRules(): Promise<AutomationRule[]> {
    return await db.select().from(automationRules).orderBy(desc(automationRules.createdAt));
  }

  async updateAutomationRule(id: number, ruleData: Partial<InsertAutomationRule>): Promise<AutomationRule | undefined> {
    const result = await db
      .update(automationRules)
      .set({ ...ruleData, updatedAt: new Date() })
      .where(eq(automationRules.id, id))
      .returning();
    return result[0];
  }

  async deleteAutomationRule(id: number): Promise<boolean> {
    const result = await db.delete(automationRules).where(eq(automationRules.id, id));
    return result.rowCount > 0;
  }

  async updateAutomationRuleSentCount(id: number, sentCount: number): Promise<void> {
    await db
      .update(automationRules)
      .set({ sentCount, lastRun: new Date(), updatedAt: new Date() })
      .where(eq(automationRules.id, id));
  }

  async updateAutomationRuleLastRun(id: number, lastRun: Date): Promise<void> {
    await db
      .update(automationRules)
      .set({ lastRun, updatedAt: new Date() })
      .where(eq(automationRules.id, id));
  }

  // Forms operations
  async createForm(form: InsertForm): Promise<Form> {
    // Convert fields array to JSON string if it exists
    const formData = {
      ...form,
      fields: form.fields ? JSON.stringify(form.fields) : null
    };
    
    const result = await db.insert(forms).values(formData).returning();
    return result[0];
  }

  async getForm(id: number): Promise<Form | undefined> {
    const result = await db.select().from(forms).where(eq(forms.id, id)).limit(1);
    if (!result[0]) return undefined;
    
    // Parse fields JSON if it exists
    const form = { ...result[0] };
    if (form.fields) {
      try {
        // Handle double-encoded JSON strings
        let fieldsData: any = form.fields;
        if (typeof fieldsData === 'string') {
          // Try to parse once
          fieldsData = JSON.parse(fieldsData);
          // If the result is still a string, try parsing again (double-encoded)
          if (typeof fieldsData === 'string') {
            fieldsData = JSON.parse(fieldsData);
          }
        }
        (form as any).fields = fieldsData;
      } catch (error) {
        console.error('Error parsing form fields JSON:', error);
        console.error('Raw fields data that caused error:', form.fields);
        (form as any).fields = []; // Return empty array on parsing error
      }
    } else {
      (form as any).fields = []; // Ensure fields is always available as array
    }
    
    return form;
  }

  async getAllForms(): Promise<Form[]> {
    const results = await db.select().from(forms).orderBy(desc(forms.createdAt));
    
    // Parse fields from JSON string to array for each form
    return results.map(form => {
      const parsedForm = { ...form };
      if (parsedForm.fields) {
        try {
          // Handle double-encoded JSON strings
          let fieldsData: any = parsedForm.fields;
          if (typeof fieldsData === 'string') {
            // Try to parse once
            fieldsData = JSON.parse(fieldsData);
            // If the result is still a string, try parsing again (double-encoded)
            if (typeof fieldsData === 'string') {
              fieldsData = JSON.parse(fieldsData);
            }
          }
          parsedForm.fields = fieldsData;
        } catch (error) {
          console.error('Error parsing form fields JSON:', error);
          console.error('Raw fields data that caused error:', parsedForm.fields);
          (parsedForm as any).fields = []; // Return empty array
        }
      } else {
        (parsedForm as any).fields = []; // Ensure fields is always an array
      }
      return parsedForm;
    });
  }

  async updateForm(id: number, formData: Partial<InsertForm>): Promise<Form> {
    // Convert fields array to JSON string if it exists, similar to createForm method
    const updateData = {
      ...formData,
      fields: formData.fields ? JSON.stringify(formData.fields) : undefined
    };
    
    const result = await db
      .update(forms)
      .set(updateData)
      .where(eq(forms.id, id))
      .returning();
    
    // Parse fields from JSON string to array, similar to getForm method
    const form = { ...result[0] };
    if (form.fields) {
      try {
        // Handle double-encoded JSON strings
        let fieldsData: any = form.fields;
        if (typeof fieldsData === 'string') {
          // Try to parse once
          fieldsData = JSON.parse(fieldsData);
          // If the result is still a string, try parsing again (double-encoded)
          if (typeof fieldsData === 'string') {
            fieldsData = JSON.parse(fieldsData);
          }
        }
        (form as any).fields = fieldsData;
      } catch (error) {
        console.error('Error parsing form fields JSON:', error);
        console.error('Raw fields data that caused error:', form.fields);
        (form as any).fields = []; // Return empty array
      }
    } else {
      (form as any).fields = []; // Ensure fields is always an array
    }
    
    return form;
  }

  async updateFormSubmissions(id: number, submissions: number, lastSubmission?: Date): Promise<Form> {
    const updateData: any = { submissions };
    if (lastSubmission) {
      updateData.lastSubmission = lastSubmission;
    }
    
    const result = await db
      .update(forms)
      .set(updateData)
      .where(eq(forms.id, id))
      .returning();
    return result[0];
  }

  async deleteForm(id: number): Promise<boolean> {
    const result = await db.delete(forms).where(eq(forms.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async saveFormSubmission(submission: any): Promise<void> {
    const submissionData: InsertFormSubmission = {
      formId: submission.formId,
      clientId: submission.clientId || null,
      formData: JSON.stringify(submission.formData),
      submittedAt: new Date(submission.submittedAt),
      ipAddress: submission.ipAddress,
      userAgent: submission.userAgent,
    };

    await db.insert(formSubmissions).values(submissionData);
  }

  async getFormSubmissions(formId: number): Promise<Array<{
    id: string;
    formId: number;
    clientId?: number | null;
    formData: Record<string, any>;
    submittedAt: string;
    ipAddress?: string;
    userAgent?: string;
  }>> {
    const submissions = await db
      .select()
      .from(formSubmissions)
      .where(eq(formSubmissions.formId, formId))
      .orderBy(desc(formSubmissions.submittedAt));

    return submissions.map(submission => ({
      id: submission.id.toString(),
      formId: submission.formId,
      clientId: (submission as any).clientId ?? null,
      formData: JSON.parse(submission.formData),
      submittedAt: submission.submittedAt.toISOString(),
      ipAddress: submission.ipAddress || undefined,
      userAgent: submission.userAgent || undefined,
    }));
  }

  async getClientFormSubmissions(clientId: number): Promise<Array<{
    id: string;
    formId: number;
    formTitle: string;
    formType: string;
    formData: Record<string, any>;
    submittedAt: string;
    ipAddress?: string;
    userAgent?: string;
  }>> {
    const submissions = await db
      .select({
        id: formSubmissions.id,
        formId: formSubmissions.formId,
        formTitle: forms.title,
        formType: forms.type,
        formData: formSubmissions.formData,
        submittedAt: formSubmissions.submittedAt,
        ipAddress: formSubmissions.ipAddress,
        userAgent: formSubmissions.userAgent,
      })
      .from(formSubmissions)
      .innerJoin(forms, eq(formSubmissions.formId, forms.id))
      .where(eq(formSubmissions.clientId, clientId))
      .orderBy(desc(formSubmissions.submittedAt));

    return submissions.map(submission => ({
      id: submission.id.toString(),
      formId: submission.formId,
      formTitle: submission.formTitle,
      formType: submission.formType,
      formData: JSON.parse(submission.formData),
      submittedAt: submission.submittedAt.toISOString(),
      ipAddress: submission.ipAddress || undefined,
      userAgent: submission.userAgent || undefined,
    }));
  }

  async getUnclaimedFormSubmissions(): Promise<Array<{
    id: string;
    formId: number;
    formTitle: string;
    formType: string;
    submittedAt: string;
    ipAddress?: string;
    userAgent?: string;
    submitterName?: string;
  }>> {
    const rows = await db
      .select({
        id: formSubmissions.id,
        formId: formSubmissions.formId,
        formTitle: forms.title,
        formType: forms.type,
        submittedAt: formSubmissions.submittedAt,
        ipAddress: formSubmissions.ipAddress,
        userAgent: formSubmissions.userAgent,
        linkedUserId: users.id,
      })
      .from(formSubmissions)
      .innerJoin(forms, eq(formSubmissions.formId, forms.id))
      .leftJoin(users, eq(formSubmissions.clientId, users.id))
      .where(or(
        isNull(formSubmissions.clientId),
        eq(formSubmissions.clientId, 0 as any),
        isNull(users.id),
        ne(users.role, 'client' as any)
      ))
      .orderBy(desc(formSubmissions.submittedAt));

    // Try to derive submitter name from common fields in the stored payload
    // We only selected metadata above for speed; load form_data for these ids in one go
    const ids = rows.map(r => r.id);
    let dataById = new Map<number, any>();
    if (ids.length > 0) {
      const dataRows = await db
        .select({ id: formSubmissions.id, formData: formSubmissions.formData })
        .from(formSubmissions)
        .where(inArray(formSubmissions.id, ids));
      dataById = new Map(dataRows.map(dr => [dr.id, dr.formData]));
    }

    function extractName(rawJson?: string | null): string | undefined {
      if (!rawJson) return undefined;
      try {
        const data = JSON.parse(rawJson);
        if (typeof data !== 'object' || !data) return undefined;
        const first = data.firstName || data.first_name || data.firstname || data["name_first"];
        const last = data.lastName || data.last_name || data.lastname || data["name_last"];
        const fullFromParts = `${first || ''} ${last || ''}`.trim();
        if (fullFromParts) return fullFromParts;
        const single = data.fullName || data.full_name || data.name || data.clientName || data.customerName;
        if (typeof single === 'string' && single.trim()) return single.trim();
        // Sometimes name fields are nested under keys like field_..._first/last
        const keys = Object.keys(data);
        const firstKey = keys.find(k => /first/i.test(k));
        const lastKey = keys.find(k => /last/i.test(k));
        const maybe = `${(firstKey && data[firstKey]) || ''} ${(lastKey && data[lastKey]) || ''}`.trim();
        if (maybe) return maybe;

        // As a final heuristic, scan all string values for one that looks like a personal name
        const stringVals = Object.values(data).filter(v => typeof v === 'string') as string[];
        const looksLikeName = (val: string) => {
          const t = val.trim();
          if (!t) return false;
          if (t.length < 2 || t.length > 60) return false;
          if (/^https?:/i.test(t)) return false;
          if (t.startsWith('data:')) return false;
          if (/@/.test(t)) return false; // likely email
          if (/\.(pdf|png|jpg|jpeg|webp|gif|svg)$/i.test(t)) return false; // likely file
          // allow letters and spaces, a single hyphen or apostrophe common in names
          if (!/^[a-zA-Z\s'\-]+$/.test(t)) return false;
          // prefer values with at least one space (first last)
          return /\s/.test(t);
        };
        const candidate = stringVals.find(looksLikeName) || stringVals.find(s => /^[a-zA-Z]+$/.test(s.trim()));
        return candidate?.trim() || undefined;
      } catch {
        return undefined;
      }
    }

    return rows.map(r => {
      const raw = dataById.get(r.id) as string | undefined;
      const submitterName = extractName(raw);
      return {
        id: r.id.toString(),
        formId: r.formId,
        formTitle: r.formTitle,
        formType: r.formType,
        submittedAt: r.submittedAt.toISOString(),
        ipAddress: r.ipAddress || undefined,
        userAgent: r.userAgent || undefined,
        submitterName,
      };
    });
  }

  async attachFormSubmissionToClient(submissionId: number, clientId: number): Promise<{
    id: string;
    formId: number;
    formTitle: string;
    formType: string;
    submittedAt: string;
    clientId: number;
  }> {
    // Load current row to enforce single-attach policy
    const [existing] = await db
      .select()
      .from(formSubmissions)
      .where(eq(formSubmissions.id, submissionId));

    if (!existing) {
      throw new Error('not_found');
    }

    if (existing.clientId && Number(existing.clientId) !== 0) {
      // Already attached to a client
      throw new Error('already_attached');
    }

    // Update clientId on the submission
    const updated = await db
      .update(formSubmissions)
      .set({ clientId })
      .where(eq(formSubmissions.id, submissionId))
      .returning();

    const row = updated?.[0];

    // Fetch with form details
    const [joined] = await db
      .select({
        id: formSubmissions.id,
        formId: formSubmissions.formId,
        formTitle: forms.title,
        formType: forms.type,
        submittedAt: formSubmissions.submittedAt,
        clientId: formSubmissions.clientId,
      })
      .from(formSubmissions)
      .innerJoin(forms, eq(formSubmissions.formId, forms.id))
      .where(eq(formSubmissions.id, submissionId));

    if (!joined) {
      // Fallback to minimal data
      return {
        id: row.id.toString(),
        formId: row.formId,
        formTitle: '',
        formType: '',
        submittedAt: row.submittedAt.toISOString(),
        clientId: clientId,
      };
    }

    return {
      id: joined.id.toString(),
      formId: joined.formId,
      formTitle: joined.formTitle,
      formType: joined.formType,
      submittedAt: joined.submittedAt.toISOString(),
      clientId: clientId,
    };
  }

  // Business Knowledge methods
  async getBusinessKnowledge(categories?: string[]): Promise<any[]> {
    try {
      let conditions = [eq(businessKnowledge.active, true)];
      
      if (categories && categories.length > 0) {
        conditions.push(inArray(businessKnowledge.category, categories));
      }
      
      const knowledge = await db
        .select()
        .from(businessKnowledge)
        .where(and(...conditions))
        .orderBy(desc(businessKnowledge.priority), desc(businessKnowledge.updatedAt));
      
      return knowledge;
    } catch (error) {
      console.error('Error fetching business knowledge:', error);
      return [];
    }
  }

  async createBusinessKnowledge(knowledge: any): Promise<any> {
    try {
      const [newKnowledge] = await db.insert(businessKnowledge).values(knowledge).returning();
      return newKnowledge;
    } catch (error) {
      console.error('Error creating business knowledge:', error);
      throw error;
    }
  }

  async updateBusinessKnowledge(id: number, updates: any): Promise<any> {
    try {
      const [updatedKnowledge] = await db
        .update(businessKnowledge)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(businessKnowledge.id, id))
        .returning();
      return updatedKnowledge;
    } catch (error) {
      console.error('Error updating business knowledge:', error);
      throw error;
    }
  }

  async deleteBusinessKnowledge(id: number): Promise<void> {
    try {
      await db.delete(businessKnowledge).where(eq(businessKnowledge.id, id));
    } catch (error) {
      console.error('Error deleting business knowledge:', error);
      throw error;
    }
  }

  // Business Knowledge Categories methods
  async getBusinessKnowledgeCategories(): Promise<any[]> {
    try {
      const categories = await db.select().from(businessKnowledgeCategories).orderBy(asc(businessKnowledgeCategories.name));
      
      // Get entry count for each category
      const categoriesWithCounts = await Promise.all(
        categories.map(async (category) => {
          const entryCount = await db
            .select({ count: count() })
            .from(businessKnowledge)
            .where(eq(businessKnowledge.category, category.name));
          
          return {
            ...category,
            entryCount: entryCount[0]?.count || 0
          };
        })
      );
      
      return categoriesWithCounts;
    } catch (error) {
      console.error('Error fetching business knowledge categories:', error);
      return [];
    }
  }

  async createBusinessKnowledgeCategory(category: any): Promise<any> {
    try {
      const [newCategory] = await db.insert(businessKnowledgeCategories).values(category).returning();
      return newCategory;
    } catch (error) {
      console.error('Error creating business knowledge category:', error);
      throw error;
    }
  }

  async updateBusinessKnowledgeCategory(id: number, updates: any): Promise<any> {
    try {
      const [updatedCategory] = await db
        .update(businessKnowledgeCategories)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(businessKnowledgeCategories.id, id))
        .returning();
      return updatedCategory;
    } catch (error) {
      console.error('Error updating business knowledge category:', error);
      throw error;
    }
  }

  async deleteBusinessKnowledgeCategory(id: number): Promise<void> {
    try {
      await db.delete(businessKnowledgeCategories).where(eq(businessKnowledgeCategories.id, id));
    } catch (error) {
      console.error('Error deleting business knowledge category:', error);
      throw error;
    }
  }

  // LLM Conversation methods
  async createLLMConversation(conversation: any): Promise<any> {
    try {
      const [newConversation] = await db.insert(llmConversations).values(conversation).returning();
      return newConversation;
    } catch (error) {
      console.error('Error creating LLM conversation:', error);
      throw error;
    }
  }

  async getLLMConversations(clientId?: number): Promise<any[]> {
    try {
      let conditions: any[] = [];
      
      if (clientId) {
        conditions.push(eq(llmConversations.clientId, clientId));
      }
      
      const conversations = await db
        .select()
        .from(llmConversations)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(llmConversations.createdAt));
      
      return conversations;
    } catch (error) {
      console.error('Error fetching LLM conversations:', error);
      return [];
    }
  }

  // Check Software Providers methods
  async getCheckSoftwareProviders(): Promise<any[]> {
    try {
      const providers = await db.select().from(checkSoftwareProviders).orderBy(asc(checkSoftwareProviders.name));
      return providers;
    } catch (error) {
      console.error('Error fetching check software providers:', error);
      return [];
    }
  }

  async getCheckSoftwareProvider(id: number): Promise<any | undefined> {
    try {
      const [provider] = await db.select().from(checkSoftwareProviders).where(eq(checkSoftwareProviders.id, id));
      return provider;
    } catch (error) {
      console.error('Error fetching check software provider:', error);
      return undefined;
    }
  }

  async createCheckSoftwareProvider(provider: any): Promise<any> {
    try {
      const [newProvider] = await db.insert(checkSoftwareProviders).values(provider).returning();
      return newProvider;
    } catch (error) {
      console.error('Error creating check software provider:', error);
      throw error;
    }
  }

  async updateCheckSoftwareProvider(id: number, updates: any): Promise<any> {
    try {
      const [updatedProvider] = await db
        .update(checkSoftwareProviders)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(checkSoftwareProviders.id, id))
        .returning();
      return updatedProvider;
    } catch (error) {
      console.error('Error updating check software provider:', error);
      throw error;
    }
  }

  async deleteCheckSoftwareProvider(id: number): Promise<boolean> {
    try {
      await db.delete(checkSoftwareProviders).where(eq(checkSoftwareProviders.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting check software provider:', error);
      return false;
    }
  }

  // Payroll Checks methods
  async getPayrollChecks(staffId?: number, status?: string): Promise<any[]> {
    try {
      let conditions: any[] = [];
      
      if (staffId) {
        conditions.push(eq(payrollChecks.staffId, staffId));
      }
      
      if (status) {
        conditions.push(eq(payrollChecks.status, status));
      }
      
      const checks = await db
        .select()
        .from(payrollChecks)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(payrollChecks.createdAt));
      
      return checks;
    } catch (error) {
      console.error('Error fetching payroll checks:', error);
      return [];
    }
  }

  async getPayrollCheck(id: number): Promise<any | undefined> {
    try {
      const [check] = await db.select().from(payrollChecks).where(eq(payrollChecks.id, id));
      return check;
    } catch (error) {
      console.error('Error fetching payroll check:', error);
      return undefined;
    }
  }

  async createPayrollCheck(check: any): Promise<any> {
    try {
      const [newCheck] = await db.insert(payrollChecks).values(check).returning();
      return newCheck;
    } catch (error) {
      console.error('Error creating payroll check:', error);
      throw error;
    }
  }

  async updatePayrollCheck(id: number, updates: any): Promise<any> {
    try {
      const [updatedCheck] = await db
        .update(payrollChecks)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(payrollChecks.id, id))
        .returning();
      return updatedCheck;
    } catch (error) {
      console.error('Error updating payroll check:', error);
      throw error;
    }
  }

  async deletePayrollCheck(id: number): Promise<boolean> {
    try {
      await db.delete(payrollChecks).where(eq(payrollChecks.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting payroll check:', error);
      return false;
    }
  }

  // Check Software Logs methods
  async getCheckSoftwareLogs(providerId?: number, action?: string): Promise<any[]> {
    try {
      let conditions: any[] = [];
      
      if (providerId) {
        conditions.push(eq(checkSoftwareLogs.providerId, providerId));
      }
      
      if (action) {
        conditions.push(eq(checkSoftwareLogs.action, action));
      }
      
      const logs = await db
        .select()
        .from(checkSoftwareLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(checkSoftwareLogs.createdAt));
      
      return logs;
    } catch (error) {
      console.error('Error fetching check software logs:', error);
      return [];
    }
  }

  async createCheckSoftwareLog(log: any): Promise<any> {
    try {
      const [newLog] = await db.insert(checkSoftwareLogs).values(log).returning();
      return newLog;
    } catch (error) {
      console.error('Error creating check software log:', error);
      throw error;
    }
  }

  // System Configuration methods
  async getSystemConfig(key: string): Promise<SystemConfig | undefined> {
    try {
      const [result] = await db.select().from(systemConfig).where(eq(systemConfig.key, key));
      return result;
    } catch (error) {
      console.error('Error getting system config:', error);
      throw error;
    }
  }

  async getAllSystemConfig(category?: string): Promise<SystemConfig[]> {
    try {
      // Note: category field doesn't exist in the current schema, so we ignore category filtering
      const results = await db.select().from(systemConfig);
      return results;
    } catch (error) {
      console.error('Error getting all system config:', error);
      throw error;
    }
  }

  async setSystemConfig(config: InsertSystemConfig): Promise<SystemConfig> {
    try {
      const [result] = await db.insert(systemConfig).values(config).returning();
      return result;
    } catch (error) {
      console.error('Error setting system config:', error);
      throw error;
    }
  }

  async updateSystemConfig(key: string, value: string, description?: string): Promise<SystemConfig> {
    try {
      const updateData: any = { 
        value, 
        updatedAt: new Date() 
      };
      if (description) {
        updateData.description = description;
      }
      
      const [result] = await db
        .update(systemConfig)
        .set(updateData)
        .where(eq(systemConfig.key, key))
        .returning();
      
      return result;
    } catch (error) {
      console.error('Error updating system config:', error);
      throw error;
    }
  }

  async deleteSystemConfig(key: string): Promise<boolean> {
    try {
      const result = await db.delete(systemConfig).where(eq(systemConfig.key, key));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting system config:', error);
      throw error;
    }
  }

  async getSystemConfigByCategory(category: string): Promise<SystemConfig[]> {
    try {
      const results = await db.select().from(systemConfig).where(eq(systemConfig.category, category));
      return results;
    } catch (error) {
      console.error('Error getting system config by category:', error);
      throw error;
    }
  }

  // AI Messaging Configuration methods
  async getAiMessagingConfig(): Promise<AiMessagingConfig | undefined> {
    try {
      const result = await db.select().from(aiMessagingConfig).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting AI messaging config:', error);
      throw error;
    }
  }

  async createAiMessagingConfig(config: InsertAiMessagingConfig): Promise<AiMessagingConfig> {
    try {
      const result = await db.insert(aiMessagingConfig).values(config).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating AI messaging config:', error);
      throw error;
    }
  }

  async updateAiMessagingConfig(id: number, config: Partial<InsertAiMessagingConfig>): Promise<AiMessagingConfig> {
    try {
      const result = await db
        .update(aiMessagingConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(aiMessagingConfig.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating AI messaging config:', error);
      throw error;
    }
  }

  async deleteAiMessagingConfig(id: number): Promise<boolean> {
    try {
      const result = await db.delete(aiMessagingConfig).where(eq(aiMessagingConfig.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting AI messaging config:', error);
      throw error;
    }
  }

  // Conversation Flow methods
  async getConversationFlows(): Promise<any[]> {
    try {
      const flows = await db.select().from(conversationFlows).orderBy(desc(conversationFlows.createdAt));
      
      // Parse the steps JSON for each flow
      return flows.map(flow => ({
        ...flow,
        steps: flow.steps ? JSON.parse(flow.steps) : []
      }));
    } catch (error) {
      console.error('Error getting conversation flows:', error);
      throw error;
    }
  }

  async getConversationFlow(id: string): Promise<any | undefined> {
    try {
      const result = await db.select().from(conversationFlows).where(eq(conversationFlows.id, id)).limit(1);
      if (!result[0]) return undefined;
      
      const flow = result[0];
      return {
        ...flow,
        steps: flow.steps ? JSON.parse(flow.steps) : []
      };
    } catch (error) {
      console.error('Error getting conversation flow:', error);
      throw error;
    }
  }

  async saveConversationFlow(flow: any): Promise<any> {
    try {
      // Generate UUID if not provided
      if (!flow.id) {
        flow.id = `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      const flowData = {
        id: flow.id,
        name: flow.name,
        description: flow.description,
        steps: JSON.stringify(flow.steps || []),
        isActive: flow.isActive !== undefined ? flow.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await db.insert(conversationFlows).values(flowData).returning();
      const savedFlow = result[0];
      
      return {
        ...savedFlow,
        steps: JSON.parse(savedFlow.steps)
      };
    } catch (error) {
      console.error('Error saving conversation flow:', error);
      throw error;
    }
  }

  async updateConversationFlow(flow: any): Promise<any> {
    try {
      if (!flow.id) {
        throw new Error('Flow ID is required for updates');
      }
      
      const updateData = {
        name: flow.name,
        description: flow.description,
        steps: JSON.stringify(flow.steps || []),
        isActive: flow.isActive !== undefined ? flow.isActive : true,
        updatedAt: new Date()
      };
      
      const result = await db
        .update(conversationFlows)
        .set(updateData)
        .where(eq(conversationFlows.id, flow.id))
        .returning();
      
      const updatedFlow = result[0];
      return {
        ...updatedFlow,
        steps: JSON.parse(updatedFlow.steps)
      };
    } catch (error) {
      console.error('Error updating conversation flow:', error);
      throw error;
    }
  }

  async deleteConversationFlow(id: string): Promise<boolean> {
    try {
      const result = await db.delete(conversationFlows).where(eq(conversationFlows.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting conversation flow:', error);
      throw error;
    }
  }

  // Note Template operations
  async createNoteTemplate(template: InsertNoteTemplate): Promise<NoteTemplate> {
    const [newTemplate] = await db.insert(noteTemplates).values(template).returning();
    return newTemplate;
  }

  async getNoteTemplate(id: number): Promise<NoteTemplate | undefined> {
    const [template] = await db.select().from(noteTemplates).where(eq(noteTemplates.id, id));
    return template;
  }

  async getAllNoteTemplates(): Promise<NoteTemplate[]> {
    return await db.select().from(noteTemplates);
  }

  async getNoteTemplatesByCategory(category: string): Promise<NoteTemplate[]> {
    return await db.select().from(noteTemplates).where(eq(noteTemplates.category, category));
  }

  async getActiveNoteTemplates(): Promise<NoteTemplate[]> {
    return await db.select().from(noteTemplates).where(eq(noteTemplates.isActive, true));
  }

  async updateNoteTemplate(id: number, templateData: UpdateNoteTemplate): Promise<NoteTemplate> {
    const [updatedTemplate] = await db
      .update(noteTemplates)
      .set({ ...templateData, updatedAt: new Date() })
      .where(eq(noteTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteNoteTemplate(id: number): Promise<boolean> {
    const result = await db.delete(noteTemplates).where(eq(noteTemplates.id, id));
    return result.rowCount > 0;
  }

  // Note History operations
  async createNoteHistory(history: InsertNoteHistory): Promise<NoteHistory> {
    const [newHistory] = await db.insert(noteHistory).values(history).returning();
    return newHistory;
  }

  async getNoteHistoryByClient(clientId: number): Promise<NoteHistory[]> {
    return await db.select().from(noteHistory).where(eq(noteHistory.clientId, clientId)).orderBy(desc(noteHistory.createdAt));
  }

  async getNoteHistoryByAppointment(appointmentId: number): Promise<NoteHistory[]> {
    return await db.select().from(noteHistory).where(eq(noteHistory.appointmentId, appointmentId)).orderBy(desc(noteHistory.createdAt));
  }

  async getAllNoteHistory(): Promise<NoteHistory[]> {
    return await db.select().from(noteHistory).orderBy(desc(noteHistory.createdAt));
  }

  async updateNoteHistory(id: number, historyData: UpdateNoteHistory): Promise<NoteHistory> {
    const [updatedHistory] = await db
      .update(noteHistory)
      .set(historyData)
      .where(eq(noteHistory.id, id))
      .returning();
    return updatedHistory;
  }

  async deleteNoteHistory(id: number): Promise<boolean> {
    const result = await db.delete(noteHistory).where(eq(noteHistory.id, id));
    return result.rowCount > 0;
  }

  // Permission operations
  async createPermission(permission: InsertPermission): Promise<Permission> {
    const [created] = await db.insert(permissions).values(permission as any).returning();
    return created;
  }

  async getPermission(id: number): Promise<Permission | undefined> {
    const [row] = await db.select().from(permissions).where(eq(permissions.id, id));
    return row;
  }

  async getPermissionByName(name: string): Promise<Permission | undefined> {
    const [row] = await db.select().from(permissions).where(eq(permissions.name, name));
    return row;
  }

  async getAllPermissions(): Promise<Permission[]> {
    try {
      const result = await db.select().from(permissions).where(eq(permissions.isActive, true));
      return result;
    } catch (error) {
      console.error('Error getting all permissions:', error);
      return [] as Permission[];
    }
  }

  async getPermissionsByCategory(category: string): Promise<Permission[]> {
    const result = await db.select().from(permissions).where(eq(permissions.category, category));
    return result;
  }

  async updatePermission(id: number, permissionData: Partial<InsertPermission>): Promise<Permission> {
    const [updated] = await db.update(permissions).set(permissionData as any).where(eq(permissions.id, id)).returning();
    return updated;
  }

  async deletePermission(id: number): Promise<boolean> {
    const result = await db.delete(permissions).where(eq(permissions.id, id));
    return result.rowCount > 0;
  }

  // Permission Group operations
  async createPermissionGroup(group: InsertPermissionGroup): Promise<PermissionGroup> {
    const [created] = await db.insert(permissionGroups).values(group as any).returning();
    return created;
  }

  async getPermissionGroup(id: number): Promise<PermissionGroup | undefined> {
    const [row] = await db.select().from(permissionGroups).where(eq(permissionGroups.id, id));
    return row;
  }

  async getPermissionGroupByName(name: string): Promise<PermissionGroup | undefined> {
    const [row] = await db.select().from(permissionGroups).where(eq(permissionGroups.name, name));
    return row;
  }

  async getAllPermissionGroups(): Promise<PermissionGroup[]> {
    try {
      const result = await db.select().from(permissionGroups).where(eq(permissionGroups.isActive, true));
      return result;
    } catch (error) {
      console.error('Error getting all permission groups:', error);
      return [] as PermissionGroup[];
    }
  }

  async updatePermissionGroup(id: number, groupData: Partial<InsertPermissionGroup>): Promise<PermissionGroup> {
    const [updated] = await db.update(permissionGroups).set(groupData as any).where(eq(permissionGroups.id, id)).returning();
    return updated;
  }

  async deletePermissionGroup(id: number): Promise<boolean> {
    const result = await db.delete(permissionGroups).where(eq(permissionGroups.id, id));
    return result.rowCount > 0;
  }

  async assignPermissionsToGroup(groupId: number, permissionIds: number[]): Promise<void> {
    if (!permissionIds || permissionIds.length === 0) return;
    await db.insert(permissionGroupMappings).values(
      permissionIds.map(pid => ({ groupId, permissionId: pid })) as any
    ).onConflictDoNothing();
  }

  async removePermissionsFromGroup(groupId: number, permissionIds: number[]): Promise<void> {
    if (!permissionIds || permissionIds.length === 0) return;
    await db.delete(permissionGroupMappings)
      .where(and(eq(permissionGroupMappings.groupId, groupId), inArray(permissionGroupMappings.permissionId, permissionIds)));
  }

  async getPermissionGroupMappings(groupId: number): Promise<PermissionGroupMapping[]> {
    const rows = await db.select().from(permissionGroupMappings).where(eq(permissionGroupMappings.groupId, groupId));
    return rows;
  }

  async createPermissionGroupMapping(mapping: InsertPermissionGroupMapping): Promise<PermissionGroupMapping> {
    const [created] = await db.insert(permissionGroupMappings).values(mapping as any).onConflictDoNothing().returning();
    return created ?? (await db.select().from(permissionGroupMappings).where(and(eq(permissionGroupMappings.groupId, mapping.groupId), eq(permissionGroupMappings.permissionId, mapping.permissionId))))[0];
  }

  async deletePermissionGroupMappings(groupId: number): Promise<void> {
    await db.delete(permissionGroupMappings).where(eq(permissionGroupMappings.groupId, groupId));
  }

  // User Permission operations
  async assignPermissionGroupToUser(userId: number, groupId: number): Promise<void> {
    await db.insert(userPermissionGroups).values({ userId, groupId } as any).onConflictDoNothing();
  }

  async removePermissionGroupFromUser(userId: number, groupId: number): Promise<void> {
    await db.delete(userPermissionGroups).where(and(eq(userPermissionGroups.userId, userId), eq(userPermissionGroups.groupId, groupId)));
  }

  async getUserPermissionGroups(userId: number): Promise<UserPermissionGroup[]> {
    try {
      const result = await db.select().from(userPermissionGroups).where(eq(userPermissionGroups.userId, userId));
      return result;
    } catch (error) {
      console.error('Error getting user permission groups:', error);
      return [] as UserPermissionGroup[];
    }
  }

  async getUserPermissionGroup(userId: number, groupId: number): Promise<UserPermissionGroup | null> {
    const [row] = await db.select().from(userPermissionGroups).where(and(eq(userPermissionGroups.userId, userId), eq(userPermissionGroups.groupId, groupId)));
    return row ?? null;
  }

  async createUserPermissionGroup(data: InsertUserPermissionGroup): Promise<UserPermissionGroup> {
    const [created] = await db.insert(userPermissionGroups).values(data as any).onConflictDoNothing().returning();
    return created ?? (await db.select().from(userPermissionGroups).where(and(eq(userPermissionGroups.userId, data.userId), eq(userPermissionGroups.groupId, data.groupId))))[0];
  }

  async deleteUserPermissionGroup(id: number): Promise<void> {
    await db.delete(userPermissionGroups).where(eq(userPermissionGroups.id, id));
  }

  async grantDirectPermission(userId: number, permissionId: number): Promise<void> {
    // For now, just log since we need to implement the actual table structure
    console.log('Granting direct permission to user:', userId, permissionId);
  }

  async denyDirectPermission(userId: number, permissionId: number): Promise<void> {
    // For now, just log since we need to implement the actual table structure
    console.log('Denying direct permission to user:', userId, permissionId);
  }

  async removeDirectPermission(userId: number, permissionId: number): Promise<void> {
    // For now, just log since we need to implement the actual table structure
    console.log('Removing direct permission from user:', userId, permissionId);
  }

  async getUserDirectPermissions(userId: number): Promise<UserDirectPermission[]> {
    const rows = await db.select().from(userDirectPermissions).where(eq(userDirectPermissions.userId, userId));
    return rows;
  }

  async getUserDirectPermission(userId: number, permissionId: number): Promise<UserDirectPermission | null> {
    const [row] = await db.select().from(userDirectPermissions).where(and(eq(userDirectPermissions.userId, userId), eq(userDirectPermissions.permissionId, permissionId)));
    return row ?? null;
  }

  async createUserDirectPermission(data: InsertUserDirectPermission): Promise<UserDirectPermission> {
    const [created] = await db.insert(userDirectPermissions).values(data as any).onConflictDoNothing().returning();
    return created ?? (await db.select().from(userDirectPermissions).where(and(eq(userDirectPermissions.userId, data.userId), eq(userDirectPermissions.permissionId, data.permissionId))))[0];
  }

  async updateUserDirectPermission(id: number, data: Partial<UserDirectPermission>): Promise<UserDirectPermission> {
    const [updated] = await db.update(userDirectPermissions).set(data as any).where(eq(userDirectPermissions.id, id)).returning();
    return updated;
  }

  async deleteUserDirectPermission(id: number): Promise<void> {
    await db.delete(userDirectPermissions).where(eq(userDirectPermissions.id, id));
  }

  // Email Templates stored in system_config (category 'email_templates')
  async createEmailTemplate(template: { name: string; subject?: string; htmlContent: string; variables?: any[] }): Promise<{ id: string; name: string; subject?: string; htmlContent: string; variables: any[]; createdAt: string }> {
    const id = `tmpl_${Date.now()}`;
    const record = {
      id,
      name: template.name,
      subject: template.subject || null,
      htmlContent: template.htmlContent,
      variables: template.variables ?? [],
      createdAt: new Date().toISOString(),
    } as any;

    await this.setSystemConfig({
      key: `email_template:${id}`,
      value: JSON.stringify(record),
      description: `Email template: ${template.name}`,
      category: 'email_templates',
      isEncrypted: false,
      isActive: true,
    } as any);

    return record as { id: string; name: string; subject?: string; htmlContent: string; variables: any[]; createdAt: string };
  }

  async getEmailTemplates(): Promise<Array<{ id: string; name: string; subject?: string; htmlContent: string; variables: any[]; createdAt: string }>> {
    const rows = await db.select().from(systemConfig).where(eq(systemConfig.category, 'email_templates'));
    const templates: Array<{ id: string; name: string; subject?: string; htmlContent: string; variables: any[]; createdAt: string }> = [];
    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.value || '{}');
        if (parsed && parsed.id && parsed.name) {
          templates.push({
            id: parsed.id,
            name: parsed.name,
            subject: parsed.subject || undefined,
            htmlContent: parsed.htmlContent || '',
            variables: parsed.variables || [],
            createdAt: parsed.createdAt || (row as any).createdAt?.toISOString?.() || new Date().toISOString(),
          });
        }
      } catch {
        // ignore malformed entries
      }
    }
    templates.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return templates;
  }

  // AI Messaging Configuration
  async getAIMessagingConfig(): Promise<AiMessagingConfig | undefined> {
    try {
      const result = await db.select().from(aiMessagingConfig).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting AI messaging config:', error);
      throw error;
    }
  }

  async setAIMessagingConfig(config: Partial<AiMessagingConfig>): Promise<AiMessagingConfig> {
    try {
      const result = await db
        .update(aiMessagingConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(aiMessagingConfig.id, 1))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error setting AI messaging config:', error);
      throw error;
    }
  }

  async updateAIMessagingStats(stats: Partial<AiMessagingConfig>): Promise<AiMessagingConfig> {
    try {
      const result = await db
        .update(aiMessagingConfig)
        .set({ ...stats, updatedAt: new Date() })
        .where(eq(aiMessagingConfig.id, 1))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating AI messaging stats:', error);
      throw error;
    }
  }
}

export { DatabaseStorage as PgStorage };
