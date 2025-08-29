// Create schedules for Jamie Beller (staffId=11)
// Location: GloUp - South Tulsa (locationId=2)
// "All Locations" are blocks (locationId=null, isBlocked=true)

const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffId = 11; // Jamie Beller
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

const today = new Date().toISOString().slice(0,10);

async function main() {
  const schedules = [
    // Sunday
    avail('Sunday', '10:00', '14:00', '2025-08-24'),
    avail('Sunday', '10:00', '14:00', '2025-08-31'),
    block('Sunday', '10:00', '14:00', '2025-08-31'),
    avail('Sunday', '10:00', '14:00', '2025-09-07'),

    // Monday
    avail('Monday', '10:00', '18:00', today, null), // ongoing
    block('Monday', '10:00', '18:00', '2025-09-15'), // Out of town
    block('Monday', '14:00', '18:00', '2026-01-05'), // doc appointment

    // Tuesday
    avail('Tuesday', '10:00', '18:00', today, null), // ongoing
    block('Tuesday', '10:00', '18:00', '2025-09-16'), // Out of town
    block('Tuesday', '16:00', '18:00', '2025-09-09'), // Dentist

    // Wednesday
    avail('Wednesday', '08:00', '09:00', '2025-09-10'),
    avail('Wednesday', '10:00', '18:00', today, null), // ongoing
    block('Wednesday', '10:00', '18:00', '2025-08-27'),
    block('Wednesday', '10:00', '18:00', '2025-09-17'),
    block('Wednesday', '10:00', '18:00', '2025-09-24'),
    block('Wednesday', '10:00', '18:00', '2025-10-01'),
    block('Wednesday', '10:00', '18:00', '2025-10-08'),
    block('Wednesday', '10:00', '18:00', '2025-10-15'),
    block('Wednesday', '10:00', '18:00', '2025-10-22'),
    block('Wednesday', '10:00', '18:00', '2025-10-29'),
    block('Wednesday', '10:00', '18:00', '2025-11-12'),
    block('Wednesday', '16:00', '18:00', '2025-09-10'),

    // Friday
    avail('Friday', '10:00', '18:00', today, null), // ongoing
    block('Friday', '10:00', '18:00', '2025-09-19'), // Out of town

    // Saturday
    block('Saturday', '10:00', '11:00', '2025-09-13'), // out of town
    avail('Saturday', '10:00', '14:00', today, null), // ongoing
    block('Saturday', '10:00', '16:00', '2025-10-25'), // Hard rock party
    block('Saturday', '11:30', '13:00', '2025-09-13'), // Out of town
    block('Saturday', '13:00', '16:00', '2025-09-13'), // Out of town
    block('Saturday', '13:00', '16:00', '2025-10-18'), // Taryn Fibro Model
    block('Saturday', '13:30', '14:00', '2025-09-20'), // Pam O. facial
    avail('Saturday', '14:00', '16:00', today, null), // ongoing
    avail('Saturday', '16:00', '17:00', '2025-09-20', '2025-09-20'),
  ];

  let ok = 0, fail = 0;
  for (const s of schedules) {
    const out = await postSchedule(s);
    if (out) { ok++; console.log('OK', out.id ?? ''); } else { fail++; }
  }
  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

main().catch(err => { console.error(err); process.exit(1); });


