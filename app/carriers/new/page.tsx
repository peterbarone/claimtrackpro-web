"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

async function createCarrier(payload: any) {
  const res = await fetch("/api/carriers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  const j = await res.json();
  return j?.data;
}

async function createAddress(addr: any) {
  const res = await fetch("/api/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(addr),
  });
  if (!res.ok) throw new Error(await res.text());
  const j = await res.json();
  return j?.data;
}

export default function NewCarrierPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    naic: "",
    phone: "",
    email: "",
    claims_email_intake: "",
    street_1: "",
    street_2: "",
    city: "",
    state: "",
    postal_code: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let addressId: string | undefined;
      if (form.street_1 || form.city || form.state || form.postal_code) {
        // require minimal address fields: street_1, city, state
        if (!form.street_1 || !form.city || !form.state) {
          setError("Address requires street, city, state");
          setSaving(false);
          return;
        }
        try {
          const addr = await createAddress({
            street_1: form.street_1,
            street_2: form.street_2 || undefined,
            city: form.city,
            state: form.state,
            postal_code: form.postal_code || undefined,
          });
          addressId = addr?.id;
        } catch (e) {
          setError(e?.message || "Failed to create address");
          setSaving(false);
          return;
        }
      }
      const created = await createCarrier({
        name: form.name,
        naic: form.naic || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        claims_email_intake: form.claims_email_intake || undefined,
        address: addressId,
      });
      if (created?.id) {
        router.replace(`/carriers/${created.id}`);
      } else {
        setError("Carrier created but ID missing in response");
      }
    } catch (e) {
      setError(e?.message || "Failed to create carrier");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Carrier</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Create a new carrier record
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                value={form.name}
                onChange={(e) => onChange("name", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NAIC
              </label>
              <input
                value={form.naic}
                onChange={(e) => onChange("naic", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                value={form.phone}
                onChange={(e) => onChange("phone", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                value={form.email}
                onChange={(e) => onChange("email", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Claims Intake Email
              </label>
              <input
                value={form.claims_email_intake}
                onChange={(e) =>
                  onChange("claims_email_intake", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div className="sm:col-span-2 pt-4">
              <h2 className="text-md font-semibold text-gray-800 mb-2">
                Address (Optional)
              </h2>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street 1
              </label>
              <input
                value={form.street_1}
                onChange={(e) => onChange("street_1", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street 2
              </label>
              <input
                value={form.street_2}
                onChange={(e) => onChange("street_2", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                value={form.city}
                onChange={(e) => onChange("city", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                value={form.state}
                onChange={(e) => onChange("state", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postal Code
              </label>
              <input
                value={form.postal_code}
                onChange={(e) => onChange("postal_code", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded-md bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-medium"
            >
              {saving ? "Creating..." : "Create Carrier"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/carriers")}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
