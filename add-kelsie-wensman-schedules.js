// Create schedules for Kelsie Wensman (staffId=20)
// Location: The Extensionist - Owasso (locationId=3)
// All Locations entries are blocks (locationId=null, isBlocked=true)

const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffId = 20; // Kelsie Wensman
const owassoId = 3; // The Extensionist - Owasso

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
    locationId: owassoId,
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
    block('Monday', '12:00', '17:00', '2025-09-01'),
    avail('Monday', '12:00', '20:00', today, null), // ongoing
    block('Monday', '17:00', '19:00', '2025-09-01'),
    block('Monday', '19:00', '20:00', '2025-08-25'),
    block('Monday', '19:00', '20:00', '2025-09-01'),
    block('Monday', '19:00', '20:00', '2025-09-08'),
    block('Monday', '19:00', '20:00', '2025-09-15'),
    block('Monday', '19:00', '20:00', '2025-09-22'),
    block('Monday', '19:00', '20:00', '2025-09-29'),
    block('Monday', '19:00', '20:00', '2025-10-06'),
    block('Monday', '19:00', '20:00', '2025-10-13'),

    // Tuesday
    avail('Tuesday', '08:00', '16:00', today, null), // ongoing
    avail('Tuesday', '16:00', '17:00', '2025-09-02', '2025-09-02'),
    block('Tuesday', '16:00', '17:00', '2025-09-02'),

    // Wednesday
    block('Wednesday', '08:00', '09:00', '2025-09-03'),
    avail('Wednesday', '08:00', '12:00', today, null), // ongoing
    avail('Wednesday', '12:00', '16:00', today, null), // ongoing
    block('Wednesday', '15:00', '16:00', '2025-08-27'),
    avail('Wednesday', '16:00', '17:00', '2025-09-03', '2025-09-03'),

    // Thursday
    block('Thursday', '08:00', '09:00', '2025-09-11'), // taking dog to vet
    avail('Thursday', '08:00', '16:00', today, null), // ongoing

    // Friday
    avail('Friday', '08:00', '16:00', today, null), // ongoing
    block('Friday', '08:00', '16:00', '2025-10-03'), // birthday
    block('Friday', '12:00', '13:00', '2025-09-12'),
    block('Friday', '12:00', '13:00', '2025-10-17'),
    block('Friday', '12:00', '13:00', '2025-10-31'),
    block('Friday', '12:00', '13:00', '2025-11-14'),
    block('Friday', '12:00', '13:00', '2025-11-28'),
    block('Friday', '13:00', '14:00', '2025-09-05'),
    block('Friday', '13:00', '14:00', '2025-09-19'),
    block('Friday', '13:00', '14:00', '2025-10-17'),
    block('Friday', '13:00', '14:00', '2025-10-31'),
    block('Friday', '13:00', '14:00', '2025-11-14'),
    block('Friday', '13:00', '14:00', '2025-11-28'),
    block('Friday', '13:00', '14:00', '2025-12-12'),
    block('Friday', '13:00', '16:00', '2025-09-12'), // picking dog up from vet
    block('Friday', '14:00', '15:00', '2025-08-29'),
    block('Friday', '15:00', '16:00', '2025-08-29'),
    block('Friday', '14:00', '15:00', '2025-09-05'),
    block('Friday', '14:00', '15:00', '2025-09-19'),
    block('Friday', '14:00', '15:00', '2025-10-17'),
    block('Friday', '14:00', '15:00', '2025-10-31'),
    block('Friday', '14:00', '15:00', '2025-11-14'),
    block('Friday', '14:00', '15:00', '2025-11-28'),
    block('Friday', '14:00', '15:00', '2025-12-12'),
    block('Friday', '15:00', '16:00', '2025-09-05'),
    block('Friday', '15:00', '16:00', '2025-09-19'),
    block('Friday', '15:00', '16:00', '2025-10-17'),
    block('Friday', '15:00', '16:00', '2025-10-31'),
    block('Friday', '15:00', '16:00', '2025-11-14'),
    block('Friday', '15:00', '16:00', '2025-11-28'),
    block('Friday', '15:00', '16:00', '2025-12-12'),

    // Saturday
    block('Saturday', '14:00', '16:00', '2025-01-11', '2026-01-11'), // recurring blocks for year
  ];

  let ok = 0, fail = 0;
  for (const s of schedules) {
    const out = await postSchedule(s);
    if (out) { ok++; console.log('OK', out.id ?? ''); } else { fail++; }
  }
  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

main().catch(err => { console.error(err); process.exit(1); });


