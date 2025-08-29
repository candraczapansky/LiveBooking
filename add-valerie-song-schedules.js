// Add schedules for Valerie Song per provided specification
// Blocks: locationId = null (All Locations), isBlocked = true
// Available: locationId = 2 (GloUp - South Tulsa), isBlocked = false

const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffId = 9; // Valerie Song
const southTulsaId = 2; // "GloUp" (South Tulsa)

// Utility to post one schedule
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

// Helper to build schedule object
function sch({ dayOfWeek, start, end, startDate, endDate, blocked, locationId }) {
  return {
    staffId,
    dayOfWeek,
    startTime: start,
    endTime: end,
    locationId: locationId ?? null,
    serviceCategories: [],
    startDate,
    endDate: endDate ?? null,
    isBlocked: !!blocked,
  };
}

async function main() {
  const schedules = [
    // Sunday
    sch({ dayOfWeek: 'Sunday', start: '08:00', end: '16:00', startDate: '2025-08-31', endDate: '2025-08-31', blocked: true, locationId: null }),
    sch({ dayOfWeek: 'Sunday', start: '08:00', end: '20:00', startDate: '2025-08-25', endDate: '2027-02-05', blocked: false, locationId: southTulsaId }),
    sch({ dayOfWeek: 'Sunday', start: '09:00', end: '14:00', startDate: '2025-08-24', endDate: '2025-08-24', blocked: false, locationId: southTulsaId }),
    sch({ dayOfWeek: 'Sunday', start: '14:00', end: '20:00', startDate: '2025-08-24', endDate: '2025-08-24', blocked: false, locationId: southTulsaId }),
    sch({ dayOfWeek: 'Sunday', start: '14:45', end: '15:00', startDate: '2025-09-07', endDate: '2025-09-07', blocked: true, locationId: null }),
    sch({ dayOfWeek: 'Sunday', start: '16:00', end: '19:00', startDate: '2025-08-29', endDate: null, blocked: true, locationId: null }), // Ongoing
    sch({ dayOfWeek: 'Sunday', start: '19:00', end: '20:00', startDate: '2025-08-24', endDate: '2025-08-24', blocked: true, locationId: null }),
    sch({ dayOfWeek: 'Sunday', start: '19:00', end: '20:00', startDate: '2025-08-31', endDate: '2025-08-31', blocked: true, locationId: null }),

    // Tuesday
    sch({ dayOfWeek: 'Tuesday', start: '08:00', end: '09:15', startDate: '2025-09-23', endDate: '2025-09-23', blocked: true, locationId: null }),
    sch({ dayOfWeek: 'Tuesday', start: '08:00', end: '20:00', startDate: '2025-07-30', endDate: '2025-08-25', blocked: false, locationId: southTulsaId }),
    sch({ dayOfWeek: 'Tuesday', start: '08:00', end: '20:00', startDate: '2025-08-27', endDate: '2027-03-20', blocked: false, locationId: southTulsaId }),
    sch({ dayOfWeek: 'Tuesday', start: '09:15', end: '14:00', startDate: '2025-08-29', endDate: null, blocked: true, locationId: null }), // Ongoing
    sch({ dayOfWeek: 'Tuesday', start: '11:00', end: '12:00', startDate: '2025-08-26', endDate: '2025-08-26', blocked: true, locationId: null }),
    sch({ dayOfWeek: 'Tuesday', start: '11:00', end: '16:00', startDate: '2025-08-26', endDate: '2025-08-26', blocked: false, locationId: southTulsaId }),
    sch({ dayOfWeek: 'Tuesday', start: '14:00', end: '17:00', startDate: '2025-09-23', endDate: '2025-09-23', blocked: true, locationId: null }),
    sch({ dayOfWeek: 'Tuesday', start: '16:00', end: '20:00', startDate: '2025-08-26', endDate: '2025-08-26', blocked: false, locationId: southTulsaId }),
    sch({ dayOfWeek: 'Tuesday', start: '16:00', end: '20:00', startDate: '2025-09-02', endDate: '2025-09-02', blocked: true, locationId: null }),
    sch({ dayOfWeek: 'Tuesday', start: '17:15', end: '20:00', startDate: '2025-08-26', endDate: '2025-08-26', blocked: true, locationId: null }),
    sch({ dayOfWeek: 'Tuesday', start: '17:15', end: '20:00', startDate: '2025-09-23', endDate: '2025-09-23', blocked: true, locationId: null }),

    // Wednesday
    sch({ dayOfWeek: 'Wednesday', start: '08:00', end: '18:00', startDate: '2025-09-24', endDate: '2025-09-24', blocked: true, locationId: null }),
    sch({ dayOfWeek: 'Wednesday', start: '08:00', end: '20:00', startDate: '2025-08-28', endDate: '2027-02-05', blocked: false, locationId: southTulsaId }),
    sch({ dayOfWeek: 'Wednesday', start: '09:00', end: '10:00', startDate: '2025-08-27', endDate: '2025-08-27', blocked: false, locationId: southTulsaId }),
    sch({ dayOfWeek: 'Wednesday', start: '10:00', end: '20:00', startDate: '2025-08-27', endDate: '2025-08-27', blocked: false, locationId: southTulsaId }),
    sch({ dayOfWeek: 'Wednesday', start: '11:15', end: '16:00', startDate: '2025-08-27', endDate: '2025-08-27', blocked: true, locationId: null }),
    sch({ dayOfWeek: 'Wednesday', start: '16:00', end: '18:00', startDate: '2025-08-27', endDate: '2025-08-27', blocked: true, locationId: null }),
    sch({ dayOfWeek: 'Wednesday', start: '18:00', end: '20:00', startDate: '2025-08-29', endDate: null, blocked: true, locationId: null }), // Ongoing

    // Thursday
    sch({ dayOfWeek: 'Thursday', start: '08:00', end: '08:15', startDate: '2025-08-28', endDate: '2025-08-28', blocked: false, locationId: southTulsaId }),
    sch({ dayOfWeek: 'Thursday', start: '08:00', end: '08:15', startDate: '2025-08-28', endDate: '2025-08-28', blocked: true, locationId: null }),
    sch({ dayOfWeek: 'Thursday', start: '10:00', end: '12:00', startDate: '2025-08-28', endDate: '2025-08-28', blocked: false, locationId: southTulsaId }),
  ];

  let success = 0, failed = 0;
  for (const s of schedules) {
    const out = await postSchedule(s);
    if (out) {
      success++;
      console.log('OK', out.id ?? '');
    } else {
      failed++;
    }
  }
  console.log(`Done. Success: ${success}, Failed: ${failed}`);
}

main().catch(err => { console.error(err); process.exit(1); });


