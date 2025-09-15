type Claim = {
  id: string;
  claim_number: string;
  status: number;
  date_of_loss: string;
  reported_date: string;
  assigned_to_user: string | null;
  description: string;
};

async function getClaims(): Promise<Claim[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      throw new Error(
        "NEXT_PUBLIC_BASE_URL is not set. Please set it in your .env file."
      );
    }
    const res = await fetch(`${baseUrl}/api/auth/claims`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export default async function ClaimsPage() {
  const claims = await getClaims();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Claims</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-2 border">Claim #</th>
              <th className="px-3 py-2 border">Status</th>
              <th className="px-3 py-2 border">Date of Loss</th>
              <th className="px-3 py-2 border">Reported Date</th>
              <th className="px-3 py-2 border">Assigned To</th>
              <th className="px-3 py-2 border">Description</th>
            </tr>
          </thead>
          <tbody>
            {claims.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-4">
                  No claims found.
                </td>
              </tr>
            ) : (
              claims.map((claim) => (
                <tr key={claim.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 border">{claim.claim_number}</td>
                  <td className="px-3 py-2 border">{claim.status ?? ""}</td>
                  <td className="px-3 py-2 border">
                    {claim.date_of_loss
                      ? new Date(claim.date_of_loss).toLocaleDateString()
                      : ""}
                  </td>
                  <td className="px-3 py-2 border">
                    {claim.reported_date
                      ? new Date(claim.reported_date).toLocaleDateString()
                      : ""}
                  </td>
                  <td className="px-3 py-2 border">
                    {claim.assigned_to_user ?? ""}
                  </td>
                  <td className="px-3 py-2 border">
                    {claim.description ?? ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
