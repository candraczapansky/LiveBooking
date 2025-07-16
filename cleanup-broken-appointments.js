// Cleanup script: Delete appointments with missing client, service, or staff
const BASE_URL = 'http://localhost:5000';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

async function deleteAppointment(id) {
  const res = await fetch(`${BASE_URL}/api/appointments/${id}`, { method: 'DELETE' });
  return res.ok;
}

async function main() {
  console.log('Fetching all appointments...');
  const appointments = await fetchJson(`${BASE_URL}/api/appointments`);
  const users = await fetchJson(`${BASE_URL}/api/users`);
  const services = await fetchJson(`${BASE_URL}/api/services`);
  const staff = await fetchJson(`${BASE_URL}/api/staff`);

  const userIds = new Set(users.map(u => u.id));
  const serviceIds = new Set(services.map(s => s.id));
  const staffIds = new Set(staff.map(s => s.id));

  let broken = [];
  let deleted = 0;

  for (const apt of appointments) {
    const hasClient = apt.client && userIds.has(apt.client.id);
    const hasService = apt.service && serviceIds.has(apt.service.id);
    const hasStaff = apt.staff && staffIds.has(apt.staff.id);
    if (!hasClient || !hasService || !hasStaff) {
      broken.push({
        id: apt.id,
        hasClient,
        hasService,
        hasStaff
      });
      const ok = await deleteAppointment(apt.id);
      if (ok) {
        console.log(`Deleted appointment ${apt.id} (client: ${hasClient}, service: ${hasService}, staff: ${hasStaff})`);
        deleted++;
      } else {
        console.log(`Failed to delete appointment ${apt.id}`);
      }
    }
  }

  if (deleted === 0) {
    console.log('No broken appointments found.');
  } else {
    console.log(`\nDeleted ${deleted} broken appointments.`);
  }
}

main().catch(e => {
  console.error('Error during cleanup:', e);
  process.exit(1);
}); 