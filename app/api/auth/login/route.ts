// /app/api/auth/login/route.ts  (only cookie-name changes shown)
import { NextResponse } from 'next/server';

const ACCESS = 'd_access';
const REFRESH = 'd_refresh';

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const r = await fetch(`${process.env.DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });

  const data = await r.json();
  if (!r.ok) return NextResponse.json(data, { status: r.status });

  const res = NextResponse.json({ ok: true });
  const cookieOpts = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/' };

  res.cookies.set(ACCESS, data.data.access_token, { ...cookieOpts, maxAge: 60 * 60 });
  res.cookies.set(REFRESH, data.data.refresh_token, { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 });

  return res;
}
