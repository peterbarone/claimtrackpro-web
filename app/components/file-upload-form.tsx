"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FileUploadForm({
  claimId,
  onUploadedAction,
}: {
  claimId: string;
  onUploadedAction?: () => Promise<void> | void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<string>("internal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Please choose a file");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (visibility) fd.append("visibility", visibility);
      const r = await fetch(
        `/api/claims/${encodeURIComponent(claimId)}/files`,
        {
          method: "POST",
          body: fd,
        }
      );
      if (!r.ok) {
        const b = await r.json().catch(() => ({} as any));
        throw new Error(b?.error || `Upload failed (${r.status})`);
      }
      if (onUploadedAction) await onUploadedAction();
      setFile(null);
    } catch (e) {
      setError(String(e?.message || "Upload failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="file">File</Label>
        <Input
          id="file"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={loading}
        />
      </div>
      <div>
        <Label htmlFor="visibility">Visibility</Label>
        <select
          id="visibility"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          disabled={loading}
        >
          <option value="internal">internal</option>
          <option value="external">external</option>
          <option value="private">private</option>
        </select>
      </div>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={loading || !file}>
          {loading ? "Uploading…" : "Upload"}
        </Button>
      </div>
    </form>
  );
}
