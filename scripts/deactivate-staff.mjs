import { config } from 'dotenv';
config();

import { DatabaseStorage } from '../dist/server/storage.js';

async function main() {
  const idArg = process.argv[2];
  if (!idArg) {
    console.error('Usage: node scripts/deactivate-staff.mjs <staffId>');
    process.exit(1);
  }
  const staffId = parseInt(idArg, 10);
  if (!Number.isFinite(staffId)) {
    console.error('Invalid staffId');
    process.exit(1);
  }

  const storage = new DatabaseStorage();
  try {
    const existing = await storage.getStaff(staffId);
    if (!existing) {
      console.error(`Staff ${staffId} not found`);
      process.exit(2);
    }
    const updated = await storage.updateStaff(staffId, { isActive: false });
    console.log(JSON.stringify({ success: true, staffId: updated.id, deactivated: true }));
  } catch (e) {
    console.error('Failed to deactivate staff:', e);
    process.exit(3);
  }
}

main();


