// app/claims/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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

async function getClaims(cookieHeader: string): Promise<Claim[]> {
  try {
    const res = await fetch(`/api/auth/claims`, {
      cache: "no-store",
      headers: {
        Cookie: cookieHeader,
        Accept: "application/json",
      },
    });

    console.log("getClaims: API response status", res.status);

    if (res.status === 401) {
      console.log("getClaims: Not authenticated (401)");
      return [];
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("getClaims: /api/auth/claims failed", res.status, text.slice(0, 300));
      return [];
    }

    const json = await res.json(); // { ok, data }
    console.log("getClaims: API response body", json);
    return Array.isArray(json?.data) ? (json.data as Claim[]) : [];
  } catch (err) {
    console.error("getClaims: error fetching claims", err);
    return [];
  }
}

export default async function ClaimsPage() {
  const jar = cookies();
  const access = jar.get("ctrk_jwt")?.value;
  const refresh = jar.get("ctrk_rjwt")?.value;
  console.log("Claims page: accessing JWT cookies", { access, refresh });

  // If no auth cookies at all, bounce to login (keeps UX snappy)
  if (!access && !refresh) {
    redirect("/login");
  }

  // Forward all cookies to the API for SSR
  const cookieHeader = jar
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  console.log("Claims page: fetching claims with cookies", cookieHeader);
  const claims = await getClaims(cookieHeader);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Claims</h1>
        <div className="text-sm text-gray-500">
          {claims.length ? `${claims.length} result${claims.length > 1 ? "s" : ""}` : "No results"}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 border-b">Claim #</th>
              <th className="px-3 py-2 border-b">Status</th>
              <th className="px-3 py-2 border-b">Date of Loss</th>
              <th className="px-3 py-2 border-b">Reported Date</th>
              <th className="px-3 py-2 border-b">Assigned To</th>
              <th className="px-3 py-2 border-b">Description</th>
            </tr>
          </thead>
          <tbody>
            {claims.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-600">
                  <div>No claims found.</div>
                  console.log("Claims page: no claims found", claims);
                </td>
              </tr>
            ) : (
              claims.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2">{c.claim_number}</td>
                  <td className="px-3 py-2">
                    {typeof c.status === "number" ? STATUS_LABEL[c.status] ?? c.status : ""}
                  </td>
                  <td className="px-3 py-2">
                    {c.date_of_loss ? new Date(c.date_of_loss).toLocaleDateString() : ""}
                  </td>
                  <td className="px-3 py-2">
                    {c.reported_date ? new Date(c.reported_date).toLocaleDateString() : ""}
                  </td>
                  <td className="px-3 py-2">{c.assigned_to_user ?? ""}</td>
                  <td className="px-3 py-2">{c.description ?? ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
