import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE_NAME = process.env.COOKIE_NAME || 'ctrk_jwt';
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'ctrk_rjwt';
const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');
const SERVICE_TOKEN = process.env.DIRECTUS_SERVICE_TOKEN || process.env.DIRECTUS_STATIC_TOKEN;
const SERVICE_EMAIL = process.env.DIRECTUS_EMAIL;
const SERVICE_PASSWORD = process.env.DIRECTUS_PASSWORD;

async function dx(path: string, init?: RequestInit) {
  if (!DIRECTUS_URL) throw new Error('Missing DIRECTUS_URL');
  const access = cookies().get(COOKIE_NAME)?.value;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(access ? { Authorization: `Bearer ${access}` } : SERVICE_TOKEN ? { Authorization: `Bearer ${SERVICE_TOKEN}` } : {}),
    ...(init?.headers || {}),
  };
  const doFetch = async (bearer?: string) => {
    const auth = bearer ? { Authorization: `Bearer ${bearer}` } : {};
    return fetch(`${DIRECTUS_URL}${path}`, { ...init, headers: { ...headers, ...auth }, cache: 'no-store' });
  };
  let res = await doFetch();
  if (res.status === 401 && SERVICE_EMAIL && SERVICE_PASSWORD) {
    try {
      const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: SERVICE_EMAIL, password: SERVICE_PASSWORD })
      });
      const loginJson = await loginRes.json().catch(() => ({}));
      if (loginRes.ok && (loginJson as any)?.data?.access_token) {
        const token = (loginJson as any).data.access_token as string;
        res = await doFetch(token);
      }
    } catch {}
  }
  return res;
}

export async function GET(req: Request, { params }: { params: { num: string } }) {
  const claimNumber = decodeURIComponent(params.num);
  if (!claimNumber) return NextResponse.json({ error: 'Bad Request' }, { status: 400 });

  // Look up claim id by claim_number
  try {
    const q = `/items/claims?filter[claim_number][_eq]=${encodeURIComponent(claimNumber)}&fields=id,claim_number`;
    const r = await dx(q, { method: 'GET' });
    const j = await r.json().catch(() => ({} as any));
    if (!r.ok) return NextResponse.json({ error: 'Directus error', detail: j }, { status: r.status });
    const id = j?.data?.[0]?.id;
    if (!id) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    // Proxy to existing enriched endpoint /api/claims/[id]
    const url = new URL(req.url);
    const proto = (req.headers.get('x-forwarded-proto') || url.protocol.replace(':','')) || 'http';
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host || 'localhost:3000';
    const local = `${proto}://${host}/api/claims/${encodeURIComponent(String(id))}`;
    const resp = await fetch(local, { method: 'GET', cache: 'no-store', headers: { Accept: 'application/json' } });
    const body = await resp.json().catch(() => ({}));
    return NextResponse.json(body, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Lookup Failed', detail: String(e?.message || e).slice(0, 300) }, { status: 500 });
  }
}
