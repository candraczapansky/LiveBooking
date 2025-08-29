#!/usr/bin/env node
// Assign Jade Reece the requested services with specified commission rates

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
    .replace(/\$\s*\d+(?:\.\d{1,2})?/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function ensureMiniBlock(services, categories) {
  const existing = services.find(s => normalizeName(s.name) === 'mini block');
  if (existing) return existing.id;
  const cat = categories.find(c => String(c.name).toLowerCase().includes('cancellation')) || categories[0];
  const created = await http('POST', '/api/services', { name: 'Mini block', duration: 30, price: 0, categoryId: cat.id });
  return created.id;
}

(async () => {
  // 1) Find Jade
  const staff = await http('GET', '/api/staff');
  const jade = staff.find(s => `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim().toLowerCase() === 'jade reece');
  if (!jade) throw new Error('Jade Reece not found');

  // 2) Load services/categories
  let services = await http('GET', '/api/services');
  const categories = await http('GET', '/api/service-categories');

  // 3) Ensure Mini block exists
  await ensureMiniBlock(services, categories).catch(() => {});
  services = await http('GET', '/api/services');

  const byName = new Map(services.map(s => [normalizeName(s.name), s.id]));

  function resolveId(name) {
    const key = normalizeName(name);
    if (byName.has(key)) return byName.get(key);
    // special handling for promo full set special
    if (key.includes('full set special')) {
      const found = services.find(s => normalizeName(s.name).includes('full set special'));
      if (found) return found.id;
    }
    // fallback: partial contains either direction
    const found = services.find(s => {
      const n = normalizeName(s.name);
      return n === key || n.includes(key) || key.includes(n);
    });
    return found?.id;
  }

  const desired = [
    { name: 'Block', rate: 0 },
    { name: 'Mini block', rate: 0 },
    { name: 'Cancellation Fee', rate: 0 },
    { name: 'Blended Fill / $60', rate: 0.4 },
    { name: 'Blended Full Set / $150', rate: 0.4 },
    { name: 'Blended Extended Fill / $95', rate: 0.4 },
    { name: 'Bold Fill / $65', rate: 0.4 },
    { name: 'Bold Full Set / $175', rate: 0.4 },
    { name: '*$99 Full Set Special!*', rate: 0.4 },
    { name: '15 Minute Fix', rate: 0 },
    { name: 'Blended Mini Fill / $35', rate: 0.4 },
    { name: 'Blended Weekly Fill / $55', rate: 0.4 },
    { name: 'Bold Extended Fill / $105', rate: 0.4 },
    { name: 'Bold Mini Fill / $40', rate: 0.4 },
    { name: 'Bold Weekly Fill / $60', rate: 0.4 },
    { name: 'Classic Fill / $55', rate: 0.4 },
    { name: 'Classic Full Set / $125', rate: 0.4 },
    { name: 'Classic Mini Fill / $30', rate: 0.4 },
    { name: 'Employee Fill / $30', rate: 0.75 },
    { name: 'Employee Full Set / $60', rate: 0.75 },
    { name: 'Eyelash Extension Removal 1/2 Hour / $25', rate: 0.4 },
    { name: 'Eyelash Extension Removal Full Hour / $50', rate: 0.4 },
    { name: 'Model Full Set', rate: 0 },
    { name: 'Natural Full Set / $150', rate: 0.4 },
    { name: 'Natural Volume Extended Fill / $95', rate: 0.4 },
    { name: 'Natural Volume Fill / $60', rate: 0.4 },
    { name: 'Natural Volume Mini Fill / $35', rate: 0.4 },
    { name: 'Outside Fill (coming from another salon) / $85', rate: 0.4 },
    { name: 'Trade Fill', rate: 0 },
    { name: 'Trade Full Set', rate: 0 },
    { name: 'UV Blended Full Set', rate: 0.4 },
    { name: 'UV Blended Full Set', rate: 0.4 },
    { name: 'UV Bold Full Set', rate: 0.4 },
    // Model/Trade Appointments (no pay)
    { name: 'Body Waxing Model', rate: 0 },
    { name: 'Brow Lamination & Tint', rate: 0 },
    { name: 'Brow or Lash Tint', rate: 0 },
    { name: 'Brow or Lip Wax', rate: 0 },
    { name: 'Brow Thread', rate: 0 },
    { name: 'Dermaplane Facial', rate: 0 },
    { name: 'Fibroblast', rate: 0 },
    { name: 'Head Spa', rate: 0 },
    { name: 'Head-spa + Hydra-facial special', rate: 0 },
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
  ];

  // Deduplicate by resolved serviceId, keeping the last specified rate
  const toAssign = new Map();
  for (const item of desired) {
    const id = resolveId(item.name);
    if (!id) {
      // console.warn('Service not found:', item.name);
      continue;
    }
    toAssign.set(id, item.rate);
  }

  // 4) Assign
  for (const [serviceId, rate] of toAssign.entries()) {
    await http('POST', '/api/staff-services', {
      staffId: jade.id,
      serviceId,
      customRate: 0,
      customCommissionRate: rate,
    }).catch(() => {});
  }

  // 5) Verify
  const assigned = await http('GET', `/api/staff-services?staffId=${jade.id}`);
  console.log('Assigned to Jade:', assigned.length);
})();


