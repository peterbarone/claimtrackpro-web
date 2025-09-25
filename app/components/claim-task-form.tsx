"use client";

import { useEffect, useMemo, useState } from "react";

type Contact = {
  id: string | number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

export function ClaimTaskForm({
  claimId,
  onCreated,
}: {
  claimId: string | number;
  onCreated?: (taskId: string | number) => void;
}) {
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState<
    "low" | "medium" | "high" | "urgent"
  >("medium");
  const [assigneeId, setAssigneeId] = useState<string | number | "">("");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [dueDate, setDueDate] = useState<string>("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadContacts() {
      setLoadingContacts(true);
      setError(null);
      try {
        const r = await fetch(`/api/claims/${claimId}/contacts`, {
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`Failed to load contacts (${r.status})`);
        const json = await r.json();
        if (!ignore) {
          const list: Contact[] = (json?.data || []) as Contact[];
          setContacts(list);
          // Prefill to first contact if desired:
          if (list.length > 0) setAssigneeId(String(list[0].id));
        }
      } catch (e) {
        if (!ignore) setError(e.message || "Error loading contacts");
      } finally {
        if (!ignore) setLoadingContacts(false);
      }
    }
    loadContacts();
    return () => {
      ignore = true;
    };
  }, [claimId]);

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && priority && status && !submitting;
  }, [title, priority, status, submitting]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setOkMsg(null);
    try {
      const payload = {
        claimId,
        status,
        priority,
        assigneeId: assigneeId === "" ? null : assigneeId,
        title: title.trim(),
        details: details?.trim() || null,
        dueDate: dueDate || null, // as "YYYY-MM-DD"
      };
      const r = await fetch("/api/claim-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.error || `Create failed (${r.status})`);
      setOkMsg("Task created.");
      setTitle("");
      setDetails("");
      setDueDate("");
      if (onCreated) onCreated(json?.data?.id);
    } catch (e) {
      setError(e.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-6">
      {/* Header / Progress bar area can mirror your intake form wrapper if you have one */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Add Task</h2>
          <p className="text-sm text-gray-500">
            Attach a new task to this claim.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Claim ID (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Claim ID
            </label>
            <input
              type="text"
              value={String(claimId)}
              readOnly
              className="mt-1 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-gray-700"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Assignee
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              disabled={loadingContacts}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2"
            >
              {contacts.length === 0 && (
                <option value="">No contacts found</option>
              )}
              {contacts.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {c.name || c.email || `Contact #${c.id}`}
                </option>
              ))}
            </select>
            {loadingContacts && (
              <p className="mt-1 text-xs text-gray-500">Loading contacts…</p>
            )}
          </div>

          {/* Title */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title of task"
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
              required
            />
          </div>

          {/* Details */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Details
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              placeholder="Details about the task"
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {okMsg && (
          <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            {okMsg}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-2xl bg-indigo-600 px-4 py-2 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Create Task"}
          </button>
          <span className="text-xs text-gray-500">
            Directus will store the created date automatically.
          </span>
        </div>
      </div>
    </form>
  );
}
