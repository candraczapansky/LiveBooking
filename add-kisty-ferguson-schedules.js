// Create schedules for Kisty Ferguson (staffId=10)
// Location: Flutter - Broken Arrow (locationId=1)
// Blocks: All Locations

const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffId = 10; // Kisty Ferguson
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
    endDate,
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
    avail('Sunday', '09:00', '16:00', today, null), // ongoing
    block('Sunday', '14:00', '16:00', '2025-08-31'), // Homework

    // Tuesday
    avail('Tuesday', '11:00', '12:00', '2025-07-01', '2025-08-24'),
    block('Tuesday', '11:00', '12:30', '2025-08-20', '2025-09-01'), // Back in school
    block('Tuesday', '11:00', '13:30', '2025-09-02', '2025-12-09'), // Back in school
    avail('Tuesday', '12:00', '17:00', '2025-01-03', '2025-08-24'),
    block('Tuesday', '12:30', '17:00', '2025-08-26'), // Birthday

    // Wednesday
    avail('Wednesday', '09:00', '16:00', '2025-08-24', '2027-08-21'),
    block('Wednesday', '13:00', '16:00', '2025-08-27'),

    // Friday
    avail('Friday', '09:00', '16:00', today, null), // ongoing
    block('Friday', '09:00', '16:00', '2025-09-26'), // Dallas
    block('Friday', '09:00', '16:00', '2025-10-17'), // OKC
    block('Friday', '14:00', '15:00', '2025-08-29'), // Trade
    avail('Friday', '16:00', '17:00', '2025-08-29', '2025-08-29'),

    // Saturday
    block('Saturday', '09:00', '11:00', '2025-10-18'), // OKC
    avail('Saturday', '09:00', '16:00', today, null), // ongoing
    block('Saturday', '09:00', '17:00', '2025-09-27'), // Dallas
  ];

  let ok = 0, fail = 0;
  for (const s of schedules) {
    const out = await postSchedule(s);
    if (out) { ok++; console.log('OK', out.id ?? ''); } else { fail++; }
  }
  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

main().catch(err => { console.error(err); process.exit(1); });


