// app/api/claims/intake/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { randomUUID } from "crypto";

/**
 * CONFIG
 * - DIRECTUS_URL:        https://your-directus.domain
 * - DIR      loss_location: lossAddressId,
      mailing_address: mailingAddressId,

      date_of_loss: dateOfLoss || null,
      date_received: dateReceived || null,

      assigned_to_user: assignedAdjusterId || null,
      deductible: deductible ? parseFloat(deductible) : null,ICE_TOKEN (optional): static token for server-side writes (role-scoped)
 * - COOKIE_NAME:         name of the JWT cookie if you’re using user session auth (default "ctrk_jwt")
 */
const DIRECTUS_URL = (process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/+$/, '');
const COOKIE_NAME = process.env.COOKIE_NAME || "ctrk_jwt";
const SERVICE_TOKEN = process.env.DIRECTUS_SERVICE_TOKEN || process.env.DIRECTUS_STATIC_TOKEN;
const SERVICE_EMAIL = process.env.DIRECTUS_EMAIL;
const SERVICE_PASSWORD = process.env.DIRECTUS_PASSWORD;

/**
 * Helper: determine Secure cookies only when https and not localhost
 */
function getSecureFlag() {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  return proto === "https" && !isLocal;
}

/**
 * directusRequest
 * Uses user JWT (cookie) if present; otherwise falls back to DIRECTUS_SERVICE_TOKEN if provided.
 */
async function directusRequest<T>(
  path: string,
  init?: RequestInit,
  explicitToken?: string | null
): Promise<T> {
  // For claim intake, prefer service token for server-side operations
  const tokenFromCookie = cookies().get(COOKIE_NAME)?.value;
  let token = explicitToken ?? SERVICE_TOKEN ?? tokenFromCookie;
  const tokenPreview = token ? `${String(token).slice(0, 6)}…` : "missing";
  const cookiePreview = tokenFromCookie ? `${String(tokenFromCookie).slice(0, 6)}…` : "missing";
  console.log("Directus auth: cookie:", cookiePreview, "service:", SERVICE_TOKEN ? "present" : "missing", "using:", tokenPreview);
  
  if (!token) throw new Error("Missing authentication token for Directus");
  // Helper to perform fetch with the provided token
  const doFetch = async (bearer: string) => {
    const res = await fetch(`${DIRECTUS_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    return res;
  };

  let res = await doFetch(token);

  // If unauthorized and we have service account creds, try to login and retry once
  if (res.status === 401 && SERVICE_EMAIL && SERVICE_PASSWORD) {
    try {
      const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: SERVICE_EMAIL, password: SERVICE_PASSWORD })
      });
      const loginJson = await loginRes.json().catch(() => ({}));
      if (loginRes.ok && loginJson?.data?.access_token) {
        token = loginJson.data.access_token as string;
        console.warn("Directus service login succeeded; retrying request.");
        res = await doFetch(token);
      } else {
        console.error("Directus service login failed:", loginRes.status, loginJson);
      }
    } catch (e: any) {
      console.error("Directus service login threw:", e?.message || e);
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`Directus error for ${path}:`, res.status, res.statusText, text);
    throw new Error(`Directus ${res.status} ${res.statusText} at ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Helpers to create common rows
 */
type AddressInput = {
  street1?: string; street2?: string; city?: string; state?: string; zip?: string;
};

async function createAddressOrNull(a?: AddressInput) {
  if (!a) return null;
  const hasAny =
    (a.street1 && a.street1.trim()) ||
    (a.city && a.city.trim()) ||
    (a.state && a.state.trim()) ||
    (a.zip && a.zip.trim());
  if (!hasAny) return null;

  const payload = {
    street: a.street1 || null,
    city: a.city || null,
    state: a.state || null,
    zip_code: a.zip || null,
    country: "USA",
  };

  const { data } = await directusRequest<{ data: { id: string } }>(
    `/items/addresses`,
    { method: "POST", body: JSON.stringify(payload) }
  );
  return data?.id ?? null;
}

type InsuredInput = {
  isBusiness?: boolean;
  orgName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phone2?: string;
  phone_ext?: string;      // extension for primary phone
  phone2_ext?: string;     // extension for secondary/alt phone
};

function cleanExt(raw?: string) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D+/g, "").slice(0, 8);
  return digits || null;
}

async function createInsured(p: InsuredInput, mailingAddressId: string | null) {
  const payload = {
    first_name: p.firstName || null,
    last_name: p.lastName || null,
    email: p.email || null,
    phone: p.phone || null,
    phone_2: p.phone2 || null,
    // New extension fields added to insureds collection
    primary_phone_phone_ext: cleanExt(p.phone_ext) ,
    alt_phone_phone_ext: cleanExt(p.phone2_ext),
    mailing_address: mailingAddressId,
  };

  const { data } = await directusRequest<{ data: { id: string } }>(
    `/items/insureds`,
    { method: "POST", body: JSON.stringify(payload) }
  );
  return data?.id as string;
}

type ContactInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  contactType?: string;
  customType?: string;
  phone_ext?: string;
};

/**
 * Upsert a contact (very light): here we always create a new one.
 * If you want to dedupe by email/phone, you can search before insert.
 */
async function createContact(c: ContactInput) {
  const payload = {
    first_name: c.firstName || null,
    last_name: c.lastName || null,
    email: c.email || null,
    phone: c.phone || null,
    phone_2: null,
    phone_ext: cleanExt(c.phone_ext),
  };

  const { data } = await directusRequest<{ data: { id: string } }>(
    `/items/contacts`,
    { method: "POST", body: JSON.stringify(payload) }
  );
  return data?.id as string;
}

/**
 * POST handler
 * Body shape:
 * {
 *   formData: {...},
 *   insuredPersons: InsuredInput[],
 *   additionalContacts: ContactInput[],
 *   coverageLines: { id: string; description: string; amount: string }[],
 *   submitType: "submit" | "submitAndAdd"
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Preflight ping (non-blocking): helpful for logs, don't block submissions
    // Use a raw fetch because /server/ping returns plain text ("pong"), not JSON
    fetch(`${DIRECTUS_URL}/server/ping`, {
      method: "GET",
      headers: {
        "Content-Type": "text/plain",
        ...(SERVICE_TOKEN ? { Authorization: `Bearer ${SERVICE_TOKEN}` } : {}),
      },
      cache: "no-store",
    })
      .then(async (r) => {
        const t = await r.text().catch(() => "");
        console.log("Directus ping:", t || r.status);
      })
      .catch((e: any) => console.warn("Directus ping failed:", e?.message || e));

    const {
      formData,
      insuredPersons = [],
      additionalContacts = [],
      coverageLines = [],
    } = body ?? {};

    // Basic normalization
    const carrierId: string | null = formData?.clientCompany || null; // claims.carrier_id
    const carrierContactId: string | null = formData?.clientContact || null; // optional (claims.carrier_contact_id)
    const claimNumber: string | null = formData?.claimNumber || null;
    const policyNumber: string | null = formData?.policyNumber?.trim() || null;

    // Loss / dates / cause
    const dateOfLoss: string | null = formData?.dateOfLoss || null;              // "YYYY-MM-DD"
    const dateReceived: string | null = formData?.dateReceived || null;          // "YYYY-MM-DD"
    const lossCauseId: string | null = formData?.typeOfLoss || null;             // lookup id
    const deductible: string | null = formData?.deductible || null;
    const description: string | null = formData?.lossDescription || null;

    // Assigned
    const assignedAdjusterId: string | null = formData?.assignedAdjuster || null; // staff.id (claims.assigned_to_user)

    // Addresses
    const lossAddressInput = formData?.propertyAddress as AddressInput | undefined;
    const mailingAddressInput = formData?.mailingAddress as AddressInput | undefined;

    // Policy extras (only used if policyNumber is provided)
    const effectiveDate: string | null = formData?.effectiveDate || null;
    const expirationDate: string | null = formData?.expirationDate || null;
    const policyType: string | null = formData?.policyType || null;
    const formNumbers: string | null = formData?.formNumbers || null;

    // 0) Guard rails
    if (!carrierId) {
      return NextResponse.json({ error: "Client Company (carrier) is required" }, { status: 400 });
    }
    if (!claimNumber) {
      return NextResponse.json({ error: "Claim Number is required" }, { status: 400 });
    }

    // 1) Addresses
    const lossAddressId = await createAddressOrNull(lossAddressInput);
    const mailingAddressId = await createAddressOrNull(mailingAddressInput);

    // 2) Insureds (at least one)
    const primaryInsuredInput: InsuredInput | undefined = insuredPersons[0];
    if (!primaryInsuredInput) {
      return NextResponse.json({ error: "At least one insured is required" }, { status: 400 });
    }
    const primaryInsuredId = await createInsured(primaryInsuredInput, mailingAddressId);

    let secondaryInsuredId: string | null = null;
    if (insuredPersons.length > 1) {
      // For simplicity, only create one extra insured as "secondary"
      const second = insuredPersons[1];
      secondaryInsuredId = await createInsured(second, mailingAddressId);
    }

    // 3) Policy (optional)
    let policyId: string | null = null;
    if (policyNumber) {
      const policyPayload = {
        policy_number: policyNumber,
        carrier: carrierId,
        named_insured: primaryInsuredId,
        effective_date: effectiveDate || null,
        expiration_date: expirationDate || null,
        deductible: deductible ? parseFloat(deductible) : null,
      };
      const { data: policy } = await directusRequest<{ data: { id: string } }>(
        `/items/policies`,
        { method: "POST", body: JSON.stringify(policyPayload) }
      );
      policyId = policy?.id ?? null;
    }

    // 4) Claim
    const claimPayload = {
      id: randomUUID(),
      carrier: carrierId,
      carrier_contact_id: carrierContactId || null, // optional
      claim_number: claimNumber,

      policy: policyId,
      loss_cause: lossCauseId || null,

      primary_insured: primaryInsuredId,
      secondary_insured: secondaryInsuredId,

      // If you renamed at DB level: use loss_address; else keep loss_location
      // Replace with the correct column key your Directus uses:
      loss_location: lossAddressId,     // or loss_address if you’ve renamed
      mailing_address: mailingAddressId,

      date_of_loss: dateOfLoss || null,
      date_received: dateReceived || null,

      assigned_to_user: assignedAdjusterId || null, // staff.id
      deductible: deductible ? parseFloat(deductible) : null,
      description: description || null,
    };

    const { data: claim } = await directusRequest<{ data: { id: string } }>(
      `/items/claims`,
      { method: "POST", body: JSON.stringify(claimPayload) }
    );
    const claimId = claim?.id as string;

    // 5) Additional Contacts (optional) + junction rows
    if (Array.isArray(additionalContacts) && additionalContacts.length > 0) {
      for (const c of additionalContacts) {
        // Skip empty rows
        const hasAny =
          (c.firstName && c.firstName.trim()) ||
          (c.lastName && c.lastName.trim()) ||
          (c.email && c.email.trim()) ||
          (c.phone && c.phone.trim()) ||
          (c.phone_ext && c.phone_ext.trim());
        if (!hasAny) continue;

        const newContactId = await createContact(c);

        // link via claims_contacts
        await directusRequest(
          `/items/claims_contacts`,
          { method: "POST", body: JSON.stringify({ claims_id: claimId, contacts_id: newContactId }) }
        );
      }
    }

    // 6) Coverage Lines (only when policy exists)
    if (policyId && Array.isArray(coverageLines) && coverageLines.length > 0) {
      // Cap at 8 and skip empty rows
      const lines = coverageLines
        .slice(0, 8)
        .filter((l: any) => (l?.description && String(l.description).trim()) || (l?.amount && String(l.amount).trim()));

      if (lines.length) {
        for (const line of lines) {
          const payload = {
            policy_id: policyId,
            description: line.description || null,
            amount: line.amount ? Number(String(line.amount).replace(/[^\d.]/g, "")) : null,
          };

          await directusRequest(`/items/policy_coverage_lines`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }
      }
    }

    return NextResponse.json({ ok: true, claimId }, { status: 201 });
  } catch (err: any) {
    console.error("Intake error:", err?.stack || err?.message || err);
    return NextResponse.json(
      { error: "Failed to create claim", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
