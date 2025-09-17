// app/api/claims/intake/route.ts

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getTokens } from "@/lib/auth-cookies";


const DIRECTUS_URL = process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL;
// Use end-user access token from cookies
function dx(path: string, init?: RequestInit) {
  if (!DIRECTUS_URL) throw new Error("Missing DIRECTUS_URL");
  const { access } = getTokens();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(access ? { Authorization: `Bearer ${access}` } : {}),
    ...(init?.headers || {}),
  };
  return fetch(`${DIRECTUS_URL}${path}`, { ...init, headers });
}

async function upsertLookupByName(collection: "loss_cause" | "claim_type" | "claim_status", name: string) {
  if (!name) return null;
  const res = await dx(`/items/${collection}?filter[name][_eq]=${encodeURIComponent(name)}&limit=1`, { cache: "no-store" });
  const data = await res.json();
  if (data?.data?.[0]) return data.data[0].id;
  const create = await dx(`/items/${collection}`, {
    method: "POST",
    body: JSON.stringify({ name, sort: 100 }),
  });
  const created = await create.json();
  return created?.data?.id ?? null;
}

type AddressInput = {
  street1: string; street2: string; city: string; state: string; zip: string;
};

async function createAddress(a: AddressInput) {
  if (!a || (!a.street1 && !a.city && !a.state && !a.zip)) return null; // nothing provided
  const id = randomUUID();
  const body = {
    id,
    label: "Address",
    street_1: a.street1 || null,
    street_2: a.street2 || null,
    city: a.city || null,
    state: a.state || null,
    postal_code: a.zip || null,
  };
  const res = await dx(`/items/addresses`, { method: "POST", body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(`Address create failed: ${JSON.stringify(json)}`);
  return id;
}

type PersonInput = {
  firstName: string; lastName: string; email?: string; phone?: string; phone2?: string;
};

async function createInsured(person: PersonInput, mailingAddressId: string | null) {
  const id = randomUUID();
  const body = {
    id,
    type: "person",
    mailing_address: mailingAddressId,
    first_name: person.firstName || null,
    last_name: person.lastName || null,
    primary_email: person.email || null,
    primary_phone: person.phone || null,
    alt_phone: person.phone2 || null,
  };
  const res = await dx(`/items/insureds`, { method: "POST", body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(`Insured create failed: ${JSON.stringify(json)}`);
  return id;
}

async function createPolicy(namedInsuredId: string | null, carrierId: string | null, input: {
  policyType: string; policyNumber: string; effectiveDate?: string; expirationDate?: string;
}) {
  const id = randomUUID();
  const body = {
    id,
    carrier_id: carrierId, // if you later wire clientCompany => carriers, put it here
    named_insured: namedInsuredId,
    policy_type: input.policyType || null,
    policy_number: input.policyNumber || null,
    effective_date: input.effectiveDate || null,
    expiration_date: input.expirationDate || null,
  };
  const res = await dx(`/items/policies`, { method: "POST", body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(`Policy create failed: ${JSON.stringify(json)}`);
  return id;
}

async function createClaim(input: {
  claimNumber: string;
  claimTypeId: number | null;
  statusId: number | null;
  lossCauseId: number | null;
  primaryInsuredId: string | null;
  secondaryInsuredId: string | null;
  lossLocationAddressId: string | null;
  policyId: string | null;
  dateOfLoss?: string;
  dateReceived?: string;
  description?: string;
  assignedStaffId?: string | null;
}) {
  const id = randomUUID();
  const body = {
    id,
    claim_number: input.claimNumber,
    policy_id: input.policyId,
    claim_type_id: input.claimTypeId,
    status_id: input.statusId,
    loss_cause_id: input.lossCauseId,
    primary_insured: input.primaryInsuredId,
    secondary_insured: input.secondaryInsuredId,
    loss_location: input.lossLocationAddressId,
    date_of_loss: input.dateOfLoss || null,
    reported_date: input.dateReceived || null,
    description: input.description || null,
    assigned_to_user: input.assignedStaffId || null,
  };
  const res = await dx(`/items/claims`, { method: "POST", body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(`Claim create failed: ${JSON.stringify(json)}`);
  return id;
}

async function createContact(c: {
  firstName?: string; lastName?: string; email?: string; phone?: string; company?: string; role?: string;
}) {
  const id = randomUUID();
  const body = {
    id,
    role: c.role || null,
    first_name: c.firstName || null,
    last_name: c.lastName || null,
    company: c.company || null,
    phone: c.phone || null,
    email: c.email || null,
  };
  const res = await dx(`/items/contacts`, { method: "POST", body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(`Contact create failed: ${JSON.stringify(json)}`);
  return id;
}

async function linkClaimContact(claimId: string, contactId: string) {
  const id = randomUUID();
  const res = await dx(`/items/claims_contacts`, {
    method: "POST",
    body: JSON.stringify({ id, claims_id: claimId, contacts_id: contactId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Link claim-contact failed: ${JSON.stringify(json)}`);
}

async function recordClaimEvent(claimId: string, payload: unknown, eventType = "intake") {
  const id = randomUUID();
  const res = await dx(`/items/claim_events`, {
    method: "POST",
    body: JSON.stringify({
      id,
      claim_id: claimId,
      event_type: eventType,
      payload: JSON.stringify(payload),
      created_at: new Date().toISOString(),
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Claim event create failed: ${JSON.stringify(json)}`);
}

function splitName(n?: string) {
  if (!n) return { first: null, last: null };
  const parts = n.trim().split(/\s+/);
  const first = parts.shift() || null;
  const last = parts.length ? parts.join(" ") : null;
  return { first, last };
}

// Optional: map UI "Homeowner/Commercial" -> claim_type lookup names you want
function mapPolicyTypeToClaimTypeName(policyType?: string) {
  if (!policyType) return null;
  if (/home/i.test(policyType)) return "Property";
  if (/comm/i.test(policyType)) return "Commercial Property";
  return policyType;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Expecting the shape sent from your page.tsx submit (see client change below)
    const {
      formData,
      insuredPersons,
      additionalContacts,
      coverageLines,
    } = body as {
      formData: any;
      insuredPersons: Array<any>;
      additionalContacts: Array<any>;
      coverageLines: Array<any>;
    };

    // 1) Addresses
    const propertyAddressId = await createAddress(formData.propertyAddress);
    const mailingAddressId = formData.sameAsProperty
      ? propertyAddressId
      : await createAddress(formData.mailingAddress);

    // 2) Insureds (primary + optional secondary+)
    const primaryInsured = insuredPersons?.[0];
    if (!primaryInsured?.firstName || !primaryInsured?.lastName) {
      return NextResponse.json({ error: "Primary insured first/last name required" }, { status: 400 });
    }
    const primaryInsuredId = await createInsured(primaryInsured, mailingAddressId || null);

    let secondaryInsuredId: string | null = null;
    if (insuredPersons?.length > 1) {
      const s = insuredPersons[1];
      if (s?.firstName || s?.lastName || s?.email || s?.phone) {
        secondaryInsuredId = await createInsured(s, mailingAddressId || null);
      }
    }

    // 3) Policy
    // (Hook carriers later by mapping clientCompany => carriers; for now pass null)
    const policyId = await createPolicy(primaryInsuredId, null, {
      policyType: formData.policyType,
      policyNumber: formData.policyNumber,
      effectiveDate: formData.effectiveDate || null,
      expirationDate: formData.expirationDate || null,
    });

    // 4) Lookups
    const lossCauseId = await upsertLookupByName("loss_cause", formData.typeOfLoss || "Other");
    const claimTypeName = mapPolicyTypeToClaimTypeName(formData.policyType || undefined);
    const claimTypeId = claimTypeName ? await upsertLookupByName("claim_type", claimTypeName) : null;
    const statusId = await upsertLookupByName("claim_status", "Open");

    // 5) Assigned staff by name (optional)
    let assignedStaffId: string | null = null;
    if (formData.assignedAdjuster) {
      const { first, last } = splitName(formData.assignedAdjuster);
      const res = await dx(
        `/items/staff?filter[first_name][_eq]=${encodeURIComponent(first || "")}&filter[last_name][_eq]=${encodeURIComponent(last || "")}&limit=1`,
        { cache: "no-store" }
      );
      const json = await res.json();
      assignedStaffId = json?.data?.[0]?.id ?? null;
    }

    // 6) Claim
    const claimId = await createClaim({
      claimNumber: formData.claimNumber,
      claimTypeId,
      statusId,
      lossCauseId,
      primaryInsuredId,
      secondaryInsuredId,
      lossLocationAddressId: propertyAddressId,
      policyId,
      dateOfLoss: formData.dateOfLoss || null,
      dateReceived: formData.dateReceived || null,
      description: formData.lossDescription || null,
      assignedStaffId,
    });

    // 7) Additional contacts + junctions
    if (Array.isArray(additionalContacts)) {
      for (const c of additionalContacts) {
        if (!c.firstName && !c.lastName && !c.email && !c.phone) continue;
        const contactId = await createContact({
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone,
          role: c.contactType === "Other" ? c.customType || "Other" : c.contactType,
          company: undefined,
        });
        await linkClaimContact(claimId, contactId);
      }
    }

    // 8) Persist coverage lines/form numbers as a structured event payload
    await recordClaimEvent(claimId, {
      formNumbers: formData.formNumbers || null,
      deductible: formData.deductible || null,
      coverageLines: Array.isArray(coverageLines) ? coverageLines : [],
      clientCompany: formData.clientCompany || null,
      clientContact: formData.clientContact || null,
      primaryContactChoice: formData.primaryContact || null,
    }, "intake_metadata");

    return NextResponse.json({ ok: true, claimId }, { status: 201 });
  } catch (err: any) {
    console.error("Intake POST error", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
  export {}

