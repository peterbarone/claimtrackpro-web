export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ACCESS_COOKIE = process.env.COOKIE_NAME || "ctrk_jwt";
const REFRESH_COOKIE = process.env.REFRESH_COOKIE_NAME || "ctrk_refresh";
const RAW_DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL;
if (!RAW_DIRECTUS_URL) throw new Error("Missing DIRECTUS_URL/NEXT_PUBLIC_DIRECTUS_URL");
const DIRECTUS_URL = RAW_DIRECTUS_URL.replace(/\/+$/, "");

// Optional service token fallback (keep parity with your notes route)
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

/* ============================
 * messages helpers
 * ============================ */

// Preferred fields (with created_at) + legacy fallback (date_created)
const MSG_FIELDS_CREATED_AT =
  "id,claim,body,parent_message,thread_root,attachments.id,attachments.filename_download,created_at,created_by,author_participant.id,author_participant.role,author_participant.user.id,author_participant.user.first_name,author_participant.user.last_name";
const MSG_FIELDS_DATE_CREATED =
  "id,claim,body,parent_message,thread_root,attachments.id,attachments.filename_download,date_created,created_by,author_participant.id,author_participant.role,author_participant.user.id,author_participant.user.first_name,author_participant.user.last_name";

function buildMessageListUrls(claimId: string) {
  // Try both claim relation styles (claim.id and claim) and both created/date_created with newest first
  const q1 = (fields: string, sortField: string) =>
    `/items/claim_messages?filter[claim][id][_eq]=${encodeURIComponent(
      claimId
    )}&filter[is_deleted][_neq]=true&sort[]=-${sortField}&fields=${fields}`;
  const q2 = (fields: string, sortField: string) =>
    `/items/claim_messages?filter[claim][_eq]=${encodeURIComponent(
      claimId
    )}&filter[is_deleted][_neq]=true&sort[]=-${sortField}&fields=${fields}`;
  return [
    q1(MSG_FIELDS_CREATED_AT, "created_at"),
    q2(MSG_FIELDS_CREATED_AT, "created_at"),
    // Legacy fallbacks
    q1(MSG_FIELDS_DATE_CREATED, "date_created"),
    q2(MSG_FIELDS_DATE_CREATED, "date_created"),
  ];
}

async function listMessages(claimId: string, token: string) {
  let last: any;
  for (const url of buildMessageListUrls(claimId)) {
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

async function getMe(token: string) {
  const r = await dFetch<{ data: any }>(`/users/me?fields=id,first_name,last_name`, { method: "GET" }, token);
  return r?.data ?? r;
}

async function findAuthorParticipantId(claimId: string, token: string) {
  // Find the claim_participants row linking THIS user to THIS claim
  // Works with user token (uses $CURRENT_USER) – keeps permissions intact
  const url = `/items/claim_participants?limit=1&fields=id,user.id,role&filter[claim][_eq]=${encodeURIComponent(
    claimId
  )}&filter[user][_eq]=$CURRENT_USER`;
  const res = await dFetch<{ data: any[] }>(url, { method: "GET" }, token);
  return res?.data?.[0]?.id as string | undefined;
}

type CreateMsgBody = {
  body?: string;
  parent_message?: string | null;
  attachments?: string[] | { id: string }[];
  // optional override if posting with a service token or from an admin tool
  author_participant?: string;
};

async function createMessage(claimId: string, body: CreateMsgBody, token: string) {
  if (!body?.body || typeof body.body !== "string") {
    const err = new Error("body is required");
    // @ts-ignore
    err.status = 400;
    throw err;
  }

  // Resolve author_participant:
  // 1) If provided explicitly (admin/service scenarios) use it.
  // 2) Else, derive from the current user’s participant row.
  let author_participant = body.author_participant;
  if (!author_participant) {
    author_participant = await findAuthorParticipantId(claimId, token);
  }
  if (!author_participant) {
    const err = new Error("Not a participant of this claim (author_participant not found)");
    // @ts-ignore
    err.status = 403;
    throw err;
  }

  // Normalize attachments: accept array of file IDs or objects { id }
  let attachments: any[] | undefined;
  if (Array.isArray(body.attachments) && body.attachments.length > 0) {
    attachments = body.attachments.map((a: any) => (typeof a === "string" ? { id: a } : a));
  }

  const payload = {
    claim: claimId,
    author_participant,
    body: body.body,
    parent_message: body.parent_message ?? null,
    ...(attachments ? { attachments } : {}),
  };

  return await dFetch<{ data: any }>(`/items/claim_messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

// Back-compat: expose date_created no matter whether your model uses created_at
function mapForCompatibility(items: any[]) {
  return (items || []).map((m) => ({
    ...m,
    date_created: m?.date_created ?? m?.created_at ?? null,
  }));
}

/* ============================
 * GET: list messages
 * ============================ */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const claimId = params.id;
  const c = cookies();
  let access = c.get(ACCESS_COOKIE)?.value;
  const refresh = c.get(REFRESH_COOKIE)?.value;

  // Pre-refresh if access missing but refresh exists (mirror notes)
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
        return await listMessages(claimId, token);
      } catch (e: any) {
        const s = e?.status as number | undefined;
        if (s === 401) throw e;
        if ((s === 400 || s === 403 || s === 404) && SERVICE_TOKEN) {
          return await listMessages(claimId, SERVICE_TOKEN);
        }
        throw e;
      }
    } else if (SERVICE_TOKEN) {
      return await listMessages(claimId, SERVICE_TOKEN);
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

/* ============================
 * POST: create message
 * ============================ */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const claimId = params.id;
  const c = cookies();
  let access = c.get(ACCESS_COOKIE)?.value;
  const refresh = c.get(REFRESH_COOKIE)?.value;

  const body = (await req.json().catch(() => ({}))) as CreateMsgBody;
  if (!body?.body || typeof body.body !== "string") {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  // Pre-refresh like other routes
  let preRefreshed: { access_token: string; refresh_token: string; expires?: number | string } | null = null;
  if (!access && refresh) {
    try {
      preRefreshed = await refreshAccessToken(refresh);
      access = preRefreshed.access_token;
    } catch {}
  }

  // For POST, we strongly prefer a user token (to resolve author_participant).
  // If only a service token is available, caller MUST supply body.author_participant.
  async function tryUserThenService(token?: string) {
    if (token) {
      try {
        return await createMessage(claimId, body, token);
      } catch (e: any) {
        const s = e?.status as number | undefined;
        if (s === 401) throw e;
        // If forbidden and we have a service token AND author_participant was provided, try with service
        if ((s === 400 || s === 403 || s === 404) && SERVICE_TOKEN && body?.author_participant) {
          return await createMessage(claimId, body, SERVICE_TOKEN);
        }
        throw e;
      }
    } else if (SERVICE_TOKEN && body?.author_participant) {
      return await createMessage(claimId, body, SERVICE_TOKEN);
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

