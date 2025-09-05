import { createServer } from "http";
import { z } from "zod";
import { LLMService } from "./llm-service.js";
import { SMSAutoRespondService } from "./sms-auto-respond-service.js";
import { AutoRespondService } from "./auto-respond-service.js";
// speakeasy and qrcode are optional; remove imports if not used in this module
import { insertRoomSchema, insertStaffSchema, insertStaffServiceSchema, insertStaffScheduleSchema, } from "../shared/schema.js";
// Import route registration functions
// Route modules are loaded dynamically in registerRoutes to avoid hard runtime
// dependencies on files that may not be emitted in production builds.
import createTerminalRoutes from "./routes/terminal-routes.js";
import createHelcimWebhookRoutes from "./routes/helcim-webhooks.js";
// Import helcim payments router dynamically to avoid missing compiled file failures
import { CheckSoftwareService } from "./check-software-service.js";
import { registerExternalRoutes } from "./external-api.js";
// Statically import route registration functions so TypeScript can resolve them during build
import { registerAuthRoutes } from "./routes/auth.js";
import { registerUserRoutes } from "./routes/users.js";
import { registerAppointmentRoutes } from "./routes/appointments.js";
import { registerAppointmentPhotoRoutes } from "./routes/appointment-photos.js";
import { registerServiceRoutes } from "./routes/services.js";
import { registerProductRoutes } from "./routes/products.js";
import { registerLocationRoutes } from "./routes/locations.js";
import { registerPermissionRoutes } from "./routes/permissions.js";
import { registerBusinessSettingsRoutes } from "./routes/business-settings.js";
import { registerNotificationRoutes } from "./routes/notifications.js";
import { registerPaymentRoutes } from "./routes/payments.js";
import { registerMarketingRoutes } from "./routes/marketing.js";
import { registerFormsRoutes } from "./routes/forms.js";
import { registerDocumentsRoutes } from "./routes/documents.js";
import { registerBusinessKnowledgeRoutes } from "./routes/business-knowledge.js";
import { registerLLMRoutes } from "./routes/llm.js";
import { registerSmsAutoRespondRoutes } from "./routes/sms-auto-respond.js";
import { registerAutomationRuleRoutes } from "./routes/automation-rules.js";
import { registerMembershipRoutes } from "./routes/memberships.js";
import { registerNoteTemplateRoutes } from "./routes/note-templates.js";
import { registerNoteHistoryRoutes } from "./routes/note-history.js";
import { registerReportRoutes } from "./routes/reports.js";
import { registerBookingDesignRoutes } from "./routes/booking-design.js";
// Custom schema for staff service with custom rates
const staffServiceWithRatesSchema = insertStaffServiceSchema.extend({
    customRate: z.number().nullable().optional(),
    customCommissionRate: z.number().nullable().optional(),
});
// Helcim is now the primary payment processor
export async function registerRoutes(app, storage, autoRenewalService) {
    if (!app || !storage) {
        throw new Error('App and storage are required');
    }
    // Create HTTP server
    const server = createServer(app);
    // Initialize LLM Service
    const llmService = new LLMService(storage);
    // Initialize SMS Auto-Respond Service
    const smsAutoRespondService = SMSAutoRespondService.getInstance(storage);
    // Initialize Email Auto-Respond Service
    const autoRespondService = new AutoRespondService(storage);
    // Initialize Check Software Service (for payroll checks)
    const checkSoftwareService = new CheckSoftwareService(storage);
    // Register all route modules
    registerAuthRoutes(app, storage);
    registerUserRoutes(app, storage);
    registerAppointmentRoutes(app, storage);
    // Register appointment photos routes (used by AppointmentPhotos component)
    registerAppointmentPhotoRoutes(app, storage);
    registerServiceRoutes(app, storage);
    registerProductRoutes(app, storage);
    registerLocationRoutes(app, storage);
    registerPermissionRoutes(app);
    registerBusinessSettingsRoutes(app, storage);
    registerNotificationRoutes(app, storage);
    registerPaymentRoutes(app, storage);
    registerMarketingRoutes(app, storage);
    registerFormsRoutes(app, storage);
    registerDocumentsRoutes(app, storage);
    registerBusinessKnowledgeRoutes(app, storage);
    registerLLMRoutes(app, storage);
    registerSmsAutoRespondRoutes(app, storage);
    // Automations
    registerAutomationRuleRoutes(app, storage);
    // Memberships
    registerMembershipRoutes(app, storage);
    // Notes
    registerNoteTemplateRoutes(app, storage);
    registerNoteHistoryRoutes(app, storage);
    registerReportRoutes(app, storage);
    // Booking design routes
    registerBookingDesignRoutes(app, storage);
    // Register external API routes (health, services, staff availability, webhook)
    registerExternalRoutes(app, storage);
    // Register terminal routes
    app.use('/api/terminal', createTerminalRoutes(storage));
    // Helcim admin-level webhooks (aliases) -> reuse terminal webhook handler
    app.use('/api/helcim', createHelcimWebhookRoutes(storage));
    // Legacy alias used by some Helcim configurations
    app.use('/api/helcim-smart-terminal', createHelcimWebhookRoutes(storage));
    // Enable helcim payment routes; load dynamically to avoid missing compiled file in some builds
    try {
        const helcimModule = await import('./routes/payments/helcim.js');
        const helcimPaymentsRouter = helcimModule?.default || helcimModule;
        app.use('/api/payments/helcim', helcimPaymentsRouter);
    }
    catch (e) {
        console.warn('Helcim payments routes not available:', e?.message || e);
    }
    // Staff routes
    app.get("/api/staff", async (req, res) => {
        try {
            const staff = await storage.getAllStaff();
            // Optional filter by locationId
            const locationIdParam = req.query.locationId;
            const filteredByLocation = locationIdParam
                ? staff.filter((s) => String(s.locationId) === String(parseInt(locationIdParam)))
                : staff;
            // Enrich staff with linked user info so the client can access email/phone
            let users = [];
            try {
                users = await storage.getAllUsers();
            }
            catch (e) {
                users = [];
            }
            const usersById = new Map(users.map((u) => [u.id, u]));
            const enriched = filteredByLocation.map((s) => {
                const u = usersById.get(s.userId);
                return {
                    ...s,
                    user: u
                        ? {
                            id: u.id,
                            username: u.username,
                            firstName: u.firstName,
                            lastName: u.lastName,
                            email: u.email,
                            phone: u.phone,
                        }
                        : undefined,
                };
            });
            res.json(enriched);
        }
        catch (error) {
            console.error("Error getting staff:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to get staff"
            });
        }
    });
    // Sales history - used by Reports (fallback simple endpoint)
    app.get("/api/sales-history", async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                const list = await storage.getSalesHistoryByDateRange(start, end);
                return res.json(list);
            }
            const list = await storage.getAllSalesHistory();
            return res.json(list);
        }
        catch (error) {
            console.error("Error getting sales history:", error);
            return res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to get sales history",
            });
        }
    });
    // Get a single staff member by id (needed by appointment details)
    app.get("/api/staff/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (Number.isNaN(id)) {
                return res.status(400).json({ error: "Invalid staff id" });
            }
            let staffMember = await storage.getStaff(id);
            // Fallback: some data paths may pass userId instead of staff.id
            if (!staffMember && storage.getStaffByUserId) {
                staffMember = await storage.getStaffByUserId(id);
            }
            // Final fallback: search from list
            if (!staffMember && storage.getAllStaff) {
                const list = await storage.getAllStaff();
                staffMember = list.find((s) => s?.id === id);
            }
            if (!staffMember) {
                return res.status(404).json({ error: "Staff member not found" });
            }
            res.json(staffMember);
        }
        catch (error) {
            console.error("Error getting staff member:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to get staff member",
            });
        }
    });
    // Return services assigned to a specific staff member (detailed service objects)
    app.get("/api/staff/:staffId/services", async (req, res) => {
        try {
            const staffId = parseInt(req.params.staffId);
            if (Number.isNaN(staffId)) {
                return res.status(400).json({ error: "Invalid staffId" });
            }
            // Get assignments
            const assignments = await storage.getStaffServices(staffId);
            // Map to full service objects and include assignment metadata
            const isPublic = String(req.query?.public) === 'true';
            const services = (await Promise.all(assignments.map(async (assignment) => {
                const service = await storage.getService(assignment.serviceId);
                if (!service)
                    return null;
                return {
                    ...service,
                    staffServiceId: assignment.id,
                    staffId: assignment.staffId,
                    customRate: assignment.customRate ?? null,
                    customCommissionRate: assignment.customCommissionRate ?? null,
                };
            }))).filter(Boolean);
            const filtered = isPublic
                ? services.filter((s) => !s.isHidden && (s.isActive !== false))
                : services;
            return res.json(filtered);
        }
        catch (error) {
            console.error("Error getting services for staff:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to get services for staff",
            });
        }
    });
    app.get("/api/rooms", async (req, res) => {
        try {
            const rooms = await storage.getAllRooms();
            // Optionally enrich with location name for UI display
            let locationsList = [];
            try {
                locationsList = await storage.getAllLocations?.();
            }
            catch { }
            const locById = new Map((locationsList || []).map((l) => [l.id, l]));
            const enriched = (rooms || []).map((r) => ({
                ...r,
                location: locById.get(r.locationId) || undefined,
                locationName: locById.get(r.locationId)?.name,
            }));
            res.json(enriched);
        }
        catch (error) {
            console.error("Error getting rooms:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to get rooms"
            });
        }
    });
    // Create a room
    app.post("/api/rooms", async (req, res) => {
        try {
            // Ensure minimal columns exist (runtime safe for older DBs)
            try {
                const { db } = await import("../db.js");
                const { sql } = await import("drizzle-orm");
                await db.execute(sql`CREATE TABLE IF NOT EXISTS rooms (id SERIAL PRIMARY KEY, name TEXT NOT NULL)`);
                await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description TEXT`);
                await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 1`);
                await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`);
                await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS location_id INTEGER`);
            }
            catch { }
            let payload;
            try {
                payload = insertRoomSchema.parse(req.body);
            }
            catch (e) {
                // Fallback: sanitize input without optional columns
                const body = req.body || {};
                const name = typeof body.name === 'string' ? body.name.trim() : '';
                if (!name)
                    throw e;
                payload = { name };
            }
            let created;
            try {
                created = await storage.createRoom(payload);
            }
            catch (e) {
                const msg = String(e?.message || e || "");
                if (/does\s+not\s+exist/i.test(msg)) {
                    try {
                        const { db } = await import("../db.js");
                        const { sql } = await import("drizzle-orm");
                        const inserted = await db.execute(sql`INSERT INTO rooms (name) VALUES (${payload.name}) RETURNING id, name`);
                        created = (inserted?.rows ?? inserted)[0];
                        // Best-effort: set optional fields if columns exist
                        try { await db.execute(sql`UPDATE rooms SET is_active = TRUE WHERE id = ${Number(created?.id)}`); }
                        catch { }
                        if (req.body?.locationId) {
                            try { await db.execute(sql`UPDATE rooms SET location_id = ${Number(req.body.locationId)} WHERE id = ${Number(created?.id)}`); }
                            catch { }
                        }
                    }
                    catch {
                        throw e;
                    }
                }
                else {
                    throw e;
                }
            }
            res.status(201).json(created);
        }
        catch (error) {
            console.error("Error creating room:", error);
            res.status(400).json({
                error: error instanceof Error ? error.message : "Failed to create room",
            });
        }
    });
    // Update a room
    app.patch("/api/rooms/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (Number.isNaN(id)) {
                return res.status(400).json({ error: "Invalid room id" });
            }
            // Validate partial update
            const updateData = insertRoomSchema.partial().parse(req.body);
            const existing = await storage.getRoom(id);
            if (!existing) {
                return res.status(404).json({ error: "Room not found" });
            }
            const updated = await storage.updateRoom(id, updateData);
            res.json(updated);
        }
        catch (error) {
            console.error("Error updating room:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to update room",
            });
        }
    });
    // Delete a room (idempotent: returns 200 even if already deleted)
    app.delete("/api/rooms/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (Number.isNaN(id)) {
                return res.status(400).json({ error: "Invalid room id" });
            }
            const ok = await storage.deleteRoom(id);
            // Always return 200 to avoid client errors on already-deleted items
            res.json({ success: !!ok });
        }
        catch (error) {
            console.error("Error deleting room:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to delete room",
            });
        }
    });
    app.get("/api/devices", async (req, res) => {
        try {
            const devices = await storage.getAllDevices();
            res.json(devices);
        }
        catch (error) {
            console.error("Error getting devices:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to get devices"
            });
        }
    });
    app.post("/api/staff", async (req, res) => {
        try {
            const staffData = req.body;
            // Validate the staff data using the schema
            const validatedData = insertStaffSchema.parse({
                userId: staffData.userId,
                title: staffData.title,
                bio: staffData.bio ?? null,
                locationId: staffData.locationId ?? null,
                commissionType: staffData.commissionType,
                commissionRate: staffData.commissionRate ?? null,
                hourlyRate: staffData.hourlyRate ?? null,
                fixedRate: staffData.fixedRate ?? null,
                // Intentionally omit photoUrl to avoid failing on DBs without this column
            });
            // Create the staff record
            const staff = await storage.createStaff(validatedData);
            res.status(201).json(staff);
        }
        catch (error) {
            console.error("Error creating staff:", error);
            res.status(400).json({
                error: error instanceof Error ? error.message : "Failed to create staff member"
            });
        }
    });
    // Update a staff member
    app.patch("/api/staff/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (Number.isNaN(id)) {
                return res.status(400).json({ error: "Invalid staff id" });
            }
            const existing = await storage.getStaff(id);
            if (!existing) {
                return res.status(404).json({ error: "Staff member not found" });
            }
            // Accept both snake_case and camelCase from client
            const body = req.body || {};
            const updateData = {};
            if (body.title !== undefined)
                updateData.title = body.title;
            if (body.bio !== undefined)
                updateData.bio = body.bio;
            if (body.locationId !== undefined)
                updateData.locationId = body.locationId;
            if (body.commission_type !== undefined || body.commissionType !== undefined) {
                updateData.commissionType = body.commission_type ?? body.commissionType;
            }
            if (body.commission_rate !== undefined || body.commissionRate !== undefined) {
                updateData.commissionRate = body.commission_rate ?? body.commissionRate;
            }
            if (body.hourly_rate !== undefined || body.hourlyRate !== undefined) {
                updateData.hourlyRate = body.hourly_rate ?? body.hourlyRate;
            }
            if (body.fixed_rate !== undefined || body.fixedRate !== undefined) {
                updateData.fixedRate = body.fixed_rate ?? body.fixedRate;
            }
            if (body.is_active !== undefined || body.isActive !== undefined) {
                updateData.isActive = body.is_active ?? body.isActive;
            }
            // Omit photoUrl to avoid touching a column that may not exist in some deployments
            const updated = await storage.updateStaff(id, updateData);
            res.json(updated);
        }
        catch (error) {
            console.error("Error updating staff:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to update staff"
            });
        }
    });
    // Delete a staff member (appointments remain intact)
    app.delete("/api/staff/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            if (Number.isNaN(id)) {
                return res.status(400).json({ error: "Invalid staff id" });
            }
            const existing = await storage.getStaff(id);
            if (!existing) {
                return res.status(404).json({ error: "Staff member not found" });
            }
            // Try a hard delete first; leave appointments intact.
            const ok = await storage.deleteStaff(id);
            if (ok) {
                return res.json({ success: true, deleted: true });
            }
            // If hard delete fails due to related records, perform a soft delete instead
            try {
                const updated = await storage.updateStaff(id, { isActive: false });
                return res.json({ success: true, deleted: false, deactivated: true, staffId: updated.id });
            }
            catch (e) {
                return res.status(500).json({ error: "Failed to delete staff member" });
            }
        }
        catch (error) {
            console.error("Error deleting staff member:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to delete staff member",
            });
        }
    });
    // Staff-services assignments
    app.get("/api/staff-services", async (req, res) => {
        try {
            const staffIdParam = req.query.staffId;
            if (staffIdParam) {
                const staffId = parseInt(staffIdParam);
                const list = await storage.getStaffServices(staffId);
                return res.json(list);
            }
            const list = await storage.getAllStaffServices();
            return res.json(list);
        }
        catch (error) {
            console.error("Error getting staff services:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to get staff services",
            });
        }
    });
    app.post("/api/staff-services", async (req, res) => {
        try {
            // Validate input (staffId, serviceId required; custom fields optional)
            const data = staffServiceWithRatesSchema.parse(req.body);
            // If an assignment already exists, update custom rates instead of duplicating
            const existing = await storage.getStaffServiceAssignment(data.staffId, data.serviceId);
            if (existing) {
                const updated = await storage.updateStaffService(existing.id, {
                    customRate: data.customRate ?? null,
                    customCommissionRate: data.customCommissionRate ?? null,
                });
                return res.status(200).json(updated);
            }
            const created = await storage.assignServiceToStaff({
                staffId: data.staffId,
                serviceId: data.serviceId,
                customRate: data.customRate ?? null,
                customCommissionRate: data.customCommissionRate ?? null,
            });
            return res.status(201).json(created);
        }
        catch (error) {
            console.error("Error creating staff service assignment:", error);
            res.status(400).json({
                error: error instanceof Error ? error.message : "Failed to create staff service assignment",
            });
        }
    });
    app.delete("/api/staff-services/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const existing = await storage.getStaffServiceById(id);
            if (!existing) {
                return res.status(404).json({ error: "Staff service assignment not found" });
            }
            const ok = await storage.removeServiceFromStaff(existing.staffId, existing.serviceId);
            if (!ok) {
                return res.status(500).json({ error: "Failed to delete staff service assignment" });
            }
            return res.json({ success: true });
        }
        catch (error) {
            console.error("Error deleting staff service assignment:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to delete staff service assignment",
            });
        }
    });
    // Staff schedules
    app.get("/api/schedules", async (req, res) => {
        try {
            const staffIdParam = req.query.staffId;
            const locationIdParam = req.query.locationId;
            let schedules = await storage.getAllStaffSchedules();
            if (staffIdParam) {
                const staffId = parseInt(staffIdParam);
                schedules = schedules.filter(s => s.staffId === staffId);
            }
            if (locationIdParam) {
                const locationId = parseInt(locationIdParam);
                schedules = schedules.filter(s => s.locationId === locationId);
            }
            return res.json(schedules);
        }
        catch (error) {
            console.error("Error getting schedules:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to get schedules",
            });
        }
    });
    app.post("/api/schedules", async (req, res) => {
        try {
            const data = insertStaffScheduleSchema.parse(req.body);
            const created = await storage.createStaffSchedule(data);
            return res.status(201).json(created);
        }
        catch (error) {
            console.error("Error creating schedule:", error);
            res.status(400).json({
                error: error instanceof Error ? error.message : "Failed to create schedule",
            });
        }
    });
    app.put("/api/schedules/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            // Allow partial updates
            const partialSchema = insertStaffScheduleSchema.partial();
            const updateData = partialSchema.parse(req.body);
            const updated = await storage.updateStaffSchedule(id, updateData);
            return res.json(updated);
        }
        catch (error) {
            console.error("Error updating schedule:", error);
            res.status(400).json({
                error: error instanceof Error ? error.message : "Failed to update schedule",
            });
        }
    });
    app.delete("/api/schedules/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const ok = await storage.deleteStaffSchedule(id);
            if (!ok) {
                return res.status(404).json({ error: "Schedule not found" });
            }
            return res.json({ success: true });
        }
        catch (error) {
            console.error("Error deleting schedule:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to delete schedule",
            });
        }
    });
    // ----------------------
    // Payroll-related routes
    // ----------------------
    // Detailed payroll view for a single staff member and month
    app.get("/api/payroll/:staffId/detailed", async (req, res) => {
        try {
            const staffId = parseInt(req.params.staffId);
            if (Number.isNaN(staffId)) {
                return res.status(400).json({ error: "Invalid staffId" });
            }
            const monthParam = req.query.month || new Date().toISOString();
            const monthDate = new Date(monthParam);
            const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 0, 0, 0, 0);
            const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
            const staffMember = await storage.getStaff(staffId);
            if (!staffMember) {
                return res.status(404).json({ error: "Staff member not found" });
            }
            // Load related info up front
            const [user, appts, allPayments] = await Promise.all([
                storage.getUser(staffMember.userId),
                storage.getAppointmentsByStaffAndDateRange(staffId, start, end),
                storage.getAllPayments(),
            ]);
            const staffName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Unknown";
            // Build appointment-level rows
            const detailedAppointments = [];
            let totalRevenue = 0;
            let totalCommission = 0;
            for (const apt of appts) {
                try {
                    const [service, client] = await Promise.all([
                        storage.getService(apt.serviceId),
                        storage.getUser(apt.clientId || 0),
                    ]);
                    if (!service)
                        continue;
                    // Prefer paid base amount from payment records; exclude tips from revenue
                    const payment = allPayments.find((p) => p.appointmentId === apt.id && p.status === 'completed');
                    const baseAmount = payment?.amount ?? (payment ? Math.max((payment.totalAmount || 0) - (payment.tipAmount || 0), 0) : undefined);
                    const servicePrice = baseAmount !== undefined ? baseAmount : (service.price || 0);
                    // Check for a custom commission for this staff+service
                    const assignment = await storage.getStaffServiceAssignment(staffId, service.id);
                    let commissionRate = assignment?.customCommissionRate;
                    if (commissionRate !== undefined && commissionRate !== null) {
                        // Interpret customCommissionRate as a percentage value if it's > 1 (e.g., 20 => 0.20)
                        commissionRate = commissionRate > 1 ? commissionRate / 100 : commissionRate;
                    }
                    else {
                        commissionRate = staffMember.commissionRate ?? 0;
                    }
                    let commissionAmount = 0;
                    switch (staffMember.commissionType) {
                        case 'commission': {
                            commissionAmount = servicePrice * (commissionRate || 0);
                            break;
                        }
                        case 'hourly': {
                            commissionAmount = 0; // hourly handled elsewhere in UI
                            break;
                        }
                        case 'fixed': {
                            commissionAmount = staffMember.fixedRate || 0;
                            break;
                        }
                        case 'hourly_plus_commission': {
                            commissionAmount = servicePrice * (commissionRate || 0);
                            break;
                        }
                        default:
                            commissionAmount = 0;
                    }
                    totalRevenue += servicePrice;
                    totalCommission += commissionAmount;
                    detailedAppointments.push({
                        appointmentId: apt.id,
                        date: apt.startTime,
                        clientName: client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() : 'Unknown',
                        serviceName: service.name,
                        duration: service.duration || 60,
                        servicePrice,
                        commissionRate,
                        commissionAmount,
                        paymentStatus: apt.paymentStatus || 'unpaid',
                    });
                }
                catch (e) {
                    // Skip problematic appointment but continue building the report
                    continue;
                }
            }
            const summary = {
                totalAppointments: detailedAppointments.length,
                totalRevenue,
                totalCommission,
                averageCommissionPerService: detailedAppointments.length > 0 ? (totalCommission / detailedAppointments.length) : 0,
            };
            return res.json({
                staffName,
                title: staffMember.title,
                commissionType: staffMember.commissionType,
                baseCommissionRate: staffMember.commissionRate ?? 0,
                hourlyRate: staffMember.hourlyRate ?? null,
                summary,
                appointments: detailedAppointments,
            });
        }
        catch (error) {
            console.error("Error generating detailed payroll view:", error);
            return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load payroll details" });
        }
    });
    // Staff earnings (with optional date range filtering)
    app.get("/api/staff-earnings", async (req, res) => {
        try {
            const { startDate, endDate, staffId } = req.query;
            const all = await storage.getAllStaffEarnings();
            const filtered = all.filter((e) => {
                if (staffId && String(e.staffId) !== String(staffId))
                    return false;
                const d = e.earningsDate ? new Date(e.earningsDate) : undefined;
                if (!d)
                    return false;
                if (startDate && d < new Date(startDate))
                    return false;
                if (endDate && d > new Date(endDate))
                    return false;
                return true;
            });
            res.json(filtered);
        }
        catch (error) {
            console.error("Error getting staff earnings:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to get staff earnings",
            });
        }
    });
    // Payroll history - list by optional staffId and/or date range
    app.get("/api/payroll-history", async (req, res) => {
        try {
            const { startDate, endDate, staffId } = req.query;
            const start = startDate ? new Date(startDate) : undefined;
            const end = endDate ? new Date(endDate) : undefined;
            let histories = [];
            if (staffId) {
                histories = await storage.getPayrollHistoryByStaff(parseInt(staffId));
            }
            else {
                // Aggregate across all staff when not specified
                const staffList = await storage.getAllStaff();
                const results = await Promise.all(staffList.map((s) => storage.getPayrollHistoryByStaff(s.id)));
                histories = results.flat();
            }
            if (start || end) {
                histories = histories.filter((h) => {
                    const ps = h.periodStart ? new Date(h.periodStart) : undefined;
                    const pe = h.periodEnd ? new Date(h.periodEnd) : undefined;
                    if (!ps || !pe)
                        return false;
                    if (start && pe < start)
                        return false; // ends before start
                    if (end && ps > end)
                        return false; // starts after end
                    return true;
                });
            }
            res.json(histories);
        }
        catch (error) {
            console.error("Error getting payroll history:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to get payroll history",
            });
        }
    });
    // Process payroll for a staff member within a period
    app.post("/api/payroll/process", async (req, res) => {
        try {
            const { staffId, periodStart, periodEnd, periodType } = req.body || {};
            if (!staffId || !periodStart || !periodEnd) {
                return res.status(400).json({ error: "staffId, periodStart, and periodEnd are required" });
            }
            const staffMember = await storage.getStaff(parseInt(staffId));
            if (!staffMember) {
                return res.status(404).json({ error: "Staff member not found" });
            }
            // Gather earnings within the specified period
            const allEarnings = await storage.getAllStaffEarnings();
            const start = new Date(periodStart);
            const end = new Date(periodEnd);
            const earnings = allEarnings.filter((e) => {
                return (e.staffId === parseInt(staffId) &&
                    e.earningsDate && new Date(e.earningsDate) >= start && new Date(e.earningsDate) <= end);
            });
            const totalServices = earnings.length;
            const totalRevenue = earnings.reduce((sum, e) => sum + (e.servicePrice || 0), 0);
            const totalCommission = earnings.reduce((sum, e) => sum + (e.earningsAmount || 0), 0);
            const totalHourlyPay = 0; // Not tracked separately here
            const totalFixedPay = 0; // Not tracked separately here
            const totalEarnings = totalCommission + totalHourlyPay + totalFixedPay;
            const record = await storage.createPayrollHistory({
                staffId: parseInt(staffId),
                periodStart: start,
                periodEnd: end,
                periodType: periodType || "monthly",
                totalHours: 0,
                totalServices,
                totalRevenue,
                totalCommission,
                totalHourlyPay,
                totalFixedPay,
                totalEarnings,
                commissionType: staffMember.commissionType,
                baseCommissionRate: staffMember.commissionRate ?? null,
                hourlyRate: staffMember.hourlyRate ?? null,
                fixedRate: staffMember.fixedRate ?? null,
                earningsBreakdown: JSON.stringify({ totalCommission, totalHourlyPay, totalServices, totalRevenue }),
                timeEntriesData: JSON.stringify([]),
                appointmentsData: JSON.stringify([]),
                payrollStatus: "generated",
                notes: undefined,
            });
            res.json({ success: true, payroll: record });
        }
        catch (error) {
            console.error("Error processing payroll:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to process payroll",
            });
        }
    });
    // Check software: list checks
    app.get("/api/check-software/checks", async (req, res) => {
        try {
            const { staffId, status } = req.query;
            const checks = await storage.getPayrollChecks(staffId ? parseInt(staffId) : undefined, status);
            res.json(checks);
        }
        catch (error) {
            console.error("Error getting payroll checks:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to get payroll checks",
            });
        }
    });
    // Check software: issue a payroll check
    app.post("/api/check-software/issue-check", async (req, res) => {
        try {
            const { payrollHistoryId, checkData } = req.body || {};
            if (!payrollHistoryId || !checkData) {
                return res.status(400).json({ error: "payrollHistoryId and checkData are required" });
            }
            // Normalize date fields
            const normalized = {
                ...checkData,
                checkDate: checkData.checkDate ? new Date(checkData.checkDate) : new Date(),
                payrollPeriod: checkData.payrollPeriod
                    ? {
                        startDate: new Date(checkData.payrollPeriod.startDate),
                        endDate: new Date(checkData.payrollPeriod.endDate),
                    }
                    : undefined,
            };
            const result = await checkSoftwareService.issuePayrollCheck(parseInt(payrollHistoryId), normalized);
            res.json(result);
        }
        catch (error) {
            console.error("Error issuing payroll check:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to issue payroll check",
            });
        }
    });
    return server;
}
