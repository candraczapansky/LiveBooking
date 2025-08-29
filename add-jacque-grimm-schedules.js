// Create schedules for Jacque Grimm (staffId=27)
// Location: Flutter - Broken Arrow (locationId=1)
// All Locations entries are blocks (locationId=null, isBlocked=true)

const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffId = 27; // Jacque Grimm
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
    // Monday
    avail('Monday', '08:00', '09:00', '2025-08-25'),
    block('Monday', '08:00', '16:00', '2025-08-25'),
    avail('Monday', '09:00', '16:00', '2025-08-11', '2025-12-31'),

    // Tuesday
    avail('Tuesday', '08:00', '09:00', '2025-08-26'),
    block('Tuesday', '08:00', '09:00', '2025-08-26'),
    block('Tuesday', '09:00', '10:00', '2025-08-26'), // Lashes
    avail('Tuesday', '09:00', '16:00', '2025-08-12', '2025-12-31'),

    // Wednesday
    block('Wednesday', '09:00', '10:00', '2025-09-03'),
    block('Wednesday', '09:00', '10:00', '2025-10-08'),
    block('Wednesday', '09:00', '11:00', '2025-08-27'),
    avail('Wednesday', '09:00', '16:00', '2025-08-20', '2025-12-31'),
    block('Wednesday', '11:00', '18:00', '2025-09-03'),
    avail('Wednesday', '16:00', '17:00', '2025-08-27', '2025-08-27'),
    avail('Wednesday', '16:00', '17:00', '2025-10-08', '2025-10-08'),

    // Thursday
    avail('Thursday', '09:00', '16:00', '2025-05-08', '2025-08-27'),
    avail('Thursday', '11:00', '18:00', '2025-08-28', '2025-12-31'),

    // Friday
    block('Friday', '09:00', '10:00', '2025-08-29'),
    block('Friday', '09:00', '12:00', '2025-09-05'),
    avail('Friday', '09:00', '16:00', '2025-05-09', '2025-12-31'),
    block('Friday', '13:00', '15:00', '2025-09-19'),
  ];

  let ok = 0, fail = 0;
  for (const s of schedules) {
    const out = await postSchedule(s);
    if (out) { ok++; console.log('OK', out.id ?? ''); } else { fail++; }
  }
  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

main().catch(err => { console.error(err); process.exit(1); });


