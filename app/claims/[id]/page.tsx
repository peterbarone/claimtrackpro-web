// app/claims/[id]/page.tsx
import { notFound } from "next/navigation";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL as string;
const STATIC_TOKEN = process.env.DIRECTUS_TOKEN;

async function getClaim(id: string) {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (STATIC_TOKEN) headers["Authorization"] = `Bearer ${STATIC_TOKEN}`;

  const res = await fetch(`${DIRECTUS_URL}/api/auth/claims`, {
    headers,
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load claim: ${res.status}`);

  const json = await res.json();
  return json?.data ?? null;
}

export default async function ClaimDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const claim = await getClaim(params.id);

  if (!claim) return notFound();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">
        Claim #{claim.claim_number || claim.id}
      </h1>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium">Status</p>
          <p>{claim.status || "—"}</p>
        </div>
        <div>
          <p className="font-medium">Insured</p>
          <p>{claim.insured_name || "—"}</p>
        </div>
        <div>
          <p className="font-medium">Date Created</p>
          <p>
            {claim.date_created
              ? new Date(claim.date_created).toLocaleString()
              : "—"}
          </p>
        </div>
        <div>
          <p className="font-medium">Description</p>
          <p>{claim.description || "—"}</p>
        </div>
      </div>
    </div>
  );
}
