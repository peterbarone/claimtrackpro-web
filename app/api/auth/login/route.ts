// /app/api/auth/login/route.ts  (only cookie-name changes shown)
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

const ACCESS = 'ctrk_jwt';
const REFRESH = 'ctrk_rjwt';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  console.log('Received login request:', { email });

  // Normalize base URL to avoid double slashes when joining paths
  const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');
  if (!DIRECTUS_URL) {
    console.error('Missing DIRECTUS_URL env var');
    return NextResponse.json({ error: 'Server misconfiguration: DIRECTUS_URL is not set' }, { status: 500 });
  }

  try {
    const r = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });

    let data: any = null;
    try {
      // attempt to parse JSON if present
      const text = await r.text();
      data = text ? JSON.parse(text) : null;
    } catch (error) {
      console.error('Failed to parse JSON response from Directus:', error);
      data = null; // handle empty or invalid JSON
    }

    if (!r.ok) {
      console.error('Directus API error:', { status: r.status, data });
      return NextResponse.json(
        { error: data || 'An error occurred while processing the request.' },
        { status: r.status }
      );
    }

    // Ensure we actually received tokens
    if (!data || !data.data || !data.data.access_token || !data.data.refresh_token) {
      console.error('Directus returned an unexpected payload for /auth/login:', { status: r.status, data });
      return NextResponse.json({ error: 'Invalid response from authentication server' }, { status: 502 });
    }

    const res = NextResponse.json({ ok: true });
    // Compute secure flag based on proto/host (localhost should be non-secure)
    const h = headers();
    const proto = h.get('x-forwarded-proto') ?? 'http';
    const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
    const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    const secure = proto === 'https' && !isLocal;
    const cookieOptsBase = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' };

    res.cookies.set(ACCESS, data.data.access_token, { ...cookieOptsBase, maxAge: 60 * 15 }); // 15 min access
    res.cookies.set(REFRESH, data.data.refresh_token, { ...cookieOptsBase, maxAge: 60 * 60 * 24 * 30 }); // 30 days

    return res;
  } catch (error) {
    console.error('Failed to connect to the authentication server:', error);
    return NextResponse.json(
      { error: 'Failed to connect to the authentication server.' },
      { status: 500 }
    );
  }
}
