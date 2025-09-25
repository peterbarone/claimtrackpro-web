export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ACCESS_COOKIE = process.env.COOKIE_NAME || "ctrk_jwt";
const REFRESH_COOKIE = process.env.REFRESH_COOKIE_NAME || "ctrk_refresh";
const RAW_DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL;
if (!RAW_DIRECTUS_URL) throw new Error("Missing DIRECTUS_URL/NEXT_PUBLIC_DIRECTUS_URL");
const DIRECTUS_URL = RAW_DIRECTUS_URL.replace(/\/+$/, ""); // trim trailing slash

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

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const c = cookies();
  const access = c.get(ACCESS_COOKIE)?.value;
  const refresh = c.get(REFRESH_COOKIE)?.value;
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const claimId = params.id;

  // Two possible junction collection names (common variants)
  const collA = "claims_contacts";
  const collB = "claim_contacts";

  // Prefer relation filter by id, then fallback to direct eq
  const makeBase = (coll: string) => ({
    base1: `/items/${coll}?filter[claim][id][_eq]=${encodeURIComponent(claimId)}&sort[]=-date_created`,
    base2: `/items/${coll}?filter[claim][_eq]=${encodeURIComponent(claimId)}&sort[]=-date_created`,
  });

  // Full nested fields (may 403 if role can’t read nested)
  const fieldsFull =
    "id,claim,contact.id,contact.first_name,contact.last_name,contact.name,contact.email,contact.role";
  // Safe fallback (just ids)
  const fieldsSafe = "id,claim,contact";

  async function fetchJunction(withToken: string) {
    const variants = [makeBase(collA), makeBase(collB)];
    for (const v of variants) {
      // Try full fields + base1 → safe fields → base2 safe
      try {
        return await dFetch<{ data: any[] }>(`${v.base1}&fields=${fieldsFull}`, { method: "GET" }, withToken);
      } catch (e1: any) {
        const s1 = e1?.status as number | undefined;
        const m1 = String(e1?.message || "");
        if (s1 === 401) throw e1;
        if (s1 === 400 || s1 === 403 || /Field|permission|Forbidden/i.test(m1)) {
          try {
            return await dFetch<{ data: any[] }>(`${v.base1}&fields=${fieldsSafe}`, { method: "GET" }, withToken);
          } catch (e2: any) {
            const s2 = e2?.status as number | undefined;
            const m2 = String(e2?.message || "");
            if (s2 === 401) throw e2;
            if (s2 === 400 || s2 === 403 || /Field|permission|Forbidden/i.test(m2)) {
              try {
                return await dFetch<{ data: any[] }>(`${v.base2}&fields=${fieldsSafe}`, { method: "GET" }, withToken);
              } catch (e3: any) {
                const s3 = e3?.status as number | undefined;
                const m3 = String(e3?.message || "");
                if (s3 === 401) throw e3;
                if (s3 === 400 || s3 === 403 || /Field|permission|Forbidden/i.test(m3)) {
                  // try next variant (other collection name)
                  continue;
                }
                throw e3;
              }
            } else {
              throw e2;
            }
          }
        } else {
          throw e1;
        }
      }
    }
    // If we reach here, all variants failed with field/permission errors
    const err = new Error("Directus error 403: Forbidden");
    // @ts-ignore
    err.status = 403;
    throw err;
  }

  async function fetchContactsByIds(ids: (string | number)[], withToken: string) {
    if (!ids.length) return [];
    const idList = ids.join(",");
    // Try richer fields, then safe
    const fFull = "id,first_name,last_name,name,email,role";
    const fSafe = "id,name,email";
    try {
      const r = await dFetch<{ data: any[] }>(
        `/items/contacts?filter[id][_in]=${encodeURIComponent(idList)}&fields=${fFull}`,
        { method: "GET" },
        withToken
      );
      return r.data || [];
    } catch (e1: any) {
      const s1 = e1?.status as number | undefined;
      if (s1 === 401) throw e1;
      return (await dFetch<{ data: any[] }>(
        `/items/contacts?filter[id][_in]=${encodeURIComponent(idList)}&fields=${fSafe}`,
        { method: "GET" },
        withToken
      )).data || [];
    }
  }

  function normalizeContact(c: any) {
    if (!c) return null;
    const name =
      c.name ||
      [c.first_name, c.last_name].filter((p: any) => typeof p === "string" && p.trim()).join(" ") ||
      "";
    return {
      id: String(c.id ?? ""),
      name,
      email: c.email ?? null,
      role: typeof c.role === "object" ? c.role?.name ?? c.role?.id ?? null : c.role ?? null,
    };
  }

  async function handle(withToken: string) {
    const junction = await fetchJunction(withToken);
    const rows = Array.isArray(junction?.data) ? junction.data : [];

    // If we already have expanded contact objects, map directly
    const expanded = rows
      .map((r) => r?.contact)
      .filter((c) => c && typeof c === "object");

    if (expanded.length) {
      const contacts = expanded.map(normalizeContact).filter(Boolean);
      return NextResponse.json({ data: contacts }, { status: 200 });
    }

    // Otherwise fetch by ids
    const ids = rows
      .map((r) => r?.contact)
      .filter((v): v is string | number => typeof v === "string" || typeof v === "number");
    const unique = Array.from(new Set(ids));
    const contactsRaw = await fetchContactsByIds(unique, withToken);
    const contacts = contactsRaw.map(normalizeContact).filter(Boolean);
    return NextResponse.json({ data: contacts }, { status: 200 });
  }

  try {
    return await handle(access);
  } catch (err: any) {
    const status = err?.status as number | undefined;
    if (status === 401 && refresh) {
      try {
        const refreshed = await refreshAccessToken(refresh);
        const res = await handle(refreshed.access_token);
        setAuthCookies(res, refreshed.access_token, refreshed.refresh_token, refreshed.expires);
        return res;
      } catch (err2: any) {
        const m = /Directus error\s+(\d+)/.exec(String(err2?.message || ""));
        const s = (err2?.status as number) || (m ? parseInt(m[1], 10) : 401);
        return NextResponse.json({ error: "Unauthorized" }, { status: s });
      }
    }
    const m = /Directus error\s+(\d+)/.exec(String(err?.message || ""));
    const s = (err?.status as number) || (m ? parseInt(m[1], 10) : 500);
    return NextResponse.json({ error: String(err?.message || "Error") }, { status: s });
  }
}