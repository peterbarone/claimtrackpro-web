"use client";
import { useEffect, useState } from "react";
import { formatPhone, formatPhoneWithExt } from "@/lib/utils";
import PhoneField from "@/components/phone-field";
import { useToast } from "@/hooks/use-toast";
import AppShell from "@/components/AppShell";
import { Modal } from "@/components/ui/modal";

interface RoleItem {
  id: string;
  name?: string;
  key?: string;
}
interface StaffItem {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  roles?: RoleItem[]; // normalized roles array
}

export default function StaffPage() {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [editTarget, setEditTarget] = useState<StaffItem | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    phone_ext: "",
    roles: [] as string[], // multi-select by role name
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    phone_ext: "",
    roles: [] as string[],
  });
  // View modal state
  const [viewTarget, setViewTarget] = useState<StaffItem | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  // Roles dropdown data
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/staff", { cache: "no-store" });
        if (!r.ok) throw new Error(`Failed (${r.status})`);
        const j = await r.json();
        if (!ignore)
          setStaff(
            Array.isArray(j?.data)
              ? j.data.map((s: any) => ({
                  id: s.id,
                  name:
                    s.name ||
                    `${s.first_name || ""} ${s.last_name || ""}`.trim() ||
                    s.id,
                  roles: Array.isArray(s.roles) ? s.roles : [],
                }))
              : []
          );
      } catch (e) {
        if (!ignore) setError(e.message || "Failed to load staff");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  // Load roles for dropdowns
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

  const filtered = filter.trim()
    ? staff.filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()))
    : staff;

  function openEdit(id: string) {
    const summary = staff.find((s) => s.id === id);
    setEditTarget({
      id,
      name: summary?.name || id,
      first_name: "",
      last_name: "",
      email: "",
      roles: [],
    });
    setForm({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      phone_ext: "",
      roles: [],
    });
    setEditError(null);
    setEditLoading(true);
    setEditOpen(true);
    fetch(`/api/staff/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j?.error || "Failed to load staff");
        const data = j?.data;
        const roles: RoleItem[] = Array.isArray(data.roles) ? data.roles : [];
        const item: StaffItem = {
          id: data.id,
          name:
            `${data.first_name || ""} ${data.last_name || ""}`.trim() ||
            data.id,
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          roles,
        };
        setEditTarget(item);
        setForm({
          first_name: item.first_name,
          last_name: item.last_name,
          email: item.email,
          phone: data.phone || "",
          phone_ext: data.phone_ext || "",
          roles: roles.map((r) => r.name || r.key || "").filter(Boolean),
        });
      })
      .catch((e) => setEditError((e as any).message || "Failed to load staff"))
      .finally(() => setEditLoading(false));
  }

  function openView(id: string) {
    const summary = staff.find((s) => s.id === id);
    setViewTarget({
      id,
      name: summary?.name || id,
      first_name: "",
      last_name: "",
      email: "",
      roles: [],
    });
    setViewError(null);
    setViewLoading(true);
    setViewOpen(true);
    fetch(`/api/staff/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j?.error || "Failed to load staff");
        const data = j?.data;
        const roles: RoleItem[] = Array.isArray(data.roles) ? data.roles : [];
        setViewTarget({
          id: data.id,
          name:
            `${data.first_name || ""} ${data.last_name || ""}`.trim() ||
            data.id,
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          roles,
        });
      })
      .catch((e) => setViewError((e as any).message || "Failed to load staff"))
      .finally(() => setViewLoading(false));
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const payload: any = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || undefined,
        phone_ext: form.phone_ext || undefined,
      };
      if (form.roles.length) payload.rolesByName = form.roles;
      else payload.roles = [];
      const res = await fetch(
        `/api/staff/${encodeURIComponent(editTarget.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          j?.error || j?.detail || `Update failed (${res.status})`
        );
      // After successful patch, fetch fresh staff record to update roles & name accurately
      try {
        const refRes = await fetch(
          `/api/staff/${encodeURIComponent(editTarget.id)}`,
          { cache: "no-store" }
        );
        const refJ = await refRes.json().catch(() => ({}));
        if (refRes.ok && refJ?.data) {
          const d = refJ.data;
          setStaff((prev) =>
            prev.map((s) =>
              s.id === editTarget.id
                ? {
                    id: d.id,
                    name:
                      d.name ||
                      `${d.first_name || ""} ${d.last_name || ""}`.trim() ||
                      d.id,
                    first_name: d.first_name,
                    last_name: d.last_name,
                    email: d.email,
                    roles: Array.isArray(d.roles) ? d.roles : [],
                  }
                : s
            )
          );
        } else {
          // fallback optimistic update for name only
          setStaff((prev) =>
            prev.map((s) =>
              s.id === editTarget.id
                ? {
                    ...s,
                    name:
                      `${form.first_name} ${form.last_name}`.trim() || s.name,
                  }
                : s
            )
          );
        }
      } catch {
        // ignore refetch errors
      }
      toast({
        title: "Staff updated",
        description: "Changes saved successfully.",
      });
      setEditTarget(null);
      setEditOpen(false);
    } catch (err) {
      setEditError(err.message || "Failed to update");
    } finally {
      setEditLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Staff</h1>
          <button
            onClick={() => {
              setCreateForm({
                first_name: "",
                last_name: "",
                email: "",
                phone: "",
                phone_ext: "",
                roles: [],
              });
              setCreateError(null);
              setCreateOpen(true);
            }}
            className="px-4 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700"
          >
            Add Staff
          </button>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search staff..."
              className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-500">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
          {loading && <p className="text-sm text-gray-500">Loading staff...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && (
            <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 overflow-hidden">
              {filtered.length === 0 && (
                <li className="p-4 text-sm text-gray-500">No staff found.</li>
              )}
              {filtered.map((s) => (
                <li
                  key={s.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {s.name}
                    </p>
                    <p className="text-xs text-gray-500">ID: {s.id}</p>
                    <p className="text-[11px] text-gray-500 mt-1">
                      {s.roles && s.roles.length ? (
                        s.roles
                          .map((r) => r.name || r.key || "")
                          .filter(Boolean)
                          .join(", ")
                      ) : (
                        <span className="text-gray-400">No roles</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openView(s.id)}
                      className="text-xs px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    >
                      View
                    </button>
                    <button
                      onClick={() => openEdit(s.id)}
                      className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Edit
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        onClose={() => {
          if (!editLoading) {
            setEditOpen(false);
            setEditTarget(null);
            setEditError(null);
          }
        }}
        title={editTarget ? `Edit Staff: ${editTarget.name}` : "Edit Staff"}
      >
        {editTarget && (
          <form onSubmit={saveEdit} className="space-y-4">
            {editError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                {editError}
              </div>
            )}
            {editLoading && !editError && (
              <div className="text-xs text-gray-500">Loading details…</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, first_name: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={editLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, last_name: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={editLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={editLoading}
                />
              </div>
              <div className="md:col-span-2">
                <PhoneField
                  label="Phone"
                  value={form.phone}
                  extValue={form.phone_ext}
                  onChangePhoneAction={(v) =>
                    setForm((f) => ({ ...f, phone: v }))
                  }
                  onChangeExtAction={(v) =>
                    setForm((f) => ({ ...f, phone_ext: v }))
                  }
                  disabled={editLoading}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Roles
                </label>
                <div className="flex flex-wrap gap-2">
                  {rolesLoading && (
                    <span className="text-xs text-gray-500">
                      Loading roles…
                    </span>
                  )}
                  {!rolesLoading &&
                    roles.map((r) => {
                      const label = r.name;
                      const checked = form.roles.includes(label);
                      return (
                        <label
                          key={r.id}
                          className="flex items-center gap-1 text-xs border rounded px-2 py-1 cursor-pointer select-none bg-white hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            className="h-3 w-3"
                            checked={checked}
                            onChange={() =>
                              setForm((f) => ({
                                ...f,
                                roles: checked
                                  ? f.roles.filter((x) => x !== label)
                                  : [...f.roles, label],
                              }))
                            }
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                </div>
                {rolesError && (
                  <p className="mt-1 text-[11px] text-red-600">{rolesError}</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={editLoading}
                onClick={() => {
                  setEditOpen(false);
                  setEditTarget(null);
                  setEditError(null);
                }}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {editLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        )}
      </Modal>
      <Modal
        open={viewOpen}
        onClose={() => {
          if (!viewLoading) {
            setViewOpen(false);
            setViewTarget(null);
            setViewError(null);
          }
        }}
        title={viewTarget ? `Staff: ${viewTarget.name}` : "Staff"}
      >
        {viewLoading && <p className="text-sm text-gray-500">Loading staff…</p>}
        {viewError && <p className="text-sm text-red-600">{viewError}</p>}
        {viewTarget && !viewLoading && !viewError && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  First Name
                </p>
                <p className="font-medium text-gray-900">
                  {viewTarget.first_name || (
                    <span className="text-gray-400">(none)</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Last Name
                </p>
                <p className="font-medium text-gray-900">
                  {viewTarget.last_name || (
                    <span className="text-gray-400">(none)</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Email
                </p>
                <p className="font-medium text-gray-900 break-all">
                  {viewTarget.email || (
                    <span className="text-gray-400">(none)</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Roles
                </p>
                <p className="font-medium text-gray-900">
                  {viewTarget.roles && viewTarget.roles.length > 0 ? (
                    viewTarget.roles
                      .map((r) => r.name || r.key || "")
                      .filter(Boolean)
                      .join(", ")
                  ) : (
                    <span className="text-gray-400">(none)</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Phone
                </p>
                <p className="font-medium text-gray-900">
                  {formatPhone((viewTarget as any).phone || "") || (
                    <span className="text-gray-400">(none)</span>
                  )}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  ID
                </p>
                <p className="font-mono text-[11px] bg-gray-50 border border-gray-200 rounded px-2 py-1 select-all">
                  {viewTarget.id}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="px-4 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                onClick={() => {
                  setViewOpen(false);
                  setViewTarget(null);
                  setViewError(null);
                }}
                disabled={viewLoading}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        open={createOpen}
        onClose={() => {
          if (!createLoading) setCreateOpen(false);
        }}
        title="Add Staff"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setCreateLoading(true);
            setCreateError(null);
            try {
              const res = await fetch("/api/staff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  first_name: createForm.first_name,
                  last_name: createForm.last_name,
                  email: createForm.email,
                  phone: createForm.phone || undefined,
                  phone_ext: createForm.phone_ext || undefined,
                  ...(createForm.roles.length
                    ? { rolesByName: createForm.roles }
                    : { roles: [] }),
                }),
              });
              const j = await res.json().catch(() => ({}));
              if (!res.ok)
                throw new Error(
                  j?.error || j?.detail || `Create failed (${res.status})`
                );
              const item = j?.data;
              if (item) {
                setStaff((prev) => [
                  {
                    id: item.id,
                    name:
                      item.name ||
                      `${item.first_name || ""} ${item.last_name ||
                        ""}`.trim() ||
                      item.id,
                    roles: Array.isArray(item.roles) ? item.roles : [],
                  },
                  ...prev,
                ]);
              }
              setCreateOpen(false);
            } catch (err) {
              setCreateError(err.message || "Failed to create");
            } finally {
              setCreateLoading(false);
            }
          }}
          className="space-y-4"
        >
          {createError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {createError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={createForm.first_name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, first_name: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={createForm.last_name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, last_name: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Email
              </label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, email: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={createForm.phone}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, phone: e.target.value }))
                }
                onBlur={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    phone: formatPhone(e.target.value),
                  }))
                }
                placeholder="(555) 123-4567"
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Roles
              </label>
              <div className="flex flex-wrap gap-2">
                {rolesLoading && (
                  <span className="text-xs text-gray-500">Loading roles…</span>
                )}
                {!rolesLoading && roles.length === 0 && (
                  <span className="text-xs text-gray-400">
                    No roles available
                  </span>
                )}
                {!rolesLoading &&
                  roles.map((r) => {
                    const label = r.name;
                    const checked = createForm.roles.includes(label);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        aria-pressed={checked}
                        onClick={() =>
                          setCreateForm((f) => ({
                            ...f,
                            roles: checked
                              ? f.roles.filter((x) => x !== label)
                              : [...f.roles, label],
                          }))
                        }
                        className={[
                          "relative inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1",
                          checked
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm hover:bg-blue-600/90"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
                        ].join(" ")}
                      >
                        <span>{label}</span>
                        {checked && (
                          <svg
                            className="h-3 w-3"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    );
                  })}
              </div>
              {rolesError && (
                <p className="mt-1 text-[11px] text-red-600">{rolesError}</p>
              )}
              {!rolesLoading && roles.length > 0 && (
                <p className="mt-2 text-[11px] text-gray-400">
                  Selected: {createForm.roles.length || 0}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={createLoading}
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="px-4 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {createLoading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
