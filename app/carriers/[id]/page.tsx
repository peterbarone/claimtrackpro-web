"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import Link from "next/link";

interface CarrierAddress {
  street_1?: string | null;
  street_2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
}
interface Carrier {
  id: string;
  name: string;
  naic?: string | null;
  phone?: string | null;
  email?: string | null;
  claims_email_intake?: string | null;
  address?: (CarrierAddress & { id?: string }) | null;
}

function addressToLines(a?: CarrierAddress | null) {
  if (!a) return ["", ""];
  const l1 = [a.street_1, a.street_2].filter(Boolean).join(" ");
  const l2 =
    [a.city, a.state].filter(Boolean).join(", ") +
    (a.postal_code ? ` ${a.postal_code}` : "");
  return [l1, l2.trim()];
}

async function fetchCarrier(id: string): Promise<Carrier | null> {
  const res = await fetch(`/api/carriers/${id}`, { cache: "no-store" });
  if (res.status === 401) throw new Error("UNAUTHENTICATED");
  if (!res.ok) throw new Error(`Failed to load carrier (${res.status})`);
  const j = await res.json();
  return j?.data || null;
}

async function updateCarrier(id: string, payload: Partial<Carrier>) {
  const res = await fetch(`/api/carriers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json())?.data;
}

async function createAddress(addr: Partial<CarrierAddress>) {
  const res = await fetch("/api/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(addr),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json())?.data;
}

async function updateAddress(id: string, addr: Partial<CarrierAddress>) {
  const res = await fetch(`/api/addresses/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(addr),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json())?.data;
}

async function deleteCarrier(id: string) {
  const res = await fetch(`/api/carriers/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

export default function CarrierDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const carrierId = params.id;
  const [carrier, setCarrier] = useState<Carrier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Carrier>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<CarrierAddress>({
    street_1: "",
    street_2: "",
    city: "",
    state: "",
    postal_code: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCarrier(carrierId);
      setCarrier(data);
      setForm({
        name: data?.name,
        naic: data?.naic || "",
        phone: data?.phone || "",
        email: data?.email || "",
        claims_email_intake: data?.claims_email_intake || "",
      });
      setAddressForm({
        street_1: data?.address?.street_1 || "",
        street_2: data?.address?.street_2 || "",
        city: data?.address?.city || "",
        state: data?.address?.state || "",
        postal_code: data?.address?.postal_code || "",
      });
    } catch (e) {
      if (e?.message === "UNAUTHENTICATED") {
        router.replace("/login");
        return;
      }
      setError(e?.message || "Failed to load carrier");
    } finally {
      setLoading(false);
    }
  }, [carrierId, router]);

  useEffect(() => {
    load();
  }, [load]);

  const onChange = (k: keyof Carrier, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSave = async () => {
    if (!form.name || !String(form.name).trim()) {
      setSaveError("Name is required");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateCarrier(carrierId, {
        name: form.name,
        naic: form.naic,
        phone: form.phone,
        email: form.email,
        claims_email_intake: form.claims_email_intake,
      });
      setCarrier(updated);
      setEditing(false);
    } catch (e) {
      setSaveError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!confirm("Delete this carrier? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteCarrier(carrierId);
      router.push("/carriers");
    } catch (e) {
      alert(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const [addr1, addr2] = addressToLines(carrier?.address);

  return (
    <AppShell>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Carrier Details
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              Manage a single carrier record
            </p>
          </div>
          <div className="flex gap-2">
            {!editing && !loading && carrier && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 text-sm rounded-md bg-sky-600 hover:bg-sky-700 text-white font-medium"
              >
                Edit
              </button>
            )}
            {editing && (
              <button
                onClick={() => {
                  setEditing(false);
                  setForm({
                    name: carrier?.name,
                    naic: carrier?.naic || "",
                    phone: carrier?.phone || "",
                    email: carrier?.email || "",
                    claims_email_intake: carrier?.claims_email_intake || "",
                  });
                }}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
            <button
              disabled={deleting}
              onClick={onDelete}
              className="px-4 py-2 text-sm rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>

        {loading && <div className="text-gray-500">Loading carrier...</div>}
        {error && (
          <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {!loading && !error && !carrier && (
          <div className="text-gray-500">Carrier not found.</div>
        )}

        {!loading && carrier && (
          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">General</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    disabled={!editing}
                    value={form.name || ""}
                    onChange={(e) => onChange("name", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NAIC
                  </label>
                  <input
                    disabled={!editing}
                    value={form.naic || ""}
                    onChange={(e) => onChange("naic", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    disabled={!editing}
                    value={form.phone || ""}
                    onChange={(e) => onChange("phone", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    disabled={!editing}
                    value={form.email || ""}
                    onChange={(e) => onChange("email", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-gray-100"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Claims Intake Email
                  </label>
                  <input
                    disabled={!editing}
                    value={form.claims_email_intake || ""}
                    onChange={(e) =>
                      onChange("claims_email_intake", e.target.value)
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-gray-100"
                  />
                </div>
              </div>
              {saveError && (
                <div className="text-sm text-red-600">{saveError}</div>
              )}
              {editing && (
                <div className="flex gap-3 pt-2">
                  <button
                    disabled={saving}
                    onClick={onSave}
                    className="px-4 py-2 text-sm rounded-md bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-medium"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">Address</h2>
              {!editing && (
                <div className="text-sm text-gray-700 space-y-1">
                  <div>
                    {addr1 || (
                      <span className="italic text-gray-400">No address</span>
                    )}
                  </div>
                  <div>{addr2}</div>
                </div>
              )}
              {editing && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street 1
                    </label>
                    <input
                      value={addressForm.street_1 || ""}
                      onChange={(e) =>
                        setAddressForm((f) => ({
                          ...f,
                          street_1: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street 2
                    </label>
                    <input
                      value={addressForm.street_2 || ""}
                      onChange={(e) =>
                        setAddressForm((f) => ({
                          ...f,
                          street_2: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      value={addressForm.city || ""}
                      onChange={(e) =>
                        setAddressForm((f) => ({ ...f, city: e.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      value={addressForm.state || ""}
                      onChange={(e) =>
                        setAddressForm((f) => ({ ...f, state: e.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code
                    </label>
                    <input
                      value={addressForm.postal_code || ""}
                      onChange={(e) =>
                        setAddressForm((f) => ({
                          ...f,
                          postal_code: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                  {addressError && (
                    <div className="sm:col-span-2 text-sm text-red-600">
                      {addressError}
                    </div>
                  )}
                  <div className="sm:col-span-2 flex gap-3 pt-2">
                    <button
                      type="button"
                      disabled={addressSaving}
                      onClick={async () => {
                        setAddressError(null);
                        setAddressSaving(true);
                        try {
                          if (
                            addressForm.street_1 ||
                            addressForm.city ||
                            addressForm.state ||
                            addressForm.postal_code
                          ) {
                            if (
                              !addressForm.street_1 ||
                              !addressForm.city ||
                              !addressForm.state
                            ) {
                              setAddressError(
                                "Address requires street, city, state"
                              );
                            } else if (carrier?.address?.id) {
                              await updateAddress(
                                carrier.address.id,
                                addressForm
                              );
                              await load();
                            } else {
                              const created = await createAddress(addressForm);
                              if (created?.id) {
                                await updateCarrier(carrierId, {
                                  address: created.id,
                                });
                                await load();
                              }
                            }
                          } else {
                            // clearing address not implemented here
                          }
                        } catch (e) {
                          setAddressError(e?.message || "Address save failed");
                        } finally {
                          setAddressSaving(false);
                        }
                      }}
                      className="px-4 py-2 text-sm rounded-md bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-medium"
                    >
                      {addressSaving
                        ? "Saving Address..."
                        : carrier?.address?.id
                        ? "Update Address"
                        : "Add Address"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
