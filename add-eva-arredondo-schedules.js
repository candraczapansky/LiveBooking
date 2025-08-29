// Create schedules for Eva Arredondo (staffId=15)
// Location: Flutter - Broken Arrow (locationId=1)
// All Locations entries are blocks (locationId=null, isBlocked=true)

const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffId = 15; // Eva Arredondo
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
  const today = new Date().toISOString().slice(0,10);
  const schedules = [
    // Sunday
    block('Sunday', '09:00', '10:00', '2025-08-24'),
    avail('Sunday', '09:00', '20:00', today, null), // ongoing
    block('Sunday', '12:00', '15:00', '2025-08-24'),
    block('Sunday', '16:00', '17:00', '2025-09-07'), // Xtra time for sharmaine
    block('Sunday', '16:00', '20:00', '2025-08-31'),
    block('Sunday', '17:00', '18:00', '2025-08-24'),

    // Wednesday
    avail('Wednesday', '15:00', '20:00', today, null), // ongoing

    // Thursday
    avail('Thursday', '15:00', '20:00', today, null), // ongoing
    block('Thursday', '15:00', '20:00', '2025-09-04'), // Brothers birthday

    // Friday
    avail('Friday', '09:00', '20:00', today, null), // ongoing
    block('Friday', '12:15', '14:00', '2025-08-29'),
    block('Friday', '13:15', '20:00', '2025-10-31'), // Halloween (13:15 chosen to avoid overlap with 12:15–14:00)
    block('Friday', '14:00', '15:00', '2025-08-29'), // Trade
    block('Friday', '16:30', '20:00', '2025-08-29'),
    block('Friday', '17:00', '20:00', '2025-09-26'),

    // Saturday
    avail('Saturday', '09:00', '20:00', today, null), // ongoing
    block('Saturday', '09:00', '20:00', '2025-09-27'),
    block('Saturday', '13:00', '17:00', '2025-08-30'),
  ];

  let ok = 0, fail = 0;
  for (const s of schedules) {
    const out = await postSchedule(s);
    if (out) { ok++; console.log('OK', out.id ?? ''); } else { fail++; }
  }
  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

main().catch(err => { console.error(err); process.exit(1); });
