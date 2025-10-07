"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { formatPhone, formatPhoneWithExt } from "@/lib/utils";
import AppShell from "@/components/AppShell";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CarrierAddress {
  id?: string;
  street_1?: string | null;
  street_2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
}

interface CarrierApi {
  id: string;
  name: string;
  naic?: string | null;
  address?: CarrierAddress | null;
  phone?: string | null;
  phone_ext?: string | null; // optional extension support
  email?: string | null;
  claims_email_intake?: string | null;
}

function addressToString(a?: CarrierAddress | null) {
  if (!a) return "";
  const s1 = a.street_1?.trim() || "";
  const s2 = a.street_2?.trim() || "";
  const city = a.city?.trim() || "";
  const state = a.state?.trim() || "";
  const zip = a.postal_code?.trim() || "";
  const line1 = [s1, s2].filter(Boolean).join(" ");
  const line2 = [city, state].filter(Boolean).join(", ");
  return [line1, [line2, zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}

async function fetchCarriers(limit = 100, offset = 0): Promise<CarrierApi[]> {
  const res = await fetch(`/api/carriers?limit=${limit}&offset=${offset}`, {
    cache: "no-store",
  });
  if (res.status === 401) throw new Error("UNAUTHENTICATED");
  if (!res.ok) throw new Error(`Failed to fetch carriers (${res.status})`);
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

export default function CarriersPage() {
  const router = useRouter();
  const [carriers, setCarriers] = useState<CarrierApi[]>([]);
  const [filtered, setFiltered] = useState<CarrierApi[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchCarriers();
        if (!alive) return;
        setCarriers(data);
        setFiltered(data);
      } catch (e) {
        if (e?.message === "UNAUTHENTICATED") {
          window.location.href = "/login";
          return;
        }
        setError(e?.message || "Failed to load carriers");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleSearch = useCallback(
    (q: string) => {
      setSearch(q);
      if (!q.trim()) {
        setFiltered(carriers);
        return;
      }
      const low = q.toLowerCase();
      setFiltered(
        carriers.filter((c) => {
          return (
            c.name.toLowerCase().includes(low) ||
            (c.naic || "").toLowerCase().includes(low) ||
            (c.email || "").toLowerCase().includes(low) ||
            (c.phone_ext
              ? formatPhoneWithExt(c.phone || "", c.phone_ext || "")
              : formatPhone(c.phone || "")
            )
              .toLowerCase()
              .includes(low) ||
            (c.claims_email_intake || "").toLowerCase().includes(low) ||
            addressToString(c.address)
              .toLowerCase()
              .includes(low)
          );
        })
      );
    },
    [carriers]
  );

  const summary = useMemo(() => {
    return `Showing ${filtered.length} of ${carriers.length} carriers${
      search ? ` matching "${search}"` : ""
    }`;
  }, [filtered.length, carriers.length, search]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Carriers</h1>
          <p className="text-gray-600 mt-2">List of insurance carriers</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            type="text"
            placeholder="Search carriers..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full sm:max-w-sm border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <button
            onClick={() => router.push("/carriers/new")}
            className="inline-flex items-center justify-center rounded-md bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-4 py-2 shadow focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-1"
          >
            New Carrier
          </button>
        </div>

        {error && (
          <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">
                  Name
                </th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">
                  NAIC
                </th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">
                  Address
                </th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">
                  Phone
                </th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">
                  Email
                </th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">
                  Claims Intake Email
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && carriers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    Loading carriers...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No carriers found
                  </td>
                </tr>
              )}
              {filtered.map((c) => {
                const phoneDisplay = c.phone_ext
                  ? formatPhoneWithExt(c.phone || "", c.phone_ext || "")
                  : formatPhone(c.phone || "");
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 font-medium text-gray-900">
                      <Link
                        href={`/carriers/${c.id}`}
                        className="text-sky-700 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{c.naic || ""}</td>
                    <td className="px-4 py-2 text-gray-700">
                      {addressToString(c.address)}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{phoneDisplay}</td>
                    <td className="px-4 py-2 text-sky-600">{c.email || ""}</td>
                    <td className="px-4 py-2 text-sky-600">
                      {c.claims_email_intake || ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="text-sm text-gray-500 text-center py-4">{summary}</div>
      </div>
    </AppShell>
  );
}
