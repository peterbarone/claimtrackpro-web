import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import directusFetch from '../../../lib/directus';

// --- Config & constants ---
const ACCESS_COOKIE = process.env.COOKIE_NAME || 'ctrk_jwt';
const REFRESH_COOKIE = process.env.REFRESH_COOKIE_NAME || 'ctrk_rjwt';
const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');

// Optional privileged fallback (disabled unless explicitly enabled)
const ALLOW_SERVICE_FALLBACK = (process.env.STAFF_ALLOW_SERVICE_FALLBACK || '').toLowerCase() === 'true';
const SERVICE_TOKEN = process.env.DIRECTUS_SERVICE_TOKEN || process.env.DIRECTUS_STATIC_TOKEN || '';
const SERVICE_EMAIL = process.env.DIRECTUS_EMAIL;
const SERVICE_PASSWORD = process.env.DIRECTUS_PASSWORD;

// NOTE: 'role' may not be a direct field on the staff collection per schema (roles via junction).
// Requesting it can produce a 403 field permission error. We'll treat that as partial data.
// We attempt to request a denormalized single "role" field only if it exists; real roles are via staff_roles junction.
// Removed direct 'role' field; roles come solely from staff_roles junction now.
const FULL_FIELDS = 'id,first_name,last_name,email';
// Keep email in minimal so UI can still show contact info even if role is restricted.
const MIN_FIELDS  = 'id,first_name,last_name,email';

// Junction collection & field names based on schema:
// staff_roles (staff_id -> staff.id, role_id -> roles.id)
// We'll map to an array of role objects { id, name, code? }
const STAFF_ROLES_COLLECTION = 'staff_roles';
const STAFF_ROLES_STAFF_FIELD = 'staff_id';
const STAFF_ROLES_ROLE_FIELD = 'role_id';

async function fetchRolesForStaff(staffId: string, token: string, allowFallback: boolean): Promise<{ roles: any[]; partial: boolean }> {
  // Fetch junction rows with embedded role
  const path = `/items/${STAFF_ROLES_COLLECTION}?filter[${STAFF_ROLES_STAFF_FIELD}][_eq]=${encodeURIComponent(staffId)}&fields=id,${STAFF_ROLES_ROLE_FIELD}.id,${STAFF_ROLES_ROLE_FIELD}.name,${STAFF_ROLES_ROLE_FIELD}.code&limit=100`;
  try {
    const resp = await directusFetch(path, { method: 'GET' }, token);
    const rows: any[] = Array.isArray(resp?.data) ? resp.data : [];
    const roles = rows
      .map(r => r?.[STAFF_ROLES_ROLE_FIELD])
      .filter(Boolean)
      .map((r: any) => ({ id: r.id, name: r.name || r.code || '', code: r.code }));
    return { roles, partial: false };
  } catch (e: any) {
    const m = String(e?.message || '').match(/Directus error (\d{3})/);
    const status = m ? Number(m[1]) : 0;
    if (status === 403 && allowFallback && ALLOW_SERVICE_FALLBACK) {
      // Try service fallback
      let tokenSvc = SERVICE_TOKEN;
      if (!tokenSvc) tokenSvc = (await loginService()) || '';
      if (tokenSvc) {
        try {
          const resp2 = await directusFetch(path, { method: 'GET' }, tokenSvc);
          const rows: any[] = Array.isArray(resp2?.data) ? resp2.data : [];
          const roles = rows
            .map(r => r?.[STAFF_ROLES_ROLE_FIELD])
            .filter(Boolean)
            .map((r: any) => ({ id: r.id, name: r.name || r.code || '', code: r.code }));
          return { roles, partial: false };
        } catch {}
      }
    }
    // Return partial (empty) if forbidden; still allow staff basic data
    return { roles: [], partial: true };
  }
}

function devLog(...a: any[]) { if (process.env.NODE_ENV !== 'production') console.log('[staff/[id]]', ...a); }

async function loginService(): Promise<string | null> {
  if (!SERVICE_EMAIL || !SERVICE_PASSWORD || !DIRECTUS_URL) return null;
  try {
    const r = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: SERVICE_EMAIL, password: SERVICE_PASSWORD }),
      cache: 'no-store'
    });
    if (!r.ok) return null;
    const j = await r.json().catch(()=>({}));
    return j?.data?.access_token || null;
  } catch { return null; }
}

async function refreshAccess(refresh: string) {
  const r = await fetch(`${DIRECTUS_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
    cache: 'no-store'
  });
  if (!r.ok) { const e: any = new Error('Unauthorized'); e.status = 401; throw e; }
  return r.json();
}

async function fetchWithToken(path: string, token: string) { return directusFetch(path, { method: 'GET' }, token); }

async function serviceFetch(path: string) {
  if (!ALLOW_SERVICE_FALLBACK) { const e: any = new Error('Forbidden'); e.status = 403; throw e; }
  let token = SERVICE_TOKEN;
  if (!token) token = (await loginService()) || '';
  if (!token) { const e: any = new Error('Forbidden'); e.status = 403; throw e; }
  return fetchWithToken(path, token);
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const jar = cookies();
  const id = encodeURIComponent(params.id);
  let access = jar.get(ACCESS_COOKIE)?.value;
  const refresh = jar.get(REFRESH_COOKIE)?.value;

  if (!access && !refresh) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let refreshed = false;
  async function ensureAccess() {
    if (access) return;
    if (refresh && DIRECTUS_URL) {
      const rj = await refreshAccess(refresh);
      const newAccess = rj?.data?.access_token;
      if (newAccess) { access = newAccess; refreshed = true; }
    }
  }

  function extractStatus(err: any): number {
    if (!err) return 0;
    if (typeof err.status === 'number') return err.status;
    const msg = String(err.message || err);
    const m = msg.match(/Directus error (\d{3})/);
    return m ? Number(m[1]) : 0;
  }

  async function attemptFull(): Promise<{ data: any; partial?: boolean }> {
    try {
      if (!access) await ensureAccess();
      return { data: (await fetchWithToken(`/items/staff/${id}?fields=${FULL_FIELDS}`, access!)).data };
    } catch (e: any) {
      const status = extractStatus(e);
      if (status === 401 && !refreshed && refresh) {
        await ensureAccess();
        return attemptFull();
      }
      if (status === 403) {
        // Try minimal fields with same user token
        try {
          if (!access) await ensureAccess();
          const minimal = (await fetchWithToken(`/items/staff/${id}?fields=${MIN_FIELDS}`, access!)).data;
          return { data: { ...minimal, _partial: true }, partial: true };
        } catch (inner: any) {
          const innerStatus = extractStatus(inner);
          if (innerStatus === 403 && ALLOW_SERVICE_FALLBACK) {
            // service fallback full then minimal
            try {
              const svcFull = (await serviceFetch(`/items/staff/${id}?fields=${FULL_FIELDS}`)).data;
              return { data: svcFull };
            } catch (svcFullErr: any) {
              if (extractStatus(svcFullErr) === 403) {
                try {
                  const svcMin = (await serviceFetch(`/items/staff/${id}?fields=${MIN_FIELDS}`)).data;
                  return { data: { ...svcMin, _partial: true }, partial: true };
                } catch {}
              }
              throw inner;
            }
          }
          throw inner;
        }
      }
      throw e;
    }
  }

  try {
    const result = await attemptFull();
    if (!result.data) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    // Attempt to fetch roles (array) even if staff record is partial; if staff fetch itself was 403 we may still have token.
    let rolesInfo = { roles: [] as any[], partial: false };
    try {
      if (access) {
        rolesInfo = await fetchRolesForStaff(result.data.id, access, true);
      } else if (ALLOW_SERVICE_FALLBACK) {
        let svcToken = SERVICE_TOKEN;
        if (!svcToken) svcToken = (await loginService()) || '';
        if (svcToken) rolesInfo = await fetchRolesForStaff(result.data.id, svcToken, false);
      }
    } catch {}

    // Derive legacy single 'role' value from first role (name or code) for backward compatibility.
    const legacyRole = rolesInfo.roles.length ? (rolesInfo.roles[0].name || rolesInfo.roles[0].code || '') : '';
    const response = NextResponse.json({ data: {
      id: result.data.id,
      first_name: result.data.first_name || '',
      last_name: result.data.last_name || '',
      email: result.data._partial ? '' : (result.data.email || ''),
      role: result.data._partial ? '' : legacyRole,
      roles: rolesInfo.roles,
      _partial: result.data._partial || (rolesInfo.partial ? true : undefined) || undefined,
    }});
    if (refreshed && access) {
      response.cookies.set(ACCESS_COOKIE, access, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 15,
      });
    }
    if (result.partial) response.headers.set('X-Partial-Fields', '1');
    return response;
  } catch (e: any) {
    const status = ((): number => {
      if (typeof e?.status === 'number') return e.status;
      const m = String(e?.message || '').match(/Directus error (\d{3})/); return m ? Number(m[1]) : 0;
    })();
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (status === 404) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    devLog('GET failed', e?.message || e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// --- PATCH ---
const MUTABLE = new Set(['first_name','last_name','email']); // direct 'role' removed; we only sync roles via junction

async function syncRoles(staffId: string, desiredRoleIds: string[], token: string) {
  // Fetch existing junction records
  const path = `/items/${STAFF_ROLES_COLLECTION}?filter[${STAFF_ROLES_STAFF_FIELD}][_eq]=${encodeURIComponent(staffId)}&fields=id,${STAFF_ROLES_ROLE_FIELD}`;
  const existingResp = await directusFetch(path, { method: 'GET' }, token);
  const existingRows: any[] = Array.isArray(existingResp?.data) ? existingResp.data : [];
  const existingMap = new Map<string, string>(); // role_id -> junction id
  existingRows.forEach(r => {
    const roleId = typeof r?.[STAFF_ROLES_ROLE_FIELD] === 'object' ? r[STAFF_ROLES_ROLE_FIELD]?.id : r[STAFF_ROLES_ROLE_FIELD];
    if (roleId) existingMap.set(String(roleId), r.id);
  });
  const desiredSet = new Set(desiredRoleIds.map(r => String(r)));
  // Create needed
  for (const roleId of desiredSet) {
    if (!existingMap.has(roleId)) {
      await directusFetch(
        `/items/${STAFF_ROLES_COLLECTION}`,
        { method: 'POST', body: JSON.stringify({ [STAFF_ROLES_STAFF_FIELD]: staffId, [STAFF_ROLES_ROLE_FIELD]: roleId, status: 'published' }), headers: { 'Content-Type':'application/json' } },
        token
      );
    }
  }
  // Delete removed
  for (const [roleId, junctionId] of existingMap.entries()) {
    if (!desiredSet.has(roleId)) {
      await directusFetch(`/items/${STAFF_ROLES_COLLECTION}/${junctionId}`, { method: 'DELETE', headers: { 'Content-Type':'application/json' } }, token);
    }
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const jar = cookies();
  let access = jar.get(ACCESS_COOKIE)?.value;
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!access && !refresh) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const payload: Record<string, any> = {};
  let rolesUpdate: string[] | undefined;
  for (const k of Object.keys(body || {})) {
    if (k === 'roles' && Array.isArray(body[k])) {
      // roles array of ids
      rolesUpdate = body[k].map((r: any) => String(r));
    } else if (MUTABLE.has(k) && body[k] !== undefined) {
      const v = body[k];
      payload[k] = typeof v === 'string' ? v.trim() : v;
    }
    if (k === 'role' && body[k] && !body.roles) {
      // Accept legacy single role field only to convert into rolesUpdate
      const v = body[k];
      rolesUpdate = [String(v).trim()].filter(Boolean);
    }
  }
  if (Object.keys(payload).length === 0 && !rolesUpdate) return NextResponse.json({ error: 'No changes' }, { status: 400 });

  let refreshed = false;
  async function attemptStaffPatch(): Promise<any> {
    try {
      if (Object.keys(payload).length === 0) return { data: {} }; // skip staff patch if only roles
      return await directusFetch(
        `/items/staff/${encodeURIComponent(params.id)}`,
        { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } },
        access!
      );
    } catch (e: any) {
      const status = ((): number => {
        if (typeof e?.status === 'number') return e.status;
        const m = String(e?.message || '').match(/Directus error (\d{3})/); return m ? Number(m[1]) : 0;
      })();
      if (status === 401 && refresh && !refreshed) {
        const rj = await refreshAccess(refresh);
        const newAccess = rj?.data?.access_token;
        if (newAccess) { access = newAccess; refreshed = true; return attemptStaffPatch(); }
        const er: any = new Error('Unauthorized'); er.status = 401; throw er;
      }
      if (status === 403 && ALLOW_SERVICE_FALLBACK) {
        try {
          const svcToken = SERVICE_TOKEN || (await loginService()) || '';
          if (!svcToken) { const fe: any = new Error('Forbidden'); fe.status = 403; throw fe; }
          const r = await directusFetch(
              `/items/staff/${encodeURIComponent(params.id)}`,
              { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } },
              svcToken
            );
          access = svcToken; // use for subsequent role sync
          return r;
        } catch {
          const fe: any = new Error('Forbidden'); fe.status = 403; throw fe;
        }
      }
      throw e;
    }
  }

  try {
    const updated = await attemptStaffPatch();
    // Sync roles if requested
    if (rolesUpdate) {
      try {
        if (!access && ALLOW_SERVICE_FALLBACK) {
          let svc = SERVICE_TOKEN;
            if (!svc) svc = (await loginService()) || '';
            if (svc) access = svc;
        }
        if (!access) { const er: any = new Error('Forbidden'); er.status = 403; throw er; }
        await syncRoles(params.id, rolesUpdate, access);
      } catch (roleErr: any) {
        // If staff fields updated but roles failed, still return 207-like info; here we include warning
        return NextResponse.json({ data: updated?.data || updated, warning: 'Roles partially unsynced', roles_error: String(roleErr?.message || roleErr) }, { status: 207 });
      }
    }
    // Fetch fresh roles to return unified response
    let rolesReturn: any[] = [];
    try {
      if (access) {
        const rolesInfo = await fetchRolesForStaff(params.id, access, true);
        rolesReturn = rolesInfo.roles;
      }
    } catch {}
    const res = NextResponse.json({ data: { ...(updated?.data || updated), roles: rolesReturn } });
    if (refreshed && access) {
      res.cookies.set(ACCESS_COOKIE, access, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 15,
      });
    }
    return res;
  } catch (e: any) {
    const status = Number(e?.status) || 0;
    if (status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (status === 403) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (status === 404) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    devLog('PATCH failed', e?.message || e);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
