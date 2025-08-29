// Create schedules for Lynetta Porter (staffId=26)
// Location: Flutter - Broken Arrow (locationId=1)
// All Locations entries are blocks (locationId=null, isBlocked=true)

const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffId = 26; // Lynetta Porter
const flutterId = 1; // Flutter - Broken Arrow

async function postSchedule(schedule) {
  const res = await fetch(`${BASE}/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(schedule),
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
    avail('Monday', '13:00', '18:00', '2025-09-22'),
    avail('Monday', '13:00', '18:00', '2025-09-29'),

    // Tuesday
    avail('Tuesday', '10:00', '14:00', '2025-09-16'),
    avail('Tuesday', '12:00', '14:00', '2025-09-02'),
    avail('Tuesday', '13:00', '14:00', '2025-08-26'),
    block('Tuesday', '14:00', '15:00', '2025-08-26'), // Ma
    avail('Tuesday', '14:00', '18:00', '2025-09-02'),
    avail('Tuesday', '14:00', '18:00', '2025-09-09'),
    avail('Tuesday', '14:00', '18:00', '2025-09-23'),
    avail('Tuesday', '14:00', '18:00', '2025-10-07'),
    avail('Tuesday', '14:00', '19:00', '2025-08-26'),
    avail('Tuesday', '14:00', '19:00', '2025-09-30'),
    block('Tuesday', '17:00', '18:00', '2025-08-26'), // Na
    avail('Tuesday', '18:00', '19:00', '2025-09-23'),
    avail('Tuesday', '19:00', '20:00', '2025-08-26'),

    // Wednesday
    avail('Wednesday', '10:00', '17:00', '2025-02-12', '2025-12-17'),
    block('Wednesday', '14:00', '15:00', '2025-08-27'), // Ma
    avail('Wednesday', '18:00', '19:00', '2025-09-03'),

    // Thursday
    block('Thursday', '10:00', '11:00', '2025-08-28'), // Ma
    avail('Thursday', '10:00', '15:00', '2025-08-28'),
    avail('Thursday', '10:00', '15:00', '2025-09-11'),
    avail('Thursday', '10:00', '15:00', '2025-09-25'),
    avail('Thursday', '10:00', '16:00', '2025-09-18'),
    avail('Thursday', '10:00', '16:00', '2025-10-09'),
    avail('Thursday', '10:00', '17:00', '2025-09-04'),
    avail('Thursday', '10:00', '17:00', '2025-10-02'),
    block('Thursday', '11:00', '12:00', '2025-08-28'), // Ma
    avail('Thursday', '15:00', '17:00', '2025-08-28'),
    block('Thursday', '15:00', '17:00', '2025-08-28'), // Na
    avail('Thursday', '15:00', '19:00', '2025-09-11'),
    avail('Thursday', '17:00', '17:15', '2025-08-28'),
    block('Thursday', '17:00', '17:15', '2025-08-28'), // Ma
    avail('Thursday', '17:00', '18:00', '2025-09-04'),

    // Friday
    avail('Friday', '10:00', '13:00', '2025-08-29'),
    avail('Friday', '10:00', '15:00', '2025-09-26'),
    block('Friday', '12:00', '13:00', '2025-08-29'), // Ma
    avail('Friday', '13:00', '14:00', '2025-08-29'),
    avail('Friday', '14:00', '15:00', '2025-08-29'),
    avail('Friday', '14:00', '18:00', '2025-09-05'),
    avail('Friday', '15:00', '15:30', '2025-08-29'),
    avail('Friday', '16:00', '18:00', '2025-08-29'),
    block('Friday', '16:00', '18:00', '2025-09-06', '2026-04-21'), // na (range)
    block('Friday', '17:00', '18:00', '2025-08-29'), // Ma
  ];

  let ok = 0, fail = 0;
  for (const s of schedules) {
    const out = await postSchedule(s);
    if (out) { ok++; console.log('OK', out.id ?? ''); } else { fail++; }
  }
  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

main().catch(err => { console.error(err); process.exit(1); });


