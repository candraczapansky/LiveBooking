#!/usr/bin/env node

// Assign Jacque Grimm the requested services with specified commission rates

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
  let staff = staffList.find((s) => {
    const full = `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim().toLowerCase();
    return full === target;
  });
  if (staff) return staff;
  staff = staffList.find((s) => {
    const full = `${s.firstName || ''} ${s.lastName || ''}`.trim().toLowerCase();
    return full === target;
  });
  return staff;
}

(async () => {
  const staff = await findStaffByFullName('Jacque Grimm');
  if (!staff) {
    console.error('Jacque Grimm not found.');
    process.exit(1);
  }
  const staffId = staff.id;

  const allServices = await http('GET', '/api/services');

  const desiredServices = [
    // Block & Cancellation
    { name: 'Block', rate: 0 },
    { name: 'Cancellation Fee', rate: 0.55 },

    // Lashes core
    { name: 'Blended Fill / $60', rate: 0.55 },
    { name: 'Blended Full Set / $150', rate: 0.55 },
    { name: 'Blended Extended Fill / $95', rate: 0.55 },
    { name: 'Bold Fill / $65', rate: 0.55 },
    { name: 'Bold Full Set / $175', rate: 0.55 },
    { name: '*$99 Full Set Special!*', rate: 0.55 },
    { name: '15 Minute Fix', rate: 0 },
    { name: 'Blended Mini Fill / $35', rate: 0.55 },
    { name: 'Blended Weekly Fill / $55', rate: 0.55 },
    { name: 'Bold Extended Fill / $105', rate: 0.55 },
    { name: 'Bold Mini Fill / $40', rate: 0.55 },
    { name: 'Bold Weekly Fill / $60', rate: 0.55 },
    { name: 'Classic Fill / $55', rate: 0.55 },
    { name: 'Classic Full Set / $125', rate: 0.55 },
    { name: 'Classic Mini Fill / $30', rate: 0.55 },
    { name: 'Classic Weekly Fill / $50', rate: 0.55 },
    { name: 'Employee Fill / $30', rate: 0.75 },
    { name: 'Employee Full Set / $60', rate: 0.75 },
    { name: 'Eyelash Extension Removal 1/2 Hour / $25', rate: 0.55 },
    { name: 'Eyelash Extension Removal Full Hour / $50', rate: 0.55 },
    { name: 'Lash Lift & Tint / $85', rate: 0.55 },
    { name: 'Lash Lift / $65', rate: 0.55 },
    { name: 'Lash Lift and Tint Class / $300', rate: 1.0 },
    { name: 'Lash Lift and Tint combo (BA only) / $65', rate: 0.55 },
    { name: 'Master Extended Fill / $115', rate: 0.55 },
    { name: 'Master Fill / $70', rate: 0.55 },
    { name: 'Master Full Set / $200', rate: 0.55 },
    { name: 'Natural Full Set / $150', rate: 0.55 },
    { name: 'Natural Volume Extended Fill / $95', rate: 0.55 },
    { name: 'Natural Volume Fill / $60', rate: 0.55 },
    { name: 'Natural Volume Mini Fill / $35', rate: 0.55 },
    { name: 'Outside Fill (coming from another salon) / $85', rate: 0.55 },
    { name: 'Sick Blended Fill / $30', rate: 0.55 },
    { name: 'Sick Blended Full Set', rate: 0.55 },
    { name: 'Sick Bold Fill', rate: 0.55 },
    { name: 'Sick Classic Fill', rate: 0.55 },
    { name: 'Sick Volume Fill', rate: 0.55 },
    { name: 'Trade Fill', rate: 0 },
    { name: 'Trade Full Set', rate: 0 },

    // Master Lashes explicit variants
    { name: 'Master Fill/ $70', rate: 0.55 },
    { name: 'Master Full Set/ $200', rate: 0.55 },
    { name: 'Master Extended Fill/ $115', rate: 0.55 },
    { name: 'Master Mini Fill/ $45', rate: 0.55 },
    { name: 'Master Weekly Fill', rate: 0.55 },
    { name: 'Master Weekly fill (GloUp South)', rate: 0.55 },
    { name: 'Sick master Fill', rate: 0.55 },

    // Model/Trade Appointments (No pay)
    { name: 'Body Waxing Model', rate: 0 },
    { name: 'Brow Lamination & Tint', rate: 0 },
    { name: 'Brow or Lash Tint', rate: 0 },
    { name: 'Brow or Lip Wax', rate: 0 },
    { name: 'Brow Thread', rate: 0 },
    { name: 'Dermaplane Facial', rate: 0 },
    { name: 'Fibroblast', rate: 0 },
    { name: 'HydraFacial Deluxe', rate: 0 },
    { name: 'HydraFacial Platinum', rate: 0 },
    { name: 'HydraFacial Signature', rate: 0 },
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

    // Teeth Whitening (paid)
    { name: 'Teeth Whitening / $65', rate: 0.4 },
  ];

  const assignedBefore = await http('GET', `/api/staff-services?staffId=${staffId}`).then((list) => list.length);
  let addedCount = 0;
  const missingServices = [];

  for (const desired of desiredServices) {
    const targetName = normalizeName(desired.name);
    const service = allServices.find((s) => normalizeName(s.name) === targetName);
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
        console.error(`Failed to assign ${desired.name} -> ${service?.id}:`, error.message);
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


