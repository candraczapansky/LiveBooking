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

function pickCategoryId(categories, serviceName, fallbackId) {
  const lower = serviceName.toLowerCase();
  // Prefer specific categories when available
  const tryNames = [];
  if (lower.includes('permanent jewelry')) tryNames.push('permanent jewelry');
  if (lower.includes('model') || lower.includes('trade')) tryNames.push('model/trade appointments');
  if (lower.includes('teeth whitening')) tryNames.push('teeth whitening');
  for (const key of tryNames) {
    const match = categories.find(c => String(c.name || '').toLowerCase().includes(key));
    if (match) return match.id;
  }
  return fallbackId;
}

(async () => {
  // 1) Ensure we have a category
  let categories = await http('GET', '/api/service-categories');
  let baseCategoryId;
  if (Array.isArray(categories) && categories.length > 0) {
    baseCategoryId = categories[0].id;
  } else {
    const created = await http('POST', '/api/service-categories', {
      name: 'Spa Services',
      description: 'General spa services',
      color: '#8B5CF6',
    });
    baseCategoryId = created.id;
    categories = [created];
  }

  // 2) Fetch current services to avoid duplicates (by normalized name)
  const existing = await http('GET', '/api/services');
  const existingMap = new Map();
  for (const s of existing || []) {
    existingMap.set(normalizeName(s.name), s);
  }

  // 3) Define the missing services we want to ensure exist
  const toEnsure = [
    { name: 'Fibroblast', duration: 50, price: 0 },
    { name: 'Head Spa', duration: 60, price: 0 },
    { name: 'Permanent Jewelry', duration: 30, price: 0 },
    { name: 'Permanent Makeup', duration: 110, price: 0 },
    { name: 'Teeth Whitening', duration: 50, price: 0 },
    { name: 'Re-weld Jewelry Fix', duration: 15, price: 0 },
    { name: 'Teeth Whitening / $65', duration: 50, price: 65 },
  ];

  const created = [];
  for (const svc of toEnsure) {
    const norm = normalizeName(svc.name);
    if (existingMap.has(norm)) continue;
    try {
      const categoryId = pickCategoryId(categories, svc.name, baseCategoryId);
      const payload = {
        name: svc.name,
        duration: svc.duration,
        price: svc.price,
        categoryId,
      };
      const newSvc = await http('POST', '/api/services', payload);
      created.push({ id: newSvc.id, name: newSvc.name });
      existingMap.set(norm, newSvc);
    } catch (e) {
      console.error('create service error', svc.name, e.message);
    }
  }

  console.log(JSON.stringify({ createdCount: created.length, created }, null, 2));
})();



