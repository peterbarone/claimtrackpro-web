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

// We no longer create/write a direct 'role' field to staff; roles live exclusively in staff_roles junction.
const CREATABLE_FIELDS = new Set(['first_name','last_name','email']);

// Junction table constants (mirrors logic in [id]/route.ts)
const STAFF_ROLES_COLLECTION = 'staff_roles';
const STAFF_ROLES_STAFF_FIELD = 'staff_id';
const STAFF_ROLES_ROLE_FIELD = 'role_id';

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // Extract roles list from incoming body (supports either roles: [] or single role)
  let desiredRoleIds: string[] | undefined;
  if (Array.isArray(body?.roles)) {
    desiredRoleIds = body.roles.map((r: any) => String(r)).filter(Boolean);
  } else if (body?.role) {
    desiredRoleIds = [String(body.role)].filter(Boolean);
  }

  const payload: Record<string, any> = {};
  for (const k of Object.keys(body || {})) {
    if (CREATABLE_FIELDS.has(k) && body[k] !== undefined && body[k] !== null) {
      payload[k] = body[k];
    }
  }
  if (!payload.first_name && !payload.last_name) {
    return NextResponse.json({ error: 'first_name or last_name required' }, { status: 400 });
  }

  try {
    // Create staff
    const res = await dx(`/items/staff`, { method: 'POST', body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json({ error: 'Create failed', detail: data }, { status: res.status || 500 });
    const item: any = data.data || data;

    // Attempt to create junction rows for roles if requested
    let roles: any[] = [];
    let warning: string | undefined;
    if (desiredRoleIds && desiredRoleIds.length) {
      const uniqueRoleIds = Array.from(new Set(desiredRoleIds));
      try {
        for (const roleId of uniqueRoleIds) {
          const jr = await dx(`/items/${STAFF_ROLES_COLLECTION}` , {
            method: 'POST',
            body: JSON.stringify({ [STAFF_ROLES_STAFF_FIELD]: item.id, [STAFF_ROLES_ROLE_FIELD]: roleId, status: 'published' })
          });
          if (!jr.ok) {
            const errJson = await jr.json().catch(()=>({}));
            throw new Error(`role assignment failed (${jr.status}) ${JSON.stringify(errJson)}`);
          }
        }
        // Fetch role details to return enriched response
        const filterIds = uniqueRoleIds.map(encodeURIComponent).join(',');
        const rolesRes = await dx(`/items/roles?filter[id][_in]=${filterIds}&fields=id,name,code&limit=${uniqueRoleIds.length}`);
        const rolesJson = await rolesRes.json().catch(() => ({}));
        if (rolesRes.ok && Array.isArray(rolesJson?.data)) {
          roles = rolesJson.data.map((r: any) => ({ id: r.id, name: r.name || r.code || '', code: r.code }));
        }
      } catch (roleErr: any) {
        warning = `Staff created but roles not fully assigned: ${roleErr?.message || roleErr}`;
      }
    }

    const responseBody: any = { data: { id: item.id, first_name: item.first_name || '', last_name: item.last_name || '', email: item.email || '', name: `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.id, roles } };
    if (warning) responseBody.warning = warning;
    return NextResponse.json(responseBody, { status: 201 });
  } catch (e:any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
