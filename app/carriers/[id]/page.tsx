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

interface ContactRecord {
  id?: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  email: string;
  notes: string;
  company?: string; // carrier name linkage
  _editing?: boolean; // local UI state
  _saving?: boolean;
  _error?: string | null;
  _deleting?: boolean;
  _dirty?: boolean;
  _isNew?: boolean; // unsaved new row
}

function addressToLines(a?: CarrierAddress | null) {
  if (!a) return ["", ""];
  const l1 = [a.street_1, a.street_2].filter(Boolean).join(" ");
  const cityState = [a.city, a.state].filter(Boolean).join(", ");
  const l2 = [cityState, a.postal_code].filter(Boolean).join(" ");
  return [l1, l2];
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

  // Contacts state
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [contactSavingAll, setContactSavingAll] = useState(false);

  // Roles for dropdown
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);

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

  // Fetch roles once
  useEffect(() => {
    let ignore = false;
    async function fetchRoles() {
      setRolesLoading(true);
      setRolesError(null);
      try {
        const r = await fetch("/api/roles", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || `Failed (${r.status})`);
        if (!ignore) setRoles(Array.isArray(j?.data) ? j.data : []);
      } catch (e) {
        if (!ignore) setRolesError(e.message || "Failed to load roles");
      } finally {
        if (!ignore) setRolesLoading(false);
      }
    }
    fetchRoles();
    return () => {
      ignore = true;
    };
  }, []);

  const loadContacts = useCallback(async (carrierName?: string) => {
    if (!carrierName) return;
    setContactsLoading(true);
    setContactsError(null);
    try {
      const res = await fetch(
        `/api/contacts?company=${encodeURIComponent(carrierName)}`,
        { cache: "no-store" }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`);
      const list: ContactRecord[] = (j?.data || []).map((c: any) => ({
        id: c.id,
        first_name: c.first_name || "",
        last_name: c.last_name || "",
        role: c.role || "",
        phone: c.phone || "",
        email: c.email || "",
        notes: c.notes || "",
        company: c.company || carrierName,
        _editing: false,
        _saving: false,
        _error: null,
        _deleting: false,
        _dirty: false,
        _isNew: false,
      }));
      setContacts(list);
    } catch (e) {
      setContactsError(e.message || "Failed to load contacts");
    } finally {
      setContactsLoading(false);
    }
  }, []);

  // Load contacts after carrier fetch success
  useEffect(() => {
    if (carrier?.name) loadContacts(carrier.name);
  }, [carrier?.name, loadContacts]);

  const addNewContact = () => {
    setContacts((c) => [
      ...c,
      {
        first_name: "",
        last_name: "",
        role: "",
        phone: "",
        email: "",
        notes: "",
        company: carrier?.name,
        _editing: true,
        _saving: false,
        _error: null,
        _deleting: false,
        _dirty: true,
        _isNew: true,
      },
    ]);
  };

  const updateContactLocal = (
    idx: number,
    key: keyof ContactRecord,
    value: string
  ) => {
    setContacts((list) =>
      list.map((c, i) => (i === idx ? { ...c, [key]: value, _dirty: true } : c))
    );
  };

  const toggleEditContact = (idx: number, editing: boolean) => {
    setContacts((list) =>
      list.map((c, i) =>
        i === idx ? { ...c, _editing: editing, _error: null } : c
      )
    );
  };

  const saveContact = async (idx: number) => {
    // Get latest snapshot of the contact
    const current = contacts[idx];
    if (!current) return;
    if (!carrier?.name) {
      setContacts((list) =>
        list.map((c, i) =>
          i === idx
            ? { ...c, _error: "Carrier name missing; save carrier first." }
            : c
        )
      );
      return;
    }
    // Mark saving
    setContacts((list) =>
      list.map((c, i) =>
        i === idx ? { ...c, _saving: true, _error: null } : c
      )
    );

    const isUUID = (val: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        val || ""
      );
    const payload: any = {
      first_name: current.first_name || undefined,
      last_name: current.last_name || undefined,
      role: isUUID(current.role) ? current.role : undefined,
      phone: current.phone || undefined,
      email: current.email || undefined,
      notes: current.notes || undefined,
      company: carrier.name,
    };
    if (!payload.company) {
      setContacts((list) =>
        list.map((c, i) =>
          i === idx ? { ...c, _saving: false, _error: "Company required" } : c
        )
      );
      return;
    }
    try {
      let saved: any;
      if (current.id) {
        const res = await fetch(`/api/contacts/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const text = await res.text();
        let j: any = {};
        try {
          j = JSON.parse(text);
        } catch {
          j = { raw: text };
        }
        if (!res.ok) {
          const detail = j?.detail || j?.error || j?.raw;
          throw new Error(
            `${j?.error || "Failed"} (${res.status})${
              detail ? " :: " + JSON.stringify(detail).slice(0, 300) : ""
            }`
          );
        }
        saved = j?.data;
      } else {
        const res = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const text = await res.text();
        let j: any = {};
        try {
          j = JSON.parse(text);
        } catch {
          j = { raw: text };
        }
        if (!res.ok) {
          const detail = j?.detail || j?.error || j?.raw;
          throw new Error(
            `${j?.error || "Failed"} (${res.status})${
              detail ? " :: " + JSON.stringify(detail).slice(0, 300) : ""
            }`
          );
        }
        saved = j?.data;
      }
      if (carrier?.name) await loadContacts(carrier.name);
      setContacts((list) =>
        list.map((c, i) =>
          i === idx
            ? {
                ...c,
                id: saved?.id || c.id,
                _editing: false,
                _saving: false,
                _dirty: false,
                _isNew: false,
              }
            : c
        )
      );
    } catch (e) {
      let msg = e?.message || "Save failed";
      if (/\(500\)/.test(msg)) msg += " - 500: see network response detail.";
      setContacts((list) =>
        list.map((c, i) =>
          i === idx ? { ...c, _saving: false, _error: msg } : c
        )
      );
    }
  };

  const deleteContact = async (idx: number) => {
    let toDelete: ContactRecord | undefined;
    setContacts((list) => {
      toDelete = list[idx];
      return list;
    });
    if (!toDelete) return;
    if (toDelete.id && !confirm("Delete this contact?")) return;
    if (!toDelete.id) {
      // Unsaved new row - just remove
      setContacts((list) => list.filter((_, i) => i !== idx));
      return;
    }
    setContacts((list) =>
      list.map((c, i) =>
        i === idx ? { ...c, _deleting: true, _error: null } : c
      )
    );
    try {
      const res = await fetch(`/api/contacts/${toDelete!.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Failed (${res.status})`);
      }
      setContacts((list) => list.filter((_, i) => i !== idx));
    } catch (e) {
      setContacts((list) =>
        list.map((c, i) =>
          i === idx
            ? { ...c, _deleting: false, _error: e.message || "Delete failed" }
            : c
        )
      );
    }
  };

  const saveAllDirtyContacts = async () => {
    const dirtyIndexes = contacts
      .map((c, i) => (c._dirty ? i : -1))
      .filter((i) => i >= 0);
    if (!dirtyIndexes.length) return;
    setContactSavingAll(true);
    for (const idx of dirtyIndexes) {
      // eslint-disable-next-line no-await-in-loop
      await saveContact(idx);
    }
    setContactSavingAll(false);
  };

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

            {/* Contacts Management */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">
                  Contacts
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addNewContact}
                    className="px-3 py-1 text-sm rounded-md bg-sky-600 hover:bg-sky-700 text-white"
                  >
                    Add Contact
                  </button>
                  {contacts.some((c) => c._dirty) && (
                    <button
                      type="button"
                      disabled={contactSavingAll}
                      onClick={saveAllDirtyContacts}
                      className="px-3 py-1 text-sm rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                    >
                      {contactSavingAll ? "Saving..." : "Save All"}
                    </button>
                  )}
                </div>
              </div>
              {contactsLoading && (
                <div className="text-sm text-gray-500">Loading contacts...</div>
              )}
              {contactsError && (
                <div className="text-sm text-red-600">{contactsError}</div>
              )}
              {!contactsLoading && !contactsError && contacts.length === 0 && (
                <div className="text-sm text-gray-500">No contacts.</div>
              )}
              <div className="space-y-4">
                {contacts.map((c, idx) => (
                  <div
                    key={c.id || `new-${idx}`}
                    className="p-4 border border-gray-200 rounded-md bg-gray-50 space-y-3 relative"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            First
                          </label>
                          <input
                            disabled={!c._editing}
                            value={c.first_name}
                            onChange={(e) =>
                              updateContactLocal(
                                idx,
                                "first_name",
                                e.target.value
                              )
                            }
                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Last
                          </label>
                          <input
                            disabled={!c._editing}
                            value={c.last_name}
                            onChange={(e) =>
                              updateContactLocal(
                                idx,
                                "last_name",
                                e.target.value
                              )
                            }
                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Role
                          </label>
                          {rolesError ? (
                            <input
                              disabled={!c._editing}
                              value={c.role}
                              onChange={(e) =>
                                updateContactLocal(idx, "role", e.target.value)
                              }
                              className="w-full rounded-md border border-red-300 px-2 py-1 text-xs disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                            />
                          ) : (
                            <select
                              disabled={!c._editing || rolesLoading}
                              value={c.role}
                              onChange={(e) =>
                                updateContactLocal(idx, "role", e.target.value)
                              }
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs bg-white disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50"
                            >
                              <option value="">
                                {rolesLoading ? "Loading..." : "Select role"}
                              </option>
                              {roles.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Phone
                          </label>
                          <input
                            disabled={!c._editing}
                            value={c.phone}
                            onChange={(e) =>
                              updateContactLocal(idx, "phone", e.target.value)
                            }
                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Email
                          </label>
                          <input
                            disabled={!c._editing}
                            value={c.email}
                            onChange={(e) =>
                              updateContactLocal(idx, "email", e.target.value)
                            }
                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Notes
                          </label>
                          <textarea
                            disabled={!c._editing}
                            value={c.notes}
                            onChange={(e) =>
                              updateContactLocal(idx, "notes", e.target.value)
                            }
                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs min-h-[60px] disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                          />
                        </div>
                      </div>
                    </div>
                    {c._error && (
                      <div className="text-[11px] text-red-600">{c._error}</div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {!c._editing && (
                        <button
                          type="button"
                          onClick={() => toggleEditContact(idx, true)}
                          className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                        >
                          Edit
                        </button>
                      )}
                      {c._editing && (
                        <button
                          type="button"
                          disabled={c._saving}
                          onClick={() => saveContact(idx)}
                          className="text-[10px] px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {c._saving ? "Saving..." : "Save"}
                        </button>
                      )}
                      {c._editing && (
                        <button
                          type="button"
                          disabled={c._saving}
                          onClick={() => toggleEditContact(idx, false)}
                          className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={c._deleting}
                        onClick={() => deleteContact(idx)}
                        className="text-[10px] px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                      >
                        {c._deleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
