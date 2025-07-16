// delete_all_appointments.js
import fetch from 'node-fetch';

console.log('Starting delete_all_appointments.js...');

const API_URL = 'http://localhost:5000/api/appointments';

async function deleteAllAppointments() {
  try {
    console.log('Fetching all appointments...');
    // Fetch all appointments
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Failed to fetch appointments: ' + res.status + ' ' + res.statusText);
    const appointments = await res.json();

    if (!Array.isArray(appointments) || appointments.length === 0) {
      console.log('No appointments to delete.');
      return;
    }

    console.log(`Found ${appointments.length} appointments to delete.`);

    // Delete each appointment
    let deletedCount = 0;
    for (const apt of appointments) {
      try {
        const delRes = await fetch(`${API_URL}/${apt.id}`, { method: 'DELETE' });
        if (delRes.ok) {
          console.log(`✓ Deleted appointment ID: ${apt.id}`);
          deletedCount++;
        } else {
          console.error(`✗ Failed to delete appointment ID: ${apt.id} (Status: ${delRes.status})`);
        }
      } catch (delErr) {
        console.error(`✗ Error deleting appointment ID: ${apt.id}`, delErr);
      }
    }
    
    console.log(`\n✅ Successfully deleted ${deletedCount} out of ${appointments.length} appointments.`);
  } catch (err) {
    console.error('Error in deleteAllAppointments:', err);
  }
}

deleteAllAppointments(); 