// Create schedules for Anna Keller (staffId=19)
// Location: The Extensionist - Owasso (locationId=3)
// All Locations entries are blocks (locationId=null, isBlocked=true)

const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffId = 19; // Anna Keller
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
  const schedules = [
    // Monday
    avail('Monday', '09:00', '13:00', '2025-09-08'),

    // Tuesday
    block('Tuesday', '09:00', '13:00', '2025-09-02'),
    avail('Tuesday', '09:00', '15:30', new Date().toISOString().slice(0,10), null), // ongoing
    block('Tuesday', '09:00', '17:00', '2025-09-12', '2025-09-20'), // family vacation
    block('Tuesday', '14:00', '16:00', '2025-09-02'),

    // Wednesday
    avail('Wednesday', '09:00', '15:30', new Date().toISOString().slice(0,10), null), // ongoing
    block('Wednesday', '09:00', '17:00', '2025-09-12', '2025-09-20'), // family vacation
    block('Wednesday', '14:30', '15:30', '2025-08-27'), // b

    // Thursday
    avail('Thursday', '09:00', '15:30', new Date().toISOString().slice(0,10), null), // ongoing
    block('Thursday', '09:00', '17:00', '2025-09-12', '2025-09-20'), // family vacation
    block('Thursday', '09:15', '10:00', '2025-09-04'), // extended time for brows

    // Friday
    avail('Friday', '09:00', '15:30', new Date().toISOString().slice(0,10), null), // ongoing
    block('Friday', '09:00', '17:00', '2025-09-12', '2025-09-20'), // family vacation

    // Saturday
    block('Saturday', '09:00', '17:00', '2025-09-12', '2025-09-20'), // family vacation
    avail('Saturday', '11:00', '17:00', '2025-05-10', '2027-01-24'),
  ];

  let ok = 0, fail = 0;
  for (const s of schedules) {
    const out = await postSchedule(s);
    if (out) { ok++; console.log('OK', out.id ?? ''); } else { fail++; }
  }
  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

main().catch(err => { console.error(err); process.exit(1); });
