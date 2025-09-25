import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import directusFetch from '../../../lib/directus';

const COOKIE_NAME = process.env.COOKIE_NAME || 'ctrk_jwt';
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'ctrk_rjwt';
const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');

function devLog(...args: any[]) {
  if (process.env.NODE_ENV !== 'production') console.log(...args);
}

function buildClaimPath(id: string, includeAddressLines = true) {
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
    ...(includeAddressLines ? ['loss_location.street_1','loss_location.street_2'] : []),
    'loss_location.city',
    'loss_location.state',
    'loss_location.postal_code',
    'assigned_to_user.id',
    'assigned_to_user.first_name',
    'assigned_to_user.last_name',
    'assigned_to_user.email',
  ];
  const qs = new URLSearchParams();
  qs.set('fields', FIELDS.join(','));
  return `/items/claims/${encodeURIComponent(id)}?${qs.toString()}`;
}

async function withUserToken(path: string): Promise<any> {
  let token = cookies().get(COOKIE_NAME)?.value;
  devLog('[api/claims/[id]] requesting', path);
  try {
    const res = await directusFetch(path, { method: 'GET' }, token);
    return res;
  } catch (err: any) {
    devLog('[api/claims/[id]] directus error', err?.message || err);
    if (String(err.message).includes('401')) {
      // Try refresh using refresh cookie
      try {
        if (!DIRECTUS_URL) throw new Error('Missing DIRECTUS_URL');
        const refresh = cookies().get(REFRESH_COOKIE_NAME)?.value;
        if (!refresh) throw new Error('No refresh token');
        devLog('[api/claims/[id]] attempting directus refresh…');
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
        return res;
      } catch (e) {
        throw new Error('401 Unauthorized');
      }
    }
    throw err;
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const jar = cookies();
  const access = jar.get(COOKIE_NAME)?.value;
  const refresh = jar.get(REFRESH_COOKIE_NAME)?.value;
  if (!access && !refresh) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const label = '[api/claims/[id]] GET';
  console.time?.(label);
  const build = (addr: boolean) => buildClaimPath(params.id, addr);
  const primaryPath = build(true);
  try {
    let data: any;
    try {
      data = await withUserToken(primaryPath);
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (msg.includes('403') || msg.toLowerCase().includes("don't have permission") || msg.toLowerCase().includes('permission')) {
        const fallbackPath = build(false);
        data = await withUserToken(fallbackPath);
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
