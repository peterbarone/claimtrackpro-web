export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ACCESS_COOKIE = process.env.COOKIE_NAME || "ctrk_jwt";
const REFRESH_COOKIE = process.env.REFRESH_COOKIE_NAME || "ctrk_refresh";
const RAW_DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL;
if (!RAW_DIRECTUS_URL) throw new Error("Missing DIRECTUS_URL/NEXT_PUBLIC_DIRECTUS_URL");
const DIRECTUS_URL = RAW_DIRECTUS_URL.replace(/\/+$/, "");

// Optional service token fallback (match working routes if they use it)
const SERVICE_TOKEN =
  process.env.DIRECTUS_STATIC_TOKEN ||
  process.env.DIRECTUS_SERVICE_TOKEN ||
  process.env.DIRECTUS_TOKEN ||
  process.env.DIRECTUS_ADMIN_TOKEN ||
  "";

function isLocal() {
  try {
    return DIRECTUS_URL.startsWith("http://localhost") || DIRECTUS_URL.startsWith("http://127.");
  } catch {
    return true;
  }
}

type Json = Record<string, any>;

async function dFetch<T = any>(path: string, init: RequestInit = {}, token?: string) {
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers || {}),
  };
  const r = await fetch(`${DIRECTUS_URL}${path}`, { ...init, headers, cache: "no-store" });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    const err = new Error(`Directus error ${r.status}: ${txt || r.statusText}`);
    // @ts-ignore
    err.status = r.status;
    throw err;
  }
  return (await r.json()) as T;
}

async function refreshAccessToken(refreshToken: string) {
  const r = await fetch(`${DIRECTUS_URL}/auth/refresh`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    const err = new Error(`Directus refresh error ${r.status}: ${txt || r.statusText}`);
    // @ts-ignore
    err.status = r.status;
    throw err;
  }
  const json = (await r.json()) as Json;
  const data = json.data ?? json;
  return {
    access_token: data.access_token as string,
    refresh_token: (data.refresh_token as string) || refreshToken,
    expires: data.expires as number | string | undefined,
  };
}

function setAuthCookies(res: NextResponse, access: string, refresh: string, expires?: number | string) {
  const opts = { httpOnly: true as const, sameSite: "lax" as const, secure: !isLocal(), path: "/" };
  let maxAge: number | undefined;
  if (typeof expires === "number") {
    const now = Math.floor(Date.now() / 1000);
    maxAge = Math.max(0, expires - now);
  } else if (typeof expires === "string") {
    const when = Date.parse(expires);
    if (!Number.isNaN(when)) maxAge = Math.max(0, Math.floor((when - Date.now()) / 1000));
  }
  res.cookies.set(ACCESS_COOKIE, access, { ...opts, ...(maxAge ? { maxAge } : {}) });
  res.cookies.set(REFRESH_COOKIE, refresh, { ...opts, ...(maxAge ? { maxAge: maxAge * 12 } : {}) });
}

const NOTES_COLLECTIONS = ["claim_notes", "claims_notes", "notes"];
// Prefer new model fields; include fallback to legacy date_created
const FIELDS_CREATED_AT = "id,claim,note,visibility,created_at,created_by";
const FIELDS_DATE_CREATED = "id,claim,note,visibility,date_created,created_by";

function buildListUrls(claimId: string) {
  return NOTES_COLLECTIONS.flatMap((coll) => {
    const q1 = (fields: string, sortField: string) =>
      `/items/${coll}?filter[claim][id][_eq]=${encodeURIComponent(claimId)}&sort[]=-${sortField}&fields=${fields}`;
    const q2 = (fields: string, sortField: string) =>
      `/items/${coll}?filter[claim][_eq]=${encodeURIComponent(claimId)}&sort[]=-${sortField}&fields=${fields}`;
    return [
      q1(FIELDS_CREATED_AT, "created_at"),
      q2(FIELDS_CREATED_AT, "created_at"),
      // Legacy fallbacks
      q1(FIELDS_DATE_CREATED, "date_created"),
      q2(FIELDS_DATE_CREATED, "date_created"),
    ];
  });
}

async function listNotes(claimId: string, token: string) {
  let last: any;
  for (const url of buildListUrls(claimId)) {
    try {
      return await dFetch<{ data: any[] }>(url, { method: "GET" }, token);
    } catch (e: any) {
      last = e;
      const s = e?.status as number | undefined;
      const msg = String(e?.message || "");
      if (s === 401) throw e;
      if (!(s === 400 || s === 403 || s === 404 || /Field|permission|Forbidden|Unknown field/i.test(msg))) {
        throw e;
      }
    }
  }
  throw last || new Error("Directus error 403: Forbidden");
}

async function createNote(claimId: string, body: { note?: string; visibility?: string }, token: string) {
  const payload = { claim: claimId, note: body.note, ...(body.visibility ? { visibility: body.visibility } : {}) };
  let last: any;
  for (const coll of NOTES_COLLECTIONS) {
    try {
      return await dFetch<{ data: any }>(`/items/${coll}`, { method: "POST", body: JSON.stringify(payload) }, token);
    } catch (e: any) {
      last = e;
      const s = e?.status as number | undefined;
      if (s === 401) throw e;
      if (!(s === 400 || s === 403 || s === 404)) throw e;
    }
  }
  throw last || new Error("Directus error 404: notes collection not found");
}

// Add date_created alias for backward compatibility with existing UI
function mapForCompatibility(items: any[]) {
  return (items || []).map((n) => ({
    ...n,
    date_created: n?.date_created ?? n?.created_at ?? null,
  }));
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const c = cookies();
  let access = c.get(ACCESS_COOKIE)?.value;
  const refresh = c.get(REFRESH_COOKIE)?.value;
  const claimId = params.id;

  // Pre-refresh if access missing but refresh exists (mirrors tasks behavior)
  let preRefreshed: { access_token: string; refresh_token: string; expires?: number | string } | null = null;
  if (!access && refresh) {
    try {
      preRefreshed = await refreshAccessToken(refresh);
      access = preRefreshed.access_token;
    } catch {}
  }

  async function tryUserThenService(token?: string) {
    if (token) {
      try {
        return await listNotes(claimId, token);
      } catch (e: any) {
        const s = e?.status as number | undefined;
        if (s === 401) throw e;
        if ((s === 400 || s === 403 || s === 404) && SERVICE_TOKEN) {
          return await listNotes(claimId, SERVICE_TOKEN);
        }
        throw e;
      }
    } else if (SERVICE_TOKEN) {
      return await listNotes(claimId, SERVICE_TOKEN);
    }
    const err = new Error("Unauthorized");
    // @ts-ignore
    err.status = 401;
    throw err;
  }

  try {
    const r = await tryUserThenService(access);
    const res = NextResponse.json({ data: mapForCompatibility(r.data || []) }, { status: 200 });
    if (preRefreshed) setAuthCookies(res, preRefreshed.access_token, preRefreshed.refresh_token, preRefreshed.expires);
    return res;
  } catch (err: any) {
    const s = err?.status as number | undefined;
    if (s === 401 && refresh) {
      try {
        const refreshed = await refreshAccessToken(refresh);
        const r = await tryUserThenService(refreshed.access_token);
        const res = NextResponse.json({ data: mapForCompatibility(r.data || []) }, { status: 200 });
        setAuthCookies(res, refreshed.access_token, refreshed.refresh_token, refreshed.expires);
        return res;
      } catch (err2: any) {
        const m = /Directus error\s+(\d+)/.exec(String(err2?.message || ""));
        const code = (err2?.status as number) || (m ? parseInt(m[1], 10) : 401);
        return NextResponse.json({ error: "Unauthorized" }, { status: code });
      }
    }
    const m = /Directus error\s+(\d+)/.exec(String(err?.message || ""));
    const code = (s as number) || (m ? parseInt(m[1], 10) : 500);
    return NextResponse.json({ error: String(err?.message || "Error") }, { status: code });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const c = cookies();
  let access = c.get(ACCESS_COOKIE)?.value;
  const refresh = c.get(REFRESH_COOKIE)?.value;
  const claimId = params.id;

  const body = (await req.json().catch(() => ({}))) as { note?: string; visibility?: string };
  if (!body?.note || typeof body.note !== "string") {
    return NextResponse.json({ error: "note is required" }, { status: 400 });
  }

  // Pre-refresh like tasks
  let preRefreshed: { access_token: string; refresh_token: string; expires?: number | string } | null = null;
  if (!access && refresh) {
    try {
      preRefreshed = await refreshAccessToken(refresh);
      access = preRefreshed.access_token;
    } catch {}
  }

  async function tryUserThenService(token?: string) {
    if (token) {
      try {
        return await createNote(claimId, body, token);
      } catch (e: any) {
        const s = e?.status as number | undefined;
        if (s === 401) throw e;
        if ((s === 400 || s === 403 || s === 404) && SERVICE_TOKEN) {
          return await createNote(claimId, body, SERVICE_TOKEN);
        }
        throw e;
      }
    } else if (SERVICE_TOKEN) {
      return await createNote(claimId, body, SERVICE_TOKEN);
    }
    const err = new Error("Unauthorized");
    // @ts-ignore
    err.status = 401;
    throw err;
  }

  try {
    const r = await tryUserThenService(access);
    const res = NextResponse.json({ data: r.data ?? r }, { status: 201 });
    if (preRefreshed) setAuthCookies(res, preRefreshed.access_token, preRefreshed.refresh_token, preRefreshed.expires);
    return res;
  } catch (err: any) {
    const s = err?.status as number | undefined;
    if (s === 401 && refresh) {
      try {
        const refreshed = await refreshAccessToken(refresh);
        const r = await tryUserThenService(refreshed.access_token);
        const res = NextResponse.json({ data: r.data ?? r }, { status: 201 });
        setAuthCookies(res, refreshed.access_token, refreshed.refresh_token, refreshed.expires);
        return res;
      } catch (err2: any) {
        const m = /Directus error\s+(\d+)/.exec(String(err2?.message || ""));
        const code = (err2?.status as number) || (m ? parseInt(m[1], 10) : 401);
        return NextResponse.json({ error: "Unauthorized" }, { status: code });
      }
    }
    const m = /Directus error\s+(\d+)/.exec(String(err?.message || ""));
    const code = (s as number) || (m ? parseInt(m[1], 10) : 500);
    return NextResponse.json({ error: String(err?.message || "Error") }, { status: code });
  }
}