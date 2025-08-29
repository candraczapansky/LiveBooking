#!/usr/bin/env node
// Minimal, non-destructive importer for service categories and services
// - Creates categories first, then services under each
// - Skips lines like "Add staff" / "Add pricing"
// - Detects durations from trailing numbers or following numeric lines
// - Extracts prices from "$123" or "/ $123" patterns; defaults to 0 when absent
// - Treats names containing "add-on" (any case) as hidden add-ons
// - Skips creating duplicates by name

const API_BASE = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3002}`;

const RAW_INPUT = String(`
FIBROBLAST 

Fibroblast - Consultation $0
15

Fibroblast - Eyelid Lift $200
30

Fibroblast - Forehead $200
30

Fibroblast - Full Face & Neck $400
120

Fibroblast - Jowls $300
45

Fibroblast - Large Area $400
90

Fibroblast - Lip Flip $175
30

Fibroblast - Nose $200
30

Fibroblast - Under Eyes $200
30

Fibroblast Follow up
15

Fibroblast Post Procedure Check Up
15

HYDRAFACIAL
 
*Special* $130 Hydrafacial - Deluxe
45

Add pricing
*Special* $160 Platinum Hydrafacial
50

*Special* $80 Deluxe Hydrafacial
40

*Special* $99 Hydrafacial - Signature
30

Girls Night Hydrafacial Special
30

HEAD SPA 
 
*PROMO* Signature Head Spa $50
45

Blow Dry
Add-on
20

Buccal Facial Massage ADD-ON (brookside)
20

Buccal Massage Facial (brookside)
150

Deluxe Head Spa $90
60

Deluxe Head Spa (brookside)
90

Express Dry Add-On (brookside)
30

Face Lifting Massage Add-On (brookside)
20

Face Lifting Massage Facial
150

Facial Gua Sha Sculpting
5

Gold Vitalizing Dimension Primer
5

Add staff
Gold Vitalizing Dimension Weekly Booster (4pk)
5

Add staff
Head spa w/ Blow dry $60
60

High Frequency Comb
5

High-Frequency Comb Add-On Brookside
10

Korean Glass Skin Facial
60

Lymphatic Neck Massage
5

Oxygen Scalp Therapy
5

Platinum Head Spa $125
90

Platinum Head Spa (brookside)
120

Signature Head spa
60

Signature Head Spa $60
30

Ultimate Luxe Head Spa
150

PERMANENT MAKEUP 
 
Eyeliner (Lash Line Enhancement) $275
120

Eyeliner Touch Up - 1-2 years $175
60

Eyeliner Touch Up - 2-3 years $225
60

Add staff
Eyeliner Touch Up - Up to 1 year $125
60

Add staff
Lip Blush Touch Up - 1-2 years $200
60

Add staff
Lip Blush Touch Up - 2-3 years $250
60

Add staff
Lip Blush Touch Up - Up to 1 year $150
60

Add staff
Lip Blushing $300
180

Nano Brow Model $100
240

Nano Brow Touch Up - 1-2 years $200
60

Add staff
Nano Brow Touch Up - 2-3 years $250
60

Add staff
Nano Brow Touch Up - Up to 1 year $150
60

Add staff
Nano Brows $300
150

Permanent Makeup Consultation / $0
30

Permanent makeup deposit
15

Permanent Makeup Model
180

Add staff
Powder Brow $300
180

Powder Brow Touch Up - 1-2 years $200
60

Powder Brow Touch Up - 2-3 years $250
60

Powder Brow Touch Up - Up to 1 year $150
60

Referral Special - $150
150

Touch up $0
60

Touch Up $75
120

PICOWAY 
 
$100 Session Pico Facial Rejuvenation
Add-on
15

*Free First Session - PicoWay Facial Rejuvenation
15

PICOWAY TATTOO REMOVAL

*Free First Session - Tattoo Removal
15

$100 Session PicoWay Tattoo Removal Promo
Add-on
15

Extra Large Tattoo Removal Session
30

Extra Small Tattoo Removal Session
15

Large Tattoo Removal Session
30

Medium Tattoo Removal Session
15

Numbing Cream
Add-on
15

Picoway Consultation
30

Small Tattoo Removal Session
Add-on
5

Tiny Tattoo Removal Session
5

BOTOX 
 
Botox Party Deposit
10

BROWS 
 
Brow Lamination (a la carte) / $65
30

Brow Lamination w/ Tint & Wax / $85
50

Brow wax & tint combo / $30
60

Employee Brow Lam
60

Eyebrow Threading $20
5

Eyebrow Tint / $20
30

Eyebrow Wax / $20
30

CANCELLATION FEES 
 
Cancellation Fee
60

Permanent Makeup Cancellation
60

FACIALS 
 
Dermaplane
30

Dermaplane / $65
50

Employee deluxe hydrafacial
60

Employee platinum hydrafacial
60

Employee signature hydrafacial
60

Jelly Facial / $65
60

Microneedling / $125
60

Spa Combo! (Limited time only) / $99
120

LASHES 
 
Blended Fill / $60
50

3

Blended Full Set / $150
110

Blended Extended Fill / $95
90

Bold Fill / $65
50

3

Bold Full Set / $175
110

*$99 Full Set Special!*
120

15 Minute Fix
30

Blended Mini Fill / $35
30

Blended Weekly Fill / $55
55

Blogger Fill
60

Bold Extended Fill / $105
80

Bold Mini Fill / $40
30

Bold Weekly Fill / $60
55

Classic Fill / $55
50

3

Classic Full Set / $125
110

Classic Mini Fill / $30
30

Classic Weekly Fill / $50
55

Employee Fill / $30
55

Employee Full Set / $60
110

Employee Lash Lift
60

Extreme Extended Fill / $150
80

Extreme Fill / $85
50

Extreme Full Set / $275
110

Extreme Mini Fill / $60
30

Eyelash Extension Removal 1/2 Hour / $25
30

Eyelash Extension Removal Full Hour / $50
60

Lash Lift & Tint / $85
50

Lash lift & tint w/ Whitley $65
90

Lash Lift / $65
50

Lash Lift and Tint Class / $300
120

Lash Lift and Tint combo (BA only) / $65
60

Lash Tint / $15
30

Master Fill / $70
60

Master Full Set / $200
120

Model Full Set
120

Natural Full Set / $150
110

Natural Volume Extended Fill / $95
80

Natural Volume Fill / $60
50

Natural Volume Mini Fill / $35
30

Outside Fill (coming from another salon) / $85
60

Segment Lashes
30

Segment Lashes
60

Sick Blended Fill / $30
60

Sick Blended Full Set
120

Sick Bold Fill
60

Sick Bold Full Set
120

Sick Classic Fill
60

Sick Classic Full Set
120

Sick Natural Full Set
120

Sick Volume Fill
60

Trade Fill
60

Trade Full Set
120

UV Blended Full Set
120

UV Blended Full Set
120

UV Bold Full Set
120

UV Glue Classic Full Set
110
 
Master Fill/ $70
50

Master Full Set/ $200
110

Master Extended Fill/ $115
80

Master Mini Fill/ $45
30

Master Weekly Fill
60

Master Weekly fill (GloUp South)
60

Sick master Fill
60

MODELS 
 
Body Waxing Model
50

Brow Lamination & Tint
60

Brow or Lash Tint
30

Brow or Lip Wax
30

Brow Thread
30

Dermaplane Facial
50

Fibroblast
50

Head Spa
60

Head-spa + Hydra-facial special
90

HydraFacial Deluxe
60

HydraFacial Platinum
60

HydraFacial Signature
60

Jelly Facial
60

Lash Fill
50

Lash Full Set
110

Lash Lift
50

Lash Lift & Tint
50

Microneedling Hair PRP/PRF
60

Add pricing
Microneedling model/test spot
60

Permanent Jewelry
30

Permanent Makeup
110

Segment Lashes
30

Teeth Whitening
50

PERMANENT JEWELRY 
 
Charm for Chain
Add-on
0

Girls night permanent jewelry special
$40

Permanent Jewelry 12"-18" Chain / $55
Add-on


Permanent Jewelry 18"-24" Chain / $65
Add-on


Permanent Jewelry 6"-12" Chain / $45
Add-on

Permanent Jewelry Model


Permanent Jewelry over 24" chain / $75
Add-on


Re-Weld from Other Location / $30
Add-on


Re-weld Jewelry Fix


 TEETH WHITENING 
Teeth Whitening / $65


WAXING SERVICE CATEGORY 
 
*First Time Brazilian Wax* $30


Arm, Back, and Chest Waxing/ $120


Bikini Line Waxing/ $35


Brazilian Waxing/ $60


Employee Body Wax


Employee Lip/Brow

Full Arm Waxing/ $45


Full Back / $70


Full Back and Full Arm Waxing/ $95


Full Back and Full Chest Waxing/ $90


Full Back and Underarm Waxing/ $80


Full Bikini Waxing/ $42


Full Chest and Half Arm Waxing/ $70


Full Chest Waxing/ $32


Full Face Waxing/ $55


Full Leg and Bikini Line Waxing/$95


Full Leg and Brazilian/ $120


Full Leg Waxing/ $70


Full Upper Body Waxing/ $150


Half Arm Waxing/ $35


Half Leg Waxing/ $40


Stomach and Full Leg/ $90


Stomach and Half Leg Waxing/ $60


Stomach Waxing/ $30


Underarm Waxing/ $25


Underarms and Full Arm Waxing/ $60


Underarms and Half Arm Waxing/ $55


Upper Lip $20
`);

const CATEGORY_HEADINGS = [
  "FIBROBLAST",
  "HYDRAFACIAL",
  "HEAD SPA",
  "PERMANENT MAKEUP",
  "PICOWAY",
  "PICOWAY TATTOO REMOVAL",
  "BOTOX",
  "BROWS",
  "CANCELLATION FEES",
  "FACIALS",
  "LASHES",
  "MODELS",
  "PERMANENT JEWELRY",
  "TEETH WHITENING",
  "WAXING SERVICE CATEGORY"
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function isNumericLine(line) {
  if (!line) return false;
  const m = line.match(/^\d+(?:\.\d+)?$/);
  return !!m;
}

function extractPriceAndCleanName(name) {
  let price = null;
  // Patterns like "/ $65" or "$65" or "$ 65"
  const priceMatch = name.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  if (priceMatch) {
    price = parseFloat(priceMatch[1]);
  }
  const cleaned = name
    .replace(/\/?\s*\$\s*\d+(?:\.\d{1,2})?/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return { price, name: cleaned };
}

function extractTrailingDuration(name) {
  const m = name.match(/^(.*?)(?:\s+(\d+))$/);
  if (m) {
    const base = m[1].trim();
    const duration = parseInt(m[2], 10);
    if (!Number.isNaN(duration)) return { name: base, duration };
  }
  return { name, duration: null };
}

function isAddOn(name) {
  return /add-?on/i.test(name);
}

function normalizeCategory(line) {
  return line.trim().replace(/\s+/g, " ");
}

function parseRawInput(raw) {
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(() => true);
  const result = new Map(); // category -> [service]
  let currentCategory = null;
  let pending = null; // {name, price, isHidden, duration?}

  const IGNORE_LINES = new Set(["Add staff", "Add pricing", "3", "", "/"]);

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (!line || IGNORE_LINES.has(line)) continue;

    // Category heading
    if (CATEGORY_HEADINGS.includes(line.toUpperCase())) {
      currentCategory = normalizeCategory(line.toUpperCase());
      if (!result.has(currentCategory)) result.set(currentCategory, []);
      pending = null;
      continue;
    }

    if (!currentCategory) {
      // Skip anything before first category
      continue;
    }

    // If the line is purely numeric, treat as duration for pending
    if (isNumericLine(line)) {
      if (pending && pending.duration == null) {
        pending.duration = parseInt(line, 10);
        result.get(currentCategory).push(pending);
        pending = null;
      }
      continue;
    }

    // A standalone "$40" style line means price for pending
    if (/^\$\s*\d+(?:\.\d{1,2})?$/.test(line)) {
      if (pending && typeof pending.price !== 'number') {
        pending.price = parseFloat(line.replace(/[^0-9.]/g, ''));
      }
      continue;
    }

    // An explicit Add-on marker line marks pending as hidden add-on
    if (/^Add-?on$/i.test(line)) {
      if (pending) pending.isHidden = true;
      continue;
    }

    // Parse a service name line
    let { price, name } = extractPriceAndCleanName(line);
    // Try trailing duration in same line
    const td = extractTrailingDuration(name);
    name = td.name;
    let duration = td.duration;

    // Determine add-on
    const hidden = isAddOn(line) || isAddOn(name);

    // If we already have a pending without duration, push it with default duration
    if (pending && pending.duration == null) {
      pending.duration = 30; // sensible default
      result.get(currentCategory).push(pending);
      pending = null;
    }

    const service = {
      name: name.trim(),
      price: typeof price === 'number' ? price : 0,
      duration: duration, // may be null for now
      isHidden: !!hidden,
    };

    if (service.name.length === 0) continue;

    if (service.duration != null) {
      result.get(currentCategory).push(service);
      pending = null;
    } else {
      pending = service; // wait for next numeric line
    }
  }

  // Flush any last pending with default duration
  if (pending && pending.duration == null && currentCategory && result.has(currentCategory)) {
    pending.duration = 30;
    result.get(currentCategory).push(pending);
  }

  // Remove obvious duplicates within a category by exact name match (keep first)
  for (const [cat, services] of result.entries()) {
    const seen = new Set();
    const deduped = [];
    for (const s of services) {
      const key = s.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push({ ...s, duration: s.duration ?? 30 });
      }
    }
    result.set(cat, deduped);
  }

  return result;
}

async function http(method, path, body) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${method} ${path} -> ${res.status}: ${txt}`);
  }
  return res.json();
}

async function waitForServer(timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await http('GET', '/api/service-categories');
      return true;
    } catch (e) {
      await sleep(1000);
    }
  }
  throw new Error(`Server at ${API_BASE} did not respond within ${timeoutMs}ms`);
}

async function ensureCategories(categoryMap) {
  const existing = await http('GET', '/api/service-categories');
  const byName = new Map(existing.map(c => [String(c.name).trim().toLowerCase(), c]));
  const created = new Map();
  for (const cat of categoryMap.keys()) {
    const key = cat.trim().toLowerCase();
    if (byName.has(key)) {
      created.set(cat, byName.get(key));
      continue;
    }
    const newCat = await http('POST', '/api/service-categories', { name: cat });
    created.set(cat, newCat);
  }
  return created; // Map categoryName -> categoryObj
}

async function ensureServices(categoryMap, categoryIdMap) {
  const existingServices = await http('GET', '/api/services');
  const existingByName = new Map(existingServices.map(s => [String(s.name).trim().toLowerCase(), s]));
  const results = [];
  for (const [cat, services] of categoryMap.entries()) {
    const catId = categoryIdMap.get(cat)?.id;
    if (!catId) continue;
    for (const svc of services) {
      const key = svc.name.trim().toLowerCase();
      if (existingByName.has(key)) {
        results.push({ name: svc.name, skipped: true, reason: 'exists' });
        continue;
      }
      const payload = {
        name: svc.name,
        duration: Math.max(1, Number(svc.duration || 30)),
        price: Number(svc.price || 0),
        categoryId: Number(catId),
      };
      if (svc.isHidden) payload.isHidden = true;
      try {
        const created = await http('POST', '/api/services', payload);
        results.push({ name: created.name, id: created.id, created: true });
      } catch (e) {
        // Try once more without optional fields if any
        try {
          const fallback = await http('POST', '/api/services', {
            name: payload.name,
            duration: payload.duration,
            price: payload.price,
            categoryId: payload.categoryId,
          });
          results.push({ name: fallback.name, id: fallback.id, created: true, fallback: true });
        } catch (err) {
          results.push({ name: svc.name, error: String(err.message || err) });
        }
      }
    }
  }
  return results;
}

(async () => {
  try {
    console.log(`Using API base: ${API_BASE}`);
    await waitForServer();
    console.log('✅ Server is reachable');

    const parsed = parseRawInput(RAW_INPUT);
    console.log(`Found ${parsed.size} categories`);

    const categoryIdMap = await ensureCategories(parsed);
    console.log(`Ensured ${categoryIdMap.size} categories`);

    const results = await ensureServices(parsed, categoryIdMap);
    const created = results.filter(r => r.created).length;
    const skipped = results.filter(r => r.skipped).length;
    const errored = results.filter(r => r.error).length;
    console.log(`Services: created=${created}, skipped=${skipped}, errors=${errored}`);

    if (errored > 0) {
      console.log('Some errors occurred creating services (will require manual review):');
      for (const r of results.filter(r => r.error)) {
        console.log(` - ${r.name}: ${r.error}`);
      }
    }
    console.log('Done.');
  } catch (e) {
    console.error('❌ Import failed:', e);
    process.exit(1);
  }
})();


