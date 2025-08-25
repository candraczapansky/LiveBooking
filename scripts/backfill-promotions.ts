/*
 Minimal backfill script: opt-in all clients to email/sms promotions and SMS account flags,
 while respecting existing email unsubscribes and SMS global opt-outs.
 Run with: tsx scripts/backfill-promotions.ts
*/

import 'dotenv/config';
import { db } from '../server/db.js';
import {
  users,
  emailUnsubscribes,
  systemConfig,
} from '../shared/schema.js';
import { and, eq, like, sql } from 'drizzle-orm';

function normalizePhoneForKey(phone: string | null | undefined): string | null {
  try {
    const trimmed = (phone || '').toString().trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('+')) return trimmed;
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length > 0) return `+${digits}`;
    return null;
  } catch {
    return null;
  }
}

async function main() {
  // Fetch all clients
  const allClients = await db.select().from(users).where(eq(users.role, 'client'));
  console.log(`Loaded ${allClients.length} clients`);

  // Build email unsubscribe set
  const unsubs = await db.select().from(emailUnsubscribes);
  const unsubEmails = new Set((unsubs || []).map((u: any) => (u.email || '').toLowerCase()).filter(Boolean));
  console.log(`Loaded ${unsubs.length} email unsubscribes`);

  // Build SMS opt-out set from system_config (keys like sms_opt_out:+E164)
  const smsOptOutRows = await db.select().from(systemConfig).where(like(systemConfig.key, 'sms_opt_out:%'));
  const smsOptOutPhones = new Set<string>();
  for (const row of smsOptOutRows) {
    const key = (row.key || '') as string;
    const phone = key.split(':')[1];
    if (phone) smsOptOutPhones.add(phone);
  }
  console.log(`Loaded ${smsOptOutRows.length} SMS opt-outs`);

  let updated = 0;
  for (const c of allClients) {
    const lowerEmail = (c.email || '').toLowerCase();
    const normalizedPhone = normalizePhoneForKey(c.phone);
    const isEmailOptedOut = lowerEmail && unsubEmails.has(lowerEmail);
    const isSmsOptedOut = normalizedPhone && smsOptOutPhones.has(normalizedPhone);

    const newEmailPromotions = !isEmailOptedOut;
    const newSmsPromotions = !isSmsOptedOut;

    const needsUpdate =
      (c.emailPromotions !== newEmailPromotions) ||
      (c.smsPromotions !== newSmsPromotions) ||
      (c.smsAccountManagement !== true) ||
      (c.smsAppointmentReminders !== true);

    if (!needsUpdate) continue;

    await db.update(users)
      .set({
        emailPromotions: newEmailPromotions,
        smsPromotions: newSmsPromotions,
        smsAccountManagement: true,
        smsAppointmentReminders: true,
      })
      .where(eq(users.id, c.id));
    updated += 1;
  }

  console.log(`Backfill complete. Updated ${updated} client records.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


