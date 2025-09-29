import { NextResponse } from 'next/server';
import { getTokens } from '@/lib/auth-cookies';

const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');
const SERVICE_TOKEN = process.env.DIRECTUS_SERVICE_TOKEN || process.env.DIRECTUS_STATIC_TOKEN;
const SERVICE_EMAIL = process.env.DIRECTUS_EMAIL;
const SERVICE_PASSWORD = process.env.DIRECTUS_PASSWORD;

async function dx(path: string, init?: RequestInit) {
  if (!DIRECTUS_URL) throw new Error('Missing DIRECTUS_URL');
  const { access } = getTokens();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(access ? { Authorization: `Bearer ${access}` } : SERVICE_TOKEN ? { Authorization: `Bearer ${SERVICE_TOKEN}` } : {}),
    ...(init?.headers || {}),
  };
  const doFetch = async (bearer?: string) => {
    const auth = bearer ? { Authorization: `Bearer ${bearer}` } : {};
    return fetch(`${DIRECTUS_URL}${path}`, { ...init, headers: { ...headers, ...auth } });
  };
  let res = await doFetch();
  if (res.status === 401 && SERVICE_EMAIL && SERVICE_PASSWORD) {
    try {
      const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: SERVICE_EMAIL, password: SERVICE_PASSWORD }) });
      const loginJson = await loginRes.json().catch(() => ({}));
      if (loginRes.ok && (loginJson as any)?.data?.access_token) {
        const token = (loginJson as any).data.access_token as string;
        res = await doFetch(token);
      }
    } catch {}
  }
  return res;
}

// GET /api/addresses -> list addresses (simple; could add filtering later)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit') || 100);
    const offset = Number(searchParams.get('offset') || 0);
    const fields = ['id','street_1','street_2','city','state','postal_code'].join(',');
    const res = await dx(`/items/addresses?fields=${encodeURIComponent(fields)}&limit=${limit}&offset=${offset}&sort=city,state`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch addresses', detail: data }, { status: res.status || 500 });
    return NextResponse.json({ data: (data as any).data || [], meta: (data as any).meta });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

// POST /api/addresses -> create address
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const payload: Record<string, any> = {};
    for (const k of ['street_1','street_2','city','state','postal_code']) {
      if (body[k] !== undefined && body[k] !== '') payload[k] = body[k];
    }
    if (!payload.street_1 || !payload.city || !payload.state) {
      return NextResponse.json({ error: 'street_1, city, state are required' }, { status: 400 });
    }
    const res = await dx('/items/addresses', { method: 'POST', body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json({ error: 'Failed to create address', detail: data }, { status: res.status || 500 });
    return NextResponse.json({ data: (data as any).data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
