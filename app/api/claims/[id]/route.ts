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
    // Carrier (client company)
    'carrier.id',
    'carrier.name',
    'carrier.naic',
    // Carrier contact (sometimes stored as carrier_contact_id)
    'carrier_contact_id.id',
    'carrier_contact_id.first_name',
    'carrier_contact_id.last_name',
    'carrier_contact_id.email',
    'primary_insured.id',
    'primary_insured.first_name',
    'primary_insured.last_name',
    ...(includeAddressLines ? ['loss_location.street_1','loss_location.street_2'] : []),
    'loss_location.city',
    'loss_location.state',
    'loss_location.postal_code',
    'assigned_to_user.id',
    'assigned_to_user.first_name',
    'assigned_to_user.last_name',
    'assigned_to_user.email',
  // assigned manager (contacts collection presumed)
  'assigned_manager.id',
  'assigned_manager.first_name',
  'assigned_manager.last_name',
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
        const fallbackPath = build(false);
        const r2 = await dx(fallbackPath, { method: 'GET' });
        let j2: any = null; try { j2 = await r2.json(); } catch { j2 = {}; }
        if (!r2.ok) throw new Error(String(r2.status));
        data = j2;
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
