// Create ongoing Wed–Sat 10:00–20:00 schedules for Marina (id=5) and Hailey (id=3)
const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const locationId = 2; // GloUp - South Tulsa
const staffIds = [5, 3];
const days = ['Wednesday', 'Thursday', 'Friday', 'Saturday'];

async function post(s) {
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

function sch(staffId, dayOfWeek) {
  return {
    staffId,
    dayOfWeek,
    startTime: '10:00',
    endTime: '20:00',
    locationId,
    serviceCategories: [],
    startDate: new Date().toISOString().slice(0,10),
    endDate: null, // ongoing
    isBlocked: false,
  };
}

async function main() {
  let ok = 0, fail = 0;
  for (const staffId of staffIds) {
    for (const day of days) {
      const out = await post(sch(staffId, day));
      if (out) { ok++; console.log('OK', out.id ?? ''); } else { fail++; }
    }
  }
  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

main().catch(err => { console.error(err); process.exit(1); });
