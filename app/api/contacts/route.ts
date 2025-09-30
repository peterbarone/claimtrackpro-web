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

// GET /api/contacts
// Supports filters:
//   ?company=<companyName>  -> contacts where company equals provided name
//   ?role=<roleName>        -> contacts where role equals provided role (legacy default)
// If neither provided, returns all (capped by Directus default limit) basic sorted contacts.
// Returns full usable fields for UI editing list.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const role = url.searchParams.get('role');
  const company = url.searchParams.get('company');
  const filters: string[] = [];
  if (company) filters.push(`filter[company][_eq]=${encodeURIComponent(company)}`);
  else if (role) filters.push(`filter[role][_eq]=${encodeURIComponent(role)}`);
  const qs = [
    ...filters,
    'fields=' + encodeURIComponent(['id','first_name','last_name','role','company','phone','email','notes'].join(',')),
    'sort=' + encodeURIComponent('last_name,first_name')
  ].join('&');
  try {
    const res = await dx(`/items/contacts?${qs}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch contacts', detail: data }, { status: res.status || 500 });
    }
    const contacts = ((data as any).data || []).map((c: any) => ({
      id: c.id,
      first_name: c.first_name || '',
      last_name: c.last_name || '',
      role: c.role || '',
      company: c.company || '',
      phone: c.phone || '',
      email: c.email || '',
      notes: c.notes || '',
      name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed'
    }));
    return NextResponse.json({ data: contacts });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

// POST /api/contacts  Body: { first_name?, last_name?, role?, company (required), phone?, email?, notes? }
export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const allowed = ['first_name','last_name','role','company','phone','email','notes'];
  const payload: Record<string, any> = {};
  for (const k of allowed) if (body[k] !== undefined && body[k] !== null && String(body[k]).trim() !== '') payload[k] = typeof body[k] === 'string' ? body[k].trim() : body[k];
  if (!payload.company) return NextResponse.json({ error: 'company is required' }, { status: 400 });
  try {
    const res = await dx('/items/contacts', { method: 'POST', body: JSON.stringify(payload) });
    let rawText = '';
    let data: any = {};
    try {
      rawText = await res.text();
      data = JSON.parse(rawText);
    } catch {
      data = rawText ? { raw: rawText } : {};
    }
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to create contact', detail: data, payload }, { status: res.status || 500 });
    }
    const c: any = (data as any).data || {};
    return NextResponse.json({ data: { id: c.id, ...payload } }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err), payload }, { status: 500 });
  }
}
