// app/api/staff/route.ts
import { NextResponse } from "next/server";
import { getTokens } from "@/lib/auth-cookies";

const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');
const SERVICE_TOKEN = process.env.DIRECTUS_SERVICE_TOKEN || process.env.DIRECTUS_STATIC_TOKEN;
const SERVICE_EMAIL = process.env.DIRECTUS_EMAIL;
const SERVICE_PASSWORD = process.env.DIRECTUS_PASSWORD;

async function dx(path: string, init?: RequestInit) {
  if (!DIRECTUS_URL) throw new Error("Missing DIRECTUS_URL");
  const { access } = getTokens();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
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
  const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

export async function GET() {
  try {
    const res = await dx(`/items/staff?fields=id,first_name,last_name&sort=last_name,first_name`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Directus staff fetch failed:", res.status, data);
      return NextResponse.json({ error: "Failed to fetch staff", detail: data }, { status: res.status || 500 });
    }
    // Return all staff as a flat array
    const staff = ((data as any).data || []).map((s: any) => ({ id: s.id, name: `${s.first_name} ${s.last_name}`.trim() }));
    return NextResponse.json({ data: staff });
  } catch (err: any) {
    console.error("/api/staff error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

const CREATABLE_FIELDS = new Set(['first_name','last_name','email','role']);

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const payload: Record<string, any> = {};
  for (const k of Object.keys(body || {})) {
    if (CREATABLE_FIELDS.has(k) && body[k] !== undefined && body[k] !== null) payload[k] = body[k];
  }
  if (!payload.first_name && !payload.last_name) {
    return NextResponse.json({ error: 'first_name or last_name required' }, { status: 400 });
  }
  try {
    const res = await dx(`/items/staff`, { method: 'POST', body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json({ error: 'Create failed', detail: data }, { status: res.status || 500 });
    const item: any = data.data || data;
    return NextResponse.json({ data: { id: item.id, name: `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.id } }, { status: 201 });
  } catch (e:any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
