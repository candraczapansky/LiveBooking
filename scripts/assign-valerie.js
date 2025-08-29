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
  // Find Valerie
  const staff = await http('GET', '/api/staff');
  const valerie = staff.find(s => `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim().toLowerCase() === 'valerie song');
  if (!valerie) throw new Error('Valerie Song not found');

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
    // Head Spa (ignore Japanese marker)
    { name: '*PROMO* Signature Head Spa $50', rate: 0.5 },
    { name: 'Deluxe Head Spa $90', rate: 0.4 },
    { name: 'Platinum Head Spa $125', rate: 0.4 },
    { name: 'Signature Head Spa $60', rate: 0.4 },

    // Permanent Makeup
    { name: 'Lip Blushing $300', rate: 0.4 },
    { name: 'Nano Brow Model $100', rate: 0.5 },
    { name: 'Permanent Makeup Consultation / $0', rate: 0.4 },
    { name: 'Permanent makeup deposit', rate: 0.4 },
    { name: 'Powder Brow $300', rate: 0.4 },
    { name: 'Powder Brow Touch Up - 1-2 years $200', rate: 0.4 },
    { name: 'Powder Brow Touch Up - 2-3 years $250', rate: 0.4 },
    { name: 'Powder Brow Touch Up - Up to 1 year $150', rate: 0.4 },
    { name: 'Referral Special - $150', rate: 0.4 },
    { name: 'Touch up $0', rate: 0.4 },
    { name: 'Touch Up $75', rate: 0.4 },

    // PicoWay Laser
    { name: '$100 Session Pico Facial Rejuvenation', rate: 0.4 },
    { name: '$100 Session PicoWay Tattoo Removal Promo', rate: 0.4 },
    { name: '*Free First Session - PicoWay Facial Rejuvenation', rate: 0 },
    { name: '*Free First Session - Tattoo Removal', rate: 0 },
    { name: 'Extra Large Tattoo Removal Session', rate: 0.4 },
    { name: 'Extra Small Tattoo Removal Session', rate: 0.4 },
    { name: 'Large Tattoo Removal Session', rate: 0.4 },
    { name: 'Medium Tattoo Removal Session', rate: 0.4 },
    { name: 'Numbing Cream', rate: 0.25 },
    { name: 'Picoway Consultation', rate: 0 },
    { name: 'Small Tattoo Removal Session', rate: 0.4 },
    { name: 'Tiny Tattoo Removal Session', rate: 0.4 },

    // Block
    { name: 'Block', rate: 0.4 },
    { name: 'Mini block', rate: 0.4 },

    // Brows
    { name: 'Brow Lamination w/ Tint & Wax / $85', rate: 0.4 },
    { name: 'Eyebrow Tint / $20', rate: 0.4 },
    { name: 'Eyebrow Wax / $20', rate: 0.4 },

    // Cancellation
    { name: 'Cancellation Fee', rate: 0.4 },
    { name: 'Permanent Makeup Cancellation', rate: 0.4 },

    // Facials
    { name: 'Dermaplane / $65', rate: 0.4 },

    // Lashes
    { name: 'Blended Fill / $60', rate: 0.4 },
    { name: 'Blended Full Set / $150', rate: 0.4 },
    { name: 'Blended Extended Fill / $95', rate: 0.4 },
    { name: 'Bold Fill / $65', rate: 0.4 },
    { name: 'Bold Full Set / $175', rate: 0.4 },
    { name: '*$99 Full Set Special!*', rate: 0.4 },
    { name: '15 Minute Fix', rate: 0 },
    { name: 'Blended Mini Fill / $35', rate: 0.4 },
    { name: 'Blended Weekly Fill / $55', rate: 0.4 },
    { name: 'Blogger Fill', rate: 0.4 },
    { name: 'Bold Extended Fill / $105', rate: 0.4 },
    { name: 'Bold Mini Fill / $40', rate: 0.4 },
    { name: 'Bold Weekly Fill / $60', rate: 0.4 },
    { name: 'Classic Fill / $55', rate: 0.4 },
    { name: 'Classic Full Set / $125', rate: 0.4 },
    { name: 'Classic Mini Fill / $30', rate: 0.4 },
    { name: 'Classic Weekly Fill / $50', rate: 0.4 },
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
    { name: 'Sick Blended Fill / $30', rate: 0.4 },
    { name: 'Sick Blended Full Set', rate: 0.4 },
    { name: 'Sick Bold Fill', rate: 0.4 },
    { name: 'Sick Bold Full Set', rate: 0.4 },
    { name: 'Sick Classic Fill', rate: 0.4 },
    { name: 'Sick Classic Full Set', rate: 0.4 },
    { name: 'Sick Natural Full Set', rate: 0.4 },
    { name: 'Sick Volume Fill', rate: 0.4 },
    { name: 'Trade Fill', rate: 0 },
    { name: 'Trade Full Set', rate: 0 },
    { name: 'UV Blended Full Set', rate: 0.4 },
    { name: 'UV Blended Full Set', rate: 0.4 },
    { name: 'UV Bold Full Set', rate: 0.4 },
    { name: 'UV Glue Classic Full Set', rate: 0.4 },

    // Permanent Jewelry
    { name: 'Charm for Chain', rate: 0.4 },
    { name: 'Permanent Jewelry 12"-18" Chain / $55', rate: 0.4 },
    { name: 'Permanent Jewelry 18"-24" Chain / $65', rate: 0.4 },
    { name: 'Permanent Jewelry 6"-12" Chain / $45', rate: 0.4 },
    { name: 'Permanent Jewelry Model', rate: 0.4 },
    { name: 'Permanent Jewelry over 24" chain / $75', rate: 0.4 },
    { name: 'Re-Weld from Other Location / $30', rate: 0.4 },
    { name: 'Re-weld Jewelry Fix', rate: 0.4 },

    // Teeth Whitening
    { name: 'Teeth Whitening / $65', rate: 0.4 },

    // Waxing
    { name: 'Upper Lip $20', rate: 0.4 },

    // Model/Trade specific lines with blanks defaulting to 0
    { name: 'Head Spa', rate: 0 },
    { name: 'Head-spa + Hydra-facial special', rate: 0 },
  ];

  const toAssign = new Map();
  for (const d of desired) {
    const id = resolveId(d.name);
    if (id) toAssign.set(id, d.rate);
  }

  for (const [serviceId, rate] of toAssign.entries()) {
    await http('POST', '/api/staff-services', {
      staffId: valerie.id,
      serviceId,
      customRate: 0,
      customCommissionRate: rate,
    }).catch(() => {});
  }

  const assigned = await http('GET', `/api/staff-services?staffId=${valerie.id}`);
  console.log('Assigned to Valerie:', assigned.length);
})();


