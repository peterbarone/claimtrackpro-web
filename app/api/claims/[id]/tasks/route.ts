export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ACCESS_COOKIE = process.env.COOKIE_NAME || "ctrk_jwt";
const REFRESH_COOKIE = process.env.REFRESH_COOKIE_NAME || "ctrk_refresh";
const SERVICE_TOKEN = process.env.DIRECTUS_SERVICE_TOKEN || process.env.DIRECTUS_STATIC_TOKEN;
const SERVICE_EMAIL = process.env.DIRECTUS_EMAIL;
const SERVICE_PASSWORD = process.env.DIRECTUS_PASSWORD;
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
  // Directus can return tokens at json.data.* or top-level depending on version/config
  const data = json.data ?? json;
  return {
    access_token: data.access_token as string,
    refresh_token: (data.refresh_token as string) || refreshToken,
    // expires in seconds (epoch) or ISO; we handle both
    expires: data.expires as number | string | undefined,
  };
}

function setAuthCookies(res: NextResponse, access: string, refresh: string, expires?: number | string) {
  const opts = {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: !isLocal(),
    path: "/",
  };
  // derive maxAge from expires if it is a numeric epoch in seconds or ISO string
  let maxAge: number | undefined = undefined;
  if (typeof expires === "number") {
    const nowSec = Math.floor(Date.now() / 1000);
    const delta = Math.max(0, expires - nowSec);
    if (delta) maxAge = delta;
  } else if (typeof expires === "string") {
    const when = Date.parse(expires);
    if (!Number.isNaN(when)) {
      const delta = Math.max(0, Math.floor((when - Date.now()) / 1000));
      if (delta) maxAge = delta;
    }
  }

  res.cookies.set(ACCESS_COOKIE, access, { ...opts, ...(maxAge ? { maxAge } : {}) });
  res.cookies.set(REFRESH_COOKIE, refresh, { ...opts, ...(maxAge ? { maxAge: maxAge * 12 } : {}) });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const c = cookies();
  const access = c.get(ACCESS_COOKIE)?.value;
  const refresh = c.get(REFRESH_COOKIE)?.value;

  // Prefer user access; fallback to service token or service login if configured
  let token: string | undefined = access;
  if (!token && SERVICE_TOKEN) token = SERVICE_TOKEN;
  if (!token && SERVICE_EMAIL && SERVICE_PASSWORD) {
    try {
      const r = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ email: SERVICE_EMAIL, password: SERVICE_PASSWORD }),
        cache: "no-store",
      });
      const j = await r.json().catch(() => ({} as any));
      if (r.ok && j?.data?.access_token) token = j.data.access_token as string;
    } catch {}
  }
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Build query variants (some Directus setups prefer claim.id eq)
  const base1 = `/items/claim_tasks?filter[claim][id][_eq]=${encodeURIComponent(params.id)}&sort[]=-date_created`;
  const base2 = `/items/claim_tasks?filter[claim][_eq]=${encodeURIComponent(params.id)}&sort[]=-date_created`;
  const fieldsFull =
    "id,claim,status,priority,assignee.id,assignee.name,title,details,due_date,date_created,created_by.first_name,created_by.last_name";
  const fieldsSafe =
    "id,claim,status,priority,assignee,title,details,due_date,date_created,created_by";

  async function fetchTasks(withToken: string) {
    // Try full fields + base1 → fallback fields → fallback base2
    try {
      return await dFetch<{ data: any[] }>(`${base1}&fields=${fieldsFull}`, { method: "GET" }, withToken);
    } catch (e: any) {
      const status = e?.status as number | undefined;
      const msg: string = String(e?.message || "");
      if (status === 401) throw e; // let caller handle refresh
      if (status === 400 || status === 403 || /Field|permission|Forbidden/i.test(msg)) {
        // retry safe fields
        try {
          return await dFetch<{ data: any[] }>(`${base1}&fields=${fieldsSafe}`, { method: "GET" }, withToken);
        } catch (e2: any) {
          const status2 = e2?.status as number | undefined;
          const msg2: string = String(e2?.message || "");
          if (status2 === 401) throw e2;
          if (status2 === 400 || status2 === 403 || /Field|permission|Forbidden/i.test(msg2)) {
            // try base2 with safe fields last
            return await dFetch<{ data: any[] }>(`${base2}&fields=${fieldsSafe}`, { method: "GET" }, withToken);
          }
          throw e2;
        }
      }
      throw e;
    }
  }

  let refreshed: { access_token: string; refresh_token: string; expires?: number | string } | null = null;

  try {
    const data = await fetchTasks(token);
    return NextResponse.json({ data: data.data }, { status: 200 });
  } catch (err: any) {
    const status = err?.status as number | undefined;
  if (status === 401 && refresh) {
      // try refresh then retry once
      try {
        refreshed = await refreshAccessToken(refresh);
  const data = await fetchTasks(refreshed.access_token);
        const res = NextResponse.json({ data: data.data }, { status: 200 });
        setAuthCookies(res, refreshed.access_token, refreshed.refresh_token, refreshed.expires);
        return res;
      } catch (err2: any) {
        const m = /Directus error\s+(\d+)/.exec(String(err2?.message || ""));
        const s = (err2?.status as number) || (m ? parseInt(m[1], 10) : 401);
        return NextResponse.json({ error: "Unauthorized" }, { status: s });
      }
    }

    // Preserve Directus status code when possible, but degrade 403 to empty list
    const m = /Directus error\s+(\d+)/.exec(String(err?.message || ""));
    const s = (err?.status as number) || (m ? parseInt(m[1], 10) : 500);
    if (s === 403) {
      // Return empty list so UI can still render; optionally include a warning message
      return NextResponse.json({ data: [], warning: 'Forbidden fetching tasks; returning empty list' }, { status: 200 });
    }
    return NextResponse.json({ error: String(err?.message || "Error") }, { status: s });
  }
}