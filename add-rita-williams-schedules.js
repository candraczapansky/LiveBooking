// Create schedules for Rita Williams (staffId=23)
// Location: Flutter - Broken Arrow (locationId=1)
// All Locations entries are blocks (locationId=null, isBlocked=true)

const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffId = 23; // Rita Williams
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
    // Tuesday
    block('Tuesday', '08:00', '09:00', '2025-08-26'),
    block('Tuesday', '08:00', '10:00', '2025-11-04'), // vacay
    avail('Tuesday', '08:00', '14:00', '2025-02-05', '2027-01-13'),
    block('Tuesday', '08:00', '14:00', '2025-09-30'), // maybe in texas.
    block('Tuesday', '11:00', '12:00', '2025-08-26'), // Lashes
    block('Tuesday', '11:00', '14:00', '2025-11-04'),
    block('Tuesday', '12:00', '13:00', '2025-09-02'), // Lashes
    block('Tuesday', '12:00', '14:00', '2025-08-26'),

    // Wednesday
    avail('Wednesday', '07:00', '08:00', '2025-09-03', '2025-09-03'),
    avail('Wednesday', '08:00', '14:00', today, null), // ongoing
    block('Wednesday', '09:00', '14:00', '2025-11-05'), // vacay
    block('Wednesday', '11:00', '14:00', '2025-12-24'), // christmas eve
    block('Wednesday', '13:00', '14:00', '2025-08-27'),

    // Thursday
    avail('Thursday', '07:00', '08:00', '2025-09-04', '2025-09-04'),
    block('Thursday', '08:00', '10:00', '2025-11-27'), // Thanksgiving
    block('Thursday', '08:00', '10:00', '2025-12-25'), // christmas
    avail('Thursday', '08:00', '14:00', today, null), // ongoing
    block('Thursday', '09:00', '10:00', '2025-11-06'),
    block('Thursday', '13:00', '14:00', '2025-09-04'),
    block('Thursday', '13:00', '14:00', '2025-11-06'),

    // Friday
    avail('Friday', '08:00', '14:00', today, null), // ongoing
    block('Friday', '08:00', '14:00', '2025-11-07'), // vacay

    // Saturday
    block('Saturday', '08:00', '09:00', '2025-11-08'),
    avail('Saturday', '08:00', '14:00', today, null), // ongoing
    // Saturday 11:00–14:00 blocks
    block('Saturday', '11:00', '14:00', '2025-09-13'),
    block('Saturday', '11:00', '14:00', '2025-09-27'),
    block('Saturday', '11:00', '14:00', '2025-10-11'),
    block('Saturday', '11:00', '14:00', '2025-10-25'),
    block('Saturday', '11:00', '14:00', '2025-11-08'), // vacay
    block('Saturday', '11:00', '14:00', '2025-11-22'),
    // Saturday 12:00–14:00 blocks
    block('Saturday', '12:00', '14:00', '2025-09-20'),
    block('Saturday', '12:00', '14:00', '2025-10-04'),
    block('Saturday', '12:00', '14:00', '2025-10-18'),
    block('Saturday', '12:00', '14:00', '2025-11-01'),
    block('Saturday', '12:00', '14:00', '2025-11-29'),
    block('Saturday', '12:00', '14:00', '2025-12-13'),
    block('Saturday', '12:00', '14:00', '2025-12-27'),
    // Saturday 13:00–14:00 blocks
    block('Saturday', '13:00', '14:00', '2025-08-30'),
    block('Saturday', '13:00', '14:00', '2025-11-15'),
    block('Saturday', '13:00', '14:00', '2025-12-06'),
    block('Saturday', '13:00', '14:00', '2025-12-20'),
    block('Saturday', '13:00', '14:00', '2026-01-03'),
  ];

  let ok = 0, fail = 0;
  for (const s of schedules) {
    const out = await postSchedule(s);
    if (out) { ok++; console.log('OK', out.id ?? ''); } else { fail++; }
  }
  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

main().catch(err => { console.error(err); process.exit(1); });


