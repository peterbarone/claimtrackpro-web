export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Reuse cookie names/service token strategy from other routes for consistency
const ACCESS_COOKIE = process.env.COOKIE_NAME || "ctrk_jwt";
const REFRESH_COOKIE = process.env.REFRESH_COOKIE_NAME || "ctrk_refresh";
const RAW_DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL;
if (!RAW_DIRECTUS_URL) throw new Error("Missing DIRECTUS_URL/NEXT_PUBLIC_DIRECTUS_URL");
const DIRECTUS_URL = RAW_DIRECTUS_URL.replace(/\/+$/, "");
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

// Unified timeline item type returned to client
interface TimelineItem {
  id: string;
  timestamp: string; // ISO
  type: "status" | "document" | "comment" | "assignment" | "default";
  action: string;
  description: string;
  user: string;
  status?: string | null;
  meta?: Record<string, any> | null;
}

// Helpers to soft-handle missing/legacy field names
function firstDate(...vals: any[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v) return v;
  }
  return null;
}

function personName(p: any): string {
  if (!p || typeof p !== "object") return "System";
  const first = (p.first_name || "").trim();
  const last = (p.last_name || "").trim();
  const full = `${first} ${last}`.trim();
  return full || p.name || p.id || "System";
}

// Individual fetchers (return raw arrays or throw)
async function fetchClaim(claimId: string, token?: string) {
  const fields = [
    "id",
    "claim_number",
    "date_created",
    "description",
    "status.name",
    "status.code",
    "status.status",
    "user_created.first_name",
    "user_created.last_name",
    "assigned_to_user.first_name",
    "assigned_to_user.last_name",
  ].join(",");
  return await dFetch<{ data: any }>(`/items/claims/${encodeURIComponent(claimId)}?fields=${fields}`, { method: "GET" }, token);
}

async function fetchNotes(claimId: string, token?: string) {
  const urls = [
    `/items/claim_notes?filter[claim][_eq]=${encodeURIComponent(claimId)}&sort[]=-created_at&fields=id,note,visibility,created_at,created_by.first_name,created_by.last_name`,
    `/items/claim_notes?filter[claim][_eq]=${encodeURIComponent(claimId)}&sort[]=-date_created&fields=id,note,visibility,date_created,created_by.first_name,created_by.last_name`,
  ];
  for (const u of urls) {
    try {
      return await dFetch<{ data: any[] }>(u, { method: "GET" }, token);
    } catch (e: any) {
      const s = e?.status as number | undefined;
      if (s === 401) throw e;
    }
  }
  return { data: [] };
}

async function fetchTasks(claimId: string, token?: string) {
  const urls = [
    `/items/claim_tasks?filter[claim][_eq]=${encodeURIComponent(claimId)}&sort[]=-date_created&fields=id,title,details,status,priority,due_date,date_created,created_by.first_name,created_by.last_name`,
    `/items/claim_tasks?filter[claim][id][_eq]=${encodeURIComponent(claimId)}&sort[]=-date_created&fields=id,title,details,status,priority,due_date,date_created,created_by.first_name,created_by.last_name`,
  ];
  for (const u of urls) {
    try {
      return await dFetch<{ data: any[] }>(u, { method: "GET" }, token);
    } catch (e: any) {
      const s = e?.status as number | undefined;
      if (s === 401) throw e;
    }
  }
  return { data: [] };
}

async function fetchDocuments(claimId: string, token?: string) {
  const urls = [
    `/items/claim_documents?filter[claim][_eq]=${encodeURIComponent(claimId)}&sort[]=-created_at&fields=id,file.id,file.title,file.filename_download,file.type,file.uploaded_on,created_at,created_by.first_name,created_by.last_name`,
    `/items/claim_documents?filter[claim][_eq]=${encodeURIComponent(claimId)}&sort[]=-uploaded_at&fields=id,file.id,file.title,file.filename_download,file.type,file.uploaded_on,uploaded_at,uploaded_by.first_name,uploaded_by.last_name`,
  ];
  for (const u of urls) {
    try {
      return await dFetch<{ data: any[] }>(u, { method: "GET" }, token);
    } catch (e: any) {
      const s = e?.status as number | undefined;
      if (s === 401) throw e;
    }
  }
  return { data: [] };
}

async function fetchStatusEvents(claimId: string, token?: string) {
  // Optional table; swallow errors if missing
  const url = `/items/claim_events?filter[claim][_eq]=${encodeURIComponent(claimId)}&sort[]=-created_at&fields=id,created_at,old_status,new_status,created_by.first_name,created_by.last_name`;
  try {
    return await dFetch<{ data: any[] }>(url, { method: "GET" }, token);
  } catch {
    return { data: [] };
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const claimId = params.id;
  const c = cookies();
  let access = c.get(ACCESS_COOKIE)?.value;
  const refresh = c.get(REFRESH_COOKIE)?.value;

  // Allow override ordering via query ?order=asc|desc (default desc)
  const url = new URL(req.url);
  const order = (url.searchParams.get("order") || "desc").toLowerCase() === "asc" ? "asc" : "desc";

  let preRefreshed: { access_token: string; refresh_token: string; expires?: number | string } | null = null;
  if (!access && refresh) {
    try {
      preRefreshed = await refreshAccessToken(refresh);
      access = preRefreshed.access_token;
    } catch {}
  }

  async function runWith(token?: string) {
    if (!token && !SERVICE_TOKEN) {
      const err = new Error("Unauthorized");
      // @ts-ignore
      err.status = 401;
      throw err;
    }
    const useToken = token || SERVICE_TOKEN;
    // Parallel fetches (independent)
    const [claimRes, notesRes, tasksRes, docsRes, statusRes] = await Promise.allSettled([
      fetchClaim(claimId, useToken),
      fetchNotes(claimId, useToken),
      fetchTasks(claimId, useToken),
      fetchDocuments(claimId, useToken),
      fetchStatusEvents(claimId, useToken),
    ]);

    const errors: string[] = [];
    const timeline: TimelineItem[] = [];

    // Claim created event
    if (claimRes.status === "fulfilled") {
      const cdata = claimRes.value?.data;
      if (cdata) {
        const createdAt = firstDate(cdata.date_created) || new Date().toISOString();
        const statusVal = (cdata?.status?.name || cdata?.status?.status || cdata?.status?.code || "").toString();
        timeline.push({
          id: `claim-${cdata.id}-created`,
          timestamp: createdAt,
          type: "status",
          action: "Claim Created",
            description: cdata.description || "",
          user: personName(cdata.user_created || cdata.assigned_to_user),
          status: statusVal ? statusVal.toLowerCase() : null,
          meta: { claimId: cdata.id },
        });
      }
    } else {
      errors.push(`claim:${claimRes.reason}`);
    }

    // Notes
    if (notesRes.status === "fulfilled") {
      for (const n of notesRes.value.data || []) {
        const ts = firstDate(n.created_at, n.date_created) || new Date().toISOString();
        timeline.push({
          id: `note-${n.id}`,
          timestamp: ts,
          type: "comment",
          action: "Note Added",
          description: n.note || "",
          user: personName(n.created_by),
          meta: { noteId: n.id, visibility: n.visibility },
        });
      }
    } else {
      errors.push(`notes:${notesRes.reason}`);
    }

    // Tasks
    if (tasksRes.status === "fulfilled") {
      for (const t of tasksRes.value.data || []) {
        const ts = firstDate(t.date_created) || new Date().toISOString();
        timeline.push({
          id: `task-${t.id}`,
          timestamp: ts,
          type: "assignment",
          action: "Task Created",
          description: t.title + (t.details ? ` — ${t.details}` : ""),
          user: personName(t.created_by),
          status: t.status || null,
          meta: { taskId: t.id, priority: t.priority, due_date: t.due_date },
        });
      }
    } else {
      errors.push(`tasks:${tasksRes.reason}`);
    }

    // Documents
    if (docsRes.status === "fulfilled") {
      for (const d of docsRes.value.data || []) {
        const ts = firstDate(d.created_at, d.uploaded_at, d.file?.uploaded_on) || new Date().toISOString();
        const fileLabel = d?.file?.title || d?.file?.filename_download || "Document";
        timeline.push({
          id: `doc-${d.id}`,
          timestamp: ts,
          type: "document",
          action: "File Uploaded",
          description: fileLabel,
          user: personName(d.created_by || d.uploaded_by),
          meta: { documentId: d.id, fileId: d?.file?.id, fileType: d?.file?.type },
        });
      }
    } else {
      errors.push(`docs:${docsRes.reason}`);
    }

    // Status events
    if (statusRes.status === "fulfilled") {
      for (const ev of statusRes.value.data || []) {
        const ts = firstDate(ev.created_at) || new Date().toISOString();
        timeline.push({
          id: `status-${ev.id}`,
          timestamp: ts,
          type: "status",
          action: "Status Changed",
          description: `${ev.old_status || "Unknown"} → ${ev.new_status || "Unknown"}`,
          user: personName(ev.created_by),
          status: (ev.new_status || "").toString().toLowerCase() || null,
          meta: { eventId: ev.id },
        });
      }
    } else {
      // Non-fatal
    }

    const sorted = timeline
      .filter((t) => !!t.timestamp)
      .sort((a, b) => {
        const da = new Date(a.timestamp).getTime();
        const db = new Date(b.timestamp).getTime();
        return order === "asc" ? da - db : db - da;
      });

    return { data: sorted, errors };
  }

  try {
    const result = await runWith(access);
    const res = NextResponse.json({
      data: result.data,
      count: result.data.length,
      partial: result.errors.length > 0,
      errors: result.errors.length ? result.errors : undefined,
    });
    if (preRefreshed) setAuthCookies(res, preRefreshed.access_token, preRefreshed.refresh_token, preRefreshed.expires);
    return res;
  } catch (err: any) {
    const s = err?.status as number | undefined;
    if (s === 401 && refresh) {
      try {
        const refreshed = await refreshAccessToken(refresh);
        const result = await runWith(refreshed.access_token);
        const res = NextResponse.json({
          data: result.data,
          count: result.data.length,
          partial: result.errors.length > 0,
          errors: result.errors.length ? result.errors : undefined,
        });
        setAuthCookies(res, refreshed.access_token, refreshed.refresh_token, refreshed.expires);
        return res;
      } catch (err2: any) {
        return NextResponse.json({ error: "Unauthorized" }, { status: err2?.status || 401 });
      }
    }
    const m = /Directus error\s+(\d+)/.exec(String(err?.message || ""));
    const code = (err?.status as number) || (m ? parseInt(m[1], 10) : 500);
    return NextResponse.json({ error: String(err?.message || "Error") }, { status: code });
  }
}
