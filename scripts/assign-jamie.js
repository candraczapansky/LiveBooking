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
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function ensureMiniBlock(services) {
  const existing = services.find(s => s && String(s.name).toLowerCase() === 'mini block');
  if (existing) return existing;
  const cats = await http('GET', '/api/service-categories');
  const fallbackCat = cats.find(c => String(c.name).toLowerCase().includes('cancellation')) || cats[0];
  await http('POST', '/api/services', { name: 'Mini block', duration: 30, price: 0, categoryId: fallbackCat.id });
  const refreshed = await http('GET', '/api/services');
  return refreshed.find(s => s && String(s.name).toLowerCase() === 'mini block');
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
  // Locate Jamie
  const staff = await http('GET', '/api/staff');
  const jamie = staff.find(s => `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim().toLowerCase() === 'jamie beller');
  if (!jamie) throw new Error('Jamie Beller not found');

  // Load services and ensure Mini block exists
  let services = await http('GET', '/api/services');
  await ensureMiniBlock(services);
  services = await http('GET', '/api/services');

  // Desired services and commission rates (blank % -> 0)
  const desired = [
    // Fibroblast
    { name: 'Fibroblast - Consultation $0', rate: 0.40 },
    { name: 'Fibroblast - Eyelid Lift $200', rate: 0.40 },
    { name: 'Fibroblast - Forehead $200', rate: 0.40 },
    { name: 'Fibroblast - Full Face & Neck $400', rate: 0.40 },
    { name: 'Fibroblast - Jowls $300', rate: 0.40 },
    { name: 'Fibroblast - Large Area $400', rate: 0.45 },
    { name: 'Fibroblast - Lip Flip $175', rate: 0.40 },
    { name: 'Fibroblast - Nose $200', rate: 0.40 },
    { name: 'Fibroblast - Under Eyes $200', rate: 0.40 },
    { name: 'Fibroblast Follow up', rate: 0 },
    { name: 'Fibroblast Post Procedure Check Up', rate: 0 },

    // Hydrafacial (South)
    { name: '*Special* $130 Hydrafacial - Deluxe', rate: 0.45 },
    { name: '*Special* $160 Platinum Hydrafacial', rate: 0.45 },
    { name: '*Special* $80 Deluxe Hydrafacial', rate: 0.40 },
    { name: '*Special* $99 Hydrafacial - Signature', rate: 0.40 },
    { name: 'Girls Night Hydrafacial Special', rate: 0.40 },

    // PicoWay Laser
    { name: '$100 Session Pico Facial Rejuvenation', rate: 0.40 },
    { name: '$100 Session PicoWay Tattoo Removal Promo', rate: 0.40 },
    { name: '*Free First Session - PicoWay Facial Rejuvenation', rate: 0 },
    { name: '*Free First Session - Tattoo Removal', rate: 0 },
    { name: 'Extra Large Tattoo Removal Session', rate: 0.40 },
    { name: 'Extra Small Tattoo Removal Session', rate: 0.40 },
    { name: 'Large Tattoo Removal Session', rate: 0.40 },
    { name: 'Medium Tattoo Removal Session', rate: 0.40 },
    { name: 'Numbing Cream', rate: 0.25 },
    { name: 'Picoway Consultation', rate: 0 },
    { name: 'Small Tattoo Removal Session', rate: 0.40 },
    { name: 'Tiny Tattoo Removal Session', rate: 0.40 },

    // Block
    { name: 'Block', rate: 0.45 },
    { name: 'Mini block', rate: 0.45 },

    // Cancellation
    { name: 'Cancellation Fee', rate: 0.50 },

    // Facials
    { name: 'Dermaplane', rate: 0.45 },
    { name: 'Dermaplane / $65', rate: 0.45 },
    { name: 'Employee deluxe hydrafacial', rate: 0.45 },
    { name: 'Employee platinum hydrafacial', rate: 0.45 },
    { name: 'Employee signature hydrafacial', rate: 0.45 },
    { name: 'Jelly Facial / $65', rate: 0.40 },
    { name: 'Spa Combo! (Limited time only) / $99', rate: 0.40 },

    // Lashes
    { name: 'Blended Fill / $60', rate: 0.45 },
    { name: 'Blended Full Set / $150', rate: 0.45 },
    { name: 'Blended Extended Fill / $95', rate: 0.45 },
    { name: 'Bold Fill / $65', rate: 0.50 },
    { name: 'Bold Full Set / $175', rate: 0.50 },
    { name: '15 Minute Fix', rate: 0.45 },
    { name: 'Blended Mini Fill / $35', rate: 0.45 },
    { name: 'Blended Weekly Fill / $55', rate: 0.45 },
    { name: 'Blogger Fill', rate: 0.45 },
    { name: 'Bold Extended Fill / $105', rate: 0.50 },
    { name: 'Bold Mini Fill / $40', rate: 0.50 },
    { name: 'Bold Weekly Fill / $60', rate: 0.50 },
    { name: 'Classic Fill / $55', rate: 0.40 },
    { name: 'Classic Full Set / $125', rate: 0.40 },
    { name: 'Classic Mini Fill / $30', rate: 0.40 },
    { name: 'Classic Weekly Fill / $50', rate: 0.40 },
    { name: 'Employee Fill / $30', rate: 0.75 },
    { name: 'Employee Full Set / $60', rate: 0.45 },
    { name: 'Employee Lash Lift', rate: 0.45 },
    { name: 'Eyelash Extension Removal 1/2 Hour / $25', rate: 0.40 },
    { name: 'Eyelash Extension Removal Full Hour / $50', rate: 0.40 },
    { name: 'Lash Lift & Tint / $85', rate: 0.45 },
    { name: 'Lash Lift / $65', rate: 0.40 },
    { name: 'Lash Lift and Tint Class / $300', rate: 0 },
    { name: 'Lash Lift and Tint combo (BA only) / $65', rate: 0.40 },
    { name: 'Lash Tint / $15', rate: 0.45 },
    { name: 'Master Extended Fill / $115', rate: 0.55 },
    { name: 'Master Fill / $70', rate: 0.55 },
    { name: 'Master Full Set / $200', rate: 0.55 },
    { name: 'Model Full Set', rate: 0.45 },
    { name: 'Natural Full Set / $150', rate: 0.45 },
    { name: 'Natural Volume Extended Fill / $95', rate: 0.45 },
    { name: 'Natural Volume Fill / $60', rate: 0.45 },
    { name: 'Natural Volume Mini Fill / $35', rate: 0.45 },
    { name: 'Outside Fill (coming from another salon) / $85', rate: 0.45 },
    { name: 'Sick Blended Fill / $30', rate: 0.45 },
    { name: 'Sick Blended Full Set', rate: 0.45 },
    { name: 'Sick Bold Fill', rate: 0.45 },
    { name: 'Sick Bold Full Set', rate: 0.45 },
    { name: 'Sick Classic Fill', rate: 0.45 },
    { name: 'Sick Classic Full Set', rate: 0.40 },
    { name: 'Sick Natural Full Set', rate: 0.40 },
    { name: 'Sick Volume Fill', rate: 0.40 },
    { name: 'Trade Fill', rate: 0 },
    { name: 'Trade Full Set', rate: 0 },

    // Master Lashes (additional)
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
    { name: 'Head Spa', rate: 0 },
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
    { name: 'Teeth Whitening / $65', rate: 0.45 },
  ];

  const existingAssignments = await http('GET', `/api/staff-services?staffId=${jamie.id}`);
  const assignedIds = new Set(existingAssignments.map(a => a.serviceId));

  const missing = [];
  const toAssign = [];
  for (const item of desired) {
    const sid = getServiceId(services, item.name);
    if (!sid) {
      missing.push(item.name);
      continue;
    }
    if (!assignedIds.has(sid)) {
      toAssign.push({ serviceId: sid, rate: item.rate });
    }
  }

  for (const { serviceId, rate } of toAssign) {
    try {
      await http('POST', '/api/staff-services', {
        staffId: jamie.id,
        serviceId,
        customRate: 0,
        customCommissionRate: rate,
      });
    } catch (e) {
      // continue on errors to assign the rest
      console.error('assign error', serviceId, e.message);
    }
  }

  const finalAssignments = await http('GET', `/api/staff-services?staffId=${jamie.id}`);
  console.log(JSON.stringify({
    staffId: jamie.id,
    added: toAssign.length,
    total: Array.isArray(finalAssignments) ? finalAssignments.length : finalAssignments,
    missing,
  }, null, 2));
})();


