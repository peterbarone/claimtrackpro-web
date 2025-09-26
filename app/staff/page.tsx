"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { Modal } from "@/components/ui/modal";

interface StaffItem {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [editTarget, setEditTarget] = useState<StaffItem | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "",
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    role: "",
  });
  // View modal state
  const [viewTarget, setViewTarget] = useState<StaffItem | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
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
              ? j.data.map((s: any) => ({ id: s.id, name: s.name }))
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
    // Fetch individual staff record for full details
    setEditError(null);
    setEditLoading(true);
    fetch(`/api/staff/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j?.error || "Failed to load staff");
        const data = j?.data;
        const item: StaffItem = {
          id: data.id,
          name:
            `${data.first_name || ""} ${data.last_name || ""}`.trim() ||
            data.id,
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          role: data.role || "",
        };
        setEditTarget(item);
        setForm({
          first_name: item.first_name || "",
          last_name: item.last_name || "",
          email: item.email || "",
          role: item.role || "",
        });
      })
      .catch((e) => setEditError(e.message || "Failed to load"))
      .finally(() => setEditLoading(false));
  }

  function openView(id: string) {
    setViewError(null);
    setViewLoading(true);
    fetch(`/api/staff/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j?.error || "Failed to load staff");
        const data = j?.data;
        const item: StaffItem = {
          id: data.id,
          name:
            `${data.first_name || ""} ${data.last_name || ""}`.trim() ||
            data.id,
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          role: data.role || "",
        };
        setViewTarget(item);
      })
      .catch((e) => setViewError(e.message || "Failed to load"))
      .finally(() => setViewLoading(false));
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await fetch(
        `/api/staff/${encodeURIComponent(editTarget.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          j?.error || j?.detail || `Update failed (${res.status})`
        );
      // Update list inline (optimistic refresh name)
      setStaff((prev) =>
        prev.map((s) =>
          s.id === editTarget.id
            ? {
                ...s,
                name: `${form.first_name} ${form.last_name}`.trim() || s.name,
              }
            : s
        )
      );
      setEditTarget(null);
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
                role: "",
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
      <Modal
        open={!!editTarget}
        onClose={() => {
          if (!editLoading) setEditTarget(null);
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
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">
                    {rolesLoading ? "Loading roles..." : "Select a role"}
                  </option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {rolesError && (
                  <p className="mt-1 text-[11px] text-red-600">{rolesError}</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={editLoading}
                onClick={() => setEditTarget(null)}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
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
        open={!!viewTarget}
        onClose={() => {
          if (!viewLoading) setViewTarget(null);
        }}
        title={viewTarget ? `Staff: ${viewTarget.name}` : "Staff"}
      >
        {viewLoading && <p className="text-sm text-gray-500">Loading…</p>}
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
                  Role
                </p>
                <p className="font-medium text-gray-900">
                  {viewTarget.role || (
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
                className="px-4 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                onClick={() => setViewTarget(null)}
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
                body: JSON.stringify(createForm),
              });
              const j = await res.json().catch(() => ({}));
              if (!res.ok)
                throw new Error(
                  j?.error || j?.detail || `Create failed (${res.status})`
                );
              const item = j?.data;
              if (item) {
                setStaff((prev) => [{ id: item.id, name: item.name }, ...prev]);
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
                Role
              </label>
              <select
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, role: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  {rolesLoading ? "Loading roles..." : "Select a role"}
                </option>
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
              {rolesError && (
                <p className="mt-1 text-[11px] text-red-600">{rolesError}</p>
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
