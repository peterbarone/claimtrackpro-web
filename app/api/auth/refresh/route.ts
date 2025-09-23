import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');
const COOKIE_NAME = process.env.COOKIE_NAME || 'ctrk_jwt';
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'ctrk_rjwt';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;

export async function POST() {
  const jar = cookies();
  const refresh = jar.get(REFRESH_COOKIE_NAME)?.value;
  if (!refresh) return NextResponse.json({ error: 'No refresh token' }, { status: 401 });

  const r = await fetch(`${DIRECTUS_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
    cache: 'no-store',
  });

  const data = await r.json();
  if (!r.ok) return NextResponse.json(data, { status: r.status });

  const res = NextResponse.json({ ok: true });
  // Match login cookie attributes for consistency (localhost-friendly)
  const secure = process.env.NODE_ENV === 'production';
  const baseOpts = {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  };
  // Align TTLs with login route
  res.cookies.set(COOKIE_NAME, data.data.access_token, { ...baseOpts, maxAge: 60 * 15 });
  res.cookies.set(REFRESH_COOKIE_NAME, data.data.refresh_token, { ...baseOpts, maxAge: 60 * 60 * 24 * 30 });
  return res;
}
