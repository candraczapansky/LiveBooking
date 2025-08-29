#!/usr/bin/env node
const API = process.env.API_BASE_URL || 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev';

function log(...args) { console.log('[fix-glo-0829]', ...args); }

async function http(method, path, body) {
	const res = await fetch(`${API}${path}`, {
		method,
		headers: { 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined,
	});
	if (!res.ok) {
		const t = await res.text().catch(()=> '');
		throw new Error(`${method} ${path} -> ${res.status}: ${t}`);
	}
	const ct = res.headers.get('content-type') || '';
	if (ct.includes('application/json')) return res.json();
	return res.text();
}

function normalizeName(n) {
	return String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeServiceName(s) {
	const dropPrefixes = [
		/^\*?lashes\s*\/\s*/i,
		/^\*?master lashes\s*\/\s*/i,
		/^\*?japanese head spa \(south\)\s*\/\s*/i,
		/^\*?hydrafacial \(south\)\s*\/\s*/i,
		/^\*?picoway laser\s*\/\s*/i,
		/^\*?brows\s*\/\s*/i,
		/^\*?picoway\s*\/\s*/i,
	];
	let out = String(s || '').replace(/\*/g, '').trim();
	for (const rx of dropPrefixes) out = out.replace(rx, '');
	out = out.replace(/\s*\/\s*\$\d+(?:\.\d{1,2})?/g, '').trim();
	return normalizeName(out);
}

function parseHm(text) {
	const m = String(text).trim().toLowerCase().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
	if (!m) return null;
	let h = parseInt(m[1], 10);
	const mm = parseInt(m[2], 10);
	const ap = m[3];
	if (ap === 'am') { if (h === 12) h = 0; } else { if (h !== 12) h += 12; }
	return { h, m: mm };
}

function toCentralIso(dateStr, hm) {
	return `${dateStr}T${String(hm.h).padStart(2,'0')}:${String(hm.m).padStart(2,'0')}:00-05:00`;
}

function getCentralHM(date) {
	try {
		const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: false });
		const parts = fmt.formatToParts(new Date(date));
		const h = parts.find(p => p.type === 'hour')?.value || '00';
		const m = parts.find(p => p.type === 'minute')?.value || '00';
		return `${h}:${m}`;
	} catch { return null; }
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

function statusMap(s) {
	s = (s||'').toLowerCase();
	if (s.includes('completed')) return 'completed';
	if (s.includes('arrived')) return 'confirmed';
	if (s.includes('booked') || s.includes('confirmed')) return 'confirmed';
	return 'confirmed';
}

(async () => {
	const dateStr = '2025-08-29';
	try {
		const [users, staff, services, appts] = await Promise.all([
			http('GET', '/api/users'),
			http('GET', '/api/staff'),
			http('GET', '/api/services'),
			http('GET', '/api/appointments'),
		]);
		const staffByName = new Map(staff.map(s => [normalizeName(`${s.user?.firstName||''} ${s.user?.lastName||''}`), s]));
		const usersByName = new Map(users.map(u => [normalizeName(`${u.firstName||''} ${u.lastName||''}`), u]));
		const serviceIndex = new Map(services.map(s => [normalizeServiceName(s.name), s]));

		let updated = 0, created = 0, skipped = 0, errors = 0;
		for (const exp of EXPECTED) {
			const staffRec = staffByName.get(normalizeName(exp.staff));
			const userRec = usersByName.get(normalizeName(exp.client));
			const svcRec = serviceIndex.get(normalizeServiceName(exp.service));
			if (!staffRec || !userRec || !svcRec) { skipped++; continue; }

			const startHm = parseHm(exp.start); const endHm = parseHm(exp.end);
			if (!startHm || !endHm) { skipped++; continue; }
			const startIso = toCentralIso(dateStr, startHm);
			const endIso = toCentralIso(dateStr, endHm);
			const targetStartHM = `${String(startHm.h).padStart(2,'0')}:${String(startHm.m).padStart(2,'0')}`;
			const targetEndHM = `${String(endHm.h).padStart(2,'0')}:${String(endHm.m).padStart(2,'0')}`;

			// Find by Central time match + staff/client/service on that date
			const match = (appts || []).find(a => {
				if (a.staffId !== staffRec.id || a.clientId !== userRec.id || a.serviceId !== svcRec.id) return false;
				const d = new Date(a.startTime);
				const dEnd = new Date(a.endTime);
				const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
				if (ymd !== dateStr) return false;
				const hm = getCentralHM(a.startTime);
				const hmEnd = getCentralHM(a.endTime);
				return hm === targetStartHM && hmEnd === targetEndHM;
			});

			if (match) {
				if ((match.locationId ?? null) !== 4) {
					try {
						await http('PUT', `/api/appointments/${match.id}`, { locationId: 4 });
						updated++;
					} catch (e) { errors++; }
				} else {
					skipped++;
				}
			} else {
				try {
					await http('POST', '/api/appointments', {
						clientId: userRec.id,
						serviceId: svcRec.id,
						staffId: staffRec.id,
						locationId: 4,
						startTime: startIso,
						endTime: endIso,
						status: statusMap(exp.status),
						notes: null,
					});
					created++;
				} catch (e) { errors++; }
			}
		}
		console.log(JSON.stringify({ updated, created, skipped, errors }, null, 2));
	} catch (e) {
		console.error('Fix failed:', e);
		process.exit(1);
	}
})();
