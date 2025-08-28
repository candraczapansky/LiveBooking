import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users, serviceCategories, rooms, devices, services, products, staff, staffServices, appointments, appointmentHistory, cancelledAppointments, appointmentPhotos, memberships, clientMemberships, payments, savedPaymentMethods, giftCards, giftCardTransactions, savedGiftCards, marketingCampaigns, marketingCampaignRecipients, emailUnsubscribes, promoCodes, staffSchedules, userColorPreferences, notifications, timeClockEntries, payrollHistory, salesHistory, businessSettings, automationRules, forms, formSubmissions, businessKnowledge, businessKnowledgeCategories, llmConversations, checkSoftwareProviders, payrollChecks, checkSoftwareLogs, staffEarnings, systemConfig, aiMessagingConfig, conversationFlows, noteTemplates, noteHistory, permissions, permissionGroups, permissionGroupMappings, userPermissionGroups, userDirectPermissions, phoneCalls } from "../shared/schema.js";
import { db } from "./db.js";
import { eq, and, or, ne, gte, lte, desc, asc, isNull, count, sql, inArray } from "drizzle-orm";
export class DatabaseStorage {
    constructor() {
        // PostgreSQL storage - no in-memory structures needed
        this.initializeConnection();
        // Initialize sample data including services
        this.initializeSampleData().catch(error => {
            console.error('Sample data initialization failed:', error);
            // Don't throw error to prevent server startup failure
        });
    }
    async initializeConnection() {
        const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_DlO6hZu7nMUE@ep-lively-moon-a63jgei9.us-west-2.aws.neon.tech/neondb?sslmode=require";
        const sql = neon(DATABASE_URL, { arrayMode: false, fullResults: false });
        const db = drizzle(sql, { schema: (await import("../shared/schema.js")) });
        try {
            // Test database connection
            await db.select().from(users).limit(1);
            console.log('Database connection established successfully');
            // Add missing columns if they don't exist (migration)
            try {
                await sql `ALTER TABLE services ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false`;
                console.log('Ensured is_hidden column exists in services table');
                // Ensure add-on mapping container exists in system_config
                try {
                    const existing = await sql `SELECT 1 FROM system_config WHERE key = 'service_add_on_mapping' LIMIT 1`;
                    if (!existing?.rows || existing.rows.length === 0) {
                        await sql `INSERT INTO system_config (key, value, description, category) VALUES ('service_add_on_mapping', '{}', 'JSON mapping of add-on serviceId -> [baseServiceIds]', 'services')`;
                        console.log('Initialized service_add_on_mapping in system_config');
                    }
                }
                catch { }
            }
            catch (migrationError) {
                // Column might already exist, which is fine
                console.log('Migration check completed');
            }
        }
        catch (error) {
            console.error('Database connection failed:', error);
            // Don't throw error to prevent server startup failure
        }
    }
    async initializeSampleData() {
        try {
            console.log('Starting sample data initialization...');
            // Check if sample data has already been initialized
            const sampleDataFlag = await this.getSystemConfig('sample_data_initialized');
            const existingServices = await this.getAllServices();
            // If services are missing, force re-initialization of services only
            if (existingServices.length === 0) {
                console.log('Services are missing, forcing service restoration...');
                // Continue with initialization
            }
            else if (sampleDataFlag && sampleDataFlag.value === 'true') {
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
            }
            else {
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
            }
            else {
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
                }
                else {
                    console.log('Staff profile already exists');
                }
            }
            // Create sample services only if they don't exist
            const existingServicesCheck = await this.getAllServices();
            // Get the actual category IDs for reference (use the refreshed categories)
            const hairServicesCategory = categoriesAfterCreate.find(c => c.name === 'Hair Services');
            const facialTreatmentsCategory = categoriesAfterCreate.find(c => c.name === 'Facial Treatments');
            if (!existingServicesCheck.find((s) => s.name === 'Women\'s Haircut & Style') && hairServicesCategory) {
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
            if (!existingServicesCheck.find((s) => s.name === 'Color & Highlights') && hairServicesCategory) {
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
            if (!existingServicesCheck.find((s) => s.name === 'Deep Cleansing Facial') && facialTreatmentsCategory) {
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
            }
            catch (flagError) {
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
            }
            catch (error) {
                console.log('Error creating automation rules:', error);
            }
        }
        catch (error) {
            console.error('Error during sample data initialization:', error);
            // Don't throw error to prevent server startup failure
        }
    }
    // User operations
    async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
    }
    async getUserById(id) {
        return this.getUser(id);
    }
    async getUserByUsername(username) {
        const [user] = await db.select().from(users).where(eq(users.username, username));
        return user;
    }
    async getAllUsers() {
        return await db.select().from(users);
    }
    async getUsersByRole(role) {
        return await db.select().from(users).where(eq(users.role, role));
    }
    async searchUsers(query) {
        const searchTerm = `%${query}%`;
        return await db
            .select()
            .from(users)
            .where(or(sql `LOWER(${users.username}) LIKE LOWER(${searchTerm})`, sql `LOWER(${users.firstName}) LIKE LOWER(${searchTerm})`, sql `LOWER(${users.lastName}) LIKE LOWER(${searchTerm})`, sql `LOWER(${users.email}) LIKE LOWER(${searchTerm})`, sql `LOWER(${users.phone}) LIKE LOWER(${searchTerm})`))
            .limit(20);
    }
    async createUser(insertUser) {
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
        }
        catch (error) {
            console.error('Storage: Error creating user:', error);
            throw error;
        }
    }
    async updateUser(id, userData) {
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
            const processedData = { ...userData };
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
            }
            else if (processedData.phone === '' || processedData.phone === null) {
                // Explicitly clear phone when empty or null is sent
                processedData.phone = null;
                console.log('Clearing phone number (set to null).');
            }
            else {
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
        }
        catch (error) {
            console.error('Error updating user:', error);
            // Re-throw the error instead of falling back to original user
            throw error;
        }
    }
    async deleteUser(id) {
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
        }
        catch (error) {
            console.error(`DatabaseStorage: Error deleting user ${id}:`, error);
            throw error; // Re-throw to bubble up the specific error message
        }
    }
    async getUserByEmail(email) {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        return user;
    }
    async getUserByPhone(phone) {
        const [user] = await db.select().from(users).where(eq(users.phone, phone));
        return user;
    }
    async setPasswordResetToken(userId, token, expiry) {
        await db.update(users)
            .set({
            resetToken: token,
            resetTokenExpiry: expiry
        })
            .where(eq(users.id, userId));
    }
    async getUserByResetToken(token) {
        const [user] = await db.select().from(users).where(and(eq(users.resetToken, token), gte(users.resetTokenExpiry, new Date())));
        return user;
    }
    async clearPasswordResetToken(userId) {
        await db.update(users)
            .set({
            resetToken: null,
            resetTokenExpiry: null
        })
            .where(eq(users.id, userId));
    }
    // Service Category operations
    async createServiceCategory(category) {
        const [newCategory] = await db.insert(serviceCategories).values(category).returning();
        return newCategory;
    }
    async getServiceCategory(id) {
        const [category] = await db.select().from(serviceCategories).where(eq(serviceCategories.id, id));
        return category;
    }
    async getServiceCategoryByName(name) {
        const [category] = await db.select().from(serviceCategories).where(eq(serviceCategories.name, name));
        return category;
    }
    async getAllServiceCategories() {
        return await db.select().from(serviceCategories);
    }
    async updateServiceCategory(id, categoryData) {
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
    async deleteServiceCategory(id) {
        const result = await db.delete(serviceCategories).where(eq(serviceCategories.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    // Room operations
    async createRoom(room) {
        const [newRoom] = await db.insert(rooms).values(room).returning();
        return newRoom;
    }
    async getRoom(id) {
        const result = await db.select().from(rooms).where(eq(rooms.id, id));
        return result[0];
    }
    async getAllRooms() {
        return await db.select().from(rooms);
    }
    async updateRoom(id, roomData) {
        const [updatedRoom] = await db.update(rooms).set(roomData).where(eq(rooms.id, id)).returning();
        if (!updatedRoom) {
            throw new Error("Room not found");
        }
        return updatedRoom;
    }
    async deleteRoom(id) {
        const result = await db.delete(rooms).where(eq(rooms.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    // Device operations
    async createDevice(device) {
        const [newDevice] = await db.insert(devices).values(device).returning();
        return newDevice;
    }
    async getDevice(id) {
        const result = await db.select().from(devices).where(eq(devices.id, id));
        return result[0];
    }
    async getAllDevices() {
        return await db.select().from(devices);
    }
    async updateDevice(id, deviceData) {
        const [updatedDevice] = await db.update(devices).set(deviceData).where(eq(devices.id, id)).returning();
        if (!updatedDevice) {
            throw new Error(`Device with id ${id} not found`);
        }
        return updatedDevice;
    }
    async deleteDevice(id) {
        const result = await db.delete(devices).where(eq(devices.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    // Service operations
    async createService(service) {
        const [created] = await db.insert(services).values(service).returning();
        return created;
    }
    async getService(id) {
        try {
            const [row] = await db.select().from(services).where(eq(services.id, id));
            return row;
        }
        catch (err) {
            const message = typeof err?.message === 'string' ? err.message : '';
            if (/does\s+not\s+exist/i.test(message)) {
                const result = await db.execute(sql `
          SELECT 
            id, name, description, duration, price,
            category_id AS "categoryId",
            color,
            is_active AS "isActive"
          FROM services
          WHERE id = ${id}
          LIMIT 1
        `);
                const rows = (result?.rows ?? result);
                return rows?.[0];
            }
            throw err;
        }
    }
    async getServiceByName(name) {
        try {
            const [row] = await db.select().from(services).where(eq(services.name, name));
            return row;
        }
        catch (err) {
            const message = typeof err?.message === 'string' ? err.message : '';
            if (/does\s+not\s+exist/i.test(message)) {
                const result = await db.execute(sql `
          SELECT 
            id, name, description, duration, price,
            category_id AS "categoryId",
            color,
            is_active AS "isActive"
          FROM services
          WHERE name = ${name}
          LIMIT 1
        `);
                const rows = (result?.rows ?? result);
                return rows?.[0];
            }
            throw err;
        }
    }
    async getServicesByCategory(categoryId) {
        try {
            return await db.select().from(services).where(eq(services.categoryId, categoryId));
        }
        catch (err) {
            const message = typeof err?.message === 'string' ? err.message : '';
            if (/does\s+not\s+exist/i.test(message)) {
                const result = await db.execute(sql `
          SELECT 
            id, name, description, duration, price,
            category_id AS "categoryId",
            color,
            is_active AS "isActive"
          FROM services
          WHERE category_id = ${categoryId}
        `);
                const rows = (result?.rows ?? result);
                return rows;
            }
            throw err;
        }
    }
    async getAllServices() {
        try {
            return await db.select().from(services);
        }
        catch (err) {
            const message = typeof err?.message === 'string' ? err.message : '';
            if (/does\s+not\s+exist/i.test(message)) {
                const result = await db.execute(sql `
          SELECT 
            id, name, description, duration, price,
            category_id AS "categoryId",
            color,
            is_active AS "isActive"
          FROM services
        `);
                const rows = (result?.rows ?? result);
                return rows;
            }
            throw err;
        }
    }
    async updateService(id, serviceData) {
        const [updated] = await db.update(services).set(serviceData).where(eq(services.id, id)).returning();
        return updated;
    }
    async deleteService(id) {
        const result = await db.delete(services).where(eq(services.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    async getServiceAvailability(serviceId, date, staffId) {
        return [];
    }
    async getPopularServices(limit, periodDays) {
        const all = await this.getAllServices();
        return all.slice(0, Math.max(0, limit));
    }
    async getServiceStatistics(serviceId, startDate, endDate) {
        return { totalAppointments: 0, totalRevenue: 0, averageDurationMinutes: null, startDate, endDate };
    }
    async getServicesByStatus(isActive) {
        try {
            return await db.select().from(services).where(eq(services.isActive, isActive));
        }
        catch (err) {
            const message = typeof err?.message === 'string' ? err.message : '';
            if (/does\s+not\s+exist/i.test(message)) {
                const result = await db.execute(sql `
          SELECT 
            id, name, description, duration, price,
            category_id AS "categoryId",
            color,
            is_active AS "isActive"
          FROM services
          WHERE is_active = ${isActive}
        `);
                const rows = (result?.rows ?? result);
                return rows;
            }
            throw err;
        }
    }
    // -----------------------------
    // Add-on mapping operations
    // Stored as JSON in system_config under key 'service_add_on_mapping'
    // Shape: { [addOnServiceId: string]: number[] }
    async getAddOnMapping() {
        try {
            const cfg = await this.getSystemConfig('service_add_on_mapping');
            const raw = cfg?.value || '{}';
            try {
                return JSON.parse(raw);
            }
            catch {
                return {};
            }
        }
        catch {
            return {};
        }
    }
    async setAddOnMapping(map) {
        const value = JSON.stringify(map);
        await this.updateSystemConfig('service_add_on_mapping', value, 'JSON mapping of add-on -> base services');
    }
    async getBaseServicesForAddOn(addOnServiceId) {
        const map = await this.getAddOnMapping();
        return map[String(addOnServiceId)] || [];
    }
    async setBaseServicesForAddOn(addOnServiceId, baseServiceIds) {
        const map = await this.getAddOnMapping();
        map[String(addOnServiceId)] = Array.from(new Set(baseServiceIds.map((n) => Number(n))));
        await this.setAddOnMapping(map);
    }
    async addBaseServiceToAddOn(addOnServiceId, baseServiceId) {
        const current = await this.getBaseServicesForAddOn(addOnServiceId);
        if (!current.includes(Number(baseServiceId))) {
            current.push(Number(baseServiceId));
            await this.setBaseServicesForAddOn(addOnServiceId, current);
        }
    }
    async removeBaseServiceFromAddOn(addOnServiceId, baseServiceId) {
        const current = await this.getBaseServicesForAddOn(addOnServiceId);
        const next = current.filter((id) => Number(id) !== Number(baseServiceId));
        await this.setBaseServicesForAddOn(addOnServiceId, next);
    }
    async getBaseServiceObjectsForAddOn(addOnServiceId) {
        const ids = await this.getBaseServicesForAddOn(addOnServiceId);
        const all = await this.getAllServices();
        const idSet = new Set(ids.map(Number));
        return all.filter((s) => idSet.has(Number(s.id)));
    }
    // -----------------------------
    // Appointment add-on mapping operations
    // Stored as JSON in system_config under key 'appointment_add_on_mapping'
    // Shape: { [appointmentId: string]: number[] }
    async getAppointmentAddOnMapping() {
        try {
            const cfg = await this.getSystemConfig('appointment_add_on_mapping');
            const raw = cfg?.value || '{}';
            try {
                return JSON.parse(raw);
            }
            catch {
                return {};
            }
        }
        catch {
            return {};
        }
    }
    async setAppointmentAddOnMapping(map) {
        const value = JSON.stringify(map);
        await this.updateSystemConfig('appointment_add_on_mapping', value, 'JSON mapping of appointmentId -> [addOnServiceIds]');
    }
    async getAddOnsForAppointment(appointmentId) {
        const map = await this.getAppointmentAddOnMapping();
        return map[String(appointmentId)] || [];
    }
    async setAddOnsForAppointment(appointmentId, addOnServiceIds) {
        const map = await this.getAppointmentAddOnMapping();
        map[String(appointmentId)] = Array.from(new Set(addOnServiceIds.map((n) => Number(n))));
        await this.setAppointmentAddOnMapping(map);
    }
    async addAddOnToAppointment(appointmentId, addOnServiceId) {
        const current = await this.getAddOnsForAppointment(appointmentId);
        if (!current.includes(Number(addOnServiceId))) {
            current.push(Number(addOnServiceId));
            await this.setAddOnsForAppointment(appointmentId, current);
        }
    }
    async removeAddOnFromAppointment(appointmentId, addOnServiceId) {
        const current = await this.getAddOnsForAppointment(appointmentId);
        const next = current.filter((id) => Number(id) !== Number(addOnServiceId));
        await this.setAddOnsForAppointment(appointmentId, next);
    }
    async getAddOnServiceObjectsForAppointment(appointmentId) {
        const ids = await this.getAddOnsForAppointment(appointmentId);
        const all = await this.getAllServices();
        const idSet = new Set(ids.map(Number));
        return all.filter((s) => idSet.has(Number(s.id)));
    }
    // Staff operations
    async createStaff(staffMember) {
        // Insert only columns guaranteed to exist in the current DB
        const insertData = {
            userId: staffMember.userId,
            title: staffMember.title,
            bio: staffMember.bio ?? null,
            commissionType: staffMember.commissionType,
            commissionRate: staffMember.commissionRate ?? null,
            hourlyRate: staffMember.hourlyRate ?? null,
            fixedRate: staffMember.fixedRate ?? null,
        };
        const locationId = staffMember.locationId ?? null;
        // Use explicit SQL to avoid referencing non-existent photo_url in some DBs
        const result = await db.execute(sql `
      INSERT INTO "staff" (
        "user_id", "title", "bio", "commission_type", "commission_rate", "hourly_rate", "fixed_rate", "location_id"
      ) VALUES (
        ${insertData.userId}, ${insertData.title}, ${insertData.bio}, ${insertData.commissionType}, ${insertData.commissionRate}, ${insertData.hourlyRate}, ${insertData.fixedRate}, ${locationId}
      ) RETURNING 
        "id", "user_id" as "userId", "title", "bio", "commission_type" as "commissionType", 
        "commission_rate" as "commissionRate", "hourly_rate" as "hourlyRate", "fixed_rate" as "fixedRate", "location_id" as "locationId";
    `);
        return result.rows[0];
    }
    async getStaff(id) {
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
        return result;
    }
    async getStaffByUserId(userId) {
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
            return result;
        }
        catch (error) {
            console.error('Error getting staff by user id:', error);
            return undefined;
        }
    }
    async getAllStaff() {
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
            return result;
        }
        catch (error) {
            console.error('Error getting staff:', error);
            return [];
        }
    }
    async updateStaff(id, staffData) {
        try {
            // Whitelist updatable columns only; include keys present even if null to allow clearing values
            const safeUpdate = {};
            if (staffData.title !== undefined)
                safeUpdate.title = staffData.title;
            if (staffData.bio !== undefined)
                safeUpdate.bio = staffData.bio;
            if (staffData.locationId !== undefined)
                safeUpdate.locationId = staffData.locationId;
            if (staffData.commissionType !== undefined)
                safeUpdate.commissionType = staffData.commissionType;
            if (staffData.commissionRate !== undefined)
                safeUpdate.commissionRate = staffData.commissionRate;
            if (staffData.hourlyRate !== undefined)
                safeUpdate.hourlyRate = staffData.hourlyRate;
            if (staffData.fixedRate !== undefined)
                safeUpdate.fixedRate = staffData.fixedRate;
            if (staffData.isActive !== undefined)
                safeUpdate.isActive = staffData.isActive;
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
            return result;
        }
        catch (error) {
            console.error('Error updating staff:', error);
            throw error;
        }
    }
    async deleteStaff(id) {
        try {
            const result = await db.delete(staff).where(eq(staff.id, id));
            return result.rowCount ? result.rowCount > 0 : false;
        }
        catch (error) {
            console.error('Error deleting staff:', error);
            return false;
        }
    }
    // Staff Service operations
    async assignServiceToStaff(staffService) {
        try {
            const [newStaffService] = await db.insert(staffServices).values(staffService).returning();
            return newStaffService;
        }
        catch (error) {
            console.error('Error assigning service to staff:', error);
            throw error;
        }
    }
    async getStaffServices(staffId) {
        try {
            return await db.select().from(staffServices).where(eq(staffServices.staffId, staffId));
        }
        catch (error) {
            console.error('Error getting staff services:', error);
            return [];
        }
    }
    async getAllStaffServices() {
        try {
            return await db.select().from(staffServices);
        }
        catch (error) {
            console.error('Error getting all staff services:', error);
            return [];
        }
    }
    async getStaffServicesByService(serviceId) {
        try {
            return await db.select().from(staffServices).where(eq(staffServices.serviceId, serviceId));
        }
        catch (error) {
            console.error('Error getting staff services by service:', error);
            return [];
        }
    }
    async getStaffServiceById(id) {
        try {
            const [staffService] = await db.select().from(staffServices).where(eq(staffServices.id, id));
            return staffService;
        }
        catch (error) {
            console.error('Error getting staff service by id:', error);
            return undefined;
        }
    }
    async getStaffServiceAssignment(staffId, serviceId) {
        try {
            const [staffService] = await db.select().from(staffServices).where(and(eq(staffServices.staffId, staffId), eq(staffServices.serviceId, serviceId)));
            return staffService;
        }
        catch (error) {
            console.error('Error getting staff service assignment:', error);
            return undefined;
        }
    }
    async updateStaffService(id, data) {
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
        }
        catch (error) {
            console.error('Error updating staff service:', error);
            throw error;
        }
    }
    async removeServiceFromStaff(staffId, serviceId) {
        try {
            const result = await db
                .delete(staffServices)
                .where(and(eq(staffServices.staffId, staffId), eq(staffServices.serviceId, serviceId)));
            return (result.rowCount ?? 0) > 0;
        }
        catch (error) {
            console.error('Error removing service from staff:', error);
            return false;
        }
    }
    // Appointment operations
    async createAppointment(appointment) {
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
    async getAppointment(id) {
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
        if (!appointmentData || appointmentData.length === 0)
            return undefined;
        const row = appointmentData[0];
        const appointment = row.appointments;
        // Convert local datetime strings to Date objects for frontend
        return {
            ...appointment,
            startTime: this.convertLocalToDate(appointment.startTime),
            endTime: this.convertLocalToDate(appointment.endTime)
        };
    }
    async getAllAppointments() {
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
        return appointmentList.map((row) => ({
            ...row.appointments,
            startTime: this.convertLocalToDate(row.appointments.startTime),
            endTime: this.convertLocalToDate(row.appointments.endTime),
            staff: row.staff ? {
                ...row.staff,
                user: row.users,
            } : null,
        }));
    }
    async getAppointmentById(id) {
        const numeric = typeof id === 'string' ? parseInt(id, 10) : id;
        const [row] = await db.select().from(appointments).where(eq(appointments.id, numeric));
        return row;
    }
    convertLocalToDate(localTimeValue) {
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
    async getAppointmentsByClient(clientId) {
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
    async getAppointmentsByStaff(staffId) {
        const appointmentList = await db
            .select({ appointments })
            .from(appointments)
            .where(eq(appointments.staffId, staffId))
            .orderBy(desc(appointments.startTime));
        // Convert local datetime strings to Date objects for frontend
        return appointmentList.map((appointment) => ({
            ...appointment,
            startTime: this.convertLocalToDate(appointment.startTime),
            endTime: this.convertLocalToDate(appointment.endTime)
        }));
    }
    async getAppointmentsByService(serviceId) {
        const appointmentList = await db.select().from(appointments).where(eq(appointments.serviceId, serviceId)).orderBy(desc(appointments.startTime));
        // Convert local datetime strings to Date objects for frontend
        return appointmentList.map((appointment) => ({
            ...appointment,
            startTime: this.convertLocalToDate(appointment.startTime),
            endTime: this.convertLocalToDate(appointment.endTime)
        }));
    }
    async getAppointmentsByLocation(locationId) {
        const appointmentList = await db.select().from(appointments).where(eq(appointments.locationId, locationId)).orderBy(desc(appointments.startTime));
        // Convert local datetime strings to Date objects for frontend
        return appointmentList.map((appointment) => ({
            ...appointment,
            startTime: this.convertLocalToDate(appointment.startTime),
            endTime: this.convertLocalToDate(appointment.endTime)
        }));
    }
    async getActiveAppointmentsByStaff(staffId) {
        const appointmentList = await db.select().from(appointments).where(and(eq(appointments.staffId, staffId), or(eq(appointments.status, "pending"), eq(appointments.status, "confirmed"), eq(appointments.status, "completed")))).orderBy(desc(appointments.startTime));
        // Convert local datetime strings to Date objects for frontend
        return appointmentList.map((appointment) => ({
            ...appointment,
            startTime: this.convertLocalToDate(appointment.startTime),
            endTime: this.convertLocalToDate(appointment.endTime)
        }));
    }
    async getAppointmentsByStaffAndDateRange(staffId, startDate, endDate) {
        return await db.select().from(appointments).where(and(eq(appointments.staffId, staffId), gte(appointments.startTime, startDate), lte(appointments.startTime, endDate))).orderBy(appointments.startTime);
    }
    async getAppointmentsByDate(date) {
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
        const appointmentList = await db.select().from(appointments).where(and(gte(appointments.startTime, startOfDay), lte(appointments.startTime, endOfDay))).orderBy(appointments.startTime);
        // Convert local datetime strings to Date objects for frontend
        return appointmentList.map((appointment) => ({
            ...appointment,
            startTime: this.convertLocalToDate(appointment.startTime),
            endTime: this.convertLocalToDate(appointment.endTime)
        }));
    }
    async getActiveAppointmentsByDate(date) {
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
        const appointmentList = await db.select().from(appointments).where(and(gte(appointments.startTime, startOfDay), lte(appointments.startTime, endOfDay), or(eq(appointments.status, "pending"), eq(appointments.status, "confirmed"), eq(appointments.status, "completed")))).orderBy(appointments.startTime);
        // Convert local datetime strings to Date objects for frontend
        return appointmentList.map((appointment) => ({
            ...appointment,
            startTime: this.convertLocalToDate(appointment.startTime),
            endTime: this.convertLocalToDate(appointment.endTime)
        }));
    }
    async getAppointmentsByDateRange(startDate, endDate) {
        return await db.select().from(appointments).where(and(gte(appointments.startTime, startDate), lte(appointments.startTime, endDate))).orderBy(appointments.startTime);
    }
    async updateAppointment(id, appointmentData) {
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
    async deleteAppointment(id) {
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
    async cancelAppointment(id) {
        const numeric = typeof id === 'string' ? parseInt(id, 10) : id;
        const [updated] = await db.update(appointments).set({ status: 'cancelled' }).where(eq(appointments.id, numeric)).returning();
        return !!updated;
    }
    // Appointment History operations
    async createAppointmentHistory(history) {
        const [newHistory] = await db.insert(appointmentHistory).values(history).returning();
        return newHistory;
    }
    async getAppointmentHistory(appointmentId) {
        return await db.select().from(appointmentHistory).where(eq(appointmentHistory.appointmentId, appointmentId)).orderBy(desc(appointmentHistory.createdAt));
    }
    async getAllAppointmentHistory() {
        return await db.select().from(appointmentHistory).orderBy(desc(appointmentHistory.createdAt));
    }
    // Cancelled Appointment operations
    async createCancelledAppointment(cancelledAppointment) {
        const [newCancelledAppointment] = await db.insert(cancelledAppointments).values(cancelledAppointment).returning();
        return newCancelledAppointment;
    }
    async getCancelledAppointment(id) {
        const [cancelled] = await db.select().from(cancelledAppointments).where(eq(cancelledAppointments.id, id));
        return cancelled;
    }
    async getAllCancelledAppointments() {
        return await db.select().from(cancelledAppointments).orderBy(desc(cancelledAppointments.cancelledAt));
    }
    async getCancelledAppointmentsByClient(clientId) {
        return await db.select().from(cancelledAppointments).where(eq(cancelledAppointments.clientId, clientId)).orderBy(desc(cancelledAppointments.cancelledAt));
    }
    async getCancelledAppointmentsByStaff(staffId) {
        return await db.select().from(cancelledAppointments).where(eq(cancelledAppointments.staffId, staffId)).orderBy(desc(cancelledAppointments.cancelledAt));
    }
    async getCancelledAppointmentsByDateRange(startDate, endDate) {
        return await db.select().from(cancelledAppointments).where(and(gte(cancelledAppointments.startTime, startDate), lte(cancelledAppointments.startTime, endDate))).orderBy(cancelledAppointments.startTime);
    }
    async moveAppointmentToCancelled(appointmentId, cancellationReason, cancelledBy, cancelledByRole) {
        // Get the original appointment
        const appointment = await this.getAppointment(appointmentId);
        if (!appointment) {
            throw new Error('Appointment not found');
        }
        // Create the cancelled appointment record
        const cancelledAppointmentData = {
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
    async createAppointmentPhoto(photo) {
        const [newPhoto] = await db.insert(appointmentPhotos).values(photo).returning();
        return newPhoto;
    }
    async getAppointmentPhotos(appointmentId) {
        const photos = await db
            .select()
            .from(appointmentPhotos)
            .where(eq(appointmentPhotos.appointmentId, appointmentId))
            .orderBy(desc(appointmentPhotos.createdAt));
        return photos.map((photo) => ({
            ...photo,
            createdAt: this.convertLocalToDate(photo.createdAt)
        }));
    }
    async getAppointmentPhoto(id) {
        const [photo] = await db.select().from(appointmentPhotos).where(eq(appointmentPhotos.id, id));
        if (!photo)
            return undefined;
        return {
            ...photo,
            createdAt: photo.createdAt ? this.convertLocalToDate(photo.createdAt) : null
        };
    }
    async deleteAppointmentPhoto(id) {
        const result = await db.delete(appointmentPhotos).where(eq(appointmentPhotos.id, id));
        return result.rowCount > 0;
    }
    // Membership operations
    async createMembership(membership) {
        const [newMembership] = await db.insert(memberships).values(membership).returning();
        return newMembership;
    }
    async getMembership(id) {
        const result = await db.select().from(memberships).where(eq(memberships.id, id));
        return result[0];
    }
    async getAllMemberships() {
        return await db.select().from(memberships);
    }
    async updateMembership(id, membershipData) {
        const [updatedMembership] = await db.update(memberships).set(membershipData).where(eq(memberships.id, id)).returning();
        if (!updatedMembership) {
            throw new Error('Membership not found');
        }
        return updatedMembership;
    }
    async deleteMembership(id) {
        const result = await db.delete(memberships).where(eq(memberships.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    // Client Membership operations
    async createClientMembership(clientMembership) {
        const [newClientMembership] = await db.insert(clientMemberships).values(clientMembership).returning();
        return newClientMembership;
    }
    async getClientMembership(id) {
        const result = await db.select().from(clientMemberships).where(eq(clientMemberships.id, id));
        return result[0];
    }
    async getClientMembershipsByClient(clientId) {
        return await db.select().from(clientMemberships).where(eq(clientMemberships.clientId, clientId));
    }
    async getAllClientMemberships() {
        return await db.select().from(clientMemberships);
    }
    async getClientMembershipsByMembership(membershipId) {
        return await db.select().from(clientMemberships).where(eq(clientMemberships.membershipId, membershipId));
    }
    async updateClientMembership(id, data) {
        const [updatedClientMembership] = await db.update(clientMemberships).set(data).where(eq(clientMemberships.id, id)).returning();
        if (!updatedClientMembership) {
            throw new Error('Client membership not found');
        }
        return updatedClientMembership;
    }
    async deleteClientMembership(id) {
        const result = await db.delete(clientMemberships).where(eq(clientMemberships.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    // Payment operations
    async createPayment(payment) {
        const [newPayment] = await db.insert(payments).values(payment).returning();
        return newPayment;
    }
    async getPayment(id) {
        const result = await db.select().from(payments).where(eq(payments.id, id));
        return result[0];
    }
    async getPaymentByHelcimId(helcimPaymentId) {
        const result = await db.select().from(payments).where(eq(payments.helcimPaymentId, helcimPaymentId));
        return result[0];
    }
    async getPaymentsByClient(clientId) {
        return await db.select().from(payments).where(eq(payments.clientId, clientId));
    }
    async getAllPayments() {
        return await db.select().from(payments);
    }
    async updatePayment(id, paymentData) {
        const [updatedPayment] = await db.update(payments).set(paymentData).where(eq(payments.id, id)).returning();
        if (!updatedPayment) {
            throw new Error('Payment not found');
        }
        return updatedPayment;
    }
    // Saved Payment Methods operations
    async createSavedPaymentMethod(paymentMethod) {
        const [newPaymentMethod] = await db.insert(savedPaymentMethods).values(paymentMethod).returning();
        return newPaymentMethod;
    }
    async getSavedPaymentMethod(id) {
        const result = await db.select().from(savedPaymentMethods).where(eq(savedPaymentMethods.id, id));
        return result[0];
    }
    async getSavedPaymentMethodsByClient(clientId) {
        return await db.select().from(savedPaymentMethods).where(eq(savedPaymentMethods.clientId, clientId));
    }
    async updateSavedPaymentMethod(id, data) {
        const [updatedMethod] = await db.update(savedPaymentMethods).set(data).where(eq(savedPaymentMethods.id, id)).returning();
        if (!updatedMethod) {
            throw new Error('Saved payment method not found');
        }
        return updatedMethod;
    }
    async deleteSavedPaymentMethod(id) {
        const result = await db.delete(savedPaymentMethods).where(eq(savedPaymentMethods.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    async setDefaultPaymentMethod(clientId, paymentMethodId) {
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
    async updateUserSquareCustomerId(userId, squareCustomerId) {
        // No-op in current system; maintain compatibility by returning the user unchanged
        const user = await this.getUserById(userId);
        if (!user)
            throw new Error('User not found');
        return user;
    }
    async updateUserHelcimCustomerId(userId, helcimCustomerId) {
        return this.updateUser(userId, { helcimCustomerId });
    }
    // Gift Card operations
    async createGiftCard(giftCard) {
        const [newGiftCard] = await db.insert(giftCards).values(giftCard).returning();
        return newGiftCard;
    }
    async getGiftCard(id) {
        const [giftCard] = await db.select().from(giftCards).where(eq(giftCards.id, id));
        return giftCard;
    }
    async getGiftCardByCode(code) {
        const [giftCard] = await db.select().from(giftCards).where(eq(giftCards.code, code));
        return giftCard;
    }
    async getAllGiftCards() {
        return await db.select().from(giftCards).orderBy(desc(giftCards.createdAt));
    }
    async updateGiftCard(id, giftCardData) {
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
    async deleteGiftCard(id) {
        const result = await db.delete(giftCards).where(eq(giftCards.id, id));
        return result.rowCount ? result.rowCount > 0 : false;
    }
    // Gift Card Transaction operations
    async createGiftCardTransaction(transaction) {
        const [newTransaction] = await db.insert(giftCardTransactions).values(transaction).returning();
        return newTransaction;
    }
    async getGiftCardTransaction(id) {
        const [transaction] = await db.select().from(giftCardTransactions).where(eq(giftCardTransactions.id, id));
        return transaction;
    }
    async getGiftCardTransactionsByCard(giftCardId) {
        return await db.select().from(giftCardTransactions)
            .where(eq(giftCardTransactions.giftCardId, giftCardId))
            .orderBy(desc(giftCardTransactions.createdAt));
    }
    // Saved Gift Card operations
    async createSavedGiftCard(savedGiftCard) {
        const [newSavedGiftCard] = await db.insert(savedGiftCards).values(savedGiftCard).returning();
        return newSavedGiftCard;
    }
    async getSavedGiftCard(id) {
        const [savedCard] = await db.select().from(savedGiftCards).where(eq(savedGiftCards.id, id));
        return savedCard;
    }
    async getSavedGiftCardsByClient(clientId) {
        return await db.select().from(savedGiftCards)
            .where(eq(savedGiftCards.clientId, clientId))
            .orderBy(desc(savedGiftCards.addedAt));
    }
    async deleteSavedGiftCard(id) {
        const result = await db.delete(savedGiftCards).where(eq(savedGiftCards.id, id));
        return result.rowCount ? result.rowCount > 0 : false;
    }
    // Marketing Campaign operations
    async createMarketingCampaign(campaign) {
        // Normalize targetClientIds to Postgres text[] (array of strings)
        const campaignData = { ...campaign };
        let targetClientIdsArray = null;
        if (Array.isArray(campaignData.targetClientIds)) {
            targetClientIdsArray = campaignData.targetClientIds.map((v) => String(v));
        }
        else if (typeof campaignData.targetClientIds === 'string') {
            const raw = campaignData.targetClientIds.trim();
            if (raw.length > 0) {
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        targetClientIdsArray = parsed.map((v) => String(v));
                    }
                }
                catch {
                    // If not JSON, attempt to parse simple Postgres array literal like {1,2}
                    if (raw.startsWith('{') && raw.endsWith('}')) {
                        targetClientIdsArray = raw
                            .slice(1, -1)
                            .split(',')
                            .map((s) => s.trim())
                            .filter((s) => s.length > 0);
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
        })
            .returning();
        return newCampaign;
    }
    async getMarketingCampaign(id) {
        const [campaign] = await db.select().from(marketingCampaigns).where(eq(marketingCampaigns.id, id));
        return campaign || undefined;
    }
    async getAllMarketingCampaigns() {
        return await db.select().from(marketingCampaigns).orderBy(desc(marketingCampaigns.id));
    }
    async getMarketingCampaigns() {
        // Alias for getAllMarketingCampaigns for compatibility
        return this.getAllMarketingCampaigns();
    }
    async updateMarketingCampaign(id, campaignData) {
        // Handle date conversion for sendDate if it's a string
        const processedData = { ...campaignData };
        if (processedData.sendDate && typeof processedData.sendDate === 'string') {
            processedData.sendDate = new Date(processedData.sendDate);
        }
        if (processedData.sentAt && typeof processedData.sentAt === 'string') {
            processedData.sentAt = new Date(processedData.sentAt);
        }
        // Normalize targetClientIds if present
        if (processedData.targetClientIds !== undefined) {
            if (Array.isArray(processedData.targetClientIds)) {
                processedData.targetClientIds = processedData.targetClientIds.map((v) => String(v));
            }
            else if (typeof processedData.targetClientIds === 'string') {
                const raw = processedData.targetClientIds.trim();
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        processedData.targetClientIds = parsed.map((v) => String(v));
                    }
                }
                catch {
                    if (raw.startsWith('{') && raw.endsWith('}')) {
                        processedData.targetClientIds = raw
                            .slice(1, -1)
                            .split(',')
                            .map((s) => s.trim())
                            .filter((s) => s.length > 0);
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
    async deleteMarketingCampaign(id) {
        const result = await db.delete(marketingCampaigns).where(eq(marketingCampaigns.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    // Marketing Campaign Recipient operations
    async createMarketingCampaignRecipient(recipient) {
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
    generateTrackingToken() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    async getMarketingCampaignRecipient(id) {
        const [result] = await db.select().from(marketingCampaignRecipients).where(eq(marketingCampaignRecipients.id, id));
        return result;
    }
    async getMarketingCampaignRecipients(campaignId) {
        return await db.select().from(marketingCampaignRecipients).where(eq(marketingCampaignRecipients.campaignId, campaignId));
    }
    async updateMarketingCampaignRecipient(id, data) {
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
    async claimMarketingCampaignRecipient(recipientId) {
        try {
            // Only claim if currently pending
            const [claimed] = await db
                .update(marketingCampaignRecipients)
                .set({ status: 'processing', sentAt: new Date() })
                .where(and(eq(marketingCampaignRecipients.id, recipientId), eq(marketingCampaignRecipients.status, 'pending')))
                .returning();
            return !!claimed;
        }
        catch (error) {
            console.error('Error claiming marketing campaign recipient:', { recipientId }, error);
            return false;
        }
    }
    // User filtering for campaigns
    async getUsersByAudience(audience, targetClientIds) {
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
                        .where(and(eq(appointments.clientId, client.id), gte(appointments.startTime, sixtyDaysAgo)));
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
                        .where(and(eq(appointments.clientId, client.id), gte(appointments.startTime, now), lte(appointments.startTime, nextWeek)));
                    if ((upcomingAppointments[0]?.count || 0) > 0) {
                        upcomingClients.push(client);
                    }
                }
                return upcomingClients;
            }
            case "Specific Clients": {
                // Return specific clients by their IDs
                if (targetClientIds && targetClientIds.length > 0) {
                    return await db.select().from(users).where(and(eq(users.role, "client"), inArray(users.id, targetClientIds)));
                }
                return [];
            }
            default:
                return await db.select().from(users).where(eq(users.role, "client"));
        }
    }
    // Email tracking methods
    async getMarketingCampaignRecipientByToken(token) {
        const [result] = await db.select().from(marketingCampaignRecipients).where(eq(marketingCampaignRecipients.trackingToken, token));
        return result;
    }
    async createEmailUnsubscribe(unsubscribe) {
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
    async getEmailUnsubscribe(userId) {
        const [result] = await db.select().from(emailUnsubscribes).where(eq(emailUnsubscribes.userId, userId));
        return result;
    }
    async getAllEmailUnsubscribes() {
        return await db.select().from(emailUnsubscribes);
    }
    async isUserUnsubscribed(email) {
        const [result] = await db.select().from(emailUnsubscribes).where(eq(emailUnsubscribes.email, email));
        return !!result;
    }
    // Product operations
    async createProduct(product) {
        const [newProduct] = await db.insert(products).values(product).returning();
        return newProduct;
    }
    async getProduct(id) {
        const [product] = await db.select().from(products).where(eq(products.id, id));
        return product || undefined;
    }
    async getAllProducts() {
        return await db.select().from(products);
    }
    async updateProduct(id, productData) {
        const [updatedProduct] = await db
            .update(products)
            .set(productData)
            .where(eq(products.id, id))
            .returning();
        return updatedProduct;
    }
    async deleteProduct(id) {
        const result = await db.delete(products).where(eq(products.id, id));
        return result.rowCount ? result.rowCount > 0 : false;
    }
    async updateProductStock(id, quantity) {
        const [updatedProduct] = await db
            .update(products)
            .set({ stockQuantity: quantity })
            .where(eq(products.id, id))
            .returning();
        return updatedProduct;
    }
    // Promo code operations
    async createPromoCode(promoCode) {
        const [newPromoCode] = await db.insert(promoCodes).values(promoCode).returning();
        return newPromoCode;
    }
    async getPromoCode(id) {
        const [promoCode] = await db.select().from(promoCodes).where(eq(promoCodes.id, id));
        return promoCode;
    }
    async getPromoCodeByCode(code) {
        const [promoCode] = await db.select().from(promoCodes).where(eq(promoCodes.code, code));
        return promoCode;
    }
    async getAllPromoCodes() {
        return await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
    }
    async updatePromoCode(id, promoCodeData) {
        const [updatedPromoCode] = await db
            .update(promoCodes)
            .set(promoCodeData)
            .where(eq(promoCodes.id, id))
            .returning();
        return updatedPromoCode;
    }
    async deletePromoCode(id) {
        const result = await db.delete(promoCodes).where(eq(promoCodes.id, id));
        return result.rowCount ? result.rowCount > 0 : false;
    }
    // Staff Schedule operations
    async createStaffSchedule(schedule) {
        // Ensure serviceCategories is properly formatted as an array
        const scheduleData = {
            ...schedule,
            serviceCategories: Array.isArray(schedule.serviceCategories)
                ? schedule.serviceCategories
                : schedule.serviceCategories
                    ? [schedule.serviceCategories]
                    : []
        };
        const [newSchedule] = await db.insert(staffSchedules).values(scheduleData).returning();
        return newSchedule;
    }
    async getStaffSchedule(id) {
        const [schedule] = await db.select().from(staffSchedules).where(eq(staffSchedules.id, id));
        return schedule;
    }
    async getAllStaffSchedules() {
        return await db.select().from(staffSchedules).orderBy(staffSchedules.dayOfWeek, staffSchedules.startTime);
    }
    async getStaffSchedulesByStaffId(staffId) {
        return await db.select().from(staffSchedules).where(eq(staffSchedules.staffId, staffId)).orderBy(staffSchedules.dayOfWeek, staffSchedules.startTime);
    }
    async updateStaffSchedule(id, scheduleData) {
        // Ensure serviceCategories is properly formatted as an array if provided
        const updateData = {
            ...scheduleData,
            ...(scheduleData.serviceCategories && {
                serviceCategories: Array.isArray(scheduleData.serviceCategories)
                    ? scheduleData.serviceCategories
                    : [scheduleData.serviceCategories]
            })
        };
        const [updatedSchedule] = await db.update(staffSchedules).set(updateData).where(eq(staffSchedules.id, id)).returning();
        if (!updatedSchedule) {
            throw new Error('Staff schedule not found');
        }
        return updatedSchedule;
    }
    async deleteStaffSchedule(id) {
        const result = await db.delete(staffSchedules).where(eq(staffSchedules.id, id));
        return result.rowCount ? result.rowCount > 0 : false;
    }
    // Staff Earnings operations
    async createStaffEarnings(earnings) {
        try {
            const [result] = await db.insert(staffEarnings).values(earnings).returning();
            return result;
        }
        catch (error) {
            console.error('Error creating staff earnings:', error);
            throw error;
        }
    }
    async getStaffEarnings(staffId, month) {
        try {
            if (month) {
                const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
                const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
                return await db.select().from(staffEarnings).where(and(eq(staffEarnings.staffId, staffId), gte(staffEarnings.earningsDate, startOfMonth), lte(staffEarnings.earningsDate, endOfMonth)));
            }
            else {
                return await db.select().from(staffEarnings).where(eq(staffEarnings.staffId, staffId));
            }
        }
        catch (error) {
            console.error('Error getting staff earnings:', error);
            return [];
        }
    }
    async getAllStaffEarnings() {
        try {
            return await db.select().from(staffEarnings);
        }
        catch (error) {
            console.error('Error getting all staff earnings:', error);
            return [];
        }
    }
    // User Color Preferences operations
    async getUserColorPreferences(userId) {
        try {
            const result = await db.select().from(userColorPreferences).where(eq(userColorPreferences.userId, userId));
            console.log(`Found ${result.length} color preference records for user ${userId}`);
            console.log(result);
            return result[0];
        }
        catch (error) {
            console.error('Error getting user color preferences:', error);
            return undefined;
        }
    }
    async createUserColorPreferences(preferences) {
        const result = await db.insert(userColorPreferences).values(preferences).returning();
        return result[0];
    }
    async updateUserColorPreferences(userId, preferences) {
        const result = await db.update(userColorPreferences)
            .set({ ...preferences, updatedAt: new Date() })
            .where(eq(userColorPreferences.userId, userId))
            .returning();
        return result[0];
    }
    async deleteUserColorPreferences(userId) {
        try {
            console.log(`Attempting to delete ALL color preferences for user ${userId}`);
            // Delete all records for this user
            const result = await db.delete(userColorPreferences)
                .where(eq(userColorPreferences.userId, userId));
            console.log(`Delete operation completed. Rows affected: ${result.rowCount}`);
            // Return true if any rows were deleted, false otherwise
            return (result.rowCount ?? 0) > 0;
        }
        catch (error) {
            console.error('Error deleting user color preferences:', error);
            return false;
        }
    }
    // Notification operations
    async createNotification(notification) {
        const [newNotification] = await db.insert(notifications).values(notification).returning();
        return newNotification;
    }
    async getRecentNotifications(limit = 10) {
        const recentNotifications = await db
            .select()
            .from(notifications)
            .orderBy(desc(notifications.createdAt))
            .limit(limit);
        return recentNotifications;
    }
    async getNotificationsByUser(userId, limit = 10) {
        const userNotifications = await db
            .select()
            .from(notifications)
            .where(or(eq(notifications.userId, userId), isNull(notifications.userId)))
            .orderBy(desc(notifications.createdAt))
            .limit(limit);
        return userNotifications;
    }
    async markNotificationAsRead(id) {
        const result = await db
            .update(notifications)
            .set({ isRead: true })
            .where(eq(notifications.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    // Time Clock operations
    async createTimeClockEntry(entry) {
        const [created] = await db.insert(timeClockEntries).values(entry).returning();
        return created;
    }
    async getTimeClockEntry(id) {
        const [entry] = await db.select().from(timeClockEntries).where(eq(timeClockEntries.id, id));
        return entry;
    }
    async getAllTimeClockEntries() {
        return await db.select().from(timeClockEntries).orderBy(desc(timeClockEntries.createdAt));
    }
    async getTimeClockEntriesByStaffId(staffId) {
        return await db.select().from(timeClockEntries)
            .where(eq(timeClockEntries.staffId, staffId))
            .orderBy(desc(timeClockEntries.createdAt));
    }
    async getTimeClockEntryByExternalId(externalId) {
        const [entry] = await db.select().from(timeClockEntries)
            .where(eq(timeClockEntries.externalId, externalId));
        return entry;
    }
    async updateTimeClockEntry(id, entryData) {
        const [updated] = await db.update(timeClockEntries)
            .set(entryData)
            .where(eq(timeClockEntries.id, id))
            .returning();
        return updated;
    }
    async deleteTimeClockEntry(id) {
        const result = await db.delete(timeClockEntries).where(eq(timeClockEntries.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    async getStaffByName(name) {
        const result = await db.select()
            .from(staff)
            .leftJoin(users, eq(staff.userId, users.id))
            .where(or(eq(users.firstName, name), eq(users.lastName, name), sql `${users.firstName} || ' ' || ${users.lastName} = ${name}`));
        return result[0]?.staff;
    }
    // Payroll History operations
    async createPayrollHistory(payrollData) {
        const [payroll] = await db.insert(payrollHistory)
            .values(payrollData)
            .returning();
        return payroll;
    }
    async getPayrollHistory(id) {
        const [payroll] = await db.select()
            .from(payrollHistory)
            .where(eq(payrollHistory.id, id));
        return payroll;
    }
    async getPayrollHistoryByStaff(staffId) {
        return await db.select()
            .from(payrollHistory)
            .where(eq(payrollHistory.staffId, staffId))
            .orderBy(desc(payrollHistory.periodStart));
    }
    async getPayrollHistoryByPeriod(staffId, periodStart, periodEnd) {
        const [payroll] = await db.select()
            .from(payrollHistory)
            .where(and(eq(payrollHistory.staffId, staffId), eq(payrollHistory.periodStart, periodStart), eq(payrollHistory.periodEnd, periodEnd)));
        return payroll;
    }
    async getAllPayrollHistory() {
        return await db.select()
            .from(payrollHistory)
            .orderBy(desc(payrollHistory.periodStart));
    }
    async updatePayrollHistory(id, payrollData) {
        const [updated] = await db.update(payrollHistory)
            .set({ ...payrollData, updatedAt: new Date() })
            .where(eq(payrollHistory.id, id))
            .returning();
        return updated;
    }
    async deletePayrollHistory(id) {
        const result = await db.delete(payrollHistory).where(eq(payrollHistory.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    // Sales History operations
    async createSalesHistory(salesHistoryData) {
        const [newSalesHistory] = await db.insert(salesHistory).values(salesHistoryData).returning();
        return newSalesHistory;
    }
    async getSalesHistory(id) {
        const [result] = await db.select().from(salesHistory).where(eq(salesHistory.id, id));
        return result || undefined;
    }
    async getSalesHistoryByDateRange(startDate, endDate) {
        return await db
            .select()
            .from(salesHistory)
            .where(and(gte(salesHistory.transactionDate, startDate), lte(salesHistory.transactionDate, endDate)))
            .orderBy(desc(salesHistory.transactionDate));
    }
    async getSalesHistoryByTransactionType(transactionType) {
        return await db
            .select()
            .from(salesHistory)
            .where(eq(salesHistory.transactionType, transactionType))
            .orderBy(desc(salesHistory.transactionDate));
    }
    async getSalesHistoryByClient(clientId) {
        return await db
            .select()
            .from(salesHistory)
            .where(eq(salesHistory.clientId, clientId))
            .orderBy(desc(salesHistory.transactionDate));
    }
    async getSalesHistoryByStaff(staffId) {
        return await db
            .select()
            .from(salesHistory)
            .where(eq(salesHistory.staffId, staffId))
            .orderBy(desc(salesHistory.transactionDate));
    }
    async getSalesHistoryByMonth(monthYear) {
        return await db
            .select()
            .from(salesHistory)
            .where(eq(salesHistory.monthYear, monthYear))
            .orderBy(desc(salesHistory.transactionDate));
    }
    async getAllSalesHistory() {
        return await db
            .select()
            .from(salesHistory)
            .orderBy(desc(salesHistory.transactionDate));
    }
    async updateSalesHistory(id, salesData) {
        const [updatedSalesHistory] = await db
            .update(salesHistory)
            .set({ ...salesData, updatedAt: new Date() })
            .where(eq(salesHistory.id, id))
            .returning();
        return updatedSalesHistory;
    }
    async deleteSalesHistory(id) {
        const result = await db.delete(salesHistory).where(eq(salesHistory.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    // Business Settings operations
    async getBusinessSettings() {
        const result = await db.select().from(businessSettings).limit(1);
        return result[0];
    }
    async updateBusinessSettings(businessData) {
        const existing = await this.getBusinessSettings();
        if (existing) {
            const result = await db
                .update(businessSettings)
                .set({ ...businessData, updatedAt: new Date() })
                .where(eq(businessSettings.id, existing.id))
                .returning();
            return result[0];
        }
        else {
            // Create if doesn't exist
            return await this.createBusinessSettings(businessData);
        }
    }
    async createBusinessSettings(businessData) {
        const result = await db.insert(businessSettings).values(businessData).returning();
        return result[0];
    }
    // Automation Rules operations
    async createAutomationRule(rule) {
        const result = await db.insert(automationRules).values(rule).returning();
        return result[0];
    }
    async getAutomationRule(id) {
        const result = await db.select().from(automationRules).where(eq(automationRules.id, id)).limit(1);
        return result[0];
    }
    async getAllAutomationRules() {
        return await db.select().from(automationRules).orderBy(desc(automationRules.createdAt));
    }
    async updateAutomationRule(id, ruleData) {
        const result = await db
            .update(automationRules)
            .set({ ...ruleData, updatedAt: new Date() })
            .where(eq(automationRules.id, id))
            .returning();
        return result[0];
    }
    async deleteAutomationRule(id) {
        const result = await db.delete(automationRules).where(eq(automationRules.id, id));
        return result.rowCount > 0;
    }
    async updateAutomationRuleSentCount(id, sentCount) {
        await db
            .update(automationRules)
            .set({ sentCount, lastRun: new Date(), updatedAt: new Date() })
            .where(eq(automationRules.id, id));
    }
    async updateAutomationRuleLastRun(id, lastRun) {
        await db
            .update(automationRules)
            .set({ lastRun, updatedAt: new Date() })
            .where(eq(automationRules.id, id));
    }
    // Forms operations
    async createForm(form) {
        // Convert fields array to JSON string if it exists
        const formData = {
            ...form,
            fields: form.fields ? JSON.stringify(form.fields) : null
        };
        const result = await db.insert(forms).values(formData).returning();
        return result[0];
    }
    async getForm(id) {
        const result = await db.select().from(forms).where(eq(forms.id, id)).limit(1);
        if (!result[0])
            return undefined;
        // Parse fields JSON if it exists
        const form = { ...result[0] };
        if (form.fields) {
            try {
                // Handle double-encoded JSON strings
                let fieldsData = form.fields;
                if (typeof fieldsData === 'string') {
                    // Try to parse once
                    fieldsData = JSON.parse(fieldsData);
                    // If the result is still a string, try parsing again (double-encoded)
                    if (typeof fieldsData === 'string') {
                        fieldsData = JSON.parse(fieldsData);
                    }
                }
                form.fields = fieldsData;
            }
            catch (error) {
                console.error('Error parsing form fields JSON:', error);
                console.error('Raw fields data that caused error:', form.fields);
                form.fields = []; // Return empty array on parsing error
            }
        }
        else {
            form.fields = []; // Ensure fields is always available as array
        }
        return form;
    }
    async getAllForms() {
        const results = await db.select().from(forms).orderBy(desc(forms.createdAt));
        // Parse fields from JSON string to array for each form
        return results.map(form => {
            const parsedForm = { ...form };
            if (parsedForm.fields) {
                try {
                    // Handle double-encoded JSON strings
                    let fieldsData = parsedForm.fields;
                    if (typeof fieldsData === 'string') {
                        // Try to parse once
                        fieldsData = JSON.parse(fieldsData);
                        // If the result is still a string, try parsing again (double-encoded)
                        if (typeof fieldsData === 'string') {
                            fieldsData = JSON.parse(fieldsData);
                        }
                    }
                    parsedForm.fields = fieldsData;
                }
                catch (error) {
                    console.error('Error parsing form fields JSON:', error);
                    console.error('Raw fields data that caused error:', parsedForm.fields);
                    parsedForm.fields = []; // Return empty array
                }
            }
            else {
                parsedForm.fields = []; // Ensure fields is always an array
            }
            return parsedForm;
        });
    }
    async updateForm(id, formData) {
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
                let fieldsData = form.fields;
                if (typeof fieldsData === 'string') {
                    // Try to parse once
                    fieldsData = JSON.parse(fieldsData);
                    // If the result is still a string, try parsing again (double-encoded)
                    if (typeof fieldsData === 'string') {
                        fieldsData = JSON.parse(fieldsData);
                    }
                }
                form.fields = fieldsData;
            }
            catch (error) {
                console.error('Error parsing form fields JSON:', error);
                console.error('Raw fields data that caused error:', form.fields);
                form.fields = []; // Return empty array
            }
        }
        else {
            form.fields = []; // Ensure fields is always an array
        }
        return form;
    }
    async updateFormSubmissions(id, submissions, lastSubmission) {
        const updateData = { submissions };
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
    async deleteForm(id) {
        const result = await db.delete(forms).where(eq(forms.id, id));
        return (result.rowCount ?? 0) > 0;
    }
    async saveFormSubmission(submission) {
        const submissionData = {
            formId: submission.formId,
            clientId: submission.clientId || null,
            formData: JSON.stringify(submission.formData),
            submittedAt: new Date(submission.submittedAt),
            ipAddress: submission.ipAddress,
            userAgent: submission.userAgent,
        };
        await db.insert(formSubmissions).values(submissionData);
    }
    async getFormSubmissions(formId) {
        const submissions = await db
            .select()
            .from(formSubmissions)
            .where(eq(formSubmissions.formId, formId))
            .orderBy(desc(formSubmissions.submittedAt));
        return submissions.map(submission => ({
            id: submission.id.toString(),
            formId: submission.formId,
            clientId: submission.clientId ?? null,
            formData: JSON.parse(submission.formData),
            submittedAt: submission.submittedAt.toISOString(),
            ipAddress: submission.ipAddress || undefined,
            userAgent: submission.userAgent || undefined,
        }));
    }
    async getClientFormSubmissions(clientId) {
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
    async getUnclaimedFormSubmissions() {
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
            .where(or(isNull(formSubmissions.clientId), eq(formSubmissions.clientId, 0), isNull(users.id), ne(users.role, 'client')))
            .orderBy(desc(formSubmissions.submittedAt));
        // Try to derive submitter name from common fields in the stored payload
        // We only selected metadata above for speed; load form_data for these ids in one go
        const ids = rows.map(r => r.id);
        let dataById = new Map();
        if (ids.length > 0) {
            const dataRows = await db
                .select({ id: formSubmissions.id, formData: formSubmissions.formData })
                .from(formSubmissions)
                .where(inArray(formSubmissions.id, ids));
            dataById = new Map(dataRows.map(dr => [dr.id, dr.formData]));
        }
        function extractName(rawJson) {
            if (!rawJson)
                return undefined;
            try {
                const data = JSON.parse(rawJson);
                if (typeof data !== 'object' || !data)
                    return undefined;
                const first = data.firstName || data.first_name || data.firstname || data["name_first"];
                const last = data.lastName || data.last_name || data.lastname || data["name_last"];
                const fullFromParts = `${first || ''} ${last || ''}`.trim();
                if (fullFromParts)
                    return fullFromParts;
                const single = data.fullName || data.full_name || data.name || data.clientName || data.customerName;
                if (typeof single === 'string' && single.trim())
                    return single.trim();
                // Sometimes name fields are nested under keys like field_..._first/last
                const keys = Object.keys(data);
                const firstKey = keys.find(k => /first/i.test(k));
                const lastKey = keys.find(k => /last/i.test(k));
                const maybe = `${(firstKey && data[firstKey]) || ''} ${(lastKey && data[lastKey]) || ''}`.trim();
                if (maybe)
                    return maybe;
                // As a final heuristic, scan all string values for one that looks like a personal name
                const stringVals = Object.values(data).filter(v => typeof v === 'string');
                const looksLikeName = (val) => {
                    const t = val.trim();
                    if (!t)
                        return false;
                    if (t.length < 2 || t.length > 60)
                        return false;
                    if (/^https?:/i.test(t))
                        return false;
                    if (t.startsWith('data:'))
                        return false;
                    if (/@/.test(t))
                        return false; // likely email
                    if (/\.(pdf|png|jpg|jpeg|webp|gif|svg)$/i.test(t))
                        return false; // likely file
                    // allow letters and spaces, a single hyphen or apostrophe common in names
                    if (!/^[a-zA-Z\s'\-]+$/.test(t))
                        return false;
                    // prefer values with at least one space (first last)
                    return /\s/.test(t);
                };
                const candidate = stringVals.find(looksLikeName) || stringVals.find(s => /^[a-zA-Z]+$/.test(s.trim()));
                return candidate?.trim() || undefined;
            }
            catch {
                return undefined;
            }
        }
        return rows.map(r => {
            const raw = dataById.get(r.id);
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
    async attachFormSubmissionToClient(submissionId, clientId) {
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
    async getBusinessKnowledge(categories) {
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
        }
        catch (error) {
            console.error('Error fetching business knowledge:', error);
            return [];
        }
    }
    async createBusinessKnowledge(knowledge) {
        try {
            const [newKnowledge] = await db.insert(businessKnowledge).values(knowledge).returning();
            return newKnowledge;
        }
        catch (error) {
            console.error('Error creating business knowledge:', error);
            throw error;
        }
    }
    async updateBusinessKnowledge(id, updates) {
        try {
            const [updatedKnowledge] = await db
                .update(businessKnowledge)
                .set({ ...updates, updatedAt: new Date() })
                .where(eq(businessKnowledge.id, id))
                .returning();
            return updatedKnowledge;
        }
        catch (error) {
            console.error('Error updating business knowledge:', error);
            throw error;
        }
    }
    async deleteBusinessKnowledge(id) {
        try {
            await db.delete(businessKnowledge).where(eq(businessKnowledge.id, id));
        }
        catch (error) {
            console.error('Error deleting business knowledge:', error);
            throw error;
        }
    }
    // Business Knowledge Categories methods
    async getBusinessKnowledgeCategories() {
        try {
            const categories = await db.select().from(businessKnowledgeCategories).orderBy(asc(businessKnowledgeCategories.name));
            // Get entry count for each category
            const categoriesWithCounts = await Promise.all(categories.map(async (category) => {
                const entryCount = await db
                    .select({ count: count() })
                    .from(businessKnowledge)
                    .where(eq(businessKnowledge.category, category.name));
                return {
                    ...category,
                    entryCount: entryCount[0]?.count || 0
                };
            }));
            return categoriesWithCounts;
        }
        catch (error) {
            console.error('Error fetching business knowledge categories:', error);
            return [];
        }
    }
    async createBusinessKnowledgeCategory(category) {
        try {
            const [newCategory] = await db.insert(businessKnowledgeCategories).values(category).returning();
            return newCategory;
        }
        catch (error) {
            console.error('Error creating business knowledge category:', error);
            throw error;
        }
    }
    async updateBusinessKnowledgeCategory(id, updates) {
        try {
            const [updatedCategory] = await db
                .update(businessKnowledgeCategories)
                .set({ ...updates, updatedAt: new Date() })
                .where(eq(businessKnowledgeCategories.id, id))
                .returning();
            return updatedCategory;
        }
        catch (error) {
            console.error('Error updating business knowledge category:', error);
            throw error;
        }
    }
    async deleteBusinessKnowledgeCategory(id) {
        try {
            await db.delete(businessKnowledgeCategories).where(eq(businessKnowledgeCategories.id, id));
        }
        catch (error) {
            console.error('Error deleting business knowledge category:', error);
            throw error;
        }
    }
    // LLM Conversation methods
    async createLLMConversation(conversation) {
        try {
            const [newConversation] = await db.insert(llmConversations).values(conversation).returning();
            return newConversation;
        }
        catch (error) {
            console.error('Error creating LLM conversation:', error);
            throw error;
        }
    }
    async getLLMConversations(clientId) {
        try {
            let conditions = [];
            if (clientId) {
                conditions.push(eq(llmConversations.clientId, clientId));
            }
            const conversations = await db
                .select()
                .from(llmConversations)
                .where(conditions.length > 0 ? and(...conditions) : undefined)
                .orderBy(desc(llmConversations.createdAt));
            return conversations;
        }
        catch (error) {
            console.error('Error fetching LLM conversations:', error);
            return [];
        }
    }
    // Check Software Providers methods
    async getCheckSoftwareProviders() {
        try {
            const providers = await db.select().from(checkSoftwareProviders).orderBy(asc(checkSoftwareProviders.name));
            return providers;
        }
        catch (error) {
            console.error('Error fetching check software providers:', error);
            return [];
        }
    }
    async getCheckSoftwareProvider(id) {
        try {
            const [provider] = await db.select().from(checkSoftwareProviders).where(eq(checkSoftwareProviders.id, id));
            return provider;
        }
        catch (error) {
            console.error('Error fetching check software provider:', error);
            return undefined;
        }
    }
    async createCheckSoftwareProvider(provider) {
        try {
            const [newProvider] = await db.insert(checkSoftwareProviders).values(provider).returning();
            return newProvider;
        }
        catch (error) {
            console.error('Error creating check software provider:', error);
            throw error;
        }
    }
    async updateCheckSoftwareProvider(id, updates) {
        try {
            const [updatedProvider] = await db
                .update(checkSoftwareProviders)
                .set({ ...updates, updatedAt: new Date() })
                .where(eq(checkSoftwareProviders.id, id))
                .returning();
            return updatedProvider;
        }
        catch (error) {
            console.error('Error updating check software provider:', error);
            throw error;
        }
    }
    async deleteCheckSoftwareProvider(id) {
        try {
            await db.delete(checkSoftwareProviders).where(eq(checkSoftwareProviders.id, id));
            return true;
        }
        catch (error) {
            console.error('Error deleting check software provider:', error);
            return false;
        }
    }
    // Payroll Checks methods
    async getPayrollChecks(staffId, status) {
        try {
            let conditions = [];
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
        }
        catch (error) {
            console.error('Error fetching payroll checks:', error);
            return [];
        }
    }
    async getPayrollCheck(id) {
        try {
            const [check] = await db.select().from(payrollChecks).where(eq(payrollChecks.id, id));
            return check;
        }
        catch (error) {
            console.error('Error fetching payroll check:', error);
            return undefined;
        }
    }
    async createPayrollCheck(check) {
        try {
            const [newCheck] = await db.insert(payrollChecks).values(check).returning();
            return newCheck;
        }
        catch (error) {
            console.error('Error creating payroll check:', error);
            throw error;
        }
    }
    async updatePayrollCheck(id, updates) {
        try {
            const [updatedCheck] = await db
                .update(payrollChecks)
                .set({ ...updates, updatedAt: new Date() })
                .where(eq(payrollChecks.id, id))
                .returning();
            return updatedCheck;
        }
        catch (error) {
            console.error('Error updating payroll check:', error);
            throw error;
        }
    }
    async deletePayrollCheck(id) {
        try {
            await db.delete(payrollChecks).where(eq(payrollChecks.id, id));
            return true;
        }
        catch (error) {
            console.error('Error deleting payroll check:', error);
            return false;
        }
    }
    // Check Software Logs methods
    async getCheckSoftwareLogs(providerId, action) {
        try {
            let conditions = [];
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
        }
        catch (error) {
            console.error('Error fetching check software logs:', error);
            return [];
        }
    }
    async createCheckSoftwareLog(log) {
        try {
            const [newLog] = await db.insert(checkSoftwareLogs).values(log).returning();
            return newLog;
        }
        catch (error) {
            console.error('Error creating check software log:', error);
            throw error;
        }
    }
    // System Configuration methods
    async getSystemConfig(key) {
        try {
            const [result] = await db.select().from(systemConfig).where(eq(systemConfig.key, key));
            return result;
        }
        catch (error) {
            console.error('Error getting system config:', error);
            throw error;
        }
    }
    async getAllSystemConfig(category) {
        try {
            // Note: category field doesn't exist in the current schema, so we ignore category filtering
            const results = await db.select().from(systemConfig);
            return results;
        }
        catch (error) {
            console.error('Error getting all system config:', error);
            throw error;
        }
    }
    async setSystemConfig(config) {
        try {
            const [result] = await db.insert(systemConfig).values(config).returning();
            return result;
        }
        catch (error) {
            console.error('Error setting system config:', error);
            throw error;
        }
    }
    async updateSystemConfig(key, value, description) {
        try {
            const updateData = {
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
        }
        catch (error) {
            console.error('Error updating system config:', error);
            throw error;
        }
    }
    async deleteSystemConfig(key) {
        try {
            const result = await db.delete(systemConfig).where(eq(systemConfig.key, key));
            return result.rowCount > 0;
        }
        catch (error) {
            console.error('Error deleting system config:', error);
            throw error;
        }
    }
    async getSystemConfigByCategory(category) {
        try {
            const results = await db.select().from(systemConfig).where(eq(systemConfig.category, category));
            return results;
        }
        catch (error) {
            console.error('Error getting system config by category:', error);
            throw error;
        }
    }
    // AI Messaging Configuration methods
    async getAiMessagingConfig() {
        try {
            const result = await db.select().from(aiMessagingConfig).limit(1);
            return result[0];
        }
        catch (error) {
            console.error('Error getting AI messaging config:', error);
            throw error;
        }
    }
    async createAiMessagingConfig(config) {
        try {
            const result = await db.insert(aiMessagingConfig).values(config).returning();
            return result[0];
        }
        catch (error) {
            console.error('Error creating AI messaging config:', error);
            throw error;
        }
    }
    async updateAiMessagingConfig(id, config) {
        try {
            const result = await db
                .update(aiMessagingConfig)
                .set({ ...config, updatedAt: new Date() })
                .where(eq(aiMessagingConfig.id, id))
                .returning();
            return result[0];
        }
        catch (error) {
            console.error('Error updating AI messaging config:', error);
            throw error;
        }
    }
    async deleteAiMessagingConfig(id) {
        try {
            const result = await db.delete(aiMessagingConfig).where(eq(aiMessagingConfig.id, id));
            return result.rowCount > 0;
        }
        catch (error) {
            console.error('Error deleting AI messaging config:', error);
            throw error;
        }
    }
    // Conversation Flow methods
    async getConversationFlows() {
        try {
            const flows = await db.select().from(conversationFlows).orderBy(desc(conversationFlows.createdAt));
            // Parse the steps JSON for each flow
            return flows.map(flow => ({
                ...flow,
                steps: flow.steps ? JSON.parse(flow.steps) : []
            }));
        }
        catch (error) {
            console.error('Error getting conversation flows:', error);
            throw error;
        }
    }
    async getConversationFlow(id) {
        try {
            const result = await db.select().from(conversationFlows).where(eq(conversationFlows.id, id)).limit(1);
            if (!result[0])
                return undefined;
            const flow = result[0];
            return {
                ...flow,
                steps: flow.steps ? JSON.parse(flow.steps) : []
            };
        }
        catch (error) {
            console.error('Error getting conversation flow:', error);
            throw error;
        }
    }
    async saveConversationFlow(flow) {
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
        }
        catch (error) {
            console.error('Error saving conversation flow:', error);
            throw error;
        }
    }
    async updateConversationFlow(flow) {
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
        }
        catch (error) {
            console.error('Error updating conversation flow:', error);
            throw error;
        }
    }
    async deleteConversationFlow(id) {
        try {
            const result = await db.delete(conversationFlows).where(eq(conversationFlows.id, id));
            return result.rowCount > 0;
        }
        catch (error) {
            console.error('Error deleting conversation flow:', error);
            throw error;
        }
    }
    // Note Template operations
    async createNoteTemplate(template) {
        const [newTemplate] = await db.insert(noteTemplates).values(template).returning();
        return newTemplate;
    }
    async getNoteTemplate(id) {
        const [template] = await db.select().from(noteTemplates).where(eq(noteTemplates.id, id));
        return template;
    }
    async getAllNoteTemplates() {
        return await db.select().from(noteTemplates);
    }
    async getNoteTemplatesByCategory(category) {
        return await db.select().from(noteTemplates).where(eq(noteTemplates.category, category));
    }
    async getActiveNoteTemplates() {
        return await db.select().from(noteTemplates).where(eq(noteTemplates.isActive, true));
    }
    async updateNoteTemplate(id, templateData) {
        const [updatedTemplate] = await db
            .update(noteTemplates)
            .set({ ...templateData, updatedAt: new Date() })
            .where(eq(noteTemplates.id, id))
            .returning();
        return updatedTemplate;
    }
    async deleteNoteTemplate(id) {
        const result = await db.delete(noteTemplates).where(eq(noteTemplates.id, id));
        return result.rowCount > 0;
    }
    // Note History operations
    async createNoteHistory(history) {
        const [newHistory] = await db.insert(noteHistory).values(history).returning();
        return newHistory;
    }
    async getNoteHistoryByClient(clientId) {
        return await db.select().from(noteHistory).where(eq(noteHistory.clientId, clientId)).orderBy(desc(noteHistory.createdAt));
    }
    async getNoteHistoryByAppointment(appointmentId) {
        return await db.select().from(noteHistory).where(eq(noteHistory.appointmentId, appointmentId)).orderBy(desc(noteHistory.createdAt));
    }
    async getAllNoteHistory() {
        return await db.select().from(noteHistory).orderBy(desc(noteHistory.createdAt));
    }
    async updateNoteHistory(id, historyData) {
        const [updatedHistory] = await db
            .update(noteHistory)
            .set(historyData)
            .where(eq(noteHistory.id, id))
            .returning();
        return updatedHistory;
    }
    async deleteNoteHistory(id) {
        const result = await db.delete(noteHistory).where(eq(noteHistory.id, id));
        return result.rowCount > 0;
    }
    // Permission operations
    async createPermission(permission) {
        const [created] = await db.insert(permissions).values(permission).returning();
        return created;
    }
    async getPermission(id) {
        const [row] = await db.select().from(permissions).where(eq(permissions.id, id));
        return row;
    }
    async getPermissionByName(name) {
        const [row] = await db.select().from(permissions).where(eq(permissions.name, name));
        return row;
    }
    async getAllPermissions() {
        try {
            const result = await db.select().from(permissions).where(eq(permissions.isActive, true));
            return result;
        }
        catch (error) {
            console.error('Error getting all permissions:', error);
            return [];
        }
    }
    async getPermissionsByCategory(category) {
        const result = await db.select().from(permissions).where(eq(permissions.category, category));
        return result;
    }
    async updatePermission(id, permissionData) {
        const [updated] = await db.update(permissions).set(permissionData).where(eq(permissions.id, id)).returning();
        return updated;
    }
    async deletePermission(id) {
        const result = await db.delete(permissions).where(eq(permissions.id, id));
        return result.rowCount > 0;
    }
    // Permission Group operations
    async createPermissionGroup(group) {
        const [created] = await db.insert(permissionGroups).values(group).returning();
        return created;
    }
    async getPermissionGroup(id) {
        const [row] = await db.select().from(permissionGroups).where(eq(permissionGroups.id, id));
        return row;
    }
    async getPermissionGroupByName(name) {
        const [row] = await db.select().from(permissionGroups).where(eq(permissionGroups.name, name));
        return row;
    }
    async getAllPermissionGroups() {
        try {
            const result = await db.select().from(permissionGroups).where(eq(permissionGroups.isActive, true));
            return result;
        }
        catch (error) {
            console.error('Error getting all permission groups:', error);
            return [];
        }
    }
    async updatePermissionGroup(id, groupData) {
        const [updated] = await db.update(permissionGroups).set(groupData).where(eq(permissionGroups.id, id)).returning();
        return updated;
    }
    async deletePermissionGroup(id) {
        const result = await db.delete(permissionGroups).where(eq(permissionGroups.id, id));
        return result.rowCount > 0;
    }
    async assignPermissionsToGroup(groupId, permissionIds) {
        if (!permissionIds || permissionIds.length === 0)
            return;
        await db.insert(permissionGroupMappings).values(permissionIds.map(pid => ({ groupId, permissionId: pid }))).onConflictDoNothing();
    }
    async removePermissionsFromGroup(groupId, permissionIds) {
        if (!permissionIds || permissionIds.length === 0)
            return;
        await db.delete(permissionGroupMappings)
            .where(and(eq(permissionGroupMappings.groupId, groupId), inArray(permissionGroupMappings.permissionId, permissionIds)));
    }
    async getPermissionGroupMappings(groupId) {
        const rows = await db.select().from(permissionGroupMappings).where(eq(permissionGroupMappings.groupId, groupId));
        return rows;
    }
    async createPermissionGroupMapping(mapping) {
        const [created] = await db.insert(permissionGroupMappings).values(mapping).onConflictDoNothing().returning();
        return created ?? (await db.select().from(permissionGroupMappings).where(and(eq(permissionGroupMappings.groupId, mapping.groupId), eq(permissionGroupMappings.permissionId, mapping.permissionId))))[0];
    }
    async deletePermissionGroupMappings(groupId) {
        await db.delete(permissionGroupMappings).where(eq(permissionGroupMappings.groupId, groupId));
    }
    // User Permission operations
    async assignPermissionGroupToUser(userId, groupId) {
        await db.insert(userPermissionGroups).values({ userId, groupId }).onConflictDoNothing();
    }
    async removePermissionGroupFromUser(userId, groupId) {
        await db.delete(userPermissionGroups).where(and(eq(userPermissionGroups.userId, userId), eq(userPermissionGroups.groupId, groupId)));
    }
    async getUserPermissionGroups(userId) {
        try {
            const result = await db.select().from(userPermissionGroups).where(eq(userPermissionGroups.userId, userId));
            return result;
        }
        catch (error) {
            console.error('Error getting user permission groups:', error);
            return [];
        }
    }
    async getUserPermissionGroup(userId, groupId) {
        const [row] = await db.select().from(userPermissionGroups).where(and(eq(userPermissionGroups.userId, userId), eq(userPermissionGroups.groupId, groupId)));
        return row ?? null;
    }
    async createUserPermissionGroup(data) {
        const [created] = await db.insert(userPermissionGroups).values(data).onConflictDoNothing().returning();
        return created ?? (await db.select().from(userPermissionGroups).where(and(eq(userPermissionGroups.userId, data.userId), eq(userPermissionGroups.groupId, data.groupId))))[0];
    }
    async deleteUserPermissionGroup(id) {
        await db.delete(userPermissionGroups).where(eq(userPermissionGroups.id, id));
    }
    async grantDirectPermission(userId, permissionId) {
        // For now, just log since we need to implement the actual table structure
        console.log('Granting direct permission to user:', userId, permissionId);
    }
    async denyDirectPermission(userId, permissionId) {
        // For now, just log since we need to implement the actual table structure
        console.log('Denying direct permission to user:', userId, permissionId);
    }
    async removeDirectPermission(userId, permissionId) {
        // For now, just log since we need to implement the actual table structure
        console.log('Removing direct permission from user:', userId, permissionId);
    }
    async getUserDirectPermissions(userId) {
        const rows = await db.select().from(userDirectPermissions).where(eq(userDirectPermissions.userId, userId));
        return rows;
    }
    async getUserDirectPermission(userId, permissionId) {
        const [row] = await db.select().from(userDirectPermissions).where(and(eq(userDirectPermissions.userId, userId), eq(userDirectPermissions.permissionId, permissionId)));
        return row ?? null;
    }
    async createUserDirectPermission(data) {
        const [created] = await db.insert(userDirectPermissions).values(data).onConflictDoNothing().returning();
        return created ?? (await db.select().from(userDirectPermissions).where(and(eq(userDirectPermissions.userId, data.userId), eq(userDirectPermissions.permissionId, data.permissionId))))[0];
    }
    async updateUserDirectPermission(id, data) {
        const [updated] = await db.update(userDirectPermissions).set(data).where(eq(userDirectPermissions.id, id)).returning();
        return updated;
    }
    async deleteUserDirectPermission(id) {
        await db.delete(userDirectPermissions).where(eq(userDirectPermissions.id, id));
    }
    // Email Templates stored in system_config (category 'email_templates')
    async createEmailTemplate(template) {
        const id = `tmpl_${Date.now()}`;
        const record = {
            id,
            name: template.name,
            subject: template.subject || null,
            htmlContent: template.htmlContent,
            variables: template.variables ?? [],
            createdAt: new Date().toISOString(),
        };
        await this.setSystemConfig({
            key: `email_template:${id}`,
            value: JSON.stringify(record),
            description: `Email template: ${template.name}`,
            category: 'email_templates',
            isEncrypted: false,
            isActive: true,
        });
        return record;
    }
    async getEmailTemplates() {
        const rows = await db.select().from(systemConfig).where(eq(systemConfig.category, 'email_templates'));
        const templates = [];
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
                        createdAt: parsed.createdAt || row.createdAt?.toISOString?.() || new Date().toISOString(),
                    });
                }
            }
            catch {
                // ignore malformed entries
            }
        }
        templates.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        return templates;
    }
    // AI Messaging Configuration
    async getAIMessagingConfig() {
        try {
            const result = await db.select().from(aiMessagingConfig).limit(1);
            return result[0];
        }
        catch (error) {
            console.error('Error getting AI messaging config:', error);
            throw error;
        }
    }
    async setAIMessagingConfig(config) {
        try {
            const result = await db
                .update(aiMessagingConfig)
                .set({ ...config, updatedAt: new Date() })
                .where(eq(aiMessagingConfig.id, 1))
                .returning();
            return result[0];
        }
        catch (error) {
            console.error('Error setting AI messaging config:', error);
            throw error;
        }
    }
    async updateAIMessagingStats(stats) {
        try {
            const result = await db
                .update(aiMessagingConfig)
                .set({ ...stats, updatedAt: new Date() })
                .where(eq(aiMessagingConfig.id, 1))
                .returning();
            return result[0];
        }
        catch (error) {
            console.error('Error updating AI messaging stats:', error);
            throw error;
        }
    }
}
export { DatabaseStorage as PgStorage };
