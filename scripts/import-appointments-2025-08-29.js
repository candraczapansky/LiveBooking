#!/usr/bin/env node
/**
 * Bulk import appointments for 2025-08-29.
 * - Uses existing API endpoints only; does not modify server code or DB directly
 * - Maps Staff, Services, Locations, Clients by name
 * - Creates missing clients if necessary via /api/clients
 * - Posts appointments to /api/appointments with proper start/end times, staffId, serviceId, clientId, locationId, notes, status
 * - Handles OFF/Lunch/Block/ROK/Trade as blocked schedules via /api/schedules
 * - Skips any fields that are not part of our app model
 */

const DEFAULT_API = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev';
const API_BASE = process.env.API_BASE_URL || DEFAULT_API;

function log(...args) { console.log('[import-appointments]', ...args); }

async function http(method, path, body) {
	const url = `${API_BASE}${path}`;
	const res = await fetch(url, {
		method,
		headers: { 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined,
	});
	if (!res.ok) {
		const txt = await res.text().catch(() => '');
		throw new Error(`${method} ${path} -> ${res.status}: ${txt}`);
	}
	const ct = res.headers.get('content-type') || '';
	if (ct.includes('application/json')) return res.json();
	return res.text();
}

function toCSTISO(dateStr, timeRange) {
	// dateStr: '2025-08-29'
	// timeRange: '8:00 AM - 8:50 AM'
	if (!timeRange || timeRange === '.' || /block|off|lunch|rok|trade/i.test(timeRange)) return { start: null, end: null };
	const [startStr, endStr] = timeRange.split('-').map(s => s.trim());
	function parse12h(t) {
		// e.g., '8:00 AM' or '12:00 PM'
		const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*([AP]M)$/i);
		if (!m) return null;
		let hh = parseInt(m[1], 10);
		const mm = parseInt(m[2] || '0', 10);
		const ampm = m[3].toUpperCase();
		if (ampm === 'AM') {
			if (hh === 12) hh = 0;
		} else {
			if (hh !== 12) hh += 12;
		}
		return { hh, mm };
	}
	const s = parse12h(startStr);
	const e = parse12h(endStr);
	if (!s || !e) return { start: null, end: null };
	// Return ISO with Central offset (Aug: UTC-05:00)
	const startIso = `${dateStr}T${String(s.hh).padStart(2, '0')}:${String(s.mm).padStart(2, '0')}:00-05:00`;
	const endIso = `${dateStr}T${String(e.hh).padStart(2, '0')}:${String(e.mm).padStart(2, '0')}:00-05:00`;
	return { start: startIso, end: endIso };
}

function normalizeServiceName(name) {
	return String(name || '')
		.replace(/\s*\/\s*/g, ' / ')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

function normalizeLocationName(name) {
	return String(name || '').trim().toLowerCase();
}

function normalizeFullName(name) {
	return String(name || '').trim().toLowerCase();
}

async function getAll(reference) {
	const [users, staff, services] = await Promise.all([
		http('GET', '/api/users'),
		http('GET', '/api/staff'),
		http('GET', '/api/services'),
	]);
	// Locations require auth; we fallback to known IDs via schedules files if not accessible
	let locations = [];
	try {
		locations = await http('GET', '/api/locations');
	} catch {
		locations = [];
	}
	return { users, staff, services, locations };
}

function resolveLocationId(locations, name) {
	if (!name) return null;
	const key = normalizeLocationName(name);
	const STATIC = {
		'flutter - broken arrow': 1,
		'gloup - south tulsa': 2,
		'the extensionist - owasso': 3,
		'gloup - brookside': 4,
		'glo head spa (brookside)': 4,
	};
	if (Object.prototype.hasOwnProperty.call(STATIC, key)) {
		return STATIC[key];
	}
	const hit = (locations || []).find(l => normalizeLocationName(l.name) === key);
	return hit?.id ?? null;
}

function resolveStaffId(staffList, fullName) {
	// Support both "Last, First" and "First Last"
	const raw = String(fullName || '').trim();
	const { firstName, lastName } = splitNameLastCommaFirst(raw);
	const variant1 = normalizeFullName(`${firstName} ${lastName}`); // First Last
	const variant2 = normalizeFullName(raw.replace(',', ' ')); // raw without comma
	let staff = staffList.find(s => normalizeFullName(`${s.user?.firstName || ''} ${s.user?.lastName || ''}`) === variant1);
	if (!staff) {
		staff = staffList.find(s => normalizeFullName(`${s.user?.firstName || ''} ${s.user?.lastName || ''}`) === variant2);
	}
	if (!staff) {
		staff = staffList.find(s => normalizeFullName(`${s.firstName || s.user?.firstName || ''} ${s.lastName || s.user?.lastName || ''}`) === variant1);
	}
	return staff?.id ?? null;
}

function resolveServiceId(services, raw) {
	if (!raw) return null;
	function comparableName(n) {
		return normalizeServiceName(n).replace(/\*/g, '').toLowerCase();
	}
	// Normalize incoming descriptor
	let name = normalizeServiceName(raw)
		.replace(/^Lashes\s*\/\s*/i, '')
		.replace(/^Master Lashes\s*\/\s*/i, '')
		.replace(/^Japanese Head Spa \(South\)\s*\/\s*/i, '')
		.replace(/^Hydrafacial \(South\)\s*\/\s*/i, '')
		.replace(/^PicoWay Laser\s*\/\s*/i, '')
		.replace(/^Brows\s*\/\s*/i, '')
		.replace(/^PICOWAY\s*\/\s*/i, '')
		.replace(/\*/g, '')
		.trim();
	// Specific aliases
	if (/cancellation fee/i.test(name)) name = 'Cancellation Fee';
	const key = comparableName(name);
	let hit = services.find(s => comparableName(s.name) === key);
	if (hit) return hit.id;
	const priceStripped = key.replace(/\s*\/\s*\$\d+(?:\.\d{1,2})?/g, '').trim();
	hit = services.find(s => comparableName(s.name) === priceStripped);
	return hit?.id ?? null;
}

function statusFromText(text) {
	const t = String(text || '').toLowerCase();
	if (t.includes('completed')) return 'completed';
	if (t.includes('arrived')) return 'confirmed';
	if (t.includes('booked') || t.includes('confirmed')) return 'confirmed';
	if (t.includes('no-show') || t.includes('no show')) return 'cancelled';
	return 'confirmed';
}

async function ensureClient(users, firstName, lastName) {
	const target = normalizeFullName(`${firstName} ${lastName}`);
	let user = users.find(u => normalizeFullName(`${u.firstName || ''} ${u.lastName || ''}`) === target);
	if (user) return user;
	// Create minimal client with placeholder email if missing
	const emailBase = `${(firstName || 'client').toLowerCase()}${(lastName || '').toLowerCase()}`.replace(/[^a-z0-9]/g, '') || `client${Date.now()}`;
	const email = `${emailBase}.${Date.now()}@placeholder.local`;
	user = await http('POST', '/api/clients', {
		firstName: firstName || 'Client',
		lastName: lastName || '',
		email,
		smsAppointmentReminders: true,
		emailAppointmentReminders: true,
	});
	return user;
}

function makeBlockedSchedule(staffId, dateStr, timeRange, _title) {
	const dayName = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
	if (!timeRange || timeRange === '.') return null;
	const [startRaw, endRaw] = timeRange.split('-').map(s => s.trim());
	return {
		staffId,
		dayOfWeek: dayName,
		startTime: startRaw.replace(/\s*[AP]M$/i, (m) => {
			const t = startRaw.match(/^(\d{1,2})(?::(\d{2}))?\s*([AP]M)$/i);
			if (!t) return startRaw;
			let h = parseInt(t[1], 10);
			const m2 = parseInt(t[2] || '0', 10);
			const ap = t[3].toUpperCase();
			if (ap === 'AM') { if (h === 12) h = 0; } else { if (h !== 12) h += 12; }
			return `${String(h).padStart(2,'0')}:${String(m2).padStart(2,'0')}`;
		}),
		endTime: endRaw.replace(/\s*[AP]M$/i, (m) => {
			const t = endRaw.match(/^(\d{1,2})(?::(\d{2}))?\s*([AP]M)$/i);
			if (!t) return endRaw;
			let h = parseInt(t[1], 10);
			const m2 = parseInt(t[2] || '0', 10);
			const ap = t[3].toUpperCase();
			if (ap === 'AM') { if (h === 12) h = 0; } else { if (h !== 12) h += 12; }
			return `${String(h).padStart(2,'0')}:${String(m2).padStart(2,'0')}`;
		}),
		locationId: null,
		serviceCategories: [],
		startDate: dateStr,
		endDate: dateStr,
		isBlocked: true,
	};
}

// Minimal, structured extraction from user-provided text
const RAW = String(`
8/29/2025 | 12:00 AM - 1:00 AM | OFF | Staff: Bowers, Michelle
8/29/2025 | 12:00 AM - 11:00 PM | OFF | Staff: Coley, Sonja
8/29/2025 | 8:00 AM - 8:30 AM | Lashes / Bold Mini Fill / $40 | Staff: Wensman, Kelsie | Location: The Extensionist - Owasso | Client: Ledbetter, Jessica | Status: Completed
8/29/2025 | 8:00 AM - 8:50 AM | Lashes /  Blended Fill / $60 | Staff: Williams, Rita | Location: Flutter - Broken Arrow | Client: Creamer, Brittany | Status: Completed
8/29/2025 | 8:00 AM - 8:50 AM | Lashes / Natural Volume Fill / $60 | Staff: Reece, Jade | Location: GloUp - Brookside | Client: Minchew, Robin | Status: Completed
8/29/2025 | 9:00 AM - 9:30 AM | Lashes / Blended Mini Fill / $35 | Staff: Guey, Whitley | Location: Flutter - Broken Arrow | Client: Barwig, Ann | Status: Completed
8/29/2025 | 9:00 AM - 9:30 AM | Lashes / Classic Mini Fill / $30 | Staff: Keller, Anna | Location: The Extensionist - Owasso | Client: Evans, Kelly | Status: Completed
8/29/2025 | 9:00 AM - 9:30 AM | Lashes / Blended Mini Fill / $35 | Staff: Arredondo, Eva | Location: Flutter - Broken Arrow | Client: Sagely, Tara | Status: Completed
8/29/2025 | 9:00 AM - 9:50 AM | Lashes /  Bold Fill / $65 | Staff: Williams, Rita | Location: Flutter - Broken Arrow | Client: Graham, Abbiagale | Status: Completed
8/29/2025 | 9:00 AM - 9:50 AM | Lashes /  Blended Fill / $60 | Staff: Wensman, Kelsie | Location: The Extensionist - Owasso | Client: Hicks, Andrea | Status: Completed
8/29/2025 | 9:00 AM - 9:50 AM | Lashes /  Blended Fill / $60 | Staff: Reece, Jade | Location: GloUp - Brookside | Client: Sartin, Jennifer | Status: Completed
8/29/2025 | 9:00 AM - 10:00 AM | . | Staff: Grimm, Jacque
8/29/2025 | 9:00 AM - 10:20 AM | Lashes / Bold Extended Fill / $105 | Staff: Ferguson, Kisty | Location: Flutter - Broken Arrow | Client: Marmon, Gabby | Status: Completed
8/29/2025 | 9:00 AM - 11:00 AM | Lashes / *$99 Full Set Special!* | Staff: Smith, Nicole | Location: GloUp - South Tulsa | Client: Cooper, Kylie | Status: Completed
8/29/2025 | 9:00 AM - 11:00 AM | Lashes / *$99 Full Set Special!* | Staff: Czapansky, Kim | Location: GloUp - South Tulsa | Client: McGuire, Kim | Status: Completed
8/29/2025 | 9:00 AM - 4:00 PM | . | Staff: Davis, Alexzia
8/29/2025 | 10:00 AM - 10:30 AM | *PicoWay Laser / Picoway Consultation | Staff: Beller, Jamie | Location: GloUp - South Tulsa | Client: Layne, Callie | Status: Arrived
8/29/2025 | 10:00 AM - 10:50 AM | Master Lashes /  Master Fill/ $70 | Staff: Wensman, Kelsie | Location: The Extensionist - Owasso | Client: Ellis, Michelle | Status: Completed
8/29/2025 | 10:00 AM - 10:50 AM | Lashes /  Bold Fill / $65 | Staff: Williams, Rita | Location: Flutter - Broken Arrow | Client: Frias, Nicole | Status: Completed
8/29/2025 | 10:00 AM - 10:50 AM | Lashes /  Bold Fill / $65 | Staff: Keller, Anna | Location: The Extensionist - Owasso | Client: Hubbert, Selanie | Status: Completed
8/29/2025 | 10:00 AM - 10:50 AM | Lashes /  Bold Fill / $65 | Staff: Grimm, Jacque | Location: Flutter - Broken Arrow | Client: Jacobson, Mckay | Status: No-Show
8/29/2025 | 10:00 AM - 10:50 AM | Lashes /  Blended Fill / $60 | Staff: Porter, Lynetta | Location: Flutter - Broken Arrow | Client: Phifer, Triena | Status: Completed
8/29/2025 | 10:00 AM - 10:55 AM | Lashes / Employee Fill / $30 | Staff: Guey, Whitley | Location: Flutter - Broken Arrow | Client: McDermott, Carson | Status: Arrived
8/29/2025 | 10:00 AM - 11:00 AM | *Japanese Head Spa (South) / Signature Head spa | Staff: Donley, Hailey | Location: GloUp - Brookside | Client: Waligora, John | Status: Completed
8/29/2025 | 10:00 AM - 11:50 AM | Lashes /  Blended Full Set / $150 | Staff: Czapansky, Kelsey | Location: Flutter - Broken Arrow | Client: Svensson, Esther | Status: Arrived
8/29/2025 | 10:00 AM - 5:00 PM | . | Staff: Czapansky, Candra
8/29/2025 | 11:00 AM - 11:30 AM | *PicoWay Laser / Picoway Consultation | Staff: Beller, Jamie | Location: GloUp - South Tulsa | Client: Cruz, Jesenia | Status: Arrived
8/29/2025 | 11:00 AM - 11:50 AM | Lashes /  Blended Fill / $60 | Staff: Czapansky, Kim | Location: GloUp - South Tulsa | Client: Acklin, Lorri | Status: Arrived
8/29/2025 | 11:00 AM - 11:50 AM | Lashes /  Blended Fill / $60 | Staff: Smith, Nicole | Location: GloUp - South Tulsa | Client: Alger, Amy | Status: Arrived
8/29/2025 | 11:00 AM - 11:50 AM | Lashes /  Blended Fill / $60 | Staff: Porter, Lynetta | Location: Flutter - Broken Arrow | Client: Dressler, Ashley | Status: No-Show
8/29/2025 | 11:00 AM - 11:50 AM | Lashes /  Bold Fill / $65 | Staff: Grimm, Jacque | Location: Flutter - Broken Arrow | Client: Jacobson, Dawn | Status: Completed
8/29/2025 | 11:00 AM - 11:50 AM | Lashes /  Blended Fill / $60 | Staff: Ferguson, Kisty | Location: Flutter - Broken Arrow | Client: Leaverton, Marie | Status: No-Show
8/29/2025 | 11:00 AM - 11:50 AM | Brows / Brow Lamination w/ Tint & Wax / $85 | Staff: Arredondo, Eva | Location: Flutter - Broken Arrow | Client: Marmon, Gabby | Status: Completed
8/29/2025 | 11:00 AM - 11:50 AM | Lashes /  Bold Fill / $65 | Staff: Guey, Whitley | Location: Flutter - Broken Arrow | Client: Rolland, Chriss | Status: Arrived
8/29/2025 | 11:00 AM - 11:50 AM | Lashes /  Bold Fill / $65 | Staff: Keller, Anna | Location: The Extensionist - Owasso | Client: Shrum, Stephanie | Status: Arrived
8/29/2025 | 11:00 AM - 12:00 PM | Cancellation Fee / Cancellation Fee | Staff: Williams, Rita | Location: Flutter - Broken Arrow | Client: Koch, Libby | Status: Completed
8/29/2025 | 11:00 AM - 12:00 PM | *Japanese Head Spa (South) / Signature Head spa | Staff: Fanning, Marina | Location: GloUp - Brookside | Client: Owens, Rachel | Status: Arrived
8/29/2025 | 11:00 AM - 12:00 PM | Lashes / Master Fill / $70 | Staff: Wensman, Kelsie | Location: The Extensionist - Owasso | Client: Smith, Pam | Status: No-Show
8/29/2025 | 11:00 AM - 12:00 PM | *Japanese Head Spa (South) / Signature Head spa | Staff: Oviedo, Lupe | Location: GloUp - Brookside | Client: Warner, Dana | Status: Arrived
8/29/2025 | 11:00 AM - 12:00 PM | Lash lift/tint model Amanda | Staff: Reece, Jade
8/29/2025 | 12:00 PM - 12:15 PM | *PicoWay Laser / Numbing Cream | Staff: Beller, Jamie | Location: GloUp - South Tulsa | Client: King, Mason | Status: Confirmed
8/29/2025 | 12:00 PM - 12:50 PM | Lashes / Natural Volume Fill / $60 | Staff: Czapansky, Kim | Location: GloUp - South Tulsa | Client: Cullum, Angie | Status: Confirmed
8/29/2025 | 12:00 PM - 12:50 PM | Lashes /  Bold Fill / $65 | Staff: Wensman, Kelsie | Location: The Extensionist - Owasso | Client: Garrett, Lexie | Status: Booked
8/29/2025 | 12:00 PM - 12:50 PM | Lashes /  Blended Fill / $60 | Staff: Guey, Whitley | Location: Flutter - Broken Arrow | Client: Knight, Courtney | Status: Completed
8/29/2025 | 12:00 PM - 12:50 PM | Lashes / Classic Fill / $55 | Staff: Keller, Anna | Location: The Extensionist - Owasso | Client: Potts, Stacie | Status: Confirmed
8/29/2025 | 12:00 PM - 12:55 PM | Lashes / Employee Fill / $30 | Staff: Grimm, Jacque | Location: Flutter - Broken Arrow | Client: Trinidad, Kristen | Status: Booked
8/29/2025 | 12:00 PM - 1:00 PM | Block | Staff: Allwelt, Marleigh
8/29/2025 | 12:00 PM - 1:00 PM | Lunch | Staff: Reece, Jade
8/29/2025 | 12:00 PM - 1:00 PM | Ma | Staff: Porter, Lynetta
8/29/2025 | 12:00 PM - 1:30 PM | Lashes /  Blended Extended Fill / $95 | Staff: Ferguson, Kisty | Location: Flutter - Broken Arrow | Client: McDonald, Jamie | Status: Confirmed
8/29/2025 | 12:00 PM - 2:00 PM | Lashes / *$99 Full Set Special!* | Staff: Czapansky, Kelsey | Location: Flutter - Broken Arrow | Client: Kreidler, Kellie | Status: Confirmed
8/29/2025 | 12:15 PM - 2:00 PM | . | Staff: Arredondo, Eva
8/29/2025 | 12:30 PM - 1:00 PM | Lashes / Bold Mini Fill / $40 | Staff: Williams, Rita | Location: Flutter - Broken Arrow | Client: Heller, Debbie | Status: Booked
8/29/2025 | 12:30 PM - 1:30 PM | *Japanese Head Spa (South) / Signature Head spa | Staff: Fanning, Marina | Location: GloUp - Brookside | Client: Smith, Kortney | Status: Booked
8/29/2025 | 1:00 PM - 1:15 PM | *PicoWay Laser / *Free First Session - Tattoo Removal | Staff: Beller, Jamie | Location: GloUp - South Tulsa | Client: King, Mason | Notes: a few small face tattoos and form is filled out | Status: Confirmed
8/29/2025 | 1:00 PM - 1:50 PM | Lashes /  Blended Fill / $60 | Staff: Porter, Lynetta | Location: Flutter - Broken Arrow | Client: August, Krystal | Status: Booked
8/29/2025 | 1:00 PM - 1:50 PM | Lashes /  Blended Fill / $60 | Staff: Smith, Nicole | Location: GloUp - South Tulsa | Client: Bayer, Ashley | Status: Confirmed
8/29/2025 | 1:00 PM - 1:50 PM | Lashes / Natural Volume Fill / $60 | Staff: Keller, Anna | Location: The Extensionist - Owasso | Client: Carnley, Ashley | Status: Confirmed
8/29/2025 | 1:00 PM - 1:50 PM | Lashes /  Blended Fill / $60 | Staff: Grimm, Jacque | Location: Flutter - Broken Arrow | Client: Cook, Ann | Status: Confirmed
8/29/2025 | 1:00 PM - 1:50 PM | Lashes /  Blended Fill / $60 | Staff: Czapansky, Kim | Location: GloUp - South Tulsa | Client: Dennis, Samantha | Status: Booked
8/29/2025 | 1:00 PM - 1:50 PM | Lashes /  Blended Fill / $60 | Staff: Guey, Whitley | Location: Flutter - Broken Arrow | Client: Scott-Skaggs, Kimberly | Notes: 1:15pm? | Status: Confirmed
8/29/2025 | 1:00 PM - 1:50 PM | Lashes /  Blended Fill / $60 | Staff: Williams, Rita | Location: Flutter - Broken Arrow | Client: Slife, Britany | Status: Confirmed
8/29/2025 | 1:00 PM - 2:00 PM | *Japanese Head Spa (South) / Signature Head spa | Staff: Donley, Hailey | Location: GloUp - Brookside | Client: McPherson, Jason | Status: Booked
8/29/2025 | 1:00 PM - 2:00 PM | *Japanese Head Spa (South) / Signature Head spa | Staff: Oviedo, Lupe | Location: GloUp - Brookside | Client: McPherson, Melissa | Status: Confirmed
8/29/2025 | 1:00 PM - 2:00 PM | Lash lift/tint model Molly | Staff: Reece, Jade
8/29/2025 | 1:00 PM - 2:50 PM | Lashes / Classic Full Set / $125 | Staff: Wensman, Kelsie | Location: The Extensionist - Owasso | Client: Yangvang, J&J | Notes: SAW 25OFF PROMO CODE | Status: Confirmed
8/29/2025 | 1:30 PM - 1:45 PM | *PicoWay Laser / *Free First Session - Tattoo Removal | Staff: Beller, Jamie | Location: GloUp - South Tulsa | Client: Warren, Carrie | Notes: Form is filled out | Status: Confirmed
8/29/2025 | 2:00 PM - 2:15 PM | *PicoWay Laser / $100 Session PicoWay Tattoo Removal Promo | Staff: Beller, Jamie | Location: GloUp - South Tulsa | Client: Berglan , Schey | Notes: form is filled out | Status: Confirmed
8/29/2025 | 2:00 PM - 2:30 PM | Lashes / 15 Minute Fix | Staff: Reece, Jade | Location: GloUp - Brookside | Client: Charles, Anita | Notes: 2:30 | Status: Booked
8/29/2025 | 2:00 PM - 2:50 PM | Lashes / Natural Volume Fill / $60 | Staff: Czapansky, Kelsey | Location: Flutter - Broken Arrow | Client: Brooks, Stacy | Status: Confirmed
8/29/2025 | 2:00 PM - 2:50 PM | Lashes /  Blended Fill / $60 | Staff: Porter, Lynetta | Location: Flutter - Broken Arrow | Client: Cook, Heidi | Status: Confirmed
8/29/2025 | 2:00 PM - 2:50 PM | Lashes /  Blended Fill / $60 | Staff: Smith, Nicole | Location: GloUp - South Tulsa | Client: Garcia, Ashley | Status: Booked
8/29/2025 | 2:00 PM - 2:50 PM | Lashes /  Bold Fill / $65 | Staff: Czapansky, Kim | Location: GloUp - South Tulsa | Client: Lamont, Kristin | Status: Confirmed
8/29/2025 | 2:00 PM - 2:50 PM | Lashes / Natural Volume Fill / $60 | Staff: Grimm, Jacque | Location: Flutter - Broken Arrow | Client: Reedy, Macy | Status: Confirmed
8/29/2025 | 2:00 PM - 2:50 PM | Lashes /  Blended Fill / $60 | Staff: Keller, Anna | Location: The Extensionist - Owasso | Client: Wilmet, Sammi | Status: Confirmed
8/29/2025 | 2:00 PM - 3:00 PM | . | Staff: Guey, Whitley
8/29/2025 | 2:00 PM - 3:00 PM | ROK | Staff: Allwelt, Marleigh
8/29/2025 | 2:00 PM - 3:00 PM | Trade | Staff: Arredondo, Eva
8/29/2025 | 2:00 PM - 3:00 PM | Trade | Staff: Ferguson, Kisty
8/29/2025 | 2:30 PM - 2:45 PM | *PicoWay Laser / $100 Session PicoWay Tattoo Removal Promo | Staff: Beller, Jamie | Location: GloUp - South Tulsa | Client: Swepston, Emma | Notes: form is filled out | Status: Confirmed
8/29/2025 | 2:30 PM - 4:30 PM | *Japanese Head Spa (South) / Platinum Head Spa (brookside) | Staff: Donley, Hailey | Location: GloUp - Brookside | Client: Kidd, Jamie | Status: Confirmed
8/29/2025 | 3:00 PM - 3:15 PM | *PicoWay Laser / *Free First Session - Tattoo Removal | Staff: Smith, Nicole | Location: GloUp - South Tulsa | Client: Aldridge, Jenna | Notes: Form is filled out | Status: Confirmed
8/29/2025 | 3:00 PM - 3:30 PM | Lashes / Blended Mini Fill / $35 | Staff: Porter, Lynetta | Location: Flutter - Broken Arrow | Client: Goodrich, Ebony | Status: Confirmed
8/29/2025 | 3:00 PM - 3:50 PM | Lashes / Classic Fill / $55 | Staff: Ferguson, Kisty | Location: Flutter - Broken Arrow | Client: Eaton, Jennifer | Status: Confirmed
8/29/2025 | 3:00 PM - 3:50 PM | *Hydrafacial (South) / *Special* $110 Hydrafacial - Platinum | Staff: Beller, Jamie | Location: GloUp - South Tulsa | Client: Hatzaw, Kim | Status: Confirmed
8/29/2025 | 3:00 PM - 3:50 PM | Lashes /  Blended Fill / $60 | Staff: Czapansky, Kim | Location: GloUp - South Tulsa | Client: Oropeza, Cynthia | Status: Confirmed
8/29/2025 | 3:00 PM - 3:50 PM | Lashes /  Blended Fill / $60 | Staff: Arredondo, Eva | Location: Flutter - Broken Arrow | Client: Saffell, Chassidy | Status: Booked
8/29/2025 | 3:00 PM - 3:50 PM | Lashes / Classic Fill / $55 | Staff: Grimm, Jacque | Location: Flutter - Broken Arrow | Client: Wright, Janet | Status: Confirmed
8/29/2025 | 3:00 PM - 4:00 PM | Lashes / Bold Mini Fill / $40 | Staff: Reece, Jade | Location: GloUp - Brookside | Client: Pierce, Bridget | Status: Confirmed
8/29/2025 | 3:00 PM - 4:00 PM | *Japanese Head Spa (South) / Signature Head spa | Staff: Fanning, Marina | Location: GloUp - Brookside | Client: Workman, Kenmon | Status: Booked
8/29/2025 | 3:00 PM - 4:00 PM | *Japanese Head Spa (South) / Signature Head spa | Staff: Oviedo, Lupe | Location: GloUp - Brookside | Client: Workman, Morgann | Status: Booked
8/29/2025 | 3:00 PM - 4:00 PM | B | Staff: Wensman, Kelsie
8/29/2025 | 3:30 PM - 4:30 PM | . | Staff: Waddle, Gabriell
8/29/2025 | 4:00 PM - 4:30 PM | Lashes / Blended Mini Fill / $35 | Staff: Smith, Nicole | Location: GloUp - South Tulsa | Client: Busch, Diamond | Status: Confirmed
8/29/2025 | 4:00 PM - 4:50 PM | Lashes /  Blended Fill / $60 | Staff: Ferguson, Kisty | Location: Flutter - Broken Arrow | Client: Allan, Heather | Status: Booked
8/29/2025 | 4:00 PM - 4:50 PM | Lashes / Classic Fill / $55 | Staff: Porter, Lynetta | Location: Flutter - Broken Arrow | Client: Boland, Tara | Status: Booked
8/29/2025 | 4:00 PM - 4:50 PM | Lashes / Classic Fill / $55 | Staff: Brannon, Sydni | Location: GloUp - South Tulsa | Client: Peterson, Brinna | Status: Booked
8/29/2025 | 4:30 PM - 8:00 PM | . | Staff: Arredondo, Eva
8/29/2025 | 5:00 PM - 5:15 PM | *PicoWay Laser / *Free First Session - Tattoo Removal | Staff: Beller, Jamie | Location: GloUp - South Tulsa | Client: Leal , Montana | Notes: form is filled out | Status: Confirmed
8/29/2025 | 5:00 PM - 5:50 PM | Lashes /  Blended Fill / $60 | Staff: Mullings, Jenn | Location: GloUp - South Tulsa | Client: Nuam, Martha | Status: Confirmed
8/29/2025 | 5:00 PM - 6:00 PM | *Japanese Head Spa (South) / Signature Head spa | Staff: Fanning, Marina | Location: GloUp - Brookside | Client: Slife, Britany | Status: Confirmed
8/29/2025 | 5:00 PM - 6:00 PM | Ma | Staff: Porter, Lynetta
8/29/2025 | 5:00 PM - 7:00 PM | *Japanese Head Spa (South) / Platinum Head Spa (brookside) | Staff: Donley, Hailey | Location: GloUp - Brookside | Client: Graham, Dusty | Status: Booked
8/29/2025 | 5:00 PM - 9:00 PM | block | Staff: Brannon, Sydni
8/29/2025 | 5:30 PM - 5:45 PM | *PicoWay Laser / $100 Session Pico Facial Rejuvenation | Staff: Beller, Jamie | Location: GloUp - South Tulsa | Client: Zuniga, Amanda | Status: Booked
8/29/2025 | 5:45 PM - 6:00 PM | *PicoWay Laser / $100 Session PicoWay Tattoo Removal Promo | Staff: Beller, Jamie | Location: GloUp - South Tulsa | Client: Zuniga, Amanda | Status: Booked
8/29/2025 | 6:00 PM - 6:30 PM | Lashes / Blended Mini Fill / $35 | Staff: Mullings, Jenn | Location: GloUp - South Tulsa | Client: Gonzalez, Vicki | Status: Confirmed
8/29/2025 | 7:00 PM - 7:50 PM | Lashes /  Blended Fill / $60 | Staff: Mullings, Jenn | Location: GloUp - South Tulsa | Client: Mulim , Charity | Status: (none)
`);

function parseLines(raw) {
	return raw.split(/\n+/).map(l => l.trim()).filter(Boolean);
}

function splitNameLastCommaFirst(value) {
	// "Last, First Middle" -> { firstName, lastName }
	const parts = String(value || '').split(',').map(s => s.trim());
	if (parts.length >= 2) {
		const lastName = parts[0];
		const first = parts.slice(1).join(' ');
		return { firstName: first || '', lastName };
	}
	return { firstName: value || '', lastName: '' };
}

async function main() {
	log('Fetching reference data...');
	const { users, staff, services, locations } = await getAll();
	const dateStr = '2025-08-29';
	const lines = parseLines(RAW);
	let createdAppointments = 0;
	let createdBlocks = 0;
	let skipped = 0;
	let errors = 0;

	for (const line of lines) {
		try {
			// Expecting: date | time | description | Staff: X | Location: Y | Client: Z | Notes: ... | Status: ...
			const parts = line.split('|').map(p => p.trim());
			const dateToken = parts[0];
			const timeRange = parts[1];
			const desc = parts[2] || '';
			const staffToken = parts.find(p => /^Staff:/i.test(p));
			const locationToken = parts.find(p => /^Location:/i.test(p));
			const clientToken = parts.find(p => /^Client:/i.test(p));
			const notesToken = parts.find(p => /^Notes:/i.test(p));
			const statusToken = parts.find(p => /^Status:/i.test(p));

			const staffName = staffToken ? staffToken.replace(/^Staff:\s*/i, '') : '';
			const locationName = locationToken ? locationToken.replace(/^Location:\s*/i, '') : '';
			const clientName = clientToken ? clientToken.replace(/^Client:\s*/i, '') : '';
			const notes = notesToken ? notesToken.replace(/^Notes:\s*/i, '') : undefined;
			const statusText = statusToken ? statusToken.replace(/^Status:\s*/i, '') : '';

			const staffId = resolveStaffId(staff, staffName);
			if (!staffId) { skipped++; continue; }

			// Handle OFF/Lunch/Block/ROK/Trade/"." as blocks; create staff schedule block for that date
			if (/^(off|block|lunch|rok|trade|\.)$/i.test(desc) || /^ma$/i.test(desc) || /^b$/i.test(desc)) {
				const sched = makeBlockedSchedule(staffId, dateStr, timeRange, desc.toUpperCase());
				if (sched) {
					try {
						await http('POST', '/api/schedules', sched);
						createdBlocks++;
					} catch (e) {
						errors++;
						log('Block create failed:', e.message);
					}
				}
				continue;
			}

			const { start, end } = toCSTISO(dateStr, timeRange);
			if (!start || !end) { skipped++; continue; }

			// Service mapping: take full desc unless it’s obviously prefixed with category marker
			const serviceId = resolveServiceId(services, desc);
			if (!serviceId) { skipped++; continue; }

			let clientId = null;
			if (clientName) {
				const { firstName, lastName } = splitNameLastCommaFirst(clientName);
				const user = await ensureClient(users, firstName, lastName);
				clientId = user?.id || null;
			}
			if (!clientId) { skipped++; continue; }

			const locationId = resolveLocationId(locations, locationName);

			const payload = {
				clientId,
				serviceId,
				staffId,
				startTime: start,
				endTime: end,
				status: statusFromText(statusText),
				notes,
			};
			if (locationId != null) payload.locationId = locationId;

			try {
				await http('POST', '/api/appointments', payload);
				createdAppointments++;
			} catch (e) {
				errors++;
				log('Appointment create failed:', e.message);
			}
		} catch (e) {
			errors++;
			log('Line error:', line, e.message);
		}
	}

	log('Done.', { createdAppointments, createdBlocks, skipped, errors });
}

main().catch(err => { console.error(err); process.exit(1); });
