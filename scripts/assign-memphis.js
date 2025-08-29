#!/usr/bin/env node
const API_BASE = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3002}`;

async function http(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`${method} ${path} -> ${res.status}: ${txt}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

function normalizeName(name) {
  return String(name)
    .toLowerCase()
    .replace(/\$\s*\d+(?:\.\d{1,2})?/g, '')
    .replace(/\s*\/\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function getServiceId(services, targetName) {
  const lower = String(targetName).toLowerCase();
  let hit = services.find(s => String(s.name).toLowerCase() === lower);
  if (hit) return hit.id;
  const norm = normalizeName(targetName);
  hit = services.find(s => normalizeName(s.name) === norm);
  return hit?.id;
}

(async () => {
  // Find Memphis Case
  const staff = await http('GET', '/api/staff');
  const memphis = staff.find(s => `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim().toLowerCase() === 'memphis case');
  if (!memphis) throw new Error('Memphis Case not found');

  const services = await http('GET', '/api/services');

  // Desired services and commission rates (No pay/blank -> 0)
  const desired = [
    // Brows
    { name: 'Brow Threading / $20', rate: 0.40 },

    // Cancellation
    { name: 'Cancellation Fee', rate: 0.40 },

    // Facials
    { name: 'Dermaplane / $65', rate: 0.40 },
    { name: 'Jelly Facial / $65', rate: 0.40 },

    // Lashes (40% unless specified)
    { name: 'Blended Fill / $60', rate: 0.40 },
    { name: 'Blended Full Set / $150', rate: 0.40 },
    { name: 'Blended Extended Fill / $95', rate: 0.40 },
    { name: 'Bold Fill / $65', rate: 0.40 },
    { name: 'Bold Full Set / $175', rate: 0.40 },
    { name: '15 Minute Fix', rate: 0 },
    { name: 'Blended Mini Fill / $35', rate: 0.40 },
    { name: 'Blended Weekly Fill / $55', rate: 0.40 },
    { name: 'Bold Extended Fill / $105', rate: 0.40 },
    { name: 'Bold Mini Fill / $40', rate: 0.40 },
    { name: 'Bold Weekly Fill / $60', rate: 0.40 },
    { name: 'Classic Fill / $55', rate: 0.40 },
    { name: 'Classic Full Set / $125', rate: 0.40 },
    { name: 'Classic Mini Fill / $30', rate: 0.40 },
    { name: 'Classic Weekly Fill / $50', rate: 0.40 },
    { name: 'Employee Fill / $30', rate: 0.75 },
    { name: 'Employee Full Set / $60', rate: 0.75 },
    { name: 'Eyelash Extension Removal 1/2 Hour / $25', rate: 0.40 },
    { name: 'Eyelash Extension Removal Full Hour / $50', rate: 0.40 },
    { name: 'Lash Tint / $15', rate: 0.40 },
    { name: 'Model Full Set', rate: 0 },
    { name: 'Natural Full Set / $150', rate: 0.40 },
    { name: 'Natural Volume Extended Fill / $95', rate: 0.40 },
    { name: 'Natural Volume Fill / $60', rate: 0.40 },
    { name: 'Natural Volume Mini Fill / $35', rate: 0.40 },
    { name: 'Outside Fill (coming from another salon) / $85', rate: 0.40 },
    { name: 'Sick Blended Fill / $30', rate: 0.40 },
    { name: 'Sick Blended Full Set', rate: 0.40 },
    { name: 'Trade Fill', rate: 0 },
    { name: 'Trade Full Set', rate: 0 },

    // Model/Trade Appointments (0%)
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

    // Teeth Whitening (non-model)
    { name: 'Teeth Whitening / $65', rate: 0.40 },

    // Waxing employees (0)
    { name: 'Employee Body Wax', rate: 0 },
    { name: 'Employee Lip/Brow', rate: 0 },
  ];

  const existingAssignments = await http('GET', `/api/staff-services?staffId=${memphis.id}`);
  const assignedIds = new Set(existingAssignments.map(a => a.serviceId));

  const missing = [];
  const toAssign = [];
  for (const item of desired) {
    const sid = getServiceId(services, item.name);
    if (!sid) { missing.push(item.name); continue; }
    if (!assignedIds.has(sid)) toAssign.push({ serviceId: sid, rate: item.rate });
  }

  const dedup = new Map();
  for (const t of toAssign) dedup.set(t.serviceId, t.rate);

  for (const [serviceId, rate] of dedup.entries()) {
    try {
      await http('POST', '/api/staff-services', {
        staffId: memphis.id,
        serviceId,
        customRate: 0,
        customCommissionRate: rate,
      });
    } catch (e) {
      console.error('assign error', serviceId, e.message);
    }
  }

  const finalAssignments = await http('GET', `/api/staff-services?staffId=${memphis.id}`);
  console.log(JSON.stringify({ staffId: memphis.id, added: dedup.size, total: Array.isArray(finalAssignments)?finalAssignments.length:finalAssignments, missing }, null, 2));
})();


