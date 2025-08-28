import { sendEmail } from './email.js';
import { sendSMS } from './sms.js';
// Automation rules are now stored in the database via storage layer
// Template variable replacement
function replaceTemplateVariables(template, variables) {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        result = result.replace(new RegExp(placeholder, 'g'), value);
    });
    return result;
}
// Check if email should be sent based on client preferences
function shouldSendEmail(rule, client) {
    console.log(`Checking email preferences for trigger: ${rule.trigger}`, {
        emailAccountManagement: client.emailAccountManagement,
        emailAppointmentReminders: client.emailAppointmentReminders,
        emailPromotions: client.emailPromotions
    });
    switch (rule.trigger) {
        case 'booking_confirmation':
            return client.emailAppointmentReminders === true;
        case 'appointment_reminder':
            return client.emailAppointmentReminders === true;
        case 'cancellation':
            return client.emailAccountManagement === true;
        case 'follow_up':
            return client.emailPromotions === true;
        case 'after_payment':
            return client.emailAccountManagement === true;
        default:
            return true;
    }
}
// Check if SMS should be sent based on client preferences
function shouldSendSMS(rule, client) {
    console.log(`Checking SMS preferences for trigger: ${rule.trigger}`, {
        smsAccountManagement: client.smsAccountManagement,
        smsAppointmentReminders: client.smsAppointmentReminders,
        smsPromotions: client.smsPromotions
    });
    // For after_payment triggers, be more lenient - allow if any SMS preference is enabled
    if (rule.trigger === 'after_payment') {
        return client.smsAccountManagement === true || client.smsAppointmentReminders === true || client.smsPromotions === true;
    }
    switch (rule.trigger) {
        case 'booking_confirmation':
            // Skip SMS automation for booking confirmations to prevent duplicates
            // SMS confirmations are already sent directly in the appointment creation route
            return false;
        case 'appointment_reminder':
            return client.smsAppointmentReminders === true;
        case 'cancellation':
            return client.smsAccountManagement === true;
        case 'follow_up':
            return client.smsPromotions === true;
        default:
            return true;
    }
}
// Main trigger function
export async function triggerAutomations(trigger, appointmentData, storage, customTriggerName) {
    console.log(`Triggering automations for: ${trigger}`, { appointmentData, customTriggerName });
    // Get all automation rules from database
    const allRules = await storage.getAllAutomationRules();
    console.log("🔧 ALL AUTOMATION RULES:", allRules.length);
    console.log("🔧 ALL RULES:", allRules);
    const relevantRules = allRules.filter(rule => {
        if (!rule.active)
            return false;
        if (rule.trigger === 'custom' && customTriggerName) {
            return rule.customTriggerName === customTriggerName;
        }
        return rule.trigger === trigger;
    });
    console.log("🔧 RELEVANT RULES FOR TRIGGER:", trigger, relevantRules.length);
    console.log("🔧 RELEVANT RULES:", relevantRules);
    // Optional location-aware filtering: support naming convention tags like "[location:2]" or "@location:2"
    const apptLocationIdRaw = appointmentData?.locationId;
    const apptLocationId = apptLocationIdRaw != null ? parseInt(String(apptLocationIdRaw)) : null;
    // Build a lookup of location names -> IDs (trimmed, case-insensitive)
    let locNameToId = new Map();
    try {
        const allLocs = await storage.getAllLocations?.();
        if (Array.isArray(allLocs)) {
            for (const l of allLocs) {
                const key = String((l?.name ?? '')).trim().toLowerCase();
                if (key && typeof l?.id === 'number')
                    locNameToId.set(key, l.id);
            }
        }
    }
    catch { }
    const parseLocationToken = (text) => {
        try {
            if (!text)
                return null;
            const m = /(?:\[location:([^\]]+)\]|@location:([^\s]+))/i.exec(text);
            if (m) {
                const token = (m[1] || m[2] || '').toString().trim();
                return token || null;
            }
            return null;
        }
        catch {
            return null;
        }
    };
    const resolveRuleLocationId = (r) => {
        const token = parseLocationToken(r?.name) || parseLocationToken(r?.subject);
        if (!token)
            return null;
        const n = parseInt(token);
        if (!Number.isNaN(n))
            return n;
        const key = token.trim().toLowerCase();
        return locNameToId.get(key) ?? null;
    };
    const withLocationMeta = relevantRules.map(r => ({
        rule: r,
        loc: resolveRuleLocationId(r),
    }));
    // If appointment has a location, prefer rules tagged for that location; otherwise include global (no tag)
    let scopedRules = withLocationMeta;
    if (apptLocationId != null) {
        const specific = withLocationMeta.filter(x => x.loc === apptLocationId);
        const global = withLocationMeta.filter(x => x.loc == null);
        scopedRules = specific.length > 0 ? specific : global;
    }
    const effectiveRules = scopedRules.map(x => x.rule);
    if (effectiveRules.length === 0) {
        console.log(`No active automation rules found for trigger: ${trigger}`);
        return;
    }
    // Test mode: allow direct email testing without requiring an appointment/client
    const testEmail = appointmentData?.testEmail;
    if (testEmail) {
        try {
            // Prepare minimal variables for testing
            const now = new Date();
            const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
            // Reuse location-aware branding if locationId provided
            let salonName = 'Glo Head Spa';
            let salonPhone = '(555) 123-4567';
            let salonAddress = '123 Beauty Street, City, State 12345';
            try {
                const locId = appointmentData?.locationId;
                if (locId != null) {
                    const allLocs = await storage.getAllLocations?.();
                    const location = Array.isArray(allLocs) ? allLocs.find((l) => String(l.id) === String(locId)) : null;
                    if (location) {
                        if (location.name)
                            salonName = String(location.name);
                        if (location.phone)
                            salonPhone = String(location.phone);
                        const addrParts = [location.address, location.city, location.state, location.zipCode].filter(Boolean);
                        if (addrParts.length)
                            salonAddress = addrParts.join(', ');
                    }
                }
            }
            catch { }
            const appointmentDate = new Date(appointmentData?.startTime || now.toISOString());
            const dateStr = appointmentDate.toLocaleDateString('en-US', { timeZone: 'America/Chicago' });
            const timeStr = appointmentDate.toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: true });
            const variables = {
                client_name: 'Test Recipient',
                client_first_name: 'Test',
                client_last_name: 'Recipient',
                client_email: testEmail,
                client_phone: '',
                service_name: 'Service',
                service_duration: '60',
                staff_name: 'Your stylist',
                staff_phone: '',
                appointment_date: dateStr,
                appointment_time: timeStr,
                appointment_datetime: `${dateStr} ${timeStr}`,
                salon_name: salonName,
                salon_phone: salonPhone,
                salon_address: salonAddress,
                booking_date: dateStr,
                total_amount: '0'
            };
            // In test mode, ignore location tags so you can preview any rule
            const rulesToRun = relevantRules;
            for (const rule of rulesToRun) {
                try {
                    if (rule.type !== 'email')
                        continue; // Only send emails in test mode
                    const processedTemplate = replaceTemplateVariables(rule.template, variables);
                    const subject = rule.subject ? replaceTemplateVariables(rule.subject, variables) : 'Automation Test';
                    await sendEmail({
                        to: testEmail,
                        from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
                        subject,
                        text: processedTemplate,
                        html: `<p>${processedTemplate.replace(/\n/g, '<br>')}</p>`
                    });
                    const newSentCount = (rule.sentCount || 0) + 1;
                    await storage.updateAutomationRuleSentCount(rule.id, newSentCount);
                    console.log(`Test email sent for rule: ${rule.name} -> ${testEmail}`);
                }
                catch (e) {
                    console.log(`Test email failed for rule: ${rule.name}`, e);
                }
            }
            return; // Do not proceed to real appointment flow in test mode
        }
        catch (e) {
            console.log('Test mode error:', e);
            return;
        }
    }
    // Get appointment details
    const service = await storage.getService(appointmentData.serviceId);
    const client = await storage.getUser(appointmentData.clientId);
    const staffMember = await storage.getStaff(appointmentData.staffId);
    const staffUser = staffMember ? await storage.getUser(staffMember.userId) : null;
    if (!client) {
        console.log('Client not found for automation trigger');
        return;
    }
    // Prepare template variables
    const appointmentDate = new Date(appointmentData.startTime);
    // Convert UTC time to local time for display
    const localOptions = {
        timeZone: 'America/Chicago', // Central Time Zone
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    const localDateOptions = {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    };
    const localDateTimeOptions = {
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    const appointmentTime = appointmentDate.toLocaleTimeString('en-US', localOptions);
    const appointmentDateString = appointmentDate.toLocaleDateString('en-US', localDateOptions);
    const appointmentDateTime = appointmentDate.toLocaleString('en-US', localDateTimeOptions);
    // Resolve location details for branding (fallback to defaults)
    let salonName = 'Glo Head Spa';
    let salonPhone = '(555) 123-4567';
    let salonAddress = '123 Beauty Street, City, State 12345';
    try {
        const locId = appointmentData?.locationId;
        if (locId != null) {
            let location = null;
            try {
                location = await storage.getLocation?.(locId);
            }
            catch { }
            if (!location) {
                try {
                    location = await storage.getLocationById?.(locId);
                }
                catch { }
            }
            if (!location) {
                try {
                    const allLocs = await storage.getAllLocations?.();
                    if (Array.isArray(allLocs))
                        location = allLocs.find((l) => String(l.id) === String(locId));
                }
                catch { }
            }
            if (location) {
                if (location.name)
                    salonName = String(location.name);
                if (location.phone)
                    salonPhone = String(location.phone);
                const addrParts = [location.address, location.city, location.state, location.zipCode].filter(Boolean);
                if (addrParts.length)
                    salonAddress = addrParts.join(', ');
            }
        }
    }
    catch { }
    const variables = {
        client_name: client.firstName || client.username,
        client_email: client.email,
        client_phone: client.phone || '',
        service_name: service?.name || 'Service',
        service_duration: service?.duration?.toString() || '60',
        staff_name: staffUser ? `${staffUser.firstName} ${staffUser.lastName}`.trim() || staffUser.username : 'Staff',
        appointment_date: appointmentDateString,
        appointment_time: appointmentTime,
        appointment_datetime: appointmentDateTime,
        salon_name: salonName,
        salon_phone: salonPhone,
        salon_address: salonAddress,
        booking_date: new Date().toLocaleDateString('en-US', localDateOptions),
        total_amount: service?.price?.toString() || '0'
    };
    // Process each automation rule
    for (const rule of effectiveRules) {
        try {
            const processedTemplate = replaceTemplateVariables(rule.template, variables);
            // Check client preferences before sending
            const overrideEmail = appointmentData?.testEmail;
            const canSend = overrideEmail ? true : shouldSendEmail(rule, client);
            const toEmail = overrideEmail || client.email;
            if (rule.type === 'email' && toEmail && canSend) {
                console.log(`Email automation check for ${rule.name}: client.email=${!!client.email}, canSendEmail=${shouldSendEmail(rule, client)}, preferences:`, {
                    emailAccountManagement: client.emailAccountManagement,
                    emailAppointmentReminders: client.emailAppointmentReminders,
                    emailPromotions: client.emailPromotions
                });
                const subject = rule.subject ? replaceTemplateVariables(rule.subject, variables) : 'Notification from BeautyBook Salon';
                const emailSent = await sendEmail({
                    to: toEmail,
                    from: process.env.SENDGRID_FROM_EMAIL || 'hello@headspaglo.com',
                    subject,
                    text: processedTemplate,
                    html: `<p>${processedTemplate.replace(/\n/g, '<br>')}</p>`
                });
                if (emailSent) {
                    const newSentCount = (rule.sentCount || 0) + 1;
                    await storage.updateAutomationRuleSentCount(rule.id, newSentCount);
                    console.log(`Email automation sent successfully for rule: ${rule.name}`);
                }
            }
            else if (rule.type === 'sms' && client.phone && shouldSendSMS(rule, client)) {
                console.log(`SMS automation check for ${rule.name}: client.phone=${!!client.phone}, canSendSMS=${shouldSendSMS(rule, client)}, preferences:`, {
                    smsAccountManagement: client.smsAccountManagement,
                    smsAppointmentReminders: client.smsAppointmentReminders,
                    smsPromotions: client.smsPromotions
                });
                const smsResult = await sendSMS(client.phone, processedTemplate);
                console.log(`SMS sending result for ${rule.name}:`, smsResult);
                if (smsResult.success) {
                    const newSentCount = (rule.sentCount || 0) + 1;
                    await storage.updateAutomationRuleSentCount(rule.id, newSentCount);
                    console.log(`SMS automation sent successfully for rule: ${rule.name}`);
                }
                else {
                    console.log(`SMS automation failed for rule: ${rule.name}, error: ${smsResult.error}`);
                }
            }
            else {
                console.log(`Automation skipped for ${rule.name} (${rule.type}): client.email=${!!client.email}, client.phone=${!!client.phone}, canSendEmail=${rule.type === 'email' ? shouldSendEmail(rule, client) : 'N/A'}, canSendSMS=${rule.type === 'sms' ? shouldSendSMS(rule, client) : 'N/A'}`);
            }
        }
        catch (error) {
            console.error(`Failed to execute automation rule ${rule.name}:`, error);
        }
    }
}
// Specific trigger functions
export async function triggerBookingConfirmation(appointmentData, storage) {
    console.log("🔧 TRIGGERING BOOKING CONFIRMATION AUTOMATION");
    console.log("🔧 Appointment data:", appointmentData);
    await triggerAutomations('booking_confirmation', appointmentData, storage);
    console.log("🔧 BOOKING CONFIRMATION AUTOMATION COMPLETED");
}
export async function triggerAppointmentReminder(appointmentData, storage) {
    await triggerAutomations('appointment_reminder', appointmentData, storage);
}
export async function triggerFollowUp(appointmentData, storage) {
    await triggerAutomations('follow_up', appointmentData, storage);
}
export async function triggerCancellation(appointmentData, storage) {
    await triggerAutomations('cancellation', appointmentData, storage);
}
export async function triggerNoShow(appointmentData, storage) {
    await triggerAutomations('no_show', appointmentData, storage);
}
export async function triggerAfterPayment(appointmentData, storage) {
    await triggerAutomations('after_payment', appointmentData, storage);
}
export async function triggerCustomAutomation(appointmentData, storage, customTriggerName) {
    await triggerAutomations('custom', appointmentData, storage, customTriggerName);
}
