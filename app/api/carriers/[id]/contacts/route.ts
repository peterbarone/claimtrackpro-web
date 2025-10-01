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
      // 1) Attempt fetching required relation fields then strictly filter client-side
      const relFields = candidates.join(",");
      let res = await dx(`/items/contacts?fields=id,first_name,last_name,email,company,${encodeURIComponent(relFields)}&sort=last_name,first_name`);
      let data = await res.json().catch(() => ({}));
      if (res.ok) {
        const rows: any[] = Array.isArray(data?.data) ? data.data : [];
        const filtered = rows.filter((c: any) => {
          for (const f of candidates) {
            const v = c?.[f];
            if (v == null) continue; // ignore unassigned now (do NOT include unrelated contacts)
            if (typeof v === 'string' || typeof v === 'number') {
              if (String(v) === String(carrierId)) return true;
            } else if (typeof v === 'object' && v && String(v.id) === String(carrierId)) {
              return true;
            }
          }
          // Secondary heuristic: match company name exactly to carrier name via query param ?carrier_name= (optional)
          const url = new URL(req.url);
          const carrierName = url.searchParams.get('carrier_name');
          if (carrierName && typeof c.company === 'string' && c.company.trim().toLowerCase() === carrierName.trim().toLowerCase()) return true;
          return false;
        });
        finalData = filtered;
      } else {
        console.warn('Contacts fallback with relation fields failed:', res.status, data);
        throw new Error(`Failed to fetch contacts for carrier ${carrierId}${lastErr ? ` (prior filtered error: ${JSON.stringify(lastErr)})` : ''}`);
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
    // Ensure only unique by id (in case duplicates due to multiple candidate fields)
    const seen = new Set();
    const deduped = contacts.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
    return NextResponse.json({ data: deduped });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
