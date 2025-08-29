// Create schedules for Nicole Smith (staffId=24)
// Location: GloUp - South Tulsa (locationId=2)
// All Locations entries are blocks (locationId=null, isBlocked=true)

const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffId = 24; // Nicole Smith
const southId = 2; // GloUp - South Tulsa

async function post(s) {
  const res = await fetch(`${BASE}/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(s),
  });
  const t = await res.text();
  if (!res.ok) { console.error('Failed:', res.status, t); return null; }
  try { return JSON.parse(t); } catch { return t; }
}

function avail(dayOfWeek, start, end, startDate, endDate) {
  return { staffId, dayOfWeek, startTime: start, endTime: end, locationId: southId, serviceCategories: [], startDate, endDate: endDate ?? null, isBlocked: false };
}
function block(dayOfWeek, start, end, startDate, endDate) {
  return { staffId, dayOfWeek, startTime: start, endTime: end, locationId: null, serviceCategories: [], startDate, endDate: endDate ?? startDate, isBlocked: true };
}

async function main() {
  const today = new Date().toISOString().slice(0,10);
  const adds = [
    // Monday - day slots
    avail('Monday', '09:00', '14:00', '2025-08-25', '2025-08-25'),
    avail('Monday', '09:00', '14:00', '2025-09-01', '2025-09-01'),
    block('Monday', '09:00', '14:00', '2025-09-01'), // no school
    avail('Monday', '09:00', '14:00', '2025-09-08', '2025-09-08'),
    avail('Monday', '09:00', '14:00', '2025-09-15', '2025-09-15'),
    avail('Monday', '09:00', '14:00', '2025-09-22', '2025-09-22'),
    avail('Monday', '09:00', '14:00', '2025-09-29', '2025-09-29'),
    avail('Monday', '09:00', '14:00', '2025-10-06', '2025-10-06'),
    avail('Monday', '09:00', '14:00', '2025-10-13', '2025-10-13'),
    avail('Monday', '09:00', '14:00', '2025-10-20', '2025-10-20'),
    avail('Monday', '09:00', '14:00', '2025-10-27', '2030-03-04'),
    // Monday - evening
    avail('Monday', '16:00', '20:00', '2025-09-01', '2025-09-01'),
    block('Monday', '16:00', '20:00', '2025-09-01'), // haley bday

    // Tuesday - short morning slots
    avail('Tuesday', '09:00', '10:00', '2025-08-26', '2025-08-26'),
    avail('Tuesday', '09:00', '10:00', '2025-09-02', '2025-09-02'),
    avail('Tuesday', '09:00', '10:00', '2025-09-09', '2025-09-09'),
    avail('Tuesday', '09:00', '10:00', '2025-09-16', '2025-09-16'),
    avail('Tuesday', '09:00', '10:00', '2025-09-23', '2025-09-23'),
    avail('Tuesday', '09:00', '10:00', '2025-09-30', '2025-09-30'),
    avail('Tuesday', '09:00', '10:00', '2025-10-07', '2025-10-07'),
    // Tuesday - long range day
    avail('Tuesday', '09:00', '14:00', '2025-10-14', '2027-06-17'),
    // Tuesday - 11-2 daytime
    avail('Tuesday', '11:00', '14:00', '2025-08-26', '2025-08-26'),
    avail('Tuesday', '11:00', '14:00', '2025-09-02', '2025-09-02'),
    avail('Tuesday', '11:00', '14:00', '2025-09-09', '2025-09-09'),
    avail('Tuesday', '11:00', '14:00', '2025-09-23', '2025-09-23'),
    avail('Tuesday', '11:00', '14:00', '2025-09-30', '2025-09-30'),
    avail('Tuesday', '11:00', '14:00', '2025-10-07', '2025-10-07'),
    avail('Tuesday', '12:00', '14:00', '2025-09-16', '2025-09-16'),

    // Wednesday
    avail('Wednesday', '16:00', '20:00', today, null), // ongoing

    // Thursday - 9-10 singles
    avail('Thursday', '09:00', '10:00', '2025-08-28', '2025-08-28'),
    avail('Thursday', '09:00', '10:00', '2025-09-04', '2025-09-04'),
    avail('Thursday', '09:00', '10:00', '2025-09-11', '2025-09-11'),
    avail('Thursday', '09:00', '10:00', '2025-09-18', '2025-09-18'),
    avail('Thursday', '09:00', '10:00', '2025-09-25', '2025-09-25'),
    avail('Thursday', '09:00', '10:00', '2025-10-02', '2025-10-02'),
    // Thursday - long range day
    avail('Thursday', '09:00', '14:00', '2025-10-09', '2027-06-17'),
    // Thursday - blocks and mid-day slots
    block('Thursday', '10:00', '11:00', '2025-08-28'), // Lashes
    avail('Thursday', '10:00', '13:00', '2025-08-28', '2025-08-28'),
    avail('Thursday', '10:00', '13:00', '2025-09-25', '2025-09-25'),
    avail('Thursday', '10:00', '14:00', '2025-09-11', '2025-09-11'),
    avail('Thursday', '11:00', '13:00', '2025-09-04', '2025-09-04'),
    avail('Thursday', '11:00', '13:00', '2025-09-18', '2025-09-18'),
    avail('Thursday', '11:00', '13:00', '2025-10-02', '2025-10-02'),
    avail('Thursday', '16:00', '17:00', '2025-12-04', '2025-12-04'),

    // Friday - morning 9-1 singles
    avail('Friday', '09:00', '13:00', '2025-08-29', '2025-08-29'),
    avail('Friday', '09:00', '13:00', '2025-09-05', '2025-09-05'),
    avail('Friday', '09:00', '13:00', '2025-09-12', '2025-09-12'),
    block('Friday', '09:00', '13:00', '2025-09-12'), // avery
    avail('Friday', '09:00', '13:00', '2025-09-19', '2025-09-19'),
    avail('Friday', '09:00', '13:00', '2025-09-26', '2025-09-26'),
    avail('Friday', '09:00', '13:00', '2025-10-03', '2025-10-03'),
    avail('Friday', '09:00', '13:00', '2025-10:10'.replace(':', ''), '2025-10-10'),
    avail('Friday', '09:00', '13:00', '2025-10-17', '2025-10-17'),
    block('Friday', '09:00', '13:00', '2025-10-17'),
    avail('Friday', '09:00', '13:00', '2025-11-21', '2025-11-21'),
    // Friday - extended 9-5 days
    avail('Friday', '09:00', '17:00', '2025-10-24', '2025-10-24'),
    avail('Friday', '09:00', '17:00', '2025-10-31', '2025-10-31'),
    avail('Friday', '09:00', '17:00', '2025-11-07', '2025-11-07'),
    avail('Friday', '09:00', '17:00', '2025-11-14', '2025-11-14'),
    avail('Friday', '09:00', '17:00', '2025-11-28', '2027-06-17'),
    // Friday - afternoon add-ons
    avail('Friday', '13:00', '15:00', '2025-11-21', '2025-11-21'),
    avail('Friday', '13:00', '17:00', '2025-08-29', '2025-08-29'),
    avail('Friday', '13:00', '17:00', '2025-09-05', '2025-09-05'),
    avail('Friday', '13:00', '17:00', '2025-09-12', '2025-09-12'),
    avail('Friday', '13:00', '17:00', '2025-09-19', '2025-09-19'),
    avail('Friday', '13:00', '17:00', '2025-09-26', '2025-09-26'),
    avail('Friday', '13:00', '17:00', '2025-10-03', '2025-10-03'),
    avail('Friday', '13:00', '17:00', '2025-10-10', '2025-10-10'),
    avail('Friday', '13:00', '17:00', '2025-10-17', '2025-10-17'),
    block('Friday', '14:00', '17:00', '2025-10-24'), // Broken bow
    block('Friday', '15:00', '19:00', '2025-11-21'), // Concert
    avail('Friday', '17:00', '18:00', '2025-10-17', '2025-10-17'),
    avail('Friday', '17:00', '19:00', '2025-09-12', '2025-09-12'),
    avail('Friday', '18:00', '19:00', '2025-10-17', '2025-10-17'),

    // Saturday
    block('Saturday', '09:00', '10:00', '2025-10-25'),
    avail('Saturday', '09:00', '14:00', today, null), // ongoing
    block('Saturday', '12:00', '14:00', '2025-09-13'),
    block('Saturday', '12:00', '14:00', '2025-10-25'), // Broken bow
  ];

  let ok = 0, fail = 0;
  for (const s of adds) {
    const out = await post(s);
    if (out) { ok++; console.log('OK', out.id ?? ''); } else { fail++; }
  }
  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

main().catch(e => { console.error(e); process.exit(1); });


