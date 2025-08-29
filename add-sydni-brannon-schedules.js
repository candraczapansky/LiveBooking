// Create schedules for Sydni Brannon (staffId=8)
// Available at GloUp - South Tulsa (locationId=2): Tue–Fri 16:00–21:00 with specific date ranges
// Blocks at All Locations for certain dates

const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffId = 8; // Sydni Brannon
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

function avail(dayOfWeek, startDate, endDate) {
  return {
    staffId,
    dayOfWeek,
    startTime: '16:00',
    endTime: '21:00',
    locationId: southTulsaId,
    serviceCategories: [],
    startDate,
    endDate,
    isBlocked: false,
  };
}

function block(dayOfWeek, start, end, date) {
  return {
    staffId,
    dayOfWeek,
    startTime: start,
    endTime: end,
    locationId: null,
    serviceCategories: [],
    startDate: date,
    endDate: date,
    isBlocked: true,
  };
}

async function main() {
  const schedules = [
    // Tuesday availability range + block
    avail('Tuesday', '2025-04-01', '2026-12-20'),
    block('Tuesday', '18:00', '21:00', '2025-08-26'),

    // Wednesday availability range + block
    avail('Wednesday', '2025-04-07', '2026-12-20'),
    block('Wednesday', '16:15', '21:00', '2025-08-27'),

    // Thursday availability range
    avail('Thursday', '2025-04-07', '2026-12-20'),

    // Friday availability range + block
    avail('Friday', '2025-04-07', '2026-12-20'),
    block('Friday', '17:00', '21:00', '2025-08-29'),
  ];

  let ok = 0, fail = 0;
  for (const s of schedules) {
    const out = await postSchedule(s);
    if (out) { ok++; console.log('OK', out.id ?? ''); } else { fail++; }
  }
  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

main().catch(err => { console.error(err); process.exit(1); });
