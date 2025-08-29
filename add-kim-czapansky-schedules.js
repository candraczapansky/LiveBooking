// Create schedules for Kim Czapansky (staffId=28)
// Locations: GloUp - South Tulsa (locationId=2), GloUp - Brookside → Glo Head Spa (locationId=4)
// All Locations entries are blocks (locationId=null, isBlocked=true)

const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffId = 28; // Kim Czapansky
const southTulsaId = 2;
const brooksideId = 4; // Mapped to Glo Head Spa (Brookside)

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

function avail(dayOfWeek, start, end, locationId, startDate, endDate) {
  return {
    staffId,
    dayOfWeek,
    startTime: start,
    endTime: end,
    locationId,
    serviceCategories: [],
    startDate,
    endDate: endDate ?? null,
    isBlocked: false,
  };
}

function block(dayOfWeek, start, end, dateOrStart, endDate) {
  return {
    staffId,
    dayOfWeek,
    startTime: start,
    endTime: end,
    locationId: null,
    serviceCategories: [],
    startDate: dateOrStart,
    endDate: endDate ?? dateOrStart,
    isBlocked: true,
  };
}

async function main() {
  const today = new Date().toISOString().slice(0,10);
  const schedules = [
    // Sunday
    block('Sunday', '10:00', '11:00', '2025-08-31'), // Tamara
    avail('Sunday', '10:00', '17:00', brooksideId, '2025-07-27', '2027-07-23'),
    block('Sunday', '10:00', '17:00', '2025-10-05'),
    block('Sunday', '12:00', '13:00', '2025-08-31'),
    block('Sunday', '16:00', '17:00', '2025-08-24'), // Block
    avail('Sunday', '17:00', '18:30', brooksideId, '2025-10-19', '2025-10-19'),

    // Monday (South Tulsa ongoing + specific blocks)
    avail('Monday', '09:00', '16:00', southTulsaId, today, null),
    block('Monday', '11:30', '16:00', '2025-08-25'), // Moms day
    block('Monday', '15:00', '16:00', '2025-09-01'), // Brittney

    // Tuesday
    avail('Tuesday', '09:00', '16:00', southTulsaId, today, null),
    block('Tuesday', '12:00', '13:00', '2025-08-26'),
    block('Tuesday', '15:00', '16:00', '2025-08-26'),

    // Wednesday
    avail('Wednesday', '09:00', '16:00', southTulsaId, today, null),
    block('Wednesday', '09:00', '16:00', '2025-10-01'),

    // Thursday
    avail('Thursday', '09:00', '16:00', southTulsaId, today, null),

    // Friday
    avail('Friday', '09:00', '16:00', southTulsaId, today, null),

    // Saturday
    avail('Saturday', '10:00', '18:00', southTulsaId, today, null),
    block('Saturday', '10:00', '18:00', '2025-08-30'),
    block('Saturday', '10:00', '18:00', '2025-10-04'), // Arkansas
  ];

  let ok = 0, fail = 0;
  for (const s of schedules) {
    const out = await postSchedule(s);
    if (out) { ok++; console.log('OK', out.id ?? ''); } else { fail++; }
  }
  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

main().catch(err => { console.error(err); process.exit(1); });


