"use client";

import { useEffect, useState, useCallback } from "react";
import { formatPhoneWithExt, formatPhone } from "@/lib/utils";
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
  title: string;
  phone: string;
  phone_ext: string;
  email: string;
  notes: string;
  company?: string;
  _editing?: boolean;
  _saving?: boolean;
  _error?: string | null;
  _deleting?: boolean;
  _dirty?: boolean;
  _isNew?: boolean;
}
interface ContactDraft
  extends Omit<
    ContactRecord,
    "_editing" | "_saving" | "_error" | "_deleting" | "_dirty" | "_isNew"
  > {}

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

  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [contactSavingAll] = useState(false); // legacy no-op
  const [editingContact, setEditingContact] = useState<ContactDraft | null>(
    null
  );
  const [contactModalSaving, setContactModalSaving] = useState(false);
  const [contactModalError, setContactModalError] = useState<string | null>(
    null
  );

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
        name: data?.name || "",
        naic: data?.naic || "",
        phone: data?.phone || "",
        email: data?.email || "",
        claims_email_intake: data?.claims_email_intake || "",
      });
      if (data?.address) {
        setAddressForm({
          street_1: data.address.street_1 || "",
          street_2: data.address.street_2 || "",
          city: data.address.city || "",
          state: data.address.state || "",
          postal_code: data.address.postal_code || "",
        });
      } else {
        setAddressForm({
          street_1: "",
          street_2: "",
          city: "",
          state: "",
          postal_code: "",
        });
      }
    } catch (e) {
      setError(e.message || "Failed to load carrier");
    } finally {
      setLoading(false);
    }
  }, [carrierId]);

  const loadContacts = useCallback(async (carrierName: string) => {
    setContactsLoading(true);
    setContactsError(null);
    try {
      const res = await fetch(
        `/api/contacts?company=${encodeURIComponent(carrierName)}`
      );
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const j = await res.json();
      const items = j?.data || [];
      setContacts(
        items.map((c: any) => ({
          id: c.id,
          first_name: c.first_name || "",
          last_name: c.last_name || "",
          role: c.role || "",
          title: c.title || "",
          phone: c.phone || "",
          phone_ext: c.phone_ext || "",
          email: c.email || "",
          notes: c.notes || "",
          company: c.company,
        }))
      );
    } catch (e) {
      setContactsError(e.message || "Failed to load contacts");
    } finally {
      setContactsLoading(false);
    }
  }, []);

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    setRolesError(null);
    try {
      const res = await fetch("/api/roles");
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const j = await res.json();
      const data = j?.data || [];
      setRoles(data.map((r: any) => ({ id: r.id, name: r.name })));
    } catch (e) {
      setRolesError(e.message || "Failed to load roles");
    } finally {
      setRolesLoading(false);
    }
  }, []);

  const updateContactLocal = (
    idx: number,
    key: keyof ContactRecord,
    value: string
  ) => {
    setContacts((list) =>
      list.map((c, i) => (i === idx ? { ...c, [key]: value, _dirty: true } : c))
    );
  };
  const openEditContact = (idx: number) => {
    const c = contacts[idx];
    if (!c) return;
    setEditingContact({
      id: c.id,
      first_name: c.first_name || "",
      last_name: c.last_name || "",
      role: c.role || "",
      title: c.title || "",
      phone: c.phone || "",
      phone_ext: c.phone_ext || "",
      email: c.email || "",
      notes: c.notes || "",
      company: c.company,
    });
  };
  const addNewContact = () => {
    if (!carrier?.name) {
      alert("Save carrier before adding contacts");
      return;
    }
    setEditingContact({
      first_name: "",
      last_name: "",
      role: "",
      title: "",
      phone: "",
      phone_ext: "",
      email: "",
      notes: "",
      company: carrier.name,
    });
  };

  const persistDraft = async () => {
    if (!editingContact) return;
    if (!carrier?.name) {
      setContactModalError("Carrier name missing; save carrier first.");
      return;
    }
    setContactModalSaving(true);
    setContactModalError(null);
    const isUUID = (val: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        val || ""
      );
    const payload: any = {
      first_name: editingContact.first_name || undefined,
      last_name: editingContact.last_name || undefined,
      role: isUUID(editingContact.role) ? editingContact.role : undefined,
      title: editingContact.title || undefined,
      phone: editingContact.phone || undefined,
      phone_ext: editingContact.phone_ext || undefined,
      email: editingContact.email || undefined,
      notes: editingContact.notes || undefined,
      company: carrier.name,
    };
    try {
      let saved: any;
      if (editingContact.id) {
        const res = await fetch(`/api/contacts/${editingContact.id}`, {
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
        const res = await fetch(`/api/contacts`, {
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
      setEditingContact(null);
    } catch (e) {
      setContactModalError(e?.message || "Save failed");
    } finally {
      setContactModalSaving(false);
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
    // With modal editing each save persists immediately. This can be a no-op or future bulk action.
    return;
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

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (carrier?.name) loadContacts(carrier.name);
  }, [carrier?.name, loadContacts]);
  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

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
              {!editing && (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-semibold tracking-tight text-gray-900">
                        {form.name || (
                          <span className="italic text-gray-400">
                            Unnamed Carrier
                          </span>
                        )}
                      </h3>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {form.naic && (
                          <span className="inline-flex items-center rounded-full bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 font-medium">
                            NAIC {form.naic}
                          </span>
                        )}
                        {form.phone && (
                          <span className="inline-flex items-center rounded-full bg-gray-50 text-gray-700 border border-gray-200 px-2 py-0.5 font-medium">
                            {formatPhone(form.phone)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-6 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                        Email
                      </p>
                      <p className="text-gray-800 break-all">
                        {form.email || (
                          <span className="italic text-gray-400">None</span>
                        )}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                        Claims Intake
                      </p>
                      <p className="text-gray-800 break-all">
                        {form.claims_email_intake || (
                          <span className="italic text-gray-400">None</span>
                        )}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                        Phone
                      </p>
                      <p className="text-gray-800">
                        {form.phone ? (
                          formatPhone(form.phone)
                        ) : (
                          <span className="italic text-gray-400">None</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {editing && (
                <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold tracking-wide text-gray-600 mb-1">
                        Name *
                      </label>
                      <input
                        value={form.name || ""}
                        onChange={(e) => onChange("name", e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold tracking-wide text-gray-600 mb-1">
                        NAIC
                      </label>
                      <input
                        value={form.naic || ""}
                        onChange={(e) => onChange("naic", e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold tracking-wide text-gray-600 mb-1">
                        Phone
                      </label>
                      <input
                        value={form.phone || ""}
                        onChange={(e) => onChange("phone", e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold tracking-wide text-gray-600 mb-1">
                        Email
                      </label>
                      <input
                        value={form.email || ""}
                        onChange={(e) => onChange("email", e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold tracking-wide text-gray-600 mb-1">
                        Claims Intake Email
                      </label>
                      <input
                        value={form.claims_email_intake || ""}
                        onChange={(e) =>
                          onChange("claims_email_intake", e.target.value)
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                      />
                    </div>
                  </div>
                  {saveError && (
                    <div className="text-sm text-red-600">{saveError}</div>
                  )}
                  <div className="flex gap-3">
                    <button
                      disabled={saving}
                      onClick={onSave}
                      className="px-4 py-2 text-sm rounded-md bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-medium"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">Address</h2>
              {!editing && (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 text-sm">
                  {addr1 || addr2 ? (
                    <div className="space-y-1 text-gray-800">
                      {addr1 && <p>{addr1}</p>}
                      {addr2 && <p>{addr2}</p>}
                    </div>
                  ) : (
                    <p className="italic text-gray-400">No address on file</p>
                  )}
                </div>
              )}
              {editing && (
                <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
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
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {contacts.map((c, idx) => (
                  <div
                    key={c.id || `new-${idx}`}
                    className="flex flex-col p-4 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow group"
                  >
                    <div className="flex-1">
                      {c._editing ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              placeholder="First name"
                              value={c.first_name}
                              onChange={(e) =>
                                updateContactLocal(
                                  idx,
                                  "first_name",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                            />
                            <input
                              placeholder="Last name"
                              value={c.last_name}
                              onChange={(e) =>
                                updateContactLocal(
                                  idx,
                                  "last_name",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {rolesError ? (
                              <input
                                value={c.role}
                                onChange={(e) =>
                                  updateContactLocal(
                                    idx,
                                    "role",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-md border border-red-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                                placeholder="Role"
                              />
                            ) : (
                              <select
                                disabled={rolesLoading}
                                value={c.role}
                                onChange={(e) =>
                                  updateContactLocal(
                                    idx,
                                    "role",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50"
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
                            <input
                              placeholder="Title"
                              value={c.title}
                              onChange={(e) =>
                                updateContactLocal(idx, "title", e.target.value)
                              }
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="flex gap-2">
                              <input
                                placeholder="Phone"
                                value={c.phone}
                                onChange={(e) =>
                                  updateContactLocal(
                                    idx,
                                    "phone",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                              />
                              <input
                                placeholder="Ext"
                                value={c.phone_ext}
                                onChange={(e) =>
                                  updateContactLocal(
                                    idx,
                                    "phone_ext",
                                    e.target.value
                                      .replace(/[^0-9]/g, "")
                                      .slice(0, 8)
                                  )
                                }
                                className="w-20 rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                              />
                            </div>
                            <input
                              placeholder="Email"
                              value={c.email}
                              onChange={(e) =>
                                updateContactLocal(idx, "email", e.target.value)
                              }
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                            />
                            <textarea
                              placeholder="Notes"
                              value={c.notes}
                              onChange={(e) =>
                                updateContactLocal(idx, "notes", e.target.value)
                              }
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs min-h-[60px] focus:outline-none focus:ring-2 focus:ring-sky-400"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900 leading-tight">
                                {(c.first_name + " " + c.last_name).trim() ||
                                  "Unnamed Contact"}
                              </p>
                              {c.title && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {c.title}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            {(c.phone || c.phone_ext) && (
                              <p>
                                <span className="font-medium text-gray-700">
                                  Phone:
                                </span>{" "}
                                {c.phone_ext
                                  ? formatPhoneWithExt(
                                      c.phone || "",
                                      c.phone_ext
                                    )
                                  : formatPhone(c.phone || "")}
                              </p>
                            )}
                            {c.email && (
                              <p>
                                <span className="font-medium text-gray-700">
                                  Email:
                                </span>{" "}
                                {c.email}
                              </p>
                            )}
                            {c.notes && (
                              <p className="line-clamp-3">
                                <span className="font-medium text-gray-700">
                                  Notes:
                                </span>{" "}
                                {c.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {c._error && (
                      <div className="text-[11px] text-red-600 mt-2">
                        {c._error}
                      </div>
                    )}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => openEditContact(idx)}
                        className="text-[11px] px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={c._deleting}
                        onClick={() => deleteContact(idx)}
                        className="text-[11px] px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
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
      {editingContact && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl border border-gray-200">
            <div className="px-6 pt-6 pb-5 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 tracking-tight">
                    {editingContact.id ? "Edit Contact" : "New Contact"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Carrier contact details
                  </p>
                </div>
                <button
                  onClick={() => !contactModalSaving && setEditingContact(null)}
                  className="text-gray-400 hover:text-gray-600 transition"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              {contactModalError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2">
                  {contactModalError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">
                    First Name
                  </label>
                  <input
                    value={editingContact.first_name}
                    onChange={(e) =>
                      setEditingContact((d) =>
                        d ? { ...d, first_name: e.target.value } : d
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">
                    Last Name
                  </label>
                  <input
                    value={editingContact.last_name}
                    onChange={(e) =>
                      setEditingContact((d) =>
                        d ? { ...d, last_name: e.target.value } : d
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">
                    Role
                  </label>
                  {rolesError ? (
                    <input
                      value={editingContact.role}
                      onChange={(e) =>
                        setEditingContact((d) =>
                          d ? { ...d, role: e.target.value } : d
                        )
                      }
                      className="w-full rounded-md border border-red-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      placeholder="Role"
                    />
                  ) : (
                    <select
                      disabled={rolesLoading}
                      value={editingContact.role}
                      onChange={(e) =>
                        setEditingContact((d) =>
                          d ? { ...d, role: e.target.value } : d
                        )
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50"
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
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">
                    Title
                  </label>
                  <input
                    value={editingContact.title}
                    onChange={(e) =>
                      setEditingContact((d) =>
                        d ? { ...d, title: e.target.value } : d
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-gray-600">
                    Phone & Extension
                  </label>
                  <div className="flex gap-3">
                    <input
                      value={editingContact.phone}
                      onChange={(e) =>
                        setEditingContact((d) =>
                          d ? { ...d, phone: e.target.value } : d
                        )
                      }
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                      placeholder="(###) ###-####"
                    />
                    <input
                      value={editingContact.phone_ext}
                      onChange={(e) =>
                        setEditingContact((d) =>
                          d
                            ? {
                                ...d,
                                phone_ext: e.target.value
                                  .replace(/[^0-9]/g, "")
                                  .slice(0, 8),
                              }
                            : d
                        )
                      }
                      className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                      placeholder="Ext"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Digits only, up to 8 for extension.
                  </p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-gray-600">
                    Email
                  </label>
                  <input
                    value={editingContact.email}
                    onChange={(e) =>
                      setEditingContact((d) =>
                        d ? { ...d, email: e.target.value } : d
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="name@example.com"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-gray-600">
                    Notes
                  </label>
                  <textarea
                    value={editingContact.notes}
                    onChange={(e) =>
                      setEditingContact((d) =>
                        d ? { ...d, notes: e.target.value } : d
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[90px] focus:outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="Additional context..."
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap justify-between items-center gap-3 rounded-b-xl">
              <button
                type="button"
                disabled={contactModalSaving}
                onClick={() => setEditingContact(null)}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50 transition"
              >
                Cancel
              </button>
              <div className="flex gap-2">
                {editingContact.id && (
                  <button
                    type="button"
                    disabled={contactModalSaving}
                    onClick={async () => {
                      if (!confirm("Delete this contact?")) return;
                      try {
                        const res = await fetch(
                          `/api/contacts/${editingContact.id}`,
                          { method: "DELETE" }
                        );
                        if (!res.ok) {
                          const j = await res.json().catch(() => ({}));
                          throw new Error(j?.error || "Delete failed");
                        }
                        if (carrier?.name) await loadContacts(carrier.name);
                        setEditingContact(null);
                      } catch (e) {
                        setContactModalError(e?.message || "Delete failed");
                      }
                    }}
                    className="px-4 py-2 text-sm rounded-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  disabled={contactModalSaving}
                  onClick={persistDraft}
                  className="px-4 py-2 text-sm rounded-md bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 transition"
                >
                  {contactModalSaving ? "Saving..." : "Save Contact"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
