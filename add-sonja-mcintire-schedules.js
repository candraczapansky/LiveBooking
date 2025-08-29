// Create schedules for Sonja McIntire (staffId=12)
// Location: GloUp - South Tulsa (locationId=2)
// All Locations entries are blocks (locationId=null, isBlocked=true)

const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffId = 12; // Sonja McIntire
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
  const schedules = [
    // Sunday
    avail('Sunday', '10:00', '18:00', '2025-08-11', '2027-03-11'),
    block('Sunday', '10:00', '19:00', '2026-01-11'),
    block('Sunday', '10:00', '20:00', '2025-08-31'), // Off
    block('Sunday', '12:30', '13:00', '2025-10-19'), // Renee
    block('Sunday', '14:00', '18:00', '2025-09-14'), // Fibroblast
    avail('Sunday', '18:00', '19:00', '2025-09-07'),

    // Monday
    avail('Monday', '11:00', '12:00', '2025-08-25'),
    avail('Monday', '11:30', '12:00', '2025-10-27'),
    avail('Monday', '12:00', '13:00', '2025-08-25'),
    block('Monday', '12:00', '14:15', '2025-09-01'), // Labor day
    avail('Monday', '12:00', '19:00', '2025-09-01'),
    avail('Monday', '12:00', '19:00', '2025-09-02', '2027-03-13'),
    avail('Monday', '13:00', '14:00', '2025-08-25'),
    avail('Monday', '14:00', '18:00', '2025-08-25'),
    block('Monday', '14:15', '18:30', '2025-09-01'), // Labor Day
    block('Monday', '18:30', '19:00', '2025-09-01'), // Labor Day
    avail('Monday', '19:00', '21:00', '2025-09-08'),

    // Tuesday
    avail('Tuesday', '12:00', '20:00', '2025-07-09', '2025-09-01'),
    avail('Tuesday', '12:00', '20:00', '2025-09-02'),
    avail('Tuesday', '12:00', '20:00', '2025-09-03', '2027-03-24'),
    avail('Tuesday', '20:00', '20:30', '2025-09-02'),

    // Wednesday
    block('Wednesday', '10:30', '12:15', '2025-10-15'), // Endo dr 10:45
    avail('Wednesday', '12:00', '20:00', '2025-07-10', '2025-09-02'),
    avail('Wednesday', '12:00', '20:00', '2025-09-03'),
    avail('Wednesday', '12:00', '20:00', new Date().toISOString().slice(0,10), null), // ongoing from today

    // Thursday
    block('Thursday', '09:00', '09:15', '2025-09-11'), // dr. Sarah
    avail('Thursday', '12:00', '20:00', '2025-08-22', '2027-05-29'),
    block('Thursday', '17:00', '18:00', '2025-08-28'),
    block('Thursday', '19:30', '20:00', '2025-08-28'),
  ];

  let ok = 0, fail = 0;
  for (const s of schedules) {
    const out = await postSchedule(s);
    if (out) { ok++; console.log('OK', out.id ?? ''); } else { fail++; }
  }
  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

main().catch(err => { console.error(err); process.exit(1); });


