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

async function getClaims(accessToken: string) {
  const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL;
  if (!DIRECTUS_URL) throw new Error('Missing DIRECTUS_URL env var');

  const r = await fetch(
    `${DIRECTUS_URL}/items/claims?limit=20&sort[]=-date_created&fields=id,claim_number,status,date_of_loss,reported_date,assigned_to_user,description`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`, // no need for Content-Type on GET
        Accept: 'application/json',
      },
      cache: 'no-store',
    }
  );

  if (r.status === 401) {
    const msg = (await r.text()) || 'Unauthorized';
    const err: any = new Error(msg);
    err.code = 401;
    throw err;
  }

  if (!r.ok) {
    throw new Error(`Directus ${r.status}: ${await r.text()}`);
  }

  return (await r.json()) as { data: unknown[] };
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

  if (!r.ok) {
    throw new Error(`Refresh failed ${r.status}: ${await r.text()}`);
  }

  // Directus v11: { data: { access_token, refresh_token, expires, ... } }
  const json = await r.json();
  return json.data ?? json;
}

export async function GET() {
  try {
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
        const claims = await getClaims(access);
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

  const claims = await getClaims(freshAccess);
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
