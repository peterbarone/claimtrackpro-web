export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ACCESS_COOKIE = process.env.COOKIE_NAME || "ctrk_jwt";
const REFRESH_COOKIE = process.env.REFRESH_COOKIE_NAME || "ctrk_rjwt";
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
  const opts = {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: !isLocal(),
    path: "/",
  };
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
  res.cookies.set(REFRESH_COOKIE, refresh, { ...opts, ...(maxAge ? { maxAge: (maxAge as number) * 12 } : {}) });
}

const NOTE_COLLECTIONS = ["claim_notes", "claims_notes", "notes"] as const;
// Shape: { id, claim, note, visibility }
const FIELDS_FULL = "id,claim,note,visibility,date_created";
const FIELDS_SAFE = "id,claim,note,visibility,date_created";

function buildListPaths(claimId: string) {
  return NOTE_COLLECTIONS.flatMap((coll) => {
    const base1 = `/items/${coll}?filter[claim][id][_eq]=${encodeURIComponent(claimId)}&sort[]=-date_created`;
    const base2 = `/items/${coll}?filter[claim][_eq]=${encodeURIComponent(claimId)}&sort[]=-date_created`;
    return [
      { coll, base: `${base1}` },
      { coll, base: `${base2}` },
    ];
  });
}

async function fetchNotesList(claimId: string, token: string) {
  const variants = buildListPaths(claimId);
  for (const v of variants) {
    try {
      return await dFetch<{ data: any[] }>(`${v.base}&fields=${FIELDS_FULL}`, { method: "GET" }, token);
    } catch (e1: any) {
      const s1 = e1?.status as number | undefined;
      const m1 = String(e1?.message || "");
      if (s1 === 401) throw e1;
      if (s1 === 400 || s1 === 403 || /Field|permission|Forbidden/i.test(m1)) {
        try {
          return await dFetch<{ data: any[] }>(`${v.base}&fields=${FIELDS_SAFE}`, { method: "GET" }, token);
        } catch (e2: any) {
          const s2 = e2?.status as number | undefined;
          const m2 = String(e2?.message || "");
          if (s2 === 401) throw e2;
          if (s2 === 400 || s2 === 403 || /Field|permission|Forbidden/i.test(m2)) {
            continue;
          }
          throw e2;
        }
      } else {
        throw e1;
      }
    }
  }
  const err = new Error("Directus error 403: Forbidden");
  // @ts-ignore
  err.status = 403;
  throw err;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const c = cookies();
  const access = c.get(ACCESS_COOKIE)?.value;
  const refresh = c.get(REFRESH_COOKIE)?.value;
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const claimId = params.id;

  async function handle(withToken: string) {
    const r = await fetchNotesList(claimId, withToken);
    return NextResponse.json({ data: r.data || [] }, { status: 200 });
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

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const c = cookies();
  const access = c.get(ACCESS_COOKIE)?.value;
  const refresh = c.get(REFRESH_COOKIE)?.value;
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const claimId = params.id;
  const body = (await req.json().catch(() => ({}))) as {
    note?: string;
    visibility?: string; // e.g., "internal" | "external"
  };
  if (!body?.note || typeof body.note !== "string") {
    return NextResponse.json({ error: "note is required" }, { status: 400 });
  }

  const payload = {
    claim: claimId,
    note: body.note,
    ...(body.visibility ? { visibility: body.visibility } : {}),
  };

  async function createNote(withToken: string) {
    for (const coll of NOTE_COLLECTIONS) {
      try {
        const created = await dFetch<{ data: any }>(
          `/items/${coll}`,
          { method: "POST", body: JSON.stringify(payload) },
          withToken
        );
        return created?.data ?? created;
      } catch (e: any) {
        const s = e?.status as number | undefined;
        if (s === 401) throw e;
        if (s === 404 || s === 400 || s === 403) continue; // try next collection name
        throw e;
      }
    }
    const err = new Error("Directus error 404: notes collection not found");
    // @ts-ignore
    err.status = 404;
    throw err;
  }

  async function handle(withToken: string) {
    const data = await createNote(withToken);
    return NextResponse.json({ data }, { status: 201 });
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
