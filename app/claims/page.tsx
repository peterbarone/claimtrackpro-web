// app/claims/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ClaimsSearchBar } from "@/components/claims-search-bar";
import { ClaimListCard } from "@/components/claim-list-card";
import AppShell from "@/components/AppShell";

// ---------------------------
// Types from your API route
// ---------------------------
type ApiStatus =
  | number
  | null
  | { id?: string; name?: string | null; code?: string | number | null };
type ApiPersonRef =
  | string
  | null
  | {
      id: string;
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
    };
type ApiLossLocation = {
  street_1?: string | null;
  street_2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
} | null;

type ApiClaimType =
  | string
  | number
  | null
  | { id?: string; name?: string | null; code?: string | number | null };

type ApiClaim = {
  id: string;
  claim_number: string;
  status: ApiStatus;
  date_of_loss?: string | null;
  reported_date?: string | null;
  assigned_to_user?: ApiPersonRef;
  description?: string | null;

  primary_insured?: ApiPersonRef;
  insured_first_name?: string | null;
  insured_last_name?: string | null;
  loss_address?: string | null;
  loss_location?: ApiLossLocation;
  claim_type?: ApiClaimType;
  participants?: Array<{ id: string; name?: string; role?: string }> | null;
};

// ---------------------------
// UI model from your layout
// ---------------------------
export type ClaimListItem = {
  id: string;
  claimNumber: string;
  insuredFirstName: string;
  insuredLastName: string;
  daysOpen: number;
  status: string;
  type: string; // fallback for now (e.g., "Property", "Auto") – we map to "General" if unknown
  dateOfLoss: string; // ISO string
  lossAddress: string;
  description: string;
  participants: Array<{ id: string; name?: string; role?: string }>;
};

// Status label map (kept from your table version)
const STATUS_LABEL: Record<number, string> = {
  1: "New",
  2: "Assigned",
  3: "In Progress",
  4: "On Hold",
  5: "Closed",
};

// ---------------------------
// Helpers
// ---------------------------
function daysBetween(from?: string | null, to: Date = new Date()): number {
  if (!from) return 0;
  const start = new Date(from).getTime();
  if (Number.isNaN(start)) return 0;
  const diff = Math.max(0, to.getTime() - start);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function toIsoOrEmpty(d?: string | null): string {
  if (!d) return "";
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString();
}

function toDisplayDate(d?: string | null): string {
  if (!d) return "";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(t);
}

function toStatusLabel(status: ApiStatus): string {
  if (typeof status === "number") return STATUS_LABEL[status] ?? String(status);
  if (status && typeof status === "object")
    return (status.name ?? String(status.code ?? "")).toString();
  return "";
}

function personToName(p?: ApiPersonRef): string {
  if (!p) return "";
  if (typeof p === "string") return p.trim();
  const first = (p.first_name ?? "").trim();
  const last = (p.last_name ?? "").trim();
  return [first, last].filter(Boolean).join(" ");
}

function lossLocationToString(loc?: ApiLossLocation): string {
  if (!loc) return "";
  const a1 = (loc.street_1 ?? "").trim();
  const a2 = (loc.street_2 ?? "").trim();
  const city = (loc.city ?? "").trim();
  const state = (loc.state ?? "").trim();
  const postal = (loc.postal_code ?? "").trim();
  const street = [a1, a2].filter(Boolean).join(" ");
  const cityState = [city, state].filter(Boolean).join(", ");
  const csZip = [cityState, postal].filter(Boolean).join(" ");
  return [street, csZip].filter(Boolean).join(", ");
}

function claimTypeToLabel(ct?: ApiClaimType): string {
  if (!ct && ct !== 0) return "";
  if (typeof ct === "string" || typeof ct === "number") return String(ct);
  if (typeof ct === "object") {
    const name = (ct.name ?? "").toString().trim();
    const code = (ct.code ?? "").toString().trim();
    return name || code || "";
  }
  return "";
}

function mapApiToListItem(c: ApiClaim): ClaimListItem {
  const dateOfLossISO = toIsoOrEmpty(c.date_of_loss);
  const anchorForDays = c.reported_date || c.date_of_loss || null;
  const insuredFirstName =
    typeof c.primary_insured === "object" && c.primary_insured?.first_name
      ? c.primary_insured.first_name ?? ""
      : "";
  const insuredLastName =
    typeof c.primary_insured === "object" && c.primary_insured?.last_name
      ? c.primary_insured.last_name ?? ""
      : c.insured_last_name ?? "";
  const lossAddress = c.loss_address
    ? c.loss_address
    : lossLocationToString(c.loss_location);
  const claimType = claimTypeToLabel(c.claim_type) || "General";

  return {
    id: c.id,
    claimNumber: c.claim_number ?? "",
    insuredFirstName: (insuredFirstName ?? "").trim(),
    insuredLastName: (insuredLastName ?? "").trim(),
    daysOpen: daysBetween(anchorForDays),
    status: toStatusLabel(c.status),
    type: claimType,
    dateOfLoss: toDisplayDate(c.date_of_loss),
    lossAddress: (lossAddress ?? "").trim(),
    description: c.description ?? "",
    participants: c.participants ?? [],
  };
}

// ---------------------------
// Fetcher (client-side hit to your API route)
// Supports simple pagination via limit/offset
// ---------------------------
async function fetchClaims(limit = 20, offset = 0): Promise<ApiClaim[]> {
  const url = `/api/claims?limit=${limit}&offset=${offset}`;
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (res.status === 401) {
    // Caller will handle redirect
    throw new Error("UNAUTHENTICATED");
  }
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`Failed to fetch claims: ${res.status} ${msg}`);
  }
  const json = await res.json();
  const data = Array.isArray(json?.data) ? (json.data as ApiClaim[]) : [];
  return data;
}

// ---------------------------
// Combined Page (Client)
// ---------------------------
export default function ClaimsPage() {
  const router = useRouter();

  // Data states
  const [claims, setClaims] = useState<ClaimListItem[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<ClaimListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<keyof ClaimListItem>("dateOfLoss");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Loading & pagination
  const PAGE_SIZE = 20;
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextOffset, setNextOffset] = useState(0);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    let alive = true;
    (async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const data = await fetchClaims(PAGE_SIZE, 0);
        if (!alive) return;

        const mapped = data.map(mapApiToListItem);
        setClaims(mapped);
        setFilteredClaims(mapped);
        setHasMore(data.length === PAGE_SIZE);
        setNextOffset(data.length);
      } catch (err) {
        if (err?.message === "UNAUTHENTICATED") {
          router.replace("/login");
          return;
        }
        setErrorMsg(err?.message ?? "Unknown error loading claims.");
      } finally {
        if (alive) {
          setIsLoading(false);
          setInitialLoadDone(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  // Infinite scroll
  const loadMoreClaims = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchClaims(PAGE_SIZE, nextOffset);
      const mapped = data.map(mapApiToListItem);
      const updated = [...claims, ...mapped];

      setClaims(updated);

      // If no search query, also extend filtered set
      if (!searchQuery.trim()) {
        setFilteredClaims(updated);
      }
      setHasMore(data.length === PAGE_SIZE);
      setNextOffset(nextOffset + data.length);
    } catch (err) {
      if (err?.message === "UNAUTHENTICATED") {
        router.replace("/login");
        return;
      }
      setErrorMsg(err?.message ?? "Unknown error loading more claims.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, nextOffset, claims, searchQuery, router]);

  // Scroll listener
  useEffect(() => {
    const handler = () => {
      const nearBottom =
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000;
      if (nearBottom) loadMoreClaims();
    };
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, [loadMoreClaims]);

  // Search
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
        setFilteredClaims(claims);
        return;
      }
      const q = query.toLowerCase();
      const filtered = claims.filter((c) => {
        return (
          c.claimNumber.toLowerCase().includes(q) ||
          c.insuredFirstName.toLowerCase().includes(q) ||
          c.insuredLastName.toLowerCase().includes(q) ||
          c.type.toLowerCase().includes(q) ||
          c.lossAddress.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.status.toLowerCase().includes(q)
        );
      });
      setFilteredClaims(filtered);
    },
    [claims]
  );

  // Sort
  const handleSort = useCallback(
    (field: keyof ClaimListItem | string, direction: "asc" | "desc") => {
      // Type guard for safety
      const f = (field as keyof ClaimListItem) ?? "dateOfLoss";
      setSortField(f);
      setSortDirection(direction);

      const sorted = [...filteredClaims].sort((a, b) => {
        let aValue: any = a[f];
        let bValue: any = b[f];

        if (f === "insuredLastName") {
          aValue = a.insuredLastName;
          bValue = b.insuredLastName;
        } else if (f === "dateOfLoss") {
          aValue = a.dateOfLoss ? new Date(a.dateOfLoss) : new Date(0);
          bValue = b.dateOfLoss ? new Date(b.dateOfLoss) : new Date(0);
        } else if (f === "daysOpen") {
          aValue = a.daysOpen;
          bValue = b.daysOpen;
        }

        if (direction === "asc")
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      });

      setFilteredClaims(sorted);
    },
    [filteredClaims]
  );

  // Keep search results in sync when base data changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      // resort when claims change (e.g., after loadMore)
      const fresh = [...claims];
      // apply the current sort to maintain order
      const sorted = fresh.sort((a, b) => {
        let aValue: any = a[sortField];
        let bValue: any = b[sortField];
        if (sortField === "dateOfLoss") {
          aValue = a.dateOfLoss ? new Date(a.dateOfLoss) : new Date(0);
          bValue = b.dateOfLoss ? new Date(b.dateOfLoss) : new Date(0);
        }
        if (sortDirection === "asc")
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      });
      setFilteredClaims(sorted);
    } else {
      // re-run search to include new items
      handleSearch(searchQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claims]);

  const handleClaimClick = useCallback(
    (claimNumber: string) => {
      // If your detail route uses id, you can change this to `/claims/${id}`
      // Here we match your desired behavior from the sample (by claim #)
      router.push(`/claims/${claimNumber}`);
    },
    [router]
  );

  const resultsSummary = useMemo(() => {
    const total = claims.length;
    const shown = filteredClaims.length;
    return `Showing ${shown} of ${total} claims${
      searchQuery ? ` matching "${searchQuery}"` : ""
    }`;
  }, [claims.length, filteredClaims.length, searchQuery]);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Claims</h1>
          <p className="text-gray-600 mt-2">
            Manage and review all assigned claims
          </p>
        </div>

        {/* Search / Sort Bar */}
        <ClaimsSearchBar
          onSearch={handleSearch}
          onSort={(field, dir) => handleSort(field as keyof ClaimListItem, dir)}
          onFilter={() => console.log("Filter functionality")}
        />

        {/* Error State */}
        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* List */}
        <div className="space-y-4">
          {initialLoadDone && filteredClaims.length === 0 && searchQuery ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No claims found matching "{searchQuery}"
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Try adjusting your search terms or filters
              </p>
            </div>
          ) : (
            <>
              {filteredClaims.map((claim) => (
                <ClaimListCard
                  key={claim.id}
                  claimNumber={claim.claimNumber}
                  primary_insured={claim.insuredFirstName}
                  insuredLastName={claim.insuredLastName}
                  daysOpen={claim.daysOpen}
                  status={claim.status}
                  type={claim.type}
                  dateOfLoss={claim.dateOfLoss}
                  lossAddress={claim.lossAddress}
                  description={claim.description}
                  participants={claim.participants}
                  href={`/claims/${claim.id}`}
                />
              ))}

              {/* Loading */}
              {isLoading && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-[#92C4D5] border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-600">
                      Loading more claims...
                    </span>
                  </div>
                </div>
              )}

              {/* End-of-results (only when not searching) */}
              {!hasMore && !searchQuery && initialLoadDone && (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    You've reached the end of the claims list
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Results summary */}
        <div className="text-sm text-gray-500 text-center py-4">
          {resultsSummary}
        </div>
      </div>
    </AppShell>
  );
}
