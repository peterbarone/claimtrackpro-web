"use client";

import { useMemo, useState } from "react";

export function ClaimNoteForm({
  claimId,
  onCreatedAction,
}: {
  claimId: string | number;
  onCreatedAction?: (noteId: string | number) => void;
}) {
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState<string>("internal");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return note.trim().length > 0 && !submitting;
  }, [note, submitting]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setOkMsg(null);
    try {
      const payload = {
        note: note.trim(),
        visibility: visibility || undefined,
      } as { note: string; visibility?: string };

      const r = await fetch(
        `/api/claims/${encodeURIComponent(String(claimId))}/notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await r.json().catch(() => ({} as any));
      if (!r.ok) throw new Error(json?.error || `Create failed (${r.status})`);

      setOkMsg("Note added.");
      setNote("");
      if (onCreatedAction)
        onCreatedAction(json?.data?.id ?? json?.data?.primaryKey ?? "");
    } catch (e) {
      setError(e?.message || "Failed to create note");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Add Note</h2>
          <p className="text-sm text-gray-500">
            Attach a new note to this claim.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
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

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2"
            >
              <option value="internal">Internal</option>
              <option value="external">External</option>
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              placeholder="Write your note..."
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
              required
            />
          </div>
        </div>

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

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-2xl bg-indigo-600 px-4 py-2 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Add Note"}
          </button>
        </div>
      </div>
    </form>
  );
}
