"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
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
  const [contacts, setContacts] = useState<
    {
      first_name: string;
      last_name: string;
      role: string; // role UUID (Directus roles.id)
      phone: string;
      email: string;
      notes: string;
    }[]
  >([
    {
      first_name: "",
      last_name: "",
      role: "",
      phone: "",
      email: "",
      notes: "",
    },
  ]);

  // Roles dropdown data
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadRoles() {
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
    loadRoles();
    return () => {
      ignore = true;
    };
  }, []);

  const addContact = () =>
    setContacts((c) => [
      ...c,
      {
        first_name: "",
        last_name: "",
        role: "",
        phone: "",
        email: "",
        notes: "",
      },
    ]);
  const removeContact = (idx: number) =>
    setContacts((c) => (c.length === 1 ? c : c.filter((_, i) => i !== idx)));
  const updateContact = (idx: number, key: string, val: string) =>
    setContacts((c) =>
      c.map((ct, i) => (i === idx ? { ...ct, [key]: val } : ct))
    );
  const cloneContact = (idx: number) =>
    setContacts((c) => {
      const target = c[idx];
      return [...c.slice(0, idx + 1), { ...target }, ...c.slice(idx + 1)];
    });

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
      // Optional address
      let addressId: string | undefined;
      const hasAddr =
        form.street_1 ||
        form.street_2 ||
        form.city ||
        form.state ||
        form.postal_code;
      if (hasAddr) {
        if (!form.street_1 || !form.city || !form.state) {
          setError("Address requires street, city, and state");
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
        } catch (err) {
          setError(err?.message || "Failed to create address");
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
      if (!created?.id) {
        setError("Carrier created but ID missing in response");
        setSaving(false);
        return;
      }

      const meaningful = contacts.filter(
        (c) =>
          (
            c.first_name +
            c.last_name +
            c.role +
            c.phone +
            c.email +
            c.notes
          ).trim() !== ""
      );
      // Create contacts in parallel for speed
      const isUUID = (val: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          val || ""
        );
      await Promise.all(
        meaningful.map(async (c) => {
          try {
            await fetch("/api/contacts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                first_name: c.first_name || undefined,
                last_name: c.last_name || undefined,
                role: isUUID(c.role) ? c.role : undefined,
                phone: c.phone || undefined,
                email: c.email || undefined,
                notes: c.notes || undefined,
                company: form.name,
              }),
            });
          } catch {
            // ignore
          }
        })
      );

      toast({
        title: "Carrier created",
        description: meaningful.length
          ? `+ ${meaningful.length} contact(s)`
          : undefined,
      });
      router.replace(`/carriers/${created.id}`);
    } catch (err) {
      setError(err?.message || "Failed to create carrier");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Carrier</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Create a new carrier record
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-10">
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => onChange("name", e.target.value)}
                    required
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
                <div className="sm:col-span-2 pt-2">
                  <h2 className="text-md font-semibold text-gray-800">
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
            </div>

            {/* Contacts Section (inline) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-md font-semibold text-gray-800">
                  Contacts (Optional)
                </h2>
                <button
                  type="button"
                  onClick={addContact}
                  className="text-xs px-2 py-1 rounded bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Saved to contacts with the carrier name as company.
              </p>
              <div className="space-y-6">
                {contacts.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-gray-200 rounded-md bg-gray-50 space-y-3 relative"
                  >
                    <div className="grid grid-cols-1 gap-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            First
                          </label>
                          <input
                            value={c.first_name}
                            onChange={(e) =>
                              updateContact(idx, "first_name", e.target.value)
                            }
                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Last
                          </label>
                          <input
                            value={c.last_name}
                            onChange={(e) =>
                              updateContact(idx, "last_name", e.target.value)
                            }
                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
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
                              value={c.role}
                              onChange={(e) =>
                                updateContact(idx, "role", e.target.value)
                              }
                              placeholder="Role"
                              className="w-full rounded-md border border-red-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
                            />
                          ) : (
                            <select
                              value={c.role}
                              onChange={(e) =>
                                updateContact(idx, "role", e.target.value)
                              }
                              disabled={rolesLoading}
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
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-gray-600 mb-1">
                            Phone
                          </label>
                          <input
                            value={c.phone}
                            onChange={(e) =>
                              updateContact(idx, "phone", e.target.value)
                            }
                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">
                          Email
                        </label>
                        <input
                          value={c.email}
                          onChange={(e) =>
                            updateContact(idx, "email", e.target.value)
                          }
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-1">
                          Notes
                        </label>
                        <textarea
                          value={c.notes}
                          onChange={(e) =>
                            updateContact(idx, "notes", e.target.value)
                          }
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400 min-h-[50px]"
                        />
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => cloneContact(idx)}
                        className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                        title="Clone contact"
                      >
                        Clone
                      </button>
                      {contacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeContact(idx)}
                          className="text-[10px] px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                          title="Remove contact"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
