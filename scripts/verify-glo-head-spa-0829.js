#!/usr/bin/env node
const API = process.env.API_BASE_URL || 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev';

function log(...args) { console.log('[verify-glo-0829]', ...args); }

async function http(method, path) {
	const res = await fetch(`${API}${path}`);
	if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}`);
	return res.json();
}

function normalizeName(n) {
	return String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function toDateKey(d) {
	const dt = new Date(d);
	return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

function toHm(d) {
	const dt = new Date(d);
	return `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
}

function parseHm(text) {
	// text ex: '8:00 am', '1:00 pm', '2:30 pm'
	let t = String(text).trim().toLowerCase();
	const m = t.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
	if (!m) return null;
	let h = parseInt(m[1], 10);
	const mm = parseInt(m[2], 10);
	const ap = m[3];
	if (ap === 'am') { if (h === 12) h = 0; } else { if (h !== 12) h += 12; }
	return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}

function normalizeService(s) {
	const dropPrefixes = [
		/^\*?lashes\s*\/\s*/i,
		/^\*?master lashes\s*\/\s*/i,
		/^\*?japanese head spa \(south\)\s*\/\s*/i,
		/^\*?hydrafacial \(south\)\s*\/\s*/i,
		/^\*?picoway laser\s*\/\s*/i,
		/^\*?brows\s*\/\s*/i,
		/^\*?picoway\s*\/\s*/i,
	];
	let out = String(s || '')
		.replace(/\*/g, '')
		.trim();
	for (const rx of dropPrefixes) out = out.replace(rx, '');
	out = out.replace(/\s*\/\s*\$\d+(?:\.\d{1,2})?/g, '').trim();
	return normalizeName(out);
}

const EXPECTED = [
	{ start: '8:00 am', end: '8:50 am', service: 'Lashes / Natural Volume Fill / $60', staff: 'Jade Reece', client: 'Robin Minchew', status: 'Completed' },
	{ start: '9:00 am', end: '9:50 am', service: 'Lashes /  Blended Fill / $60', staff: 'Jade Reece', client: 'Jennifer Sartin', status: 'Completed' },
	{ start: '10:00 am', end: '11:00 am', service: '*Japanese Head Spa (South) / Signature Head spa', staff: 'Hailey Donley', client: 'John Waligora', status: 'Completed' },
	{ start: '11:00 am', end: '12:00 pm', service: '*Japanese Head Spa (South) / Signature Head spa', staff: 'Marina Fanning', client: 'Rachel Owens', status: 'Completed' },
	{ start: '11:00 am', end: '12:00 pm', service: '*Japanese Head Spa (South) / Signature Head spa', staff: 'Lupe Oviedo', client: 'Dana Warner', status: 'Completed' },
	{ start: '12:30 pm', end: '1:30 pm', service: '*Japanese Head Spa (South) / Signature Head spa', staff: 'Marina Fanning', client: 'Kortney Smith', status: 'Completed' },
	{ start: '1:00 pm', end: '2:00 pm', service: '*Japanese Head Spa (South) / Signature Head spa', staff: 'Lupe Oviedo', client: 'Melissa McPherson', status: 'Arrived' },
	{ start: '1:00 pm', end: '2:00 pm', service: '*Japanese Head Spa (South) / Signature Head spa', staff: 'Hailey Donley', client: 'Jason McPherson', status: 'Arrived' },
	{ start: '2:00 pm', end: '2:30 pm', service: 'Lashes / 15 Minute Fix', staff: 'Jade Reece', client: 'Anita Charles', status: 'Booked' },
	{ start: '2:30 pm', end: '4:30 pm', service: '*Japanese Head Spa (South) / Platinum Head Spa (brookside)', staff: 'Hailey Donley', client: 'Jamie Kidd', status: 'Confirmed' },
	{ start: '3:00 pm', end: '4:00 pm', service: 'Lashes / Bold Mini Fill / $40', staff: 'Jade Reece', client: 'Bridget Pierce', status: 'Confirmed' },
	{ start: '3:00 pm', end: '4:00 pm', service: '*Japanese Head Spa (South) / Signature Head spa', staff: 'Marina Fanning', client: 'Kenmon Workman', status: 'Booked' },
	{ start: '3:00 pm', end: '4:00 pm', service: '*Japanese Head Spa (South) / Signature Head spa', staff: 'Lupe Oviedo', client: 'Morgann Workman', status: 'Booked' },
	{ start: '5:00 pm', end: '6:00 pm', service: '*Japanese Head Spa (South) / Signature Head spa', staff: 'Marina Fanning', client: 'Britany Slife', status: 'Confirmed' },
	{ start: '5:00 pm', end: '7:00 pm', service: '*Japanese Head Spa (South) / Platinum Head Spa (brookside)', staff: 'Hailey Donley', client: 'Dusty Graham', status: 'Booked' },
];

function staffMatch(apt, staffList, expectedStaff) {
	const exp = normalizeName(expectedStaff);
	const st = staffList.find(s => normalizeName(`${s.user?.firstName||''} ${s.user?.lastName||''}`) === exp);
	return st && apt.staffId === st.id;
}

function serviceMatch(apt, services, expectedService) {
	const exp = normalizeService(expectedService);
	const svc = services.find(s => normalizeService(s.name) === exp);
	return svc && apt.serviceId === svc.id;
}

function clientMatch(apt, users, expectedClient) {
	const exp = normalizeName(expectedClient);
	const user = users.find(u => normalizeName(`${u.firstName||''} ${u.lastName||''}`) === exp);
	return user && apt.clientId === user.id;
}

function statusMap(s) {
	s = (s||'').toLowerCase();
	if (s.includes('completed')) return 'completed';
	if (s.includes('arrived')) return 'confirmed';
	if (s.includes('booked') || s.includes('confirmed')) return 'confirmed';
	return 'confirmed';
}

(async () => {
	try {
		const [apts, users, staff, services] = await Promise.all([
			http('GET', '/api/appointments?locationId=4'),
			http('GET', '/api/users'),
			http('GET', '/api/staff'),
			http('GET', '/api/services'),
		]);
		const dateApts = (apts || []).filter(a => toDateKey(a.startTime) === '2025-08-29');
		let found = 0;
		const missing = [];
		for (const exp of EXPECTED) {
			const hmStart = parseHm(exp.start);
			const hmEnd = parseHm(exp.end);
			const candidates = dateApts.filter(a => toHm(a.startTime) === hmStart && toHm(a.endTime) === hmEnd);
			let ok = false;
			for (const a of candidates) {
				if (!staffMatch(a, staff, exp.staff)) continue;
				if (!serviceMatch(a, services, exp.service)) continue;
				if (!clientMatch(a, users, exp.client)) continue;
				ok = true; break;
			}
			if (ok) found++; else missing.push(exp);
		}
		console.log(JSON.stringify({ totalExpected: EXPECTED.length, found, missing }, null, 2));
	} catch (e) {
		console.error('Verification failed:', e);
		process.exit(1);
	}
})();
