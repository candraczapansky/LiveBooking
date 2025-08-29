// Create schedules for Jade Reece
// Available: GloUp - Brookside => mapped to Glo Head Spa (locationId=4)
// Blocks: All Locations => locationId = null, isBlocked = true

const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffId = 6; // Jade Reece
const brooksideId = 4; // Glo Head Spa (Brookside)

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

function avail(dayOfWeek) {
  return {
    staffId,
    dayOfWeek,
    startTime: '08:00',
    endTime: '16:00',
    locationId: brooksideId,
    serviceCategories: [],
    startDate: new Date().toISOString().slice(0,10), // ongoing from today
    endDate: null,
    isBlocked: false,
  };
}

function block(dayOfWeek, start, end, date) {
  return {
    staffId,
    dayOfWeek,
    startTime: start,
    endTime: end,
    locationId: null,
    serviceCategories: [],
    startDate: date,
    endDate: date,
    isBlocked: true,
  };
}

async function main() {
  const schedules = [
    // Monday
    avail('Monday'),
    block('Monday', '08:00', '16:00', '2025-09-01'), // Labor Day
    block('Monday', '12:00', '13:00', '2025-08-25'), // Lunch
    block('Monday', '12:00', '13:00', '2025-09-08'), // Lunch

    // Tuesday
    avail('Tuesday'),
    block('Tuesday', '11:00', '16:00', '2025-08-26'), // Block
    block('Tuesday', '12:00', '13:00', '2025-09-02'), // Lunch

    // Wednesday
    avail('Wednesday'),
    block('Wednesday', '08:00', '16:00', '2025-08-27'), // Train
    block('Wednesday', '14:30', '15:30', '2025-09-03'), // Lunch

    // Thursday
    block('Thursday', '08:00', '10:00', '2025-09-04'), // Trade
    avail('Thursday'),
    block('Thursday', '10:00', '11:00', '2025-08-28'),
    block('Thursday', '11:00', '12:00', '2025-08-28'), // Lunch
    block('Thursday', '12:00', '13:00', '2025-09-11'), // Lunch
    block('Thursday', '13:30', '16:00', '2025-09-04'), // Dr Visit

    // Friday
    avail('Friday'),
    block('Friday', '11:00', '12:00', '2025-08-29'), // Model Amanda
    block('Friday', '12:00', '13:00', '2025-08-29'), // Lunch
    block('Friday', '12:00', '13:00', '2025-09-05'), // Lunch
    block('Friday', '12:00', '13:00', '2025-09-12'), // Lunch
    block('Friday', '13:00', '14:00', '2025-08-29'), // Model Molly
  ];

  let ok = 0, fail = 0;
  for (const s of schedules) {
    const out = await postSchedule(s);
    if (out) { ok++; console.log('OK', out.id ?? ''); } else { fail++; }
  }
  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

main().catch(err => { console.error(err); process.exit(1); });


