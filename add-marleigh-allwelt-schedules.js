// Create schedules for Marleigh Allwelt (staffId=29)
// Location: Flutter - Broken Arrow (locationId=1)
// All Locations entries are blocks (locationId=null, isBlocked=true)

const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffId = 29; // Marleigh Allwelt
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
  const today = new Date().toISOString().slice(0,10);
  const schedules = [
    // Sunday - ongoing block
    block('Sunday', '11:00', '19:00', today, null),

    // Monday - ongoing block
    block('Monday', '15:00', '19:00', today, null),

    // Tuesday - blocks and availabilities
    block('Tuesday', '11:00', '12:00', '2025-08-26'),
    avail('Tuesday', '11:00', '12:00', '2025-09-02', '2025-09-02'),
    avail('Tuesday', '11:00', '12:00', '2025-09-09', '2025-09-09'),
    avail('Tuesday', '11:00', '14:00', '2025-08-26', '2025-08-26'),
    avail('Tuesday', '12:00', '13:00', '2025-09-02', '2025-09-02'),
    avail('Tuesday', '12:00', '13:00', '2025-09-09', '2025-09-09'),
    avail('Tuesday', '12:00', '13:00', '2025-09-16', '2025-09-16'),
    avail('Tuesday', '12:00', '13:00', '2025-09-23', '2025-09-23'),
    avail('Tuesday', '12:00', '13:00', '2025-10-07', '2025-10-07'),
    avail('Tuesday', '13:00', '14:00', '2025-09-02', '2025-09-02'),
    avail('Tuesday', '13:00', '14:00', '2025-09-09', '2025-09-09'),
    block('Tuesday', '13:00', '14:00', '2025-09-09'),
    avail('Tuesday', '13:00', '15:00', '2025-09-16', '2025-09-16'),
    avail('Tuesday', '14:00', '15:00', '2025-09-02', '2025-09-02'),
    block('Tuesday', '19:00', '20:00', '2025-09-09'), // B&R

    // Thursday - ongoing block
    block('Thursday', '12:00', '20:00', today, null),

    // Friday - blocks and availabilities
    block('Friday', '10:00', '11:00', '2025-09-12'), // B&R
    avail('Friday', '12:00', '13:00', '2025-08-29', '2025-08-29'),
    block('Friday', '12:00', '13:00', '2025-08-29'),
    avail('Friday', '13:00', '14:00', '2025-09-05', '2025-09-05'),
    avail('Friday', '14:00', '15:00', '2025-08-29', '2025-08-29'),
    block('Friday', '14:00', '15:00', '2025-08-29'), // ROK
  ];

  let ok = 0, fail = 0;
  for (const s of schedules) {
    const out = await postSchedule(s);
    if (out) { ok++; console.log('OK', out.id ?? ''); } else { fail++; }
  }
  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

main().catch(err => { console.error(err); process.exit(1); });


