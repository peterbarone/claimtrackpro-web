// app/api/auth/claims/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';

const ACCESS = 'ctrk_jwt';
const REFRESH = 'ctrk_rjwt';

function getSecureFlag() {
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  // Secure only when https AND not localhost
  return proto === 'https' && !isLocal;
}

async function getClaims(accessToken: string, limit = 20, offset = 0) {
  const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL;
  if (!DIRECTUS_URL) throw new Error('Missing DIRECTUS_URL env var');

  // Request expanded relations to power the UI components
  const fields = [
    'id',
    'claim_number',
    'date_of_loss',
    'reported_date',
    'description',
    'date_created',
    // status (relational if configured)
    'status.*',
    // claim type
    'claim_type.*',
    // insured (primary)
    'primary_insured.id',
    'primary_insured.first_name',
    'primary_insured.last_name',
    'primary_insured.avatar',
    // loss location
    'loss_location.address_line1',
    'loss_location.address_line2',
    'loss_location.city',
    'loss_location.state',
    'loss_location.postal_code',
    // participants via claims_contacts -> contacts
    'claims_contacts.id',
    'claims_contacts.role',
    'claims_contacts.contacts_id.id',
    'claims_contacts.contacts_id.first_name',
    'claims_contacts.contacts_id.last_name',
    'claims_contacts.contacts_id.avatar',
    // assigned user (staff)
    'assigned_to_user.id',
    'assigned_to_user.first_name',
    'assigned_to_user.last_name',
    'assigned_to_user.email',
    'assigned_to_user.avatar',
  ].join(',');

  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  params.append('sort[]', '-date_created');
  params.set('fields', fields);
  // cap deep list to avoid huge payloads
  params.set('deep[claims_contacts][limit]', '10');

  const url = `${DIRECTUS_URL}/items/claims?${params.toString()}`;

  const r = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  console.log("API getClaims: Directus response status", r.status);

  if (r.status === 401) {
    const msg = (await r.text()) || 'Unauthorized';
    console.log("API getClaims: Unauthorized (401)", msg);
    const err: any = new Error(msg);
    err.code = 401;
    throw err;
  }

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    console.error("API getClaims: Directus error", r.status, text.slice(0, 300));
    throw new Error(`Directus ${r.status}: ${text}`);
  }

  const json = await r.json();
  console.log("API getClaims: Directus response body", json);
  return json as { data: unknown[] };
}

async function refreshTokens(refreshToken: string) {
  const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL;
  if (!DIRECTUS_URL) throw new Error('Missing DIRECTUS_URL env var');

  const r = await fetch(`${DIRECTUS_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: 'no-store',
  });

  console.log("API refreshTokens: Directus response status", r.status);

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    console.error("API refreshTokens: Directus error", r.status, text.slice(0, 300));
    throw new Error(`Refresh failed ${r.status}: ${text}`);
  }

  const json = await r.json();
  console.log("API refreshTokens: Directus response body", json);
  return json.data ?? json;
}

export async function GET(req: Request) {
  try {
  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') ?? '20', 10)));
  const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0', 10));
  const jar = cookies();
  const allCookies = jar.getAll();
  const access = jar.get(ACCESS)?.value;
  const refresh = jar.get(REFRESH)?.value;
  console.log("Claims API: cookies", allCookies);
  console.log("Claims API: access", access, "refresh", refresh);

    if (!access && !refresh) {
      console.log("Claims API: No access or refresh token, not authenticated");
      return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    }

    // 1) Try with current access token
    if (access) {
      try {
        const claims = await getClaims(access, limit, offset);
        console.log("Claims API: fetched claims with access", claims);
        return NextResponse.json({ ok: true, data: claims.data });
      } catch (e: any) {
        if (e?.code !== 401) {
          console.error("Claims API: error fetching claims with access", e);
          return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
        }
        // else fall through to refresh
      }
    }

    // 2) Refresh and retry
    if (!refresh) {
      console.log("Claims API: Missing refresh token");
      return NextResponse.json({ ok: false, error: 'Missing refresh token' }, { status: 401 });
    }

  const tokens = await refreshTokens(refresh);
  const freshAccess = tokens.access_token;
  const freshRefresh = tokens.refresh_token ?? refresh;

  const claims = await getClaims(freshAccess, limit, offset);
  console.log("Claims API: fetched claims with refreshed access", claims);

  // Build ONE response, set cookies on it, then return THAT response.
  const resp = NextResponse.json({ ok: true, data: claims.data });

  const secure = getSecureFlag();
  resp.cookies.set(ACCESS, freshAccess, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    // maxAge: tokens.expires_in ?? 60 * 15, // optional if you decode exp
  });
  resp.cookies.set(REFRESH, freshRefresh, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    // maxAge: 60 * 60 * 24 * 30,
  });

  return resp;
   } catch (e: any) {
     console.error("Claims API: top-level error", e);
     return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
   }
}
