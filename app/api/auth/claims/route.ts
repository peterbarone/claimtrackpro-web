// app/api/auth/claims/route.ts
export const runtime = 'nodejs'; // ensure Node runtime (SDK/auth needs Node; fetch works everywhere)

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ACCESS = 'd_access';
const REFRESH = 'd_refresh';

async function getClaims(accessToken: string) {
  const DIRECTUS_URL = process.env.DIRECTUS_URL;
  if (!DIRECTUS_URL) throw new Error('Missing DIRECTUS_URL env var');

  const r = await fetch(`${DIRECTUS_URL}/items/claims?limit=20&sort[]=-date_created&fields=id,claim_number,status,date_of_loss,reported_date,assigned_to_user,description`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  // If token is expired/invalid, bubble up 401 so we can refresh
  if (r.status === 401) {
    const text = await r.text();
    const msg = text || 'Unauthorized';
    const err = new Error(msg);
    // @ts-ignore add a code for our catch
    (err as any).code = 401;
    throw err;
  }

  if (!r.ok) {
    throw new Error(`Directus ${r.status}: ${await r.text()}`);
  }

  return (await r.json()) as { data: unknown[] };
}

async function refreshTokens(refreshToken: string) {
  const DIRECTUS_URL = process.env.DIRECTUS_URL;
  if (!DIRECTUS_URL) throw new Error('Missing DIRECTUS_URL env var');

  const r = await fetch(`${DIRECTUS_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: 'no-store',
  });

  if (!r.ok) {
    throw new Error(`Refresh failed ${r.status}: ${await r.text()}`);
  }

  return (await r.json()) as {
    data: { access_token: string; refresh_token: string };
  };
}

export async function GET() {
  try {
    const jar = cookies();
    const access = jar.get(ACCESS)?.value;
    const refresh = jar.get(REFRESH)?.value;

    if (!access && !refresh) {
      return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    }

    // 1) Try with current access token
    if (access) {
      try {
        const claims = await getClaims(access);
        console.log("Claims from Directus:", claims);
        return NextResponse.json({ ok: true, data: claims.data });
      } catch (e: any) {
        if (e?.code !== 401) {
          // Not an auth error — surface it
          return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
        }
        // else fall through to refresh flow
      }
    }

    // 2) Refresh with refresh token and retry once
    if (!refresh) {
      return NextResponse.json({ ok: false, error: 'Missing refresh token' }, { status: 401 });
    }

    const tokens = await refreshTokens(refresh);

    const res = NextResponse.json({ ok: true, data: [] }); // will overwrite after fetch
    // set fresh cookies
    res.cookies.set(ACCESS, tokens.data.access_token, {
      httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60,
    });
    res.cookies.set(REFRESH, tokens.data.refresh_token, {
      httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
    });

  const claims = await getClaims(tokens.data.access_token);
  console.log("Claims from Directus (after refresh):", claims);
  return NextResponse.json({ ok: true, data: claims.data }, res);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
