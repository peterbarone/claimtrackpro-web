// app/claims/[id]/page.tsx

import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";

type Claim = {
  id: string;
  claim_number: string;
  status: number | null;
  date_of_loss?: string | null;
  reported_date?: string | null;
  assigned_to_user?: string | null;
  description?: string | null;
};

const STATUS_LABEL: Record<number, string> = {
  1: "New",
  2: "Assigned",
  3: "In Progress",
  4: "On Hold",
  5: "Closed",
};

async function getClaim(
  id: string,
  cookieHeader: string
): Promise<Claim | null> {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL
      ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
      : `http://localhost:3000`;
    const apiUrl = `${baseUrl}/api/auth/claims`;

    const res = await fetch(apiUrl, {
      cache: "no-store",
      headers: {
        Cookie: cookieHeader,
        Accept: "application/json",
      },
    });

    if (res.status === 401) {
      return null;
    }
    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    const claims = Array.isArray(json?.data) ? (json.data as Claim[]) : [];
    return claims.find((c) => c.id === id) ?? null;
  } catch (err) {
    return null;
  }
}

export default async function ClaimDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const jar = cookies();
  const access = jar.get("ctrk_jwt")?.value;
  const refresh = jar.get("ctrk_rjwt")?.value;

  if (!access && !refresh) {
    redirect("/login");
  }

  const cookieHeader = jar
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const claim = await getClaim(params.id, cookieHeader);
  if (!claim) return notFound();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">
        Claim #{claim.claim_number}
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        <div>
          <p className="font-medium">Status</p>
          <p>
            {typeof claim.status === "number"
              ? STATUS_LABEL[claim.status] ?? claim.status
              : "—"}
          </p>
        </div>
        <div>
          <p className="font-medium">Date of Loss</p>
          <p>
            {claim.date_of_loss
              ? new Date(claim.date_of_loss).toLocaleDateString()
              : "—"}
          </p>
        </div>
        <div>
          <p className="font-medium">Reported Date</p>
          <p>
            {claim.reported_date
              ? new Date(claim.reported_date).toLocaleDateString()
              : "—"}
          </p>
        </div>
        <div>
          <p className="font-medium">Assigned To</p>
          <p>{claim.assigned_to_user ?? "—"}</p>
        </div>
        <div className="md:col-span-2">
          <p className="font-medium">Description</p>
          <p>{claim.description ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}
