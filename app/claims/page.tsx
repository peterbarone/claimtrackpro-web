import Link from "next/link";
import { Suspense } from "react";

// --- CONFIG ---
// Make sure these env vars are set in your deployment:
// NEXT_PUBLIC_DIRECTUS_URL=https://<your-directus-domain>
// DIRECTUS_TOKEN=\"<static api token or leave blank if you inject cookie auth>\"
const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL as string;
const STATIC_TOKEN = process.env.DIRECTUS_TOKEN; // optional

// Helper to build Directus query string
function buildQuery(params: Record<string, any>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) v.forEach((vv) => q.append(k, String(vv)));
    else q.set(k, String(v));
  });
  return q.toString();
}

export const dynamic = "force-dynamic"; // always fetch fresh

// Types: adjust fields to match your schema
export type Claim = {
  id: string;
  claim_number?: string | null;
  status?: string | null;
  insured_name?: string | null;
  date_created?: string | null;
};

async function getClaims({
  page,
  perPage,
  search,
}: {
  page: number;
  perPage: number;
  search?: string;
}) {
  const offset = (page - 1) * perPage;
  const qs = buildQuery({
    fields: ["id", "claim_number", "status", "insured_name", "date_created"],
    limit: perPage,
    offset,
    sort: "-date_created",
    search,
  });

  const url = `${DIRECTUS_URL}/items/claims?${qs}`;

  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (STATIC_TOKEN) headers["Authorization"] = `Bearer ${STATIC_TOKEN}`;

  const res = await fetch(url, {
    headers,
    cache: "no-store",
    // If you're using cookie-based auth from your login flow, you can forward cookies by enabling this:
    // credentials: "include",
    // next: { revalidate: 0 },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Directus error ${res.status}: ${txt}`);
  }

  const json = await res.json();
  // Directus wraps result in { data, meta }
  const data = (json?.data ?? []) as Claim[];
  const meta = json?.meta ?? {};

  // meta.totalCount is only available if you ask for it via meta=* in 11.x
  // So we make a secondary lightweight call to count if missing.
  let total = meta?.total_count as number | undefined;
  if (typeof total !== "number") {
    const countUrl = `${DIRECTUS_URL}/items/claims?${buildQuery({
      limit: 0,
      meta: "total_count",
      search,
    })}`;
    const resCount = await fetch(countUrl, { headers, cache: "no-store" });
    const jsonCount = await resCount.json();
    total = jsonCount?.meta?.total_count ?? 0;
  }

  return { data, total };
}

function StatusBadge({ value }: { value?: string | null }) {
  const v = (value || "unknown").toLowerCase();
  const color =
    v === "open"
      ? "bg-emerald-100 text-emerald-800"
      : v === "closed"
      ? "bg-gray-200 text-gray-800"
      : v === "pending"
      ? "bg-amber-100 text-amber-800"
      : "bg-slate-200 text-slate-800";
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {value || "Unknown"}
    </span>
  );
}

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams?: { page?: string; q?: string; per?: string };
}) {
  if (!DIRECTUS_URL) {
    throw new Error("NEXT_PUBLIC_DIRECTUS_URL is not set");
  }

  const page = Math.max(1, Number(searchParams?.page ?? 1));
  const perPage = Math.min(100, Math.max(5, Number(searchParams?.per ?? 20)));
  const q = (searchParams?.q ?? "").trim() || undefined;

  const { data, total } = await getClaims({ page, perPage, search: q });
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Claims</h1>
        <form className="relative" action="/claims" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by any text..."
            className="w-72 rounded-xl border px-4 py-2 pr-10 outline-none focus:ring-2 focus:ring-sky-400"
          />
          <button
            type="submit"
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1 text-sm border"
          >
            Search
          </button>
        </form>
      </header>

      <div className="overflow-x-auto rounded-2xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Claim #</th>
              <th className="px-4 py-3 text-left font-medium">Insured</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No claims found{q ? ` for \"${q}\"` : ""}.
                </td>
              </tr>
            ) : (
              data.map((c) => (
                <tr key={c.id} className="border-t hover:bg-slate-50/40">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {c.claim_number || c.id}
                  </td>
                  <td className="px-4 py-3">{c.insured_name || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge value={c.status} />
                  </td>
                  <td className="px-4 py-3">
                    {c.date_created
                      ? new Date(c.date_created).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      className="inline-flex items-center rounded-lg border px-3 py-1 text-xs hover:bg-slate-100"
                      href={`/claims/${c.id}`}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Showing{" "}
          <span className="font-medium">
            {Math.min((page - 1) * perPage + 1, total)}
          </span>
          –
          <span className="font-medium">{Math.min(page * perPage, total)}</span>{" "}
          of <span className="font-medium">{total}</span>
        </div>
        <div className="flex items-center gap-2">
          <PaginationLink
            disabled={page <= 1}
            href={`/claims?${buildQuery({ q, per: perPage, page: page - 1 })}`}
          >
            Previous
          </PaginationLink>
          <span className="px-3 py-1 text-sm">
            Page {page} / {totalPages}
          </span>
          <PaginationLink
            disabled={page >= totalPages}
            href={`/claims?${buildQuery({ q, per: perPage, page: page + 1 })}`}
          >
            Next
          </PaginationLink>
        </div>
      </div>
    </div>
  );
}

function PaginationLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="inline-flex items-center rounded-lg border px-3 py-1 text-sm text-slate-400 bg-slate-50 cursor-not-allowed">
        {children}
      </span>
    );
  }
  return (
    <Link
      className="inline-flex items-center rounded-lg border px-3 py-1 text-sm hover:bg-slate-100"
      href={href}
    >
      {children}
    </Link>
  );
}
