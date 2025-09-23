import { NextResponse } from "next/server";
import { getTokens } from "@/lib/auth-cookies";

const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');
const SERVICE_TOKEN = process.env.DIRECTUS_SERVICE_TOKEN || process.env.DIRECTUS_STATIC_TOKEN;

function dx(path: string, init?: RequestInit) {
  if (!DIRECTUS_URL) throw new Error("Missing DIRECTUS_URL");
  const { access } = getTokens();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(access ? { Authorization: `Bearer ${access}` } : SERVICE_TOKEN ? { Authorization: `Bearer ${SERVICE_TOKEN}` } : {}),
    ...(init?.headers || {}),
  };
  return fetch(`${DIRECTUS_URL}${path}`, { ...init, headers });
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const carrierId = params.id;
    if (!carrierId) throw new Error("Missing carrier id");

    // Support multiple possible relation fields; allow env override
    const envField = process.env.CONTACTS_CARRIER_FIELD?.trim();
    const candidates = Array.from(
      new Set(
        [envField, "carrier_id", "carrier", "client_id", "client"].filter(
          Boolean
        ) as string[]
      )
    );

    let finalData: any[] | null = null;
    let lastErr: any = null;

    // Try server-side filtering with each candidate field
    for (const field of candidates) {
      const url = `/items/contacts?fields=id,first_name,last_name,email,company&filter[${encodeURIComponent(
        field
      )}][_eq]=${encodeURIComponent(carrierId)}&sort=last_name,first_name`;
      const res = await dx(url);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        finalData = Array.isArray(data?.data) ? data.data : [];
        break;
      } else {
        lastErr = { status: res.status, data };
        console.warn(
          `Contacts filtered fetch failed for field "${field}":`,
          res.status,
          data
        );
      }
    }

    // Fallbacks if direct filter didn't work
    if (!finalData) {
      // 1) Try fetching with relation fields and filter client-side if available
      const relFields = candidates.join(",");
      let res = await dx(
        `/items/contacts?fields=id,first_name,last_name,email,company,${encodeURIComponent(
          relFields
        )}&sort=last_name,first_name`
      );
      let data = await res.json().catch(() => ({}));
      if (res.ok) {
        const rows: any[] = Array.isArray(data?.data) ? data.data : [];
        const filtered = rows.filter((c: any) => {
          // Keep if any candidate matches the carrierId or the relation is empty
          for (const f of candidates) {
            const v = c?.[f as keyof typeof c];
            if (v == null || v === "") return true; // unassigned
            // If relation returns an object, try its id
            if (
              (typeof v === "string" || typeof v === "number") &&
              String(v) === String(carrierId)
            )
              return true;
            if (typeof v === "object" && v && String((v as any).id) === String(carrierId))
              return true;
          }
          return false;
        });
        finalData = filtered;
      } else {
        console.warn(
          "Contacts fallback with relation fields failed:",
          res.status,
          data
        );
        // 2) Last resort: fetch minimal fields to avoid permission issues and return unfiltered list
        res = await dx(
          `/items/contacts?fields=id,first_name,last_name,email,company&sort=last_name,first_name`
        );
        data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            `Failed to fetch contacts$${lastErr ? `, last filtered error: ${JSON.stringify(lastErr)}` : ""}`
          );
        }
        finalData = Array.isArray(data?.data) ? data.data : [];
      }
    }

    // Compose a display name for each contact
    const contacts = (finalData || []).map((c: any) => ({
      id: c.id,
      name:
        [c.first_name, c.last_name].filter(Boolean).join(" ") ||
        c.email ||
        c.company ||
        c.id,
      email: c.email,
      company: c.company,
    }));
    return NextResponse.json({ data: contacts });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
