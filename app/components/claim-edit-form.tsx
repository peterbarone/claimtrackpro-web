"use client";
import { useEffect, useState } from "react";

export interface ClaimEditFormProps {
  claimId: string;
  initial: {
    description?: string | null;
    statusId?: string | number | null;
    assignedToUserId?: string | number | null;
    assignedManagerId?: string | number | null;
    dateOfLoss?: string | null; // ISO
    claimTypeId?: string | number | null;
    lossCauseId?: string | number | null;
    participants?: Array<{
      id: string;
      role: string;
      contactId: string | number;
      name: string;
    }>; // existing participants
  };
  onSavedAction?: (updated: any) => void;
  onCancelAction?: () => void;
}

interface Option {
  value: string;
  label: string;
}

export function ClaimEditForm({
  claimId,
  initial,
  onSavedAction,
  onCancelAction,
}: ClaimEditFormProps) {
  const [description, setDescription] = useState(initial.description || "");
  const [statusId, setStatusId] = useState<string | "">(
    initial.statusId ? String(initial.statusId) : ""
  );
  const [assignedId, setAssignedId] = useState<string | "">(
    initial.assignedToUserId ? String(initial.assignedToUserId) : ""
  );
  const [dateOfLoss, setDateOfLoss] = useState<string>(
    initial.dateOfLoss ? initial.dateOfLoss.slice(0, 10) : ""
  );
  const [claimTypeId, setClaimTypeId] = useState<string | "">(
    initial.claimTypeId ? String(initial.claimTypeId) : ""
  );
  const [lossCauseId, setLossCauseId] = useState<string | "">(
    initial.lossCauseId ? String(initial.lossCauseId) : ""
  );
  const [assignedManagerId, setAssignedManagerId] = useState<string | "">(
    initial.assignedManagerId ? String(initial.assignedManagerId) : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusOptions, setStatusOptions] = useState<Option[]>([]);
  const [staffOptions, setStaffOptions] = useState<Option[]>([]);
  const [managerOptions, setManagerOptions] = useState<Option[]>([]);
  const [claimTypeOptions, setClaimTypeOptions] = useState<Option[]>([]);
  const [participants, setParticipants] = useState<
    Array<{
      id: string;
      role: string;
      contactId: string | number;
      name: string;
    }>
  >(initial.participants || []);
  const [newParticipantContact, setNewParticipantContact] = useState("");
  const [newParticipantRole, setNewParticipantRole] = useState("");
  const [participantBusy, setParticipantBusy] = useState(false);
  const [lossCauseOptions, setLossCauseOptions] = useState<Option[]>([]);

  // Fetch dropdown data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [
          statusRes,
          staffRes,
          managersRes,
          lossCauseRes,
        ] = await Promise.all([
          fetch("/api/claim-status", { cache: "no-store" }),
          fetch("/api/staff", { cache: "no-store" }),
          fetch("/api/contacts?role=manager", { cache: "no-store" }),
          fetch("/api/loss-causes", { cache: "no-store" }),
        ]);
        if (statusRes.ok) {
          const j = await statusRes.json();
          if (!cancelled)
            setStatusOptions(
              (j?.data || []).map((s: any) => ({
                value: String(s.id),
                label: s.name || s.status || s.code || s.id,
              }))
            );
        }
        if (staffRes.ok) {
          const j = await staffRes.json();
          if (!cancelled)
            setStaffOptions(
              (j?.data || []).map((s: any) => ({
                value: String(s.id),
                label: s.name || s.id,
              }))
            );
        }
        if (managersRes.ok) {
          const j = await managersRes.json();
          if (!cancelled)
            setManagerOptions(
              (j?.data || []).map((m: any) => ({
                value: String(m.id),
                label: m.name || m.id,
              }))
            );
        }
        if (lossCauseRes.ok) {
          const j = await lossCauseRes.json();
          if (!cancelled)
            setLossCauseOptions(
              (j?.data || []).map((t: any) => ({
                value: String(t.id),
                label: t.name || t.id,
              }))
            );
        }
      } catch {}
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Claim types (optional, best-effort)
  useEffect(() => {
    let cancelled = false;
    async function loadTypes() {
      try {
        const r = await fetch("/api/claim-types", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          if (!cancelled)
            setClaimTypeOptions(
              (j?.data || []).map((t: any) => ({
                value: String(t.id),
                label: t.name || t.code || t.id,
              }))
            );
        }
      } catch {}
    }
    loadTypes();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payload: Record<string, any> = {};
    if (description !== initial.description) payload.description = description;
    if (statusId && statusId !== String(initial.statusId || ""))
      payload.status = statusId;
    if (assignedId && assignedId !== String(initial.assignedToUserId || ""))
      payload.assigned_to_user = assignedId;
    if (
      dateOfLoss &&
      dateOfLoss !== (initial.dateOfLoss ? initial.dateOfLoss.slice(0, 10) : "")
    )
      payload.date_of_loss = dateOfLoss;
    if (claimTypeId && claimTypeId !== String(initial.claimTypeId || ""))
      payload.claim_type = claimTypeId;
    if (lossCauseId && lossCauseId !== String(initial.lossCauseId || ""))
      payload.loss_cause = lossCauseId;
    if (
      assignedManagerId &&
      assignedManagerId !== String(initial.assignedManagerId || "")
    )
      payload.assigned_manager = assignedManagerId;

    if (Object.keys(payload).length === 0) {
      setError("No changes to save");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/claims/${encodeURIComponent(claimId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          j?.error || j?.detail || `Update failed (${res.status})`
        );
      }
      const json = await res.json();
      onSavedAction?.(json?.data || json);
    } catch (err) {
      setError(err?.message || "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  async function refreshParticipants() {
    try {
      const r = await fetch(
        `/api/claims/${encodeURIComponent(claimId)}/participants`,
        { cache: "no-store" }
      );
      if (!r.ok) return;
      const j = await r.json();
      const list = Array.isArray(j?.data) ? j.data : [];
      setParticipants(list);
    } catch {}
  }

  async function handleAddParticipant() {
    if (!newParticipantContact) return;
    setParticipantBusy(true);
    try {
      const res = await fetch(
        `/api/claims/${encodeURIComponent(claimId)}/participants`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactId: newParticipantContact,
            role: newParticipantRole,
          }),
        }
      );
      if (res.ok) {
        setNewParticipantContact("");
        setNewParticipantRole("");
        await refreshParticipants();
      }
    } finally {
      setParticipantBusy(false);
    }
  }

  async function handleRemoveParticipant(id: string) {
    if (!id) return;
    setParticipantBusy(true);
    try {
      const res = await fetch(
        `/api/claims/${encodeURIComponent(
          claimId
        )}/participants/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setParticipants((prev) => prev.filter((p) => p.id !== id));
      }
    } finally {
      setParticipantBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Description</label>
        <textarea
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Status</label>
          <select
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select --</option>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Assigned To
          </label>
          <select
            value={assignedId}
            onChange={(e) => setAssignedId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Unassigned --</option>
            {staffOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Date of Loss
          </label>
          <input
            type="date"
            value={dateOfLoss}
            onChange={(e) => setDateOfLoss(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Claim Type
          </label>
          <select
            value={claimTypeId}
            onChange={(e) => setClaimTypeId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select --</option>
            {claimTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Type of Loss
          </label>
          <select
            value={lossCauseId}
            onChange={(e) => setLossCauseId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select --</option>
            {lossCauseOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Assigned Manager
          </label>
          <select
            value={assignedManagerId}
            onChange={(e) => setAssignedManagerId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Unassigned --</option>
            {managerOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancelAction}
          className="px-4 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Participants Manager */}
      <div className="pt-4 border-t border-gray-200 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Participants</h3>
        <ul className="space-y-2 max-h-48 overflow-auto pr-1">
          {participants.length === 0 && (
            <li className="text-xs text-gray-500">No participants.</li>
          )}
          {participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs"
            >
              <span className="truncate">
                {p.name}{" "}
                {p.role ? (
                  <span className="text-gray-400">({p.role})</span>
                ) : null}
              </span>
              <button
                type="button"
                disabled={participantBusy}
                onClick={() => handleRemoveParticipant(p.id)}
                className="text-red-600 hover:text-red-800 disabled:opacity-40 ml-2"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-0.5">
              Contact
            </label>
            <select
              value={newParticipantContact}
              onChange={(e) => setNewParticipantContact(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Staff --</option>
              {staffOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-0.5">
              Role
            </label>
            <input
              type="text"
              value={newParticipantRole}
              onChange={(e) => setNewParticipantRole(e.target.value)}
              placeholder="e.g. Adjuster"
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={handleAddParticipant}
              disabled={participantBusy || !newParticipantContact}
              className="px-3 py-2 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {participantBusy ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
