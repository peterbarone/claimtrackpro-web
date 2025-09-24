import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import directusFetch from '../../lib/directus';

const COOKIE_NAME = process.env.COOKIE_NAME || 'ctrk_jwt';
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'ctrk_rjwt';
const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');

function devLog(...args: any[]) {
  if (process.env.NODE_ENV !== 'production') console.log(...args);
}

// Build a Directus path using your actual schema relations
function buildClaimsPath(limit = 50, offset = 0, includeAddressLines = true) {
  const FIELDS = [
    'id',
    'claim_number',
    'date_of_loss',
    'reported_date',
    'description',
    'date_created',
    'status.*',
    'claim_type.*',
    'primary_insured.id',
    'primary_insured.first_name',
    'primary_insured.last_name',
  // Address fields – try full first, fallback if forbidden
  ...(includeAddressLines ? ['loss_location.street_1','loss_location.street_2'] : []),
    'loss_location.city',
    'loss_location.state',
    'loss_location.postal_code',
    'claims_contacts.id',
    'claims_contacts.role',
    'claims_contacts.contacts_id.id',
    'claims_contacts.contacts_id.first_name',
    'claims_contacts.contacts_id.last_name',
    'assigned_to_user.id',
    'assigned_to_user.first_name',
    'assigned_to_user.last_name',
    'assigned_to_user.email',
  ];

  const qs = new URLSearchParams();
  qs.set('fields', FIELDS.join(','));
  qs.set('limit', String(limit));
  if (offset) qs.set('offset', String(offset));
  qs.append('sort[]', '-date_created');
  qs.set('deep[claims_contacts][limit]', '10');

  return `/items/claims?${qs.toString()}`;
}

async function withUserToken(path: string): Promise<any> {
  let token = cookies().get(COOKIE_NAME)?.value;
  devLog('[api/claims] requesting', path);
  try {
    const res = await directusFetch(path, { method: 'GET' }, token);
    devLog('[api/claims] directus ok', {
      count: Array.isArray(res?.data) ? res.data.length : undefined,
    });
    return res;
  } catch (err: any) {
    devLog('[api/claims] directus error', err?.message || err);
    if (String(err.message).includes('401')) {
      // Try to refresh directly with Directus using the refresh cookie
      try {
        if (!DIRECTUS_URL) throw new Error('Missing DIRECTUS_URL');
        const refresh = cookies().get(REFRESH_COOKIE_NAME)?.value;
        if (!refresh) throw new Error('No refresh token');
        devLog('[api/claims] attempting directus refresh…');
        const r = await fetch(`${DIRECTUS_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refresh }),
          cache: 'no-store',
        });
        if (!r.ok) throw new Error(`Refresh failed ${r.status}`);
        const data = await r.json();
        const newAccess = data?.data?.access_token as string | undefined;
        if (!newAccess) throw new Error('No access token from refresh');
        const res = await directusFetch(path, { method: 'GET' }, newAccess);
        devLog('[api/claims] retry ok', {
          count: Array.isArray(res?.data) ? res.data.length : undefined,
        });
        return res;
      } catch (e) {
        // Propagate as unauthorized so caller can redirect
        throw new Error('401 Unauthorized');
      }
    }
    throw err;
  }
}

export async function GET(req: Request) {
  // Quick auth check: if no access or refresh cookies, return 401
  const jar = cookies();
  const access = jar.get(COOKIE_NAME)?.value;
  const refresh = jar.get(REFRESH_COOKIE_NAME)?.value;
  if (!access && !refresh) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Read limit/offset from query
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') || '50');
  const offset = Number(searchParams.get('offset') || '0');
  const build = (addr: boolean) => buildClaimsPath(Number.isFinite(limit) ? limit : 50, Number.isFinite(offset) ? offset : 0, addr);
  const primaryPath = build(true);
  const label = '[api/claims] GET';
  console.time?.(label);
  try {
    let data: any;
    try {
      data = await withUserToken(primaryPath);
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      // If 403 or permission-related, retry without address_line1/2
      if (msg.includes('403') || msg.toLowerCase().includes("don't have permission") || msg.toLowerCase().includes('permission')) {
        const fallbackPath = build(false);
        data = await withUserToken(fallbackPath);
      } else {
        throw err;
      }
    }
    const claims = data?.data ?? [];
    devLog('[api/claims] response payload', {
      count: Array.isArray(claims) ? claims.length : undefined,
      sample_keys: claims?.[0] ? Object.keys(claims[0]) : [],
      sample: claims?.[0] ?? null,
    });
    // Mirror Directus shape
    return NextResponse.json({ data: claims });
  } catch (e: any) {
    const msg = e?.message || String(e);
    devLog('[api/claims] failed', msg);
    if (String(msg).includes('401')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Include limited detail to aid debugging (trim length)
    return NextResponse.json({ error: 'Internal Server Error', detail: String(msg).slice(0, 300) }, { status: 500 });
  } finally {
    console.timeEnd?.(label);
  }
}