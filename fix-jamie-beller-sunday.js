// Fix Sunday overlaps for Jamie Beller (staffId=11) and add missing single-day entries
const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffId = 11;
const southTulsaId = 2;

async function getSchedules() {
  const res = await fetch(`${BASE}/schedules?staffId=${staffId}`);
  if (!res.ok) throw new Error('Failed to fetch schedules');
  return res.json();
}

async function updateSchedule(id, data) {
  const res = await fetch(`${BASE}/schedules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  try { return JSON.parse(text); } catch { return text; }
}

async function createSchedule(s) {
  const res = await fetch(`${BASE}/schedules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(s),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  try { return JSON.parse(text); } catch { return text; }
}

async function main() {
  const all = await getSchedules();
  const sundaySouth = all.filter(s => s.dayOfWeek === 'Sunday' && s.locationId === southTulsaId);
  const target = sundaySouth.find(s => s.startDate === '2025-08-24' && (s.endDate === null || s.endDate === undefined));
  if (target) {
    await updateSchedule(target.id, { endDate: '2025-08-24' });
    console.log('Updated to single-day:', target.id);
  }
  // Create missing 2025-08-31 and 2025-09-07 single-day entries if absent
  const needDates = ['2025-08-31', '2025-09-07'];
  for (const d of needDates) {
    const exists = sundaySouth.some(s => s.startDate === d);
    if (!exists) {
      const out = await createSchedule({
        staffId,
        dayOfWeek: 'Sunday',
        startTime: '10:00',
        endTime: '14:00',
        locationId: southTulsaId,
        serviceCategories: [],
        startDate: d,
        endDate: d,
        isBlocked: false,
      });
      console.log('Created', out.id);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });


