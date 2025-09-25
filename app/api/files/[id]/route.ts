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

async function refreshAccessToken(refreshToken: string) {
  const r = await fetch(`${DIRECTUS_URL}/auth/refresh`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Directus refresh error ${r.status}`);
  const json = await r.json();
  const data = json.data ?? json;
  return { access_token: data.access_token as string };
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const c = cookies();
  let access = c.get(ACCESS_COOKIE)?.value;
  const refresh = c.get(REFRESH_COOKIE)?.value;
  const fileId = params.id;

  const url = new URL(req.url);
  const download = url.searchParams.get("download");

  async function getWith(token?: string) {
    const headers: HeadersInit = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: download ? "*/*" : "application/octet-stream",
    };
    const path = download ? `/assets/${fileId}?download` : `/assets/${fileId}`;
    const r = await fetch(`${DIRECTUS_URL}${path}`, { headers, cache: "no-store" });
    if (!r.ok) {
      const err = new Error(`Directus error ${r.status}`);
      // @ts-ignore
      err.status = r.status;
      throw err;
    }
    // Stream through
    const resHeaders = new Headers(r.headers);
    return new NextResponse(r.body, { status: 200, headers: resHeaders });
  }

  try {
    if (access) {
      try {
        return await getWith(access);
      } catch (e: any) {
        if (e?.status !== 401 && !SERVICE_TOKEN) throw e;
      }
    }
    if (SERVICE_TOKEN) {
      try {
        return await getWith(SERVICE_TOKEN);
      } catch (e: any) {
        if (e?.status !== 401) throw e;
      }
    }
    if (refresh) {
      const refreshed = await refreshAccessToken(refresh).catch(() => null);
      if (refreshed?.access_token) {
        return await getWith(refreshed.access_token);
      }
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } catch (err: any) {
    const code = (err?.status as number) || 500;
    return NextResponse.json({ error: String(err?.message || "Error") }, { status: code });
  }
}
