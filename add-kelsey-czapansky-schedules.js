// Create schedules for Kelsey Czapansky (staffId=22)
// Location: Flutter - Broken Arrow (locationId=1)
// All Locations entries are blocks (locationId=null, isBlocked=true)

const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffId = 22; // Kelsey Czapansky
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
    // Sunday
    block('Sunday', '10:00', '11:00', '2025-08-31'), // j
    block('Sunday', '10:00', '12:00', '2025-10-05'), // Brinleys Birthdayyy
    avail('Sunday', '10:00', '14:00', today, null), // ongoing
    block('Sunday', '10:30', '14:00', '2025-09-28'), // Jayce’s bday
    block('Sunday', '11:00', '15:00', '2025-09-14'), // Gpa
    block('Sunday', '13:00', '14:00', '2025-10-05'), // Brinleys Birthdayy
    avail('Sunday', '14:00', '15:00', '2025-08-24', '2025-08-24'),

    // Monday
    block('Monday', '10:00', '11:00', '2025-09-01'),
    avail('Monday', '10:00', '20:00', today, null), // ongoing
    block('Monday', '12:00', '20:00', '2025-09-01'), // LD
    block('Monday', '19:00', '20:00', '2025-08-25'), // Coming in early

    // Tuesday
    block('Tuesday', '09:00', '10:00', '2025-09-23'),
    avail('Tuesday', '09:00', '15:00', today, null), // ongoing
    avail('Tuesday', '17:00', '20:00', today, null), // ongoing
    block('Tuesday', '19:00', '20:00', '2025-08-26'),

    // Wednesday
    avail('Wednesday', '09:00', '15:00', today, null), // ongoing
    block('Wednesday', '17:00', '17:30', '2025-08-27'),
    avail('Wednesday', '17:00', '19:00', '2025-08-27', '2025-08-27'),
    block('Wednesday', '18:30', '19:00', '2025-08-27'),

    // Thursday
    block('Thursday', '09:00', '13:00', '2025-08-28'), // A
    avail('Thursday', '09:00', '15:00', today, null), // ongoing
    block('Thursday', '13:00', '14:30', '2025-08-28'), // Lashes

    // Friday
    avail('Friday', '09:00', '15:00', today, null), // ongoing
    block('Friday', '10:00', '15:00', '2025-09-12'),
  ];

  let ok = 0, fail = 0;
  for (const s of schedules) {
    const out = await postSchedule(s);
    if (out) { ok++; console.log('OK', out.id ?? ''); } else { fail++; }
  }
  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

main().catch(err => { console.error(err); process.exit(1); });


