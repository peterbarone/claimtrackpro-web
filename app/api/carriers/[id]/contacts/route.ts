import { NextResponse } from "next/server";
import { getTokens } from "@/lib/auth-cookies";

const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');
const SERVICE_TOKEN = process.env.DIRECTUS_SERVICE_TOKEN || process.env.DIRECTUS_STATIC_TOKEN;

async function dx(path: string, init?: RequestInit) {
  if (!DIRECTUS_URL) throw new Error("Missing DIRECTUS_URL env var");
  const { access } = getTokens();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(access ? { Authorization: `Bearer ${access}` } : SERVICE_TOKEN ? { Authorization: `Bearer ${SERVICE_TOKEN}` } : {}),
    ...(init?.headers || {}),
  };
  const res = await fetch(`${DIRECTUS_URL}${path}`, { ...init, headers, cache: 'no-store' });
  return res;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const started = Date.now();
  const trace: Record<string, any> = {};
  try {
    const carrierId = params.id;
    if (!carrierId) {
      return NextResponse.json({ error: "Missing carrier id" }, { status: 400 });
    }
    if (!DIRECTUS_URL) {
      return NextResponse.json({ error: "Server misconfiguration: DIRECTUS_URL not set" }, { status: 500 });
    }

    // Support multiple possible relation fields; allow env override + schema introspection
    const envField = process.env.CONTACTS_CARRIER_FIELD?.trim();
    const rawCandidates = [envField, 'carrier_contact_id', 'carrier_id', 'carrier', 'client_company', 'client_id', 'client'];
    const candidates = Array.from(new Set(rawCandidates.filter(Boolean) as string[]));

    // Introspect contacts collection fields to constrain to existing field names
    let existingFields: string[] = [];
    try {
      const schemaRes = await dx('/fields/contacts');
      if (schemaRes.ok) {
        let schemaJson: any = null; try { schemaJson = await schemaRes.json(); } catch { schemaJson = null; }
        if (Array.isArray(schemaJson?.data)) {
          existingFields = schemaJson.data.map((f: any) => f.field).filter((f: any) => typeof f === 'string');
        }
      }
    } catch (e) {
      // Non-fatal; continue without narrowing
      trace['schema_introspection_error'] = String((e as any)?.message || e);
    }
    const filteredCandidates = existingFields.length
      ? candidates.filter(c => existingFields.includes(c))
      : candidates;

  let finalData: any[] | null = null;
  let lastErr: any = null;

    // Try server-side filtering with each candidate field
    for (const field of filteredCandidates) {
      const url = `/items/contacts?fields=id,first_name,last_name,email,company&filter[${encodeURIComponent(field)}][_eq]=${encodeURIComponent(carrierId)}&sort=last_name,first_name`;
      const res = await dx(url);
      let data: any = null;
      try { data = await res.json(); } catch { data = {}; }
      trace[`attempt_field_${field}`] = { status: res.status, count: Array.isArray(data?.data) ? data.data.length : undefined };
      if (res.ok) {
        finalData = Array.isArray(data?.data) ? data.data : [];
        break;
      } else if (res.status === 400) {
        // Field might not exist; continue
        lastErr = { status: res.status, data };
      } else {
        // Other error statuses store and continue trying
        lastErr = { status: res.status, data };
      }
    }

    // Fallbacks if direct filter didn't work
    if (!finalData) {
      if (filteredCandidates.length === 0) {
        // No relation fields present; attempt company name matching with carrier name
        let companyName: string | undefined;
        try {
          const carrierRes = await dx(`/items/carriers/${encodeURIComponent(carrierId)}?fields=name`);
          if (carrierRes.ok) {
            let cj: any = null; try { cj = await carrierRes.json(); } catch { cj = null; }
            companyName = cj?.data?.name;
            trace['carrier_fetch'] = { status: carrierRes.status };
          } else {
            trace['carrier_fetch'] = { status: carrierRes.status };
          }
        } catch (e) {
          trace['carrier_fetch_error'] = String((e as any)?.message || e);
        }
        let eqContacts: any[] = [];
        let ilikeContacts: any[] = [];
        if (companyName) {
          try {
            const eqRes = await dx(`/items/contacts?fields=id,first_name,last_name,email,company&filter[company][_eq]=${encodeURIComponent(companyName)}&sort=last_name,first_name`);
            let eqJson: any = null; try { eqJson = await eqRes.json(); } catch { eqJson = null; }
            if (eqRes.ok && Array.isArray(eqJson?.data)) eqContacts = eqJson.data;
            trace['company_eq'] = { status: eqRes.status, count: eqContacts.length };
            if (eqContacts.length === 0) {
              const ilikeRes = await dx(`/items/contacts?fields=id,first_name,last_name,email,company&filter[company][_ilike]=${encodeURIComponent(companyName)}&sort=last_name,first_name`);
              let ilikeJson: any = null; try { ilikeJson = await ilikeRes.json(); } catch { ilikeJson = null; }
              if (ilikeRes.ok && Array.isArray(ilikeJson?.data)) ilikeContacts = ilikeJson.data;
              trace['company_ilike'] = { status: ilikeRes.status, count: ilikeContacts.length };
            }
          } catch (e) {
            trace['company_match_error'] = String((e as any)?.message || e);
          }
        }
        const found = eqContacts.length ? eqContacts : ilikeContacts;
        const contacts = found.map((c: any) => ({
          id: c.id,
            name: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || c.company || c.id,
            email: c.email,
            company: c.company,
        }));
        const seen = new Set();
        const deduped = contacts.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
        const durationMs = Date.now() - started;
        return NextResponse.json({ data: deduped, meta: { durationMs, attempts: trace, note: 'No relation fields; used company name heuristic', companyName, eqCount: eqContacts.length, ilikeCount: ilikeContacts.length, requestedCandidates: candidates, existingFields } });
      }
      const relFields = candidates.join(",");
      const relUrl = `/items/contacts?fields=id,first_name,last_name,email,company,${encodeURIComponent(relFields)}&sort=last_name,first_name`;
      const res = await dx(relUrl);
      let data: any = null;
      try { data = await res.json(); } catch { data = {}; }
      trace['fallback_relation_fetch'] = { status: res.status };
      if (res.ok) {
        const rows: any[] = Array.isArray(data?.data) ? data.data : [];
        const filtered = rows.filter((c: any) => {
          for (const f of filteredCandidates) {
            const v = c?.[f];
            if (v == null) continue;
            if (typeof v === 'string' || typeof v === 'number') {
              if (String(v) === String(carrierId)) return true;
            } else if (typeof v === 'object' && v && String(v.id) === String(carrierId)) {
              return true;
            }
          }
          const url = new URL(req.url);
          const carrierName = url.searchParams.get('carrier_name');
          if (carrierName && typeof c.company === 'string' && c.company.trim().toLowerCase() === carrierName.trim().toLowerCase()) return true;
          return false;
        });
        finalData = filtered;
      } else {
        const message = `Failed to fetch contacts for carrier ${carrierId}`;
        console.error(message, { status: res.status, data, lastErr, trace });
        return NextResponse.json({ error: message, details: { lastErr, trace } }, { status: 502 });
      }
    }

    // If after all logic we still have zero contacts, attempt a last-resort company name match using carrier record
    if (Array.isArray(finalData) && finalData.length === 0) {
      try {
        const carrierRes = await dx(`/items/carriers/${encodeURIComponent(carrierId)}?fields=name`);
        if (carrierRes.ok) {
          let carrierJson: any = null; try { carrierJson = await carrierRes.json(); } catch { carrierJson = null; }
          const carrierName: string | undefined = carrierJson?.data?.name;
          if (carrierName) {
            const nameRes = await dx(`/items/contacts?fields=id,first_name,last_name,email,company&filter[company][_eq]=${encodeURIComponent(carrierName)}&sort=last_name,first_name`);
            let nameJson: any = null; try { nameJson = await nameRes.json(); } catch { nameJson = null; }
            trace['company_name_match'] = { status: nameRes.status, carrierName };
            if (nameRes.ok && Array.isArray(nameJson?.data)) {
              finalData = nameJson.data;
            }
          }
        }
      } catch (e) {
        trace['company_name_match_error'] = String((e as any)?.message || e);
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
    const durationMs = Date.now() - started;
  return NextResponse.json({ data: deduped, meta: { durationMs, attempts: trace, requestedCandidates: candidates, existingFields, usedCandidates: filteredCandidates } });
  } catch (err: any) {
    console.error('Carrier contacts handler failed', { error: err?.message, stack: err?.stack });
    const status = /Missing carrier id/.test(err?.message) ? 400 : 500;
    return NextResponse.json({ error: String(err?.message || err) }, { status });
  }
}
