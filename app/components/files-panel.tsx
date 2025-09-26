"use client";

import React from "react";
import { Button } from "@/components/ui/button";

export type ClaimFile = {
  id: string;
  claim: string | number | null;
  category: string | null;
  uploaded_at: string | null;
  uploaded_by: string | null; // user id
  uploader_name?: string | null; // convenience from API mapping
  file: {
    id: string | null;
    title: string | null;
    filename_download: string | null;
    type: string | null;
    filesize: number | null;
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
                  {f.file.title || f.file.filename_download || "Untitled"}
                </span>
                {f.category && (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                    {f.category}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {f.file.type || "file"} ·{" "}
                {f.file.filesize
                  ? `${Math.round(f.file.filesize / 1024)} KB`
                  : "size unknown"}{" "}
                · {f.uploaded_at || f.file.uploaded_on || ""}
                {f.uploader_name && ` · ${f.uploader_name}`}
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
