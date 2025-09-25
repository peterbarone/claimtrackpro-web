export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

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
const DIRECTUS_FILES_FOLDER_ID = process.env.DIRECTUS_FILES_FOLDER_ID || "";

function isLocal() {
  try {
    return DIRECTUS_URL.startsWith("http://localhost") || DIRECTUS_URL.startsWith("http://127.");
  } catch {
    return true;
  }
}

type Json = Record<string, any>;

async function dFetch<T = any>(path: string, init: RequestInit = {}, token?: string) {
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  const headers: HeadersInit = isForm
    ? {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      }
    : {
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
    // @ts-ignore
    err.body = txt;
    throw err;
  }
  const ct = r.headers.get("content-type") || "";
  if (/application\/json/i.test(ct)) return (await r.json()) as T;
  // allow callers to handle non-JSON if needed
  // @ts-ignore
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

const JUNCTION_COLLECTIONS = ["claim_files", "claims_files", "claim_documents", "claims_documents"];
const FIELDS_FULL =
  "id,claim,visibility,created_at,created_by,file.id,file.filename_download,file.title,file.type,file.filesize,file.uploaded_on";
const FIELDS_SAFE = "id,claim,visibility,created_at,created_by,file";

function buildListUrls(claimId: string) {
  return JUNCTION_COLLECTIONS.flatMap((coll) => {
    const q = (fields: string, sortField: string) =>
      `/items/${coll}?filter[claim][_eq]=${encodeURIComponent(claimId)}&sort[]=-${sortField}&fields=${fields}`;
    const qRel = (fields: string, sortField: string) =>
      `/items/${coll}?filter[claim][id][_eq]=${encodeURIComponent(claimId)}&sort[]=-${sortField}&fields=${fields}`;
    return [
      q(FIELDS_FULL, "created_at"),
      qRel(FIELDS_FULL, "created_at"),
      q(FIELDS_SAFE, "created_at"),
      qRel(FIELDS_SAFE, "created_at"),
      q(FIELDS_SAFE, "date_created"),
      qRel(FIELDS_SAFE, "date_created"),
    ];
  });
}

async function listFiles(claimId: string, token: string) {
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

async function uploadDirectusFile(file: File, token: string, extras?: Record<string, any>) {
  const fd = new FormData();
  fd.append("file", file, file.name);
  if (DIRECTUS_FILES_FOLDER_ID) fd.append("folder", DIRECTUS_FILES_FOLDER_ID);
  if (extras) Object.entries(extras).forEach(([k, v]) => v != null && fd.append(k, String(v)));
  return await dFetch<{ data: any }>(`/files`, { method: "POST", body: fd }, token);
}

async function createJunction(claimId: string, fileId: string, visibility: string | undefined, token: string) {
  let last: any;
  const payload = { claim: claimId, file: fileId, ...(visibility ? { visibility } : {}) };
  for (const coll of JUNCTION_COLLECTIONS) {
    try {
      return await dFetch<{ data: any }>(`/items/${coll}`, { method: "POST", body: JSON.stringify(payload) }, token);
    } catch (e: any) {
      last = e;
      const s = e?.status as number | undefined;
      if (s === 401) throw e;
      if (!(s === 400 || s === 403 || s === 404)) throw e;
    }
  }
  throw last || new Error("Directus error 404: claim file collection not found");
}

function mapFiles(items: any[]) {
  const base = DIRECTUS_URL;
  return (items || []).map((it) => {
    const f = it.file || {};
    const fileId = f?.id ?? null;
    const filename = f?.filename_download ?? null;
    const title = f?.title ?? filename ?? null;
    const type = f?.type ?? null;
    const size = f?.filesize ?? null;
    const uploaded_on = f?.uploaded_on ?? null;
    const download_url = fileId ? `/api/files/${encodeURIComponent(fileId)}?download=1` : null;
    return {
      id: String(it.id),
      claim: it.claim ?? null,
      visibility: it.visibility ?? null,
      created_at: it.created_at ?? it.date_created ?? null,
      created_by: it.created_by ?? null,
      file: {
        id: fileId,
        title,
        filename,
        type,
        size,
        uploaded_on,
        download_url,
        // Direct link (may require token)
        directus_url: fileId ? `${base}/assets/${fileId}?download` : null,
      },
    };
  });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const c = cookies();
  let access = c.get(ACCESS_COOKIE)?.value;
  const refresh = c.get(REFRESH_COOKIE)?.value;
  const claimId = params.id;

  // Pre-refresh if access missing but refresh exists
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
        return await listFiles(claimId, token);
      } catch (e: any) {
        const s = e?.status as number | undefined;
        if (s === 401) throw e;
        if ((s === 400 || s === 403 || s === 404) && SERVICE_TOKEN) {
          return await listFiles(claimId, SERVICE_TOKEN);
        }
        throw e;
      }
    } else if (SERVICE_TOKEN) {
      return await listFiles(claimId, SERVICE_TOKEN);
    }
    const err = new Error("Unauthorized");
    // @ts-ignore
    err.status = 401;
    throw err;
  }

  try {
    const r = await tryUserThenService(access);
    const res = NextResponse.json({ data: mapFiles(r.data || []) }, { status: 200 });
    if (preRefreshed) setAuthCookies(res, preRefreshed.access_token, preRefreshed.refresh_token, preRefreshed.expires);
    return res;
  } catch (err: any) {
    const s = err?.status as number | undefined;
    if (s === 401 && refresh) {
      try {
        const refreshed = await refreshAccessToken(refresh);
        const r = await tryUserThenService(refreshed.access_token);
        const res = NextResponse.json({ data: mapFiles(r.data || []) }, { status: 200 });
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

  // Pre-refresh if access missing but refresh exists
  let preRefreshed: { access_token: string; refresh_token: string; expires?: number | string } | null = null;
  if (!access && refresh) {
    try {
      preRefreshed = await refreshAccessToken(refresh);
      access = preRefreshed.access_token;
    } catch {}
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }
  const file = form.get("file") as unknown as File | null;
  const visibility = (form.get("visibility") as string | null) || undefined;
  if (!file || typeof file !== "object" || typeof (file as any).arrayBuffer !== "function") {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  async function tryUserThenServiceUpload(token?: string) {
    if (token) {
      try {
  const upload = await uploadDirectusFile(file, token);
  const fileId = upload?.data?.id;
        if (!fileId) throw new Error("Upload succeeded but missing file id");
        const j = await createJunction(claimId, String(fileId), visibility, token);
        return { upload, junction: j };
      } catch (e: any) {
        const s = e?.status as number | undefined;
        if (s === 401) throw e;
        if ((s === 400 || s === 403 || s === 404) && SERVICE_TOKEN) {
          const upload = await uploadDirectusFile(file, SERVICE_TOKEN);
          const fileId = upload?.data?.id;
          if (!fileId) throw new Error("Upload succeeded but missing file id");
          const j = await createJunction(claimId, String(fileId), visibility, SERVICE_TOKEN);
          return { upload, junction: j };
        }
        throw e;
      }
    } else if (SERVICE_TOKEN) {
  const upload = await uploadDirectusFile(file, SERVICE_TOKEN);
  const fileId = upload?.data?.id;
      if (!fileId) throw new Error("Upload succeeded but missing file id");
      const j = await createJunction(claimId, String(fileId), visibility, SERVICE_TOKEN);
      return { upload, junction: j };
    }
    const err = new Error("Unauthorized");
    // @ts-ignore
    err.status = 401;
    throw err;
  }

  try {
    const r = await tryUserThenServiceUpload(access);
    const res = NextResponse.json({ data: { file: r.upload?.data ?? r.upload, junction: r.junction?.data ?? r.junction } }, { status: 201 });
    if (preRefreshed) setAuthCookies(res, preRefreshed.access_token, preRefreshed.refresh_token, preRefreshed.expires);
    return res;
  } catch (err: any) {
    const s = err?.status as number | undefined;
    if (s === 401 && refresh) {
      try {
        const refreshed = await refreshAccessToken(refresh);
        const r = await tryUserThenServiceUpload(refreshed.access_token);
        const res = NextResponse.json({ data: { file: r.upload?.data ?? r.upload, junction: r.junction?.data ?? r.junction } }, { status: 201 });
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
