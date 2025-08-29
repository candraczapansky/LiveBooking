// Move Marina (5) and Hailey (3) Wed–Sat 10:00–20:00 schedules from locationId 2 to 4
const BASE = 'https://47af059e-e7df-4462-a4ea-be61df9b2343-00-16m9j5e89xdj.kirk.replit.dev/api';
const staffIds = [5, 3];
const days = new Set(['Wednesday', 'Thursday', 'Friday', 'Saturday']);
const oldLocationId = 2;
const newLocationId = 4; // Glo Head Spa

async function getSchedules(staffId) {
  const res = await fetch(`${BASE}/schedules?staffId=${staffId}`);
  if (!res.ok) throw new Error(`Failed to get schedules for staffId=${staffId}`);
  return res.json();
}

async function updateSchedule(id, data) {
  const res = await fetch(`${BASE}/schedules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error('Update failed:', id, res.status, text);
    return null;
  }
  try { return JSON.parse(text); } catch { return text; }
}

async function main() {
  let changed = 0;
  for (const staffId of staffIds) {
    const list = await getSchedules(staffId);
    const targets = list.filter((s) =>
      days.has(s.dayOfWeek) &&
      s.locationId === oldLocationId &&
      String(s.startTime).startsWith('10:00') &&
      String(s.endTime).startsWith('20:00')
    );
    for (const s of targets) {
      const out = await updateSchedule(s.id, { locationId: newLocationId });
      if (out) { changed++; console.log('Updated', s.id); }
    }
  }
  console.log(`Done. Updated: ${changed}`);
}

main().catch((e) => { console.error(e); process.exit(1); });


