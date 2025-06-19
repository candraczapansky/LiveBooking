import {
  users, User, InsertUser,
  serviceCategories, ServiceCategory, InsertServiceCategory,
  rooms, Room, InsertRoom,
  devices, Device, InsertDevice,
  services, Service, InsertService,
  staff, Staff, InsertStaff,
  staffServices, StaffService, InsertStaffService,
  appointments, Appointment, InsertAppointment,
  memberships, Membership, InsertMembership,
  clientMemberships, ClientMembership, InsertClientMembership,
  payments, Payment, InsertPayment
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private serviceCategories: Map<number, ServiceCategory>;
  private rooms: Map<number, Room>;
  private devices: Map<number, Device>;
  private services: Map<number, Service>;
  private staff: Map<number, Staff>;
  private staffServices: Map<number, StaffService>;
  private appointments: Map<number, Appointment>;
  private memberships: Map<number, Membership>;
  private clientMemberships: Map<number, ClientMembership>;
  private payments: Map<number, Payment>;

  private currentUserId: number;
  private currentServiceCategoryId: number;
  private currentRoomId: number;
  private currentDeviceId: number;
  private currentServiceId: number;
  private currentStaffId: number;
  private currentStaffServiceId: number;
  private currentAppointmentId: number;
  private currentMembershipId: number;
  private currentClientMembershipId: number;
  private currentPaymentId: number;

  constructor() {
    this.users = new Map();
    this.serviceCategories = new Map();
    this.rooms = new Map();
    this.devices = new Map();
    this.services = new Map();
    this.staff = new Map();
    this.staffServices = new Map();
    this.appointments = new Map();
    this.memberships = new Map();
    this.clientMemberships = new Map();
    this.payments = new Map();

    this.currentUserId = 1;
    this.currentServiceCategoryId = 1;
    this.currentRoomId = 1;
    this.currentDeviceId = 1;
    this.currentServiceId = 1;
    this.currentStaffId = 1;
    this.currentStaffServiceId = 1;
    this.currentAppointmentId = 1;
    this.currentMembershipId = 1;
    this.currentClientMembershipId = 1;
    this.currentPaymentId = 1;

    // Initialize with admin user
    this.createUser({
      username: 'admin',
      password: 'password', // In a real app, this would be hashed
      email: 'admin@beautybook.com',
      role: 'admin',
      firstName: 'Sarah',
      lastName: 'Johnson',
      phone: '555-123-4567'
    });

    // Initialize with sample data for demo purposes
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create sample service categories
    this.createServiceCategory({
      name: 'Hair Services',
      description: 'Professional hair styling, cutting, and coloring services'
    });

    this.createServiceCategory({
      name: 'Facial Treatments',
      description: 'Skincare and facial rejuvenation treatments'
    });

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

    // Create sample staff user
    this.createUser({
      username: 'stylist1',
      password: 'password',
      email: 'emma.martinez@beautybook.com',
      role: 'staff',
      firstName: 'Emma',
      lastName: 'Martinez',
      phone: '555-234-5678'
    });

    // Create staff member profile
    this.createStaff({
      userId: 2, // The staff user we just created
      title: 'Senior Hair Stylist',
      bio: 'Emma has over 8 years of experience in hair styling and coloring. She specializes in modern cuts and color correction.',
      commissionType: 'commission',
      commissionRate: 0.45, // 45% commission
      photoUrl: null
    });

    // Create sample services
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
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email,
      role: insertUser.role || "client",
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      phone: insertUser.phone || null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error('User not found');
    }
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Service Category operations
  async createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory> {
    const id = this.currentServiceCategoryId++;
    const newCategory = { ...category, id } as ServiceCategory;
    this.serviceCategories.set(id, newCategory);
    return newCategory;
  }

  async getServiceCategory(id: number): Promise<ServiceCategory | undefined> {
    return this.serviceCategories.get(id);
  }

  async getAllServiceCategories(): Promise<ServiceCategory[]> {
    return Array.from(this.serviceCategories.values());
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
    const id = this.currentServiceId++;
    const newService = { ...service, id } as Service;
    this.services.set(id, newService);
    return newService;
  }

  async getService(id: number): Promise<Service | undefined> {
    const service = this.services.get(id);
    if (service && !service.color) {
      // Set default color for services that don't have one
      service.color = "#3B82F6";
      this.services.set(id, service);
    }
    return service;
  }

  async getServicesByCategory(categoryId: number): Promise<Service[]> {
    const services = Array.from(this.services.values()).filter(
      (service) => service.categoryId === categoryId
    );
    // Ensure all services have a color field
    return services.map(service => {
      if (!service.color) {
        service.color = "#3B82F6";
        this.services.set(service.id, service);
      }
      return service;
    });
  }

  async getAllServices(): Promise<Service[]> {
    const services = Array.from(this.services.values());
    // Ensure all services have a color field
    return services.map(service => {
      if (!service.color) {
        service.color = "#3B82F6";
        this.services.set(service.id, service);
      }
      return service;
    });
  }

  async updateService(id: number, serviceData: Partial<InsertService>): Promise<Service> {
    const service = await this.getService(id);
    if (!service) {
      throw new Error('Service not found');
    }
    const updatedService = { ...service, ...serviceData };
    this.services.set(id, updatedService);
    return updatedService;
  }

  async deleteService(id: number): Promise<boolean> {
    return this.services.delete(id);
  }

  // Staff operations
  async createStaff(staffMember: InsertStaff): Promise<Staff> {
    const id = this.currentStaffId++;
    const newStaff = { ...staffMember, id } as Staff;
    this.staff.set(id, newStaff);
    return newStaff;
  }

  async getStaff(id: number): Promise<Staff | undefined> {
    return this.staff.get(id);
  }

  async getStaffByUserId(userId: number): Promise<Staff | undefined> {
    return Array.from(this.staff.values()).find(
      (staffMember) => staffMember.userId === userId
    );
  }

  async getAllStaff(): Promise<Staff[]> {
    return Array.from(this.staff.values());
  }

  async updateStaff(id: number, staffData: Partial<InsertStaff>): Promise<Staff> {
    const staffMember = await this.getStaff(id);
    if (!staffMember) {
      throw new Error('Staff member not found');
    }
    const updatedStaff = { ...staffMember, ...staffData };
    this.staff.set(id, updatedStaff);
    return updatedStaff;
  }

  async deleteStaff(id: number): Promise<boolean> {
    return this.staff.delete(id);
  }

  // Staff Service operations
  async assignServiceToStaff(staffService: InsertStaffService): Promise<StaffService> {
    const id = this.currentStaffServiceId++;
    const newStaffService: StaffService = { 
      ...staffService, 
      id,
      customRate: staffService.customRate || null,
      customCommissionRate: staffService.customCommissionRate || null
    };
    this.staffServices.set(id, newStaffService);
    return newStaffService;
  }

  async getStaffServices(staffId: number): Promise<StaffService[]> {
    return Array.from(this.staffServices.values()).filter(
      (staffService) => staffService.staffId === staffId
    );
  }

  async getStaffServicesByService(serviceId: number): Promise<StaffService[]> {
    return Array.from(this.staffServices.values()).filter(
      (staffService) => staffService.serviceId === serviceId
    );
  }

  async getStaffServiceById(id: number): Promise<StaffService | undefined> {
    return this.staffServices.get(id);
  }

  async updateStaffService(id: number, data: Partial<InsertStaffService>): Promise<StaffService> {
    const existingStaffService = this.staffServices.get(id);
    if (!existingStaffService) {
      throw new Error("Staff service not found");
    }

    const updatedStaffService: StaffService = {
      ...existingStaffService,
      ...data,
    };

    this.staffServices.set(id, updatedStaffService);
    return updatedStaffService;
  }

  async removeServiceFromStaff(staffId: number, serviceId: number): Promise<boolean> {
    const staffServiceToRemove = Array.from(this.staffServices.values()).find(
      (staffService) => staffService.staffId === staffId && staffService.serviceId === serviceId
    );

    if (staffServiceToRemove) {
      return this.staffServices.delete(staffServiceToRemove.id);
    }
    return false;
  }

  // Appointment operations
  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const id = this.currentAppointmentId++;
    const newAppointment = { ...appointment, id, createdAt: new Date() } as Appointment;
    this.appointments.set(id, newAppointment);
    return newAppointment;
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async getAppointmentsByClient(clientId: number): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      (appointment) => appointment.clientId === clientId
    );
  }

  async getAppointmentsByStaff(staffId: number): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      (appointment) => appointment.staffId === staffId
    );
  }

  async getAppointmentsByDate(date: Date): Promise<Appointment[]> {
    const dateString = date.toDateString();
    return Array.from(this.appointments.values()).filter(
      (appointment) => appointment.startTime.toDateString() === dateString
    );
  }

  async updateAppointment(id: number, appointmentData: Partial<InsertAppointment>): Promise<Appointment> {
    const appointment = await this.getAppointment(id);
    if (!appointment) {
      throw new Error('Appointment not found');
    }
    const updatedAppointment = { ...appointment, ...appointmentData };
    this.appointments.set(id, updatedAppointment);
    return updatedAppointment;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    return this.appointments.delete(id);
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
}

export const storage = new MemStorage();
