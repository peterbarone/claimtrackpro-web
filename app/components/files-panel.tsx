"use client";

import React from "react";
import { Button } from "@/components/ui/button";

export type ClaimFile = {
  id: string;
  visibility: string | null;
  created_at: string | null;
  created_by: string | null;
  file: {
    id: string | null;
    title: string | null;
    filename: string | null;
    type: string | null;
    size: number | null;
    uploaded_on: string | null;
    download_url: string | null;
    directus_url: string | null;
  };
};

export function FilesPanel({ files }: { files: ClaimFile[] }) {
  if (!files?.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-gray-500">
        No files uploaded yet.
      </div>
    );
  }
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Files</h3>
        <span className="text-sm text-gray-500">{files.length} total</span>
      </div>
      <ul className="divide-y divide-gray-200">
        {files.map((f) => (
          <li key={f.id} className="py-3 flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">
                  {f.file.title || f.file.filename || "Untitled"}
                </span>
                {f.visibility && (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">
                    {f.visibility}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {f.file.type || "file"} ·{" "}
                {f.file.size
                  ? `${Math.round(f.file.size / 1024)} KB`
                  : "size unknown"}{" "}
                · {f.created_at ?? f.file.uploaded_on ?? ""}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {f.file.download_url ? (
                <Button asChild variant="outline" size="sm">
                  <a href={f.file.download_url}>Download</a>
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
