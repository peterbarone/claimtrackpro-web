import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import directusFetch from "../lib/directus";
const COOKIE_NAME = process.env.COOKIE_NAME || "ctrk_jwt";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

async function withUserToken(path: string): Promise<any> {
  let token = cookies().get(COOKIE_NAME)?.value;
  try {
    return directusFetch(path, { method: "GET" }, token);
  } catch (err: any) {
    if (String(err.message).includes("401")) {
      // refresh then retry
      const r = await fetch(`${APP_URL}/api/auth/refresh`, {
        method: "POST",
        cache: "no-store",
      });
      if (!r.ok) throw err;
      token = cookies().get(COOKIE_NAME)?.value;
      return directusFetch(path, { method: "GET" }, token);
    }
    throw err;
  }
}

export async function GET() {
  try {
    const data = await withUserToken(
      "/items/claims?limit=50&sort[]=-date_created"
    );
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
