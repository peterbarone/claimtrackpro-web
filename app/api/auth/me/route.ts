// /app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import directusFetch from '../../../lib/directus';

type Me = {
  id: string;
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: any;
};

const ACCESS = 'ctrk_jwt';
const REFRESH = 'ctrk_rjwt';

// Adjust these for your env
const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || process.env.DIRECTUS_URL;

function setAuthCookies(res: NextResponse, accessToken: string, refreshToken?: string, {
  secure = process.env.NODE_ENV === 'production',
  sameSite = process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
  // For localhost over http, set secure: false
} = {}) {
  // Access token ~15m typically
  res.cookies.set({
    name: ACCESS,
    value: accessToken,
    httpOnly: true,
    secure,
    sameSite: sameSite as any,
    path: '/',
    // Optional: maxAge if you decode exp and compute seconds
  });
  if (refreshToken) {
    // Refresh token longer-lived
    res.cookies.set({
      name: REFRESH,
      value: refreshToken,
      httpOnly: true,
      secure,
      sameSite: sameSite as any,
      path: '/',
    });
  }
}

async function refreshWithDirectus(refresh: string) {
  if (!DIRECTUS_URL) throw new Error('Missing DIRECTUS_URL');
  const r = await fetch(`${DIRECTUS_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Directus refresh failed: ${r.status} ${t.slice(0, 300)}`);
  }
  const json = await r.json();
  // Directus v11 returns { data: { access_token, refresh_token, expires, ... } }
  return json?.data || json;
}

async function fetchMe(access?: string) {
  const res = await directusFetch('/users/me?fields=id,email,first_name,last_name,role', { method: 'GET' }, access);
  return res?.data ?? res;
}

export async function GET() {
  const jar = cookies();
  const access = jar.get(ACCESS)?.value;
  const refresh = jar.get(REFRESH)?.value;

  // Not logged in isn’t an error
  if (!access && !refresh) {
    return NextResponse.json({ ok: true, user: null });
  }

  try {
    // 1) Try with current access
    try {
      const me = await fetchMe(access);
      if (me?.id) {
        return NextResponse.json({ ok: true, user: me });
      }
    } catch (e: any) {
      // fall through to refresh on 401
      if (!String(e?.message || '').includes('401') && !String(e).includes('Unauthorized')) {
        throw e; // some other error
      }
    }

    // 2) If we’re here, access likely expired – try refresh (if we have it)
    if (!refresh) {
      return NextResponse.json({ ok: true, user: null }); // treat as logged out
    }

    const tokens = await refreshWithDirectus(refresh);
    const newAccess = tokens.access_token;
    const newRefresh = tokens.refresh_token ?? refresh;

    // 3) Retry /users/me with new access
    const me = await fetchMe(newAccess);

    // 4) Build the response and SET COOKIES ON IT
    const resp = NextResponse.json({ ok: true, user: me ?? null });
    setAuthCookies(resp, newAccess, newRefresh, {
      secure: process.env.NODE_ENV === 'production', // false for localhost HTTP
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
    });

    return resp;
  } catch (err: any) {
    const msg = String(err?.message ?? '');
    // If Directus says 401 and refresh failed, consider as logged-out
    if (msg.includes('401')) {
      return NextResponse.json({ ok: true, user: null });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
