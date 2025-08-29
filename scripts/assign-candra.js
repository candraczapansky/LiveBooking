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
  return String(name).toLowerCase().replace(/\$\s*\d+(?:\.\d{1,2})?/g, '').replace(/\s{2,}/g, ' ').trim();
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
  const staff = await http('GET', '/api/staff');
  const candra = staff.find(s => `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim().toLowerCase() === 'candra czapansky');
  if (!candra) throw new Error('Candra Czapansky not found');

  let services = await http('GET', '/api/services');
  await ensureMiniBlock(services);
  services = await http('GET', '/api/services');

  const names = [
    // Fibroblast
    'Fibroblast - Consultation $0', 'Fibroblast - Eyelid Lift $200', 'Fibroblast - Forehead $200', 'Fibroblast - Full Face & Neck $400', 'Fibroblast - Jowls $300', 'Fibroblast - Large Area $400', 'Fibroblast - Lip Flip $175', 'Fibroblast - Nose $200', 'Fibroblast - Under Eyes $200',
    // Hydrafacial (South)
    '*Special* $130 Hydrafacial - Deluxe', '*Special* $99 Hydrafacial - Signature',
    // Japanese Head Spa (South)
    '*PROMO* Signature Head Spa $50', 'Buccal Massage Facial (brookside)', 'Deluxe Head Spa $90', 'Deluxe Head Spa (brookside)', 'Face Lifting Massage Facial', 'Facial Gua Sha Sculpting', 'High Frequency Comb', 'Korean Glass Skin Facial', 'Lymphatic Neck Massage', 'Oxygen Scalp Therapy', 'Platinum Head Spa $125', 'Platinum Head Spa (brookside)', 'Signature Head spa', 'Signature Head Spa $60', 'Ultimate Luxe Head Spa',
    // Permanent Makeup
    'Eyeliner (Lash Line Enhancement) $275', 'Eyeliner Touch Up - 1-2 years $175', 'Lip Blushing $300', 'Nano Brows $300', 'Permanent Makeup Consultation / $0', 'Powder Brow $300', 'Powder Brow Touch Up - 1-2 years $200', 'Powder Brow Touch Up - 2-3 years $250', 'Powder Brow Touch Up - Up to 1 year $150', 'Touch up $0', 'Touch Up $75',
    // PicoWay Laser
    '$100 Session Pico Facial Rejuvenation', '$100 Session PicoWay Tattoo Removal Promo', '*Free First Session - PicoWay Facial Rejuvenation', '*Free First Session - Tattoo Removal', 'Extra Large Tattoo Removal Session', 'Extra Small Tattoo Removal Session', 'Large Tattoo Removal Session', 'Medium Tattoo Removal Session', 'Numbing Cream', 'Picoway Consultation', 'Small Tattoo Removal Session', 'Tiny Tattoo Removal Session',
    // Block
    'Block', 'Mini block',
    // Botox & Brows & Cancellation
    'Botox Party Deposit', 'Employee Brow Lam', 'Eyebrow Threading $20', 'Cancellation Fee', 'Permanent Makeup Cancellation',
    // Facials / Microneedling
    'Dermaplane / $65', 'Jelly Facial / $65', 'Microneedling / $125', 'Spa Combo! (Limited time only) / $99',
    // Lash Class
    'Lash class', 'Lash Class Deposit',
    // Lashes
    'Blended Fill / $60', 'Blended Full Set / $150', 'Blended Extended Fill / $95', 'Bold Fill / $65', 'Bold Full Set / $175', '*$99 Full Set Special!*', '15 Minute Fix', 'Blended Mini Fill / $35', 'Blended Weekly Fill / $55', 'Blogger Fill', 'Bold Extended Fill / $105', 'Bold Mini Fill / $40', 'Bold Weekly Fill / $60', 'Classic Fill / $55', 'Classic Full Set / $125', 'Classic Mini Fill / $30', 'Classic Weekly Fill / $50', 'Employee Fill / $30', 'Employee Full Set / $60', 'Employee Lash Lift', 'Extreme Extended Fill / $150', 'Extreme Fill / $85', 'Extreme Full Set / $275', 'Extreme Mini Fill / $60', 'Eyelash Extension Removal 1/2 Hour / $25', 'Eyelash Extension Removal Full Hour / $50', 'Lash Lift & Tint / $85', 'Lash lift & tint w/ Whitley $65', 'Lash Lift / $65', 'Lash Lift and Tint Class / $300', 'Lash Lift and Tint combo (BA only) / $65', 'Lash Tint / $15', 'Master Extended Fill / $115', 'Master Fill / $70', 'Master Full Set / $200', 'Model Full Set', 'Natural Full Set / $150', 'Natural Volume Extended Fill / $95', 'Natural Volume Fill / $60', 'Natural Volume Mini Fill / $35', 'Outside Fill (coming from another salon) / $85', 'Segment Lashes', 'Segment Lashes', 'Sick Blended Fill / $30', 'Sick Blended Full Set', 'Sick Bold Fill', 'Sick Bold Full Set', 'Sick Classic Fill', 'Sick Classic Full Set', 'Sick Natural Full Set', 'Sick Volume Fill', 'Trade Fill', 'Trade Full Set', 'UV Blended Full Set', 'UV Blended Full Set', 'UV Bold Full Set', 'UV Glue Classic Full Set',
    // Master Lashes
    'Master Fill/ $70', 'Master Full Set/ $200', 'Master Extended Fill/ $115', 'Master Mini Fill/ $45', 'Master Weekly Fill', 'Master Weekly fill (GloUp South)', 'Sick master Fill',
    // Model/Trade Appointments
    'Body Waxing Model', 'Brow Lamination & Tint', 'Brow or Lash Tint', 'Brow or Lip Wax', 'Brow Thread', 'Dermaplane Facial', 'Fibroblast', 'Head Spa', 'Head-spa + Hydra-facial special', 'HydraFacial Deluxe', 'HydraFacial Platinum', 'HydraFacial Signature', 'Jelly Facial', 'Lash Fill', 'Lash Full Set', 'Lash Lift', 'Lash Lift & Tint', 'Microneedling Hair PRP/PRF', 'Permanent Jewelry', 'Permanent Makeup', 'Segment Lashes', 'Teeth Whitening',
    // Permanent Jewelry
    'Charm for Chain', 'Permanent Jewelry 12"-18" Chain / $55', 'Permanent Jewelry 18"-24" Chain / $65', 'Permanent Jewelry 6"-12" Chain / $45', 'Permanent Jewelry Model', 'Permanent Jewelry over 24" chain / $75', 'Re-Weld from Other Location / $30', 'Re-weld Jewelry Fix',
    // Teeth Whitening
    'Teeth Whitening / $65',
  ];

  const existingAssignments = await http('GET', `/api/staff-services?staffId=${candra.id}`);
  const assignedIds = new Set(existingAssignments.map(a => a.serviceId));

  const missing = [];
  const toAssign = [];
  for (const n of names) {
    const sid = getServiceId(services, n);
    if (!sid) { missing.push(n); continue; }
    if (!assignedIds.has(sid)) toAssign.push(sid);
  }

  for (const serviceId of toAssign) {
    try {
      await http('POST', '/api/staff-services', {
        staffId: candra.id,
        serviceId,
        customRate: 0,
        customCommissionRate: 0,
      });
    } catch (e) {
      console.error('assign error', serviceId, e.message);
    }
  }

  const finalAssignments = await http('GET', `/api/staff-services?staffId=${candra.id}`);
  console.log(JSON.stringify({ staffId: candra.id, added: toAssign.length, total: Array.isArray(finalAssignments)?finalAssignments.length:finalAssignments, missing }, null, 2));
})();
