// Create schedules for Whitley Guey (staffId=17)
// Location: Flutter - Broken Arrow (locationId=1)
// All Locations entries are blocks (locationId=null, isBlocked=true)

const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffId = 17; // Whitley Guey
const flutterId = 1; // Flutter - Broken Arrow

async function postSchedule(s) {
  const res = await fetch(`${BASE}/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(s),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error('Failed:', res.status, text);
    return null;
  }
  try { return JSON.parse(text); } catch { return text; }
}

function avail(dayOfWeek, start, end, startDate, endDate) {
  return {
    staffId,
    dayOfWeek,
    startTime: start,
    endTime: end,
    locationId: flutterId,
    serviceCategories: [],
    startDate,
    endDate: endDate ?? null,
    isBlocked: false,
  };
}

function block(dayOfWeek, start, end, startDate, endDate) {
  return {
    staffId,
    dayOfWeek,
    startTime: start,
    endTime: end,
    locationId: null,
    serviceCategories: [],
    startDate,
    endDate: endDate ?? startDate,
    isBlocked: true,
  };
}

async function main() {
  const schedules = [
    // Wednesday
    avail('Wednesday', '09:00', '14:30', '2025-08-15', '2027-08-06'),
    block('Wednesday', '12:00', '14:30', '2025-08-27'),

    // Thursday
    avail('Thursday', '09:00', '14:30', '2025-08-15', '2027-08-06'),
    block('Thursday', '13:00', '14:30', '2025-08-28'), // Lashes

    // Friday
    avail('Friday', '09:00', '14:30', '2025-08-15', '2027-08-06'),
    block('Friday', '14:00', '15:00', '2025-08-29'),

    // Saturday
    block('Saturday', '10:00', '15:00', new Date().toISOString().slice(0,10), null), // Football (ongoing)
  ];

  let ok = 0, fail = 0;
  for (const s of schedules) {
    const out = await postSchedule(s);
    if (out) { ok++; console.log('OK', out.id ?? ''); } else { fail++; }
  }
  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

main().catch(err => { console.error(err); process.exit(1); });
