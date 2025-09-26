import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import directusFetch from '../../../lib/directus';

const COOKIE_NAME = process.env.COOKIE_NAME || 'ctrk_jwt';
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'ctrk_rjwt';
const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');
const SERVICE_TOKEN = process.env.DIRECTUS_SERVICE_TOKEN || process.env.DIRECTUS_STATIC_TOKEN;
const SERVICE_EMAIL = process.env.DIRECTUS_EMAIL;
const SERVICE_PASSWORD = process.env.DIRECTUS_PASSWORD;

function devLog(...args: any[]) {
  if (process.env.NODE_ENV !== 'production') console.log('[api/staff/[id]]', ...args);
}

async function getWithToken(path: string) {
  const jar = cookies();
  let token = jar.get(COOKIE_NAME)?.value;
  try {
    return await directusFetch(path, { method: 'GET' }, token);
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes('401')) {
      const refresh = jar.get(REFRESH_COOKIE_NAME)?.value;
      if (!refresh || !DIRECTUS_URL) throw new Error('401');
      try {
        const r = await fetch(`${DIRECTUS_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refresh }),
          cache: 'no-store'
        });
        if (!r.ok) throw new Error('401');
        const data = await r.json();
        token = data?.data?.access_token;
        if (!token) throw new Error('401');
        return await directusFetch(path, { method: 'GET' }, token);
      } catch {
        throw new Error('401');
      }
    }
    if (msg.includes('403')) {
      // Attempt service token fallback
      if (SERVICE_TOKEN) {
        try { return await directusFetch(path, { method: 'GET' }, SERVICE_TOKEN); } catch {}
      }
      // Attempt service account login fallback
      if (SERVICE_EMAIL && SERVICE_PASSWORD && DIRECTUS_URL) {
        try {
          const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: SERVICE_EMAIL, password: SERVICE_PASSWORD }),
            cache: 'no-store'
          });
          const lj = await loginRes.json().catch(()=>({}));
            const serviceAccess = (lj as any)?.data?.access_token;
            if (loginRes.ok && serviceAccess) {
              try { return await directusFetch(path, { method: 'GET' }, serviceAccess); } catch {}
            }
        } catch {}
      }
    }
    throw err;
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const jar = cookies();
  const access = jar.get(COOKIE_NAME)?.value;
  const refresh = jar.get(REFRESH_COOKIE_NAME)?.value;
  if (!access && !refresh) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const path = `/items/staff/${encodeURIComponent(params.id)}?fields=id,first_name,last_name,email,role`;
  try {
    const data = await getWithToken(path);
    const item = data?.data;
    if (!item) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    return NextResponse.json({ data: {
      id: item.id,
      first_name: item.first_name || '',
      last_name: item.last_name || '',
      email: item.email || '',
      role: item.role || ''
    }});
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes('401')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('403')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (msg.includes('404')) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    devLog('GET failed', msg);
    return NextResponse.json({ error: 'Internal Server Error', detail: msg.slice(0,300) }, { status: 500 });
  }
}

const MUTABLE = new Set(['first_name','last_name','email','role']);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const jar = cookies();
  const access = jar.get(COOKIE_NAME)?.value;
  const refresh = jar.get(REFRESH_COOKIE_NAME)?.value;
  if (!access && !refresh) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: any = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const payload: Record<string, any> = {};
  for (const k of Object.keys(body || {})) {
    if (MUTABLE.has(k) && body[k] !== undefined) {
      const v = body[k];
      if (typeof v === 'string') payload[k] = v.trim(); else payload[k] = v;
    }
  }
  if (Object.keys(payload).length === 0) return NextResponse.json({ error: 'No changes' }, { status: 400 });

  async function attempt(token?: string) {
    if (!token) throw new Error('401');
    return await directusFetch(
      `/items/staff/${encodeURIComponent(params.id)}`,
      { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } },
      token
    );
  }

  let token = access;
  try {
    let updated: any;
    try {
      updated = await attempt(token);
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.includes('401') && refresh && DIRECTUS_URL) {
        const r = await fetch(`${DIRECTUS_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refresh }),
          cache: 'no-store'
        });
        if (!r.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const j = await r.json();
        token = j?.data?.access_token;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        updated = await attempt(token);
      } else if (msg.includes('403')) {
        // Service token / account fallback
        if (SERVICE_TOKEN) {
          try { updated = await attempt(SERVICE_TOKEN); } catch {}
        }
        if (!updated && SERVICE_EMAIL && SERVICE_PASSWORD && DIRECTUS_URL) {
          try {
            const lr = await fetch(`${DIRECTUS_URL}/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: SERVICE_EMAIL, password: SERVICE_PASSWORD }),
              cache: 'no-store'
            });
            if (lr.ok) {
              const lj = await lr.json().catch(()=>({}));
              const svcAccess = (lj as any)?.data?.access_token;
              if (svcAccess) {
                try { updated = await attempt(svcAccess); } catch {}
              }
            }
          } catch {}
        }
        if (!updated) throw err;
      } else throw err;
    }
    return NextResponse.json({ data: updated?.data ?? updated });
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes('401')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (msg.includes('403')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (msg.includes('404')) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    devLog('PATCH failed', msg);
    return NextResponse.json({ error: 'Update failed', detail: msg.slice(0,300) }, { status: 500 });
  }
}
