// Create schedules for Jenn Mullings (staffId=14)
// Location: GloUp - South Tulsa (locationId=2)
// All Locations entries are blocks (locationId=null, isBlocked=true)

const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffId = 14; // Jenn Mullings
const southTulsaId = 2; // GloUp - South Tulsa

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
    locationId: southTulsaId,
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
    // Monday
    block('Monday', '17:00', '18:00', '2025-08-25'),
    block('Monday', '17:00', '18:00', '2025-09-08'),
    avail('Monday', '17:00', '20:00', today, null), // ongoing
    block('Monday', '17:00', '20:00', '2025-09-01'), // Labor Day
    block('Monday', '17:00', '20:00', '2025-10-27'), // Out of town

    // Thursday
    avail('Thursday', '17:00', '20:00', today, null), // ongoing
    block('Thursday', '17:00', '20:00', '2025-10-23'), // Out of town
    block('Thursday', '17:00', '20:00', '2025-10-30'),
    block('Thursday', '17:00', '20:00', '2025-11-27'), // Thanksgiving
    block('Thursday', '17:00', '20:00', '2025-12-25'), // Christmas
    block('Thursday', '17:00', '20:00', '2026-01-01'),

    // Friday
    avail('Friday', '17:00', '20:00', today, null), // ongoing
    block('Friday', '17:00', '20:00', '2025-09-05'), // Block
    block('Friday', '17:00', '20:00', '2025-10-24'), // Out of town

    // Saturday
    block('Saturday', '12:00', '14:00', '2025-08-30'),
    avail('Saturday', '12:00', '17:00', today, null), // ongoing
    block('Saturday', '12:00', '17:00', '2025-09-06'), // Block
    block('Saturday', '12:00', '17:00', '2025-10-25'), // Out of town
  ];

  let ok = 0, fail = 0;
  for (const s of schedules) {
    const out = await postSchedule(s);
    if (out) { ok++; console.log('OK', out.id ?? ''); } else { fail++; }
  }
  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

main().catch(err => { console.error(err); process.exit(1); });
