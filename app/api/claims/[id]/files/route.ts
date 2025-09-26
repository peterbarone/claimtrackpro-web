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
const COLLECTION = "claim_documents"; // Actual collection name

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

const FIELDS_FULL =
  "id,claim,category,file.id,file.filename_download,file.title,file.type,file.filesize,file.uploaded_on,uploaded_by.id,uploaded_by.first_name,uploaded_by.last_name,uploaded_at";
const FIELDS_SAFE = "id,claim,category,file,uploaded_by,uploaded_at";

async function listDocuments(claimId: string, token: string) {
  const urls = [
    `/items/${COLLECTION}?filter[claim][id][_eq]=${encodeURIComponent(claimId)}&sort[]=-uploaded_at&fields=${FIELDS_FULL}`,
    `/items/${COLLECTION}?filter[claim][_eq]=${encodeURIComponent(claimId)}&sort[]=-uploaded_at&fields=${FIELDS_FULL}`,
    `/items/${COLLECTION}?filter[claim][id][_eq]=${encodeURIComponent(claimId)}&sort[]=-uploaded_at&fields=${FIELDS_SAFE}`,
    `/items/${COLLECTION}?filter[claim][_eq]=${encodeURIComponent(claimId)}&sort[]=-uploaded_at&fields=${FIELDS_SAFE}`,
  ];
  let last: any;
  for (const u of urls) {
    try {
      return await dFetch<{ data: any[] }>(u, { method: "GET" }, token);
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

async function uploadBinary(file: File, token: string) {
  const fd = new FormData();
  fd.append("file", file, file.name);
  if (DIRECTUS_FILES_FOLDER_ID) fd.append("folder", DIRECTUS_FILES_FOLDER_ID);
  return await dFetch<{ data: any }>(`/files`, { method: "POST", body: fd }, token);
}

async function createDocumentRecord(claimId: string, fileId: string, category: string | undefined, token: string) {
  const payload: Record<string, any> = { claim: claimId, file: fileId, ...(category ? { category } : {}) };
  const created = await dFetch<{ data: any }>(`/items/${COLLECTION}`, { method: "POST", body: JSON.stringify(payload) }, token);
  // refetch with expansions
  try {
    const ref = await dFetch<{ data: any }>(
      `/items/${COLLECTION}/${created.data?.id}?fields=${encodeURIComponent(FIELDS_FULL)}`,
      { method: "GET" },
      token
    );
    return ref.data || created.data;
  } catch {
    return created.data;
  }
}

function mapDocs(arr: any[]) {
  const base = DIRECTUS_URL;
  return (arr || []).map((d) => {
    const f = typeof d.file === "object" ? d.file : { id: d.file };
    const fileId = f?.id || null;
    const uploaderName =
      d?.uploaded_by && typeof d.uploaded_by === "object"
        ? `${d.uploaded_by.first_name || ""} ${d.uploaded_by.last_name || ""}`.trim() || null
        : null;
    return {
      id: d.id,
      claim: d.claim,
      category: d.category || null,
      uploaded_at: d.uploaded_at || null,
      uploaded_by: d?.uploaded_by?.id || d.uploaded_by || null,
      uploader_name: uploaderName,
      file: {
        id: fileId,
        title: f?.title || f?.filename_download || null,
        filename_download: f?.filename_download || null,
        type: f?.type || null,
        filesize: f?.filesize || null,
        uploaded_on: f?.uploaded_on || null,
        download_url: fileId ? `/api/files/${encodeURIComponent(fileId)}?download=1` : null,
        directus_url: fileId ? `${base}/assets/${fileId}?download` : null,
      },
    };
  });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const claimId = params.id;
  const c = cookies();
  let access = c.get(ACCESS_COOKIE)?.value;
  const refresh = c.get(REFRESH_COOKIE)?.value;

  let preRefreshed: { access_token: string; refresh_token: string; expires?: number | string } | null = null;
  if (!access && refresh) {
    try {
      preRefreshed = await refreshAccessToken(refresh);
      access = preRefreshed.access_token;
    } catch {}
  }

  async function run(token?: string) {
    if (token) {
      try {
        return await listDocuments(claimId, token);
      } catch (e: any) {
        const s = e?.status as number | undefined;
        if (s === 401) throw e;
        if ((s === 400 || s === 403 || s === 404) && SERVICE_TOKEN) {
          return await listDocuments(claimId, SERVICE_TOKEN);
        }
        throw e;
      }
    } else if (SERVICE_TOKEN) {
      return await listDocuments(claimId, SERVICE_TOKEN);
    }
    const err = new Error("Unauthorized");
    // @ts-ignore
    err.status = 401;
    throw err;
  }

  try {
    const r = await run(access);
    const res = NextResponse.json({ data: mapDocs(r.data) }, { status: 200 });
    if (preRefreshed) setAuthCookies(res, preRefreshed.access_token, preRefreshed.refresh_token, preRefreshed.expires);
    return res;
  } catch (err: any) {
    const s = err?.status as number | undefined;
    if (s === 401 && refresh) {
      try {
        const refreshed = await refreshAccessToken(refresh);
        const r = await run(refreshed.access_token);
        const res = NextResponse.json({ data: mapDocs(r.data) }, { status: 200 });
        setAuthCookies(res, refreshed.access_token, refreshed.refresh_token, refreshed.expires);
        return res;
      } catch (err2: any) {
        return NextResponse.json({ error: "Unauthorized" }, { status: err2?.status || 401 });
      }
    }
    return NextResponse.json({ error: String(err?.message || "Error") }, { status: s || 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const claimId = params.id;
  const c = cookies();
  let access = c.get(ACCESS_COOKIE)?.value;
  const refresh = c.get(REFRESH_COOKIE)?.value;

  let preRefreshed: { access_token: string; refresh_token: string; expires?: number | string } | null = null;
  if (!access && refresh) {
    try {
      preRefreshed = await refreshAccessToken(refresh);
      access = preRefreshed.access_token;
    } catch {}
  }
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  const file = form.get("file");
  const category = (form.get("category") as string) || undefined;
  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });

  let uploaded: any;
  try {
    uploaded = await uploadBinary(file, access);
  } catch (e: any) {
    const s = e?.status as number | undefined;
    if (s === 401 && refresh && !preRefreshed) {
      try {
        const refreshed = await refreshAccessToken(refresh);
        preRefreshed = refreshed;
        access = refreshed.access_token;
        uploaded = await uploadBinary(file, access);
      } catch (e2: any) {
        return NextResponse.json({ error: "Upload failed" }, { status: e2?.status || 500 });
      }
    } else {
      return NextResponse.json({ error: "Upload failed" }, { status: s || 500 });
    }
  }

  const fileId = uploaded?.data?.id;
  if (!fileId) return NextResponse.json({ error: "Missing file id" }, { status: 500 });

  try {
    const doc = await createDocumentRecord(claimId, fileId, category, access);
    const res = NextResponse.json({ data: mapDocs([doc])[0] }, { status: 201 });
    if (preRefreshed) setAuthCookies(res, preRefreshed.access_token, preRefreshed.refresh_token, preRefreshed.expires);
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to link file" }, { status: e?.status || 500 });
  }
}
