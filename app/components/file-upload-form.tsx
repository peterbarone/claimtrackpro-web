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
  const [category, setCategory] = useState<string>("");
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
      if (category) fd.append("category", category);
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
      setCategory("");
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
        <Label htmlFor="category">Category (optional)</Label>
        <Input
          id="category"
          placeholder="e.g. photo, estimate, report"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={loading}
        />
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
