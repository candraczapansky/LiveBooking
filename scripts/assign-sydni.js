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
  return res.json();
}

function normalizeName(name) {
  return String(name).toLowerCase().replace(/\$\s*\d+(?:\.\d{1,2})?/g, '').replace(/\s{2,}/g, ' ').trim();
}

(async () => {
  const staff = await http('GET', '/api/staff');
  const sydni = staff.find(s => `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim().toLowerCase() === 'sydni brannon');
  if (!sydni) throw new Error('Sydni Brannon not found');

  // Ensure Mini block exists
  let services = await http('GET', '/api/services');
  const categories = await http('GET', '/api/service-categories');
  const miniExists = services.some(s => normalizeName(s.name) === 'mini block');
  if (!miniExists) {
    const cat = categories.find(c => String(c.name).toLowerCase().includes('cancellation')) || categories[0];
    try { await http('POST', '/api/services', { name: 'Mini block', duration: 30, price: 0, categoryId: cat.id }); } catch {}
    services = await http('GET', '/api/services');
  }

  const byName = new Map(services.map(s => [normalizeName(s.name), s.id]));
  function resolveId(n) {
    const key = normalizeName(n);
    if (byName.has(key)) return byName.get(key);
    if (key.includes('full set special')) {
      const m = services.find(s => normalizeName(s.name).includes('full set special'));
      if (m) return m.id;
    }
    const candidate = services.find(s => {
      const nn = normalizeName(s.name);
      return nn === key || nn.includes(key) || key.includes(nn);
    });
    return candidate?.id;
  }

  const desired = [
    { name: 'Block', rate: 0 },
    { name: 'Mini block', rate: 0 },
    { name: 'Cancellation Fee', rate: 0.5 },
    { name: 'Blended Fill / $60', rate: 0.45 },
    { name: 'Blended Full Set / $150', rate: 0.45 },
    { name: 'Blended Extended Fill / $95', rate: 0.45 },
    { name: 'Bold Fill / $65', rate: 0.5 },
    { name: 'Bold Full Set / $175', rate: 0.5 },
    { name: '*$99 Full Set Special!*', rate: 0.45 },
    { name: '15 Minute Fix', rate: 0 },
    { name: 'Blended Mini Fill / $35', rate: 0.45 },
    { name: 'Blended Weekly Fill / $55', rate: 0.45 },
    { name: 'Blogger Fill', rate: 0.45 },
    { name: 'Bold Extended Fill / $105', rate: 0.5 },
    { name: 'Bold Mini Fill / $40', rate: 0.5 },
    { name: 'Bold Weekly Fill / $60', rate: 0.5 },
    { name: 'Classic Fill / $55', rate: 0.45 },
    { name: 'Classic Full Set / $125', rate: 0.45 },
    { name: 'Classic Mini Fill / $30', rate: 0.45 },
    { name: 'Classic Weekly Fill / $50', rate: 0.45 },
    { name: 'Employee Fill / $30', rate: 0.75 },
    { name: 'Employee Full Set / $60', rate: 0.75 },
    { name: 'Extreme Extended Fill / $150', rate: 0.55 },
    { name: 'Extreme Fill / $85', rate: 0.55 },
    { name: 'Extreme Full Set / $275', rate: 0.55 },
    { name: 'Extreme Mini Fill / $60', rate: 0.55 },
    { name: 'Eyelash Extension Removal 1/2 Hour / $25', rate: 0.5 },
    { name: 'Eyelash Extension Removal Full Hour / $50', rate: 0.5 },
    { name: 'Model Full Set', rate: 0 },
    { name: 'Natural Full Set / $150', rate: 0.45 },
    { name: 'Natural Volume Extended Fill / $95', rate: 0.45 },
    { name: 'Natural Volume Fill / $60', rate: 0.45 },
    { name: 'Natural Volume Mini Fill / $35', rate: 0.45 },
    { name: 'Outside Fill (coming from another salon) / $85', rate: 0.55 },
    { name: 'Sick Blended Fill / $30', rate: 0.5 },
    { name: 'Sick Blended Full Set', rate: 0.5 },
    { name: 'Sick Bold Fill', rate: 0.5 },
    { name: 'Sick Bold Full Set', rate: 0.5 },
    { name: 'Sick Classic Fill', rate: 0.5 },
    { name: 'Sick Classic Full Set', rate: 0.5 },
    { name: 'Sick Natural Full Set', rate: 0.5 },
    { name: 'Sick Volume Fill', rate: 0.5 },
    { name: 'Trade Fill', rate: 0 },
    { name: 'Trade Full Set', rate: 0 },
    // Model/Trade Appointments (no pay)
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
  ];

  const toAssign = new Map();
  for (const d of desired) {
    const id = resolveId(d.name);
    if (id) toAssign.set(id, d.rate);
  }

  for (const [serviceId, rate] of toAssign.entries()) {
    await http('POST', '/api/staff-services', {
      staffId: sydni.id,
      serviceId,
      customRate: 0,
      customCommissionRate: rate,
    }).catch(() => {});
  }

  const assigned = await http('GET', `/api/staff-services?staffId=${sydni.id}`);
  console.log('Assigned to Sydni:', assigned.length);
})();


