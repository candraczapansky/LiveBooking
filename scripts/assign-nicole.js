#!/usr/bin/env node

// Assign Nicole Smith the requested services with specified commission rates

const API_BASE = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3002}`;

async function http(method, path, body) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`${method} ${path} -> ${res.status}: ${txt}`);
  }
  return res.json();
}

function normalizeName(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[“”‘’"']/g, '')
    .replace(/&/g, 'and')
    .replace(/\*+/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\$\s*\d+(?:\.\d{1,2})?/g, '')
    .replace(/[\/_-]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function stripTrailingNonWord(text) {
  return text.replace(/[^a-z0-9]+$/g, '').trim();
}

function buildServiceIndex(services) {
  const index = new Map();
  for (const svc of services) {
    const key = normalizeName(svc.name);
    if (key && !index.has(key)) index.set(key, svc);
    const trimmed = stripTrailingNonWord(key);
    if (trimmed && !index.has(trimmed)) index.set(trimmed, svc);
  }
  return index;
}

async function findStaffByFullName(targetFullName) {
  const staffList = await http('GET', '/api/staff');
  const target = String(targetFullName).trim().toLowerCase();
  // Try matching via nested user object if present
  let staff = staffList.find((s) => {
    const full = `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim().toLowerCase();
    return full === target;
  });
  if (staff) return staff;
  // Try alternative fields sometimes exposed
  staff = staffList.find((s) => {
    const full = `${s.firstName || ''} ${s.lastName || ''}`.trim().toLowerCase();
    return full === target;
  });
  return staff;
}

(async () => {
  const staff = await findStaffByFullName('Nicole Smith');
  if (!staff) {
    console.error('Nicole Smith not found.');
    process.exit(1);
  }
  const staffId = staff.id;

  const allServices = await http('GET', '/api/services');

  const desiredServices = [
    // Japanese Head Spa (ignore marker)
    { name: 'Platinum Head Spa $125', rate: 0.4 },
    { name: 'Signature Head Spa $60', rate: 0.55 },

    // PicoWay Laser
    { name: '$100 Session Pico Facial Rejuvenation', rate: 0.4 },
    { name: '$100 Session PicoWay Tattoo Removal Promo', rate: 0.4 },
    { name: 'Free First Session - PicoWay Facial Rejuvenation', rate: 0 },
    { name: 'Free First Session - Tattoo Removal', rate: 0 },
    { name: 'Extra Large Tattoo Removal Session', rate: 0.4 },
    { name: 'Extra Small Tattoo Removal Session', rate: 0.4 },
    { name: 'Large Tattoo Removal Session', rate: 0.4 },
    { name: 'Medium Tattoo Removal Session', rate: 0.4 },
    { name: 'Numbing Cream', rate: 0.25 },
    { name: 'Picoway Consultation', rate: 0 },
    { name: 'Small Tattoo Removal Session', rate: 0.4 },
    { name: 'Tiny Tattoo Removal Session', rate: 0.4 },

    // Block
    { name: 'Block', rate: 0 },

    // Brows
    { name: 'Brow Threading / $20', rate: 0.4 },

    // Cancellation Fee
    { name: 'Cancellation Fee', rate: 0.5 },

    // Facials
    { name: 'Jelly Facial / $65', rate: 0.4 },

    // Lashes
    { name: 'Blended Fill / $60', rate: 0.45 },
    { name: 'Blended Extended Fill / $95', rate: 0.45 },
    { name: 'Bold Fill / $65', rate: 0.5 },
    { name: 'Bold Full Set / $175', rate: 0.5 },
    { name: '*$99 Full Set Special!*', rate: 0.45 },
    { name: '15 Minute Fix', rate: 0 },
    { name: 'Blended Mini Fill / $35', rate: 0.45 },
    { name: 'Blended Weekly Fill / $55', rate: 0.45 },
    { name: 'Blogger Fill', rate: 0.55 },
    { name: 'Bold Extended Fill / $105', rate: 0.5 },
    { name: 'Bold Mini Fill / $40', rate: 0.5 },
    { name: 'Employee Fill / $30', rate: 0.75 },
    { name: 'Extreme Extended Fill / $150', rate: 0.55 },
    { name: 'Extreme Fill / $85', rate: 0.55 },
    { name: 'Extreme Full Set / $275', rate: 0.55 },
    { name: 'Extreme Mini Fill / $60', rate: 0.55 },
    { name: 'Eyelash Extension Removal 1/2 Hour / $25', rate: 0.5 },
    { name: 'Eyelash Extension Removal Full Hour / $50', rate: 0.5 },
    { name: 'Master Extended Fill / $115', rate: 0.55 },
    { name: 'Master Fill / $70', rate: 0.55 },
    { name: 'Master Full Set / $200', rate: 0.55 },
    { name: 'Outside Fill (coming from another salon) / $85', rate: 0.55 },
    { name: 'Sick Blended Fill / $30', rate: 0.5 },
    { name: 'Sick Bold Fill', rate: 0.5 },
    { name: 'Trade Fill', rate: 0 },
    { name: 'Trade Full Set', rate: 0 },

    // Master Lashes (explicit variants)
    { name: 'Master Fill/ $70', rate: 0.55 },
    { name: 'Master Full Set/ $200', rate: 0.55 },
    { name: 'Master Extended Fill/ $115', rate: 0.55 },
    { name: 'Master Mini Fill/ $45', rate: 0.55 },
    { name: 'Master Weekly Fill', rate: 0.55 },
    { name: 'Master Weekly fill (GloUp South)', rate: 0.55 },
    { name: 'Sick master Fill', rate: 0.55 },

    // Model/Trade Appointments
    { name: 'Body Waxing Model', rate: 0 },
    { name: 'Brow Lamination & Tint', rate: 0 },
    { name: 'Brow or Lash Tint', rate: 0 },
    { name: 'Brow or Lip Wax', rate: 0 },
    { name: 'Brow Thread', rate: 0 },
    { name: 'Dermaplane Facial', rate: 0 },
    { name: 'Fibroblast', rate: 0 },
    { name: 'Head Spa', rate: 0.4 },
    { name: 'Head-spa + Hydra-facial special', rate: 0.4 },
    { name: 'HydraFacial Deluxe', rate: 0.4 },
    { name: 'HydraFacial Platinum', rate: 0.4 },
    { name: 'HydraFacial Signature', rate: 0.4 },
    { name: 'Jelly Facial', rate: 0 },
    { name: 'Lash Fill', rate: 0 },
    { name: 'Lash Full Set', rate: 0 },
    { name: 'Lash Lift', rate: 0 },
    { name: 'Lash Lift & Tint', rate: 0 },
    { name: 'Microneedling Hair PRP/PRF', rate: 0 },
    { name: 'Permanent Jewelry', rate: 0 },
    { name: 'Permanent Makeup', rate: 0 },
    { name: 'Segment Lashes', rate: 0 },
    { name: 'Teeth Whitening', rate: 0 },

    // Permanent Jewelry specifics
    { name: 'Charm for Chain', rate: 0 },
    { name: 'Permanent Jewelry 12"-18" Chain / $55', rate: 0 },
    { name: 'Permanent Jewelry 18"-24" Chain / $65', rate: 0 },
    { name: 'Permanent Jewelry 6"-12" Chain / $45', rate: 0 },
    { name: 'Permanent Jewelry over 24" chain / $75', rate: 0 },
    { name: 'Re-Weld from Other Location / $30', rate: 0 },
    { name: 'Re-weld Jewelry Fix', rate: 0 },
  ];

  const assignedBefore = await http('GET', `/api/staff-services?staffId=${staffId}`).then((list) => list.length);
  let addedCount = 0;
  const missingServices = [];

  const serviceIndex = buildServiceIndex(allServices);

  for (const desired of desiredServices) {
    const targetName = normalizeName(desired.name);
    let service = serviceIndex.get(targetName);
    if (!service) {
      // Targeted aliasing for near-identical names
      const alias1 = targetName.replace(/\bthreading\b/g, 'thread');
      service = serviceIndex.get(alias1) || serviceIndex.get(stripTrailingNonWord(alias1));
    }
    if (!service) {
      missingServices.push(desired.name);
      continue;
    }
    const assignment = {
      staffId,
      serviceId: service.id,
      customRate: 0,
      customCommissionRate: desired.rate,
    };
    try {
      await http('POST', '/api/staff-services', assignment);
      addedCount++;
    } catch (error) {
      if (!String(error).toLowerCase().includes('already')) {
        console.error(`Failed to assign ${desired.name} -> ${service.id}:`, error.message);
      }
    }
  }

  const assignedAfter = await http('GET', `/api/staff-services?staffId=${staffId}`).then((list) => list.length);
  console.log(
    JSON.stringify(
      { staffId, added: addedCount, total: assignedAfter, missing: missingServices },
      null,
      2,
    ),
  );
})().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});


