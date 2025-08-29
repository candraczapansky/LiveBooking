// Create schedules for Memphis Case (staffId=21)
// Location: The Extensionist - Owasso (locationId=3)
// All Locations entries are blocks (locationId=null, isBlocked=true)

const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffId = 21; // Memphis Case
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
    // Sunday
    block('Sunday', '09:00', '10:00', '2025-08-24'),
    block('Sunday', '09:00', '10:00', '2025-09-07'),
    block('Sunday', '09:00', '10:00', '2025-09-14'),
    block('Sunday', '09:00', '10:00', '2025-09-28'),
    block('Sunday', '09:00', '10:00', '2025-10-05'),
    block('Sunday', '09:00', '10:00', '2025-10-12'),
    block('Sunday', '09:00', '10:00', '2025-10-19'),
    block('Sunday', '09:00', '10:00', '2025-10-26'),
    avail('Sunday', '09:00', '15:00', today, null), // ongoing
    block('Sunday', '09:00', '15:00', '2025-08-31'), // Mom's birthday
    block('Sunday', '09:00', '15:00', '2025-09-21'), // Block
    block('Sunday', '14:00', '15:00', '2025-08-24'),
    block('Sunday', '14:00', '15:00', '2025-09-07'),

    // Monday
    block('Monday', '09:00', '15:00', '2025-09-01'), // Labor Day
    avail('Monday', '10:00', '14:00', '2025-05-12', '2027-04-26'),

    // Tuesday
    avail('Tuesday', '10:00', '14:00', today, null), // ongoing
    block('Tuesday', '12:00', '14:00', '2025-08-26'), // Going to see Grandma

    // Wednesday
    avail('Wednesday', '10:00', '14:00', today, null), // ongoing
    block('Wednesday', '10:00', '14:00', '2025-09-10'),

    // Thursday
    avail('Thursday', '10:00', '14:00', today, null), // ongoing
    block('Thursday', '10:00', '14:00', '2025-08-28'),
    block('Thursday', '10:00', '14:00', '2025-10-02'),
  ];

  let ok = 0, fail = 0;
  for (const s of schedules) {
    const out = await postSchedule(s);
    if (out) { ok++; console.log('OK', out.id ?? ''); } else { fail++; }
  }
  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

main().catch(err => { console.error(err); process.exit(1); });


