import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import directusFetch from '../../../lib/directus';

const COOKIE_NAME = process.env.COOKIE_NAME || 'ctrk_jwt';
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'ctrk_rjwt';
const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');
const SERVICE_TOKEN = process.env.DIRECTUS_SERVICE_TOKEN || process.env.DIRECTUS_STATIC_TOKEN;
const SERVICE_EMAIL = process.env.DIRECTUS_EMAIL;
const SERVICE_PASSWORD = process.env.DIRECTUS_PASSWORD;

function devLog(...args: any[]) {
  if (process.env.NODE_ENV !== 'production') console.log(...args);
}

function buildClaimPath(id: string, includeAddressLines = true) {
  const FIELDS = [
    'id',
    'claim_number',
    'date_of_loss',
  'date_received',
    'reported_date',
    'description',
    'date_created',
    'status.*',
    'claim_type.*',
    // Type of Loss
    'loss_cause.id',
    'loss_cause.name',
    'loss_cause.code',
    // Carrier (client company)
    'carrier.id',
    'carrier.name',
    'carrier.naic',
    // Carrier contact (sometimes stored as carrier_contact_id)
    'carrier_contact_id.id',
    'carrier_contact_id.first_name',
    'carrier_contact_id.last_name',
    'carrier_contact_id.name',
    'carrier_contact_id.email',
    'primary_insured.id',
    'primary_insured.first_name',
    'primary_insured.last_name',
    'primary_insured.name',
    'primary_insured.full_name',
    ...(includeAddressLines ? ['loss_location.street_1','loss_location.street_2'] : []),
    'loss_location.city',
    'loss_location.state',
    'loss_location.postal_code',
    'assigned_to_user.id',
    'assigned_to_user.first_name',
    'assigned_to_user.last_name',
    'assigned_to_user.email',
    // participants relation (junction like claims_contacts)
    'claims_contacts.id',
    'claims_contacts.role',
    'claims_contacts.contacts_id.id',
    'claims_contacts.contacts_id.first_name',
    'claims_contacts.contacts_id.last_name',
  ];
  const qs = new URLSearchParams();
  qs.set('fields', FIELDS.join(','));
  return `/items/claims/${encodeURIComponent(id)}?${qs.toString()}`;
}

function buildMinimalClaimPath(id: string) {
  const minimal = [
    'id',
    'claim_number',
    'date_of_loss',
    'date_received',
    'reported_date',
    'description',
    // keep these as best-effort but okay if stripped by perms
    'status.id',
    'status.name',
    'claim_type.id',
    'claim_type.name',
  ];
  const qs = new URLSearchParams();
  qs.set('fields', minimal.join(','));
  return `/items/claims/${encodeURIComponent(id)}?${qs.toString()}`;
}

function buildSafeClaimPath(id: string) {
  // A safer-than-minimal set that avoids known-permission-heavy relations (no claims_contacts, no address lines,
  // no carrier_contact_id, no assigned_to_user), but still provides key UI fields.
  const safe = [
    'id',
    'claim_number',
    'date_of_loss',
    'date_received',
    'reported_date',
    'description',
    'status.*',
    'claim_type.id',
    'claim_type.name',
    'loss_cause.id',
    'loss_cause.name',
    'loss_cause.code',
    'carrier.id',
    'carrier.name',
    // Avoid nested insured fields to prevent 400 if schema differs; enrichment will fetch details
    'primary_insured',
    // Include carrier contact id only; enrichment/participants will resolve name
    'carrier_contact_id',
    'loss_location.city',
    'loss_location.state',
    'loss_location.postal_code',
  ];
  const qs = new URLSearchParams();
  qs.set('fields', safe.join(','));
  return `/items/claims/${encodeURIComponent(id)}?${qs.toString()}`;
}

async function dx(path: string, init?: RequestInit) {
  if (!DIRECTUS_URL) throw new Error('Missing DIRECTUS_URL');
  const access = cookies().get(COOKIE_NAME)?.value;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(access ? { Authorization: `Bearer ${access}` } : SERVICE_TOKEN ? { Authorization: `Bearer ${SERVICE_TOKEN}` } : {}),
    ...(init?.headers || {}),
  };
  const doFetch = async (bearer?: string) => {
    const auth = bearer ? { Authorization: `Bearer ${bearer}` } : {};
    return fetch(`${DIRECTUS_URL}${path}`, { ...init, headers: { ...headers, ...auth }, cache: 'no-store' });
  };
  let res = await doFetch();
  if (res.status === 401 && SERVICE_EMAIL && SERVICE_PASSWORD) {
    try {
      const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: SERVICE_EMAIL, password: SERVICE_PASSWORD })
      });
      const loginJson = await loginRes.json().catch(() => ({}));
      if (loginRes.ok && (loginJson as any)?.data?.access_token) {
        const token = (loginJson as any).data.access_token as string;
        res = await doFetch(token);
      }
    } catch {}
  }
  return res;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  // Permit service token fallback when no user cookies present
  const jar = cookies();
  const access = jar.get(COOKIE_NAME)?.value;
  const refresh = jar.get(REFRESH_COOKIE_NAME)?.value;
  if (!access && !refresh && !SERVICE_TOKEN && !(SERVICE_EMAIL && SERVICE_PASSWORD)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const label = '[api/claims/[id]] GET';
  console.time?.(label);
  const build = (addr: boolean) => buildClaimPath(params.id, addr);
  const primaryPath = build(true);
  try {
    let data: any;
    try {
      const r = await dx(primaryPath, { method: 'GET' });
      let j: any = null; try { j = await r.json(); } catch { j = {}; }
      if (!r.ok) throw new Error(String(r.status));
      data = j;
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (msg.includes('403') || msg.toLowerCase().includes("don't have permission") || msg.toLowerCase().includes('permission')) {
        // Try lighter variant (without address lines)
        try {
          const fallbackPath = build(false);
          const r2 = await dx(fallbackPath, { method: 'GET' });
          let j2: any = null; try { j2 = await r2.json(); } catch { j2 = {}; }
          if (!r2.ok) throw new Error(String(r2.status));
          data = j2;
        } catch (err2: any) {
          const msg2 = String(err2?.message || err2 || '');
          if (msg2.includes('403') || msg2.toLowerCase().includes('permission')) {
            // Try safe (middle-ground) fields next
            try {
              const r3 = await dx(buildSafeClaimPath(params.id), { method: 'GET' });
              let j3: any = null; try { j3 = await r3.json(); } catch { j3 = {}; }
              if (!r3.ok) throw new Error(String(r3.status));
              data = j3;
            } catch (err3: any) {
              const msg3 = String(err3?.message || err3 || '');
              // Final minimal attempt: only core fields
              if (msg3.includes('403') || msg3.toLowerCase().includes('permission')) {
                const r4 = await dx(buildMinimalClaimPath(params.id), { method: 'GET' });
                let j4: any = null; try { j4 = await r4.json(); } catch { j4 = {}; }
                if (!r4.ok) throw new Error(String(r4.status));
                data = j4;
              } else if (msg3.includes('404')) {
                return NextResponse.json({ error: 'Not Found' }, { status: 404 });
              } else {
                throw err3;
              }
            }
          } else if (msg2.includes('404')) {
            return NextResponse.json({ error: 'Not Found' }, { status: 404 });
          } else {
            throw err2;
          }
        }
      } else if (msg.includes('404')) {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
      } else {
        throw err;
      }
    }

    const claim = data?.data ?? null;
    if (!claim) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    // --- Enrichment: resolve key relations when missing due to permission filters ---
    async function fetchClaimField(field: string) {
      try {
        const r = await dx(`/items/claims/${encodeURIComponent(params.id)}?fields=${encodeURIComponent(field)}`, { method: 'GET' });
        const j = await r.json().catch(() => ({} as any));
        if (!r.ok) throw new Error(String(r.status));
        return j?.data?.[field];
      } catch {
        return undefined;
      }
    }

    function normalizeId(val: any): string | undefined {
      if (!val) return undefined;
      if (typeof val === 'string') return val;
      if (typeof val === 'number') return String(val);
      if (typeof val === 'object' && 'id' in val && val.id) return String((val as any).id);
      return undefined;
    }

    async function ensureContactObject(field: 'primary_insured' | 'carrier_contact_id') {
      const cur = claim?.[field];
      const hasName = cur && typeof cur === 'object' && (cur.first_name || cur.last_name || cur.name || cur.full_name || (cur as any).display_name);
      if (hasName) return;
      // Try get raw id
      let idVal: any = cur && typeof cur === 'object' && 'id' in cur ? cur.id : undefined;
      if (!idVal) idVal = await fetchClaimField(field);
      idVal = normalizeId(idVal);
      if (!idVal) return;
      // Determine correct collection for the field
      const collection = field === 'primary_insured' ? 'insureds' : 'contacts';
      const fields = 'first_name,last_name,name,company_name,full_name,display_name';
      try {
        const r = await dx(`/items/${collection}/${encodeURIComponent(String(idVal))}?fields=${fields}`, { method: 'GET' });
        const j = await r.json().catch(() => ({} as any));
        if (!r.ok) throw new Error(String(r.status));
        const fn = j?.data?.first_name || '';
        const ln = j?.data?.last_name || '';
        const nm = j?.data?.name || j?.data?.full_name || j?.data?.display_name || j?.data?.company_name || '';
        if (fn || ln) {
          claim[field] = { id: idVal, first_name: fn, last_name: ln };
        } else if (nm) {
          claim[field] = { id: idVal, name: nm };
        }
      } catch {}
    }

    async function ensureCarrierObject() {
      const cur = claim?.carrier;
      const hasName = cur && typeof cur === 'object' && cur.name;
      if (hasName) return;
      let idVal: any = cur && typeof cur === 'object' && 'id' in cur ? cur.id : undefined;
      if (!idVal) idVal = await fetchClaimField('carrier');
      idVal = normalizeId(idVal);
      if (!idVal) return;
      try {
        const r = await dx(`/items/carriers/${encodeURIComponent(String(idVal))}?fields=name`, { method: 'GET' });
        const j = await r.json().catch(() => ({} as any));
        if (!r.ok) throw new Error(String(r.status));
        claim.carrier = { id: idVal, name: j?.data?.name };
      } catch {}
    }

    async function ensureLossLocation() {
      const cur = claim?.loss_location;
      const hasAny = cur && (cur.city || cur.state || cur.postal_code || cur.street_1 || cur.street_2);
      if (hasAny) return;
      let idVal: any = cur && typeof cur === 'object' && 'id' in cur ? cur.id : undefined;
      if (!idVal) idVal = await fetchClaimField('loss_location');
      idVal = normalizeId(idVal);
      if (!idVal) return;
      try {
        const r = await dx(`/items/addresses/${encodeURIComponent(String(idVal))}?fields=street_1,street_2,city,state,postal_code`, { method: 'GET' });
        const j = await r.json().catch(() => ({} as any));
        if (!r.ok) throw new Error(String(r.status));
        const loc = j?.data || {};
        claim.loss_location = {
          id: idVal,
          street_1: loc.street_1,
          street_2: loc.street_2,
          city: loc.city,
          state: loc.state,
          postal_code: loc.postal_code,
        };
      } catch {}
    }

    async function ensureInsuredFromPolicy() {
      // If primary_insured still lacks a readable name, try policy.named_insured
      const cur = claim?.primary_insured;
      const hasName = cur && typeof cur === 'object' && (cur.first_name || cur.last_name || cur.name || cur.full_name);
      if (hasName) return;
      let policyId: any = await fetchClaimField('policy');
      policyId = normalizeId(policyId);
      if (!policyId) return;
      try {
        const r = await dx(`/items/policies/${encodeURIComponent(String(policyId))}?fields=named_insured.id,named_insured.first_name,named_insured.last_name,named_insured.name,named_insured.full_name`, { method: 'GET' });
        const j = await r.json().catch(() => ({} as any));
        if (!r.ok) throw new Error(String(r.status));
        const ni = j?.data?.named_insured;
        if (ni && (ni.first_name || ni.last_name || ni.name || ni.full_name)) {
          claim.primary_insured = {
            id: normalizeId(ni) || ni.id,
            first_name: ni.first_name,
            last_name: ni.last_name,
            name: ni.name || ni.full_name,
          } as any;
        }
      } catch {}
    }

    async function ensureParticipants() {
      try {
        const path = `/items/claims_contacts?filter[claims_id][_eq]=${encodeURIComponent(params.id)}&fields=id,role,contacts_id.id,contacts_id.first_name,contacts_id.last_name,contacts_id.name,contacts_id.full_name,contacts_id.display_name`;
        const r = await dx(path, { method: 'GET' });
        const j = await r.json().catch(() => ({} as any));
        if (!r.ok) throw new Error(String(r.status));
        if (Array.isArray(j?.data)) {
          claim.claims_contacts = j.data;
        }
      } catch {
        // ignore
      }
    }

    function hasNameLike(x: any): boolean {
      return !!(x && typeof x === 'object' && (x.first_name || x.last_name || x.name || x.full_name || (x as any).display_name));
    }

    async function ensureInsuredFromParticipants() {
      if (hasNameLike(claim?.primary_insured)) return;
      const list = Array.isArray(claim?.claims_contacts) ? claim.claims_contacts : [];
      const insuredCC = list.find(
        (cc: any) => /(insured|policyholder|named)/i.test(String(cc?.role || '')) && hasNameLike(cc?.contacts_id)
      );
      if (insuredCC?.contacts_id) {
        claim.primary_insured = insuredCC.contacts_id;
      }
    }

    async function ensureClientContactFromParticipants() {
      if (hasNameLike(claim?.carrier_contact_id)) return;
      const list = Array.isArray(claim?.claims_contacts) ? claim.claims_contacts : [];
      const clientCC = list.find(
        (cc: any) => /(client|carrier)/i.test(String(cc?.role || '')) && hasNameLike(cc?.contacts_id)
      );
      if (clientCC?.contacts_id) {
        claim.carrier_contact_id = clientCC.contacts_id;
      }
    }

    // Run enrichment steps in sequence but independently safe
  await ensureContactObject('primary_insured');
  await ensureInsuredFromPolicy();
    await ensureCarrierObject();
    await ensureContactObject('carrier_contact_id');
    await ensureLossLocation();
  await ensureParticipants();
  await ensureInsuredFromParticipants();
  await ensureClientContactFromParticipants();

    return NextResponse.json({ data: claim });
  } catch (e: any) {
    const msg = e?.message || String(e);
    devLog('[api/claims/[id]] failed', msg);
    if (String(msg).includes('401')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error', detail: String(msg).slice(0, 300) }, { status: 500 });
  } finally {
    console.timeEnd?.(label);
  }
}

// --- PATCH (Update Claim) ----------------------------------------------------
// Accepts partial updates. Only whitelisted fields are forwarded to Directus.
// Body JSON example:
// { "description": "Updated desc", "status": "open", "assigned_to_user": 5, "date_of_loss": "2025-09-15" }
// For status: client may send either a status id (numeric/string) or an object { id }.

const MUTABLE_FIELDS = new Set([
  'description',
  'status', // expects id or raw status id; Directus relation field name
  'assigned_to_user', // expects staff id
  'assigned_manager', // expects contact id
  'date_of_loss',
  'reported_date',
  'claim_type',
  'loss_cause',
]);

function sanitizePayload(body: any) {
  const out: Record<string, any> = {};
  if (!body || typeof body !== 'object') return out;
  for (const k of Object.keys(body)) {
    if (!MUTABLE_FIELDS.has(k)) continue;
    const v = body[k];
    if (v === undefined) continue;
    // Normalize objects { id } to id value for simple relation updates
    if (v && typeof v === 'object' && 'id' in v && Object.keys(v).length === 1) {
      out[k] = v.id;
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const jar = cookies();
  const access = jar.get(COOKIE_NAME)?.value;
  const refresh = jar.get(REFRESH_COOKIE_NAME)?.value;
  if (!access && !refresh) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const payload = sanitizePayload(body);
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  async function attempt(token?: string) {
    if (!token) throw new Error('401');
    return await directusFetch(
      `/items/claims/${encodeURIComponent(id)}`,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
      token
    );
  }

  let token = access;
  try {
    let updated: any;
    try {
      updated = await attempt(token);
    } catch (err: any) {
      if (String(err.message).includes('401') && refresh) {
        // try refresh
        if (!DIRECTUS_URL) throw new Error('Missing DIRECTUS_URL');
        const r = await fetch(`${DIRECTUS_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refresh }),
          cache: 'no-store',
        });
        if (!r.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const json = await r.json();
        token = json?.data?.access_token;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        updated = await attempt(token);
      } else {
        throw err;
      }
    }
    return NextResponse.json({ data: updated?.data ?? updated }, { status: 200 });
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes('401')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('403')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (msg.includes('404')) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    return NextResponse.json({ error: 'Update Failed', detail: msg.slice(0, 300) }, { status: 500 });
  }
}
